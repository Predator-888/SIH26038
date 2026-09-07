"""
Automated Unit and Integration Tests for Patient Reminder & SMS Follow-up Engine.
SIH26038 Problem Statement — NetraAI Tele-Ophthalmology System.
"""

import pytest
from datetime import datetime, timezone
from sqlmodel import Session, select

from backend.app.database import engine
from backend.app.models.case import Case
from backend.app.models.grading import GradingResult
from backend.app.models.reminder import PatientReminder, SMSLog
from backend.app.services.sms_service import sms_service
from backend.app.services.reminder_service import reminder_service
from backend.app.routers.reminders import (
    get_case_reminders,
    schedule_case_reminders,
    trigger_reminder_dispatch,
    send_custom_sms,
    ScheduleReminderRequest,
    SendAdhocSMSRequest
)


def test_calculate_followup_intervals():
    """Verify follow-up intervals match ICDR 2020 & ADA guidelines."""
    # Grade 0: Normal -> Annual (365d), Sugar 30d, HbA1c 90d
    g0 = reminder_service.calculate_followup_intervals(0)
    assert g0["retinal_screening"] == 365
    assert g0["blood_sugar"] == 30
    assert g0["hba1c"] == 90

    # Grade 1: Mild NPDR -> 6 months (180d)
    g1 = reminder_service.calculate_followup_intervals(1)
    assert g1["retinal_screening"] == 180
    assert g1["blood_sugar"] == 14

    # Grade 2: Moderate NPDR -> 3 months (90d), or 1 month (30d) with macular edema
    g2_standard = reminder_service.calculate_followup_intervals(2, has_macular_edema=False)
    assert g2_standard["retinal_screening"] == 90
    assert g2_standard["blood_sugar"] == 7

    g2_dme = reminder_service.calculate_followup_intervals(2, has_macular_edema=True)
    assert g2_dme["retinal_screening"] == 30

    # Grade 3: Severe NPDR -> Urgent referral (21d)
    g3 = reminder_service.calculate_followup_intervals(3)
    assert g3["specialist_referral"] == 21

    # Grade 4: Proliferative DR -> Emergency referral (2d)
    g4 = reminder_service.calculate_followup_intervals(4)
    assert g4["specialist_referral"] == 2


def test_bilingual_sms_template_formatting():
    """Verify English and Hindi message formatting."""
    # English
    en_sugar = sms_service.format_message("blood_sugar", "John Doe", lang="en")
    assert "John Doe" in en_sugar
    assert "Fasting Blood Glucose" in en_sugar
    assert "104" in en_sugar

    en_retinal = sms_service.format_message("retinal_screening", "John Doe", lang="en", extra_params={"clinic": "Civil Hospital"})
    assert "Diabetic Retinopathy" in en_retinal
    assert "Civil Hospital" in en_retinal

    # Hindi
    hi_sugar = sms_service.format_message("blood_sugar", "रमेश", lang="hi")
    assert "रमेश" in hi_sugar
    assert "ब्लड शुगर" in hi_sugar

    hi_referral = sms_service.format_message("specialist_referral", "रमेश", lang="hi", extra_params={"timeframe": "24 घंटे", "grade_label": "प्रोलिफेरेटिव DR"})
    assert "रमेश" in hi_referral
    assert "24 घंटे" in hi_referral


def test_mock_sms_dispatch_and_db_logging():
    """Verify SMS dispatch logging in SQLite."""
    with Session(engine) as session:
        test_phone = "+919988776655"
        test_msg = "Test screening alert from NetraAI automated test suite."
        
        result = sms_service.send_sms(
            phone_number=test_phone,
            message_text=test_msg,
            reminder_type="blood_sugar",
            session=session
        )

        assert result["success"] is True
        assert result["status"] == "delivered"
        assert result["provider"] == "mock"
        assert result["log_id"] is not None

        # Verify persisted in database
        log_entry = session.get(SMSLog, result["log_id"])
        assert log_entry is not None
        assert log_entry.recipient_phone == test_phone
        assert log_entry.message_text == test_msg


def test_auto_schedule_and_case_reminder_lifecycle():
    """Verify complete lifecycle: auto-schedule -> inspect -> dispatch."""
    with Session(engine) as session:
        case = session.exec(select(Case)).first()
        assert case is not None, "A database case is required"

        test_phone = "+919876543210"

        # 1. Schedule reminders
        reminders = reminder_service.auto_schedule_reminders(
            case_id=case.case_id,
            session=session,
            patient_phone=test_phone,
            lang="en"
        )
        assert len(reminders) == 3
        types = [r.reminder_type for r in reminders]
        assert "blood_sugar" in types
        assert "hba1c" in types
        assert any("retinal" in t or "referral" in t for t in types)

        # 2. Query case reminders
        data = reminder_service.get_case_reminders_and_logs(case.case_id, session)
        assert len(data["reminders"]) >= 3

        # 3. Dispatch first reminder
        first_rem = reminders[0]
        dispatch_res = reminder_service.dispatch_reminder_by_id(first_rem.id, session)
        assert dispatch_res["success"] is True

        # Verify status changed to sent
        session.refresh(first_rem)
        assert first_rem.status == "sent"
        assert first_rem.last_sent_at is not None


def test_router_endpoints_direct():
    """Verify router functions for scheduling and dispatching."""
    with Session(engine) as session:
        case = session.exec(select(Case)).first()
        assert case is not None

        # 1. Test schedule router endpoint
        req = ScheduleReminderRequest(patient_phone="+919123456780", language="hi")
        res = schedule_case_reminders(case.case_id, req, session=session)
        assert res["status"] == "success"
        assert len(res["reminders"]) == 3

        # 2. Test send-custom router endpoint
        custom_req = SendAdhocSMSRequest(
            case_id=case.case_id,
            phone_number="+919123456780",
            reminder_type="blood_sugar",
            language="hi"
        )
        custom_res = send_custom_sms(custom_req, session=session)
        assert custom_res["success"] is True

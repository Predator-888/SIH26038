"""
NetraAI (SIH26038): Patient Reminder Scheduling & Clinical Follow-up Engine.
Calculates evidence-based follow-up intervals for blood sugar and Diabetic Retinopathy
screenings in accordance with ICDR guidelines, and coordinates SMS reminders.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlmodel import Session, select

from backend.app.models.case import Case
from backend.app.models.grading import GradingResult, Lesion
from backend.app.models.reminder import PatientReminder, SMSLog
from backend.app.services.sms_service import sms_service

logger = logging.getLogger(__name__)


class ReminderService:
    @staticmethod
    def calculate_followup_intervals(grade: int, has_macular_edema: bool = False) -> Dict[str, int]:
        """
        Derives clinical follow-up intervals (in days) according to ICDR 2020 & ADA standards.
        Returns intervals for:
          - retinal_screening (or specialist_referral)
          - blood_sugar
          - hba1c
        """
        if grade == 0:
            return {
                "retinal_screening": 365,  # 12 months
                "blood_sugar": 30,          # Monthly fasting glucose
                "hba1c": 90                 # Quarterly HbA1c
            }
        elif grade == 1:
            return {
                "retinal_screening": 180,  # 6 months
                "blood_sugar": 14,          # Bi-weekly
                "hba1c": 90
            }
        elif grade == 2:
            retinal_interval = 30 if has_macular_edema else 90  # 1 month if macula involved, else 3 months
            return {
                "retinal_screening": retinal_interval,
                "blood_sugar": 7,           # Weekly monitoring
                "hba1c": 90
            }
        elif grade == 3:
            return {
                "specialist_referral": 21,  # 2 to 4 weeks urgent referral
                "blood_sugar": 7,
                "hba1c": 90
            }
        else:  # Grade 4 (PDR)
            return {
                "specialist_referral": 2,   # Immediate 24-72 hours emergency
                "blood_sugar": 3,
                "hba1c": 90
            }

    def auto_schedule_reminders(
        self,
        case_id: str,
        session: Session,
        patient_phone: str,
        lang: str = "en"
    ) -> List[PatientReminder]:
        """
        Creates or updates scheduled reminders for a patient based on their AI screening grade.
        """
        case = session.get(Case, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
        lesions = session.exec(select(Lesion).where(Lesion.case_id == case_id)).all()

        grade_val = grading.grade if grading else 0
        grade_label = grading.grade_label if grading else "Normal"
        patient_name = case.patient_ref or f"Patient {case.case_id[:8].upper()}"

        # Detect macular involvement (exudates near fovea)
        has_dme = any(
            l.type == "exudate" and 0.35 <= l.bbox[0] <= 0.65 and 0.35 <= l.bbox[1] <= 0.65
            for l in lesions
        )

        intervals = self.calculate_followup_intervals(grade_val, has_dme)
        now = datetime.now(timezone.utc)

        # Remove existing scheduled reminders for this case to avoid duplicates
        existing = session.exec(
            select(PatientReminder)
            .where(PatientReminder.case_id == case_id)
            .where(PatientReminder.status == "scheduled")
        ).all()
        for r in existing:
            session.delete(r)

        created_reminders = []

        # 1. Retinal follow-up reminder
        retinal_type = "specialist_referral" if grade_val >= 3 else "retinal_screening"
        retinal_days = intervals.get(retinal_type, 90)
        retinal_due = now + timedelta(days=retinal_days)
        retinal_title = "Specialist Retinal Evaluation" if grade_val >= 3 else "Routine Retinal Rescreening"

        rem_retinal = PatientReminder(
            case_id=case_id,
            patient_ref=patient_name,
            patient_phone=patient_phone,
            reminder_type=retinal_type,
            title=retinal_title,
            interval_days=retinal_days,
            due_date=retinal_due,
            language=lang,
            status="scheduled",
            notes=f"Based on ICDR Grade {grade_val} ({grade_label})" + (", with elevated DME risk" if has_dme else "")
        )
        session.add(rem_retinal)
        created_reminders.append(rem_retinal)

        # 2. Blood sugar routine check reminder
        sugar_days = intervals.get("blood_sugar", 14)
        rem_sugar = PatientReminder(
            case_id=case_id,
            patient_ref=patient_name,
            patient_phone=patient_phone,
            reminder_type="blood_sugar",
            title="Blood Glucose Checkup",
            interval_days=sugar_days,
            due_date=now + timedelta(days=sugar_days),
            language=lang,
            status="scheduled",
            notes="Periodic fasting/PP glucose monitoring"
        )
        session.add(rem_sugar)
        created_reminders.append(rem_sugar)

        # 3. HbA1c Lab test reminder
        hba1c_days = intervals.get("hba1c", 90)
        rem_hba1c = PatientReminder(
            case_id=case_id,
            patient_ref=patient_name,
            patient_phone=patient_phone,
            reminder_type="hba1c",
            title="Quarterly HbA1c Lab Test",
            interval_days=hba1c_days,
            due_date=now + timedelta(days=hba1c_days),
            language=lang,
            status="scheduled",
            notes="Quarterly glycemic hemoglobin tracking"
        )
        session.add(rem_hba1c)
        created_reminders.append(rem_hba1c)

        session.commit()
        for r in created_reminders:
            session.refresh(r)

        return created_reminders

    def get_case_reminders_and_logs(self, case_id: str, session: Session) -> Dict[str, Any]:
        """Returns all scheduled reminders and SMS dispatch logs for a case."""
        reminders = session.exec(
            select(PatientReminder).where(PatientReminder.case_id == case_id)
        ).all()
        logs = session.exec(
            select(SMSLog)
            .where(SMSLog.case_id == case_id)
            .order_by(SMSLog.sent_at.desc())
        ).all()

        return {
            "case_id": case_id,
            "reminders": [r.model_dump() for r in reminders],
            "sms_logs": [l.model_dump() for l in logs]
        }

    def dispatch_reminder_by_id(self, reminder_id: int, session: Session) -> Dict[str, Any]:
        """Dispatches an SMS for a specific patient reminder."""
        reminder = session.get(PatientReminder, reminder_id)
        if not reminder:
            raise ValueError(f"Reminder {reminder_id} not found")

        case = session.get(Case, reminder.case_id)
        grading = session.exec(select(GradingResult).where(GradingResult.case_id == reminder.case_id)).first()

        grade_label = grading.grade_label if grading else "Diabetic Retinopathy"
        timeframe = f"{reminder.interval_days} days"

        # Format message
        extra = {
            "grade_label": grade_label,
            "timeframe": timeframe,
            "clinic": "Nearest Community Health Center / PHC"
        }
        msg = sms_service.format_message(
            reminder_type=reminder.reminder_type,
            patient_name=reminder.patient_ref,
            lang=reminder.language,
            extra_params=extra
        )

        # Send SMS
        result = sms_service.send_sms(
            phone_number=reminder.patient_phone,
            message_text=msg,
            reminder_type=reminder.reminder_type,
            reminder_id=reminder.id,
            case_id=reminder.case_id,
            session=session
        )

        return result

    def send_adhoc_sms(
        self,
        case_id: str,
        phone_number: str,
        reminder_type: str,
        session: Session,
        lang: str = "en",
        custom_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sends an on-demand SMS to a patient for a specific case."""
        case = session.get(Case, case_id)
        patient_name = case.patient_ref if case and case.patient_ref else f"Patient {case_id[:8].upper()}"
        grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
        grade_label = grading.grade_label if grading else "Diabetic Retinopathy"

        extra = {
            "grade_label": grade_label,
            "custom_text": custom_text or "",
            "clinic": "Nearest Community Vision Center"
        }

        msg = sms_service.format_message(
            reminder_type=reminder_type,
            patient_name=patient_name,
            lang=lang,
            extra_params=extra
        )

        return sms_service.send_sms(
            phone_number=phone_number,
            message_text=msg,
            reminder_type=reminder_type,
            case_id=case_id,
            session=session
        )

    def dispatch_due_reminders(self, session: Session) -> List[Dict[str, Any]]:
        """Batch evaluates and dispatches all scheduled reminders that have reached their due date."""
        now = datetime.now(timezone.utc)
        due = session.exec(
            select(PatientReminder)
            .where(PatientReminder.status == "scheduled")
            .where(PatientReminder.due_date <= now)
        ).all()

        results = []
        for rem in due:
            try:
                res = self.dispatch_reminder_by_id(rem.id, session)
                results.append({"reminder_id": rem.id, "success": True, "details": res})
            except Exception as e:
                logger.error(f"Failed dispatching reminder {rem.id}: {e}")
                results.append({"reminder_id": rem.id, "success": False, "error": str(e)})

        return results


reminder_service = ReminderService()

"""
API Router for Patient Reminders and SMS Dispatches.
Manages blood sugar and Diabetic Retinopathy follow-up schedules.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from backend.app.database import get_session
from backend.app.models.reminder import PatientReminder, SMSLog
from backend.app.services.reminder_service import reminder_service

router = APIRouter(prefix="", tags=["Patient Reminders & SMS"])


class ScheduleReminderRequest(BaseModel):
    patient_phone: str = Field(..., description="Mobile number with country code, e.g. +919876543210")
    language: str = Field(default="en", description="en or hi")


class SendAdhocSMSRequest(BaseModel):
    case_id: str
    phone_number: str
    reminder_type: str = Field(default="blood_sugar", description="blood_sugar | hba1c | retinal_screening | specialist_referral | custom")
    language: str = Field(default="en")
    custom_text: Optional[str] = None


@router.get("/cases/{case_id}/reminders")
def get_case_reminders(
    case_id: str,
    session: Session = Depends(get_session)
):
    """
    Retrieves all scheduled reminders and dispatched SMS logs for a patient case.
    """
    try:
        return reminder_service.get_case_reminders_and_logs(case_id, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "REMINDER_FETCH_ERROR", "message": str(e)})


@router.post("/cases/{case_id}/reminders")
def schedule_case_reminders(
    case_id: str,
    payload: ScheduleReminderRequest,
    session: Session = Depends(get_session)
):
    """
    Computes evidence-based follow-up intervals and schedules reminders for blood sugar and DR rescreening.
    """
    try:
        reminders = reminder_service.auto_schedule_reminders(
            case_id=case_id,
            session=session,
            patient_phone=payload.patient_phone,
            lang=payload.language
        )
        return {
            "status": "success",
            "message": f"Successfully scheduled {len(reminders)} clinical follow-up reminders.",
            "reminders": [r.model_dump() for r in reminders]
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail={"code": "CASE_NOT_FOUND", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "REMINDER_SCHEDULE_ERROR", "message": str(e)})


@router.post("/reminders/{reminder_id}/send")
def trigger_reminder_dispatch(
    reminder_id: int,
    session: Session = Depends(get_session)
):
    """
    Immediately dispatches an SMS for a specific scheduled patient reminder.
    """
    try:
        result = reminder_service.dispatch_reminder_by_id(reminder_id, session)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail={"code": "REMINDER_NOT_FOUND", "message": str(ve)})
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "SMS_DISPATCH_ERROR", "message": str(e)})


@router.post("/reminders/send-custom")
def send_custom_sms(
    payload: SendAdhocSMSRequest,
    session: Session = Depends(get_session)
):
    """
    Dispatches an on-demand custom or template-based SMS alert to a patient.
    """
    try:
        result = reminder_service.send_adhoc_sms(
            case_id=payload.case_id,
            phone_number=payload.phone_number,
            reminder_type=payload.reminder_type,
            session=session,
            lang=payload.language,
            custom_text=payload.custom_text
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "SMS_CUSTOM_ERROR", "message": str(e)})


@router.get("/reminders/logs")
def get_sms_logs(
    limit: int = Query(50, le=100),
    session: Session = Depends(get_session)
):
    """
    Returns the recent system-wide SMS audit trail.
    """
    logs = session.exec(
        select(SMSLog).order_by(SMSLog.sent_at.desc()).limit(limit)
    ).all()
    return [l.model_dump() for l in logs]


@router.post("/reminders/dispatch-due")
def batch_dispatch_due_reminders(
    session: Session = Depends(get_session)
):
    """
    Batch endpoint to evaluate and dispatch all currently due reminders (for cron/worker integration).
    """
    try:
        dispatched = reminder_service.dispatch_due_reminders(session)
        return {
            "status": "success",
            "dispatched_count": len(dispatched),
            "results": dispatched
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "BATCH_DISPATCH_ERROR", "message": str(e)})

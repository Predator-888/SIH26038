"""
SQLModel ORM models for Patient Reminders and SMS Dispatch Logs.
Tracks follow-up schedules for blood glucose monitoring, HbA1c tests,
and Diabetic Retinopathy retinal rescreenings.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class PatientReminder(SQLModel, table=True):
    __tablename__ = "patient_reminders"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="cases.case_id", index=True)
    patient_ref: str = Field(index=True)
    patient_phone: str
    reminder_type: str = Field(description="blood_sugar | hba1c | retinal_screening | specialist_referral")
    title: str
    interval_days: int
    due_date: datetime
    language: str = Field(default="en")
    status: str = Field(default="scheduled")  # scheduled | sent | cancelled
    last_sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None


class SMSLog(SQLModel, table=True):
    __tablename__ = "sms_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    reminder_id: Optional[int] = Field(default=None, foreign_key="patient_reminders.id", nullable=True)
    case_id: Optional[str] = Field(default=None, index=True, nullable=True)
    recipient_phone: str
    message_text: str
    reminder_type: Optional[str] = None
    provider: str = Field(default="mock")
    status: str = Field(default="delivered")  # delivered | sent | failed
    provider_response: Optional[str] = None
    sent_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

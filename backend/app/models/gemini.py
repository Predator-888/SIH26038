"""
SQLModel ORM model for Gemini 2.5 Flash Clinical Findings Validation & Explanation.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field


class GeminiValidation(SQLModel, table=True):
    __tablename__ = "gemini_validations"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="cases.case_id", index=True)
    lang: str = Field(default="en")
    status: str = Field(default="CONCORDANT")  # CONCORDANT | CONCORDANT_WITH_CAUTION | REVIEW_REQUIRED
    clinical_explanation: str
    clinical_recommendation: Optional[str] = None
    macular_edema_risk: Optional[str] = None
    model_name: str = Field(default="gemini-2.5-flash")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

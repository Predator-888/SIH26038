"""
SQLModel ORM models for screening cases and image quality results.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Column, JSON


class Case(SQLModel, table=True):
    __tablename__ = "cases"

    case_id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    patient_ref: Optional[str] = Field(default=None, nullable=True)
    image_path: str
    processed_image_path: Optional[str] = None
    status: str = Field(default="uploaded")  # uploaded | quality_rejected | processing | graded | reviewed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewer_decision: Optional[str] = None  # confirm | override
    reviewer_notes: Optional[str] = None
    override_grade: Optional[int] = None


class ImageQualityResult(SQLModel, table=True):
    __tablename__ = "image_quality_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="cases.case_id", index=True)
    passed: bool
    quality_score: float
    focus_score: float
    illumination_score: float
    fov_score: float
    reject_reasons: List[str] = Field(default=[], sa_column=Column(JSON))

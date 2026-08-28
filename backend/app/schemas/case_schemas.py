"""
Pydantic schemas for case creation, upload, and worklist querying.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class QualityResultResponse(BaseModel):
    passed: bool
    quality_score: float
    focus_score: float
    illumination_score: float
    fov_score: float
    reject_reasons: List[str] = []


class CaseUploadResponse(BaseModel):
    case_id: str
    status: str
    created_at: datetime
    quality: QualityResultResponse
    image_url: Optional[str] = None


class CaseListItem(BaseModel):
    case_id: str
    patient_ref: Optional[str] = None
    created_at: datetime
    status: str
    grade: Optional[int] = None
    grade_label: Optional[str] = None
    confidence: Optional[float] = None
    confidence_band: Optional[str] = None
    thumbnail_url: Optional[str] = None


class CaseListResponse(BaseModel):
    total: int
    items: List[CaseListItem]


class ReviewSubmissionRequest(BaseModel):
    reviewer_decision: str = Field(description="confirm or override")
    reviewer_notes: Optional[str] = None
    override_grade: Optional[int] = None

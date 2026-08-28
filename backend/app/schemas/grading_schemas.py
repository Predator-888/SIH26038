"""
Pydantic schemas for DR Grading and Clinical Explainability results.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class LesionResponse(BaseModel):
    type: str  # microaneurysm | exudate | hemorrhage | neovascularization
    bbox: List[float]  # [x, y, w, h] normalized
    confidence: float


class ExplainabilityResponse(BaseModel):
    gradcam_overlay_url: str
    lesions: List[LesionResponse]
    summary_text: str


class GradingDetailResponse(BaseModel):
    grade: int
    grade_label: str
    referable: bool
    probabilities: Dict[str, float]
    confidence: float
    confidence_band: str  # confident_normal | confident_referable | uncertain_review


class CaseResultResponse(BaseModel):
    case_id: str
    patient_ref: Optional[str] = None
    status: str
    image_url: str
    processed_image_url: Optional[str] = None
    grading: Optional[GradingDetailResponse] = None
    explainability: Optional[ExplainabilityResponse] = None
    reviewer_decision: Optional[str] = None
    reviewer_notes: Optional[str] = None
    override_grade: Optional[int] = None

"""
SQLModel ORM models for DR Grading, Lesions, and Clinical Summaries.
"""

from typing import Optional, Dict, List
from sqlmodel import SQLModel, Field, Column, JSON


class GradingResult(SQLModel, table=True):
    __tablename__ = "grading_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="cases.case_id", index=True)
    grade: int  # 0 to 4
    grade_label: str
    referable: bool
    probabilities: Dict[str, float] = Field(default={}, sa_column=Column(JSON))
    confidence: float
    confidence_band: str  # confident_normal | confident_referable | uncertain_review
    gradcam_overlay_path: Optional[str] = None
    summary_text: Optional[str] = None


class Lesion(SQLModel, table=True):
    __tablename__ = "lesions"

    id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="cases.case_id", index=True)
    type: str  # microaneurysm | exudate | hemorrhage | neovascularization
    bbox: List[float] = Field(sa_column=Column(JSON))  # [x, y, w, h] normalized
    confidence: float

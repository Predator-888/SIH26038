"""
API Router for Case upload, retrieval, and clinical review.
"""

import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.config import settings
from backend.app.models.case import Case, ImageQualityResult
from backend.app.models.grading import GradingResult
from backend.app.schemas.case_schemas import (
    CaseUploadResponse,
    QualityResultResponse,
    CaseListResponse,
    CaseListItem,
    ReviewSubmissionRequest
)
from backend.app.services.quality_service import quality_service

router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("/upload", response_model=CaseUploadResponse, status_code=201)
async def upload_case(
    image: UploadFile = File(...),
    patient_ref: Optional[str] = Form(None),
    session: Session = Depends(get_session)
):
    """
    Uploads a fundus image, creates a Case, runs synchronous Quality Assessment.
    """
    # 1. Validate file extension
    ext = os.path.splitext(image.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail={"code": "UNSUPPORTED_FORMAT", "message": "Only JPEG and PNG formats are accepted."}
        )

    # 2. Save image locally
    case_id = str(uuid.uuid4())
    save_filename = f"{case_id}{ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, save_filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Check file size
    file_size_mb = os.path.getsize(save_path) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        os.remove(save_path)
        raise HTTPException(
            status_code=400,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": f"Uploaded image ({file_size_mb:.1f}MB) exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit."
            }
        )

    # 3. Create Case record
    new_case = Case(
        case_id=case_id,
        patient_ref=patient_ref,
        image_path=save_path,
        status="uploaded",
        created_at=datetime.now(timezone.utc)
    )
    session.add(new_case)
    session.commit()
    session.refresh(new_case)

    # 4. Run synchronous image quality heuristics
    quality_result = quality_service.evaluate_case_image(new_case, session)

    return CaseUploadResponse(
        case_id=new_case.case_id,
        status=new_case.status,
        created_at=new_case.created_at,
        quality=QualityResultResponse(
            passed=quality_result.passed,
            quality_score=quality_result.quality_score,
            focus_score=quality_result.focus_score,
            illumination_score=quality_result.illumination_score,
            fov_score=quality_result.fov_score,
            reject_reasons=quality_result.reject_reasons
        ),
        image_url=f"/api/v1/cases/{case_id}/image"
    )


@router.get("", response_model=CaseListResponse)
def list_cases(
    status: Optional[str] = Query(None),
    confidence_band: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session)
):
    """
    Lists screening cases for the Reviewer Queue Worklist.
    """
    query = select(Case).order_by(Case.created_at.desc())
    if status:
        query = query.where(Case.status == status)
    
    all_cases = session.exec(query).all()
    
    items: List[CaseListItem] = []
    for c in all_cases:
        grading = session.exec(select(GradingResult).where(GradingResult.case_id == c.case_id)).first()
        
        if confidence_band and grading and grading.confidence_band != confidence_band:
            continue

        items.append(CaseListItem(
            case_id=c.case_id,
            patient_ref=c.patient_ref,
            created_at=c.created_at,
            status=c.status,
            grade=grading.grade if grading else None,
            grade_label=grading.grade_label if grading else None,
            confidence=grading.confidence if grading else None,
            confidence_band=grading.confidence_band if grading else None,
            thumbnail_url=f"/api/v1/cases/{c.case_id}/image"
        ))

    total = len(items)
    paginated_items = items[offset : offset + limit]

    return CaseListResponse(total=total, items=paginated_items)


@router.post("/{case_id}/review")
def review_case(
    case_id: str,
    review_data: ReviewSubmissionRequest,
    session: Session = Depends(get_session)
):
    """
    Clinician submits final confirm or override decision.
    """
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail={"code": "CASE_NOT_FOUND", "message": "Case not found."})

    case.status = "reviewed"
    case.reviewed_at = datetime.now(timezone.utc)
    case.reviewer_decision = review_data.reviewer_decision
    case.reviewer_notes = review_data.reviewer_notes
    case.override_grade = review_data.override_grade

    session.add(case)
    session.commit()
    session.refresh(case)
    return {"status": "success", "message": "Review recorded successfully.", "case_id": case_id}

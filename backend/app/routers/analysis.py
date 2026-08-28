"""
API Router for ML analysis triggering and result inspection.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from backend.app.database import get_session
from backend.app.models.case import Case
from backend.app.models.grading import GradingResult, Lesion
from backend.app.schemas.grading_schemas import (
    CaseResultResponse,
    GradingDetailResponse,
    ExplainabilityResponse,
    LesionResponse
)
from backend.app.services.pipeline_service import pipeline_service

router = APIRouter(prefix="/cases", tags=["Analysis"])


@router.post("/{case_id}/analyze", status_code=202)
def trigger_analysis(
    case_id: str,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """
    Triggers end-to-end ML inference (Segmentation -> Grading -> Grad-CAM).
    """
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail={"code": "CASE_NOT_FOUND", "message": "Case not found."})

    if case.status == "quality_rejected":
        raise HTTPException(
            status_code=400,
            detail={"code": "QUALITY_REJECTED", "message": "Cannot analyze an image that failed quality assessment."}
        )

    # Run synchronously or dispatch to background task
    # For instant responsive feel in prototype, execute immediately
    try:
        pipeline_service.process_case(case_id, session)
        return {"case_id": case_id, "status": "graded"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "MODEL_INFERENCE_ERROR", "message": str(e)}
        )


@router.get("/{case_id}/result", response_model=CaseResultResponse)
def get_case_result(
    case_id: str,
    session: Session = Depends(get_session)
):
    """
    Fetches full grading, confidence triage band, and lesion explainability details.
    """
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail={"code": "CASE_NOT_FOUND", "message": "Case not found."})

    grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
    lesions_db = session.exec(select(Lesion).where(Lesion.case_id == case_id)).all()

    grading_resp = None
    explain_resp = None

    if grading:
        grading_resp = GradingDetailResponse(
            grade=grading.grade,
            grade_label=grading.grade_label,
            referable=grading.referable,
            probabilities=grading.probabilities,
            confidence=grading.confidence,
            confidence_band=grading.confidence_band
        )

        lesion_items = [
            LesionResponse(type=l.type, bbox=l.bbox, confidence=l.confidence)
            for l in lesions_db
        ]

        explain_resp = ExplainabilityResponse(
            gradcam_overlay_url=f"/static/cases/{case_id}/gradcam.png",
            lesions=lesion_items,
            summary_text=grading.summary_text or ""
        )

    return CaseResultResponse(
        case_id=case.case_id,
        patient_ref=case.patient_ref,
        status=case.status,
        image_url=f"/api/v1/cases/{case_id}/image",
        processed_image_url=f"/static/cases/{case_id}/preprocessed.png" if case.processed_image_path else None,
        grading=grading_resp,
        explainability=explain_resp,
        reviewer_decision=case.reviewer_decision,
        reviewer_notes=case.reviewer_notes,
        override_grade=case.override_grade
    )


@router.get("/{case_id}/image")
def get_case_image(
    case_id: str,
    session: Session = Depends(get_session)
):
    """
    Serves the original uploaded fundus image.
    """
    case = session.get(Case, case_id)
    if not case or not os.path.exists(case.image_path):
        raise HTTPException(status_code=404, detail={"code": "IMAGE_NOT_FOUND", "message": "Image not found."})
    
    media_type = "image/jpeg" if case.image_path.lower().endswith((".jpg", ".jpeg")) else "image/png"
    return FileResponse(case.image_path, media_type=media_type)

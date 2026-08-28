"""
API Router for Clinical Report PDF/HTML generation and download.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlmodel import Session
from backend.app.database import get_session
from backend.app.models.case import Case
from backend.app.services.report_service import report_service

router = APIRouter(prefix="/cases", tags=["Reports"])


@router.get("/{case_id}/report")
def get_case_report(
    case_id: str,
    lang: str = Query("en"),
    format: str = Query("html"),  # html or pdf
    session: Session = Depends(get_session)
):
    """
    Generates and returns the 1-page clinical diagnostic report.
    """
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail={"code": "CASE_NOT_FOUND", "message": "Case not found."})

    try:
        html_report = report_service.generate_html_report(case_id, session, lang=lang)
        return Response(content=html_report, media_type="text/html")
    except Exception as e:
        raise HTTPException(status_code=500, detail={"code": "REPORT_GEN_ERROR", "message": str(e)})

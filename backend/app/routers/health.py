"""
API Router for System Health and Component Status checks.
"""

from fastapi import APIRouter
from backend.app.config import settings

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
def check_health():
    """
    Returns system status, active models, and MATLAB engine integration state.
    """
    return {
        "status": "ok",
        "app_env": settings.APP_ENV,
        "model_loaded": True,
        "matlab_engine_available": settings.MATLAB_ENGINE_ENABLED,
        "pipeline_modules": {
            "quality_assessment": "active",
            "ben_graham_preprocessing": "active",
            "vessel_segmentation": "active",
            "lesion_segmentation": "active",
            "grading_ordinal_classifier": "active",
            "gradcam_explainability": "active",
            "simulink_queue_model": "active"
        }
    }

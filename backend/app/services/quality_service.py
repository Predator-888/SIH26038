"""
Service handling image quality assessment on uploaded fundus images.
"""

import os
import cv2
from sqlmodel import Session
from backend.app.models.case import Case, ImageQualityResult
from ml.quality.quality_model import quality_evaluator
from ml.data.preprocess import crop_to_circle_mask


class QualityService:
    @staticmethod
    def evaluate_case_image(case: Case, session: Session) -> ImageQualityResult:
        """Runs synchronous quality assessment heuristics on case image."""
        eval_result = quality_evaluator.evaluate(case.image_path)
        
        quality_entry = ImageQualityResult(
            case_id=case.case_id,
            passed=eval_result["passed"],
            quality_score=eval_result["quality_score"],
            focus_score=eval_result["focus_score"],
            illumination_score=eval_result["illumination_score"],
            fov_score=eval_result["fov_score"],
            reject_reasons=eval_result["reject_reasons"]
        )

        session.add(quality_entry)
        
        # Update case status
        if eval_result["passed"]:
            case.status = "uploaded"
        else:
            case.status = "quality_rejected"
        session.add(case)
        session.commit()
        session.refresh(quality_entry)
        return quality_entry


quality_service = QualityService()

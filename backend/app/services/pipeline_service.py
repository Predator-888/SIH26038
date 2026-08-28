"""
Orchestration service for the complete Retinal Analysis Pipeline (SIH26038).
Executes Preprocessing -> Segmentation -> Grading -> Grad-CAM -> Clinical Summary.
"""

import os
import cv2
from sqlmodel import Session, select
from backend.app.config import settings
from backend.app.models.case import Case
from backend.app.models.grading import GradingResult, Lesion
from ml.data.preprocess import preprocess_fundus_pipeline
from ml.segmentation.unet_vessels import vessel_segmentor
from ml.segmentation.unet_lesions import lesion_segmentor
from ml.grading.grading_model import dr_grader
from ml.explainability.gradcam import gradcam_generator
from ml.explainability.report_summary import generate_clinical_summary_text


class PipelineService:
    @staticmethod
    def process_case(case_id: str, session: Session) -> Case:
        """
        Executes end-to-end ML inference pipeline for a given case.
        """
        case = session.get(Case, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        case.status = "processing"
        session.add(case)
        session.commit()

        try:
            # 1. Preprocessing (Ben Graham + CLAHE)
            ben_graham_rgb, clahe_rgb = preprocess_fundus_pipeline(case.image_path)
            
            # Save preprocessed image to static directory
            case_static_dir = os.path.join(settings.STATIC_DIR, "cases", case_id)
            os.makedirs(case_static_dir, exist_ok=True)
            
            proc_img_path = os.path.join(case_static_dir, "preprocessed.png")
            cv2.imwrite(proc_img_path, cv2.cvtColor(ben_graham_rgb, cv2.COLOR_RGB2BGR))
            case.processed_image_path = proc_img_path

            # 2. Retinal Structure Segmentation
            vessel_mask = vessel_segmentor.segment_vessels(ben_graham_rgb)
            optic_disc = vessel_segmentor.locate_optic_disc(ben_graham_rgb)

            # 3. Lesion Extraction (Exudates, Hemorrhages, Microaneurysms)
            detected_lesions = lesion_segmentor.extract_all_lesions(ben_graham_rgb, vessel_mask, optic_disc)

            # Remove prior lesions if any
            existing_lesions = session.exec(select(Lesion).where(Lesion.case_id == case_id)).all()
            for el in existing_lesions:
                session.delete(el)

            # Save Lesion entries
            for l_data in detected_lesions:
                lesion_obj = Lesion(
                    case_id=case_id,
                    type=l_data["type"],
                    bbox=l_data["bbox"],
                    confidence=l_data["confidence"]
                )
                session.add(lesion_obj)

            # 4. 5-Class Severity Grading & Calibration
            grading_output = dr_grader.predict(ben_graham_rgb, detected_lesions=detected_lesions)

            # 5. Explainability (Grad-CAM Heatmap Overlay)
            gradcam_rel_path = os.path.join("cases", case_id, "gradcam.png")
            gradcam_full_path = os.path.join(settings.STATIC_DIR, gradcam_rel_path)
            
            gradcam_generator.save_gradcam_overlay(
                output_path=gradcam_full_path,
                rgb_image=ben_graham_rgb,
                lesions=detected_lesions,
                grade=grading_output["grade"]
            )

            # 6. Structured Clinical Summary
            summary_text = generate_clinical_summary_text(detected_lesions, grading_output["grade"])

            # Remove prior grading result if re-running
            existing_grading = session.exec(select(GradingResult).where(GradingResult.case_id == case_id)).first()
            if existing_grading:
                session.delete(existing_grading)

            # Save GradingResult entry
            grading_result = GradingResult(
                case_id=case_id,
                grade=grading_output["grade"],
                grade_label=grading_output["grade_label"],
                referable=grading_output["referable"],
                probabilities=grading_output["probabilities"],
                confidence=grading_output["confidence"],
                confidence_band=grading_output["confidence_band"],
                gradcam_overlay_path=gradcam_full_path,
                summary_text=summary_text
            )
            session.add(grading_result)

            # Mark case as graded
            case.status = "graded"
            session.add(case)
            session.commit()
            session.refresh(case)
            return case

        except Exception as e:
            case.status = "uploaded"  # Revert so user can retry
            session.add(case)
            session.commit()
            raise RuntimeError(f"Pipeline execution failed for case {case_id}: {str(e)}")


pipeline_service = PipelineService()

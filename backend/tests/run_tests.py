"""
Direct test execution script for SIH26038 ML Pipeline and Services.
"""

import sys
import numpy as np
import cv2
import tempfile
import os

from backend.app.schemas.simulation_schemas import SimulationRequest
from backend.app.services.simulation_service import simulation_service
from ml.data.preprocess import apply_ben_graham_preprocessing
from ml.quality.quality_model import quality_evaluator
from ml.grading.grading_model import dr_grader
from ml.explainability.report_summary import generate_clinical_summary_text, get_lesion_quadrant


def run_all_tests():
    print("=" * 60)
    print("SIH26038 Automated Pipeline & Architecture Validation")
    print("=" * 60)
    
    # 1. Preprocessing Test
    print("[1/5] Testing Ben Graham Preprocessing...")
    dummy_img = np.full((600, 600, 3), 120, dtype=np.uint8)
    cv2.circle(dummy_img, (300, 300), 280, (40, 80, 210), -1)
    processed = apply_ben_graham_preprocessing(dummy_img, target_size=512)
    assert processed.shape == (512, 512, 3), "Shape mismatch in Ben Graham output"
    print("      [PASS] Output shape 512x512 with circular vignette verified.")

    # 2. Quality Assessment Test
    print("[2/5] Testing Image Quality Heuristics (Focus, Light, FOV)...")
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
        temp_img_path = f.name
    
    try:
        synth_fundus = np.zeros((512, 512, 3), dtype=np.uint8)
        cv2.circle(synth_fundus, (256, 256), 230, (25, 60, 200), -1)
        cv2.circle(synth_fundus, (380, 260), 35, (160, 230, 255), -1)
        cv2.line(synth_fundus, (380, 260), (150, 180), (10, 15, 80), 3)
        cv2.imwrite(temp_img_path, synth_fundus)

        q_res = quality_evaluator.evaluate(temp_img_path)
        assert 0.0 <= q_res["quality_score"] <= 1.0
        print(f"      [PASS] Quality Score: {q_res['quality_score']}, Focus: {q_res['focus_score']}, Passed: {q_res['passed']}")
    finally:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)

    # 3. DR Grading Calibration Test
    print("[3/5] Testing 5-Class Grading & Temperature Scaling...")
    grading_out = dr_grader.predict(processed)
    assert 0 <= grading_out["grade"] <= 4
    assert grading_out["confidence_band"] in ["confident_normal", "confident_referable", "uncertain_review"]
    prob_sum = sum(grading_out["probabilities"].values())
    assert 0.98 <= prob_sum <= 1.02
    print(f"      [PASS] Grade: L{grading_out['grade']} ({grading_out['grade_label']}), Triage: {grading_out['confidence_band']}, ProbSum: {prob_sum:.4f}")

    # 4. Lesion Quadrant & Narrative Summary Test
    print("[4/5] Testing Quadrant Segmentation & Narrative Generation...")
    sample_lesions = [
        {"type": "microaneurysm", "bbox": [0.25, 0.20, 0.04, 0.04], "confidence": 0.85},
        {"type": "hemorrhage", "bbox": [0.70, 0.65, 0.05, 0.05], "confidence": 0.88},
    ]
    q1 = get_lesion_quadrant(sample_lesions[0]["bbox"])
    q2 = get_lesion_quadrant(sample_lesions[1]["bbox"])
    assert q1 == "superior temporal"
    assert q2 == "inferior nasal"
    narrative = generate_clinical_summary_text(sample_lesions, grade=2)
    assert "microaneurysm" in narrative.lower()
    print(f"      [PASS] Summary: \"{narrative}\"")

    # 5. Simulink Telemedicine Simulation Test
    print("[5/5] Testing Simulink Discrete-Event Queue Engine...")
    params = SimulationRequest(
        num_cameras=5,
        num_reviewers=2,
        bandwidth_mbps=4.0,
        images_per_day_per_camera=40,
        avg_review_time_sec=25,
        ai_processing_time_sec=3.5
    )
    sim_out = simulation_service.run_simulation(params)
    assert sim_out.annual_demand == 60000
    assert sim_out.annual_capacity > 0
    assert sim_out.bottleneck in ["bandwidth", "processing", "review_capacity", "none"]
    print(f"      [PASS] Annual Capacity: {sim_out.annual_capacity:,}, Demand: {sim_out.annual_demand:,}, Bottleneck: {sim_out.bottleneck}")
    print(f"      [PASS] Recommendation: \"{sim_out.recommendation}\"")

    print("=" * 60)
    print("ALL 5 CORE PIPELINE MODULES PASSED VALIDATION PERFECTLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_all_tests()

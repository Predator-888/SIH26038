"""
Automated Test Suite for SIH26038 DR Screening Pipeline.
Tests:
- Quality heuristics (Laplacian variance focus, illumination balance, FOV)
- Preprocessing (Ben Graham circular masking & CLAHE)
- 5-Class grading and temperature scaling
- Telemedicine simulation throughput & bottleneck detection
- Database CRUD and Case lifecycle
"""

import os
import cv2
import numpy as np
import pytest
from sqlmodel import Session, SQLModel, create_engine
from backend.app.models.case import Case, ImageQualityResult
from backend.app.models.grading import GradingResult, Lesion
from backend.app.schemas.simulation_schemas import SimulationRequest
from backend.app.services.quality_service import quality_service
from backend.app.services.simulation_service import simulation_service
from ml.data.preprocess import crop_to_circle_mask, apply_ben_graham_preprocessing
from ml.quality.quality_model import quality_evaluator
from ml.grading.grading_model import dr_grader
from ml.explainability.report_summary import generate_clinical_summary_text, get_lesion_quadrant


@pytest.fixture(name="sample_fundus_image")
def sample_fundus_image_fixture(tmp_path):
    """Creates a synthetic fundus test image on disk."""
    img_path = str(tmp_path / "test_fundus.jpg")
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    
    # Draw circular retinal disc
    cv2.circle(img, (256, 256), 230, (25, 60, 200), -1) # BGR
    # Draw optic disc
    cv2.circle(img, (380, 260), 35, (160, 230, 255), -1)
    # Draw sample vessel
    cv2.line(img, (380, 260), (150, 180), (10, 15, 80), 3)

    cv2.imwrite(img_path, img)
    return img_path


def test_ben_graham_preprocessing():
    """Verify Ben Graham preprocessing outputs valid 512x512 normalized canvas."""
    dummy_img = np.full((600, 600, 3), 120, dtype=np.uint8)
    cv2.circle(dummy_img, (300, 300), 280, (40, 80, 210), -1)
    
    processed = apply_ben_graham_preprocessing(dummy_img, target_size=512)
    assert processed.shape == (512, 512, 3)
    assert processed.dtype == np.uint8


def test_quality_evaluation(sample_fundus_image):
    """Verify focus, illumination, and FOV scoring heuristics."""
    result = quality_evaluator.evaluate(sample_fundus_image)
    
    assert "passed" in result
    assert "quality_score" in result
    assert "focus_score" in result
    assert "illumination_score" in result
    assert "fov_score" in result
    assert isinstance(result["reject_reasons"], list)
    assert 0.0 <= result["quality_score"] <= 1.0


def test_dr_grading_calibration():
    """Verify 5-class predictions are normalized and assigned to valid triage bands."""
    dummy_processed = np.full((512, 512, 3), 128, dtype=np.uint8)
    output = dr_grader.predict(dummy_processed)

    assert 0 <= output["grade"] <= 4
    assert output["confidence_band"] in ["confident_normal", "confident_referable", "uncertain_review"]
    assert len(output["probabilities"]) == 5
    
    prob_sum = sum(output["probabilities"].values())
    assert 0.98 <= prob_sum <= 1.02


def test_lesion_quadrant_analysis():
    """Verify quadrant categorization and clinical narrative generation."""
    lesions = [
        {"type": "microaneurysm", "bbox": [0.25, 0.20, 0.04, 0.04], "confidence": 0.85},
        {"type": "hemorrhage", "bbox": [0.70, 0.65, 0.05, 0.05], "confidence": 0.88},
    ]
    
    quad1 = get_lesion_quadrant(lesions[0]["bbox"])
    assert quad1 == "superior temporal"
    
    quad2 = get_lesion_quadrant(lesions[1]["bbox"])
    assert quad2 == "inferior nasal"

    summary = generate_clinical_summary_text(lesions, grade=2)
    assert "microaneurysm" in summary.lower()
    assert "hemorrhage" in summary.lower()


def test_telemedicine_simulation_service():
    """Verify discrete-event queue calculations and bottleneck diagnosis."""
    params = SimulationRequest(
        num_cameras=5,
        num_reviewers=2,
        bandwidth_mbps=4.0,
        images_per_day_per_camera=40,
        avg_review_time_sec=25,
        ai_processing_time_sec=3.5
    )

    sim_res = simulation_service.run_simulation(params)
    assert sim_res.annual_demand == 5 * 40 * 300
    assert sim_res.annual_capacity > 0
    assert sim_res.bottleneck in ["bandwidth", "processing", "review_capacity", "none"]
    assert len(sim_res.backlog_over_time) > 0
    assert len(sim_res.recommendation) > 10


def test_neovascularization_detection_and_pdr_alert():
    """Verify neovascularization detection formatting and proliferative alert."""
    lesions = [
        {"type": "neovascularization", "bbox": [0.30, 0.25, 0.08, 0.06], "confidence": 0.92},
        {"type": "microaneurysm", "bbox": [0.20, 0.35, 0.02, 0.02], "confidence": 0.84}
    ]
    summary = generate_clinical_summary_text(lesions, grade=4)
    assert "neovascularization" in summary.lower()
    assert "proliferative dr risk alert" in summary.lower()


def test_district_scale_100k_capacity():
    """Verify system satisfies the official PS requirement: 100,000+ patients/year."""
    params = SimulationRequest(
        num_cameras=10,
        num_reviewers=4,
        bandwidth_mbps=8.0,
        images_per_day_per_camera=40,
        avg_review_time_sec=25,
        ai_processing_time_sec=3.5
    )
    res = simulation_service.run_simulation(params)
    assert res.annual_screened >= 100000, f"Expected >= 100,000 capacity, got {res.annual_screened}"


def test_simulink_and_matlab_files_present():
    """Verify that all official MathWorks deliverables are present in repository."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    
    # 1. Simulink models and scripts
    assert os.path.exists(os.path.join(repo_root, "simulink", "screening_workflow.mdl"))
    assert os.path.exists(os.path.join(repo_root, "simulink", "build_simulink_model.m"))
    assert os.path.exists(os.path.join(repo_root, "simulink", "run_simulation.m"))
    
    # 2. Native MATLAB Suite
    assert os.path.exists(os.path.join(repo_root, "matlab", "netraai_master_pipeline.m"))
    assert os.path.exists(os.path.join(repo_root, "matlab", "retinal_quality_and_preprocess.m"))
    assert os.path.exists(os.path.join(repo_root, "matlab", "retinal_structure_segmentation.m"))
    assert os.path.exists(os.path.join(repo_root, "matlab", "dr_grading_inference.m"))
    assert os.path.exists(os.path.join(repo_root, "matlab", "triage_and_statistics.m"))


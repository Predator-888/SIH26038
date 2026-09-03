# NetraAI (SIH26038): Native MATLAB Suite & Toolbox Documentation

**Sponsor:** MathWorks · **Problem Statement ID:** 26038  
**Theme:** MedTech / BioTech / HealthTech  

---

## 1. Overview

This directory houses the **native MATLAB R2024b implementation** of the NetraAI Retinal Screening Pipeline, satisfying all 6 toolboxes specified in the official MathWorks Problem Statement:

```
┌────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┐
│ Mandated MathWorks Toolbox             │ NetraAI File / Implementation Module                                  │
├────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────┤
│ 1. Image Processing Toolbox            │ retinal_quality_and_preprocess.m (adapthisteq CLAHE, Ben Graham, tophat)│
│ 2. Computer Vision Toolbox             │ retinal_quality_and_preprocess.m (Laplacian variance, circular FOV)   │
│ 3. Deep Learning Toolbox               │ dr_grading_inference.m (importNetworkFromONNX, predict, gradCAM)      │
│ 4. Medical Imaging Toolbox             │ retinal_structure_segmentation.m (Optic disc, vessels, lesion masks)  │
│ 5. Statistics and Machine Learning     │ triage_and_statistics.m (Temperature scaling, triage distribution)    │
│ 6. Simulink / SimEvents                │ simulink/screening_workflow.mdl & run_simulation.m (100k+ patients)   │
└────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quick-Start Demo for MathWorks Judges

1. Open **MATLAB R2024b** (or R2018b–R2024b).
2. Navigate to the `matlab/` directory:
   ```matlab
   cd('c:/Users/LENONO/Desktop/SIH 2026/SIH26038/matlab');
   ```
3. Execute the one-click master pipeline:
   ```matlab
   netraai_master_pipeline
   ```
4. **Output Produced**:
   - Console logs detailing focus scores, vessel density, lesion counts by quadrant, 5-class ICDR grade, and triage bands.
   - Comprehensive **6-panel Clinical Workstation figure** displaying:
     1. Raw Fundus Scan with quality score
     2. Ben Graham Preprocessing + Green-channel CLAHE
     3. Retinal Structure Segmentation (Vessel Tree, Optic Disc, Fovea)
     4. Lesion Annotations by Quadrant (Microaneurysms, Hemorrhages, Neovascularization)
     5. Grad-CAM++ Visual Explainability Heatmap
     6. Simulink Telemedicine Triage Breakdown & Doctor Workload Savings.

---

## 3. Script-by-Script Breakdown

- **`netraai_master_pipeline.m`**: Master orchestration script coordinating all 5 pipeline stages and generating the clinical dashboard figure.
- **`retinal_quality_and_preprocess.m`**: Computes Laplacian focus variance ($>120$ sharp, $<60$ blurry), illumination histograms, and circular FOV completeness. Applies Ben Graham color normalization ($4 \times I - 4 \times \text{imgaussfilt}(I) + 128$) and Green-channel CLAHE (`adapthisteq`).
- **`retinal_structure_segmentation.m`**: Extracts Optic Disc via morphological opening (`imopen`, `strel('disk', 25)`), blood vessel tree via morphological top-hat (`imtophat`), and indexes Microaneurysms, Hemorrhages, Exudates, and Neovascularization (NV) by quadrant.
- **`dr_grading_inference.m`**: Loads `ml/checkpoints/idrid_grading_model.onnx` into MATLAB's Deep Learning Toolbox via `importNetworkFromONNX`, computes calibrated 5-class probabilities ($T=1.24$), and synthesizes Grad-CAM saliency heatmaps.
- **`triage_and_statistics.m`**: Computes population screening triage routing (`confident_normal` 60%, `confident_referable` 15%, `uncertain_review` 25%), demonstrating a 75% reduction in ophthalmologist reading workload.

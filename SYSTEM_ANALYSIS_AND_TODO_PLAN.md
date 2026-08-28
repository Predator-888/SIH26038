# System Analysis & Phased Implementation Plan — SIH26038
**Project:** Explainable AI for Diabetic Retinopathy Screening in Rural India  
**Sponsor:** MathWorks · **Theme:** MedTech / BioTech / HealthTech  
**Companion Documents:** [`PRD_SIH26038_DR_Screening.md`](file:///c:/Users/LENONO/Desktop/SIH%202026/SIH26038/PRD_SIH26038_DR_Screening.md) · [`TECH_STACK_SIH26038.md`](file:///c:/Users/LENONO/Desktop/SIH%202026/SIH26038/TECH_STACK_SIH26038.md) · [`UI_UX_SPEC_SIH26038.md`](file:///c:/Users/LENONO/Desktop/SIH%202026/SIH26038/UI_UX_SPEC_SIH26038.md)

---

## Executive Summary & Problem Context

India is home to over 77 million diabetic adults, of whom approximately 18% develop Diabetic Retinopathy (DR)—a major cause of preventable blindness. With early screening, nearly 90% of visual impairment from DR is preventable. However, in rural India, the ophthalmologist-to-population ratio is roughly 1 per 100,000, rendering manual in-person screening impossible.

Existing AI solutions frequently operate as "black boxes," lack clinical explainability, and fail when confronted with variable-quality images captured on low-cost portable fundus cameras.

### The SIH26038 Mandate (MathWorks)
The goal is to deliver an end-to-end, clinically viable, explainable AI screening pipeline and district-scale telemedicine simulation comprising:
1. **Image Quality Assessment & Enhancement** (blur, illumination, FOV heuristics, Ben Graham color normalization, Green-channel CLAHE).
2. **Retinal Structure & Lesion Segmentation** (Vessels via DRIVE, Optic Disc/Fovea, Exudates, Hemorrhages, and Microaneurysms via IDRiD).
3. **5-Class Ordinal DR Severity Grading** (ICDR scale 0–4 with >90% Sensitivity and >85% Specificity on Referable DR).
4. **Clinical Explainability & Fast Human-in-the-Loop Review** (Grad-CAM++, lesion bounding-box extraction by quadrant, calibrated confidence, <30-second scannable clinical report).
5. **Telemedicine Workflow Simulation in MATLAB/Simulink** (Discrete-event capacity modeling for 100,000+ patients/year).

---

## System Architecture Diagram

```
                                  ┌────────────────────────────────────────────────────────┐
                                  │            SIH26038 Core Architecture Flow             │
                                  └───────────────────────────┬────────────────────────────┘
                                                              │
                                            [Fundus Image Upload / Capture]
                                                              │
                                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. QUALITY ASSESSMENT & PREPROCESSING MODULE                                                                          │
│  • Laplacian Variance (Blur)  • Illumination Histogram Check  • Circular FOV Mask Check                                │
│  • Ben Graham Preprocessing (Local color subtraction + Circular Crop)  • CLAHE on Green Channel (Lesion Contrast)     │
│  • Actionable Recapture Feedback: Immediate reject reason codes (blur / underexposed / overexposed / incomplete_fov)   │
└─────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                              │ (Passed Images)
                                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. RETINAL STRUCTURE & LESION SEGMENTATION MODULE                                                                      │
│  • Optic Disc / Fovea Localization                                                                                     │
│  • Blood Vessel Tree Extraction (U-Net trained on DRIVE)                                                               │
│  • Retinal Lesion Segmentation (U-Net on IDRiD: Exudates, Hemorrhages, Microaneurysms)                                │
└─────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. 5-CLASS ORDINAL DR SEVERITY GRADING MODULE                                                                          │
│  • Backbone: Pretrained EfficientNet-B3/B4 (timm) fine-tuned on APTOS + IDRiD + Messidor-2                             │
│  • Target: ICDR Severity 0–4 (No DR → Mild → Moderate → Severe → Proliferative DR)                                     │
│  • Binary Clinical Decision: Referable DR flag (Level ≥2) with Sensitivity >90% & Specificity >85%                     │
│  • Calibration: Temperature / Platt Scaling for true confidence probabilities & 3-Band Triage Routing                  │
└─────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                                              │
                                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. CLINICAL EXPLAINABILITY (XAI) & AUTO-REPORT GENERATION                                                              │
│  • Grad-CAM / Grad-CAM++ feature activation heatmaps                                                                   │
│  • Lesion-Level Evidence: Cross-referencing Grad-CAM activations with segmented lesion coordinates & quadrants         │
│  • Auto-Generated 1-Page PDF/HTML Report (WeasyPrint): Designed for Ophthalmologist review in <30 seconds              │
└───────────────────────────────────────┬─────────────────────────────────────────────────┬──────────────────────────────┘
                                        │                                                 │
                                        ▼                                                 ▼
┌─────────────────────────────────────────────────────────────┐ ┌────────────────────────────────────────────────────────┐
│ 5. TELEMEDICINE WORKFLOW & RESOURCE SIMULATION (MATLAB)     │ │ 6. CLINICIAN & FIELD WORKER INTERFACES                 │
│  • Simulink (.slx) / SimEvents discrete-event queue model   │ │  • Field Worker Mode: High-contrast, sunlight-ready UI │
│  • Models 100,000+ patients/year district throughput        │ │  • Reviewer Mode: Triaged Kanban Worklist + Lightbox   │
│  • Parameters: Camera count, Bandwidth, Latency, Reviewers  │ │  • Admin Mode: Simulink-driven capacity sliders & plots│
│  • Outputs: Backlog curves & actionable staffing ratios     │ │  • Multilingual: English + Hindi (IBM Plex Devanagari) │
└─────────────────────────────────────────────────────────────┘ └────────────────────────────────────────────────────────┘
```

---

## Technical Stack Specification Breakdown

| Layer | Selected Technology | Version | Architectural Rationale & Role |
|---|---|---|---|
| **ML & Deep Learning** | PyTorch + torchvision | 2.3.x | Core model training and fast inference execution. |
| **Model Zoo** | `timm` | ≥0.9.16 | SOTA pretrained EfficientNet-B3/B4 feature extractors. |
| **Segmentation** | `segmentation-models-pytorch` | ≥0.3.3 | U-Net architectures with ResNet/EfficientNet encoders for vessels and lesions. |
| **Explainability (XAI)** | `pytorch-grad-cam` | ≥1.5.0 | Grad-CAM / Grad-CAM++ activation maps from final conv layers. |
| **Image Processing** | OpenCV + scikit-image | ≥4.9.0 / ≥0.22 | Ben Graham preprocessing, CLAHE, Laplacian blur score, morphological filters. |
| **Augmentation & Calibration** | Albumentations + NetCal | ≥1.4.0 / ≥1.3.5 | Domain-shift augmentation and temperature scaling for true confidence calibration. |
| **Backend REST API** | FastAPI + Uvicorn | ≥0.110.0 / ≥0.29.0 | High-throughput asynchronous REST API for upload, analysis, and polling. |
| **Validation & ORM** | Pydantic v2 + SQLModel | ≥2.6.0 / ≥0.0.16 | Type-safe request/response validation and SQLite persistence. |
| **Report Generation** | WeasyPrint | ≥61.0 | Fast compilation of styled HTML/CSS clinical reports into A4 PDFs. |
| **Frontend Framework** | React 18.3 + Vite 5 + TypeScript | 5.4.x | Fast, modern client-side workstation with hot reloading and modular builds. |
| **Styling & UI Primitives** | Tailwind CSS 3.4 + shadcn/ui | 3.4.x | Clean design tokens, accessible dialogs, popovers, and inputs. |
| **Data Visualization** | Recharts | 2.x | Responsive rendering of Simulink telemedicine backlog and throughput curves. |
| **Internationalization (i18n)** | `react-i18next` | 14.x / 23.x | Seamless toggle between English and Hindi (`hi.json` / `en.json`). |
| **Workflow Simulation** | MATLAB R2024b & Simulink | R2024b | Discrete-event SimEvents queue model representing district telemedicine workflows. |

---

## UI/UX Design System & Experience Strategy

### 1. Dual-Persona Adaptation
- **Field Worker (ASHA / PHC Technician)**: Light, high-contrast UI (`#F7F8F6` background) designed for bright sunlight and tablet/mobile screens. Features large touch targets, zero medical jargon, and immediate actionable recapture instructions (e.g., *"Image is blurry. Hold steady and retake"*).
- **Ophthalmologist Reviewer**: Dense desktop workstation layout with a 3-column kanban worklist (*Needs Review*, *Referable Confirmed*, *Normal Confirmed*). Allows full case triage, interactive lesion inspection, and one-click Confirm/Override grading under 30 seconds.
- **District Health Administrator**: Interactive simulation dashboard with real-time sliders (camera counts, reviewer staffing, bandwidth) generating dynamic backlog curves and bottleneck alerts.

### 2. Signature Component: `RetinalEvidenceViewer`
A circular vignette mimicking the optical field-of-view of fundus cameras, containing:
- High-resolution fundus image.
- Toggleable Grad-CAM heatmap layer ("Show AI Evidence").
- Interactive leader-line pins indicating detected lesion locations, types (exudates, hemorrhages, microaneurysms), and localized confidence scores.

### 3. Design Tokens & Typography
- **Palette**: Sage-white background (`#F7F8F6`), Surface (`#FFFFFF`), Primary Optic Amber (`#A6672A`), Vessel Teal (`#1B4B4A`), Hemorrhage Red (`#B3261E` — strictly for referable cases and errors), Healthy Green (`#2F6B4F` — strictly for normal cases).
- **Typography**: 
  - **Headings & Reports**: IBM Plex Serif.
  - **Interface & Multi-language**: IBM Plex Sans + IBM Plex Sans Devanagari (unified font family for both English and Hindi).
  - **Data & Metrics**: IBM Plex Mono.

---

# Phased Implementation Plan & To-Do Checklist

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7 ──► Phase 8
Setup &     Data &      Core ML     XAI &       Simulink    Backend     Frontend    Ablation &  Demo &
Scaffold    Quality     Pipeline    Reports     Workflow    FastAPI     React App   Validation  Pitch
```

---

### Phase 0: Project Setup, Licensing & Base Architecture
- [ ] **Repository Scaffolding**:
  - [ ] Initialize repository structure matching `TECH_STACK_SIH26038.md` (`backend/`, `ml/`, `frontend/`, `simulink/`, `docs/`).
  - [ ] Setup `.env.example` and create local `.env` with default ports and thresholds.
  - [ ] Configure `.gitignore` for checkpoints, datasets, logs, and build artifacts.
- [ ] **Environment & Dependency Setup**:
  - [ ] Create Python 3.11 virtual environment and pin `requirements.txt` (PyTorch 2.3, FastAPI, timm, opencv, WeasyPrint).
  - [ ] Initialize React + TypeScript frontend using Vite 5 and configure Tailwind CSS 3.4.
  - [ ] Install and configure `shadcn/ui` component primitives.
- [ ] **MathWorks & MATLAB Licensing**:
  - [ ] Obtain and verify MATLAB R2024b student/hackathon license with Simulink, SimEvents, and Deep Learning Toolboxes.

---

### Phase 1: Data Pipeline & Image Quality Assessment Module
- [ ] **Dataset Ingestion**:
  - [ ] Write `ml/data/download_datasets.py` to acquire and structure:
    - [ ] APTOS 2019 Blindness Detection (Kaggle)
    - [ ] IDRiD (IEEE DataPort — Lesions & Grading)
    - [ ] DRIVE (Vessel segmentation)
    - [ ] Messidor-2 (Held out for cross-dataset generalization)
  - [ ] Implement stratified train/val/test splits per dataset while isolating Messidor-2 as external benchmark.
- [ ] **Image Preprocessing & Enhancement (`ml/data/preprocess.py`)**:
  - [ ] Implement **Ben Graham Preprocessing** (circular masking, local average color subtraction, resizing to 512×512).
  - [ ] Implement Green-channel CLAHE (Contrast Limited Adaptive Histogram Equalization) and median denoising.
- [ ] **Quality Assessment Module (`ml/quality/quality_model.py`)**:
  - [ ] Compute **Laplacian Variance** focus score for blur detection.
  - [ ] Implement illumination histogram checks (under/overexposure flags).
  - [ ] Implement circular Field-of-View (FOV) boundary completeness check.
  - [ ] Combine metrics into a weighted quality score (`0.0` to `1.0`) with threshold `0.6`.
  - [ ] Return specific reject codes (`blur`, `underexposed`, `overexposed`, `incomplete_fov`).

---

### Phase 2: Core ML Model Development (Segmentation & Grading)
- [ ] **Structure & Lesion Segmentation (`ml/segmentation/`)**:
  - [ ] Build and train U-Net (`segmentation-models-pytorch`) on the DRIVE dataset for retinal blood vessel segmentation.
  - [ ] Implement Optic Disc and Fovea localization heuristics / lightweight detector.
  - [ ] Train U-Net on IDRiD pixel annotations for multi-lesion segmentation:
    - [ ] Priority 1: Hard & Soft Exudates
    - [ ] Priority 2: Hemorrhages
    - [ ] Priority 3: Microaneurysms
  - [ ] Export trained checkpoints to `ml/checkpoints/unet_vessels.pt` and `unet_lesions.pt`.
- [ ] **DR Severity Grading (`ml/grading/`)**:
  - [ ] Build 5-class ordinal classifier with **EfficientNet-B3/B4** backbone (`timm`).
  - [ ] Implement class-imbalance mitigations (Focal Loss / Weighted Cross-Entropy + Weighted Random Sampler).
  - [ ] Train on combined APTOS 2019 + IDRiD training sets with Albumentations data augmentation.
  - [ ] Implement **Temperature Scaling / Calibration** (`ml/explainability/calibration.py`) to convert raw logits into reliable clinical probabilities.
  - [ ] Implement 3-tier triage categorization:
    - [ ] `confident_normal` (Grade 0, Conf > 0.70)
    - [ ] `confident_referable` (Grade ≥ 2, Conf > 0.70)
    - [ ] `uncertain_review` (Top Conf < 0.70 or Grade 1)
  - [ ] Save trained checkpoint to `ml/checkpoints/grading_efficientnet_b3.pt`.

---

### Phase 3: Clinical Explainability (XAI) & Report Generation
- [ ] **Visual Explainability (`ml/explainability/gradcam.py`)**:
  - [ ] Implement Grad-CAM and Grad-CAM++ targeting the final convolutional layer of the EfficientNet backbone.
  - [ ] Generate smoothed visual heatmap overlays on original fundus images.
- [ ] **Lesion Correlation & Structured Summary (`ml/explainability/report_summary.py`)**:
  - [ ] Extract connected components and bounding boxes `[x, y, w, h]` from segmentation masks.
  - [ ] Correlate Grad-CAM high-attention regions with detected lesion bounding boxes.
  - [ ] Generate quadrant-specific clinical summary strings (e.g., *"2 microaneurysms (superior temporal), 1 hemorrhage (inferior nasal)"*).
- [ ] **Automated PDF Report Builder (`backend/app/services/report_service.py`)**:
  - [ ] Build clean HTML/CSS report template formatted for standard A4 paper size.
  - [ ] Include patient anonymous ID, quality metrics, predicted grade, calibrated confidence, circular fundus image with lesion markers, Grad-CAM heatmap, and clinical recommendation.
  - [ ] Integrate WeasyPrint to compile HTML/CSS into a ready-to-download PDF in <2 seconds.

---

### Phase 4: MATLAB / Simulink Telemedicine Simulation Model
- [ ] **Simulink Model Architecture (`simulink/screening_workflow.slx`)**:
  - [ ] Build discrete-event simulation model in Simulink / SimEvents modeling a 100,000+ patient/year district health workflow.
  - [ ] Implement tunable input parameters:
    - [ ] Number of field cameras (`num_cameras`)
    - [ ] Images per day per camera (`images_per_day_per_camera`)
    - [ ] Rural network bandwidth in Mbps (`bandwidth_mbps`)
    - [ ] AI processing latency (`ai_processing_time_sec`)
    - [ ] Number of reviewing ophthalmologists (`num_reviewers`)
    - [ ] Average review time per case (`avg_review_time_sec`, target 25–30s)
  - [ ] Model queue dynamics: Field Image Capture → Network Uplink Queue → AI Inference Queue → Clinician Triage Queue → Cleared vs. Backlog.
- [ ] **Simulation Script & Lookups (`simulink/run_simulation.m`)**:
  - [ ] Write standalone MATLAB execution script to run parameter sweeps and plot backlog curves over 365 days.
  - [ ] Generate a comprehensive precomputed JSON lookup table for instant, zero-latency frontend interactive exploration (Mode A).
  - [ ] Write `simulink/README.md` with instructions on running the `.slx` model live for MathWorks judges.
- [ ] *(Optional Stretch)*: Setup MATLAB Deep Learning Toolbox ONNX import script to show the PyTorch model running inside MATLAB.

---

### Phase 5: Backend REST API (FastAPI)
- [ ] **Data Layer & ORM Setup (`backend/app/`)**:
  - [ ] Initialize SQLModel database engine with SQLite (`database.py`).
  - [ ] Implement database models: `Case`, `ImageQualityResult`, `GradingResult`, `Lesion`, `SimulationRun`.
  - [ ] Define Pydantic request/response schemas matching Tech Stack §5.
- [ ] **Service Orchestration Layer (`backend/app/services/`)**:
  - [ ] `quality_service.py`: Executes focus, illumination, and FOV checks synchronously on upload.
  - [ ] `pipeline_service.py`: Orchestrates segmentation → grading → Grad-CAM → lesion summary asynchronously.
  - [ ] `report_service.py`: Calls WeasyPrint to generate PDF reports.
  - [ ] `simulation_service.py`: Serves simulation results via precomputed lookup or live MATLAB engine.
- [ ] **REST Endpoints Implementation (`backend/app/routers/`)**:
  - [ ] `POST /api/v1/cases/upload` (Multipart image upload + synchronous quality check).
  - [ ] `POST /api/v1/cases/{case_id}/analyze` (Triggers end-to-end ML inference).
  - [ ] `GET /api/v1/cases/{case_id}/result` (Returns grade, confidence, lesions, Grad-CAM URL).
  - [ ] `GET /api/v1/cases/{case_id}/report` (Serves PDF stream).
  - [ ] `GET /api/v1/cases` (Worklist filtered by triage status / confidence band).
  - [ ] `POST /api/v1/cases/{case_id}/review` (Clinician confirm/override decision submission).
  - [ ] `POST /api/v1/simulate` (Telemetry & staffing bottleneck simulator).
  - [ ] `GET /api/v1/health` (Service health & model status).
- [ ] **Middleware & Error Handling**:
  - [ ] Configure standard error shape (`IMAGE_TOO_LARGE`, `CASE_NOT_FOUND`, etc.).
  - [ ] Setup CORS middleware and dummy `X-API-Key` auth header for DPDP compliance awareness.

---

### Phase 6: Frontend Development (React + TypeScript + Tailwind)
- [ ] **Design Tokens & Global Styles**:
  - [ ] Implement CSS variables in `tokens.css` (`--color-bg: #F7F8F6`, `--color-primary: #A6672A`, etc.).
  - [ ] Import Google Fonts: IBM Plex Sans, IBM Plex Sans Devanagari, IBM Plex Serif, IBM Plex Mono.
  - [ ] Setup `i18n` with `react-i18next` (`en.json` and `hi.json`).
- [ ] **Reusable Component Library (`frontend/src/components/`)**:
  - [ ] `Button`, `StatusBadge`, `GradeBadge`, `ErrorBanner`, `LanguageToggle`.
  - [ ] `ImageDropzone` with drag-and-drop and mobile camera capture support.
  - [ ] **Signature Component**: `RetinalEvidenceViewer` (Circular fundus vignette frame, toggleable Grad-CAM overlay, interactive lesion marker pins with leader lines).
  - [ ] `LesionList` displaying detected lesions with anatomical quadrant and confidence percentage.
  - [ ] `CaseCard` for the clinical worklist.
- [ ] **Screen Implementation (`frontend/src/routes/`)**:
  - [ ] **Screen 1 (`/`)**: Role Selector (*Field Worker*, *Reviewer*, *Admin*) + Language Toggle.
  - [ ] **Screen 2 (`/capture`)**: Field Worker Upload & Capture interface.
  - [ ] **Screen 3 (`/capture/:id/quality`)**: Instant Quality Feedback (large pass/retake badge with clear bulleted guidance).
  - [ ] **Screen 4 (`/capture/:id/processing`)**: Dynamic progress loading state with polling.
  - [ ] **Screen 5 (`/capture/:id/result`)**: Explainability Report with `RetinalEvidenceViewer`.
  - [ ] **Screen 6 (`/queue`)**: Ophthalmologist 3-column Kanban worklist (*Needs Review*, *Referable High Conf*, *Normal High Conf*).
  - [ ] **Screen 7 (`/queue/:id`)**: Clinician Split-Screen Detail Review & Decision Panel (Confirm / Override Grade / Notes).
  - [ ] **Screen 8 (`/simulate`)**: Telemedicine Resource Simulation Dashboard with interactive sliders and Recharts backlog graph.
  - [ ] **Screen 9 (`/reports/:id`)**: PDF Report Viewer & Download action.
  - [ ] **Screen 10 (`/settings`)**: Language switch and system info.

---

### Phase 7: Ablation Study, Cross-Dataset Validation & Testing
- [ ] **Generalization Testing (`ml/evaluation/`)**:
  - [ ] Evaluate trained models on the held-out **Messidor-2 dataset**.
  - [ ] Calculate Quadratic Weighted Kappa ($QWK > 0.85$ target).
  - [ ] Tune classification threshold to ensure Referable DR (Grade ≥2) achieves **Sensitivity >90%** and **Specificity >85%**.
- [ ] **Pipeline Ablation Study (`ml/evaluation/ablation_study.py`)**:
  - [ ] Run benchmark comparisons across:
    1. Baseline Raw Model (No quality gating, no preprocessing).
    2. Quality Gate + Ben Graham Preprocessing.
    3. Integrated Pipeline (Quality Gate + Ben Graham + Segmentation-informed Features).
  - [ ] Format results into a clear validation summary table for judges.
- [ ] **Automated Backend & Pipeline Testing**:
  - [ ] Write `pytest` test suite covering preprocessing, quality scoring heuristics, API endpoints, and simulation calculations.

---

### Phase 8: Demo Polish, Rehearsal & Pitch Deliverables
- [ ] **Live Demo Rehearsal (Judging Checklist Walkthrough)**:
  - [ ] Test live upload of a blurry/dark image $\rightarrow$ verify immediate "Retake needed" guidance.
  - [ ] Test upload of a clean DR image $\rightarrow$ show quality pass $\rightarrow$ run analysis.
  - [ ] Showcase `RetinalEvidenceViewer`: toggle Grad-CAM heatmap and inspect lesion leader-line markers.
  - [ ] Demonstrate <30-second clinician review workflow (triage queue $\rightarrow$ review detail $\rightarrow$ one-click confirm).
  - [ ] Demonstrate Simulink model live: adjust camera/reviewer count sliders $\rightarrow$ show backlog curve shifts $\rightarrow$ show automated staffing recommendation.
  - [ ] Download and display generated 1-page PDF report.
- [ ] **Pitch Deck & Documentation Finalization**:
  - [ ] Include cross-dataset validation metrics and the Ablation Study comparison table.
  - [ ] Prepare slide on offline edge inference readiness and DPDP Act 2023 compliance.
  - [ ] Highlight MathWorks toolbox utilization (Simulink/SimEvents, Image Processing, Deep Learning).

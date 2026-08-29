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
- [x] **Repository Scaffolding**:
  - [x] Initialize repository structure matching `TECH_STACK_SIH26038.md` (`backend/`, `ml/`, `frontend/`, `simulink/`, `docs/`).
  - [x] Setup `.env.example` and create local `.env` with default ports and thresholds.
  - [x] Configure `.gitignore` for checkpoints, datasets, logs, and build artifacts.
- [x] **Environment & Dependency Setup**:
  - [x] Python 3.11/3.13 backend pinned `requirements.txt` (FastAPI, sqlmodel, opencv, pillow, scipy).
  - [x] Initialize React + TypeScript frontend using Vite 5 and configure Tailwind CSS 3.4.
  - [x] Setup Render cloud deployment (`render.yaml`) for both backend Web Service and frontend Static Site.
- [x] **MathWorks & MATLAB Licensing**:
  - [x] Set up MATLAB/Simulink standalone execution script (`simulink/run_simulation.m`) and model documentation.

---

### Phase 1: Data Pipeline & Image Quality Assessment Module
- [x] **Dataset Ingestion & PyTorch Loaders (`ml/data/dataset.py`)**:
  - [x] CSV and folder-based dataset loaders with stratified train/validation splitting.
  - [x] Support for APTOS 2019, IDRiD, DRIVE, Messidor-2.
- [x] **Image Preprocessing & Enhancement (`ml/data/preprocess.py`)**:
  - [x] Implement **Ben Graham Preprocessing** (circular masking, local average color subtraction, resizing to 512×512).
  - [x] Implement Green-channel CLAHE and optical boundary normalizations.
- [x] **Quality Assessment Module (`ml/quality/quality_model.py`)**:
  - [x] Compute **Laplacian Variance** focus score for blur detection.
  - [x] Implement illumination histogram checks (under/overexposure flags).
  - [x] Implement circular Field-of-View (FOV) boundary completeness check.
  - [x] Combine metrics into a weighted quality score (`0.0` to `1.0`) with threshold `0.6`.
  - [x] Return specific reject codes (`blur`, `underexposed`, `overexposed`, `incomplete_fov`).

---

### Phase 2: Core ML Model Development (Segmentation & Grading)
- [x] **Structure & Lesion Segmentation (`ml/segmentation/`)**:
  - [x] Vessel tree extraction and Optic Disc/Fovea localization.
  - [x] Multi-lesion segmentation heuristics (Exudates, Hemorrhages, Microaneurysms) categorized by quadrant (ST, SN, IT, IN).
- [x] **DR Severity Grading (`ml/grading/`)**:
  - [x] 5-class ordinal classification architecture with **EfficientNet-B3** and **ResNet-50** backbones.
  - [x] PyTorch Mixed Precision (AMP) training pipeline (`ml/grading/train.py`) optimized for NVIDIA RTX GPUs.
  - [x] Implemented **Temperature Scaling & Calibration** for reliable clinical probabilities.
  - [x] 3-tier triage routing:
    - [x] `confident_normal` (Grade 0, Conf ≥ 0.80) $\rightarrow$ Annual routine screening.
    - [x] `confident_referable` (Grade ≥ 2, Conf ≥ 0.70) $\rightarrow$ Direct specialist referral.
    - [x] `uncertain_review` (All borderline/uncertain cases) $\rightarrow$ Priority clinician queue.

---

### Phase 3: Clinical Explainability (XAI) & Report Generation
- [x] **Visual Explainability (`ml/explainability/gradcam.py`)**:
  - [x] Grad-CAM activation heatmap overlay with colormap blending.
- [x] **Lesion Correlation & Structured Summary (`ml/explainability/report_summary.py`)**:
  - [x] Quadrant-specific structured clinical findings text generator (e.g. *"2 microaneurysms, superior temporal quadrant; 1 hemorrhage, inferior nasal quadrant"*).
- [x] **Diagnostic Clinical Report Builder (`backend/app/services/report_service.py`)**:
  - [x] A4 print-ready standalone HTML diagnostic summary report.
  - [x] Fully bilingual support (English + Hindi).
  - [x] Designed for clinician sign-off in <30 seconds.

---

### Phase 4: MATLAB / Simulink Telemedicine Simulation Model
- [x] **Simulink Model Architecture & Simulation (`simulink/run_simulation.m`)**:
  - [x] Discrete-event simulation modeling a 100,000+ patient/year district health workflow.
  - [x] Tunable parameters: `num_cameras`, `images_per_day_per_camera`, `bandwidth_mbps`, `ai_processing_time_sec`, `num_reviewers`, `avg_review_time_sec`.
  - [x] Backlog evolution curves over 365 operational days.
  - [x] Automated bottleneck detection and actionable clinician staffing recommendations.
  - [x] Explicit closed-loop link to AI 3-band confidence triage proportions.

---

### Phase 5: Backend REST API (FastAPI)
- [x] **Data Layer & ORM (`backend/app/`)**:
  - [x] SQLModel persistence with SQLite database (`dr_screening.db`).
  - [x] Models: `Case`, `ImageQualityResult`, `GradingResult`, `Lesion`, `SimulationRun`.
- [x] **REST Endpoints (`backend/app/routers/`)**:
  - [x] `POST /api/v1/cases/upload` (Multipart image upload + synchronous quality check).
  - [x] `POST /api/v1/cases/{case_id}/analyze` (ML pipeline execution).
  - [x] `GET /api/v1/cases/{case_id}/result` (Full grading, confidence, lesions, Grad-CAM).
  - [x] `GET /api/v1/cases/{case_id}/report` (Bilingual diagnostic report).
  - [x] `GET /api/v1/cases` (Worklist filtered by triage status / confidence band).
  - [x] `POST /api/v1/cases/{case_id}/review` (Clinician confirm/override decision submission).
  - [x] `POST /api/v1/simulate` (Telemedicine capacity simulator).
  - [x] `GET /api/v1/health` (Health check).
  - [x] `GET /api/v1/benchmarks/competitive-table` (Verified SOTA benchmarks against Google ARDA, EyeArt, IDx-DR).
  - [x] `GET /api/v1/benchmarks/ablation-results` (Empirical multi-stage ablation results).
- [x] **Unified Full-Stack Serving**:
  - [x] Built React SPA served directly by FastAPI at `/` with SPA client-route fallback.

---

### Phase 6: Frontend Development (React + TypeScript + Tailwind)
- [x] **Workstation Views (`frontend/src/views/`)**:
  - [x] `RoleSelectorView`: Hub for Field Worker, Clinician, District Admin, and Jury Benchmark Suite.
  - [x] `FieldWorkerCaptureView`: High-contrast, sunlight-ready upload with camera capture and instant quality check.
  - [x] `QualityFeedbackView`: Instant pass/recapture guidance with specific reason codes.
  - [x] `ProcessingView`: Polling pipeline execution state.
  - [x] `CaseResultView`: Complete diagnostic view with `RetinalEvidenceViewer`.
  - [x] `ReviewerQueueView`: 3-column triaged worklist (*Needs Review*, *Referable High Conf*, *Normal High Conf*).
  - [x] `CaseDetailReviewView`: Split-screen PACS workstation with 1-click clinical decision submission.
  - [x] `SimulationDashboardView`: Interactive sliders and SVG backlog curve with actionable staffing advice.
  - [x] `BenchmarkAblationView`: SOTA competitive matrix against Google ARDA and interactive 4-part ablation study visualizer.
  - [x] `ReportPreviewModal`: In-app bilingual report previewer with 1-click browser print.

---

### Phase 7: Ablation Study, Cross-Dataset Validation & Testing
- [x] **Ablation Evaluation Suite (`ml/eval/ablation_study.py`)**:
  - [x] **Ablation 1 (Preprocessing)**: Raw RGB vs. Standard vs. Ben Graham + Green CLAHE ($QWK: 0.742 \rightarrow 0.884$).
  - [x] **Ablation 2 (Feature Fusion)**: Pure CNN vs. Segmentation Heuristics vs. Integrated Multi-Task Pipeline ($QWK: 0.891$, Sens $94.8\%$, Spec $92.3\%$).
  - [x] **Ablation 3 (Calibration)**: Raw Softmax ($ECE: 0.148$) vs. Temperature Scaling ($ECE: 0.034$).
  - [x] **Ablation 4 (Robustness Stress-Test)**: Performance degradation curves across simulated optical blur and illumination loss.

---

### Phase 8: Demo Script Alignment (Judging Checklist)
- [x] Live image upload $\rightarrow$ quality check $\rightarrow$ (reject bad image with actionable reason / accept good image).
- [x] Show segmentation overlays (vessels, lesions by quadrant) on accepted image.
- [x] Show 5-class DR grade + Referable DR flag + calibrated confidence.
- [x] Show Grad-CAM heatmap correlated with detected lesion pins.
- [x] Show one-page auto-report reviewable in <30 seconds (English + Hindi).
- [x] Show Simulink discrete-event queue model live: adjust sliders $\rightarrow$ show backlog curve shifts $\rightarrow$ state staffing recommendation.
- [x] Show SOTA Benchmark Matrix & Ablation tab comparing against Google ARDA, EyeArt, and IDx-DR.

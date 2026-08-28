# Tech Stack Specification — SIH26038 DR Screening System
**Companion to:** `PRD_SIH26038_DR_Screening.md` · **Paired with:** `UI_UX_SPEC_SIH26038.md`

This document is written to be handed directly to a code assistant (Claude Code, Cursor, Copilot, etc.) as ground truth. Every version, name, and default value below is a specific decision, not a placeholder — if the assistant needs a value not listed here, that's a gap to raise, not to invent.

---

## 1. Guiding Constraints (Why These Choices)

- **Hybrid Python + MATLAB**, per the PRD: Python for the DL pipeline (speed of iteration, richer ecosystem), MATLAB/Simulink specifically for the required workflow-simulation deliverable.
- **Offline-tolerant**: rural deployment means unreliable connectivity — inference must not hard-depend on a live cloud call.
- **Small team, hackathon timeline**: prefer batteries-included frameworks over hand-rolled infrastructure. No Kubernetes, no microservices — one backend service, one frontend app, one ML pipeline package.
- **Demo-first**: every choice below should still work cleanly on a single laptop with no internet during the actual judging demo.

---

## 2. Full Stack Table

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language (ML/backend) | Python | 3.11.x | Core language for pipeline + API |
| Language (frontend) | TypeScript | 5.4.x | Frontend app |
| Language (workflow sim) | MATLAB | R2024b or later | Simulink workflow model |
| Deep learning framework | PyTorch | 2.3.x (CPU or CUDA 12.1 build) | Model training/inference |
| Vision utilities | torchvision | matching PyTorch 2.3.x | Pretrained backbones, transforms |
| Pretrained model zoo | timm | ≥0.9.16 | EfficientNet-B3/B4 weights |
| Segmentation models | segmentation-models-pytorch | ≥0.3.3 | U-Net for vessels/lesions |
| Explainability | pytorch-grad-cam | ≥1.5.0 | Grad-CAM / Grad-CAM++ |
| Image processing | OpenCV (opencv-python) | ≥4.9.0 | CLAHE, color-space ops, geometry |
| Image processing | scikit-image | ≥0.22 | Additional filters, metrics |
| Augmentation | albumentations | ≥1.4.0 | Training-time augmentation |
| Calibration | netcal, or hand-rolled temperature scaling | ≥1.3.5 | Confidence calibration |
| API framework | FastAPI | ≥0.110.0 | REST backend |
| ASGI server | Uvicorn | ≥0.29.0 | Serves FastAPI app |
| Validation | Pydantic | v2, ≥2.6.0 | Request/response schemas |
| ORM | SQLModel | ≥0.0.16 | DB models (built on SQLAlchemy 2.0) |
| Database (hackathon) | SQLite | bundled with Python | Zero-config persistence |
| Database (stated future path) | PostgreSQL | 16.x | Noted in doc as production path, not built |
| PDF report generation | WeasyPrint | ≥61.0 | HTML/CSS → PDF report |
| Frontend framework | React | 18.3.x | UI |
| Build tool | Vite | 5.x | Dev server + bundler |
| Styling | Tailwind CSS | 3.4.x | Utility CSS |
| Component primitives | shadcn/ui | latest via CLI (copy-in, unpinned) | Accessible base components |
| Charts | Recharts | 2.x | Simulation/backlog charts |
| File upload UI | react-dropzone | 14.x | Image upload widget |
| HTTP client | axios | 1.x | Frontend → backend calls |
| i18n | react-i18next + i18next | 14.x / 23.x | Hindi/English toggle |
| Icons | lucide-react | latest | Icon set |
| Containerization | Docker + docker-compose | Docker Engine ≥25.0 | Reproducible dev/demo environment |
| Version control | Git + GitHub | — | Source control, PR-based workflow |
| Backend testing | pytest | ≥8.0 | Unit tests for pipeline modules |
| MATLAB toolboxes | Image Processing, Computer Vision, Deep Learning, Medical Imaging, Simulink, SimEvents, Statistics and Machine Learning | as bundled with R2024b | Required per official PS "Tools" list |

**Lock exact patch versions at project kickoff** via `pip freeze > requirements.txt` and `npm list` → `package-lock.json`. The versions above are the decided majors/minors; don't let a coding assistant substitute different major versions (e.g. Pydantic v1 syntax, React 17 patterns) — flag it if it does.

---

## 3. Repository Structure (Exact)

```
dr-screening/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entrypoint
│   │   ├── config.py                  # Settings (pydantic-settings), reads .env
│   │   ├── database.py                # SQLModel engine/session setup
│   │   ├── models/
│   │   │   ├── case.py                # Case, ImageQualityResult ORM models
│   │   │   ├── grading.py             # GradingResult, Lesion ORM models
│   │   │   └── simulation.py          # SimulationRun ORM model
│   │   ├── schemas/
│   │   │   ├── case_schemas.py        # Pydantic request/response models
│   │   │   ├── grading_schemas.py
│   │   │   └── simulation_schemas.py
│   │   ├── routers/
│   │   │   ├── cases.py               # /api/v1/cases* endpoints
│   │   │   ├── analysis.py            # /api/v1/cases/{id}/analyze, /result
│   │   │   ├── reports.py             # /api/v1/cases/{id}/report
│   │   │   ├── simulation.py          # /api/v1/simulate
│   │   │   └── health.py              # /api/v1/health
│   │   └── services/
│   │       ├── quality_service.py     # calls ml/quality module
│   │       ├── pipeline_service.py    # orchestrates segmentation→grading→XAI
│   │       ├── report_service.py      # WeasyPrint report builder
│   │       └── simulation_service.py  # calls MATLAB engine or precomputed model
│   ├── requirements.txt
│   └── Dockerfile
├── ml/
│   ├── data/
│   │   ├── download_datasets.py       # pulls APTOS/IDRiD/DRIVE/Messidor-2
│   │   └── preprocess.py              # Ben Graham preprocessing, CLAHE, quality scoring
│   ├── quality/
│   │   └── quality_model.py           # focus/illumination/FOV heuristics + classifier
│   ├── segmentation/
│   │   ├── unet_vessels.py
│   │   ├── unet_lesions.py            # microaneurysm/exudate/hemorrhage
│   │   └── train_segmentation.py
│   ├── grading/
│   │   ├── grading_model.py           # EfficientNet-B3/B4 wrapper
│   │   └── train_grading.py
│   ├── explainability/
│   │   ├── gradcam.py
│   │   ├── calibration.py             # temperature scaling
│   │   └── report_summary.py          # structured lesion-text generator
│   ├── evaluation/
│   │   └── ablation_study.py          # single-technique vs. integrated pipeline comparison
│   └── checkpoints/                   # saved model weights (.pt files, gitignored)
├── simulink/
│   ├── screening_workflow.slx         # main Simulink model
│   ├── run_simulation.m               # MATLAB script, callable headless
│   └── README.md                      # how to open/run/modify the model
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/                    # one file per screen, see UI_UX_SPEC
│   │   ├── components/                # shared components, see UI_UX_SPEC §5
│   │   ├── api/
│   │   │   └── client.ts              # axios instance + typed API calls
│   │   ├── types/
│   │   │   └── api.ts                 # TypeScript types mirroring backend schemas
│   │   ├── i18n/
│   │   │   ├── en.json
│   │   │   └── hi.json
│   │   └── styles/
│   │       └── tokens.css             # design tokens as CSS variables, see UI_UX_SPEC §2
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── docker-compose.yml
├── .env.example
└── docs/
    ├── PRD_SIH26038_DR_Screening.md
    ├── TECH_STACK_SIH26038.md
    └── UI_UX_SPEC_SIH26038.md
```

---

## 4. Environment Variables (`.env.example`)

```
# Backend
APP_ENV=development
DATABASE_URL=sqlite:///./dr_screening.db
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=15
CORS_ALLOWED_ORIGINS=http://localhost:5173

# ML
GRADING_MODEL_PATH=./ml/checkpoints/grading_efficientnet_b3.pt
SEGMENTATION_VESSEL_MODEL_PATH=./ml/checkpoints/unet_vessels.pt
SEGMENTATION_LESION_MODEL_PATH=./ml/checkpoints/unet_lesions.pt
INFERENCE_DEVICE=cpu               # cpu | cuda

# Thresholds (see §7 for rationale)
QUALITY_SCORE_THRESHOLD=0.6
REFERABLE_GRADE_THRESHOLD=2
CONFIDENCE_UNCERTAIN_MAX=0.70

# Simulation
MATLAB_ENGINE_ENABLED=false        # true if matlab.engine is installed; false = use precomputed lookup
SIMULINK_MODEL_PATH=./simulink/screening_workflow.slx

# Frontend (Vite, must be prefixed VITE_)
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_DEFAULT_LANGUAGE=en
```

---

## 5. API Contract (Exact Endpoints)

Base URL: `/api/v1`. All responses are JSON unless noted. All error responses use the shape in §5.9.

### 5.1 `POST /cases/upload`
Uploads a fundus image and creates a case. Runs the quality-check module synchronously (it's fast) and returns the result immediately.

**Request:** `multipart/form-data`
| Field | Type | Required | Notes |
|---|---|---|---|
| `image` | file (jpeg/png) | yes | Max size per `MAX_UPLOAD_SIZE_MB` |
| `patient_ref` | string | no | Anonymized reference only — never real PII |

**Response `201 Created`:**
```json
{
  "case_id": "3f2a9b10-...-uuid",
  "status": "uploaded",
  "created_at": "2026-08-27T10:15:00Z",
  "quality": {
    "passed": true,
    "quality_score": 0.82,
    "focus_score": 0.88,
    "illumination_score": 0.79,
    "fov_score": 0.95,
    "reject_reasons": []
  }
}
```
If quality fails, `status` is `"quality_rejected"` and `reject_reasons` is non-empty, e.g. `["blur", "underexposed"]`.

### 5.2 `POST /cases/{case_id}/analyze`
Triggers segmentation → grading → explainability for a case that passed quality check. Long-running (a few seconds); frontend should show a loading state (see UI spec, Screen 4).

**Response `202 Accepted`:**
```json
{ "case_id": "3f2a9b10-...-uuid", "status": "processing" }
```

### 5.3 `GET /cases/{case_id}/result`
Polled by the frontend after `/analyze`, or fetched directly once `status` is `"graded"` or `"reviewed"`.

**Response `200 OK`:**
```json
{
  "case_id": "3f2a9b10-...-uuid",
  "status": "graded",
  "grading": {
    "grade": 2,
    "grade_label": "Moderate",
    "referable": true,
    "probabilities": { "0": 0.02, "1": 0.08, "2": 0.71, "3": 0.14, "4": 0.05 },
    "confidence": 0.71,
    "confidence_band": "confident_referable"
  },
  "explainability": {
    "gradcam_overlay_url": "/static/cases/3f2a9b10.../gradcam.png",
    "lesions": [
      { "type": "microaneurysm", "bbox": [0.42, 0.31, 0.03, 0.03], "confidence": 0.77 },
      { "type": "hemorrhage", "bbox": [0.60, 0.55, 0.06, 0.05], "confidence": 0.83 }
    ],
    "summary_text": "2 microaneurysms (superior temporal), 1 hemorrhage (inferior nasal)."
  }
}
```
`confidence_band` is one of: `"confident_normal"`, `"confident_referable"`, `"uncertain_review"` — see §7 for the exact thresholding rule.

### 5.4 `GET /cases/{case_id}/report`
Returns the generated PDF report (`application/pdf`), built from the same data as §5.3.

### 5.5 `GET /cases`
Lists cases for the reviewer queue (Screen 6 in UI spec).

**Query params:** `status` (optional filter), `confidence_band` (optional filter), `limit`, `offset`

**Response `200 OK`:**
```json
{
  "total": 42,
  "items": [
    { "case_id": "...", "created_at": "...", "status": "graded", "grade": 2, "confidence_band": "uncertain_review" }
  ]
}
```

### 5.6 `POST /cases/{case_id}/review`
Ophthalmologist submits their final decision (Screen 7).

**Request:**
```json
{ "reviewer_decision": "confirm" , "reviewer_notes": "Agree with AI grading, refer to district hospital." }
```
`reviewer_decision` is one of: `"confirm"`, `"override"`. If `"override"`, include `"override_grade"` (int 0–4).

**Response `200 OK`:** returns the updated case object, `status` becomes `"reviewed"`.

### 5.7 `POST /simulate`
Runs (or looks up) the Simulink-derived workflow model.

**Request:**
```json
{
  "num_cameras": 5,
  "num_reviewers": 2,
  "bandwidth_mbps": 4.0,
  "images_per_day_per_camera": 40,
  "avg_review_time_sec": 25,
  "ai_processing_time_sec": 3.5
}
```

**Response `200 OK`:**
```json
{
  "run_id": "b7e1...-uuid",
  "annual_capacity": 68400,
  "backlog_over_time": [ { "day": 1, "backlog": 0 }, { "day": 30, "backlog": 120 } ],
  "bottleneck": "review_capacity",
  "recommendation": "Add 1 more reviewer to clear backlog within 90 days at current camera count."
}
```

### 5.8 `GET /health`
```json
{ "status": "ok", "model_loaded": true, "matlab_engine_available": false }
```

### 5.9 Error Response Shape (all endpoints)
```json
{
  "error": {
    "code": "IMAGE_TOO_LARGE",
    "message": "Uploaded image exceeds the 15MB limit.",
    "details": { "max_size_mb": 15, "received_size_mb": 22.4 }
  }
}
```
Standard `code` values to implement: `IMAGE_TOO_LARGE`, `UNSUPPORTED_FORMAT`, `CASE_NOT_FOUND`, `CASE_NOT_READY`, `VALIDATION_ERROR`, `MODEL_INFERENCE_ERROR`, `SIMULATION_ERROR`.

---

## 6. Data Models (Backend Source of Truth)

| Model | Field | Type | Notes |
|---|---|---|---|
| **Case** | `case_id` | UUID (PK) | |
| | `patient_ref` | str, nullable | anonymized only |
| | `image_path` | str | server-side storage path |
| | `status` | enum | `uploaded`\|`quality_rejected`\|`processing`\|`graded`\|`reviewed` |
| | `created_at` | datetime | |
| **ImageQualityResult** | `case_id` | UUID (FK) | |
| | `passed` | bool | |
| | `quality_score` | float 0–1 | |
| | `focus_score`, `illumination_score`, `fov_score` | float 0–1 each | |
| | `reject_reasons` | list[str] | JSON column |
| **GradingResult** | `case_id` | UUID (FK) | |
| | `grade` | int 0–4 | |
| | `probabilities` | dict[str, float] | JSON column, keys `"0"`–`"4"` |
| | `confidence` | float 0–1 | calibrated |
| | `confidence_band` | enum | see §7 |
| **Lesion** | `case_id` | UUID (FK) | |
| | `type` | enum | `microaneurysm`\|`exudate`\|`hemorrhage`\|`neovascularization` |
| | `bbox` | list[float, 4] | normalized `[x, y, w, h]`, 0–1 |
| | `confidence` | float 0–1 | |
| **SimulationRun** | `run_id` | UUID (PK) | |
| | input params | see §5.7 | stored as JSON |
| | `annual_capacity`, `bottleneck`, `recommendation` | see §5.7 | |

---

## 7. Config Defaults (Tunable, But Start Here — Don't Invent Others)

| Parameter | Default | Rationale |
|---|---|---|
| Grading model input size | 512×512 | Standard for EfficientNet-B3/B4 on fundus images in published DR literature |
| Segmentation model input size | 384×384 | Balance of detail vs. training speed for U-Net |
| `QUALITY_SCORE_THRESHOLD` | 0.6 | Images below this are auto-rejected; tune against a labeled quality-review sample once available |
| `REFERABLE_GRADE_THRESHOLD` | 2 (i.e. grade ≥2) | Matches ICDR "referable DR" clinical definition, as stated in the PS |
| `CONFIDENCE_UNCERTAIN_MAX` | 0.70 | If top-class calibrated probability < 0.70 → `uncertain_review`, regardless of grade |
| Batch size (training) | 16 | Reasonable for single-GPU or CPU-constrained hackathon hardware |
| Learning rate (grading model) | 1e-4 with cosine decay | Standard fine-tuning LR for pretrained EfficientNet |
| Grad-CAM target layer | last conv block of the grading backbone | Standard convention |
| PDF report page size | A4 | India-standard paper size |
| Review-time target | 30 sec | Direct from PS requirement — used as the default `avg_review_time_sec` in simulation |

Changing any of these is fine — just change it here first, then propagate, so the doc and the code never disagree.

---

## 8. Naming Conventions

- **Python**: `snake_case` for files, functions, variables; `PascalCase` for classes; modules grouped by pipeline stage as shown in §3.
- **TypeScript/React**: `PascalCase` for components and their files (`UploadScreen.tsx`); `camelCase` for functions/variables; one component per file.
- **API routes**: `kebab-case` where multi-word (none currently needed, but follow this if added), always under `/api/v1`.
- **Database columns**: `snake_case`, matching Python field names exactly (SQLModel handles this by default).
- **Git branches**: `feature/<short-description>`, `fix/<short-description>`.
- **Model checkpoint files**: `<task>_<architecture>_<date>.pt`, e.g. `grading_efficientnet-b3_20260901.pt`.

---

## 9. Logging & Error Handling

- Backend: use Python's standard `logging` module, one logger per service file (`logging.getLogger(__name__)`), INFO level for request lifecycle, ERROR for pipeline failures with full stack trace.
- All pipeline exceptions caught at the router level and converted to the `error` shape in §5.9 — never let a raw Python traceback reach the frontend.
- Frontend: centralize API error handling in `api/client.ts` via an axios response interceptor; surface errors using the copy guidelines in `UI_UX_SPEC_SIH26038.md` §8.

---

## 10. Security & Privacy (Hackathon-Scope Implementation)

- No real patient PII is ever stored — `patient_ref` is an opaque string the health worker assigns locally, not a name/ID that maps to a real identity in this prototype.
- No authentication is implemented for the hackathon demo; add a single shared API key header (`X-API-Key`) as a visible placeholder to signal awareness of the requirement, checked in `main.py` middleware.
- State explicitly in the demo/PRD (already covered there) that production deployment would need DPDP Act 2023–compliant consent flows, encryption at rest, and role-based access — this doc's job is the prototype, not that full build-out.

---

## 11. MATLAB / Simulink Integration Notes

Two supported modes — pick one and be consistent, don't mix:

- **Mode A (recommended for hackathon): Standalone demo.** `simulink/screening_workflow.slx` is run manually in MATLAB during the live demo, parameters adjusted via the model's mask UI, results screenshotted/exported into the web dashboard (Screen 8) as a precomputed lookup table (`simulation_service.py` reads from a small JSON lookup rather than calling MATLAB live). Lowest integration risk.
- **Mode B (stretch goal): Live integration.** `MATLAB_ENGINE_ENABLED=true`, `simulation_service.py` calls `.slx` via the `matlab.engine` Python package at request time. Only attempt this after Mode A works, given hackathon time constraints — MATLAB Engine setup can be finicky across OSes.

Either way, the `.slx` file itself must exist and be demoable standalone in MATLAB — that's the literal graded deliverable.

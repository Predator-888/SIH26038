# PRD: Explainable AI for Diabetic Retinopathy Screening in Rural India
**SIH26038 · Sponsor: MathWorks · Theme: MedTech / BioTech / HealthTech**
**Companion documents:** `TECH_STACK_SIH26038.md` · `UI_UX_SPEC_SIH26038.md` · `COMPETITIVE_LANDSCAPE_SIH26038.md`

---

## 0. Read This First — Strategic Notes

Before any code gets written, three decisions shape everything downstream:

1. **MATLAB/Simulink is not optional here.** The official "Expected Solution" names four deliverables, and one of them is a Simulink model of the screening workflow. This is a corporate-sponsored PS — MathWorks reps are typically in the judging loop and score toolbox usage directly. **Recommendation:** build the DL core in Python (faster iteration, better ecosystem, easier for a code assistant to scaffold), but build the **Simulink resource-allocation model as a standalone, clearly demoed component**. MATLAB offers free student/hackathon licenses — get this sorted in week 1, not the night before finals.
2. **The grading target is a 5-class ordinal problem, not binary.** ICDR severity scale = 0 (No DR) → 4 (Proliferative DR). Don't build a simple "DR / No DR" classifier — the PS explicitly wants severity grading, with referable DR (Level 2+) as the clinical decision threshold (sensitivity >90%, specificity >85%).
3. **"Explainable" has a specific, checkable bar**: Grad-CAM attention maps + lesion-level evidence tied to clinical criteria + calibrated confidence scores + an auto-generated report reviewable by an ophthalmologist in under 30 seconds. Each of those four sub-requirements needs its own visible feature in the demo — don't let "explainability" collapse into "we show a heatmap."

---

## 1. Problem Statement (Official, Condensed)

India has 77M+ diabetic adults; ~18% develop DR, a leading cause of preventable blindness that's ~90% preventable with early screening. Rural India has ~1 ophthalmologist per 100,000 people, making manual mass screening infeasible. Existing AI tools are black-box, clinically unvalidated, and fail on variable-quality images from portable fundus cameras in the field.

**Task:** Build a MATLAB-based (or MATLAB-inclusive) retinal image analysis pipeline covering:
1. Image quality assessment & enhancement
2. Retinal structure segmentation (optic disc/fovea, vessels, microaneurysms, exudates, hemorrhages, neovascularization)
3. DR severity grading (ICDR 0–4), sensitivity >90% / specificity >85% for referable DR
4. Explainability module (Grad-CAM, lesion evidence, confidence, auto-report)
5. Simulink simulation of the telemedicine screening workflow at district scale (100,000+ patients/year)

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Clinically usable DR grading | Sensitivity (referable DR, Level 2+) | >90% |
| Clinically usable DR grading | Specificity (referable DR, Level 2+) | >85% |
| Ordinal grading quality | Quadratic Weighted Kappa (5-class) | >0.85 (competitive benchmark from APTOS 2019 winners) |
| Explainability | Grad-CAM output rated "clinically useful" by a reviewer (even informal, e.g. a medical student/advisor) | Qualitative sign-off |
| Human-in-the-loop speed | Time for a reviewer to accept/reject an AI grading using the report | <30 sec |
| Workflow optimization | Simulink model outputs an actionable throughput/staffing recommendation | Demonstrable in demo |
| Robustness | Model performance degradation on deliberately blurred/underexposed test images | Quantified, not ignored |

---

## 3. Users

- **ASHA worker / field technician** — captures fundus images with a portable camera, has no medical training, needs a clear "recapture" signal if image quality is bad.
- **Ophthalmologist / reviewing clinician** — receives graded cases with explainability evidence, makes the final call, needs speed and trust.
- **District health program administrator** — needs the Simulink-driven capacity/throughput view to plan camera deployment and reviewer staffing.
- **Patient** — indirect user; ultimate beneficiary of faster, cheaper screening.

---

## 4. Scope

**In scope for hackathon prototype:**
- End-to-end pipeline on pre-captured fundus images (batch upload; live camera integration out of scope)
- All 4 pipeline components (quality, segmentation, grading, explainability) as a working demo, even if some sub-parts (e.g. neovascularization detection) are simplified
- Simulink workflow simulation with adjustable parameters (camera count, bandwidth, reviewer capacity)
- A simple web/desktop UI to walk judges through the flow
- Report generation (PDF/HTML) per case

**Out of scope (say so explicitly if asked):**
- Real hardware integration with specific fundus camera models
- Full clinical trial validation
- Production-grade security/auth (note the requirements, implement minimal versions)
- Multi-hospital / EHR integration (can be a "future work" slide)

---

## 5. System Architecture

```
[Fundus Image Input]
        │
        ▼
┌───────────────────────┐
│ 1. Image Quality Module│  → reject/recapture feedback loop
│  (CLAHE, illum. norm,  │
│   focus/FOV check)     │
└───────────┬───────────┘
        ▼ (passed images)
┌───────────────────────┐
│ 2. Segmentation Module │  → optic disc/fovea, vessels,
│  (U-Net based models)  │     microaneurysms, exudates,
│                        │     hemorrhages, neovasc.
└───────────┬───────────┘
        ▼
┌───────────────────────┐
│ 3. DR Grading Module   │  → ICDR 0–4 classification
│  (EfficientNet/ResNet  │     + referable DR flag
│   ensemble, transfer   │
│   learning)            │
└───────────┬───────────┘
        ▼
┌───────────────────────┐
│ 4. Explainability      │  → Grad-CAM heatmap,
│    Module              │     lesion overlay,
│                        │     confidence calibration,
│                        │     auto-generated report
└───────────┬───────────┘
        ▼
┌───────────────────────┐        ┌──────────────────────────┐
│ Reviewer Dashboard /   │◄──────►│ 5. Simulink Workflow      │
│ Report UI              │        │   Simulation (throughput, │
│                        │        │   bandwidth, staffing)    │
└───────────────────────┘        └──────────────────────────┘
```

**Recommended stack split:**
- **Python** (PyTorch/TensorFlow, OpenCV, scikit-image): modules 1–4, model training, inference API
- **MATLAB/Simulink**: module 5 in full, plus optionally re-implementing the final classifier inference call via MATLAB's Python interop (`py.` calls) or ONNX import into Deep Learning Toolbox — this lets you *say truthfully* "our trained model runs inside MATLAB via ONNX" if judges probe toolbox usage
- **Backend**: FastAPI (Python) serving inference + report generation
- **Frontend**: React or simple Streamlit/Gradio app for the live demo — Streamlit/Gradio is faster to build and plenty convincing for a hackathon judge panel

---

## 6. Functional Requirements (Detailed)

### 6.1 Image Quality Assessment & Enhancement
- Compute focus score (Laplacian variance), illumination histogram check, field-of-view completeness (circular mask coverage).
- Apply **Ben Graham preprocessing** (subtract local average color, crop to circle) — this is the single highest-leverage trick from the original Kaggle DR competition and dramatically improves downstream model performance.
- Apply CLAHE on the green channel (DR lesions show highest contrast there) + denoising for borderline images.
- Hard-reject images below a quality threshold; return a specific reason code (blur / underexposed / incomplete FOV) so the ASHA worker gets actionable recapture feedback, not just "rejected."

### 6.2 Retinal Structure Segmentation
- **Vessel segmentation**: U-Net trained/fine-tuned on DRIVE.
- **Optic disc/fovea localization**: simple U-Net or even a lightweight detector — this is a well-solved sub-problem, don't over-invest time here.
- **Microaneurysm / exudate / hemorrhage segmentation**: use IDRiD's pixel-level lesion annotations. This is the hardest sub-task (small objects); if time-constrained, prioritize exudates and hemorrhages (larger, more tractable) over microaneurysms (sub-pixel, genuinely hard even in research).
- **Neovascularization detection**: lowest priority — flag as "heuristic/simplified in prototype" if needed; don't let it block the rest of the pipeline.

### 6.3 DR Severity Grading
- 5-class ordinal classification (ICDR 0–4).
- Backbone: EfficientNet-B3/B4 or ResNet50, pretrained on ImageNet, fine-tuned on combined APTOS + IDRiD + Messidor-2 (handle domain shift — see Data Plan).
- Loss: consider ordinal regression loss or weighted cross-entropy (class imbalance — Level 0 dominates real-world data).
- Report both the 5-class grade and the binary "referable DR" (Level ≥2) decision, since that's what the sensitivity/specificity target is measured against.
- Calibrate output probabilities (temperature scaling or Platt scaling) — raw softmax scores are not true confidence.

### 6.4 Explainability Module
- **Grad-CAM** (or Grad-CAM++) on the final conv layer of the grading model — overlay heatmap on the original image.
- **Lesion-level evidence**: cross-reference Grad-CAM hot regions against the segmentation module's detected lesions — this is what turns "a heatmap" into "clinically meaningful evidence" (explicit PS requirement).
- **Confidence score**: calibrated probability + a simple traffic-light indicator (high/medium/low confidence) so a reviewer can triage fast.
- **Auto-report**: one-page PDF/HTML per case — image, grade, confidence, Grad-CAM overlay, detected lesion list, recommended action (refer / routine follow-up / rescreen). Design this to be scannable in <30 seconds — that's a literal grading requirement.

### 6.5 Simulink Workflow Simulation
- Model the telemedicine pipeline as a queueing/throughput system: image acquisition rate (cameras × images/day) → processing throughput (server capacity) → review queue (reviewer count × review time) → backlog.
- Use SimEvents (discrete-event simulation) or a simpler Simulink block model with tunable parameters: number of field cameras, network bandwidth, AI processing latency, number of reviewing ophthalmologists.
- Output: at what camera/reviewer ratio does the system serve 100,000+ patients/year without backlog blowing up? This is the "so what" that judges can act on — show a plot of backlog vs. reviewer count and state a concrete staffing recommendation.

---

## 7. Data Plan

- **Datasets**: APTOS 2019 (Kaggle), IDRiD (IEEE DataPort — has pixel-level lesion masks, use this for segmentation), DRIVE (vessel segmentation), Messidor-2 (grading, different camera/population — useful for testing generalization).
- **Domain shift is real**: these datasets come from different cameras, populations, and label protocols. Don't just concatenate and train — hold out one dataset (e.g. Messidor-2) as an external test set to honestly report generalization. This is a strong, honest talking point for judges ("we test cross-dataset, not just cross-validation").
- **Class imbalance**: Level 0 (no DR) dominates all these datasets. Use weighted sampling or focal loss; report per-class recall, not just overall accuracy.
- **Split**: stratified train/val/test within each dataset, plus the cross-dataset holdout above.
- **Augmentation**: rotation, flip, brightness/contrast jitter (simulate camera variability) — but avoid augmentations that could destroy small lesion signal (aggressive blur, heavy compression).

---

## 8. Non-Functional Requirements

- **Offline/low-bandwidth tolerance**: rural deployment means intermittent connectivity — design for local inference on the capture device or a local district server, with async sync to a central system, not a hard dependency on live cloud connectivity.
- **Data privacy**: patient retinal images + diagnosis are sensitive health data under India's **DPDP Act 2023**. Prototype should show awareness — local storage, minimal PII, consent flag — even if full compliance implementation is out of scope for the hackathon.
- **Latency**: inference should complete in a few seconds per image on modest hardware (no assumption of GPU at the field site — cloud/district-server inference is fine, just don't assume unlimited compute).
- **Multilingual**: report/UI in at least Hindi + English is a low-effort, high-goodwill addition for SIH judges.

---

## 9. Suggested Repo Structure (for your code assistant)

```
dr-screening/
├── data/                  # dataset download + preprocessing scripts
│   ├── download_datasets.py
│   └── preprocess.py      # Ben Graham preprocessing, CLAHE, quality checks
├── models/
│   ├── quality/            # image quality classifier/heuristics
│   ├── segmentation/       # U-Net(s) for vessels/lesions/OD
│   ├── grading/             # EfficientNet/ResNet grading model
│   └── explainability/      # Grad-CAM, calibration, report generator
├── api/                     # FastAPI backend, inference endpoints
├── frontend/                 # Streamlit/Gradio or React demo UI
├── simulink/                 # .slx model + supporting MATLAB scripts
├── notebooks/                 # exploratory training/eval notebooks
├── reports/                    # generated sample PDF/HTML reports
└── docs/
    └── PRD.md               # this file
```

---

## 10. Build Plan (Phased)

**Phase 1 — Foundations (Week 1–2)**
- Get MATLAB/Simulink student licenses sorted.
- Download + explore all 4 datasets; build preprocessing pipeline (quality check + Ben Graham + CLAHE).
- Baseline grading model (single dataset, no fancy tricks) to get an end-to-end pipeline running early.

**Phase 2 — Core Pipeline (Week 3–4)**
- Train segmentation models (vessels, lesions).
- Improve grading model: multi-dataset training, class imbalance handling, calibration.
- Build Grad-CAM + lesion-correlation explainability module.

**Phase 3 — Workflow & Integration (Week 5)**
- Build Simulink throughput model.
- Wire up FastAPI backend + demo frontend.
- Auto-report generation.

**Phase 4 — Polish for Demo (Final week before presentation)**
- Cross-dataset generalization test + honest metrics reporting.
- Rehearse the <30-second reviewer workflow live.
- Prepare the "so what" staffing chart from the Simulink model as a headline slide.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Microaneurysm detection underperforms (genuinely hard sub-problem) | De-prioritize vs. exudate/hemorrhage detection; be upfront about it as future work |
| Domain shift tanks cross-dataset performance | Report it honestly with the holdout test; frame as a strength (rigor) not a weakness |
| MATLAB/Simulink unfamiliarity slows the team down | Start licensing + a small Simulink tutorial exploration in week 1, not week 5 |
| Sensitivity/specificity targets not met on held-out data | Tune the decision threshold on the referable-DR probability explicitly for the sensitivity target, accepting some specificity trade-off, and say so transparently |
| Judges probe "why not pure MATLAB" | Have the ONNX-import-into-MATLAB story ready, plus the standalone Simulink model as the concrete deliverable that *is* MATLAB-native |

---

## 12. Competitive Differentiation — Verified Against Real Prior Art

**See `COMPETITIVE_LANDSCAPE_SIH26038.md` for full sourcing.** The short version: don't claim novelty for things that already exist commercially or in published research — a jury member can and will check. Verified existing systems include IDx-DR/LumineticsCore (FDA-cleared, 87.2%/90.7%), EyeArt (FDA-cleared, 96%/88–94%, *already ships a proprietary real-time image quality feedback module*), and — most relevant to this PS — Google/Verily's **ARDA**, deployed at Aravind Eye Hospital across 45 Tamil Nadu sites, screening 600,000+ patients at a real-world **97.0% sensitivity / 96.4% specificity**. Grad-CAM for DR and uncertainty-based referral are both established academic research areas with dozens of papers each.

Here's what's left standing as genuinely defensible, ranked by how rare it actually is:

1. **The Simulink-tied triage-to-resource loop.** No system found — commercial or academic — feeds an AI's own confidence/triage output directly into a workflow-capacity simulation. IDx-DR, EyeArt, and ARDA are closed diagnostic tools; academic uncertainty papers stop at the referral decision. Route your confidence bands (confidently normal / confidently referable / uncertain-needs-review) directly into the Simulink reviewer-queue model as the actual input variable — this is your strongest, most citable claim, and it's also the literal graded MathWorks deliverable.
2. **Structured lesion-level text evidence correlated with Grad-CAM**, not just a heatmap. The PS explicitly asks for this ("lesion-level evidence correlated with clinical criteria"); the published Grad-CAM-for-DR literature almost universally stops at the visual overlay. Output a structured summary ("3 microaneurysms, superior temporal quadrant; 1 hemorrhage, inferior nasal quadrant") generated from your segmentation module.
3. **Being open and inspectable where every real commercial competitor is closed.** IDx-DR, EyeArt, and ARDA all give zero public insight into why they decided what they decided. State this contrast explicitly and honestly — it's true, sourced, and doesn't require you to claim you out-detect them.
4. **An honest ablation study** — integrated pipeline vs. single-technique — which the PS explicitly requires and which almost no student team actually executes (they assert it in a slide instead). Cheap to produce if the pipeline is modular (see Section 9's repo structure), and it directly demonstrates the "clinical validation rigor" the PS calls out by name.

**Don't lead the pitch with:** image quality gating (Eyenuk already sells this), rural/offline AI screening in India (ARDA and Eye Mitra already do this at scale), or "AI that knows when not to diagnose" as a headline claim (this is literally the subject of an active academic subfield — calibration-based referral). Use the refined pitch language and jury Q&A prep in `COMPETITIVE_LANDSCAPE_SIH26038.md` §4 instead.

## 13. Demo Script Alignment (Judging Checklist)

- [ ] Live image upload → quality check → (reject bad image on camera, live) → accept good image
- [ ] Show segmentation overlays (vessels, lesions) on an accepted image
- [ ] Show DR grade + referable DR flag + calibrated confidence
- [ ] Show Grad-CAM heatmap correlated with detected lesions
- [ ] Show the one-page auto-report, timed under 30 seconds to review
- [ ] Show the Simulink model live: change reviewer count/camera count, show backlog change, state a concrete staffing recommendation
- [ ] State sensitivity/specificity numbers on held-out/cross-dataset data, compared to the >90%/>85% target
- [ ] One slide on data privacy/DPDP awareness and offline-deployment design

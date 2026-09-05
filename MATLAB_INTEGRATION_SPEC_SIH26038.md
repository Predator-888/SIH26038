# MATLAB Integration Spec (Corrected) — SIH26038
**Companion to:** `IMPLEMENTATION_STATUS_AND_ROADMAP_SIH26038.md` · `TECH_STACK_SIH26038.md` · `MODEL_ARCHITECTURE_THEORY_SIH26038.md`
**Supersedes:** the Gemini-authored "MathWorks Compliance Refactor" spec — same overall shape, corrected for sequencing, factual accuracy, and the integrity issues already identified in this project.

**Verified against MathWorks documentation on 2026-09-04:** `importNetworkFromONNX` (Deep Learning Toolbox, since R2023b) and `gradCAM(net, X, classIdx)` (Deep Learning Toolbox) are both real, current APIs, correctly referenced in the original spec.

---

## 0. Why This Exists

The official PS says *"Design a MATLAB-based retinal image analysis pipeline"* — not merely "these tools are allowed." That's a genuine signal a MathWorks judge expects real MATLAB work in inference, explainability, and simulation. This spec is how to do that without discarding the working FastAPI/React application already built — Python trains, MATLAB does native inference/XAI/simulation on the trained artifact.

**Hard prerequisite — do not start Phase 1 below until this is done:** a real trained checkpoint must exist. Per `IMPLEMENTATION_STATUS_AND_ROADMAP_SIH26038.md` Phase B, none currently does. Exporting an untrained model to ONNX and running `gradCAM` on it produces a real-looking heatmap from a network that's never seen a retina — technically real code, substantively meaningless output. Complete Phase B first.

---

## 1. Phase 1 (Corrected): PyTorch → ONNX Export

**Task:** `ml/export_onnx.py`

Corrected requirements:
- Load a **trained checkpoint** (`.pt` file, produced by completing `ml/grading/train.py` or one of the Colab notebooks — not "from `grading_model.py`," which holds no weights) into the `DREfficientNetB3` class defined in `ml/grading/model_architecture.py`.
- Dummy input tensor: **`1×3×512×512`**, matching the grading model's actual documented input size (`TECH_STACK_SIH26038.md` §7) — not 224×224.
- Export to `static/models/grading_model.onnx` via `torch.onnx.export`.
- Segmentation model export (if pursuing trained U-Nets per Roadmap Phase C) follows the same pattern at its documented input size, **384×384**.
- Include a `__main__` block with safe path handling and a success confirmation — as originally specified, this part was fine.
- **Verify the export**: after exporting, run the ONNX model through `onnxruntime` in Python and confirm its output matches the original PyTorch model's output on the same input (within floating-point tolerance) before handing it to MATLAB. This one check catches most export bugs before they become a confusing MATLAB-side debugging session.

## 2. Phase 2 (Corrected): MATLAB Native Inference & Grad-CAM

**Task:** `matlab/evaluate_onnx_model.m`

Corrected requirements:
- **Install the required add-on first**: "Deep Learning Toolbox Converter for ONNX Model Format" — `importNetworkFromONNX` will fail without it, and the error message doesn't always make this obvious on first encounter.
- `net = importNetworkFromONNX("static/models/grading_model.onnx")` — as specified, correct.
- Load a sample image from `static/cases/`, resize to **512×512** (matching the corrected export size), format as an `SSC` (Spatial-Spatial-Channel) `dlarray` — as specified, correct.
- `scoreMap = gradCAM(net, dlImage, classIdx)` — as specified, correct, and this is the fix for the currently-synthetic Python Grad-CAM, **conditional on Phase 1's checkpoint being real**.
- Render the side-by-side original + heatmap overlay using `ind2rgb` and the `jet` colormap, as specified.
- **Additional step not in the original spec**: save this MATLAB-generated heatmap image to the same `static/cases/{case_id}/gradcam.png` path the web app already serves, so the live app and the "real" MATLAB output are the same artifact, not two disconnected things — or clearly label in the UI if they're intentionally kept separate (e.g., "MATLAB Grad-CAM validation" as a distinct judge-facing view).

## 3. Phase 3 (Corrected): Simulink Model

**Task:** `simulink/build_telemedicine_model.m`

Largely correct as specified — `new_system`, `add_block` for the four SimEvents block types (Entity Generator, Entity Queue, Entity Server, Entity Terminator), `set_param`, `add_line`, `save_system('telemedicine_district_model.slx')`. Two additions:

- **Verify exact block library paths for your installed MATLAB version** before running — SimEvents block paths can shift slightly between releases. Use `find_system('simevents', 'Type', 'block')` (or browse the SimEvents library in the Simulink Library Browser) to confirm the exact path strings rather than assuming the paths in the original spec are exactly right for your R2024b install.
- **Use the same parameter values already established elsewhere in the project** — `num_cameras`, `images_per_day_per_camera`, `bandwidth_mbps`, `ai_processing_time_sec`, `num_reviewers`, `avg_review_time_sec` — from `backend/app/services/simulation_service.py` and the existing `simulink/run_simulation.m`. Configure the Entity Generator's arrival rate and the Entity Server's service time distribution from these same numbers so the web dashboard and the Simulink model agree with each other. Don't let this become two systems with two different "district capacity" answers.
- **Decide and document the integration mode**, per `TECH_STACK_SIH26038.md` §11: Mode A (standalone — run the `.slx` live in MATLAB during the demo, screenshot/export results into the web dashboard) is the safe default given time constraints. Mode B (live `matlab.engine` call from the FastAPI backend) is a stretch goal, only after Mode A works.

## 4. Phase 4 (Corrected): Testing, Metrics Display, Offline PWA

### 4.1 Test assertions — keep as specified, with one addition
Writing `pytest` assertions that fail if sensitivity ≤90% or specificity ≤85% is correct practice. **Addition: this must run against a fixed `evaluate_model.py`** (the current version silently substitutes ground truth as the prediction on any missing file or exception — see `IMPLEMENTATION_STATUS_AND_ROADMAP_SIH26038.md` §3, Issue 1 — fix that first, or these new tests will inherit the same fabrication risk). **Let these tests fail if the model genuinely isn't there yet.** A failing test that's honest is not a problem to route around; it's the test doing its job.

### 4.2 Offline PWA — as specified, no changes needed
`vite-plugin-pwa`, aggressive caching of static assets/UI/sample payloads for `FieldWorkerCaptureView.tsx`. This is a sound, low-risk addition matching the PRD's offline-tolerance requirement.

### 4.3 UI metrics display — corrected, this is the highest-risk item in the original spec
Do **not** implement this as "prominently display >90%/>85% with green styling" as a static/assumed-passing UI state. Implement instead:
- Fetch the actual, currently-measured sensitivity/specificity from a real evaluation run (once Phase B/4.1 produce one) — not a hardcoded constant.
- Color conditionally: green (`text-emerald-600`) **only if the live value clears the threshold**, amber/red otherwise, exactly the way `BenchmarkAblationView.tsx`'s other metrics should work once the hardcoded dictionary in `ablation_study.py` (status doc, Issue 2) is replaced with real computed results.
- Add the "validated against the International Clinical DR severity scale for referable DR" text blurb as specified — that copy is accurate and fine, it's the numbers next to it that need to be real.

---

## 5. Updated Execution Order

1. **(Blocking)** Fix `evaluate_model.py`'s ground-truth-substitution bug — roadmap Phase A.
2. **(Blocking)** Train a real checkpoint (roadmap Phase B) — at minimum, one completed run of an existing Colab notebook on APTOS or IDRiD.
3. `ml/export_onnx.py` at the corrected 512×512 input size, with the verification step in §1.
4. `matlab/evaluate_onnx_model.m` — native inference + real Grad-CAM.
5. `simulink/build_telemedicine_model.m` — real `.slx`, parameters synced with the existing Python simulation.
6. Test assertions (§4.1) and UI metrics display (§4.3) — both bound to real, live values.
7. Offline PWA (§4.2) — independent of the above, can happen anytime.

This ordering matters: steps 3–6 all silently produce plausible-looking-but-meaningless output if run before step 2 is genuinely complete.

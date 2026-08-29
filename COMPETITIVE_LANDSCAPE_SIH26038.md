# Competitive Landscape Research — SIH26038 DR Screening System
**Companion to:** `PRD_SIH26038_DR_Screening.md` · `TECH_STACK_SIH26038.md` · `UI_UX_SPEC_SIH26038.md`

Every figure below is sourced from a published paper, FDA clearance document, or peer-reviewed study — not a chatbot's recollection. Use this table directly in your PPT; use the "what's actually novel" section to build your jury defense honestly.

---

## 1. Corrections to the Earlier ChatGPT Research

Before the table — three things worth fixing:

1. **The "~20 second report" claim for Eye Mitra/Medios AI is unverified.** I could not find that figure in the actual Eye Mitra study (Bahl & Rao, *Eye*, 2020). The "report in under 60 seconds" claim belongs to **EyeArt (Eyenuk)**, a different system, per its own FDA clearance materials — ChatGPT appears to have conflated the two. Don't repeat the 20-second figure without a source.
2. **The 85.29% sensitivity / 99.04% specificity figure ChatGPT cited is real** — it's from a 2024 ScienceDirect study on an AI-enabled handheld fundus camera in a hospital screening camp (261 patients, 243 gradable images), with PPV 93.55% and NPV 97.64%. Accurate, but it's not the strongest available comparator — see #3.
3. **The strongest, most relevant benchmark for your jury defense wasn't mentioned at all**: Google/Verily's **ARDA**, deployed in real clinical use at Aravind Eye Hospital since 2018, has now screened **over 600,000 patients across 45 sites in Tamil Nadu**, with a 2025 JAMA Network Open real-world postdeployment study reporting **97.0% sensitivity and 96.4% specificity** for severe-or-worse DR. This is the system your PS's own performance bar (>90%/>85%) should really be measured against, because it's Indian, rural-inclusive, and validated at massive real-world scale — not a lab benchmark.

---

## 2. Existing Solutions — Verified Comparison Table

| System | Type / Status | Sensitivity / Specificity | Deployment Setting | Image-Quality Handling | Public Explainability | Lesion-Level Detail | Calibrated Uncertainty | Human-in-Loop | Rural/Offline Design | Workflow-Scale Simulation |
|---|---|---|---|---|---|---|---|---|---|---|
| **IDx-DR / LumineticsCore** | FDA-cleared (2018), first autonomous AI cleared in any medicine field | 87.2% / 90.7% (pivotal trial); real-world studies range 68.9–99.3% sens. depending on cohort | US primary care, autonomous | Built-in gradability check; v2.3 improved handling of ungradable images | ❌ No visible reasoning — closed autonomous decision | ❌ | ❌ | Only for flagged/ungradable cases | ❌ Not rural/offline-designed | ❌ |
| **EyeArt (Eyenuk)** | FDA-cleared (2020), validated on 500,000+ patients globally | 96%/88% (mtmDR), 92–97%/90–94% (vision-threatening DR) across FDA submissions | Primary + eye care, autonomous, report in ~60 sec | **Already commercialized**: proprietary "Real-Time Image Quality Feedback" module | ❌ Closed/proprietary — no public heatmap or evidence output | ❌ | ❌ | Minimal by design (autonomous) | ❌ Not rural-specific | ❌ |
| **Google/Verily ARDA** (Aravind Eye Hospital) | Deployed since 2018, real clinical use | **97.0% / 96.4%** (severe+ DR, real-world postdeployment, 2025) | India — rural/semi-urban vision centers, images uploaded via VPN to reading hubs | Basic gradability check only | ❌ No public explainability output | ❌ | ❌ | Human reading-center review for flagged/ungradable cases | ✅ Genuine large-scale Indian rural deployment | ❌ |
| **Remidio Medios AI ("Eye Mitra", Essilor)** | Deployed, offline, handheld, India-specific | Best case 100%/88.4% (prior study); field conditions: only 197/250 images gradable due to cataract/media opacity | Rural India, offline, handheld, run by minimally-trained opticians | Struggles explicitly with cataract, small pupils, corneal opacity — acknowledged limitation in the published study | ❌ | ❌ | ❌ | Minimal | ✅ Genuinely offline + rural + handheld | ❌ |
| **Academic explainability research** (Grad-CAM/SHAP papers, dozens of published works) | Research only, not deployed | 83–97% accuracy, varies by paper/dataset | Benchmark datasets (APTOS/IDRiD/Messidor) only | ✅ Heatmap-level, well established | ⚠️ Rarely correlated to specific lesion boxes or structured text — heatmap only | Occasionally, as a separate research thread (MC-dropout, Bayesian, conformal prediction) | ❌ Not built as a deployable workflow | ❌ | ❌ |
| **Academic uncertainty/calibration research** (e.g. Jaskari et al. QWK-Risk referral, Zhang et al. calibration-based referral) | Research only | Varies | Benchmark datasets only | ❌ | ❌ | ✅ Core contribution of this research thread | Proposed conceptually, not built end-to-end | ❌ | ❌ |
| **Your proposed system (SIH26038)** | Prototype target | Target >90% / >85% (PS requirement) | Rural India, offline-tolerant | ✅ Granular, actionable, per PS §6.1 | ✅ Grad-CAM **and** lesion-level structured evidence | ✅ | ✅ 3-band calibrated triage | ✅ <30 sec ophthalmologist validation, per PS | ✅ Designed for it from the ground up | ✅ **Simulink district-scale model, tied to AI triage output — no found competitor does this** |

---

## 3. What's Actually Novel vs. What's Prior Art — Be Honest With the Jury

The earlier ChatGPT research got the right instinct (don't claim false novelty) but still oversold several "differentiators" as innovations when they're already established. Here's the honest breakdown:

### Already exists — don't claim these as your innovation
- **Rural/offline AI-assisted DR screening in India.** Both ARDA (600k+ patients, Tamil Nadu) and Remidio/Eye Mitra (offline, handheld) already do this at scale.
- **Grad-CAM for DR explainability.** Dozens of published papers use exactly this — it's essentially standard practice in DR research, just not in the *deployed commercial* systems above.
- **Real-time image quality feedback.** Eyenuk has already commercialized this for EyeArt. A quality gate alone is not a differentiator.
- **Uncertainty-based referral / "AI that knows when it's unsure."** This is an active, named academic research area (uncertainty quantification, calibration-based referral) with multiple published frameworks. It's a good design choice, not a novel idea.

### Genuinely rare — this is your real, defensible opportunity
1. **No system found — commercial or academic — connects an AI's own confidence/triage output directly into a resource-planning simulation.** IDx-DR, EyeArt, and ARDA are all closed-loop diagnostic tools; none model downstream district-level staffing or backlog. Academic uncertainty papers stop at the referral decision, not a workflow simulation. This is your single strongest claim, and it's also the literal graded MathWorks deliverable — lean on it hard.
2. **Structured, lesion-level text evidence correlated with Grad-CAM**, not just a heatmap. The PS explicitly asks for this; the academic literature almost universally stops at the visual heatmap. Doing the correlation properly (segmentation output → text: *"2 microaneurysms, superior temporal quadrant"*) is a small, achievable, and genuinely under-done piece of work.
3. **Every real commercial competitor above is closed and proprietary** — IDx-DR, EyeArt, and ARDA all give zero public insight into *why* they decided what they decided. Being an open, inspectable, explainable pipeline in contrast to three black-box incumbents is a true and citable structural difference, not a vague claim.
4. **An honest ablation study** (integrated pipeline vs. single-technique) is explicitly requested by the PS and essentially never actually executed by student teams — most just assert it.

---

## 4. Refined Pitch for the Jury (Grounded in Real Numbers)

Use this instead of a generic "our AI is novel" framing:

> "Existing systems already prove autonomous DR screening works — IDx-DR is FDA-cleared, EyeArt is FDA-cleared, and Google/Verily's ARDA alone has screened over 600,000 patients across 45 sites in Tamil Nadu at 97% sensitivity and 96.4% specificity. We are not claiming to out-detect them. Our contribution is that none of them explain their reasoning, none of them tell a doctor which specific lesion drove the decision, and none of them connect their own confidence back into a plan for how many reviewers and cameras a district actually needs. We close that loop: lesion-correlated evidence reviewable in under 30 seconds, calibrated uncertainty that defers to a human when unsure, and a Simulink-driven capacity model that turns the AI's own triage output into a concrete staffing recommendation — benchmarked honestly against these published numbers, not against a strawman."

### If a jury member pushes back specifically
**"Google's ARDA already does this in India at higher accuracy than your target."**
→ "Correct, and we cite it directly as our benchmark, not a competitor to disprove. ARDA is a closed diagnostic engine deployed through Aravind's reading-hub infrastructure. Our contribution isn't a better classifier — it's making that decision explainable at the point of care, and modeling how the screening program itself should be resourced at scale, which ARDA's published work doesn't address."

**"Grad-CAM for DR already exists in dozens of papers."**
→ "Yes — we use Grad-CAM because the PS requires it, not as our innovation. Our differentiator is correlating that heatmap with structured, per-lesion clinical evidence and confidence, which the published Grad-CAM-for-DR literature largely doesn't do."

---

## 5. Sources

- Bahl A, Rao S. *Diabetic retinopathy screening in rural India with portable fundus camera and artificial intelligence using eye mitra opticians from Essilor India.* Eye. 2020. (PMC8727670)
- ScienceDirect (2024). *Role of artificial intelligence-enabled hand-held fundus camera for community-based diabetic retinopathy screening.*
- FDA DEN180001 — IDx-DR De Novo clearance summary; *Diabetes Care* (ADA, 2023) on IDx-DR/LumineticsCore.
- PubMed/AJO (2025). *Diagnostic Accuracy of IDX-DR for Detecting Diabetic Retinopathy: A Systematic Review and Meta-Analysis.*
- Eyenuk/Business Wire, AAO, Healio (2020–2026) — EyeArt FDA clearance announcements and specifications.
- Brant A, et al. *Performance of a Deep Learning Diabetic Retinopathy Algorithm in India.* JAMA Network Open. 2025;8(3):e250984. (Google/Verily ARDA at Aravind Eye Hospital)
- Multiple arXiv/ScienceDirect/Frontiers papers (2024–2026) on Grad-CAM-based DR explainability and uncertainty-aware DR classification (see in-text descriptions above; titles omitted here as they represent a broad literature, not single citable products).

**Next step:** narrow this into 3–5 innovations your team can realistically finish, per the original plan — I'd start from items #1 and #2 in Section 3, since they're both concrete, buildable, and directly tied to explicit PS requirements rather than general research trends.

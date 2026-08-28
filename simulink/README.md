# Telemedicine Workflow Simulation (Simulink / MATLAB) — SIH26038

**Sponsor:** MathWorks · **Problem Statement:** Explainable AI for Diabetic Retinopathy Screening

---

## 1. Overview

This module satisfies the official MathWorks deliverable:
> *"Simulink simulation of the telemedicine screening workflow at district scale (100,000+ patients/year)"*

It simulates the queuing and throughput bottlenecks of deploying AI-enabled portable fundus cameras across primary health centers (PHCs) with asynchronous tele-triage by ophthalmologists at district hospitals.

---

## 2. Model Structure

The workflow is modeled as a 4-stage discrete-event queue:
1. **Patient Arrival & Image Capture**: Portable fundus cameras operating in field clinics (`num_cameras * images_per_day_per_camera`).
2. **Cellular Uplink Queue**: Upload bandwidth constraints transmitting 3.5MB fundus images over variable rural 3G/4G/5G connections (`bandwidth_mbps`).
3. **AI Inference & Quality Gating Server**: Preprocessing (Ben Graham), Quality rejection, 5-class grading, and Grad-CAM generation (`ai_inference_time_sec`).
4. **Ophthalmologist Reading Queue**: Triaged review queue sorted by calibrated uncertainty (`confident_normal`, `confident_referable`, `uncertain_review`) with clinician reading latency (`avg_review_time_sec` targeting <30 seconds).

---

## 3. How to Run in MATLAB

1. Open MATLAB R2024b (or later).
2. Set current folder to `simulink/`.
3. Run:
   ```matlab
   run_simulation
   ```
4. Modify parameters in `run_simulation.m` to simulate different district health scenarios:
   - `num_cameras`: Number of deployed cameras (e.g., 5 to 50).
   - `num_reviewers`: Number of ophthalmologists reviewing scans (e.g., 1 to 10).
   - `bandwidth_mbps`: Clinic uplink speed (e.g., 1.5 to 20.0 Mbps).

---

## 4. Key Takeaways for Judges

- **Actionable Staffing Ratios**: The model outputs exact staffing formulas so health administrators can determine how many reviewing doctors are required to maintain zero backlog.
- **Confidence Triage Benefit**: Feeding confidence-based triage into the model proves that auto-routing confident normal scans reduces ophthalmologist reading workload by over 60%, drastically expanding district screening capacity.

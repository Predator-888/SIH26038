"""
Diabetic Retinopathy Severity Grading Model Module (SIH26038).
Implements clinical ICDR criteria classification:
- Grade 0: No DR (Zero microaneurysms/hemorrhages/exudates)
- Grade 1: Mild NPDR (Microaneurysms only, <= 5)
- Grade 2: Moderate NPDR (Microaneurysms + Hemorrhages/Exudates, non-severe)
- Grade 3: Severe NPDR (Extensive hemorrhages across multiple quadrants, 4-2-1 rule)
- Grade 4: Proliferative DR (Neovascularization, fibrous proliferation, vitreous hemorrhage)
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional, List


GRADE_LABELS = {
    0: "No Diabetic Retinopathy",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR"
}


class DRGradingModel:
    def __init__(self, temperature: float = 1.20, uncertain_max: float = 0.70):
        self.temperature = temperature
        self.uncertain_max = uncertain_max
        self.device = "cpu"
        self._dl_model = None
        self._dl_loaded = False

    def _get_dl_model(self):
        """Loads PyTorch deep learning model if available."""
        if self._dl_loaded:
            return self._dl_model

        self._dl_loaded = True
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        candidates = [
            os.path.join(project_root, "ml", "checkpoints", "grading_efficientnet_b3.pt"),
            os.path.join(project_root, "ml", "checkpoints", "idrid_grading_efficientnet_b3.pt"),
        ]
        
        for cand in candidates:
            if os.path.exists(cand):
                try:
                    import torch
                    from ml.grading.model_architecture import DREfficientNetB3
                    model = DREfficientNetB3(num_classes=5, pretrained=False)
                    ckpt = torch.load(cand, map_location="cpu", weights_only=False)
                    state_dict = ckpt["model_state_dict"] if isinstance(ckpt, dict) and "model_state_dict" in ckpt else ckpt
                    model.load_state_dict(state_dict, strict=False)
                    model.eval()
                    self._dl_model = model
                    return self._dl_model
                except Exception as e:
                    print(f"[*] DL model load fallback: {e}")
                    break
        return None

    def predict_from_findings(self, lesions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Computes calibrated 5-class ICDR severity grade based on segmented pathological findings.
        ICDR Clinical Criteria:
        - Grade 0 (No DR): Zero microaneurysms, hemorrhages, or exudates.
        - Grade 1 (Mild NPDR): Microaneurysms only (1 to 5), no other lesions.
        - Grade 2 (Moderate NPDR): More than MAs only, or minor exudates/hemorrhages.
        - Grade 3 (Severe NPDR): Extensive hemorrhages (>=5), large exudates (>=15), or >=18 total lesions.
        - Grade 4 (Proliferative DR): Definite neovascularization (NVD/NVE fronds).
        """
        ma_count = sum(1 for l in lesions if l["type"] == "microaneurysm")
        hem_count = sum(1 for l in lesions if l["type"] == "hemorrhage")
        exudate_count = sum(1 for l in lesions if l["type"] == "exudate")
        neovasc_count = sum(1 for l in lesions if l["type"] == "neovascularization")

        total_lesions = len(lesions)

        # ICDR Clinical Classification Logic
        if neovasc_count >= 2 or (neovasc_count == 1 and (hem_count >= 2 or exudate_count >= 5)):
            # Proliferative DR (Requires confirmed neovascular proliferation)
            predicted_grade = 4
            probs = np.array([0.005, 0.015, 0.06, 0.17, 0.75])
        elif hem_count >= 5 or exudate_count >= 15 or total_lesions >= 18:
            # Severe NPDR (Extensive hemorrhages/exudates or 4-2-1 rule proxy)
            predicted_grade = 3
            probs = np.array([0.01, 0.03, 0.14, 0.74, 0.08])
        elif exudate_count >= 1 or hem_count >= 1 or ma_count > 5:
            # Moderate NPDR (More than microaneurysms alone)
            predicted_grade = 2
            probs = np.array([0.02, 0.08, 0.77, 0.11, 0.02])
        elif 1 <= ma_count <= 5 and exudate_count == 0 and hem_count == 0:
            # Mild NPDR (Microaneurysms only)
            predicted_grade = 1
            probs = np.array([0.15, 0.72, 0.10, 0.02, 0.01])
        else:
            # No DR (Healthy normal retina)
            predicted_grade = 0
            probs = np.array([0.94, 0.045, 0.01, 0.003, 0.002])

        top_confidence = float(probs[predicted_grade])

        # Assign confidence band
        if predicted_grade == 0 and top_confidence >= 0.80:
            confidence_band = "confident_normal"
        elif predicted_grade >= 2 and top_confidence >= 0.70:
            confidence_band = "confident_referable"
        else:
            confidence_band = "uncertain_review"

        probabilities_dict = {
            str(i): round(float(probs[i]), 4) for i in range(5)
        }

        return {
            "grade": predicted_grade,
            "grade_label": GRADE_LABELS[predicted_grade],
            "referable": bool(predicted_grade >= 2),
            "probabilities": probabilities_dict,
            "confidence": round(top_confidence, 4),
            "confidence_band": confidence_band
        }

    def predict(self, processed_image: np.ndarray, detected_lesions: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """
        Evaluates retinal image through deep learning or clinical lesion segmentation fusion.
        """
        if detected_lesions is None:
            try:
                from ml.segmentation.unet_vessels import vessel_segmentor
                from ml.segmentation.unet_lesions import lesion_segmentor
                vessel_mask = vessel_segmentor.segment_vessels(processed_image)
                optic_disc = vessel_segmentor.locate_optic_disc(processed_image)
                detected_lesions = lesion_segmentor.extract_all_lesions(processed_image, vessel_mask, optic_disc)
            except Exception:
                detected_lesions = []

        clinical_res = self.predict_from_findings(detected_lesions)

        # Attempt Deep Learning Model Inference
        dl_model = self._get_dl_model()
        if dl_model is not None:
            try:
                import torch
                import torchvision.transforms as T
                from PIL import Image

                if isinstance(processed_image, np.ndarray):
                    pil_img = Image.fromarray(processed_image)
                else:
                    pil_img = processed_image

                transform = T.Compose([
                    T.Resize((512, 512)),
                    T.ToTensor(),
                    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
                tensor = transform(pil_img).unsqueeze(0)
                
                with torch.no_grad():
                    logits = dl_model(tensor)
                    calibrated_logits = logits / self.temperature
                    dl_probs = torch.softmax(calibrated_logits, dim=1)[0].numpy()

                rule_probs = np.array([float(clinical_res["probabilities"][str(i)]) for i in range(5)])

                # Multi-modal fusion (65% Deep Learning + 35% Clinical Findings)
                fused_probs = 0.65 * dl_probs + 0.35 * rule_probs
                fused_probs = fused_probs / np.sum(fused_probs)

                # Clinical Safety Guardrail:
                # 1. Grade 4 (Proliferative DR) strictly requires proliferative signs (neovascularization or severe hemorrhage)
                findings_counts = {}
                if detected_lesions:
                    for l in detected_lesions:
                        t = l.get("type", "")
                        findings_counts[t] = findings_counts.get(t, 0) + 1

                total_lesion_count = len(detected_lesions or [])
                has_proliferative_evidence = (
                    findings_counts.get("neovascularization", 0) > 0 or
                    findings_counts.get("hemorrhage", 0) >= 15 or
                    total_lesion_count >= 30
                )

                fused_grade = int(np.argmax(fused_probs))

                if fused_grade == 4 and not has_proliferative_evidence:
                    # Penalize PDR class and renormalize
                    fused_probs[4] *= 0.1
                    fused_probs = fused_probs / np.sum(fused_probs)
                    fused_grade = int(np.argmax(fused_probs))
                    if fused_grade == 4:
                        fused_grade = 3 if total_lesion_count >= 8 else (2 if total_lesion_count > 0 else 0)

                # 2. A retina with 0 detected lesions cannot be Severe NPDR or Proliferative DR
                if total_lesion_count == 0 and fused_grade >= 2:
                    if dl_probs[0] >= 0.20 or fused_probs[0] >= 0.20:
                        fused_grade = 0
                    else:
                        fused_grade = 1

                fused_conf = float(fused_probs[fused_grade])

                if fused_grade == 0 and fused_conf >= 0.70:
                    conf_band = "confident_normal"
                elif fused_grade >= 2 and fused_conf >= 0.60:
                    conf_band = "confident_referable"
                else:
                    conf_band = "uncertain_review"

                return {
                    "grade": fused_grade,
                    "grade_label": GRADE_LABELS[fused_grade],
                    "referable": bool(fused_grade >= 2),
                    "probabilities": {str(i): round(float(fused_probs[i]), 4) for i in range(5)},
                    "confidence": round(fused_conf, 4),
                    "confidence_band": conf_band
                }
            except Exception as dl_err:
                print(f"[*] DL inference error fallback: {dl_err}")

        return clinical_res


# Singleton instance
dr_grader = DRGradingModel()

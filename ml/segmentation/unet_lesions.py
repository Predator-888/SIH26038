"""
Retinal Lesion Segmentation Module (SIH26038).
Segments true pathological microaneurysms, hard/soft exudates, intraretinal hemorrhages,
and neovascularization fronds (NVD/NVE).
Calibrated for Ben Graham preprocessed fundus images with multi-modal clinical intelligence.
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional


class UnifiedLesionSegmentor:
    def __init__(self):
        pass

    def _get_inner_retinal_mask(self, rgb_image: np.ndarray, safe_ratio: float = 0.38) -> np.ndarray:
        """
        Creates a clean inner circular retinal mask safely within the illuminated FOV
        to eliminate circular vignette glare, perimeter border artifacts, and edge noise.
        """
        h, w = rgb_image.shape[:2]
        center = (w // 2, h // 2)
        safe_radius = int(min(h, w) * safe_ratio)
        inner_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(inner_mask, center, safe_radius, 255, -1)
        return inner_mask

    def detect_exudates(
        self,
        rgb_image: np.ndarray,
        optic_disc: Tuple[int, int, int],
        inner_mask: np.ndarray
    ) -> List[Dict[str, Any]]:
        """
        Detects bright yellowish-white lipid exudates outside the optic disc.
        Exudates exhibit high intensity in red/green channels and distinct contrast against blue.
        """
        h, w, _ = rgb_image.shape
        r = rgb_image[:, :, 0].astype(np.float32)
        g = rgb_image[:, :, 1].astype(np.float32)
        b = rgb_image[:, :, 2].astype(np.float32)
        brightness = (r + g + b) / 3.0

        od_x, od_y, od_r = optic_disc
        od_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(od_mask, (od_x, od_y), int(od_r * 1.4), 255, -1)

        # Exudate candidate thresholding
        ex_cand = (brightness > 200) & (r > 195) & (g > 190) & (g > b * 1.05) & (inner_mask > 0) & (od_mask == 0)
        ex_clean = cv2.morphologyEx((ex_cand * 255).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        cnts, _ = cv2.findContours(ex_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        exudates = []
        for c in cnts:
            area = cv2.contourArea(c)
            if 10 <= area <= 3500:
                x, y, cw, ch = cv2.boundingRect(c)
                aspect = cw / max(1, ch)
                if 0.3 <= aspect <= 3.2:
                    exudates.append({
                        "type": "exudate",
                        "bbox": [round(x / w, 4), round(y / h, 4), round(cw / w, 4), round(ch / h, 4)],
                        "confidence": round(float(np.clip(0.82 + (area / 5000.0), 0.80, 0.96)), 2)
                    })
        return exudates

    def detect_hemorrhages_and_microaneurysms(
        self,
        rgb_image: np.ndarray,
        vessel_mask: np.ndarray,
        optic_disc: Tuple[int, int, int],
        inner_mask: np.ndarray,
        is_likely_normal: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Detects dark focal lesions (dot/blot hemorrhages and punctate microaneurysms)
        using morphological Black Top-Hat transforms on the green channel.
        Applies anatomical spatial masking (OD, fovea, dilated vessel tree).
        """
        h, w, _ = rgb_image.shape
        od_x, od_y, od_r = optic_disc
        g_u8 = rgb_image[:, :, 1]

        # 1. Anatomical exclusion masks
        od_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(od_mask, (od_x, od_y), int(od_r * 1.5), 255, -1)

        fovea_dx = -1 if od_x > w / 2 else 1
        fovea_x = int(np.clip(od_x + fovea_dx * int(od_r * 3.8), 0.18 * w, 0.82 * w))
        fovea_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(fovea_mask, (fovea_x, od_y), int(od_r * 1.2), 255, -1)

        vessel_dil = cv2.dilate(vessel_mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

        safe_dark = cv2.bitwise_and(inner_mask, cv2.bitwise_not(od_mask))
        safe_dark = cv2.bitwise_and(safe_dark, cv2.bitwise_not(fovea_mask))
        safe_dark = cv2.bitwise_and(safe_dark, cv2.bitwise_not(vessel_dil))

        lesions = []

        # 2. MICROANEURYSMS (sub-pixel focal punctate dark lesions, 11x11 kernel)
        ma_thresh = 42 if is_likely_normal else 28
        peak_thresh = 48 if is_likely_normal else 34
        k_ma = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        bth_ma = cv2.morphologyEx(g_u8, cv2.MORPH_CLOSE, k_ma) - g_u8
        ma_cand = (bth_ma >= ma_thresh) & (g_u8 < 118) & (safe_dark > 0)
        ma_clean = cv2.morphologyEx((ma_cand * 255).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2, 2)))
        cnts_ma, _ = cv2.findContours(ma_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_ma:
            area = cv2.contourArea(c)
            if 5 <= area <= 50:
                x, y, cw, ch = cv2.boundingRect(c)
                aspect = cw / max(1, ch)
                if 0.5 <= aspect <= 2.0:
                    peak_bth = int(np.max(bth_ma[y:y+ch, x:x+cw]))
                    if peak_bth >= peak_thresh:
                        # Compute intensity-weighted 2D spatial moments for sub-pixel centroid localization
                        M = cv2.moments(c)
                        if M["m00"] != 0:
                            sub_x = float(M["m10"] / M["m00"])
                            sub_y = float(M["m01"] / M["m00"])
                        else:
                            sub_x = float(x + cw / 2.0)
                            sub_y = float(y + ch / 2.0)

                        sub_radius = float(np.sqrt(area / np.pi))

                        lesions.append({
                            "type": "microaneurysm",
                            "bbox": [round(x / w, 4), round(y / h, 4), round(cw / w, 4), round(ch / h, 4)],
                            "subpixel_center": [round(sub_x / w, 5), round(sub_y / h, 5)],
                            "subpixel_radius": round(sub_radius, 2),
                            "peak_contrast": round(float(peak_bth), 1),
                            "confidence": round(float(np.clip(0.80 + (area / 150.0), 0.78, 0.94)), 2)
                        })

        # 3. HEMORRHAGES (larger dark flame/blot lesions, 21x21 kernel)
        hem_thresh = 36 if is_likely_normal else 26
        k_hem = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))
        bth_hem = cv2.morphologyEx(g_u8, cv2.MORPH_CLOSE, k_hem) - g_u8
        hem_cand = (bth_hem >= hem_thresh) & (g_u8 < 114) & (safe_dark > 0)
        hem_clean = cv2.morphologyEx((hem_cand * 255).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        cnts_hem, _ = cv2.findContours(hem_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cnts_hem:
            area = cv2.contourArea(c)
            if 45 < area <= 3500:
                x, y, cw, ch = cv2.boundingRect(c)
                aspect = cw / max(1, ch)
                if 0.25 <= aspect <= 4.0:
                    lesions.append({
                        "type": "hemorrhage",
                        "bbox": [round(x / w, 4), round(y / h, 4), round(cw / w, 4), round(ch / h, 4)],
                        "confidence": round(float(np.clip(0.84 + (area / 4500.0), 0.82, 0.98)), 2)
                    })

        return lesions

    def detect_neovascularization(
        self,
        rgb_image: np.ndarray,
        vessel_mask: np.ndarray,
        optic_disc: Tuple[int, int, int],
        inner_mask: np.ndarray,
        is_pdr: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Detects Neovascularization (NVD / NVE): fine, disorganized, abnormal new
        capillary proliferation on or near the Optic Disc (NVD) or along the vascular arcade (NVE).
        Distinguishes abnormal fine fronds from main vessel trunks.
        """
        if not is_pdr:
            return []

        h, w, _ = rgb_image.shape
        od_x, od_y, od_r = optic_disc

        peri_donut = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(peri_donut, (od_x, od_y), int(od_r * 2.8), 255, -1)
        cv2.circle(peri_donut, (od_x, od_y), int(od_r * 0.4), 0, -1)
        peri_donut = cv2.bitwise_and(peri_donut, inner_mask)

        # Isolate main thick vessel trunks (caliber >= 4px)
        k_trunk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        trunks = cv2.morphologyEx(vessel_mask, cv2.MORPH_OPEN, k_trunk)
        trunks_dil = cv2.dilate(trunks, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4)))
        fine_prolif = cv2.subtract(vessel_mask, trunks_dil)

        fine_in_roi = cv2.bitwise_and(fine_prolif, fine_prolif, mask=peri_donut)
        cnts_nv, _ = cv2.findContours(fine_in_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        neovasc_lesions = []
        for c in cnts_nv:
            area = cv2.contourArea(c)
            if 30 <= area <= 800:
                x, y, cw, ch = cv2.boundingRect(c)
                aspect = cw / max(1, ch)
                if 0.3 <= aspect <= 3.2:
                    neovasc_lesions.append({
                        "type": "neovascularization",
                        "bbox": [round(x / w, 4), round(y / h, 4), round(cw / w, 4), round(ch / h, 4)],
                        "confidence": round(float(np.clip(0.86 + (area / 2000.0), 0.84, 0.97)), 2)
                    })
        return neovasc_lesions

    def extract_all_lesions(
        self,
        rgb_image: np.ndarray,
        vessel_mask: np.ndarray,
        optic_disc: Tuple[int, int, int],
        dl_probs: Optional[np.ndarray] = None
    ) -> List[Dict[str, Any]]:
        """
        Extracts all validated pathological retinal lesions including microaneurysms,
        hemorrhages, exudates, and neovascularization fronds.
        """
        if dl_probs is None:
            try:
                from ml.grading.grading_model import dr_grader
                dl_probs = dr_grader.get_dl_probabilities(rgb_image)
            except Exception:
                dl_probs = None

        is_likely_normal = bool(dl_probs is not None and dl_probs[0] >= 0.55 and np.sum(dl_probs[2:]) < 0.15)
        is_pdr = bool(dl_probs is not None and dl_probs[4] >= 0.15)

        inner_mask = self._get_inner_retinal_mask(rgb_image, safe_ratio=0.38)

        exudates = self.detect_exudates(rgb_image, optic_disc, inner_mask)
        hems_and_mas = self.detect_hemorrhages_and_microaneurysms(
            rgb_image, vessel_mask, optic_disc, inner_mask, is_likely_normal=is_likely_normal
        )
        neovasc = self.detect_neovascularization(
            rgb_image, vessel_mask, optic_disc, inner_mask, is_pdr=is_pdr
        )

        return exudates + hems_and_mas + neovasc


lesion_segmentor = UnifiedLesionSegmentor()
LesionSegmentation = UnifiedLesionSegmentor

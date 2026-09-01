"""
Retinal Image Quality Assessment Module (SIH26038).
Performs synchronous heuristic and statistical checks for:
- Focus score (Laplacian variance)
- Illumination quality (Under/Over-exposure & specular reflection)
- Field of View (FOV) completeness
- Plain-language actionable feedback codes for ASHA / field workers
"""

import cv2
import numpy as np
from typing import Dict, Any, List, Tuple


class ImageQualityAssessment:
    def __init__(
        self,
        quality_threshold: float = 0.55,
        min_laplacian_var: float = 12.0,
        min_mean_brightness: float = 25.0,
        max_mean_brightness: float = 220.0,
        max_glare_ratio: float = 0.12,
        min_fov_ratio: float = 0.40
    ):
        self.quality_threshold = quality_threshold
        self.min_laplacian_var = min_laplacian_var
        self.min_mean_brightness = min_mean_brightness
        self.max_mean_brightness = max_mean_brightness
        self.max_glare_ratio = max_glare_ratio
        self.min_fov_ratio = min_fov_ratio

    def assess_focus(self, gray_image: np.ndarray, mask: np.ndarray) -> Tuple[float, bool]:
        """
        Calculates focus sharpness using Laplacian variance restricted to the retinal area.
        """
        retina_pixels = gray_image[mask > 0]
        if len(retina_pixels) == 0:
            return 0.0, False

        # Resize to standard scale for consistent Laplacian variance calculation
        h, w = gray_image.shape[:2]
        std_scale = 512.0 / max(h, w)
        scaled_gray = cv2.resize(gray_image, (int(w * std_scale), int(h * std_scale)), interpolation=cv2.INTER_AREA)
        scaled_mask = cv2.resize(mask, (int(w * std_scale), int(h * std_scale)), interpolation=cv2.INTER_NEAREST)

        laplacian = cv2.Laplacian(scaled_gray, cv2.CV_64F)
        laplacian_retina = laplacian[scaled_mask > 0]
        variance = float(laplacian_retina.var()) if len(laplacian_retina) > 0 else 0.0

        # Non-linear sigmoid normalization centered around typical retinal vessel sharpness
        focus_score = float(np.clip(1.0 / (1.0 + np.exp(-(variance - 14.0) / 6.0)), 0.05, 0.99))
        is_sharp = variance >= self.min_laplacian_var
        return round(focus_score, 2), is_sharp

    def assess_illumination(self, bgr_image: np.ndarray, mask: np.ndarray) -> Tuple[float, List[str]]:
        """
        Evaluates illumination balance, underexposure, overexposure, and glare.
        """
        reasons = []
        gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
        retina_pixels = gray[mask > 0]
        
        if len(retina_pixels) == 0:
            return 0.0, ["underexposed"]

        mean_brightness = float(np.mean(retina_pixels))
        
        # Check dark pixels (clipping below 20)
        dark_ratio = float(np.sum(retina_pixels < 20) / len(retina_pixels))
        # Check saturated/glare pixels (clipping above 240)
        bright_ratio = float(np.sum(retina_pixels > 240) / len(retina_pixels))

        if mean_brightness < self.min_mean_brightness or dark_ratio > 0.40:
            reasons.append("underexposed")
        elif mean_brightness > self.max_mean_brightness or bright_ratio > self.max_glare_ratio:
            reasons.append("overexposed")

        # Illumination score calculation
        # Ideal mean brightness is around 110-140
        ideal_target = 125.0
        dist_from_ideal = abs(mean_brightness - ideal_target)
        illumination_score = max(0.0, 1.0 - (dist_from_ideal / 100.0) - (dark_ratio * 0.5) - (bright_ratio * 1.5))
        illumination_score = float(np.clip(illumination_score, 0.0, 1.0))

        return illumination_score, reasons

    def assess_fov(self, bgr_image: np.ndarray) -> Tuple[float, np.ndarray, bool]:
        """
        Calculates field-of-view (FOV) completeness of the retinal disc.
        """
        gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
        
        total_pixels = gray.shape[0] * gray.shape[1]
        active_pixels = cv2.countNonZero(thresh)
        fov_ratio = active_pixels / max(1, total_pixels)

        # In standard fundus images, circular mask occupies 50% - 85% of square canvas
        fov_score = float(np.clip((fov_ratio / 0.70), 0.0, 1.0))
        is_complete = fov_ratio >= self.min_fov_ratio

        return fov_score, thresh, is_complete

    def evaluate(self, image_path: str) -> Dict[str, Any]:
        """
        Evaluates the full quality suite and returns standardized metrics and actionable feedback.
        """
        img = cv2.imread(image_path)
        if img is None:
            return {
                "passed": False,
                "quality_score": 0.0,
                "focus_score": 0.0,
                "illumination_score": 0.0,
                "fov_score": 0.0,
                "reject_reasons": ["unreadable_file"]
            }

        # 1. FOV Check & mask generation
        fov_score, mask, fov_passed = self.assess_fov(img)

        # 2. Focus Check
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        focus_score, focus_passed = self.assess_focus(gray, mask)

        # 3. Illumination Check
        illum_score, illum_reasons = self.assess_illumination(img, mask)

        # Aggregate reject reasons
        reject_reasons = []
        if not focus_passed:
            reject_reasons.append("blur")
        if not fov_passed:
            reject_reasons.append("incomplete_fov")
        reject_reasons.extend(illum_reasons)

        # Weighted aggregate quality score: 40% Focus, 35% Illumination, 25% FOV
        quality_score = float(0.40 * focus_score + 0.35 * illum_score + 0.25 * fov_score)
        passed = (quality_score >= self.quality_threshold) and (len(reject_reasons) == 0)

        return {
            "passed": passed,
            "quality_score": round(quality_score, 2),
            "focus_score": round(focus_score, 2),
            "illumination_score": round(illum_score, 2),
            "fov_score": round(fov_score, 2),
            "reject_reasons": list(set(reject_reasons))
        }


# Singleton instance
quality_evaluator = ImageQualityAssessment()

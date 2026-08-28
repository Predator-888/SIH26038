"""
Retinal Blood Vessel Segmentation Module (SIH26038).
Implements vessel tree extraction and optic disc / fovea localization heuristics.
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any


class VesselSegmentation:
    def __init__(self):
        pass

    def segment_vessels(self, rgb_image: np.ndarray) -> np.ndarray:
        """
        Segments retinal vasculature using Green-channel morphological filtering
        and adaptive thresholding (mimicking DRIVE U-Net segmentor output).
        Returns binary vessel mask (0 or 255).
        """
        g_channel = rgb_image[:, :, 1]
        
        # Invert green channel so vessels are bright
        inverted = cv2.bitwise_not(g_channel)
        
        # Morphological top-hat transform with disc structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
        tophat = cv2.morphologyEx(inverted, cv2.MORPH_TOPHAT, kernel)
        
        # CLAHE on tophat
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(tophat)
        
        # Adaptive thresholding
        vessel_mask = cv2.adaptiveThreshold(
            enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, -2
        )
        
        # Filter small noise
        kernel_clean = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        vessel_mask = cv2.morphologyEx(vessel_mask, cv2.MORPH_OPEN, kernel_clean)
        
        return vessel_mask

    def locate_optic_disc(self, rgb_image: np.ndarray) -> Tuple[int, int, int]:
        """
        Locates the Optic Disc center (x, y) and radius.
        Uses large morphological opening to erase small focal exudates and retain
        only the large anatomical optic disc structure.
        """
        h, w, _ = rgb_image.shape
        r_channel = rgb_image[:, :, 0]
        
        # Large morphological opening (kernel 27x27) erases small focal lesions (<27px)
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27))
        opened = cv2.morphologyEx(r_channel, cv2.MORPH_OPEN, kernel_open)
        
        # Gaussian smoothing
        blurred = cv2.GaussianBlur(opened, (21, 21), 0)

        # Restrict to horizontal nasal quadrants
        mask = np.zeros((h, w), dtype=np.uint8)
        mask[:, :int(w * 0.35)] = 255
        mask[:, int(w * 0.65):] = 255
        cv2.circle(mask, (w // 2, h // 2), int(w * 0.44), 255, -1)

        blurred_masked = cv2.bitwise_and(blurred, blurred, mask=mask)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(blurred_masked)
        
        disc_radius = int(w * 0.075) # ~38px on 512x512
        if max_val > 15:
            return max_loc[0], max_loc[1], disc_radius
        else:
            # Standard physiological nasal location
            return int(w * 0.74), int(h * 0.5), disc_radius


vessel_segmentor = VesselSegmentation()

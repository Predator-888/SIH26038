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
        Segments retinal vasculature using Green-channel morphological Top-Hat filtering,
        CLAHE contrast amplification, and size-filtered thresholding.
        Returns binary vessel mask (0 or 255).
        """
        g_channel = rgb_image[:, :, 1]
        inverted = cv2.bitwise_not(g_channel)
        
        # Morphological top-hat transform with disc structuring element
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
        tophat = cv2.morphologyEx(inverted, cv2.MORPH_TOPHAT, kernel)
        
        # CLAHE on tophat
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(tophat)
        
        # Binary thresholding followed by connected-component size cleaning
        _, binary = cv2.threshold(enhanced, 42, 255, cv2.THRESH_BINARY)
        cnts, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        clean = np.zeros_like(binary)
        for c in cnts:
            if cv2.contourArea(c) >= 15:
                cv2.drawContours(clean, [c], -1, 255, -1)
        
        # Closing to connect slight vessel lumen gaps
        vessel_mask = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
        return vessel_mask

    def locate_optic_disc(self, rgb_image: np.ndarray) -> Tuple[int, int, int]:
        """
        Locates the Optic Disc center (x, y) and radius.
        Uses large morphological opening to erase small focal exudates and retain
        only the large anatomical optic disc structure, constrained by intersecting
        nasal zone and safe retinal boundary masks.
        """
        h, w, _ = rgb_image.shape
        r_channel = rgb_image[:, :, 0]
        
        # Large morphological opening (kernel 29x29) erases small focal lesions (<29px)
        kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (29, 29))
        opened = cv2.morphologyEx(r_channel, cv2.MORPH_OPEN, kernel_open)
        
        # Gaussian smoothing
        blurred = cv2.GaussianBlur(opened, (21, 21), 0)

        # Restrict to horizontal nasal quadrants strictly within the circular retinal FOV
        circle_mask = np.zeros((h, w), dtype=np.uint8)
        cv2.circle(circle_mask, (w // 2, h // 2), int(w * 0.38), 255, -1)
        nasal_mask = np.zeros((h, w), dtype=np.uint8)
        nasal_mask[:, :int(w * 0.38)] = 255
        nasal_mask[:, int(w * 0.62):] = 255
        mask = cv2.bitwise_and(nasal_mask, circle_mask)

        blurred_masked = cv2.bitwise_and(blurred, blurred, mask=mask)
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(blurred_masked)
        
        disc_radius = int(w * 0.08) # ~40px on 512x512
        if max_val > 15:
            return max_loc[0], max_loc[1], disc_radius
        else:
            # Standard physiological nasal location
            return int(w * 0.74), int(h * 0.5), disc_radius


vessel_segmentor = VesselSegmentation()

"""
Retinal Image Preprocessing Module for Diabetic Retinopathy Screening (SIH26038).
Implements:
1. Ben Graham Preprocessing (Local average color subtraction + Circular FOV crop)
2. Green-Channel CLAHE for micro-lesion enhancement
3. Resolution normalization (512x512 standard)
"""

import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional


def load_image(image_path: str) -> np.ndarray:
    """Load image from path in BGR format."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Could not load image at {image_path}")
    return img


def crop_to_circle_mask(image: np.ndarray, tol: int = 7) -> Tuple[np.ndarray, np.ndarray]:
    """
    Crops image to the circular retinal boundary and returns image and mask.
    """
    if image.ndim == 2:
        mask = image > tol
        return image[np.ix_(mask.any(1), mask.any(0))], mask
    elif image.ndim == 3:
        gray_img = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        mask = gray_img > tol
        
        check_shape = image[:, :, 0][np.ix_(mask.any(1), mask.any(0))].shape[0]
        if check_shape == 0:  # Image is too dark
            return image, mask
        else:
            img1 = image[:, :, 0][np.ix_(mask.any(1), mask.any(0))]
            img2 = image[:, :, 1][np.ix_(mask.any(1), mask.any(0))]
            img3 = image[:, :, 2][np.ix_(mask.any(1), mask.any(0))]
            cropped = np.stack([img1, img2, img3], axis=-1)
            return cropped, mask
    return image, np.ones(image.shape[:2], dtype=bool)


def apply_ben_graham_preprocessing(
    image: np.ndarray,
    target_size: int = 512,
    sigma_ratio: float = 30.0
) -> np.ndarray:
    """
    Applies the Ben Graham preprocessing pipeline (Kaggle DR competition gold standard):
    1. Rescale to target size
    2. Subtract local average color using Gaussian blur
    3. Apply circular vignette mask to remove outer boundary artifacts
    """
    # 1. Resize image to target square
    resized = cv2.resize(image, (target_size, target_size), interpolation=cv2.INTER_AREA)
    
    # 2. Subtract local Gaussian smoothed background
    sigma = target_size / sigma_ratio
    blurred = cv2.GaussianBlur(resized, (0, 0), sigma)
    enhanced = cv2.addWeighted(resized, 4.0, blurred, -4.0, 128)
    
    # 3. Create circular vignette mask
    mask = np.zeros((target_size, target_size), dtype=np.uint8)
    center = (target_size // 2, target_size // 2)
    radius = int(target_size * 0.48)  # 96% diameter
    cv2.circle(mask, center, radius, 255, -1)
    
    # Smooth border mask
    mask_blur = cv2.GaussianBlur(mask, (15, 15), 5)
    mask_normalized = mask_blur.astype(np.float32) / 255.0
    mask_3ch = np.repeat(mask_normalized[:, :, np.newaxis], 3, axis=2)
    
    # Blend with neutral background
    processed = (enhanced.astype(np.float32) * mask_3ch + 128.0 * (1.0 - mask_3ch)).astype(np.uint8)
    return processed


def apply_green_channel_clahe(image: np.ndarray, clip_limit: float = 2.5, tile_grid: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Applies CLAHE on the green channel where retinal lesions exhibit maximum contrast.
    """
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
    
    # Split BGR channels
    b, g, r = cv2.split(image)
    g_enhanced = clahe.apply(g)
    
    merged = cv2.merge((b, g_enhanced, r))
    return merged


def preprocess_fundus_pipeline(image_path: str, target_size: int = 512) -> Tuple[np.ndarray, np.ndarray]:
    """
    Full preprocessing execution:
    Returns (ben_graham_enhanced_rgb, clahe_enhanced_rgb)
    """
    raw_bgr = load_image(image_path)
    cropped_bgr, _ = crop_to_circle_mask(raw_bgr)
    
    ben_graham_bgr = apply_ben_graham_preprocessing(cropped_bgr, target_size=target_size)
    clahe_bgr = apply_green_channel_clahe(ben_graham_bgr)
    
    # Convert BGR to RGB for standard ML models & display
    ben_graham_rgb = cv2.cvtColor(ben_graham_bgr, cv2.COLOR_BGR2RGB)
    clahe_rgb = cv2.cvtColor(clahe_bgr, cv2.COLOR_BGR2RGB)
    
    return ben_graham_rgb, clahe_rgb

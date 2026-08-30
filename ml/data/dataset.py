"""
PyTorch Dataset and DataLoader for Diabetic Retinopathy Fundus Images (SIH26038).
Supports:
1. CSV-based datasets (e.g. APTOS, EyePACS, custom SIH CSV with image_id/path and diagnosis/label)
2. Directory-based datasets (folders 0/, 1/, 2/, 3/, 4/ or class subdirectories)
3. Automated Ben Graham preprocessing and data augmentations.
"""

import os
import cv2
import numpy as np
import pandas as pd
from typing import Optional, Callable, Tuple, List

try:
    import torch
    from torch.utils.data import Dataset
    from torchvision import transforms
except ImportError:
    torch = None
    Dataset = object
    transforms = None

from ml.data.preprocess import preprocess_fundus_pipeline, apply_ben_graham_preprocessing, crop_to_circle_mask


class DRFundusDataset(Dataset):
    def __init__(
        self,
        image_paths: List[str],
        labels: Optional[List[int]] = None,
        target_size: int = 512,
        is_training: bool = False,
        transform: Optional[Callable] = None
    ):
        self.image_paths = image_paths
        self.labels = labels
        self.target_size = target_size
        self.is_training = is_training
        self.transform = transform

    def __len__(self) -> int:
        return len(self.image_paths)

    def __getitem__(self, idx: int):
        img_path = self.image_paths[idx]
        
        # 1. Load image
        raw_bgr = cv2.imread(img_path)
        if raw_bgr is None:
            raise FileNotFoundError(f"Image not found at path: {img_path}")
        
        # 2. Crop circular mask & apply Ben Graham preprocessing
        cropped_bgr, _ = crop_to_circle_mask(raw_bgr)
        processed_bgr = apply_ben_graham_preprocessing(cropped_bgr, target_size=self.target_size)
        rgb_img = cv2.cvtColor(processed_bgr, cv2.COLOR_BGR2RGB)

        # 3. Apply standard PyTorch normalization (ImageNet stats)
        # Normalize to [0, 1]
        img_tensor = rgb_img.astype(np.float32) / 255.0

        # Augmentation during training if no external transform provided
        if self.is_training and self.transform is None:
            # Horizontal flip
            if np.random.rand() > 0.5:
                img_tensor = np.fliplr(img_tensor).copy()
            # Vertical flip
            if np.random.rand() > 0.5:
                img_tensor = np.flipud(img_tensor).copy()
            # Random 90 deg rotation
            k = np.random.choice([0, 1, 2, 3])
            if k > 0:
                img_tensor = np.rot90(img_tensor, k).copy()

        # Transpose from (H, W, C) to (C, H, W)
        img_tensor = np.transpose(img_tensor, (2, 0, 1))

        # Standard ImageNet mean and std
        mean = np.array([0.485, 0.456, 0.406]).reshape(3, 1, 1).astype(np.float32)
        std = np.array([0.229, 0.224, 0.225]).reshape(3, 1, 1).astype(np.float32)
        img_tensor = (img_tensor - mean) / std

        if torch is not None:
            img_tensor = torch.tensor(img_tensor, dtype=torch.float32)

        if self.labels is not None:
            label = self.labels[idx]
            if torch is not None:
                label = torch.tensor(label, dtype=torch.long)
            return img_tensor, label
        
        return img_tensor, img_path


def load_dataset_from_csv(
    csv_path: str,
    images_dir: str,
    id_col: str = "image_id",
    label_col: str = "diagnosis",
    ext: str = ".png"
) -> Tuple[List[str], List[int]]:
    """
    Parses a CSV file and pairs it with fundus image files.
    """
    df = pd.read_csv(csv_path)
    
    # Auto-detect column names if not exact match
    cols_lower = {col.lower(): col for col in df.columns}
    
    id_key = cols_lower.get(id_col.lower(), cols_lower.get("id_code", cols_lower.get("image", cols_lower.get("filename", df.columns[0]))))
    label_key = cols_lower.get(label_col.lower(), cols_lower.get("label", cols_lower.get("grade", cols_lower.get("dr_grade", df.columns[1]))))

    image_paths = []
    labels = []

    for _, row in df.iterrows():
        name = str(row[id_key]).strip()
        if not (name.endswith(".png") or name.endswith(".jpg") or name.endswith(".jpeg")):
            name = f"{name}{ext}"
        
        # Candidate search paths (root, train_images, images, test_images)
        candidate_dirs = [
            images_dir,
            os.path.join(images_dir, "train_images"),
            os.path.join(images_dir, "images"),
            os.path.join(images_dir, "test_images")
        ]
        
        full_path = None
        for cdir in candidate_dirs:
            p = os.path.join(cdir, name)
            if os.path.exists(p):
                full_path = p
                break
            # Try alternate .jpg / .png extension
            alt_ext = ".jpg" if name.endswith(".png") else ".png"
            p_alt = os.path.join(cdir, f"{os.path.splitext(name)[0]}{alt_ext}")
            if os.path.exists(p_alt):
                full_path = p_alt
                break

        if full_path and os.path.exists(full_path):
            image_paths.append(full_path)
            labels.append(int(row[label_key]))

    print(f"Loaded {len(image_paths)} valid samples from {csv_path}")
    return image_paths, labels


def load_dataset_from_folders(root_dir: str) -> Tuple[List[str], List[int]]:
    """
    Loads dataset where subfolders represent grades (0, 1, 2, 3, 4).
    """
    image_paths = []
    labels = []
    
    folder_mapping = {
        "0": 0, "no_dr": 0, "normal": 0,
        "1": 1, "mild": 1, "mild_npdr": 1,
        "2": 2, "moderate": 2, "moderate_npdr": 2,
        "3": 3, "severe": 3, "severe_npdr": 3,
        "4": 4, "pdr": 4, "proliferative": 4, "proliferative_dr": 4
    }

    for folder_name in os.listdir(root_dir):
        folder_path = os.path.join(root_dir, folder_name)
        if os.path.isdir(folder_path):
            grade = folder_mapping.get(folder_name.lower().strip())
            if grade is not None:
                for file_name in os.listdir(folder_path):
                    if file_name.lower().endswith((".png", ".jpg", ".jpeg")):
                        image_paths.append(os.path.join(folder_path, file_name))
                        labels.append(grade)

    print(f"Loaded {len(image_paths)} samples across {len(set(labels))} classes from {root_dir}")
    return image_paths, labels

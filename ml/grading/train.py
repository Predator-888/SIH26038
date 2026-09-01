"""
Complete Training Pipeline for 5-Class Diabetic Retinopathy Severity Grading (SIH26038).
Includes:
- Stratified Train/Val Split
- Class Imbalance Handling
- Quadratic Weighted Kappa (QWK) & Referable DR Sensitivity/Specificity tracking
- Checkpoint Export for Production Backend API
"""

import os
import sys

# Ensure repository root is on sys.path when script is executed directly
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import argparse
import time
import json
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import cohen_kappa_score, confusion_matrix, classification_report

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader
except ImportError:
    print("Error: PyTorch is required for training. Install torch and torchvision.")
    sys.exit(1)

from ml.data.dataset import DRFundusDataset, load_dataset_from_csv, load_dataset_from_folders
from ml.grading.model_architecture import get_dr_model


def calculate_metrics(y_true, y_pred, y_probs=None):
    """
    Computes QWK, Accuracy, and Clinical Sensitivity/Specificity for Referable DR (Level 2+).
    """
    qwk = cohen_kappa_score(y_true, y_pred, weights='quadratic')
    acc = np.mean(np.array(y_true) == np.array(y_pred))
    
    # Binary metrics for Referable DR (Grade >= 2)
    binary_true = (np.array(y_true) >= 2).astype(int)
    binary_pred = (np.array(y_pred) >= 2).astype(int)

    tn, fp, fn, tp = confusion_matrix(binary_true, binary_pred, labels=[0, 1]).ravel()
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "qwk": round(float(qwk), 4),
        "accuracy": round(float(acc), 4),
        "referable_sensitivity": round(float(sensitivity), 4),
        "referable_specificity": round(float(specificity), 4),
        "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn)
    }


def train_one_epoch(model, loader, criterion, optimizer, scaler, device):
    model.train()
    running_loss = 0.0
    all_preds = []
    all_targets = []
    use_amp = device.type == "cuda"

    for images, targets in loader:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)

        optimizer.zero_grad()
        
        if use_amp:
            with torch.amp.autocast('cuda'):
                outputs = model(images)
                loss = criterion(outputs, targets)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            outputs = model(images)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()

        running_loss += loss.item() * images.size(0)
        preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.cpu().numpy())

    epoch_loss = running_loss / len(loader.dataset)
    metrics = calculate_metrics(all_targets, all_preds)
    metrics["loss"] = round(epoch_loss, 4)
    return metrics


def validate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []
    use_amp = device.type == "cuda"

    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)

            if use_amp:
                with torch.amp.autocast('cuda'):
                    outputs = model(images)
                    loss = criterion(outputs, targets)
            else:
                outputs = model(images)
                loss = criterion(outputs, targets)

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1).detach().cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())

    epoch_loss = running_loss / len(loader.dataset)
    metrics = calculate_metrics(all_targets, all_preds)
    metrics["loss"] = round(epoch_loss, 4)
    return metrics, all_targets, all_preds


def main():
    parser = argparse.ArgumentParser(description="SIH26038 DR Model Training Pipeline")
    parser.add_argument("--csv_path", type=str, default=None, help="Path to labels CSV file")
    parser.add_argument("--images_dir", type=str, default=None, help="Path to images directory")
    parser.add_argument("--folder_dir", type=str, default=None, help="Path to folder organized dataset (0/, 1/, 2/, 3/, 4/)")
    parser.add_argument("--output_dir", type=str, default="./ml/checkpoints", help="Directory to save checkpoints")
    parser.add_argument("--backbone", type=str, default="efficientnet_b3", choices=["efficientnet_b3", "resnet50"])
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--val_split", type=float, default=0.20)
    parser.add_argument("--seed", type=int, default=42)

    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    # 1. Load Dataset
    print("\n--- [SIH26038] Loading Diabetic Retinopathy Dataset ---")
    if args.csv_path and args.images_dir:
        image_paths, labels = load_dataset_from_csv(args.csv_path, args.images_dir)
    elif args.folder_dir:
        image_paths, labels = load_dataset_from_folders(args.folder_dir)
    else:
        print("Error: Provide either (--csv_path and --images_dir) OR (--folder_dir).")
        sys.exit(1)

    if len(image_paths) == 0:
        print("Error: No images found. Please verify data directory path.")
        sys.exit(1)

    # 2. Stratified Train / Validation Split
    train_paths, val_paths, train_labels, val_labels = train_test_split(
        image_paths, labels, test_size=args.val_split, random_state=args.seed, stratify=labels
    )

    print(f"Total samples: {len(image_paths)} | Train: {len(train_paths)} | Val: {len(val_paths)}")
    print("Class distribution in Train:", {i: train_labels.count(i) for i in range(5)})

    # Detect compute device
    device = torch.device("cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu"))
    print(f"Training on device: {device}")
    if device.type == "cuda":
        print(f"  • GPU Model: {torch.cuda.get_device_name(0)}")
        print(f"  • Total VRAM: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
        torch.backends.cudnn.benchmark = True

    train_dataset = DRFundusDataset(train_paths, train_labels, is_training=True)
    val_dataset = DRFundusDataset(val_paths, val_labels, is_training=False)

    train_loader = DataLoader(
        train_dataset, 
        batch_size=args.batch_size, 
        shuffle=True, 
        num_workers=2, 
        pin_memory=(device.type == "cuda")
    )
    val_loader = DataLoader(
        val_dataset, 
        batch_size=args.batch_size, 
        shuffle=False, 
        num_workers=2, 
        pin_memory=(device.type == "cuda")
    )

    # 3. Model, Loss, Optimizer
    model = get_dr_model(args.backbone, num_classes=5, pretrained=True).to(device)

    # Class weights for Cross-Entropy to handle class imbalance
    class_counts = np.bincount(train_labels, minlength=5)
    class_weights = 1.0 / (class_counts + 1e-5)
    class_weights = class_weights / class_weights.sum() * 5.0
    weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)

    criterion = nn.CrossEntropyLoss(weight=weights_tensor)
    optimizer = optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-3)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
    scaler = torch.amp.GradScaler('cuda', enabled=(device.type == 'cuda'))

    # 4. Training Loop
    best_qwk = -1.0
    best_checkpoint_path = os.path.join(args.output_dir, f"grading_{args.backbone}.pt")

    print("\n--- Starting Training ---")
    for epoch in range(1, args.epochs + 1):
        start_t = time.time()
        train_res = train_one_epoch(model, train_loader, criterion, optimizer, scaler, device)
        val_res, val_true, val_pred = validate(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - start_t

        print(
            f"Epoch [{epoch}/{args.epochs}] ({elapsed:.1f}s) | "
            f"Train Loss: {train_res['loss']:.4f} Acc: {train_res['accuracy']:.3f} QWK: {train_res['qwk']:.3f} | "
            f"Val Loss: {val_res['loss']:.4f} Acc: {val_res['accuracy']:.3f} QWK: {val_res['qwk']:.3f} | "
            f"Ref Sens: {val_res['referable_sensitivity']*100:.1f}% Spec: {val_res['referable_specificity']*100:.1f}%"
        )

        # Save best model based on Quadratic Weighted Kappa (QWK)
        if val_res["qwk"] > best_qwk:
            best_qwk = val_res["qwk"]
            torch.save({
                "epoch": epoch,
                "backbone": args.backbone,
                "model_state_dict": model.state_dict(),
                "val_metrics": val_res,
                "best_qwk": best_qwk
            }, best_checkpoint_path)
            print(f"  >>> ⭐ New best checkpoint saved to: {best_checkpoint_path} (QWK: {best_qwk:.4f})")

    print(f"\nTraining Complete! Best QWK: {best_qwk:.4f}")
    print(f"Checkpoint saved for backend API: {best_checkpoint_path}")


if __name__ == "__main__":
    main()

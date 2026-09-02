"""
Comprehensive Model Accuracy & Clinical Validation Evaluation Suite (SIH26038).
Evaluates models against clinical benchmarks:
1. Quadratic Weighted Kappa (QWK) — Ordinal Penalty Metric
2. Referable DR Sensitivity (Grade >= 2) — Target: >= 95%
3. Referable DR Specificity (Grade >= 2) — Target: >= 90%
4. Multi-class Confusion Matrix & F1-Scores (ICDR 0 to 4)
5. Expected Calibration Error (ECE)
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
from sklearn.metrics import (
    cohen_kappa_score,
    confusion_matrix,
    classification_report,
    accuracy_score
)

# Insert project root into path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ml.grading.grading_model import dr_grader, GRADE_LABELS


def calculate_clinical_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_probs: np.ndarray = None) -> dict:
    """
    Computes all standard FDA and clinical validation metrics for DR screening.
    """
    # 1. Multi-class metrics
    accuracy = accuracy_score(y_true, y_pred)
    qwk = cohen_kappa_score(y_true, y_pred, weights="quadratic")
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3, 4])

    # 2. Binary Referable DR metrics (Grade >= 2: Moderate, Severe, Proliferative)
    b_true = (y_true >= 2).astype(int)
    b_pred = (y_pred >= 2).astype(int)

    tn, fp, fn, tp = confusion_matrix(b_true, b_pred, labels=[0, 1]).ravel()
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    ppv = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    npv = tn / (tn + fn) if (tn + fn) > 0 else 0.0

    # 3. Expected Calibration Error (ECE)
    ece = 0.0
    if y_probs is not None:
        confidences = np.max(y_probs, axis=1)
        accuracies = y_pred == y_true
        bin_boundaries = np.linspace(0, 1, 11)
        for i in range(10):
            in_bin = (confidences > bin_boundaries[i]) & (confidences <= bin_boundaries[i + 1])
            prop = np.mean(in_bin)
            if prop > 0:
                acc_in_bin = np.mean(accuracies[in_bin])
                conf_in_bin = np.mean(confidences[in_bin])
                ece += np.abs(conf_in_bin - acc_in_bin) * prop

    return {
        "accuracy": round(float(accuracy), 4),
        "qwk": round(float(qwk), 4),
        "referable_sensitivity": round(float(sensitivity), 4),
        "referable_specificity": round(float(specificity), 4),
        "ppv": round(float(ppv), 4),
        "npv": round(float(npv), 4),
        "ece": round(float(ece), 4),
        "confusion_matrix": cm
    }


def print_evaluation_report(metrics: dict, y_true: np.ndarray, y_pred: np.ndarray, dataset_name: str = "Test Set"):
    """
    Renders an audit table for judges and clinical evaluation.
    """
    print("\n" + "=" * 70)
    print(f"        NETRAAI CLINICAL ACCURACY AUDIT REPORT — {dataset_name.upper()}")
    print("=" * 70)
    
    print("\n1. PRIMARY CLINICAL BENCHMARKS:")
    print(f"   • Quadratic Weighted Kappa (QWK): {metrics['qwk']:.4f}  (Gold Standard: > 0.85)")
    print(f"   • Referable DR Sensitivity:       {metrics['referable_sensitivity']*100:.2f}% (Target: >= 95.0%)")
    print(f"   • Referable DR Specificity:       {metrics['referable_specificity']*100:.2f}% (Target: >= 90.0%)")
    print(f"   • Positive Predictive Value (PPV):{metrics['ppv']*100:.2f}%")
    print(f"   • Negative Predictive Value (NPV):{metrics['npv']*100:.2f}%")
    print(f"   • Expected Calibration Error:     {metrics['ece']:.4f}")
    print(f"   • Overall Exact Accuracy:         {metrics['accuracy']*100:.2f}%")

    print("\n2. CONFUSION MATRIX (Rows: Actual Ground Truth, Columns: AI Predicted):")
    cm = metrics["confusion_matrix"]
    headers = ["Grade 0", "Grade 1", "Grade 2", "Grade 3", "Grade 4"]
    print(f"   {'Actual \\ Pred':<16} | " + " | ".join(f"{h:<8}" for h in headers))
    print("   " + "-" * 62)
    for i, row in enumerate(cm):
        row_str = " | ".join(f"{val:<8}" for val in row)
        print(f"   Grade {i} ({GRADE_LABELS[i][:8]:<8}) | {row_str}")

    print("\n3. PER-CLASS CLINICAL PERFORMANCE:")
    report_dict = classification_report(
        y_true, 
        y_pred, 
        labels=[0, 1, 2, 3, 4], 
        target_names=[f"Grade {i} ({GRADE_LABELS[i]})" for i in range(5)],
        output_dict=True,
        zero_division=0
    )
    print(f"   {'Class Label':<35} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10}")
    print("   " + "-" * 70)
    for i in range(5):
        key = f"Grade {i} ({GRADE_LABELS[i]})"
        p = report_dict[key]["precision"] * 100
        r = report_dict[key]["recall"] * 100
        f = report_dict[key]["f1-score"] * 100
        print(f"   {key:<35} | {p:>8.1f}% | {r:>8.1f}% | {f:>8.1f}%")
    print("=" * 70)


def evaluate_dataset(csv_path: str, images_dir: str, name: str = "IDRiD Test Set"):
    """
    Evaluates the model over an entire test dataset CSV.
    """
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found at: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    # Find label column
    label_col = None
    for c in ["Retinopathy grade", "diagnosis", "adjudicated_dr_grade", "grade", "label"]:
        if c in df.columns:
            label_col = c
            break
    
    # Find image name column
    img_col = None
    for c in ["Image name", "id_code", "image_id", "image"]:
        if c in df.columns:
            img_col = c
            break

    if not label_col or not img_col:
        print(f"Error: Could not identify image/label columns in {df.columns.tolist()}")
        return

    print(f"\nEvaluating {len(df)} images from {name}...")
    y_true = []
    y_pred = []
    y_probs = []

    for _, row in df.iterrows():
        img_id = str(row[img_col]).strip()
        true_label = int(row[label_col])

        # Check for image file (.jpg, .png, .tif)
        img_path = None
        for ext in [".jpg", ".png", ".tif", ".jpeg"]:
            cand = os.path.join(images_dir, f"{img_id}{ext}")
            if os.path.exists(cand):
                img_path = cand
                break

        if img_path is None:
            print(f"Warning: Image not found for ID {img_id}")
            continue

        from ml.data.preprocess import preprocess_fundus_pipeline
        ben_graham_rgb, _ = preprocess_fundus_pipeline(img_path, target_size=512)
        res = dr_grader.predict(ben_graham_rgb)
        pred = res["grade"]
        prob_dist = np.array([float(res["probabilities"][str(i)]) for i in range(5)])

        y_true.append(true_label)
        y_pred.append(pred)
        y_probs.append(prob_dist)

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    y_probs = np.array(y_probs)

    metrics = calculate_clinical_metrics(y_true, y_pred, y_probs)
    print_evaluation_report(metrics, y_true, y_pred, dataset_name=name)
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate NetraAI DR Grading Accuracy")
    parser.add_argument(
        "--csv_path",
        type=str,
        default="Datasests/IDRID(IEEE)/B. Disease Grading/2. Groundtruths/b. IDRiD_Disease Grading_Testing Labels.csv",
        help="Path to test CSV"
    )
    parser.add_argument(
        "--images_dir",
        type=str,
        default="Datasests/IDRID(IEEE)/B. Disease Grading/1. Original Images/b. Testing Set",
        help="Path to test images directory"
    )
    parser.add_argument("--name", type=str, default="IEEE IDRiD Held-Out Test Set")
    args = parser.parse_args()

    evaluate_dataset(args.csv_path, args.images_dir, args.name)

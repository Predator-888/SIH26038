"""
PyTorch to ONNX Model Exporter for MATLAB Deep Learning Toolbox (SIH26038).
Exports the trained EfficientNet-B3 DR grading model to ONNX format,
allowing direct import into MATLAB via `importNetworkFromONNX`.
"""

import os
import sys

# Ensure project root is in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

OUTPUT_ONNX_PATH = os.path.join(project_root, "ml", "checkpoints", "idrid_grading_model.onnx")
WEIGHTS_PATH = os.path.join(project_root, "ml", "checkpoints", "idrid_grading_efficientnet_b3.pt")


def export_to_onnx():
    try:
        import torch
        from ml.grading.model_architecture import DREfficientNetB3
    except ImportError as e:
        print(f"PyTorch not available in current environment: {e}")
        print("To export ONNX model, run inside PyTorch environment (e.g. Google Colab / GPU workstation):")
        print("  python ml/grading/export_onnx.py")
        return False

    print(f"Loading weights from: {WEIGHTS_PATH}")
    model = DREfficientNetB3(num_classes=5, pretrained=False)

    if os.path.exists(WEIGHTS_PATH):
        try:
            state_dict = torch.load(WEIGHTS_PATH, map_location="cpu")
            model.load_state_dict(state_dict, strict=False)
            print("Successfully loaded model weights.")
        except Exception as e:
            print(f"Note: Error loading state dict ({e}). Exporting base architecture.")
    else:
        print(f"Weights file not found at {WEIGHTS_PATH}. Exporting initialized architecture.")

    model.eval()

    # Standard fundus input tensor: batch_size=1, channels=3, height=512, width=512
    dummy_input = torch.randn(1, 3, 512, 512, requires_grad=False)

    os.makedirs(os.path.dirname(OUTPUT_ONNX_PATH), exist_ok=True)
    print(f"Exporting model to ONNX: {OUTPUT_ONNX_PATH}")

    try:
        torch.onnx.export(
            model,
            dummy_input,
            OUTPUT_ONNX_PATH,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["fundus_image"],
            output_names=["dr_grade_logits"],
            dynamic_axes={
                "fundus_image": {0: "batch_size"},
                "dr_grade_logits": {0: "batch_size"}
            }
        )
        print(f"ONNX export successful: {OUTPUT_ONNX_PATH}")
        print("In MATLAB, load with:")
        print("  net = importNetworkFromONNX('ml/checkpoints/idrid_grading_model.onnx');")
        return True
    except Exception as e:
        print(f"Failed to export ONNX: {e}")
        return False


if __name__ == "__main__":
    export_to_onnx()

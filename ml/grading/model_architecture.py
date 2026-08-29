"""
Deep Learning Model Architecture for 5-Class Ordinal DR Severity Grading (SIH26038).
Supports:
- Backbone: EfficientNet-B3 / ResNet-50 / ConvNeXt with Transfer Learning
- Ordinal Regression & Multi-class Softmax
- Temperature Scaling for Calibrated Probabilities
- Grad-CAM Target Activation Layer hooks
"""

import os
from typing import Dict, Any, Tuple, Optional

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torchvision.models as models
except ImportError:
    torch = None
    nn = object
    F = None
    models = None


if torch is not None:
    class DREfficientNetB3(nn.Module):
        def __init__(self, num_classes: int = 5, pretrained: bool = True, dropout_rate: float = 0.4):
            super().__init__()
            weights = models.EfficientNet_B3_Weights.DEFAULT if pretrained else None
            self.backbone = models.efficientnet_b3(weights=weights)
            
            # Extract in_features from final classifier
            in_features = self.backbone.classifier[1].in_features
            
            # Replace classifier head with custom clinical projection head
            self.backbone.classifier = nn.Sequential(
                nn.Dropout(p=dropout_rate, inplace=True),
                nn.Linear(in_features, 256),
                nn.SiLU(),
                nn.BatchNorm1d(256),
                nn.Dropout(p=0.2),
                nn.Linear(256, num_classes)
            )

            # Grad-CAM gradient & feature hooks
            self.gradients = None
            self.activations = None
            self._register_hooks()

        def _register_hooks(self):
            def backward_hook(module, grad_in, grad_out):
                self.gradients = grad_out[0]

            def forward_hook(module, input, output):
                self.activations = output

            # Final conv layer of EfficientNet-B3 backbone
            target_layer = self.backbone.features[-1]
            target_layer.register_forward_hook(forward_hook)
            target_layer.register_full_backward_hook(backward_hook)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.backbone(x)

        def get_gradcam_weights(self) -> Tuple[torch.Tensor, torch.Tensor]:
            """Returns (gradients, activations) for Grad-CAM generation."""
            return self.gradients, self.activations


    class DRResNet50(nn.Module):
        def __init__(self, num_classes: int = 5, pretrained: bool = True, dropout_rate: float = 0.4):
            super().__init__()
            weights = models.ResNet50_Weights.DEFAULT if pretrained else None
            self.backbone = models.resnet50(weights=weights)
            
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Dropout(p=dropout_rate),
                nn.Linear(in_features, 256),
                nn.ReLU(inplace=True),
                nn.BatchNorm1d(256),
                nn.Dropout(p=0.2),
                nn.Linear(256, num_classes)
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.backbone(x)


def get_dr_model(model_name: str = "efficientnet_b3", num_classes: int = 5, pretrained: bool = True) -> Any:
    if torch is None:
        raise ImportError("PyTorch is required to instantiate DR deep learning models.")
    
    if model_name.lower() == "efficientnet_b3":
        return DREfficientNetB3(num_classes=num_classes, pretrained=pretrained)
    elif model_name.lower() == "resnet50":
        return DRResNet50(num_classes=num_classes, pretrained=pretrained)
    else:
        raise ValueError(f"Unsupported model architecture: {model_name}. Choose 'efficientnet_b3' or 'resnet50'.")

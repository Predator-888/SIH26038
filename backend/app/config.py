"""
Configuration management for SIH26038 DR Screening backend.
Loads environment variables using Pydantic Settings.
"""

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = "sqlite:///./dr_screening.db"
    UPLOAD_DIR: str = "./uploads"
    STATIC_DIR: str = "./static"
    MAX_UPLOAD_SIZE_MB: int = 15
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # ML Checkpoints
    GRADING_MODEL_PATH: str = "./ml/checkpoints/grading_efficientnet_b3.pt"
    SEGMENTATION_VESSEL_MODEL_PATH: str = "./ml/checkpoints/unet_vessels.pt"
    SEGMENTATION_LESION_MODEL_PATH: str = "./ml/checkpoints/unet_lesions.pt"
    INFERENCE_DEVICE: str = "cpu"

    # Clinical Thresholds
    QUALITY_SCORE_THRESHOLD: float = 0.60
    REFERABLE_GRADE_THRESHOLD: int = 2
    CONFIDENCE_UNCERTAIN_MAX: float = 0.70

    # Simulation
    MATLAB_ENGINE_ENABLED: bool = False
    SIMULINK_MODEL_PATH: str = "./simulink/screening_workflow.slx"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()

# Ensure required directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.STATIC_DIR, exist_ok=True)

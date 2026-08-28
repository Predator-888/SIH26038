"""
Pydantic schemas for Telemedicine Resource Simulation requests and responses.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    num_cameras: int = Field(default=5, ge=1, le=100)
    num_reviewers: int = Field(default=2, ge=1, le=50)
    bandwidth_mbps: float = Field(default=4.0, ge=0.2, le=100.0)
    images_per_day_per_camera: int = Field(default=40, ge=5, le=200)
    avg_review_time_sec: int = Field(default=25, ge=5, le=300)
    ai_processing_time_sec: float = Field(default=3.5, ge=0.5, le=60.0)


class BacklogPoint(BaseModel):
    day: int
    backlog: int
    daily_intake: int
    daily_processed: int


class SimulationResponse(BaseModel):
    run_id: str
    annual_capacity: int
    annual_demand: int
    annual_screened: int
    backlog_over_time: List[BacklogPoint]
    bottleneck: str  # bandwidth | processing | review_capacity | none
    recommendation: str

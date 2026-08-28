"""
SQLModel ORM model for Telemedicine Resource Simulation Runs.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from sqlmodel import SQLModel, Field, Column, JSON


class SimulationRun(SQLModel, table=True):
    __tablename__ = "simulation_runs"

    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    num_cameras: int
    num_reviewers: int
    bandwidth_mbps: float
    images_per_day_per_camera: int
    avg_review_time_sec: int
    ai_processing_time_sec: float
    annual_capacity: int
    bottleneck: str  # bandwidth | processing | review_capacity | none
    recommendation: str
    backlog_over_time: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))

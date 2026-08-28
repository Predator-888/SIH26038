import math
import uuid
from typing import Dict, Any, List, Optional
from sqlmodel import Session
from backend.app.schemas.simulation_schemas import SimulationRequest, SimulationResponse, BacklogPoint
from backend.app.models.simulation import SimulationRun


class SimulationService:
    @staticmethod
    def run_simulation(params: SimulationRequest, session: Optional[Session] = None) -> SimulationResponse:
        """
        Runs discrete-event queue simulation over a 365-day cycle.
        """
        # Daily intake demand
        daily_demand = params.num_cameras * params.images_per_day_per_camera
        annual_demand = daily_demand * 300  # 300 operational days / year

        # 1. Bandwidth constraint (3.5MB per image = 28 Mbits)
        image_size_mbits = 28.0
        sec_per_upload = image_size_mbits / max(0.1, params.bandwidth_mbps)
        bandwidth_daily_capacity = int((10 * 3600) / max(1.0, sec_per_upload))  # 10 active upload hrs

        # 2. AI Server constraint
        ai_daily_capacity = int((24 * 3600) / max(0.5, params.ai_processing_time_sec))

        # 3. Clinician Review constraint (6 clinical reading hours/day)
        reviewer_daily_sec = 6 * 3600
        reviewer_daily_capacity = int(params.num_reviewers * (reviewer_daily_sec / max(5, params.avg_review_time_sec)))

        # Effective throughput is determined by the tightest bottleneck
        capacities = {
            "bandwidth": bandwidth_daily_capacity,
            "processing": ai_daily_capacity,
            "review_capacity": reviewer_daily_capacity
        }
        
        bottleneck_type = min(capacities, key=capacities.get)
        daily_max_throughput = capacities[bottleneck_type]
        
        # Annual screening capacity
        annual_capacity = daily_max_throughput * 300
        annual_screened = min(annual_demand, annual_capacity)

        # Simulate 365-day backlog trajectory
        backlog_curve: List[BacklogPoint] = []
        current_backlog = 0
        
        # Sample points across days 1, 15, 30, 60, 90, 120, 180, 240, 300, 365
        sample_days = [1, 7, 15, 30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365]
        
        for d in range(1, 366):
            # Working days vs weekends
            is_operational_day = (d % 7 not in [0, 6])
            today_intake = daily_demand if is_operational_day else int(daily_demand * 0.2)
            today_processed = min(current_backlog + today_intake, daily_max_throughput if is_operational_day else 0)
            
            current_backlog = max(0, current_backlog + today_intake - today_processed)
            
            if d in sample_days or d == 365:
                backlog_curve.append(BacklogPoint(
                    day=d,
                    backlog=current_backlog,
                    daily_intake=today_intake,
                    daily_processed=today_processed
                ))

        # Identify bottleneck severity
        if daily_max_throughput >= daily_demand:
            actual_bottleneck = "none"
            recommendation = (
                f"System is operating efficiently. Total annual capacity ({annual_capacity:,} patients) "
                f"comfortably clears projected demand ({annual_demand:,} patients) with zero persistent backlog."
            )
        else:
            actual_bottleneck = bottleneck_type
            if bottleneck_type == "review_capacity":
                needed_reviewers = math.ceil(daily_demand / (reviewer_daily_sec / max(5, params.avg_review_time_sec)))
                shortfall = needed_reviewers - params.num_reviewers
                recommendation = (
                    f"Reviewer capacity is the primary bottleneck. Add {shortfall} more reviewing ophthalmologist(s) "
                    f"(or optimize triage confidence gating) to prevent backlog accumulation."
                )
            elif bottleneck_type == "bandwidth":
                needed_bw = math.ceil((daily_demand * image_size_mbits) / (10 * 3600) * 10) / 10
                recommendation = (
                    f"Rural network bandwidth is constraining uploads. Upgrade clinic uplink to at least "
                    f"{needed_bw} Mbps or enable local edge inference buffering."
                )
            else:
                recommendation = (
                    f"AI processing server latency is the limiting factor. Deploy batch quantization (ONNX Runtime / TensorRT) "
                    f"to reduce per-image inference latency."
                )

        response = SimulationResponse(
            run_id=str(uuid.uuid4()),
            annual_capacity=annual_capacity,
            annual_demand=annual_demand,
            annual_screened=annual_screened,
            backlog_over_time=backlog_curve,
            bottleneck=actual_bottleneck,
            recommendation=recommendation
        )

        if session:
            run_obj = SimulationRun(
                run_id=response.run_id,
                num_cameras=params.num_cameras,
                num_reviewers=params.num_reviewers,
                bandwidth_mbps=params.bandwidth_mbps,
                images_per_day_per_camera=params.images_per_day_per_camera,
                avg_review_time_sec=params.avg_review_time_sec,
                ai_processing_time_sec=params.ai_processing_time_sec,
                annual_capacity=annual_capacity,
                bottleneck=actual_bottleneck,
                recommendation=recommendation,
                backlog_over_time=[b.model_dump() for b in backlog_curve]
            )
            session.add(run_obj)
            session.commit()

        return response


simulation_service = SimulationService()

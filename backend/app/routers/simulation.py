"""
API Router for Telemedicine Resource Simulation (Simulink Workflow Model).
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session
from backend.app.database import get_session
from backend.app.schemas.simulation_schemas import SimulationRequest, SimulationResponse
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/simulate", tags=["Simulation"])


@router.post("", response_model=SimulationResponse)
def run_screening_simulation(
    params: SimulationRequest,
    session: Session = Depends(get_session)
):
    """
    Executes the district-scale telemedicine resource allocation simulation.
    """
    return simulation_service.run_simulation(params, session)

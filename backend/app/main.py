"""
FastAPI Application Entrypoint for SIH26038 DR Screening System.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routers import cases, analysis, reports, simulation, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database Tables & Folders
    init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.STATIC_DIR, exist_ok=True)
    yield


app = FastAPI(
    title="Diabetic Retinopathy Explainable AI Screening API",
    description="SIH26038 Problem Statement — Sponsored by MathWorks",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for local demo flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Mount Static Files for preprocessed images & Grad-CAM heatmaps
app.mount("/static", StaticFiles(directory=settings.STATIC_DIR), name="static")

# 3. Register Routers under /api/v1
api_v1_prefix = "/api/v1"
app.include_router(cases.router, prefix=api_v1_prefix)
app.include_router(analysis.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(simulation.router, prefix=api_v1_prefix)
app.include_router(health.router, prefix=api_v1_prefix)


# 4. Standardized Error Handling per Tech Stack §5.9
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters.",
                "details": exc.errors()
            }
        }
    )


@app.get("/")
def root():
    return {
        "system": "SIH26038 Explainable DR Screening Platform",
        "docs": "/docs",
        "health": f"{api_v1_prefix}/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

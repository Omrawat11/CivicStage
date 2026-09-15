"""Health check endpoint for CivicTriage API."""

from datetime import datetime
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Return service health status and timestamp."""
    return {
        "status": "healthy",
        "service": "CivicTriage API",
        "timestamp": datetime.utcnow().isoformat(),
        "phase": 3,
    }

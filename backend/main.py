"""CivicTriage Phase 3 - FastAPI Application Entry Point.

Exposes REST APIs for municipal complaint management, automated AI triage,
human-in-the-loop review, and advisory citizen acknowledgement drafting.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import init_db
from backend.api.health import router as health_router
from backend.api.complaints import router as complaints_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager handling startup and shutdown events."""
    # Initialize SQLite database schema on startup
    init_db()
    yield


app = FastAPI(
    title="CivicTriage Operator API",
    description="Municipal Complaint Triage, Urgency Scoring, and Human-in-the-Loop Operator System",
    version="3.0.0",
    lifespan=lifespan,
)

# Configure CORS for local Next.js operator dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits localhost:3000 and arbitrary operator origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router)
app.include_router(complaints_router)


@app.get("/")
def root():
    """Service landing endpoint with links to OpenAPI documentation."""
    return {
        "service": "CivicTriage Operator API",
        "phase": 3,
        "status": "online",
        "docs_url": "/docs",
    }

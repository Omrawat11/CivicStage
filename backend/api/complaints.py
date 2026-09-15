"""FastAPI API endpoints for municipal complaints, triage execution, and human operator review."""

import json
from datetime import datetime
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, func, case
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models import Complaint
from backend.services.triage import TriageService
from backend.services.acknowledgement import generate_acknowledgement_draft
from backend.data.loader import load_taxonomy, load_gazetteer

router = APIRouter(tags=["Complaints"])

# Shared singleton triage service (reuses existing Phase 2 pipeline)
_triage_service: TriageService | None = None


def get_triage_service() -> TriageService:
    global _triage_service
    if _triage_service is None:
        _triage_service = TriageService()
    return _triage_service


# --- Pydantic Schemas for Requests & Responses ---

class ReviewRequest(BaseModel):
    """Payload for human operator decision on a triaged complaint."""
    decision: Literal["approve", "edit", "reject"] = Field(
        ...,
        description="Operator decision: 'approve' to accept AI triage, 'edit' to correct fields, 'reject' to dismiss.",
    )
    department: str | None = Field(default=None, description="Corrected or accepted department")
    category: str | None = Field(default=None, description="Corrected or accepted category")
    locality: str | None = Field(default=None, description="Corrected or accepted locality")
    ward: str | None = Field(default=None, description="Corrected or accepted ward")
    urgency: str | None = Field(default=None, description="Corrected or accepted urgency level")
    notes: str | None = Field(default=None, description="Human operator audit notes / remarks")


class AcknowledgementUpdateRequest(BaseModel):
    """Payload to update an acknowledgement draft text."""
    acknowledgement_draft: str = Field(..., description="Edited citizen acknowledgement draft text")


def format_complaint_detail(c: Complaint) -> dict[str, Any]:
    """Format Complaint model into the structured Section 8 specification."""
    # Priority resolution for display: operator values take precedence if reviewed, else AI values
    effective_department = c.operator_department or c.ai_department
    effective_category = c.operator_category or c.ai_category
    effective_locality = c.operator_locality or c.ai_locality
    effective_ward = c.operator_ward or c.ai_ward
    effective_urgency = c.operator_urgency or c.ai_urgency

    return {
        "id": c.id,
        "complaint_id": c.complaint_id,
        "source_channel": c.source_channel,
        "timestamp": c.timestamp.isoformat() if c.timestamp else None,
        "raw_text": c.raw_text,
        "language": c.language,
        "status": c.status,
        "effective_department": effective_department,
        "effective_category": effective_category,
        "effective_locality": effective_locality,
        "effective_ward": effective_ward,
        "effective_urgency": effective_urgency,
        # Section 8.1: Original complaint
        "original_complaint": {
            "complaint_id": c.complaint_id,
            "source_channel": c.source_channel,
            "timestamp": c.timestamp.isoformat() if c.timestamp else None,
            "raw_text": c.raw_text,
            "language": c.language,
            "status": c.status,
        },
        # Section 8.2: AI recommendation
        "ai_recommendation": {
            "department": c.ai_department,
            "category": c.ai_category,
            "locality": c.ai_locality,
            "ward": c.ai_ward,
            "urgency": c.ai_urgency,
            "urgency_score": c.ai_urgency_score,
            "urgency_factors": c.parse_urgency_factors(),
            "confidence": c.ai_confidence,
            "evidence": c.parse_evidence(),
            "summary": c.ai_summary,
        },
        # Section 8.3: Duplicate information
        "duplicate_info": {
            "duplicate_status": c.duplicate_status,
            "matched_incident_id": c.matched_incident_id,
            "similarity_score": c.similarity_score,
            "cluster_complaints_count": c.cluster_complaints_count,
            "duplicate_summary": c.duplicate_summary,
            "incident_id": c.incident_id,
        },
        # Section 8.4: Operator information
        "operator_info": {
            "operator_decision": c.operator_decision,
            "operator_department": c.operator_department,
            "operator_category": c.operator_category,
            "operator_locality": c.operator_locality,
            "operator_ward": c.operator_ward,
            "operator_urgency": c.operator_urgency,
            "operator_notes": c.operator_notes,
            "operator_reviewed_at": c.operator_reviewed_at.isoformat() if c.operator_reviewed_at else None,
        },
        # Section 8.5: Acknowledgement
        "acknowledgement": {
            "acknowledgement_draft": c.acknowledgement_draft,
        },
        # Metadata
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


# --- API Routes ---

@router.get("/meta/taxonomy")
def get_taxonomy_and_gazetteer():
    """Return taxonomy departments, categories, and localities for operator UI dropdowns."""
    tax = load_taxonomy()
    gaz = load_gazetteer()
    localities = [item["name"] for item in gaz.get("localities", [])]
    return {
        "departments": tax.get("departments", []),
        "localities": sorted(localities),
    }


@router.get("/complaints/stats")
def get_complaint_stats(db: Session = Depends(get_db)):
    """Return summary dashboard metrics and priority queue."""
    total_complaints = db.query(Complaint).count()
    urgent_complaints = db.query(Complaint).filter(
        or_(
            Complaint.ai_urgency.in_(["HIGH", "CRITICAL"]),
            Complaint.operator_urgency.in_(["HIGH", "CRITICAL"]),
        )
    ).count()
    potential_duplicates = db.query(Complaint).filter(
        Complaint.duplicate_status.in_(["duplicate", "repeat"])
    ).count()
    pending_review = db.query(Complaint).filter(
        Complaint.status == "Pending Review"
    ).count()

    # Priority Queue: Top high-priority/urgent complaints grouped or ranked for immediate action
    priority_query = (
        db.query(
            Complaint.ai_urgency,
            Complaint.ai_category,
            Complaint.ai_locality,
            func.count(Complaint.id).label("count"),
        )
        .filter(
            Complaint.ai_urgency.in_(["HIGH", "CRITICAL", "MEDIUM"]),
            Complaint.status.in_(["New", "Pending Review"]),
        )
        .group_by(Complaint.ai_urgency, Complaint.ai_category, Complaint.ai_locality)
        .order_by(
            case(
                (Complaint.ai_urgency == "CRITICAL", 1),
                (Complaint.ai_urgency == "HIGH", 2),
                else_=3,
            ),
            func.count(Complaint.id).desc(),
        )
        .limit(10)
        .all()
    )

    priority_queue = [
        {
            "urgency": row[0] or "HIGH",
            "category": row[1] or "General Grievance",
            "locality": row[2] or "City-wide",
            "count": row[3],
        }
        for row in priority_query
    ]

    return {
        "total_complaints": total_complaints,
        "urgent_complaints": urgent_complaints,
        "potential_duplicates": potential_duplicates,
        "pending_review": pending_review,
        "priority_queue": priority_queue,
    }


@router.get("/complaints")
def list_complaints(
    department: str | None = Query(None, description="Filter by department"),
    urgency: str | None = Query(None, description="Filter by urgency ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')"),
    status: str | None = Query(None, description="Filter by status ('New', 'Pending Review', 'Approved', etc.)"),
    language: str | None = Query(None, description="Filter by language"),
    locality: str | None = Query(None, description="Filter by locality"),
    source_channel: str | None = Query(None, description="Filter by source channel"),
    duplicate_status: str | None = Query(None, description="Filter by duplicate status ('unique', 'duplicate', 'repeat')"),
    search: str | None = Query(None, description="Search text in complaint raw text or ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    db: Session = Depends(get_db),
):
    """List complaints with multi-attribute filtering, search, and pagination."""
    query = db.query(Complaint)

    # Department filter (matches either operator or AI department)
    if department:
        query = query.filter(
            or_(
                Complaint.operator_department.ilike(f"%{department}%"),
                Complaint.ai_department.ilike(f"%{department}%"),
            )
        )

    # Urgency filter
    if urgency:
        query = query.filter(
            or_(
                Complaint.operator_urgency.ilike(urgency),
                Complaint.ai_urgency.ilike(urgency),
            )
        )

    # Status filter
    if status:
        query = query.filter(Complaint.status.ilike(status))

    # Language filter
    if language:
        query = query.filter(Complaint.language.ilike(language))

    # Locality filter
    if locality:
        query = query.filter(
            or_(
                Complaint.operator_locality.ilike(f"%{locality}%"),
                Complaint.ai_locality.ilike(f"%{locality}%"),
            )
        )

    # Source Channel filter
    if source_channel:
        query = query.filter(Complaint.source_channel.ilike(f"%{source_channel}%"))

    # Duplicate Status filter
    if duplicate_status:
        query = query.filter(Complaint.duplicate_status.ilike(duplicate_status))

    # Text Search (on raw_text or complaint_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Complaint.raw_text.ilike(search_pattern),
                Complaint.complaint_id.ilike(search_pattern),
                Complaint.ai_summary.ilike(search_pattern),
            )
        )

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    # Order by timestamp descending (newest first)
    items = (
        query.order_by(Complaint.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [format_complaint_detail(c) for c in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: str, db: Session = Depends(get_db)):
    """Retrieve full details, AI recommendation, duplicate analysis, and operator review state."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )
    return format_complaint_detail(c)


@router.post("/complaints/{complaint_id}/triage")
async def run_complaint_triage(
    complaint_id: str,
    db: Session = Depends(get_db),
    triage_svc: TriageService = Depends(get_triage_service),
):
    """Run the existing Phase 2 triage intelligence pipeline on a complaint.

    Executes LLM classification, taxonomy/gazetteer validation, locality normalization,
    urgency scoring, and duplicate detection.
    Stores the resulting AI prediction in the database and generates an initial acknowledgement draft.
    """
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )

    # Run existing Phase 2 pipeline
    result = await triage_svc.triage_complaint(
        complaint=c.raw_text,
        timestamp=c.timestamp or datetime.utcnow(),
    )

    # Populate AI predictions
    c.ai_department = result.final_department
    c.ai_category = result.final_category
    c.ai_locality = result.final_locality
    c.ai_ward = result.final_ward
    c.ai_urgency = result.urgency.level
    c.ai_urgency_score = result.urgency.score
    c.ai_urgency_factors = json.dumps(result.urgency.factors)
    c.ai_confidence = result.triage.confidence
    c.ai_evidence = json.dumps(result.triage.evidence)
    c.ai_summary = result.triage.summary

    # Populate duplicate advisory
    c.duplicate_status = result.duplicate_analysis.status
    c.matched_incident_id = result.duplicate_analysis.matched_incident_id
    c.similarity_score = result.duplicate_analysis.similarity_score
    c.cluster_complaints_count = result.duplicate_analysis.existing_complaints_count
    c.duplicate_summary = result.duplicate_analysis.summary

    # Update operational lifecycle status
    c.status = "Pending Review"

    # Generate initial acknowledgement draft
    c.acknowledgement_draft = generate_acknowledgement_draft(
        complaint_id=c.complaint_id,
        department=c.ai_department,
        category=c.ai_category,
        locality=c.ai_locality,
        ward=c.ai_ward,
    )
    c.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(c)
    return format_complaint_detail(c)


@router.post("/complaints/{complaint_id}/review")
def review_complaint(
    complaint_id: str,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
):
    """Record a human operator review decision (approve, edit, or reject).

    CRITICAL ARCHITECTURAL GUARANTEE:
    - AI predictions ('ai_*') are NEVER overwritten.
    - Operator edits/decisions are stored strictly in 'operator_*' fields.
    - Updates operational status and generates an updated citizen acknowledgement draft.
    """
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )

    now = datetime.utcnow()
    c.operator_decision = payload.decision
    c.operator_notes = payload.notes
    c.operator_reviewed_at = now

    if payload.decision == "approve":
        c.status = "Approved"
        # Operator confirms AI recommendation
        c.operator_department = c.ai_department
        c.operator_category = c.ai_category
        c.operator_locality = c.ai_locality
        c.operator_ward = c.ai_ward
        c.operator_urgency = c.ai_urgency

    elif payload.decision == "edit":
        c.status = "Edited"
        # Operator overrides fields; fallback to AI values if field not provided in payload
        c.operator_department = payload.department or c.ai_department
        c.operator_category = payload.category or c.ai_category
        c.operator_locality = payload.locality or c.ai_locality
        c.operator_ward = payload.ward or c.ai_ward
        c.operator_urgency = payload.urgency or c.ai_urgency

    elif payload.decision == "reject":
        c.status = "Rejected"
        # No routed department/category for rejected tickets
        c.operator_department = None
        c.operator_category = None
        c.operator_locality = None
        c.operator_ward = None
        c.operator_urgency = None

    # Generate updated acknowledgement draft reflecting the human decision
    effective_dept = c.operator_department or c.ai_department
    effective_cat = c.operator_category or c.ai_category
    effective_loc = c.operator_locality or c.ai_locality
    effective_ward = c.operator_ward or c.ai_ward

    c.acknowledgement_draft = generate_acknowledgement_draft(
        complaint_id=c.complaint_id,
        department=effective_dept,
        category=effective_cat,
        locality=effective_loc,
        ward=effective_ward,
        decision=payload.decision,
        notes=payload.notes,
    )
    c.updated_at = now

    db.commit()
    db.refresh(c)
    return format_complaint_detail(c)


@router.put("/complaints/{complaint_id}/acknowledgement")
def update_acknowledgement_draft(
    complaint_id: str,
    payload: AcknowledgementUpdateRequest,
    db: Session = Depends(get_db),
):
    """Allow operator to manually adjust the citizen acknowledgement draft."""
    c = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Complaint with ID '{complaint_id}' not found.",
        )
    c.acknowledgement_draft = payload.acknowledgement_draft
    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return {"complaint_id": c.complaint_id, "acknowledgement_draft": c.acknowledgement_draft}

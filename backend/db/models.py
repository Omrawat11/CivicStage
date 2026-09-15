import json
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
)
from backend.db.database import Base


class Complaint(Base):
    """SQLAlchemy model representing a citizen civic complaint ticket.

    Maintains strict structural segregation between:
    1. Raw citizen input
    2. AI automated triage predictions
    3. Human operator review decisions
    4. Duplicate / repeat incident intelligence
    5. Citizen communication acknowledgement draft
    """

    __tablename__ = "complaints"

    # --- 1. Identity & Raw Citizen Input ---
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    complaint_id = Column(String(32), unique=True, index=True, nullable=False)
    source_channel = Column(String(64), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    raw_text = Column(Text, nullable=False)
    language = Column(String(32), nullable=False, default="English")
    status = Column(
        String(32),
        nullable=False,
        default="New",
        index=True,
    )  # 'New', 'AI Triaged', 'Pending Review', 'Approved', 'Edited', 'Rejected'
    resolved_at = Column(DateTime, nullable=True)  # Timestamp when complaint was resolved

    # --- 2. AI Recommendation & Inference (Strictly preserved, never overwritten by operator) ---
    ai_department = Column(String(128), nullable=True, index=True)
    ai_category = Column(String(128), nullable=True)
    ai_locality = Column(String(128), nullable=True, index=True)
    ai_ward = Column(String(64), nullable=True)
    ai_urgency = Column(String(32), nullable=True, index=True)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    ai_urgency_score = Column(Integer, nullable=True)  # 0 to 12
    ai_urgency_factors = Column(Text, nullable=True)  # JSON-encoded dict of factor scores
    ai_confidence = Column(Float, nullable=True)
    ai_evidence = Column(Text, nullable=True)  # JSON-encoded list of quoted phrases
    ai_summary = Column(Text, nullable=True)

    # --- 3. Human Operator Review Decisions (Stored separately from AI predictions) ---
    operator_department = Column(String(128), nullable=True)
    operator_category = Column(String(128), nullable=True)
    operator_locality = Column(String(128), nullable=True)
    operator_ward = Column(String(64), nullable=True)
    operator_urgency = Column(String(32), nullable=True)
    operator_notes = Column(Text, nullable=True)
    operator_decision = Column(String(32), nullable=True)  # 'approve', 'edit', 'reject'
    operator_reviewed_at = Column(DateTime, nullable=True)

    # --- 4. Duplicate & Incident Advisory ---
    duplicate_status = Column(String(32), nullable=False, default="unique", index=True)  # 'unique', 'duplicate', 'repeat'
    matched_incident_id = Column(String(64), nullable=True)
    similarity_score = Column(Float, nullable=True, default=0.0)
    cluster_complaints_count = Column(Integer, nullable=False, default=0)
    duplicate_summary = Column(Text, nullable=True)
    incident_id = Column(String(64), nullable=True)  # Underlying synthetic cluster ID for ground-truth tracking

    # --- 5. Citizen Acknowledgement Draft (Purely advisory; no live dispatch) ---
    acknowledgement_draft = Column(Text, nullable=True)

    # --- 6. Audit Timestamps ---
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def parse_evidence(self) -> list[str]:
        """Return parsed evidence list from stored JSON text."""
        if not self.ai_evidence:
            return []
        try:
            return json.loads(self.ai_evidence)
        except Exception:
            return [self.ai_evidence]

    def parse_urgency_factors(self) -> dict[str, int]:
        """Return parsed urgency factors dictionary from stored JSON text."""
        if not self.ai_urgency_factors:
            return {}
        try:
            return json.loads(self.ai_urgency_factors)
        except Exception:
            return {}

    def to_dict(self) -> dict:
        """Convert complaint record to a complete dictionary."""
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "source_channel": self.source_channel,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "raw_text": self.raw_text,
            "language": self.language,
            "status": self.status,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            # AI predictions
            "ai_department": self.ai_department,
            "ai_category": self.ai_category,
            "ai_locality": self.ai_locality,
            "ai_ward": self.ai_ward,
            "ai_urgency": self.ai_urgency,
            "ai_urgency_score": self.ai_urgency_score,
            "ai_urgency_factors": self.parse_urgency_factors(),
            "ai_confidence": self.ai_confidence,
            "ai_evidence": self.parse_evidence(),
            "ai_summary": self.ai_summary,
            # Operator decisions
            "operator_department": self.operator_department,
            "operator_category": self.operator_category,
            "operator_locality": self.operator_locality,
            "operator_ward": self.operator_ward,
            "operator_urgency": self.operator_urgency,
            "operator_notes": self.operator_notes,
            "operator_decision": self.operator_decision,
            "operator_reviewed_at": self.operator_reviewed_at.isoformat() if self.operator_reviewed_at else None,
            # Duplicate intelligence
            "duplicate_status": self.duplicate_status,
            "matched_incident_id": self.matched_incident_id,
            "similarity_score": self.similarity_score,
            "cluster_complaints_count": self.cluster_complaints_count,
            "duplicate_summary": self.duplicate_summary,
            "incident_id": self.incident_id,
            # Acknowledgement
            "acknowledgement_draft": self.acknowledgement_draft,
            # Timestamps
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

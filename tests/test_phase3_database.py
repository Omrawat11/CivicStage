"""Tests for Phase 3 SQLite database schema, model initialization, insertion, and retrieval."""

import json
from datetime import datetime
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db.database import Base
from backend.db.models import Complaint


@pytest.fixture
def test_db():
    """Create a temporary SQLite in-memory database session for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_database_initialization(test_db):
    """Verify that tables are created properly upon initialization."""
    assert test_db.query(Complaint).count() == 0


def test_complaint_insertion_and_retrieval(test_db):
    """Verify that a complete complaint record can be inserted and retrieved."""
    record = Complaint(
        complaint_id="CMP-TEST-001",
        source_channel="Mobile App",
        timestamp=datetime(2026, 6, 1, 12, 0, 0),
        raw_text="Water leakage near MP Nagar Zone 1",
        language="English",
        status="New",
        ai_department="Water Supply",
        ai_category="Water leakage",
        ai_locality="MP Nagar",
        ai_ward="45",
        ai_urgency="MEDIUM",
        ai_urgency_score=5,
        ai_urgency_factors=json.dumps({"service_outage": 1, "duration": 2}),
        ai_confidence=0.88,
        ai_evidence=json.dumps(["Water leakage", "MP Nagar"]),
        ai_summary="Water leak reported in MP Nagar.",
        duplicate_status="unique",
        matched_incident_id=None,
        similarity_score=0.12,
        cluster_complaints_count=0,
        acknowledgement_draft="[DRAFT ACKNOWLEDGEMENT] Test draft",
    )

    test_db.add(record)
    test_db.commit()

    retrieved = test_db.query(Complaint).filter_by(complaint_id="CMP-TEST-001").first()
    assert retrieved is not None
    assert retrieved.complaint_id == "CMP-TEST-001"
    assert retrieved.source_channel == "Mobile App"
    assert retrieved.raw_text == "Water leakage near MP Nagar Zone 1"
    assert retrieved.ai_department == "Water Supply"
    assert retrieved.ai_urgency == "MEDIUM"
    assert retrieved.ai_urgency_score == 5
    assert retrieved.parse_evidence() == ["Water leakage", "MP Nagar"]
    assert retrieved.parse_urgency_factors() == {"service_outage": 1, "duration": 2}
    assert retrieved.status == "New"
    assert retrieved.acknowledgement_draft == "[DRAFT ACKNOWLEDGEMENT] Test draft"


def test_ai_and_operator_field_separation(test_db):
    """Verify that AI predictions and Operator decisions occupy distinct database columns."""
    record = Complaint(
        complaint_id="CMP-TEST-002",
        source_channel="CM Helpline",
        timestamp=datetime(2026, 6, 2, 10, 0, 0),
        raw_text="Pothole on main road",
        language="Hinglish",
        status="Pending Review",
        ai_department="Roads",
        ai_category="Pothole",
        ai_locality="Arera Colony",
        ai_ward="48",
        ai_urgency="MEDIUM",
    )
    test_db.add(record)
    test_db.commit()

    # Operator performs an edit
    record.status = "Edited"
    record.operator_decision = "edit"
    record.operator_department = "Drainage"  # Changed department
    record.operator_category = "Drain blockage"
    record.operator_locality = "Shahpura"
    record.operator_ward = "52"
    record.operator_urgency = "HIGH"
    record.operator_notes = "Inspected on site: actually drain blockage causing water to pool."
    record.operator_reviewed_at = datetime.utcnow()
    test_db.commit()

    reloaded = test_db.query(Complaint).filter_by(complaint_id="CMP-TEST-002").first()

    # AI predictions must remain pristine
    assert reloaded.ai_department == "Roads"
    assert reloaded.ai_category == "Pothole"
    assert reloaded.ai_locality == "Arera Colony"
    assert reloaded.ai_ward == "48"
    assert reloaded.ai_urgency == "MEDIUM"

    # Operator decision must reflect the human edit
    assert reloaded.operator_department == "Drainage"
    assert reloaded.operator_category == "Drain blockage"
    assert reloaded.operator_locality == "Shahpura"
    assert reloaded.operator_ward == "52"
    assert reloaded.operator_urgency == "HIGH"
    assert reloaded.operator_decision == "edit"
    assert "Inspected on site" in reloaded.operator_notes

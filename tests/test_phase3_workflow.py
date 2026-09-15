"""Workflow tests for CivicTriage Phase 3: AI triage, human-in-the-loop review, and safety."""

import json
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.db.database import Base, get_db
from backend.db.models import Complaint
from backend.services.acknowledgement import generate_acknowledgement_draft


@pytest.fixture
def workflow_client():
    """Create isolated test client for end-to-end workflow verification using StaticPool."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Untriaged test ticket
    setup_session = TestingSession()
    untriaged = Complaint(
        complaint_id="CMP-NEW-01",
        source_channel="Mobile App",
        timestamp=datetime(2026, 6, 1, 14, 0),
        raw_text="Kolar me 3 din se paani nahi aa raha hai. Bahut dikkat ho rahi hai.",
        language="Hinglish",
        status="New",
    )
    # Triaged test ticket ready for human review
    triaged = Complaint(
        complaint_id="CMP-REVIEW-01",
        source_channel="CM Helpline",
        timestamp=datetime(2026, 6, 1, 15, 0),
        raw_text="Open garbage dumping near Arera Colony market creating stench.",
        language="English",
        status="Pending Review",
        ai_department="Sanitation",
        ai_category="Open dumping",
        ai_locality="Arera Colony",
        ai_ward="48",
        ai_urgency="MEDIUM",
        ai_urgency_score=4,
        ai_urgency_factors=json.dumps({"service_outage": 0, "duration": 1, "scale": 1, "safety": 1}),
        ai_confidence=0.92,
        ai_evidence=json.dumps(["garbage dumping", "Arera Colony"]),
        ai_summary="Open garbage dumping reported in Arera Colony.",
        duplicate_status="unique",
        acknowledgement_draft="[DRAFT ACKNOWLEDGEMENT] Pending operator review.",
    )

    setup_session.add_all([untriaged, triaged])
    setup_session.commit()
    setup_session.close()

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_triage_endpoint_execution(workflow_client):
    """POST /complaints/{id}/triage runs the intelligence pipeline and updates AI fields."""
    client = workflow_client

    response = client.post("/complaints/CMP-NEW-01/triage")
    assert response.status_code == 200
    data = response.json()

    # Status must advance to 'Pending Review'
    assert data["status"] == "Pending Review"

    # AI recommendation must be populated
    ai = data["ai_recommendation"]
    assert ai["department"] is not None
    assert ai["category"] is not None
    assert ai["urgency"] is not None
    assert ai["confidence"] is not None

    # Acknowledgement draft must be generated
    assert data["acknowledgement"]["acknowledgement_draft"] is not None
    assert "[DRAFT ACKNOWLEDGEMENT]" in data["acknowledgement"]["acknowledgement_draft"]


def test_operator_approve_decision(workflow_client):
    """Operator approval preserves AI predictions and marks complaint as Approved."""
    client = workflow_client

    payload = {
        "decision": "approve",
        "notes": "Verified by municipal operator via phone follow-up.",
    }
    response = client.post("/complaints/CMP-REVIEW-01/review", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "Approved"
    assert data["operator_info"]["operator_decision"] == "approve"
    assert data["operator_info"]["operator_notes"] == "Verified by municipal operator via phone follow-up."
    assert data["operator_info"]["operator_department"] == "Sanitation"

    # Verify AI prediction is still intact
    assert data["ai_recommendation"]["department"] == "Sanitation"
    assert data["ai_recommendation"]["category"] == "Open dumping"


def test_operator_edit_preserves_ai_prediction(workflow_client):
    """CRITICAL: Operator edits must NEVER overwrite AI predictions. Both must be stored."""
    client = workflow_client

    payload = {
        "decision": "edit",
        "department": "Public Health",  # Overridden from Sanitation
        "category": "Public toilet sanitation",  # Overridden from Open dumping
        "locality": "Shahpura",  # Overridden from Arera Colony
        "ward": "52",  # Overridden from 48
        "urgency": "HIGH",  # Overridden from MEDIUM
        "notes": "Re-routed to Public Health department after site photo inspection.",
    }
    response = client.post("/complaints/CMP-REVIEW-01/review", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify Status
    assert data["status"] == "Edited"

    # Verify AI Prediction was NOT overwritten
    ai = data["ai_recommendation"]
    assert ai["department"] == "Sanitation", "AI department must NOT be modified by human edit"
    assert ai["category"] == "Open dumping", "AI category must NOT be modified by human edit"
    assert ai["locality"] == "Arera Colony", "AI locality must NOT be modified by human edit"
    assert ai["ward"] == "48", "AI ward must NOT be modified by human edit"
    assert ai["urgency"] == "MEDIUM", "AI urgency must NOT be modified by human edit"

    # Verify Operator Decision contains the human edited values
    op = data["operator_info"]
    assert op["operator_decision"] == "edit"
    assert op["operator_department"] == "Public Health"
    assert op["operator_category"] == "Public toilet sanitation"
    assert op["operator_locality"] == "Shahpura"
    assert op["operator_ward"] == "52"
    assert op["operator_urgency"] == "HIGH"
    assert "Re-routed to Public Health" in op["operator_notes"]

    # Verify acknowledgement draft reflects edited department
    ack = data["acknowledgement"]["acknowledgement_draft"]
    assert "Public Health" in ack
    assert "Shahpura" in ack


def test_operator_reject_decision(workflow_client):
    """Operator rejection marks complaint as Rejected with explanation."""
    client = workflow_client

    payload = {
        "decision": "reject",
        "notes": "Grievance pertains to private residential dispute outside municipal purview.",
    }
    response = client.post("/complaints/CMP-REVIEW-01/review", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "Rejected"
    assert data["operator_info"]["operator_decision"] == "reject"
    assert data["operator_info"]["operator_department"] is None

    # AI prediction is still preserved
    assert data["ai_recommendation"]["department"] == "Sanitation"

    # Acknowledgement draft explains rejection politely
    ack = data["acknowledgement"]["acknowledgement_draft"]
    assert "cannot be routed" in ack
    assert "private residential dispute" in ack


def test_acknowledgement_safety_and_no_external_dispatch():
    """Verify that acknowledgement drafting is pure text and does not execute network dispatch."""
    draft = generate_acknowledgement_draft(
        complaint_id="CMP-9999",
        department="Roads",
        category="Pothole",
        locality="MP Nagar",
        ward="45",
        decision="approve",
        notes="Urgent repair scheduled.",
    )
    assert "[DRAFT ACKNOWLEDGEMENT]" in draft
    assert "CMP-9999" in draft
    assert "Roads" in draft
    assert "MP Nagar" in draft
    assert isinstance(draft, str)

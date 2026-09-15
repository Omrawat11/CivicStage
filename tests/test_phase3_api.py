"""API integration tests for CivicTriage Phase 3 endpoints."""

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


@pytest.fixture
def client_and_session():
    """Create an isolated test client backed by an in-memory SQLite database using StaticPool."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed sample test fixtures in test session
    setup_session = TestingSession()
    c1 = Complaint(
        complaint_id="CMP-0101",
        source_channel="Mobile App",
        timestamp=datetime(2026, 6, 1, 10, 0),
        raw_text="Severe water outage in Kolar since yesterday morning.",
        language="English",
        status="Pending Review",
        ai_department="Water Supply",
        ai_category="Water outage",
        ai_locality="Kolar",
        ai_ward="80",
        ai_urgency="HIGH",
        ai_urgency_score=8,
        ai_confidence=0.94,
        ai_evidence=json.dumps(["water outage", "Kolar"]),
        ai_summary="Severe water outage reported in Kolar.",
        duplicate_status="duplicate",
        matched_incident_id="INC-0010",
        similarity_score=0.88,
        cluster_complaints_count=4,
        acknowledgement_draft="[DRAFT] Water outage in Kolar acknowledged.",
    )
    c2 = Complaint(
        complaint_id="CMP-0102",
        source_channel="CM Helpline",
        timestamp=datetime(2026, 6, 1, 11, 0),
        raw_text="Pothole near MP Nagar Zone 2 causing accidents.",
        language="Hinglish",
        status="Approved",
        ai_department="Roads",
        ai_category="Pothole",
        ai_locality="MP Nagar",
        ai_ward="45",
        ai_urgency="MEDIUM",
        ai_urgency_score=5,
        ai_confidence=0.91,
        duplicate_status="unique",
        operator_decision="approve",
        operator_department="Roads",
        operator_category="Pothole",
        operator_locality="MP Nagar",
        operator_ward="45",
        operator_urgency="MEDIUM",
        operator_notes="Approved by operator",
    )
    c3 = Complaint(
        complaint_id="CMP-0103",
        source_channel="Social Media",
        timestamp=datetime(2026, 6, 1, 12, 0),
        raw_text="Loose electrical wire hanging dangerously over street in Arera Colony.",
        language="English",
        status="New",
        ai_urgency="CRITICAL",
        duplicate_status="unique",
    )

    setup_session.add_all([c1, c2, c3])
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


def test_health_endpoint(client_and_session):
    """GET /health returns healthy status."""
    client = client_and_session
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CivicTriage API"
    assert data["phase"] == 3


def test_meta_taxonomy(client_and_session):
    """GET /meta/taxonomy returns valid departments and localities."""
    client = client_and_session
    response = client.get("/meta/taxonomy")
    assert response.status_code == 200
    data = response.json()
    assert "departments" in data
    assert len(data["departments"]) > 0
    assert "localities" in data
    assert "Kolar" in data["localities"]


def test_complaints_listing_and_pagination(client_and_session):
    """GET /complaints returns paginated list of complaints."""
    client = client_and_session
    response = client.get("/complaints?page=1&page_size=2")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert data["total_pages"] == 2


def test_complaints_filtering(client_and_session):
    """GET /complaints applies filters accurately."""
    client = client_and_session

    # Filter by department
    res = client.get("/complaints?department=Water Supply")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0101"

    # Filter by urgency
    res = client.get("/complaints?urgency=HIGH")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0101"

    # Filter by status
    res = client.get("/complaints?status=Approved")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0102"

    # Filter by duplicate_status
    res = client.get("/complaints?duplicate_status=duplicate")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0101"


def test_complaints_search(client_and_session):
    """GET /complaints text search matches keywords."""
    client = client_and_session

    # Search for "pothole"
    res = client.get("/complaints?search=pothole")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0102"

    # Search for complaint ID
    res = client.get("/complaints?search=CMP-0101")
    assert res.status_code == 200
    items = res.json()["items"]
    assert len(items) == 1
    assert items[0]["complaint_id"] == "CMP-0101"


def test_complaints_stats(client_and_session):
    """GET /complaints/stats provides accurate aggregated dashboard counts."""
    client = client_and_session
    response = client.get("/complaints/stats")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_complaints"] == 3
    assert stats["urgent_complaints"] == 2  # CMP-0101 (HIGH) and CMP-0103 (CRITICAL)
    assert stats["potential_duplicates"] == 1  # CMP-0101
    assert stats["pending_review"] == 1  # CMP-0101
    assert "priority_queue" in stats


def test_complaint_detail_structure(client_and_session):
    """GET /complaints/{id} returns complete Section 8 specification."""
    client = client_and_session
    response = client.get("/complaints/CMP-0101")
    assert response.status_code == 200
    data = response.json()

    # Original complaint
    assert "original_complaint" in data
    assert data["original_complaint"]["complaint_id"] == "CMP-0101"
    assert "Severe water outage" in data["original_complaint"]["raw_text"]

    # AI recommendation
    assert "ai_recommendation" in data
    assert data["ai_recommendation"]["department"] == "Water Supply"
    assert data["ai_recommendation"]["category"] == "Water outage"
    assert data["ai_recommendation"]["locality"] == "Kolar"
    assert data["ai_recommendation"]["ward"] == "80"
    assert data["ai_recommendation"]["urgency"] == "HIGH"
    assert data["ai_recommendation"]["confidence"] == 0.94

    # Duplicate info
    assert "duplicate_info" in data
    assert data["duplicate_info"]["duplicate_status"] == "duplicate"
    assert data["duplicate_info"]["matched_incident_id"] == "INC-0010"
    assert data["duplicate_info"]["similarity_score"] == 0.88
    assert data["duplicate_info"]["cluster_complaints_count"] == 4

    # Operator info
    assert "operator_info" in data
    assert data["operator_info"]["operator_decision"] is None

    # Acknowledgement
    assert "acknowledgement" in data
    assert "acknowledgement_draft" in data["acknowledgement"]
    assert "[DRAFT]" in data["acknowledgement"]["acknowledgement_draft"]


def test_complaint_not_found(client_and_session):
    """GET /complaints/{non_existent} returns 404."""
    client = client_and_session
    response = client.get("/complaints/CMP-DOES-NOT-EXIST")
    assert response.status_code == 404

"""Tests for Phase 5 Emerging Clusters, Threshold Configuration, and Filter Polish."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.db.models import Base, Complaint
from backend.services.reports import detect_emerging_issues

client = TestClient(app)


@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    now = datetime(2026, 6, 1, 10, 0, 0)
    # Seed 4 complaints in Kolar - Water Supply within 12 hours
    for i in range(4):
        c = Complaint(
            complaint_id=f"TEST-CMP-{i:03d}",
            source_channel="Helpline 181",
            timestamp=now + timedelta(hours=i * 3),
            raw_text=f"Water shortage issue number {i} in Kolar",
            language="English",
            status="New",
            ai_department="Water Supply",
            ai_category="Water outage",
            ai_locality="Kolar",
            ai_ward="80",
            duplicate_status="duplicate" if i > 0 else "unique",
            matched_incident_id="INC-TEST-01",
            created_at=now,
            updated_at=now,
        )
        session.add(c)

    # Seed 2 complaints in MP Nagar - Roads spanning 60 hours
    for i in range(2):
        c = Complaint(
            complaint_id=f"TEST-ROAD-{i:03d}",
            source_channel="Web Portal",
            timestamp=now + timedelta(hours=i * 60),
            raw_text=f"Pothole complaint {i} in MP Nagar",
            language="English",
            status="New",
            ai_department="Roads",
            ai_category="Potholes",
            ai_locality="MP Nagar",
            ai_ward="45",
            duplicate_status="unique",
            created_at=now,
            updated_at=now,
        )
        session.add(c)

    session.commit()
    yield session
    session.close()


def test_detect_emerging_issues_thresholds(memory_db):
    """Verify cluster detection thresholds (min_cluster_size and max_time_span_hours)."""
    # min_cluster_size = 3 should find Kolar (4 items) and ignore MP Nagar (2 items)
    clusters = detect_emerging_issues(memory_db, min_cluster_size=3)
    assert len(clusters) == 1
    assert clusters[0]["locality"] == "Kolar"
    assert clusters[0]["department"] == "Water Supply"
    assert clusters[0]["complaints_count"] == 4
    assert clusters[0]["time_span_hours"] == 9.0
    assert len(clusters[0]["complaint_ids"]) == 4
    assert len(clusters[0]["related_complaints"]) == 4

    # max_time_span_hours = 24 should include Kolar (9h span) and exclude MP Nagar (60h span)
    clusters_time = detect_emerging_issues(
        memory_db,
        min_cluster_size=2,
        max_time_span_hours=24.0,
    )
    assert len(clusters_time) == 1
    assert clusters_time[0]["locality"] == "Kolar"


def test_api_emerging_issues_endpoint_with_query_params():
    """Verify GET /reports/emerging-issues respects query parameters and returns related complaints."""
    response = client.get("/reports/emerging-issues?min_cluster_size=2")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        cluster = data[0]
        assert "locality" in cluster
        assert "department" in cluster
        assert "category" in cluster
        assert "complaints_count" in cluster
        assert "complaint_ids" in cluster
        assert "related_complaints" in cluster


def test_api_complaints_category_filter():
    """Verify GET /complaints filters properly by category."""
    response = client.get("/complaints?category=Potholes&page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    for item in data["items"]:
        eff_cat = item["effective_category"] or ""
        assert "pothole" in eff_cat.lower()

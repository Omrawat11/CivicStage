"""Unit and API integration tests for Phase 4 departmental reports and resolution analytics."""

from datetime import datetime, timedelta
import statistics
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.db.database import Base, get_db
from backend.db.models import Complaint
from backend.services.reports import (
    calculate_department_metrics,
    get_all_departments_comparison,
    generate_weekly_report,
    detect_emerging_issues,
    generate_report_narrative,
)


@pytest.fixture
def reports_db_session():
    """Create an isolated test session with controlled resolution timestamps and duplicate states."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()

    base_time = datetime(2026, 6, 1, 10, 0, 0)

    # 4 Water Supply complaints:
    # C1: Resolved in 24 hours (Kolar)
    # C2: Resolved in 48 hours (Kolar)
    # C3: Resolved in 72 hours (MP Nagar)
    # -> Medians of [24, 48, 72] = 48.0 hours
    # C4: Pending (Kolar)
    c1 = Complaint(
        complaint_id="CMP-REP-01",
        source_channel="Mobile App",
        timestamp=base_time,
        raw_text="Water outage in Kolar",
        language="English",
        status="Resolved",
        resolved_at=base_time + timedelta(hours=24),
        ai_department="Water Supply",
        ai_category="Water outage",
        ai_locality="Kolar",
        duplicate_status="duplicate",
        matched_incident_id="INC-W01",
    )
    c2 = Complaint(
        complaint_id="CMP-REP-02",
        source_channel="CM Helpline",
        timestamp=base_time + timedelta(hours=1),
        raw_text="No water supply in Kolar",
        language="Hinglish",
        status="Resolved",
        resolved_at=base_time + timedelta(hours=49),  # 48 hrs resolution
        ai_department="Water Supply",
        ai_category="Water outage",
        ai_locality="Kolar",
        duplicate_status="duplicate",
        matched_incident_id="INC-W01",
    )
    c3 = Complaint(
        complaint_id="CMP-REP-03",
        source_channel="Mobile App",
        timestamp=base_time + timedelta(hours=2),
        raw_text="Low pressure in MP Nagar",
        language="English",
        status="Resolved",
        resolved_at=base_time + timedelta(hours=74),  # 72 hrs resolution
        ai_department="Water Supply",
        ai_category="Low water pressure",
        ai_locality="MP Nagar",
        duplicate_status="unique",
    )
    c4 = Complaint(
        complaint_id="CMP-REP-04",
        source_channel="Social Media",
        timestamp=base_time + timedelta(hours=5),
        raw_text="Water pipe broken in Kolar again",
        language="Hinglish",
        status="Pending Review",
        resolved_at=None,
        ai_department="Water Supply",
        ai_category="Water leakage",
        ai_locality="Kolar",
        duplicate_status="repeat",  # Chronic repeat problem
    )

    # Roads complaint: 1 complaint, resolved in 10 hours (Arera Colony)
    c5 = Complaint(
        complaint_id="CMP-REP-05",
        source_channel="Mobile App",
        timestamp=base_time,
        raw_text="Pothole in Arera Colony",
        language="English",
        status="Approved",
        resolved_at=base_time + timedelta(hours=10),
        ai_department="Roads",
        ai_category="Pothole",
        ai_locality="Arera Colony",
        duplicate_status="unique",
    )

    session.add_all([c1, c2, c3, c4, c5])
    session.commit()

    yield session, TestingSession

    session.close()
    Base.metadata.drop_all(bind=engine)


def test_department_metrics_calculations(reports_db_session):
    """Test resolution counts, rate, median resolution time, and top locality."""
    session, _ = reports_db_session

    metrics = calculate_department_metrics(session, "Water Supply")

    # Counts
    assert metrics["complaints_received"] == 4
    assert metrics["complaints_resolved"] == 3
    assert metrics["complaints_pending"] == 1

    # Resolution Rate = (3 / 4) * 100 = 75.0%
    assert metrics["resolution_rate"] == 75.0

    # Median resolution time: median([24.0, 48.0, 72.0]) = 48.0 hours
    assert metrics["median_resolution_time_hours"] == 48.0

    # Strict distinction between repeat vs duplicate
    assert metrics["duplicate_complaints"] == 2
    assert metrics["repeat_complaints"] == 1

    # Top locality: Kolar (3 complaints) vs MP Nagar (1 complaint)
    assert metrics["top_locality"] == "Kolar"


def test_zero_complaints_department_safe_division(reports_db_session):
    """Test zero-complaints department handles division by zero safely."""
    session, _ = reports_db_session

    metrics = calculate_department_metrics(session, "Electricity")
    assert metrics["complaints_received"] == 0
    assert metrics["complaints_resolved"] == 0
    assert metrics["complaints_pending"] == 0
    assert metrics["resolution_rate"] == 0.0
    assert metrics["median_resolution_time_hours"] is None
    assert metrics["top_locality"] is None


def test_top_locality_deterministic_tie_breaker(reports_db_session):
    """Test top locality tie-breaking uses deterministic alphabetical rule."""
    session, _ = reports_db_session

    # Add 2 complaints for Drainage: 1 in "Shahpura", 1 in "Bhadbhada" (tie of 1 each)
    d1 = Complaint(
        complaint_id="CMP-TIE-01",
        source_channel="Mobile App",
        timestamp=datetime.utcnow(),
        raw_text="Blocked drain",
        language="English",
        status="New",
        ai_department="Drainage",
        ai_locality="Shahpura",
    )
    d2 = Complaint(
        complaint_id="CMP-TIE-02",
        source_channel="Mobile App",
        timestamp=datetime.utcnow(),
        raw_text="Blocked drain",
        language="English",
        status="New",
        ai_department="Drainage",
        ai_locality="Bhadbhada",
    )
    session.add_all([d1, d2])
    session.commit()

    metrics = calculate_department_metrics(session, "Drainage")
    # 'Bhadbhada' comes alphabetically before 'Shahpura'
    assert metrics["top_locality"] == "Bhadbhada"


def test_emerging_issues_cluster_detection(reports_db_session):
    """Test emerging issue detection groups active duplicate/repeat clusters."""
    session, _ = reports_db_session

    clusters = detect_emerging_issues(session, min_cluster_size=2)
    assert len(clusters) >= 1

    # First cluster should be Kolar / Water Supply
    kolar_cluster = next((c for c in clusters if c["locality"] == "Kolar" and c["department"] == "Water Supply"), None)
    assert kolar_cluster is not None
    assert kolar_cluster["complaints_count"] >= 2
    assert "Kolar" in kolar_cluster["summary"]
    assert kolar_cluster["duplicate_count"] >= 1


def test_weekly_report_structure_and_narrative(reports_db_session):
    """Test weekly report aggregation and narrative generation from pre-calculated stats."""
    session, _ = reports_db_session

    report = generate_weekly_report(session)
    assert "total_complaints" in report
    assert report["total_complaints"] == 5
    assert report["total_resolved"] == 4
    assert report["total_pending"] == 1
    assert report["overall_resolution_rate"] == 80.0
    assert report["overall_median_resolution_time_hours"] is not None
    assert len(report["departments"]) > 0
    assert "narrative_summary" in report
    assert "Water Supply" in report["narrative_summary"]


def test_reports_api_endpoints(reports_db_session):
    """Test FastAPI /reports routes."""
    _, TestingSession = reports_db_session

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        # GET /reports/weekly
        res_weekly = client.get("/reports/weekly")
        assert res_weekly.status_code == 200
        weekly_data = res_weekly.json()
        assert weekly_data["total_complaints"] == 5
        assert "departments" in weekly_data
        assert "emerging_issues" in weekly_data

        # GET /reports/departments
        res_depts = client.get("/reports/departments")
        assert res_depts.status_code == 200
        depts_data = res_depts.json()
        assert isinstance(depts_data, list)
        assert len(depts_data) > 0

        # GET /reports/departments/Water Supply
        res_single = client.get("/reports/departments/Water Supply")
        assert res_single.status_code == 200
        single_data = res_single.json()
        assert single_data["department"] == "Water Supply"
        assert single_data["complaints_received"] == 4

        # GET /reports/departments/InvalidDept -> 404
        res_404 = client.get("/reports/departments/NonExistentDept")
        assert res_404.status_code == 404

    app.dependency_overrides.clear()

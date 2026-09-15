"""Unit and API integration tests for Phase 4 model evaluation and human correction rate."""

from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from backend.main import app
from backend.db.database import Base, get_db
from backend.db.models import Complaint
from backend.services.evaluation import (
    evaluate_test_dataset,
    calculate_human_correction_rate,
    save_evaluation_results,
    load_latest_evaluation_results,
)


@pytest.fixture
def eval_db_session():
    """Create test session for human correction rate evaluation."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()

    yield session, TestingSession

    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.mark.asyncio
async def test_evaluate_test_dataset_execution():
    """Test evaluation benchmark runs on held-out dataset and computes all required metrics."""
    # Run evaluation on first 10 test complaints for fast deterministic test execution
    results = await evaluate_test_dataset(limit=10)

    assert "metrics" in results
    metrics = results["metrics"]

    # Verify 4 core accuracy metrics exist and are percentages
    assert "department_accuracy" in metrics
    assert 0.0 <= metrics["department_accuracy"] <= 100.0

    assert "category_accuracy" in metrics
    assert 0.0 <= metrics["category_accuracy"] <= 100.0

    assert "locality_accuracy" in metrics
    assert 0.0 <= metrics["locality_accuracy"] <= 100.0

    assert "urgency_agreement" in metrics
    assert 0.0 <= metrics["urgency_agreement"] <= 100.0

    # Verify duplicate metrics
    dup = metrics["duplicate_detection"]
    assert "precision" in dup
    assert "recall" in dup
    assert "f1" in dup
    assert "true_positives" in dup
    assert "false_positives" in dup
    assert "false_negatives" in dup

    # Verify per-department metrics
    per_dept = results["per_department_metrics"]
    assert isinstance(per_dept, dict)
    assert len(per_dept) > 0


def test_human_correction_rate_zero_reviewed(eval_db_session):
    """Test human correction rate returns 0.0% safely when zero complaints have been reviewed."""
    session, _ = eval_db_session

    stats = calculate_human_correction_rate(session)
    assert stats["total_reviewed"] == 0
    assert stats["corrections_count"] == 0
    assert stats["human_correction_rate"] == 0.0


def test_human_correction_rate_with_reviewed_complaints(eval_db_session):
    """Test human correction rate calculates accurately from real operator decisions."""
    session, _ = eval_db_session

    now = datetime.utcnow()

    # C1: Approved (no change) -> 0 corrections
    c1 = Complaint(
        complaint_id="CMP-EVAL-01",
        source_channel="Mobile App",
        timestamp=now,
        raw_text="Water outage",
        language="English",
        status="Approved",
        ai_department="Water Supply",
        ai_category="Water outage",
        ai_locality="Kolar",
        operator_decision="approve",
        operator_department="Water Supply",
        operator_category="Water outage",
        operator_locality="Kolar",
    )

    # C2: Edited department & ward -> 1 correction
    c2 = Complaint(
        complaint_id="CMP-EVAL-02",
        source_channel="Mobile App",
        timestamp=now,
        raw_text="Pothole in Arera",
        language="English",
        status="Edited",
        ai_department="Roads",
        ai_category="Pothole",
        ai_locality="Arera Colony",
        ai_ward="48",
        operator_decision="edit",
        operator_department="Public Health",  # changed
        operator_category="Pothole",
        operator_locality="Arera Colony",
        operator_ward="52",  # changed
        operator_notes="Re-routed after site inspection",
    )

    # C3: Rejected -> 1 correction
    c3 = Complaint(
        complaint_id="CMP-EVAL-03",
        source_channel="CM Helpline",
        timestamp=now,
        raw_text="Garbage pile",
        language="Hindi",
        status="Rejected",
        ai_department="Sanitation",
        operator_decision="reject",
        operator_notes="Private land dispute",
    )

    # C4: New (Unreviewed) -> Not included in reviewed denominator
    c4 = Complaint(
        complaint_id="CMP-EVAL-04",
        source_channel="Mobile App",
        timestamp=now,
        raw_text="Power cut",
        language="English",
        status="New",
        ai_department="Electricity",
    )

    session.add_all([c1, c2, c3, c4])
    session.commit()

    stats = calculate_human_correction_rate(session)
    # Total reviewed: 3 (c1, c2, c3). Corrections: 2 (c2 edited, c3 rejected)
    # Rate: 2 / 3 * 100 = 66.7%
    assert stats["total_reviewed"] == 3
    assert stats["corrections_count"] == 2
    assert stats["human_correction_rate"] == 66.7


def test_evaluation_api_endpoints(eval_db_session):
    """Test FastAPI /evaluation endpoint returns structured metrics and human correction rate."""
    _, TestingSession = eval_db_session

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        res = client.get("/evaluation")
        assert res.status_code == 200
        data = res.json()

        assert "department_accuracy" in data
        assert "category_accuracy" in data
        assert "locality_accuracy" in data
        assert "urgency_agreement" in data
        assert "duplicate_precision" in data
        assert "human_correction_rate" in data
        assert "human_in_the_loop" in data
        assert "per_department_metrics" in data

    app.dependency_overrides.clear()

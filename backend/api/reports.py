"""FastAPI API endpoints for departmental accountability reports and resolution performance analytics."""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.services.reports import (
    calculate_department_metrics,
    get_all_departments_comparison,
    generate_weekly_report,
    detect_emerging_issues,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/weekly")
def get_weekly_report(
    start_date: str | None = Query(None, description="ISO format start date filter (e.g. 2026-06-01)"),
    end_date: str | None = Query(None, description="ISO format end date filter (e.g. 2026-06-07)"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Generate complete municipal accountability report for a reporting period.

    Includes total counts, overall resolution rate, median resolution time (in hours),
    department performance comparisons, emerging issue clusters, and an executive narrative summary.
    """
    try:
        return generate_weekly_report(db=db, start_date=start_date, end_date=end_date)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate accountability report: {str(e)}",
        )


@router.get("/departments")
def get_departments_comparison(
    start_date: str | None = Query(None, description="ISO format start date filter"),
    end_date: str | None = Query(None, description="ISO format end date filter"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return comparative resolution performance metrics across all municipal departments."""
    return get_all_departments_comparison(db=db, start_date=start_date, end_date=end_date)


@router.get("/departments/{department}")
def get_single_department_report(
    department: str,
    start_date: str | None = Query(None, description="ISO format start date filter"),
    end_date: str | None = Query(None, description="ISO format end date filter"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return in-depth metrics and top locality for a specific municipal department."""
    metrics = calculate_department_metrics(
        db=db,
        department_name=department,
        start_date=start_date,
        end_date=end_date,
    )
    if metrics["complaints_received"] == 0:
        # Check if department exists in taxonomy
        from backend.data.loader import load_taxonomy
        tax = load_taxonomy()
        valid_depts = [d["name"].lower() for d in tax.get("departments", [])]
        if department.lower() not in valid_depts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department '{department}' not found in municipal taxonomy.",
            )
    return metrics


@router.get("/emerging-issues")
def get_emerging_issues(
    start_date: str | None = Query(None, description="ISO format start date filter"),
    end_date: str | None = Query(None, description="ISO format end date filter"),
    min_cluster_size: int = Query(2, ge=2, description="Minimum complaints to qualify as a cluster"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return detected emerging grievance clusters and hotspot localities."""
    return detect_emerging_issues(
        db=db,
        start_date=start_date,
        end_date=end_date,
        min_cluster_size=min_cluster_size,
    )

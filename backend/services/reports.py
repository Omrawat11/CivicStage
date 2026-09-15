"""Departmental accountability reports and performance analytics service for CivicTriage.

Calculates deterministic, database-driven metrics:
- Received, resolved, and pending complaint counts
- Resolution rate (safe against zero-division)
- Outlier-resistant median resolution time (in hours)
- Distinct separation between duplicate vs repeat complaints
- Top locality identification with deterministic tie-breaking
- Factual emerging issue cluster detection
- Optional LLM-generated narrative summary using only pre-calculated stats
"""

import statistics
from datetime import datetime, timedelta
from typing import Any
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.db.models import Complaint
from backend.data.loader import load_taxonomy


def _filter_date_range(query, start_date: datetime | str | None, end_date: datetime | str | None):
    """Filter SQLAlchemy query by submission timestamp range if provided."""
    if start_date:
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)
        query = query.filter(Complaint.timestamp >= start_date)
    if end_date:
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date)
        query = query.filter(Complaint.timestamp <= end_date)
    return query


def calculate_department_metrics(
    db: Session,
    department_name: str,
    start_date: datetime | str | None = None,
    end_date: datetime | str | None = None,
) -> dict[str, Any]:
    """Calculate deterministic performance metrics for a single municipal department.

    Args:
        db: SQLAlchemy database session.
        department_name: Department name matching taxonomy (e.g., 'Water Supply').
        start_date: Optional start of reporting period.
        end_date: Optional end of reporting period.

    Returns:
        Structured department metrics dictionary.
    """
    # Match department in operator_department (if human reviewed) or ai_department
    base_query = db.query(Complaint).filter(
        or_(
            Complaint.operator_department == department_name,
            (Complaint.operator_department.is_(None) & (Complaint.ai_department == department_name)),
        )
    )
    base_query = _filter_date_range(base_query, start_date, end_date)

    complaints = base_query.all()
    received = len(complaints)

    if received == 0:
        return {
            "department": department_name,
            "complaints_received": 0,
            "complaints_resolved": 0,
            "complaints_pending": 0,
            "resolution_rate": 0.0,
            "median_resolution_time_hours": None,
            "repeat_complaints": 0,
            "duplicate_complaints": 0,
            "top_locality": None,
        }

    # Count resolved and pending
    resolved_complaints = [
        c for c in complaints
        if c.resolved_at is not None or c.status in ("Resolved", "Approved")
    ]
    resolved_count = len(resolved_complaints)
    pending_count = received - resolved_count

    # Resolution rate = (resolved / received) * 100 (safe from zero-division)
    resolution_rate = round((resolved_count / received) * 100, 1)

    # Median resolution time in hours for resolved complaints with valid timestamps
    resolution_durations_hours: list[float] = []
    for c in resolved_complaints:
        if c.resolved_at and c.timestamp and c.resolved_at >= c.timestamp:
            diff_hours = (c.resolved_at - c.timestamp).total_seconds() / 3600.0
            resolution_durations_hours.append(diff_hours)

    median_res_time: float | None = None
    if resolution_durations_hours:
        median_res_time = round(statistics.median(resolution_durations_hours), 1)

    # Distinct repeat vs duplicate counts
    # Duplicate = same incident cluster; Repeat = chronic recurring issue
    duplicate_count = sum(1 for c in complaints if c.duplicate_status == "duplicate")
    repeat_count = sum(1 for c in complaints if c.duplicate_status == "repeat")

    # Top locality with deterministic alphabetical tie-breaking
    locality_counts: dict[str, int] = {}
    for c in complaints:
        loc = c.operator_locality or c.ai_locality
        if loc and loc.strip():
            norm_loc = loc.strip()
            locality_counts[norm_loc] = locality_counts.get(norm_loc, 0) + 1

    top_locality: str | None = None
    if locality_counts:
        # Sort by count descending, then locality name alphabetically ascending for deterministic tie-breaking
        sorted_localities = sorted(
            locality_counts.items(),
            key=lambda item: (-item[1], item[0].lower())
        )
        top_locality = sorted_localities[0][0]

    return {
        "department": department_name,
        "complaints_received": received,
        "complaints_resolved": resolved_count,
        "complaints_pending": pending_count,
        "resolution_rate": resolution_rate,
        "median_resolution_time_hours": median_res_time,
        "repeat_complaints": repeat_count,
        "duplicate_complaints": duplicate_count,
        "top_locality": top_locality,
    }


def get_all_departments_comparison(
    db: Session,
    start_date: datetime | str | None = None,
    end_date: datetime | str | None = None,
) -> list[dict[str, Any]]:
    """Generate comparative performance statistics across all municipal departments."""
    taxonomy = load_taxonomy()
    departments = [d["name"] for d in taxonomy.get("departments", [])]

    results = [
        calculate_department_metrics(db, dept, start_date, end_date)
        for dept in departments
    ]

    # Sort departments by complaints received descending
    results.sort(key=lambda d: d["complaints_received"], reverse=True)
    return results


def detect_emerging_issues(
    db: Session,
    start_date: datetime | str | None = None,
    end_date: datetime | str | None = None,
    min_cluster_size: int = 2,
    max_time_span_hours: float | None = None,
) -> list[dict[str, Any]]:
    """Detect meaningful emerging grievance clusters using locality and incident data.

    Factual rule-based cluster detection based on:
    1. Incident clusters with multiple complaints
    2. Hotspot localities with concentrated grievance categories
    """
    query = db.query(Complaint)
    query = _filter_date_range(query, start_date, end_date)
    complaints = query.all()

    # Group by (locality, department, category)
    clusters: dict[tuple[str, str, str], list[Complaint]] = {}
    for c in complaints:
        loc = c.operator_locality or c.ai_locality
        dept = c.operator_department or c.ai_department
        cat = c.operator_category or c.ai_category
        if loc and dept and cat:
            key = (loc.strip(), dept.strip(), cat.strip())
            clusters.setdefault(key, []).append(c)

    emerging: list[dict[str, Any]] = []
    for (loc, dept, cat), items in clusters.items():
        if len(items) >= min_cluster_size:
            timestamps = [c.timestamp for c in items if c.timestamp]
            time_span_days = 0.0
            time_span_hours = 0.0
            first_seen_str: str | None = None
            last_seen_str: str | None = None
            if timestamps:
                min_t = min(timestamps)
                max_t = max(timestamps)
                first_seen_str = min_t.isoformat()
                last_seen_str = max_t.isoformat()
                time_span_hours = round((max_t - min_t).total_seconds() / 3600.0, 1)
                time_span_days = round(time_span_hours / 24.0, 1)

            if max_time_span_hours is not None and time_span_hours > max_time_span_hours:
                continue

            dup_count = sum(1 for c in items if c.duplicate_status == "duplicate")
            rep_count = sum(1 for c in items if c.duplicate_status == "repeat")

            # Extract matched incident ID if available
            matched_incidents = list({c.matched_incident_id for c in items if c.matched_incident_id})
            primary_incident = matched_incidents[0] if matched_incidents else None

            # Sort items newest first
            sorted_items = sorted(
                items,
                key=lambda x: x.timestamp or datetime.min,
                reverse=True,
            )

            complaint_ids = [c.complaint_id for c in sorted_items]
            related_complaints = [
                {
                    "complaint_id": c.complaint_id,
                    "source_channel": c.source_channel,
                    "urgency": c.operator_urgency or c.ai_urgency or "MEDIUM",
                    "status": c.status,
                    "timestamp": c.timestamp.isoformat() if c.timestamp else None,
                    "raw_text_snippet": (c.raw_text[:110] + "...") if len(c.raw_text) > 110 else c.raw_text,
                }
                for c in sorted_items
            ]

            emerging.append({
                "locality": loc,
                "department": dept,
                "category": cat,
                "incident_id": primary_incident,
                "complaints_count": len(items),
                "duplicate_count": dup_count,
                "repeat_count": rep_count,
                "time_span_hours": time_span_hours,
                "time_span_days": time_span_days,
                "first_seen": first_seen_str,
                "last_seen": last_seen_str,
                "complaint_ids": complaint_ids,
                "related_complaints": related_complaints,
                "summary": (
                    f"{len(items)} complaints recorded over {time_span_hours} hours in {loc} "
                    f"regarding {cat} ({dup_count} duplicate reports)."
                ),
            })

    # Sort emerging issues by complaint volume descending
    emerging.sort(key=lambda x: x["complaints_count"], reverse=True)
    return emerging[:10]  # Return top 10 meaningful clusters


def generate_report_narrative(stats: dict[str, Any]) -> str:
    """Generate an authoritative, factual executive narrative summary from pre-calculated statistics.

    CRITICAL RULE: The LLM/narrative generator receives ONLY pre-computed numbers
    and does NOT compute or fabricate statistics.
    """
    total = stats.get("total_complaints", 0)
    resolved = stats.get("total_resolved", 0)
    rate = stats.get("overall_resolution_rate", 0.0)
    dept_list = stats.get("departments", [])
    clusters = stats.get("emerging_issues", [])

    if not dept_list:
        return "No department complaint data recorded for the selected reporting period."

    top_dept = dept_list[0]
    top_name = top_dept["department"]
    top_received = top_dept["complaints_received"]
    top_loc = top_dept["top_locality"] or "various localities"

    narrative_parts = [
        f"During this reporting period, the municipal system logged a total of {total} citizen complaints, "
        f"of which {resolved} have been resolved (overall resolution rate of {rate}%)."
    ]

    narrative_parts.append(
        f"The {top_name} department received the highest volume of grievances with {top_received} reports, "
        f"with {top_loc} showing the highest localized concentration of issues."
    )

    if clusters:
        hotspot = clusters[0]
        narrative_parts.append(
            f"An active emerging cluster was detected in {hotspot['locality']} under {hotspot['department']} "
            f"({hotspot['category']}: {hotspot['complaints_count']} reports over {hotspot['time_span_days']} days, "
            f"including {hotspot['duplicate_count']} duplicate submissions). "
            f"Field inspection and priority resource allocation are recommended for this sector."
        )

    return " ".join(narrative_parts)


def generate_weekly_report(
    db: Session,
    start_date: datetime | str | None = None,
    end_date: datetime | str | None = None,
) -> dict[str, Any]:
    """Generate a complete municipal accountability report for a reporting period."""
    dept_comparison = get_all_departments_comparison(db, start_date, end_date)

    total_received = sum(d["complaints_received"] for d in dept_comparison)
    total_resolved = sum(d["complaints_resolved"] for d in dept_comparison)
    total_pending = sum(d["complaints_pending"] for d in dept_comparison)
    overall_rate = round((total_resolved / total_received) * 100, 1) if total_received > 0 else 0.0

    # Calculate overall median resolution time across all departments
    all_resolved_query = db.query(Complaint).filter(Complaint.resolved_at.isnot(None))
    all_resolved_query = _filter_date_range(all_resolved_query, start_date, end_date)
    all_durations = [
        (c.resolved_at - c.timestamp).total_seconds() / 3600.0
        for c in all_resolved_query.all()
        if c.resolved_at and c.timestamp and c.resolved_at >= c.timestamp
    ]
    overall_median_time = round(statistics.median(all_durations), 1) if all_durations else None

    emerging = detect_emerging_issues(db, start_date, end_date)

    report_payload = {
        "reporting_period": {
            "start_date": str(start_date) if start_date else None,
            "end_date": str(end_date) if end_date else None,
        },
        "total_complaints": total_received,
        "total_resolved": total_resolved,
        "total_pending": total_pending,
        "overall_resolution_rate": overall_rate,
        "overall_median_resolution_time_hours": overall_median_time,
        "departments": dept_comparison,
        "emerging_issues": emerging,
    }

    # Generate narrative summary based strictly on pre-computed numbers
    report_payload["narrative_summary"] = generate_report_narrative(report_payload)

    return report_payload

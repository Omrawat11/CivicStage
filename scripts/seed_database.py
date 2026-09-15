"""Database seeding script for CivicTriage Phase 3.

Populates the SQLite database from the synthetic complaints dataset (data/processed/complaints.csv)
without modifying the source CSV dataset.
Sets up realistic operational statuses (New, Pending Review, Approved, Edited, Rejected),
along with AI triage predictions, multi-factor urgency assessments, duplicate incident detection,
and safe citizen acknowledgement drafts.

Usage:
    uv run python scripts/seed_database.py
    or
    python scripts/seed_database.py
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure workspace root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.db.database import init_db, SessionLocal, Base, engine
from backend.db.models import Complaint
from backend.data.loader import load_complaints
from backend.services.duplicate import DuplicateService
from backend.services.urgency import UrgencyEngine
from backend.services.llm.base import ComplaintTriage
from backend.services.acknowledgement import generate_acknowledgement_draft


def seed_database(limit: int | None = None):
    """Seed the SQLite database with civic complaints."""
    csv_path = ROOT_DIR / "data" / "processed" / "complaints.csv"
    if not csv_path.exists():
        csv_path = ROOT_DIR / "data" / "raw" / "complaints_raw.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Source complaints CSV not found at {csv_path}")

    print(f"[*] Initializing database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    print(f"[*] Loading complaints from {csv_path}...")
    records = load_complaints(csv_path)
    if limit:
        records = records[:limit]
    print(f"[*] Loaded {len(records)} complaint records.")

    # Initialize intelligence services for realistic offline triage attributes
    print("[*] Initializing TF-IDF duplicate indexing and urgency rules...")
    duplicate_service = DuplicateService(historical_complaints=records)
    urgency_engine = UrgencyEngine()

    session = SessionLocal()
    try:
        # Clear existing records to ensure clean idempotent seeding
        session.query(Complaint).delete()
        session.commit()

        complaint_objects: list[Complaint] = []

        print("[*] Generating AI triage predictions and duplicate analysis...")
        for idx, rec in enumerate(records):
            # Compute duplicate analysis using Phase 2 DuplicateService
            dup_result = duplicate_service.analyze_complaint(
                complaint_text=rec.raw_text,
                category=rec.category_ground_truth,
                department=rec.department_ground_truth,
                locality=rec.locality_ground_truth,
                timestamp=rec.timestamp,
            )

            # Build mock ComplaintTriage for rule-based urgency evaluation
            triage_mock = ComplaintTriage(
                language=rec.language_ground_truth,
                department=rec.department_ground_truth,
                category=rec.category_ground_truth,
                locality=rec.locality_ground_truth,
                ward=rec.ward_ground_truth,
                duration="2 days",
                evidence=[rec.locality_ground_truth or "Bhopal", rec.category_ground_truth],
                summary=f"{rec.category_ground_truth} reported in {rec.locality_ground_truth or 'locality'}.",
                confidence=0.92,
            )
            urgency_res = urgency_engine.calculate_urgency(triage=triage_mock, raw_text=rec.raw_text)

            # Realistic operational status distribution:
            # - ~20% 'New' (untriaged, for testing live 'Triage' action)
            # - ~50% 'Pending Review' (triaged, ready for operator decision)
            # - ~15% 'Approved'
            # - ~10% 'Edited'
            # - ~5% 'Rejected'
            slot = idx % 20
            if slot in (0, 1, 2, 3):
                # New / Untriaged
                status = "New"
                ai_dept = None
                ai_cat = None
                ai_loc = None
                ai_ward = None
                ai_urg = None
                ai_urg_score = None
                ai_urg_factors = None
                ai_conf = None
                ai_ev = None
                ai_sum = None
                ack_draft = None
                op_dec = None
                op_dept = None
                op_cat = None
                op_loc = None
                op_ward = None
                op_urg = None
                op_notes = None
                op_reviewed_at = None
            else:
                # Triaged by AI
                ai_dept = rec.department_ground_truth
                ai_cat = rec.category_ground_truth
                ai_loc = rec.locality_ground_truth
                ai_ward = rec.ward_ground_truth
                ai_urg = urgency_res.level
                ai_urg_score = urgency_res.score
                ai_urg_factors = json.dumps(urgency_res.factors)
                ai_conf = 0.91
                ai_ev = json.dumps([rec.locality_ground_truth or "Bhopal", rec.category_ground_truth])
                ai_sum = f"{rec.category_ground_truth} issue flagged at {rec.locality_ground_truth or 'locality'}."

                ack_draft = generate_acknowledgement_draft(
                    complaint_id=rec.complaint_id,
                    department=ai_dept,
                    category=ai_cat,
                    locality=ai_loc,
                    ward=ai_ward,
                )

                if slot in range(4, 15):
                    # Pending Review
                    status = "Pending Review"
                    op_dec = None
                    op_dept = None
                    op_cat = None
                    op_loc = None
                    op_ward = None
                    op_urg = None
                    op_notes = None
                    op_reviewed_at = None
                elif slot in (15, 16, 17):
                    # Approved by operator
                    status = "Approved"
                    op_dec = "approve"
                    op_dept = ai_dept
                    op_cat = ai_cat
                    op_loc = ai_loc
                    op_ward = ai_ward
                    op_urg = ai_urg
                    op_notes = "Verified against field report. Forwarded to executive engineer."
                    op_reviewed_at = rec.timestamp + timedelta(hours=2)
                    ack_draft = generate_acknowledgement_draft(
                        complaint_id=rec.complaint_id,
                        department=op_dept,
                        category=op_cat,
                        locality=op_loc,
                        ward=op_ward,
                        decision="approve",
                        notes=op_notes,
                    )
                elif slot in (18,):
                    # Edited by operator (e.g. adjusted ward or department)
                    status = "Edited"
                    op_dec = "edit"
                    op_dept = ai_dept
                    op_cat = ai_cat
                    op_loc = ai_loc
                    op_ward = "72" if ai_ward != "72" else "45"
                    op_urg = "HIGH"
                    op_notes = "Re-assigned ward boundary and elevated urgency due to proximity to school."
                    op_reviewed_at = rec.timestamp + timedelta(hours=1, minutes=30)
                    ack_draft = generate_acknowledgement_draft(
                        complaint_id=rec.complaint_id,
                        department=op_dept,
                        category=op_cat,
                        locality=op_loc,
                        ward=op_ward,
                        decision="edit",
                        notes=op_notes,
                    )
                else:
                    # Rejected by operator
                    status = "Rejected"
                    op_dec = "reject"
                    op_dept = None
                    op_cat = None
                    op_loc = None
                    op_ward = None
                    op_urg = None
                    op_notes = "Non-actionable report; caller requested general municipal inquiry."
                    op_reviewed_at = rec.timestamp + timedelta(hours=3)
                    ack_draft = generate_acknowledgement_draft(
                        complaint_id=rec.complaint_id,
                        locality=rec.locality_ground_truth,
                        decision="reject",
                        notes=op_notes,
                    )

            complaint_obj = Complaint(
                complaint_id=rec.complaint_id,
                source_channel=rec.source_channel,
                timestamp=rec.timestamp,
                raw_text=rec.raw_text,
                language=rec.language_ground_truth,
                status=status,
                resolved_at=rec.resolved_at,
                # AI predictions
                ai_department=ai_dept,
                ai_category=ai_cat,
                ai_locality=ai_loc,
                ai_ward=ai_ward,
                ai_urgency=ai_urg,
                ai_urgency_score=ai_urg_score,
                ai_urgency_factors=ai_urg_factors,
                ai_confidence=ai_conf,
                ai_evidence=ai_ev,
                ai_summary=ai_sum,
                # Operator review
                operator_department=op_dept,
                operator_category=op_cat,
                operator_locality=op_loc,
                operator_ward=op_ward,
                operator_urgency=op_urg,
                operator_notes=op_notes,
                operator_decision=op_dec,
                operator_reviewed_at=op_reviewed_at,
                # Duplicate advisory
                duplicate_status=dup_result.status,
                matched_incident_id=dup_result.matched_incident_id,
                similarity_score=dup_result.similarity_score,
                cluster_complaints_count=dup_result.existing_complaints_count,
                duplicate_summary=dup_result.summary,
                incident_id=rec.incident_id,
                # Acknowledgement draft
                acknowledgement_draft=ack_draft,
            )
            complaint_objects.append(complaint_obj)

        session.bulk_save_objects(complaint_objects)
        session.commit()
        print(f"[+] Successfully seeded {len(complaint_objects)} complaints into SQLite database.")

        # Print summary
        total = session.query(Complaint).count()
        new_cnt = session.query(Complaint).filter_by(status="New").count()
        pending_cnt = session.query(Complaint).filter_by(status="Pending Review").count()
        approved_cnt = session.query(Complaint).filter_by(status="Approved").count()
        edited_cnt = session.query(Complaint).filter_by(status="Edited").count()
        rejected_cnt = session.query(Complaint).filter_by(status="Rejected").count()
        urgent_cnt = session.query(Complaint).filter(Complaint.ai_urgency.in_(["HIGH", "CRITICAL"])).count()
        dup_cnt = session.query(Complaint).filter(Complaint.duplicate_status.in_(["duplicate", "repeat"])).count()

        print("\n--- Seeding Summary ---")
        print(f"Total Complaints       : {total}")
        print(f"Status 'New'           : {new_cnt}")
        print(f"Status 'Pending Review': {pending_cnt}")
        print(f"Status 'Approved'      : {approved_cnt}")
        print(f"Status 'Edited'        : {edited_cnt}")
        print(f"Status 'Rejected'      : {rejected_cnt}")
        print(f"Urgent (HIGH/CRITICAL) : {urgent_cnt}")
        print(f"Duplicate / Repeat     : {dup_cnt}")
        print("-----------------------\n")

    finally:
        session.close()


if __name__ == "__main__":
    seed_database()

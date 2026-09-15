"""Model evaluation and benchmark assessment engine for CivicTriage.

Evaluates performance strictly on the held-out test dataset (data/test/complaints_test.csv).
CRITICAL DATA INTEGRITY GUARANTEE:
- Ground-truth columns are NEVER supplied to inference.
- Model receives only citizen raw_text and timestamp.
- Computes:
  - Department Accuracy
  - Category Accuracy
  - Locality Accuracy
  - Urgency Agreement (predicted urgency level == ground truth urgency level)
  - Duplicate Detection (Precision, Recall, F1 with exact TP/FP/FN/TN definitions)
  - Per-Department Accuracy Breakdown
  - Live Human Correction Rate from SQLite database operator decisions
"""

import csv
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any
from sqlalchemy.orm import Session

from backend.db.models import Complaint
from backend.services.triage import TriageService
from backend.services.llm.factory import get_llm_provider
from backend.services.duplicate import DuplicateService

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_TEST_CSV = ROOT_DIR / "data" / "test" / "complaints_test.csv"
DEFAULT_RESULTS_JSON = ROOT_DIR / "data" / "processed" / "evaluation_results.json"


async def evaluate_test_dataset(
    test_csv_path: Path | str | None = None,
    triage_service: TriageService | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    """Execute complete benchmark evaluation on the held-out test dataset.

    Args:
        test_csv_path: Path to held-out test CSV file.
        triage_service: Optional instantiated TriageService.
        limit: Optional maximum number of complaints to evaluate.

    Returns:
        Structured evaluation results dictionary.
    """
    csv_path = Path(test_csv_path or DEFAULT_TEST_CSV)
    if not csv_path.exists():
        raise FileNotFoundError(f"Held-out test dataset not found at: {csv_path}")

    # Read test dataset rows
    rows: list[dict[str, str]] = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    if limit:
        rows = rows[:limit]

    total_records = len(rows)
    if total_records == 0:
        raise ValueError("Held-out test dataset is empty.")

    # Initialize triage service if not provided
    svc = triage_service or TriageService()

    # Track accuracy counters
    dept_correct = 0
    cat_correct = 0
    loc_correct = 0
    urg_agree = 0

    # Per-department breakdown: {dept_name: {"total": 0, "correct": 0}}
    dept_breakdown: dict[str, dict[str, int]] = {}

    # Duplicate evaluation counters:
    # Ground-truth: a complaint is an active duplicate if its incident_id was already observed in test stream
    seen_incidents: set[str] = set()
    tp = 0  # Predicted duplicate and actually duplicate
    fp = 0  # Predicted duplicate but unique incident
    fn = 0  # Predicted unique but actually duplicate
    tn = 0  # Predicted unique and actually unique

    start_time = datetime.utcnow()

    for row in rows:
        # --- STRICT ISOLATION: Extract only citizen input fields ---
        raw_text = row["raw_text"]
        timestamp_str = row.get("timestamp")
        timestamp = datetime.fromisoformat(timestamp_str) if timestamp_str else datetime.utcnow()

        # Evaluation ground-truth (HIDDEN FROM INFERENCE)
        gt_dept = row["department_ground_truth"].strip()
        gt_cat = row["category_ground_truth"].strip()
        gt_loc = (row.get("locality_ground_truth") or "").strip()
        gt_urg = row.get("urgency_ground_truth", "Medium").strip()
        incident_id = row.get("incident_id", "").strip()

        # Run inference using only raw citizen complaint text and submission time
        res = await svc.triage_complaint(complaint=raw_text, timestamp=timestamp)

        # 1. Department Accuracy
        pred_dept = (res.final_department or "").strip()
        is_dept_match = pred_dept.lower() == gt_dept.lower()
        if is_dept_match:
            dept_correct += 1

        dept_stats = dept_breakdown.setdefault(gt_dept, {"total": 0, "correct": 0})
        dept_stats["total"] += 1
        if is_dept_match:
            dept_stats["correct"] += 1

        # 2. Category Accuracy
        pred_cat = (res.final_category or "").strip()
        if pred_cat.lower() == gt_cat.lower():
            cat_correct += 1

        # 3. Locality Accuracy
        pred_loc = (res.final_locality or "").strip()
        if not gt_loc:
            # If ground-truth has no locality, match if predicted is also None/empty
            if not pred_loc:
                loc_correct += 1
        else:
            if pred_loc.lower() == gt_loc.lower():
                loc_correct += 1

        # 4. Urgency Agreement (Definition: predicted urgency level == ground-truth level)
        pred_urg = res.urgency.level.strip().upper()
        if pred_urg == gt_urg.upper():
            urg_agree += 1

        # 5. Duplicate Detection Evaluation
        # Ground-truth: second or subsequent complaints sharing an incident_id are duplicates
        actual_is_duplicate = incident_id in seen_incidents if incident_id else False
        seen_incidents.add(incident_id)

        predicted_is_duplicate = (
            res.duplicate_analysis.is_duplicate or
            res.duplicate_analysis.status == "duplicate"
        )

        if predicted_is_duplicate and actual_is_duplicate:
            tp += 1
        elif predicted_is_duplicate and not actual_is_duplicate:
            fp += 1
        elif not predicted_is_duplicate and actual_is_duplicate:
            fn += 1
        else:
            tn += 1

    duration_seconds = round((datetime.utcnow() - start_time).total_seconds(), 2)

    # Compute aggregate percentages
    dept_acc = round((dept_correct / total_records) * 100, 1)
    cat_acc = round((cat_correct / total_records) * 100, 1)
    loc_acc = round((loc_correct / total_records) * 100, 1)
    urg_agree_pct = round((urg_agree / total_records) * 100, 1)

    # Duplicate precision, recall, F1
    dup_precision = round((tp / (tp + fp)) * 100, 1) if (tp + fp) > 0 else 0.0
    dup_recall = round((tp / (tp + fn)) * 100, 1) if (tp + fn) > 0 else 0.0
    dup_f1 = (
        round(2 * (dup_precision * dup_recall) / (dup_precision + dup_recall), 1)
        if (dup_precision + dup_recall) > 0 else 0.0
    )

    # Per-department metrics
    per_dept: dict[str, dict[str, Any]] = {}
    for d_name, d_counts in dept_breakdown.items():
        t = d_counts["total"]
        c = d_counts["correct"]
        per_dept[d_name] = {
            "total": t,
            "correct": c,
            "accuracy": round((c / t) * 100, 1) if t > 0 else 0.0,
        }

    provider_name = os.getenv("LLM_PROVIDER", "gemini")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "provider": provider_name,
        "model": model_name,
        "test_dataset_size": total_records,
        "duration_seconds": duration_seconds,
        "metrics": {
            "department_accuracy": dept_acc,
            "category_accuracy": cat_acc,
            "locality_accuracy": loc_acc,
            "urgency_agreement": urg_agree_pct,
            "duplicate_detection": {
                "precision": dup_precision,
                "recall": dup_recall,
                "f1": dup_f1,
                "true_positives": tp,
                "false_positives": fp,
                "false_negatives": fn,
                "true_negatives": tn,
                "definition": (
                    "True Positive: predicted duplicate when incident cluster matches an earlier test record. "
                    "Precision = TP / (TP + FP). Recall = TP / (TP + FN)."
                ),
            },
        },
        "per_department_metrics": per_dept,
    }


def calculate_human_correction_rate(db: Session) -> dict[str, Any]:
    """Calculate the live Human Correction Rate from actual operator review decisions in SQLite.

    Definition:
        (Number of reviewed complaints where operator changed the AI recommendation)
        /
        (Total number of reviewed complaints)
    """
    reviewed_query = db.query(Complaint).filter(Complaint.operator_decision.isnot(None))
    reviewed_complaints = reviewed_query.all()
    total_reviewed = len(reviewed_complaints)

    if total_reviewed == 0:
        return {
            "total_reviewed": 0,
            "corrections_count": 0,
            "human_correction_rate": 0.0,
            "status": "No complaints have been reviewed by a human operator yet.",
        }

    corrections_count = 0
    for c in reviewed_complaints:
        # Operator modified AI recommendation if:
        # - Explicit 'edit' or 'reject' decision was made
        # - Or operator fields differ from AI predictions
        changed = (
            c.operator_decision in ("edit", "reject") or
            (c.operator_department and c.operator_department != c.ai_department) or
            (c.operator_category and c.operator_category != c.ai_category) or
            (c.operator_locality and c.operator_locality != c.ai_locality) or
            (c.operator_ward and c.operator_ward != c.ai_ward) or
            (c.operator_urgency and c.operator_urgency != c.ai_urgency)
        )
        if changed:
            corrections_count += 1

    rate = round((corrections_count / total_reviewed) * 100, 1)

    return {
        "total_reviewed": total_reviewed,
        "corrections_count": corrections_count,
        "human_correction_rate": rate,
        "definition": (
            "Proportion of human-reviewed complaints where the operator modified or rejected the AI triage."
        ),
    }


def save_evaluation_results(results: dict[str, Any], output_path: Path | str | None = None) -> Path:
    """Save structured evaluation benchmark results to JSON file (excluding API keys)."""
    target = Path(output_path or DEFAULT_RESULTS_JSON)
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    return target


def load_latest_evaluation_results() -> dict[str, Any] | None:
    """Load previously saved evaluation benchmark results if available."""
    if DEFAULT_RESULTS_JSON.exists():
        try:
            with open(DEFAULT_RESULTS_JSON, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None
    return None

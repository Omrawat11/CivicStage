"""CivicTriage Phase 4 — Model Benchmark & Evaluation CLI Script.

Executes offline evaluation strictly on the held-out test dataset (data/test/complaints_test.csv).
Verifies model performance without leaking ground truth labels into inference.
Saves reproducible benchmark metrics to data/processed/evaluation_results.json.

Usage:
    uv run python scripts/evaluate.py
    or
    python scripts/evaluate.py
"""

import asyncio
import sys
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.db.database import SessionLocal
from backend.services.evaluation import (
    evaluate_test_dataset,
    calculate_human_correction_rate,
    save_evaluation_results,
    DEFAULT_TEST_CSV,
    DEFAULT_RESULTS_JSON,
)


async def main():
    print("=" * 70)
    print("  CIVICTRIAGE — PHASE 4 MODEL BENCHMARK & EVALUATION")
    print("=" * 70)
    print(f"[*] Held-out Test Dataset : {DEFAULT_TEST_CSV}")
    print(f"[*] Output Results File   : {DEFAULT_RESULTS_JSON}")
    print("[*] Running inference on held-out complaints without ground-truth leak...\n")

    # Run evaluation on held-out test dataset
    results = await evaluate_test_dataset(test_csv_path=DEFAULT_TEST_CSV)

    metrics = results["metrics"]
    dup = metrics["duplicate_detection"]
    per_dept = results["per_department_metrics"]

    # Calculate live human correction rate from database
    db = SessionLocal()
    try:
        human_stats = calculate_human_correction_rate(db)
    finally:
        db.close()

    results["human_in_the_loop"] = human_stats

    # Save to JSON
    saved_path = save_evaluation_results(results)

    # Print Report
    print("-" * 70)
    print(f"  EVALUATION RESULTS (Model: {results['model']} | Provider: {results['provider']})")
    print(f"  Test Dataset Size : {results['test_dataset_size']} complaints | Duration: {results['duration_seconds']}s")
    print("-" * 70)
    print(f"  Department Accuracy  : {metrics['department_accuracy']}%")
    print(f"  Category Accuracy    : {metrics['category_accuracy']}%")
    print(f"  Locality Accuracy    : {metrics['locality_accuracy']}%")
    print(f"  Urgency Agreement    : {metrics['urgency_agreement']}%")
    print("-" * 70)
    print("  DUPLICATE DETECTION PERFORMANCE")
    print("-" * 70)
    print(f"  Duplicate Precision  : {dup['precision']}%")
    print(f"  Duplicate Recall     : {dup['recall']}%")
    print(f"  Duplicate F1 Score   : {dup['f1']}%")
    print(f"  Breakdown (TP/FP/FN) : TP={dup['true_positives']} | FP={dup['false_positives']} | FN={dup['false_negatives']}")
    print("-" * 70)
    print("  ACCURACY BY DEPARTMENT")
    print("-" * 70)
    print(f"  {'Department':<24} {'Correct':<10} {'Total':<10} {'Accuracy':<10}")
    print(f"  {'-'*22:<24} {'-'*8:<10} {'-'*8:<10} {'-'*8:<10}")
    for dept_name, d_stats in sorted(per_dept.items()):
        print(f"  {dept_name:<24} {d_stats['correct']:<10} {d_stats['total']:<10} {d_stats['accuracy']:<10.1f}%")
    print("-" * 70)
    print("  HUMAN-IN-THE-LOOP METRICS (From SQLite)")
    print("-" * 70)
    print(f"  Reviewed Complaints  : {human_stats['total_reviewed']}")
    print(f"  Operator Corrections : {human_stats['corrections_count']}")
    print(f"  Human Correction Rate: {human_stats['human_correction_rate']}%")
    print("-" * 70)
    print(f"\n[+] Successfully saved benchmark results to: {saved_path}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

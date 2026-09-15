"""FastAPI API endpoints for model benchmark evaluation and human correction rate tracking."""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.services.evaluation import (
    evaluate_test_dataset,
    calculate_human_correction_rate,
    save_evaluation_results,
    load_latest_evaluation_results,
)

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.get("")
async def get_evaluation_metrics(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Retrieve the latest model benchmark evaluation metrics and live human correction rate.

    Returns:
        - department_accuracy
        - category_accuracy
        - locality_accuracy
        - urgency_agreement
        - duplicate_detection (precision, recall, f1)
        - human_correction_rate (calculated directly from SQLite operator decisions)
        - per_department_metrics
    """
    results = load_latest_evaluation_results()
    if results is None:
        # Compute if not yet cached
        results = await evaluate_test_dataset()
        save_evaluation_results(results)

    # Always compute fresh live human correction rate from current database state
    human_metrics = calculate_human_correction_rate(db)
    results["human_in_the_loop"] = human_metrics

    # Flat top-level convenience metrics
    metrics = results.get("metrics", {})
    dup = metrics.get("duplicate_detection", {})

    return {
        "timestamp": results.get("timestamp"),
        "provider": results.get("provider"),
        "model": results.get("model"),
        "test_dataset_size": results.get("test_dataset_size"),
        "department_accuracy": metrics.get("department_accuracy"),
        "category_accuracy": metrics.get("category_accuracy"),
        "locality_accuracy": metrics.get("locality_accuracy"),
        "urgency_agreement": metrics.get("urgency_agreement"),
        "duplicate_precision": dup.get("precision"),
        "duplicate_recall": dup.get("recall"),
        "duplicate_f1": dup.get("f1"),
        "duplicate_detection": dup,
        "human_correction_rate": human_metrics.get("human_correction_rate"),
        "human_in_the_loop": human_metrics,
        "per_department_metrics": results.get("per_department_metrics", {}),
    }


@router.post("/run")
async def run_evaluation_benchmark(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Trigger a fresh benchmark evaluation run across the held-out test dataset.

    Executes inference with strict ground-truth isolation, saves results,
    and returns refreshed metrics.
    """
    try:
        results = await evaluate_test_dataset()
        human_metrics = calculate_human_correction_rate(db)
        results["human_in_the_loop"] = human_metrics
        save_evaluation_results(results)

        metrics = results.get("metrics", {})
        dup = metrics.get("duplicate_detection", {})

        return {
            "status": "success",
            "message": "Evaluation completed and results updated.",
            "timestamp": results.get("timestamp"),
            "provider": results.get("provider"),
            "model": results.get("model"),
            "test_dataset_size": results.get("test_dataset_size"),
            "department_accuracy": metrics.get("department_accuracy"),
            "category_accuracy": metrics.get("category_accuracy"),
            "locality_accuracy": metrics.get("locality_accuracy"),
            "urgency_agreement": metrics.get("urgency_agreement"),
            "duplicate_precision": dup.get("precision"),
            "duplicate_recall": dup.get("recall"),
            "duplicate_f1": dup.get("f1"),
            "duplicate_detection": dup,
            "human_correction_rate": human_metrics.get("human_correction_rate"),
            "human_in_the_loop": human_metrics,
            "per_department_metrics": results.get("per_department_metrics", {}),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute evaluation run: {str(e)}",
        )

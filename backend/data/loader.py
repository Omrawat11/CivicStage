import csv
import json
from pathlib import Path
from backend.data.schemas import ComplaintRecord

DEFAULT_CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


def load_taxonomy(file_path: Path | str | None = None) -> dict:
    """Load and validate the departments taxonomy JSON."""
    path = Path(file_path) if file_path else DEFAULT_CONFIG_DIR / "departments.json"
    if not path.exists():
        raise FileNotFoundError(f"Taxonomy configuration file not found at: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "departments" not in data:
        raise ValueError("Invalid taxonomy schema: missing 'departments' key.")
    return data


def load_categories(file_path: Path | str | None = None) -> dict:
    """Load and validate categories metadata JSON."""
    path = Path(file_path) if file_path else DEFAULT_CONFIG_DIR / "categories.json"
    if not path.exists():
        raise FileNotFoundError(f"Categories configuration file not found at: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "categories" not in data:
        raise ValueError("Invalid categories schema: missing 'categories' key.")
    return data


def load_gazetteer(file_path: Path | str | None = None) -> dict:
    """Load and validate localities and wards gazetteer JSON."""
    path = Path(file_path) if file_path else DEFAULT_CONFIG_DIR / "localities.json"
    if not path.exists():
        raise FileNotFoundError(f"Gazetteer configuration file not found at: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "localities" not in data:
        raise ValueError("Invalid gazetteer schema: missing 'localities' key.")
    return data


def load_complaints(file_path: Path | str) -> list[ComplaintRecord]:
    """Load, parse, and validate a CSV dataset into ComplaintRecord Pydantic models.

    Args:
        file_path: Path to the CSV dataset file.

    Returns:
        List of validated ComplaintRecord objects.

    Raises:
        FileNotFoundError: If the CSV file does not exist.
        ValueError: If file cannot be read or fails Pydantic schema validation.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Complaint dataset not found at: {path}")

    records: list[ComplaintRecord] = []
    try:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, start=1):
                # Normalize empty or stringified nulls to None
                for key in ["locality_ground_truth", "ward_ground_truth", "resolved_at"]:
                    if row.get(key) in ("", "None", None):
                        row[key] = None
                try:
                    record = ComplaintRecord.model_validate(row)
                    records.append(record)
                except Exception as e:
                    raise ValueError(
                        f"Schema validation failed at row {idx} (ID: {row.get('complaint_id')}): {e}"
                    ) from e
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Failed to read CSV file {path}: {e}") from e

    return records

"""Output validation module ensuring LLM predictions conform to official taxonomy and gazetteer."""

from backend.services.llm.base import ComplaintTriage


def validate_triage_output(
    triage: ComplaintTriage,
    taxonomy: dict,
    gazetteer: dict,
) -> tuple[bool, list[str]]:
    """Validate LLM triage output strictly against municipal taxonomy and gazetteer.

    Rules:
    1. Department must exist in taxonomy.
    2. Category must belong to the specified department.
    3. Locality, if provided, must match a canonical gazetteer name.
    4. Ward, if provided, must match the gazetteer's mapped ward for that locality.
    5. If locality is null, ward must also be null.

    Args:
        triage: Parsed ComplaintTriage output from LLM.
        taxonomy: Loaded taxonomy dictionary.
        gazetteer: Loaded gazetteer dictionary.

    Returns:
        Tuple of (is_valid: bool, errors: list[str]).
    """
    errors: list[str] = []

    # 1. Validate department
    dept_map = {d["name"]: set(d["categories"]) for d in taxonomy.get("departments", [])}
    if triage.department not in dept_map:
        errors.append(
            f"Invalid department '{triage.department}'. Must be one of: {sorted(dept_map.keys())}"
        )
    else:
        # 2. Validate category under that department
        allowed_categories = dept_map[triage.department]
        if triage.category not in allowed_categories:
            errors.append(
                f"Invalid category '{triage.category}' for department '{triage.department}'. "
                f"Allowed categories: {sorted(allowed_categories)}"
            )

    # 3. Validate locality and ward against gazetteer
    gazetteer_localities = {l["name"]: l["ward"] for l in gazetteer.get("localities", [])}

    if triage.locality is not None:
        if triage.locality not in gazetteer_localities:
            errors.append(
                f"Unrecognized canonical locality '{triage.locality}'. Must exist in gazetteer or be null."
            )
        else:
            expected_ward = gazetteer_localities[triage.locality]
            if triage.ward is not None and str(triage.ward).strip() != expected_ward:
                errors.append(
                    f"Ward mismatch for locality '{triage.locality}': received '{triage.ward}', "
                    f"expected '{expected_ward}'."
                )
    else:
        # If locality is null, ward must be null
        if triage.ward is not None:
            errors.append(
                f"Inconsistent ward '{triage.ward}' provided when locality is null."
            )

    # 4. Confidence validation
    if not (0.0 <= triage.confidence <= 1.0):
        errors.append(f"Confidence score {triage.confidence} outside range [0.0, 1.0].")

    is_valid = len(errors) == 0
    return is_valid, errors

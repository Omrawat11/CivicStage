

"""Unit tests for CivicTriage Phase 1: Data Foundation.

Verifies taxonomy integrity, gazetteer validity, Pydantic schema validation,
dataset partitioning, duplicate incident clusters, operational resolution consistency,
and ground-truth references.
"""

from pathlib import Path
import pytest
from backend.data.loader import (
    load_taxonomy,
    load_categories,
    load_gazetteer,
    load_complaints,
)
from backend.data.schemas import ComplaintRecord

ROOT_DIR = Path(__file__).resolve().parent.parent
PROCESSED_DATA_PATH = ROOT_DIR / "data" / "processed" / "complaints.csv"
TEST_DATA_PATH = ROOT_DIR / "data" / "test" / "complaints_test.csv"


@pytest.fixture(scope="module")
def taxonomy_data():
    return load_taxonomy()


@pytest.fixture(scope="module")
def categories_data():
    return load_categories()


@pytest.fixture(scope="module")
def gazetteer_data():
    return load_gazetteer()


@pytest.fixture(scope="module")
def main_complaints():
    return load_complaints(PROCESSED_DATA_PATH)


@pytest.fixture(scope="module")
def test_complaints():
    return load_complaints(TEST_DATA_PATH)


def test_1_taxonomy_json_loads_correctly(taxonomy_data):
    """Test 1: Taxonomy JSON loads correctly and has required departments structure."""
    assert "departments" in taxonomy_data
    assert len(taxonomy_data["departments"]) >= 5
    for dept in taxonomy_data["departments"]:
        assert "name" in dept and isinstance(dept["name"], str)
        assert "categories" in dept and isinstance(dept["categories"], list)
        assert len(dept["categories"]) > 0


def test_2_categories_belong_to_configured_departments(taxonomy_data, categories_data):
    """Test 2: Every category belongs to a configured department."""
    dept_names = {d["name"] for d in taxonomy_data["departments"]}
    taxonomy_cats = set()
    for dept in taxonomy_data["departments"]:
        for cat in dept["categories"]:
            taxonomy_cats.add((cat, dept["name"]))

    for cat_item in categories_data["categories"]:
        assert cat_item["department"] in dept_names, (
            f"Category '{cat_item['name']}' references unknown department '{cat_item['department']}'"
        )
        assert (cat_item["name"], cat_item["department"]) in taxonomy_cats, (
            f"Category '{cat_item['name']}' not listed under department '{cat_item['department']}' in taxonomy"
        )


def test_3_locality_entries_contain_required_fields(gazetteer_data):
    """Test 3: Locality entries contain required fields (name, ward, aliases)."""
    assert "localities" in gazetteer_data
    assert len(gazetteer_data["localities"]) >= 30, "Gazetteer must contain at least 30 localities"
    for loc in gazetteer_data["localities"]:
        assert "name" in loc and isinstance(loc["name"], str) and loc["name"].strip()
        assert "ward" in loc and isinstance(loc["ward"], str) and loc["ward"].strip()
        assert "aliases" in loc and isinstance(loc["aliases"], list)


def test_4_aliases_are_valid(gazetteer_data):
    """Test 4: Aliases are valid non-empty lists of strings."""
    for loc in gazetteer_data["localities"]:
        assert len(loc["aliases"]) > 0, f"Locality '{loc['name']}' must have at least one alias"
        for alias in loc["aliases"]:
            assert isinstance(alias, str) and alias.strip(), (
                f"Locality '{loc['name']}' contains an invalid/empty alias"
            )


def test_5_generated_complaints_satisfy_schema(main_complaints, test_complaints):
    """Test 5: Generated complaints satisfy the Pydantic ComplaintRecord schema."""
    assert len(main_complaints) >= 500, f"Expected >= 500 main complaints, found {len(main_complaints)}"
    assert len(test_complaints) >= 80, f"Expected >= 80 test complaints, found {len(test_complaints)}"

    for r in main_complaints + test_complaints:
        assert isinstance(r, ComplaintRecord)
        assert r.complaint_id.startswith("CMP-")
        assert r.language_ground_truth in {"English", "Hindi", "Hinglish"}
        assert r.status in {"Pending", "In Progress", "Resolved"}
        assert len(r.raw_text) > 5


def test_6_all_complaint_ids_are_unique(main_complaints, test_complaints):
    """Test 6: All complaint IDs are strictly unique within each dataset and across both."""
    main_ids = [r.complaint_id for r in main_complaints]
    test_ids = [r.complaint_id for r in test_complaints]

    assert len(main_ids) == len(set(main_ids)), "Duplicate complaint IDs found within main dataset"
    assert len(test_ids) == len(set(test_ids)), "Duplicate complaint IDs found within test dataset"
    assert len(set(main_ids).intersection(set(test_ids))) == 0, (
        "Overlap found between main and test dataset complaint IDs"
    )


def test_7_test_dataset_is_separate_from_training_dataset(main_complaints, test_complaints):
    """Test 7: Held-out test dataset is strictly separate from the main dataset."""
    main_id_set = {r.complaint_id for r in main_complaints}
    test_id_set = {r.complaint_id for r in test_complaints}
    assert main_id_set.isdisjoint(test_id_set)

    # Verify test set has its own designated test incident identifiers
    test_inc_ids = {r.incident_id for r in test_complaints}
    main_inc_ids = {r.incident_id for r in main_complaints}
    assert main_inc_ids.isdisjoint(test_inc_ids), "Test incident IDs must not overlap with main dataset"


def test_8_duplicate_groups_actually_contain_multiple_complaints(main_complaints):
    """Test 8: Duplicate groups actually contain multiple complaints (>= 100 duplicate relationships)."""
    incident_to_complaints: dict[str, list[ComplaintRecord]] = {}
    for r in main_complaints:
        incident_to_complaints.setdefault(r.incident_id, []).append(r)

    multi_complaint_groups = {
        inc_id: comps for inc_id, comps in incident_to_complaints.items() if len(comps) > 1
    }

    assert len(multi_complaint_groups) >= 10, "Expected at least 10 duplicate groups of incidents"

    total_duplicate_complaints = sum(len(comps) for comps in multi_complaint_groups.values())
    assert total_duplicate_complaints >= 100, (
        f"Expected at least 100 complaints in duplicate groups, got {total_duplicate_complaints}"
    )

    # Check varying group sizes exist (e.g. at least one >= 5 and at least one >= 8)
    group_sizes = {len(comps) for comps in multi_complaint_groups.values()}
    assert any(size >= 5 for size in group_sizes), "Expected at least one duplicate group with >= 5 complaints"
    assert any(size >= 8 for size in group_sizes), "Expected at least one duplicate group with >= 8 complaints"


def test_9_resolved_complaints_have_resolved_at(main_complaints, test_complaints):
    """Test 9: Resolved complaints must have resolved_at timestamp greater than submission timestamp."""
    for r in main_complaints + test_complaints:
        if r.status == "Resolved":
            assert r.resolved_at is not None, f"Resolved complaint {r.complaint_id} missing resolved_at"
            assert r.resolved_at >= r.timestamp, (
                f"Resolved complaint {r.complaint_id} has resolved_at before submission timestamp"
            )


def test_10_pending_complaints_have_no_resolved_at(main_complaints, test_complaints):
    """Test 10: Pending complaints must have resolved_at set to None."""
    for r in main_complaints + test_complaints:
        if r.status == "Pending":
            assert r.resolved_at is None, f"Pending complaint {r.complaint_id} has non-null resolved_at"


def test_11_ground_truth_department_and_category_exist_in_taxonomy(
    main_complaints, test_complaints, taxonomy_data
):
    """Test 11: Every ground-truth department and category exists in the configured taxonomy."""
    valid_departments = {d["name"] for d in taxonomy_data["departments"]}
    dept_to_categories = {d["name"]: set(d["categories"]) for d in taxonomy_data["departments"]}

    for r in main_complaints + test_complaints:
        assert r.department_ground_truth in valid_departments, (
            f"Unknown department_ground_truth '{r.department_ground_truth}' in {r.complaint_id}"
        )
        assert r.category_ground_truth in dept_to_categories[r.department_ground_truth], (
            f"Category '{r.category_ground_truth}' does not exist under department "
            f"'{r.department_ground_truth}' in {r.complaint_id}"
        )


def test_12_ground_truth_locality_and_ward_exist_in_gazetteer(
    main_complaints, test_complaints, gazetteer_data
):
    """Test 12: Every ground-truth locality and ward exists in the configured gazetteer."""
    gazetteer_map = {l["name"]: l["ward"] for l in gazetteer_data["localities"]}

    for r in main_complaints + test_complaints:
        if r.locality_ground_truth is not None:
            assert r.locality_ground_truth in gazetteer_map, (
                f"Locality '{r.locality_ground_truth}' in {r.complaint_id} not found in gazetteer"
            )
            expected_ward = gazetteer_map[r.locality_ground_truth]
            assert r.ward_ground_truth == expected_ward, (
                f"Ward '{r.ward_ground_truth}' in {r.complaint_id} does not match gazetteer ward '{expected_ward}'"
            )

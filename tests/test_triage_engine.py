"""Unit tests for CivicTriage Phase 2: AI Triage & Intelligence Engine.

All tests run completely offline and require no external API keys or network access.
"""

from datetime import datetime, timedelta
import pytest

from backend.services.llm.base import ComplaintTriage
from backend.services.llm.gemini import GeminiProvider
from backend.services.validation import validate_triage_output
from backend.services.locality import LocalityService
from backend.services.urgency import UrgencyEngine, UrgencyResult
from backend.services.duplicate import DuplicateService
from backend.services.triage import TriageService
from backend.data.schemas import ComplaintRecord
from backend.data.loader import load_taxonomy, load_gazetteer


@pytest.fixture(scope="module")
def taxonomy():
    return load_taxonomy()


@pytest.fixture(scope="module")
def gazetteer():
    return load_gazetteer()


# =============================================================================
# 1. GEMINI PROVIDER TESTS (Offline Unit Tests)
# =============================================================================

@pytest.mark.asyncio
async def test_gemini_mock_output_parsing(taxonomy, gazetteer):
    """Test Gemini provider structured output parsing in mock/offline mode."""
    provider = GeminiProvider(api_key=None, allow_mock_fallback=True)
    result = await provider.classify_complaint("Kolar me paani nahi aa raha", taxonomy, gazetteer)

    assert isinstance(result, ComplaintTriage)
    assert result.department == "Water Supply"
    assert result.category == "Water outage"
    assert result.locality == "Kolar"
    assert result.ward == "80"
    assert 0.0 <= result.confidence <= 1.0


@pytest.mark.asyncio
async def test_gemini_missing_api_key_raises():
    """Test Gemini provider fails clearly when live API call requested without API key."""
    provider = GeminiProvider(api_key=None, allow_mock_fallback=False)
    with pytest.raises(ValueError, match="GEMINI_API_KEY is missing"):
        await provider.classify_complaint(
            "Water outage complaint",
            taxonomy={},
            gazetteer={},
            allow_mock=False,
        )


# =============================================================================
# 2. OUTPUT VALIDATION TESTS
# =============================================================================

def test_validation_valid_output(taxonomy, gazetteer):
    """Valid complaint triage output passes validation."""
    valid_triage = ComplaintTriage(
        language="Hinglish",
        department="Water Supply",
        category="Water outage",
        locality="Kolar",
        ward="80",
        duration="3 days",
        evidence=["Kolar", "paani nahi aa raha"],
        summary="Water outage in Kolar",
        confidence=0.9,
    )
    is_valid, errors = validate_triage_output(valid_triage, taxonomy, gazetteer)
    assert is_valid is True
    assert len(errors) == 0


def test_validation_invalid_department(taxonomy, gazetteer):
    """Validation rejects invented or non-existent departments."""
    invalid_triage = ComplaintTriage(
        language="English",
        department="Space Exploration",
        category="Pothole",
        locality="Kolar",
        ward="80",
        summary="Invalid dept",
        confidence=0.8,
    )
    is_valid, errors = validate_triage_output(invalid_triage, taxonomy, gazetteer)
    assert is_valid is False
    assert any("Invalid department" in e for e in errors)


def test_validation_category_department_mismatch(taxonomy, gazetteer):
    """Validation rejects category belonging to a different department."""
    mismatched_triage = ComplaintTriage(
        language="English",
        department="Water Supply",
        category="Pothole",  # Pothole belongs to Roads, not Water Supply
        locality="Kolar",
        ward="80",
        summary="Category mismatch",
        confidence=0.8,
    )
    is_valid, errors = validate_triage_output(mismatched_triage, taxonomy, gazetteer)
    assert is_valid is False
    assert any("Invalid category" in e for e in errors)


def test_validation_invalid_locality_and_ward(taxonomy, gazetteer):
    """Validation rejects unknown locality or ward mismatch."""
    bad_loc_triage = ComplaintTriage(
        language="English",
        department="Roads",
        category="Pothole",
        locality="Atlantis",
        ward="999",
        summary="Bad locality",
        confidence=0.8,
    )
    is_valid, errors = validate_triage_output(bad_loc_triage, taxonomy, gazetteer)
    assert is_valid is False
    assert any("Unrecognized canonical locality" in e for e in errors)

    # Locality null but ward provided
    null_loc_with_ward = ComplaintTriage(
        language="English",
        department="Roads",
        category="Pothole",
        locality=None,
        ward="80",
        summary="Locality null with ward",
        confidence=0.8,
    )
    is_valid, errors = validate_triage_output(null_loc_with_ward, taxonomy, gazetteer)
    assert is_valid is False
    assert any("Inconsistent ward" in e for e in errors)


# =============================================================================
# 3. LOCALITY NORMALIZATION TESTS
# =============================================================================

@pytest.mark.parametrize(
    "raw_input,expected_canonical,expected_ward",
    [
        ("Kolar", "Kolar", "80"),
        ("Kolar Road", "Kolar", "80"),
        ("Kolar side", "Kolar", "80"),
        ("कोलार", "Kolar", "80"),
        ("MP Nagar", "MP Nagar", "47"),
        ("M.P. Nagar", "MP Nagar", "47"),
        ("एमपी नगर", "MP Nagar", "47"),
        ("Arera Colony", "Arera Colony", "48"),
        ("अरेरा कॉलोनी", "Arera Colony", "48"),
    ],
)
def test_locality_normalization_aliases(gazetteer, raw_input, expected_canonical, expected_ward):
    """Verify English, Hindi, and Hinglish aliases resolve to canonical locality and ward."""
    service = LocalityService(gazetteer)
    res = service.normalize_locality(raw_input)
    assert res.status == "resolved"
    assert res.canonical_name == expected_canonical
    assert res.ward == expected_ward


def test_locality_normalization_unknown_and_ambiguous(gazetteer):
    """Verify unresolved and ambiguous locality scenarios."""
    service = LocalityService(gazetteer)

    # Unknown
    res_unknown = service.normalize_locality("NonExistentPlaceXYZ")
    assert res_unknown.status == "unresolved"
    assert res_unknown.canonical_name is None
    assert res_unknown.ward is None

    # None / Empty
    res_none = service.normalize_locality(None)
    assert res_none.status == "unresolved"

    # Ambiguous term matching multiple localities (e.g. 'nagar' which occurs in Gandhi Nagar, MP Nagar, TT Nagar)
    res_ambiguous = service.normalize_locality("Nagar")
    assert res_ambiguous.status == "ambiguous"
    assert len(res_ambiguous.candidates) > 1


# =============================================================================
# 4. URGENCY ENGINE TESTS
# =============================================================================

def test_urgency_levels_and_boundaries():
    """Test calculation across all urgency levels and score boundaries."""
    engine = UrgencyEngine()

    # 1. CRITICAL: Exposed wiring on pole (5 safety) + outage/wires + duration + scale
    critical_triage = ComplaintTriage(
        language="English",
        department="Street Lighting",
        category="Exposed wiring on pole",
        duration="3 days",
        evidence=["naked live wire", "current risk"],
        summary="Live electrical wire hanging on pole opposite school with power cut",
        confidence=0.95,
    )
    res_crit = engine.calculate_urgency(
        critical_triage,
        raw_text="naked wires risk of electrocution accident on main road opposite school with complete power cut for 3 days",
    )
    assert res_crit.level == "CRITICAL"
    assert 10 <= res_crit.score <= 12

    # 2. HIGH: Water outage (outage: 3, duration: 2, scale: 2 = 7)
    high_triage = ComplaintTriage(
        language="Hinglish",
        department="Water Supply",
        category="Water outage",
        locality="Kolar",
        duration="4 days",
        evidence=["paani nahi aa raha"],
        summary="Water supply outage in entire colony for 4 days",
        confidence=0.9,
    )
    res_high = engine.calculate_urgency(high_triage, raw_text="entire colony me 4 din se no water supply")
    assert res_high.level == "HIGH"
    assert 7 <= res_high.score <= 9

    # 3. MEDIUM: Pothole (safety: 3, scale: 1, duration: 1 = 5)
    medium_triage = ComplaintTriage(
        language="English",
        department="Roads",
        category="Pothole",
        duration="yesterday",
        summary="Pothole on lane road",
        confidence=0.85,
    )
    res_med = engine.calculate_urgency(medium_triage, raw_text="pothole noticed yesterday on road")
    assert res_med.level == "MEDIUM"
    assert 4 <= res_med.score <= 6

    # 4. LOW: Streetlight flickering (outage: 1, duration: 0, scale: 0 = 1)
    low_triage = ComplaintTriage(
        language="English",
        department="Street Lighting",
        category="Flickering streetlight",
        duration=None,
        summary="Streetlight flickering opposite my house",
        confidence=0.9,
    )
    res_low = engine.calculate_urgency(low_triage, raw_text="bulb flickering near my house")
    assert res_low.level == "LOW"
    assert 0 <= res_low.score <= 3


# =============================================================================
# 5. DUPLICATE & REPEAT DETECTION TESTS
# =============================================================================

def test_duplicate_and_repeat_detection():
    """Verify semantic duplicate clustering vs chronic repeat complaint discrimination."""
    base_time = datetime(2026, 7, 10, 10, 0, 0)

    # Indexed historical incident in Kolar
    hist_record = ComplaintRecord(
        complaint_id="CMP-001",
        source_channel="Mobile App",
        timestamp=base_time,
        raw_text="Kolar me 3 din se paani nahi aa raha hai, tap water band hai",
        language_ground_truth="Hinglish",
        department_ground_truth="Water Supply",
        category_ground_truth="Water outage",
        locality_ground_truth="Kolar",
        ward_ground_truth="80",
        urgency_ground_truth="High",
        incident_id="INC-0101",
        status="In Progress",
    )

    dup_service = DuplicateService(historical_complaints=[hist_record])

    # Case A: CLEARLY SIMILAR complaint in Kolar 6 hours later -> DUPLICATE
    res_dup = dup_service.analyze_complaint(
        complaint_text="Kolar side paani bilkul nahi aa raha hai tap water stopped",
        category="Water outage",
        department="Water Supply",
        locality="Kolar",
        timestamp=base_time + timedelta(hours=6),
    )
    assert res_dup.is_duplicate is True
    assert res_dup.is_repeat is False
    assert res_dup.status == "duplicate"
    assert res_dup.matched_incident_id == "INC-0101"

    # Case B: SIMILAR COMPLAINT BUT DIFFERENT LOCALITY -> NOT A DUPLICATE
    res_diff_loc = dup_service.analyze_complaint(
        complaint_text="Arera Colony me 3 din se paani nahi aa raha hai",
        category="Water outage",
        department="Water Supply",
        locality="Arera Colony",
        timestamp=base_time + timedelta(hours=6),
    )
    assert res_diff_loc.is_duplicate is False

    # Case C: SAME LOCALITY BUT COMPLETELY DIFFERENT ISSUE -> NOT A DUPLICATE
    res_diff_cat = dup_service.analyze_complaint(
        complaint_text="Kolar main road par bada pothole hai gaddhe hain",
        category="Pothole",
        department="Roads",
        locality="Kolar",
        timestamp=base_time + timedelta(hours=6),
    )
    assert res_diff_cat.is_duplicate is False

    # Case D: SAME PROBLEM IN SAME LOCALITY 30 DAYS LATER -> REPEAT COMPLAINT, NOT DUPLICATE
    res_repeat = dup_service.analyze_complaint(
        complaint_text="Kolar me paani ki supply band hai tap water issue",
        category="Water outage",
        department="Water Supply",
        locality="Kolar",
        timestamp=base_time + timedelta(days=30),
    )
    assert res_repeat.is_duplicate is False
    assert res_repeat.is_repeat is True
    assert res_repeat.status == "repeat"


# =============================================================================
# 6. END-TO-END TRIAGESERVICE COORDINATION TEST
# =============================================================================

@pytest.mark.asyncio
async def test_triage_service_pipeline():
    """Verify full TriageService coordination through all 6 stages."""
    service = TriageService()
    result = await service.triage_complaint(
        complaint="Kolar me 3 din se paani nahi aa raha hai. Bahut dikkat ho rahi hai.",
        timestamp=datetime(2026, 8, 1, 12, 0),
        allow_mock=True,
    )

    assert result.raw_complaint.startswith("Kolar me 3 din")
    assert result.validation_passed is True
    assert result.final_department == "Water Supply"
    assert result.final_category == "Water outage"
    assert result.final_locality == "Kolar"
    assert result.final_ward == "80"
    assert result.urgency.score >= 4
    assert result.urgency.level in {"MEDIUM", "HIGH"}

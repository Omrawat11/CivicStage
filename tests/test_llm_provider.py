import pytest
from pydantic import ValidationError

from backend.services.llm.base import ComplaintTriage
from backend.services.llm.factory import get_llm_provider
from backend.services.llm.gemini import GeminiProvider
from backend.services.llm.groq import GroqProvider


def test_complaint_triage_valid():
    """Test 1 — Pydantic validation: A valid ComplaintTriage object should validate."""
    triage = ComplaintTriage(
        language="Hinglish",
        department="Water Supply",
        category="Water outage",
        locality="Kolar",
        ward="80",
        duration="3 days",
        evidence=["Kolar", "3 din se", "paani nahi aa raha"],
        summary="Water supply unavailable in Kolar for 3 days.",
        confidence=0.93,
    )
    assert triage.language == "Hinglish"
    assert triage.department == "Water Supply"
    assert triage.category == "Water outage"
    assert triage.locality == "Kolar"
    assert triage.ward == "80"
    assert triage.duration == "3 days"
    assert len(triage.evidence) == 3
    assert triage.confidence == 0.93


@pytest.mark.parametrize("invalid_confidence", [-0.1, 1.1, 2.0, -1.0])
def test_complaint_triage_invalid_confidence(invalid_confidence):
    """Test 2 — Invalid confidence: A confidence value outside 0 <= confidence <= 1 should fail validation."""
    with pytest.raises(ValidationError):
        ComplaintTriage(
            language="Hindi",
            department="Roads",
            category="Pothole",
            locality=None,
            ward=None,
            duration=None,
            evidence=[],
            summary="Pothole complaint",
            confidence=invalid_confidence,
        )


def test_gemini_provider_creation_without_api_key(monkeypatch):
    """Test 3 — Gemini provider creation: Can instantiate GeminiProvider without an API key."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    provider = GeminiProvider()
    assert isinstance(provider, GeminiProvider)
    assert provider.api_key is None


def test_groq_provider_creation_without_api_key(monkeypatch):
    """Test 4 — Groq provider creation: Can instantiate GroqProvider without an API key."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    provider = GroqProvider()
    assert isinstance(provider, GroqProvider)
    assert provider.api_key is None


def test_factory_selects_gemini(monkeypatch):
    """Test 5 — Factory selects Gemini: When LLM_PROVIDER=gemini, factory returns GeminiProvider."""
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    provider = get_llm_provider()
    assert isinstance(provider, GeminiProvider)

    explicit_provider = get_llm_provider("gemini")
    assert isinstance(explicit_provider, GeminiProvider)


def test_factory_selects_groq(monkeypatch):
    """Test 6 — Factory selects Groq: When LLM_PROVIDER=groq, factory returns GroqProvider."""
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    provider = get_llm_provider()
    assert isinstance(provider, GroqProvider)

    explicit_provider = get_llm_provider("groq")
    assert isinstance(explicit_provider, GroqProvider)


def test_factory_invalid_provider():
    """Test 7 — Invalid provider: Unsupported value should raise a clear error."""
    with pytest.raises(ValueError, match="Unsupported LLM provider"):
        get_llm_provider("unsupported_provider")


@pytest.mark.asyncio
async def test_mock_classification():
    """Test 8 & 9 — Mock classification: Verify provider works with schema without external API calls."""
    complaint = "Kolar me 3 din se paani nahi aa raha hai. Bahut dikkat ho rahi hai."
    taxonomy = {
        "departments": [
            {
                "name": "Water Supply",
                "categories": ["Water outage", "Water leakage"],
            },
            {
                "name": "Roads",
                "categories": ["Pothole", "Road damage"],
            },
        ]
    }
    gazetteer = {
        "localities": [
            {
                "name": "Kolar",
                "ward": "80",
                "aliases": ["Kolar Road", "Kolar side"],
            }
        ]
    }

    for provider_name in ["gemini", "groq"]:
        provider = get_llm_provider(provider_name)
        result = await provider.classify_complaint(complaint, taxonomy, gazetteer)

        assert isinstance(result, ComplaintTriage)
        assert result.language == "Hinglish"
        assert result.department == "Water Supply"
        assert result.category == "Water outage"
        assert result.locality == "Kolar"
        assert result.ward == "80"
        assert result.duration == "3 days"
        assert isinstance(result.evidence, list)
        assert len(result.evidence) > 0
        assert isinstance(result.summary, str)
        assert 0.0 <= result.confidence <= 1.0

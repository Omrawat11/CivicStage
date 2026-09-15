"""Live integration test for Gemini LLM provider using real Gemini API calls.

This module requires a valid GEMINI_API_KEY in the environment or .env file.
If the API key is not configured, tests in this module are automatically skipped.
"""

import os
import pytest
from dotenv import load_dotenv

from backend.services.llm.gemini import GeminiProvider
from backend.services.llm.base import ComplaintTriage
from backend.services.validation import validate_triage_output
from backend.data.loader import load_taxonomy, load_gazetteer

load_dotenv()

GEMINI_KEY = os.getenv("GEMINI_API_KEY")
pytestmark = pytest.mark.skipif(
    not GEMINI_KEY,
    reason="SKIPPED — Gemini API key not configured",
)


@pytest.fixture(scope="module")
def taxonomy():
    return load_taxonomy()


@pytest.fixture(scope="module")
def gazetteer():
    return load_gazetteer()


@pytest.fixture(scope="module")
def live_gemini_provider():
    return GeminiProvider(api_key=GEMINI_KEY, allow_mock_fallback=False)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "complaint_text,expected_lang",
    [
        ("Kolar me 3 din se paani nahi aa raha hai.", "Hinglish"),
        ("कोलार में तीन दिन से पानी की सप्लाई बंद है।", "Hindi"),
        ("Water supply has been unavailable in Kolar for three days.", "English"),
        ("bhai kolar side 3 din se water nhi aa rha", "Hinglish"),
    ],
)
async def test_live_gemini_multilingual_triage(
    live_gemini_provider, taxonomy, gazetteer, complaint_text, expected_lang
):
    """Test live Gemini structured output classification on multilingual civic complaints."""
    result = await live_gemini_provider.classify_complaint(
        complaint=complaint_text,
        taxonomy=taxonomy,
        gazetteer=gazetteer,
        allow_mock=False,
    )

    assert isinstance(result, ComplaintTriage)
    assert result.department == "Water Supply"
    assert result.category in {"Water outage", "Low water pressure"}
    assert result.locality == "Kolar"
    assert result.ward == "80"
    assert 0.0 <= result.confidence <= 1.0
    assert len(result.evidence) > 0

    # Validate strictly against taxonomy and gazetteer
    is_valid, errors = validate_triage_output(result, taxonomy, gazetteer)
    assert is_valid is True, f"Live Gemini output failed validation: {errors}"

import os
from google import genai
from google.genai import types
from backend.services.llm.base import LLMProvider, ComplaintTriage
from backend.services.llm.prompts import build_triage_prompt


class GeminiProvider(LLMProvider):
    """Gemini LLM Provider implementation for CivicTriage using official Google GenAI SDK."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        allow_mock_fallback: bool = True,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.allow_mock_fallback = allow_mock_fallback

    async def classify_complaint(
        self,
        complaint: str,
        taxonomy: dict,
        gazetteer: dict,
        allow_mock: bool | None = None,
    ) -> ComplaintTriage:
        """Classify a civic complaint using Gemini LLM with structured output.

        Args:
            complaint: Citizen complaint text.
            taxonomy: Configured municipal departments and categories.
            gazetteer: Configured localities and wards.
            allow_mock: Override instance fallback setting. If False and api_key is missing, raises ValueError.

        Returns:
            Validated ComplaintTriage Pydantic model.

        Raises:
            ValueError: If live API call requested without a configured GEMINI_API_KEY.
        """
        can_mock = self.allow_mock_fallback if allow_mock is None else allow_mock

        if not self.api_key:
            if not can_mock:
                raise ValueError(
                    "GEMINI_API_KEY is missing. Live Gemini API calls require GEMINI_API_KEY "
                    "configured in environment variables or .env file."
                )
            # Offline mock response for testing without API keys
            return ComplaintTriage(
                language="Hinglish",
                department="Water Supply",
                category="Water outage",
                locality="Kolar",
                ward="80",
                duration="3 days",
                evidence=["Kolar", "3 din se", "paani nahi aa raha"],
                summary="Water supply has been unavailable in Kolar for three days.",
                confidence=0.93,
            )

        # Build prompt using dedicated template
        prompt = build_triage_prompt(complaint, taxonomy, gazetteer)

        # Initialize official Google GenAI Client
        client = genai.Client(api_key=self.api_key)

        response = await client.aio.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ComplaintTriage,
                temperature=0.1,
            ),
        )

        if hasattr(response, "parsed") and isinstance(response.parsed, ComplaintTriage):
            return response.parsed

        # Fallback to parsing response text
        return ComplaintTriage.model_validate_json(response.text)

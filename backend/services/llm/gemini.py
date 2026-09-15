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

    @property
    def supports_multimodal(self) -> bool:
        """Gemini 2.0 Flash natively supports multimodal vision inputs."""
        return True

    async def analyze_image_complaint(
        self,
        image_bytes: bytes,
        mime_type: str,
        caption: str | None = None,
    ) -> str:
        """Analyze civic complaint photo and optional caption using Gemini vision.

        Returns a rich textual complaint statement for the standard triage pipeline.
        """
        if not self.api_key:
            # Deterministic mock visual analysis for offline / test environments
            caption_text = caption.strip() if caption else ""
            lower_cap = caption_text.lower()
            if "pothole" in lower_cap or "road" in lower_cap:
                return (
                    f"Visual Evidence: Photo shows a severe deep pothole and broken asphalt hazard on the road. "
                    f"Citizen caption: '{caption_text or 'Road near Kolar has a dangerous pothole'}'."
                )
            elif "garbage" in lower_cap or "kachra" in lower_cap or "waste" in lower_cap:
                return (
                    f"Visual Evidence: Photo shows an overflowing municipal garbage dump with uncollected waste scattered on the street. "
                    f"Citizen caption: '{caption_text or 'Garbage not cleared for days'}'."
                )
            elif "water" in lower_cap or "leak" in lower_cap or "pipe" in lower_cap:
                return (
                    f"Visual Evidence: Photo shows high-pressure water leaking from a broken municipal pipeline onto the road. "
                    f"Citizen caption: '{caption_text or 'Water pipeline burst and flooding the lane'}'."
                )
            else:
                return (
                    f"Visual Evidence: Municipal civic issue identified from citizen photograph showing damaged infrastructure. "
                    f"Citizen caption: '{caption_text or 'Civic grievance reported with photo'}'."
                )

        client = genai.Client(api_key=self.api_key)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        prompt = (
            "Analyze this civic complaint photograph submitted by a citizen in Bhopal, India. "
            f"Citizen Caption: '{caption or 'None provided'}'.\n\n"
            "Provide a concise, factual 2-3 sentence civic complaint statement identifying:\n"
            "1. The specific municipal infrastructure problem observed (e.g., road pothole, leaking water pipeline, overflowing garbage, broken street light, blocked drain).\n"
            "2. Visual severity and hazard level.\n"
            "3. Any visible locality or landmark cues.\n"
            "Output only the clean factual complaint text for triage routing."
        )

        response = await client.aio.models.generate_content(
            model=self.model,
            contents=[prompt, image_part],
        )
        return response.text.strip() if response.text else f"Civic issue reported with photo. Caption: {caption or ''}"

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

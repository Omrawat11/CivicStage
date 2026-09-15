import os
from backend.services.llm.base import LLMProvider, ComplaintTriage


class GroqProvider(LLMProvider):
    """Groq LLM Provider implementation for CivicTriage."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    @property
    def supports_multimodal(self) -> bool:
        """Groq provider in CivicTriage currently targets text models only."""
        return False

    async def analyze_image_complaint(
        self,
        image_bytes: bytes,
        mime_type: str,
        caption: str | None = None,
    ) -> str:
        """Explicit capability check preventing unsupported vision execution."""
        raise NotImplementedError(
            "GroqProvider does not support multimodal vision inputs. "
            "Use GeminiProvider for image-based complaint intake."
        )

    async def classify_complaint(
        self,
        complaint: str,
        taxonomy: dict,
        gazetteer: dict,
    ) -> ComplaintTriage:
        """Classify a civic complaint using Groq LLM.

        Currently operates without making real external API calls (Phase 0).
        """
        # =========================================================================
        # TODO: REAL GROQ API INTEGRATION (Future Phase)
        # =========================================================================
        # When GROQ_API_KEY is provided:
        # 1. Initialize Groq SDK client (e.g. groq.AsyncGroq(api_key=self.api_key))
        # 2. Format prompt with taxonomy, gazetteer, and complaint
        # 3. Call chat.completions.create with json mode or structured output
        # 4. Parse response into ComplaintTriage object
        # =========================================================================

        # Mock classification response for Phase 0 testing
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

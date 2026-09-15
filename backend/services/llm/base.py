from abc import ABC, abstractmethod
from pydantic import BaseModel, Field


class ComplaintTriage(BaseModel):
    """Common Pydantic schema for civic complaint triage results."""
    language: str
    department: str
    category: str
    locality: str | None = None
    ward: str | None = None
    duration: str | None = None
    evidence: list[str] = Field(default_factory=list)
    summary: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class LLMProvider(ABC):
    """Abstract base class for all LLM providers in CivicTriage."""

    @property
    def supports_multimodal(self) -> bool:
        """Whether this provider supports native multimodal image intake."""
        return False

    @abstractmethod
    async def classify_complaint(
        self,
        complaint: str,
        taxonomy: dict,
        gazetteer: dict,
    ) -> ComplaintTriage:
        """Classify a civic complaint using the provider's LLM logic or mock."""
        ...

    async def analyze_image_complaint(
        self,
        image_bytes: bytes,
        mime_type: str,
        caption: str | None = None,
    ) -> str:
        """Extract a structured text complaint description from an image and optional citizen caption.

        Subclasses supporting vision (e.g. GeminiProvider) implement this to extract
        a comprehensive text representation for the downstream triage pipeline.
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support multimodal image analysis."
        )

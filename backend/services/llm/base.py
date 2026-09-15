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

    @abstractmethod
    async def classify_complaint(
        self,
        complaint: str,
        taxonomy: dict,
        gazetteer: dict,
    ) -> ComplaintTriage:
        """Classify a civic complaint using the provider's LLM logic or mock."""
        ...

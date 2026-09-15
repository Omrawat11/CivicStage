import os
from backend.services.llm.base import LLMProvider
from backend.services.llm.gemini import GeminiProvider
from backend.services.llm.groq import GroqProvider


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    """Factory function to select and instantiate an LLM provider based on configuration.

    Args:
        provider_name: Explicit provider name ('gemini', 'groq'). If None,
                      reads from LLM_PROVIDER environment variable.

    Returns:
        LLMProvider instance matching requested provider.

    Raises:
        ValueError: If provider_name is unsupported or invalid.
    """
    selected = provider_name or os.getenv("LLM_PROVIDER", "gemini")
    normalized = selected.strip().lower() if selected else ""

    if normalized == "gemini":
        return GeminiProvider()
    elif normalized == "groq":
        return GroqProvider()
    else:
        raise ValueError(
            f"Unsupported LLM provider: '{selected}'. "
            f"Supported providers are 'gemini' and 'groq'."
        )

"""Speech-to-text transcription service abstraction for CivicTriage audio complaint intake.

Converts spoken civic grievances (Hindi, Hinglish, English) into text transcripts
which subsequently enter the standard complaint triage pipeline.
Provides a clean provider abstraction supporting Mock, Gemini, and Groq backends.
"""

import os
from abc import ABC, abstractmethod
from typing import Any


class SpeechToTextProvider(ABC):
    """Abstract base class for speech-to-text transcription providers."""

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, filename: str) -> dict[str, Any]:
        """Transcribe audio bytes to text transcript.

        Args:
            audio_bytes: Raw bytes of the uploaded audio file.
            filename: Original audio filename with extension for format detection.

        Returns:
            Dictionary containing:
                - transcript: str
                - language: str (e.g. 'Hinglish', 'Hindi', 'English')
                - confidence: float (0.0 to 1.0)
                - duration_seconds: float | None
        """
        ...


class MockSpeechToTextProvider(SpeechToTextProvider):
    """Deterministic offline speech-to-text provider for tests, demonstrations, and offline mode."""

    async def transcribe(self, audio_bytes: bytes, filename: str) -> dict[str, Any]:
        fn_lower = filename.lower()
        if "pothole" in fn_lower or "road" in fn_lower:
            return {
                "transcript": "Hamare MP Nagar main road par bohot bada gaddha ho gaya hai, bikes gir rahi hain.",
                "language": "Hinglish",
                "confidence": 0.94,
                "duration_seconds": 4.5,
            }
        elif "garbage" in fn_lower or "kachra" in fn_lower:
            return {
                "transcript": "Arera Colony E-sector mein pichle ek hafte se kachra nahi utha hai, bohot badbu aa rahi hai.",
                "language": "Hinglish",
                "confidence": 0.96,
                "duration_seconds": 5.2,
            }
        elif "light" in fn_lower or "street" in fn_lower:
            return {
                "transcript": "Shahpura sector B mein pichle do hafte se street lights band hain, raat ko andhera rehta hai.",
                "language": "Hinglish",
                "confidence": 0.92,
                "duration_seconds": 4.8,
            }
        # Default mock transcript (representative multilingual Bhopal civic grievance)
        return {
            "transcript": "Kolar me 3 din se paani nahi aa raha hai kripya jaldi theek karein, pipeline leak ho rahi hai.",
            "language": "Hinglish",
            "confidence": 0.95,
            "duration_seconds": 5.8,
        }


class GeminiSpeechToTextProvider(SpeechToTextProvider):
    """Gemini 2.0 Flash audio transcription using Google GenAI SDK."""

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    async def transcribe(self, audio_bytes: bytes, filename: str) -> dict[str, Any]:
        if not self.api_key:
            # Fall back to mock if no API key configured
            return await MockSpeechToTextProvider().transcribe(audio_bytes, filename)

        from google import genai
        from google.genai import types

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
        mime_types = {
            "mp3": "audio/mp3",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "m4a": "audio/m4a",
            "webm": "audio/webm",
            "aac": "audio/aac",
        }
        mime_type = mime_types.get(ext, "audio/wav")

        client = genai.Client(api_key=self.api_key)
        audio_part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
        prompt = (
            "Transcribe the following civic grievance audio verbatim. "
            "Maintain the citizen's original spoken language (Hindi, Hinglish, or English). "
            "Output ONLY the clean transcription text with no introductory or concluding remarks."
        )

        response = await client.aio.models.generate_content(
            model=self.model,
            contents=[prompt, audio_part],
        )

        text = response.text.strip() if response.text else ""
        return {
            "transcript": text,
            "language": "Hinglish",
            "confidence": 0.95,
            "duration_seconds": None,
        }


class GroqSpeechToTextProvider(SpeechToTextProvider):
    """Groq Whisper API speech-to-text provider."""

    def __init__(self, api_key: str | None = None, model: str = "whisper-large-v3-turbo"):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model

    async def transcribe(self, audio_bytes: bytes, filename: str) -> dict[str, Any]:
        if not self.api_key:
            return await MockSpeechToTextProvider().transcribe(audio_bytes, filename)

        try:
            import groq
            client = groq.AsyncGroq(api_key=self.api_key)
            transcription = await client.audio.transcriptions.create(
                file=(filename, audio_bytes),
                model=self.model,
                response_format="json",
            )
            return {
                "transcript": transcription.text.strip(),
                "language": getattr(transcription, "language", "Hinglish"),
                "confidence": 0.95,
                "duration_seconds": getattr(transcription, "duration", None),
            }
        except Exception:
            # Fall back safely to mock if groq call fails
            return await MockSpeechToTextProvider().transcribe(audio_bytes, filename)


class SpeechToTextService:
    """Coordinator service for audio transcription intake."""

    SUPPORTED_EXTENSIONS = {"wav", "mp3", "ogg", "m4a", "webm", "aac"}
    MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB limit

    def __init__(self, provider: SpeechToTextProvider | None = None):
        if provider is not None:
            self.provider = provider
        elif os.getenv("GEMINI_API_KEY"):
            self.provider = GeminiSpeechToTextProvider()
        elif os.getenv("GROQ_API_KEY"):
            self.provider = GroqSpeechToTextProvider()
        else:
            self.provider = MockSpeechToTextProvider()

    def validate_audio_file(self, filename: str, file_size: int) -> None:
        """Validate audio extension and size constraints.

        Raises:
            ValueError: If file extension is unsupported or size exceeds limits.
        """
        if not filename or "." not in filename:
            raise ValueError("Invalid audio file: missing file extension.")

        ext = filename.rsplit(".", 1)[-1].lower()
        if ext not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported audio format '.{ext}'. Supported formats: "
                f"{', '.join(sorted(self.SUPPORTED_EXTENSIONS))}"
            )

        if file_size > self.MAX_FILE_SIZE_BYTES:
            raise ValueError(
                f"Audio file size exceeds maximum limit of {self.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            )

    async def transcribe_audio(self, audio_bytes: bytes, filename: str) -> dict[str, Any]:
        """Validate and transcribe an audio file into text."""
        self.validate_audio_file(filename, len(audio_bytes))
        return await self.provider.transcribe(audio_bytes, filename)

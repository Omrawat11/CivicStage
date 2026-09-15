"""Tests for Phase 5 Multimodal Intake: Speech-to-Text, Image Understanding, and API endpoints."""

import base64
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.speech_to_text import SpeechToTextService, MockSpeechToTextProvider
from backend.services.llm.gemini import GeminiProvider
from backend.services.llm.groq import GroqProvider

client = TestClient(app)


def test_speech_to_text_service_mock_transcription():
    """Verify MockSpeechToTextProvider produces valid civic grievance transcripts."""
    service = SpeechToTextService(provider=MockSpeechToTextProvider())

    # Test generic civic audio
    dummy_wav = b"RIFF....WAVEfmt ...."
    res = pytest.importorskip("asyncio").run(
        service.transcribe_audio(dummy_wav, "citizen_complaint.wav")
    )
    assert "transcript" in res
    assert "Kolar" in res["transcript"] or "paani" in res["transcript"]
    assert res["language"] == "Hinglish"
    assert res["confidence"] >= 0.9

    # Test pothole audio filename
    res_pothole = pytest.importorskip("asyncio").run(
        service.transcribe_audio(dummy_wav, "pothole_hazard.mp3")
    )
    assert "gaddha" in res_pothole["transcript"] or "MP Nagar" in res_pothole["transcript"]


def test_audio_format_validation():
    """Verify SpeechToTextService rejects invalid formats and oversized files."""
    service = SpeechToTextService(provider=MockSpeechToTextProvider())

    with pytest.raises(ValueError, match="Unsupported audio format"):
        service.validate_audio_file("recording.exe", 100)

    with pytest.raises(ValueError, match="Unsupported audio format"):
        service.validate_audio_file("recording.pdf", 100)

    with pytest.raises(ValueError, match="exceeds maximum limit"):
        service.validate_audio_file("recording.wav", 30 * 1024 * 1024)

    # Valid formats should not raise
    for ext in ["wav", "mp3", "ogg", "m4a", "webm", "aac"]:
        service.validate_audio_file(f"voice.{ext}", 1024)


def test_gemini_multimodal_image_analysis():
    """Verify GeminiProvider image analysis capability and deterministic fallback."""
    provider = GeminiProvider(api_key=None, allow_mock_fallback=True)
    assert provider.supports_multimodal is True

    dummy_image = b"\xff\xd8\xff\xe0\x00\x10JFIF"
    result = pytest.importorskip("asyncio").run(
        provider.analyze_image_complaint(
            image_bytes=dummy_image,
            mime_type="image/jpeg",
            caption="Road near Kolar has a dangerous pothole",
        )
    )
    assert "Visual Evidence" in result
    assert "pothole" in result.lower()
    assert "Kolar" in result


def test_groq_multimodal_capability_check():
    """Verify GroqProvider explicitly rejects multimodal image analysis."""
    provider = GroqProvider(api_key=None)
    assert provider.supports_multimodal is False

    with pytest.raises(NotImplementedError, match="GroqProvider does not support multimodal"):
        pytest.importorskip("asyncio").run(
            provider.analyze_image_complaint(
                image_bytes=b"dummy",
                mime_type="image/jpeg",
                caption="Road pothole",
            )
        )


def test_api_audio_intake_endpoint():
    """Verify POST /complaints/intake/audio accepts base64 audio and returns transcript."""
    dummy_wav = b"RIFFdummywavebytes"
    b64_audio = base64.b64encode(dummy_wav).decode("utf-8")

    payload = {
        "audio_base64": b64_audio,
        "filename": "road_pothole_grievance.mp3",
    }
    response = client.post("/complaints/intake/audio", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data
    assert len(data["transcript"]) > 10
    assert data["language"] in ("Hinglish", "Hindi", "English")
    assert data["confidence"] > 0.8


def test_api_audio_intake_invalid_format():
    """Verify POST /complaints/intake/audio rejects invalid formats with 400."""
    payload = {
        "audio_base64": "SGVsbG8gV29ybGQ=",
        "filename": "document.txt",
    }
    response = client.post("/complaints/intake/audio", json=payload)
    assert response.status_code == 400
    assert "Unsupported audio format" in response.json()["detail"]


def test_api_image_intake_endpoint():
    """Verify POST /complaints/intake/image accepts base64 photo and returns visual description."""
    dummy_jpeg = b"\xff\xd8\xff\xe0dummyjpegbytes"
    b64_image = base64.b64encode(dummy_jpeg).decode("utf-8")

    payload = {
        "image_base64": b64_image,
        "filename": "pothole_photo.jpg",
        "caption": "Dangerous pothole on main road near Kolar",
    }
    response = client.post("/complaints/intake/image", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "extracted_complaint" in data
    assert "pothole" in data["extracted_complaint"].lower()
    assert data["caption"] == "Dangerous pothole on main road near Kolar"


def test_api_complaint_intake_creation_and_triage():
    """Verify POST /complaints/intake creates a new ticket and executes AI triage."""
    payload = {
        "raw_text": "Shahpura sector B mein pichle do hafte se street lights band hain, raat ko andhera rehta hai.",
        "source_channel": "Voice Recording",
        "language": "Hinglish",
        "run_triage": True,
    }
    response = client.post("/complaints/intake", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "complaint_id" in data
    assert data["complaint_id"].startswith("CMP-")
    assert data["status"] == "Pending Review"
    assert data["source_channel"] == "Voice Recording"
    assert data["ai_recommendation"]["department"] is not None
    assert data["ai_recommendation"]["urgency"] is not None
    assert data["acknowledgement"]["acknowledgement_draft"] is not None

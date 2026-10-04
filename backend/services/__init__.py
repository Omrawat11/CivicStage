"""CivicTriage backend services package."""

from backend.services.triage import TriageService, FinalTriageResult
from backend.services.urgency import UrgencyEngine, UrgencyResult
from backend.services.duplicate import (
    DuplicateService,
    DuplicateAnalysisResult,
    DuplicateMatch,
)
from backend.services.locality import LocalityService, LocalityResolution
from backend.services.validation import validate_triage_output
from backend.services.acknowledgement import generate_acknowledgement_draft
from backend.services.evaluation import (
    evaluate_test_dataset,
    calculate_human_correction_rate,
    save_evaluation_results,
    load_latest_evaluation_results,
)
from backend.services.reports import (
    calculate_department_metrics,
    get_all_departments_comparison,
    detect_emerging_issues,
    generate_weekly_report,
    generate_report_narrative,
)
from backend.services.speech_to_text import (
    SpeechToTextService,
    SpeechToTextProvider,
    MockSpeechToTextProvider,
    GeminiSpeechToTextProvider,
    GroqSpeechToTextProvider,
)

__all__ = [
    "TriageService",
    "FinalTriageResult",
    "UrgencyEngine",
    "UrgencyResult",
    "DuplicateService",
    "DuplicateAnalysisResult",
    "DuplicateMatch",
    "LocalityService",
    "LocalityResolution",
    "validate_triage_output",
    "generate_acknowledgement_draft",
    "evaluate_test_dataset",
    "calculate_human_correction_rate",
    "save_evaluation_results",
    "load_latest_evaluation_results",
    "calculate_department_metrics",
    "get_all_departments_comparison",
    "detect_emerging_issues",
    "generate_weekly_report",
    "generate_report_narrative",
    "SpeechToTextService",
    "SpeechToTextProvider",
    "MockSpeechToTextProvider",
    "GeminiSpeechToTextProvider",
    "GroqSpeechToTextProvider",
]

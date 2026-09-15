"""End-to-end civic complaint triage service orchestrating LLM classification, validation, urgency scoring, locality normalization, and duplicate detection."""

from datetime import datetime
from pydantic import BaseModel, Field
from backend.services.llm.base import LLMProvider, ComplaintTriage
from backend.services.llm.factory import get_llm_provider
from backend.services.validation import validate_triage_output
from backend.services.locality import LocalityService, LocalityResolution
from backend.services.urgency import UrgencyEngine, UrgencyResult
from backend.services.duplicate import DuplicateService, DuplicateAnalysisResult
from backend.data.loader import load_taxonomy, load_gazetteer


class FinalTriageResult(BaseModel):
    """Consolidated end-to-end triage outcome for a civic complaint ticket."""
    raw_complaint: str = Field(..., description="Original raw citizen complaint")
    triage: ComplaintTriage = Field(..., description="Structured triage prediction from LLM")
    validation_passed: bool = Field(..., description="True if output conforms strictly to taxonomy & gazetteer")
    validation_errors: list[str] = Field(default_factory=list, description="List of schema/taxonomy inconsistencies")
    locality_resolution: LocalityResolution = Field(..., description="Canonical locality normalization and ward resolution")
    urgency: UrgencyResult = Field(..., description="Calculated urgency level, score, and factors")
    duplicate_analysis: DuplicateAnalysisResult = Field(..., description="Advisory duplicate and repeat problem analysis")
    final_department: str = Field(..., description="Final routed department")
    final_category: str = Field(..., description="Final assigned category")
    final_locality: str | None = Field(default=None, description="Final canonical locality")
    final_ward: str | None = Field(default=None, description="Final municipal ward")
    timestamp: datetime = Field(default_factory=datetime.now)


class TriageService:
    """Master coordinator executing the end-to-end CivicTriage processing pipeline."""

    def __init__(
        self,
        provider: LLMProvider | None = None,
        taxonomy: dict | None = None,
        gazetteer: dict | None = None,
        duplicate_service: DuplicateService | None = None,
    ):
        self.taxonomy = taxonomy or load_taxonomy()
        self.gazetteer = gazetteer or load_gazetteer()
        self.provider = provider or get_llm_provider()
        self.locality_service = LocalityService(gazetteer=self.gazetteer)
        self.urgency_engine = UrgencyEngine()
        self.duplicate_service = duplicate_service or DuplicateService()

    async def triage_complaint(
        self,
        complaint: str,
        timestamp: datetime | None = None,
        allow_mock: bool | None = None,
    ) -> FinalTriageResult:
        """Process a raw civic complaint through the full intelligence pipeline.

        Pipeline:
        1. LLM Provider Classification
        2. Taxonomy & Gazetteer Validation
        3. Locality Normalization
        4. Urgency Scoring
        5. Duplicate / Repeat Detection
        6. Result Assembly
        """
        current_time = timestamp or datetime.now()

        # 1. LLM classification
        # Inspect if provider accepts allow_mock keyword argument
        try:
            triage: ComplaintTriage = await self.provider.classify_complaint(
                complaint=complaint,
                taxonomy=self.taxonomy,
                gazetteer=self.gazetteer,
                allow_mock=allow_mock,
            )
        except TypeError:
            triage = await self.provider.classify_complaint(
                complaint=complaint,
                taxonomy=self.taxonomy,
                gazetteer=self.gazetteer,
            )

        # 2. Validation
        validation_passed, validation_errors = validate_triage_output(
            triage=triage,
            taxonomy=self.taxonomy,
            gazetteer=self.gazetteer,
        )

        # 3. Locality Normalization
        if triage.locality:
            loc_res = self.locality_service.normalize_locality(triage.locality)
        else:
            loc_res = self.locality_service.extract_and_normalize(complaint)

        canonical_locality = loc_res.canonical_name or triage.locality
        canonical_ward = loc_res.ward or triage.ward

        # 4. Urgency Calculation
        urgency_res = self.urgency_engine.calculate_urgency(
            triage=triage,
            raw_text=complaint,
        )

        # 5. Duplicate & Repeat Analysis
        duplicate_res = self.duplicate_service.analyze_complaint(
            complaint_text=complaint,
            category=triage.category,
            department=triage.department,
            locality=canonical_locality,
            timestamp=current_time,
        )

        # 6. Consolidated Output
        return FinalTriageResult(
            raw_complaint=complaint,
            triage=triage,
            validation_passed=validation_passed,
            validation_errors=validation_errors,
            locality_resolution=loc_res,
            urgency=urgency_res,
            duplicate_analysis=duplicate_res,
            final_department=triage.department,
            final_category=triage.category,
            final_locality=canonical_locality,
            final_ward=canonical_ward,
            timestamp=current_time,
        )

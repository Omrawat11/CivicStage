"""Semantic vector similarity and candidate filtering service for duplicate and repeat civic complaints."""

from datetime import datetime
from pathlib import Path
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.data.schemas import ComplaintRecord
from backend.data.loader import load_complaints

DEFAULT_DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "processed" / "complaints.csv"


class DuplicateMatch(BaseModel):
    """Details of an individual matching historical complaint."""
    complaint_id: str
    incident_id: str
    raw_text: str
    similarity: float
    locality: str | None
    category: str
    timestamp: datetime


class DuplicateAnalysisResult(BaseModel):
    """Structured advisory outcome of duplicate vs. repeat detection."""
    is_duplicate: bool = Field(default=False, description="True if candidate belongs to an active incident cluster")
    is_repeat: bool = Field(default=False, description="True if candidate is a chronic recurring issue over time")
    status: str = Field(default="unique", description="'duplicate', 'repeat', or 'unique'")
    matched_incident_id: str | None = Field(default=None, description="Ground-truth/cluster incident ID if matched")
    similarity_score: float = Field(default=0.0, description="Highest semantic vector similarity score")
    existing_complaints_count: int = Field(default=0, description="Count of active complaints in matched cluster")
    time_span_hours: float | None = Field(default=None, description="Time difference in hours from cluster anchor")
    summary: str = Field(default="Unique complaint; no duplicate or recurring incident detected.")
    candidate_matches: list[DuplicateMatch] = Field(default_factory=list)


class DuplicateService:
    """Embedding-based duplicate and recurring complaint intelligence service."""

    def __init__(
        self,
        historical_complaints: list[ComplaintRecord] | None = None,
        similarity_threshold: float = 0.65,
        duplicate_window_hours: float = 72.0,
        repeat_window_hours: float = 336.0,  # 14 days
    ):
        self.similarity_threshold = similarity_threshold
        self.duplicate_window_hours = duplicate_window_hours
        self.repeat_window_hours = repeat_window_hours
        self.complaints: list[ComplaintRecord] = []
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=2500,
            sublinear_tf=True,
        )
        self.tfidf_matrix = None

        if historical_complaints is not None:
            self.index_complaints(historical_complaints)
        elif DEFAULT_DATA_PATH.exists():
            try:
                loaded = load_complaints(DEFAULT_DATA_PATH)
                self.index_complaints(loaded)
            except Exception:
                pass

    def index_complaints(self, complaints: list[ComplaintRecord]):
        """Index a collection of historical complaint records into the vector search matrix."""
        self.complaints = complaints
        if not complaints:
            self.tfidf_matrix = None
            return

        corpus = [r.raw_text for r in complaints]
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def analyze_complaint(
        self,
        complaint_text: str,
        category: str,
        department: str,
        locality: str | None = None,
        timestamp: datetime | None = None,
    ) -> DuplicateAnalysisResult:
        """Analyze a new complaint against indexed records to detect duplicate clusters or repeat problems.

        Rules:
        - Duplicate: High semantic similarity + same category + same locality + time diff <= 72 hours.
        - Repeat: Same category + same locality + time diff > 14 days (chronic recurrence).
        - Different locality or different issue -> Unique.
        """
        if not self.complaints or self.tfidf_matrix is None:
            return DuplicateAnalysisResult()

        query_time = timestamp or datetime.now()

        # Compute cosine similarity across indexed texts
        query_vec = self.vectorizer.transform([complaint_text])
        sim_scores = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        # Filter candidates meeting similarity threshold
        matches: list[DuplicateMatch] = []
        for idx, score in enumerate(sim_scores):
            if score >= self.similarity_threshold:
                rec = self.complaints[idx]
                matches.append(
                    DuplicateMatch(
                        complaint_id=rec.complaint_id,
                        incident_id=rec.incident_id,
                        raw_text=rec.raw_text,
                        similarity=float(score),
                        locality=rec.locality_ground_truth,
                        category=rec.category_ground_truth,
                        timestamp=rec.timestamp,
                    )
                )

        matches.sort(key=lambda m: m.similarity, reverse=True)

        if not matches:
            return DuplicateAnalysisResult()

        # Multi-factor evaluation on top matching candidates
        for top_match in matches:
            same_category = top_match.category.lower() == category.lower()
            same_locality = (
                locality is not None
                and top_match.locality is not None
                and locality.lower() == top_match.locality.lower()
            )

            time_diff_hours = abs((query_time - top_match.timestamp).total_seconds()) / 3600.0

            # Count how many complaints already belong to this incident
            incident_complaint_count = sum(
                1 for r in self.complaints if r.incident_id == top_match.incident_id
            )

            # Scenario A: DUPLICATE INCIDENT (Concurrent report of same physical event)
            if same_category and same_locality and time_diff_hours <= self.duplicate_window_hours:
                return DuplicateAnalysisResult(
                    is_duplicate=True,
                    is_repeat=False,
                    status="duplicate",
                    matched_incident_id=top_match.incident_id,
                    similarity_score=top_match.similarity,
                    existing_complaints_count=incident_complaint_count,
                    time_span_hours=time_diff_hours,
                    summary=(
                        f"Potential duplicate cluster: Incident {top_match.incident_id} "
                        f"({incident_complaint_count} existing complaints in {top_match.locality}, "
                        f"similarity: {top_match.similarity:.2f}, time span: {time_diff_hours:.1f} hours)."
                    ),
                    candidate_matches=matches[:5],
                )

            # Scenario B: REPEAT COMPLAINT (Chronic / recurring infrastructure failure at different time)
            if same_category and same_locality and time_diff_hours >= self.repeat_window_hours:
                return DuplicateAnalysisResult(
                    is_duplicate=False,
                    is_repeat=True,
                    status="repeat",
                    matched_incident_id=top_match.incident_id,
                    similarity_score=top_match.similarity,
                    existing_complaints_count=incident_complaint_count,
                    time_span_hours=time_diff_hours,
                    summary=(
                        f"Repeat chronic complaint: Same problem ({category}) previously reported in "
                        f"{top_match.locality} under incident {top_match.incident_id} "
                        f"({time_diff_hours / 24.0:.1f} days ago)."
                    ),
                    candidate_matches=matches[:5],
                )

        # High text similarity but different locality or category
        return DuplicateAnalysisResult(
            is_duplicate=False,
            is_repeat=False,
            status="unique",
            similarity_score=matches[0].similarity,
            summary="Similar wording found, but differing locality or category indicates an independent incident.",
            candidate_matches=matches[:3],
        )

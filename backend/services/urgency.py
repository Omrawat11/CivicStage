"""Independent Python rule-based urgency scoring engine for civic complaints.

Calculates multi-factor priority scores without relying on LLM self-assessment.
All weightings and thresholds are configurable demonstration rules.
"""

import re
from pydantic import BaseModel, Field
from backend.services.llm.base import ComplaintTriage


class UrgencyResult(BaseModel):
    """Calculated operational urgency assessment and breakdown."""
    level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', or 'CRITICAL'")
    score: int = Field(..., ge=0, le=12, description="Composite urgency score (0 to 12)")
    factors: dict[str, int] = Field(..., description="Score breakdown by constituent factor")
    explanation: str = Field(..., description="Human-readable justification of urgency assessment")


class UrgencyEngine:
    """Configurable scoring engine evaluating civic complaints across 4 hazard dimensions."""

    # Configurable score contributions
    CRITICAL_SAFETY_CATEGORIES = {
        "Exposed wiring on pole": 5,
        "Loose overhead wires": 5,
        "Damaged manhole cover": 5,
        "Contaminated water": 5,
    }
    HIGH_SAFETY_CATEGORIES = {
        "Overflowing sewage": 4,
        "Dead animal removal": 3,
        "Pothole": 3,
        "Road obstruction": 3,
    }
    MODERATE_SAFETY_CATEGORIES = {
        "Road damage": 2,
        "Drain blockage": 2,
        "Stray dog menace": 2,
        "Stagnant water near habitation": 2,
        "Garbage accumulation": 1,
        "Open dumping": 1,
    }

    OUTAGE_CATEGORIES = {
        "Water outage": 3,
        "Power outage": 3,
        "Low water pressure": 1,
        "Low voltage": 1,
        "Flickering streetlight": 1,
    }

    # Configurable level thresholds
    THRESHOLDS = [
        (3, "LOW"),
        (6, "MEDIUM"),
        (9, "HIGH"),
        (12, "CRITICAL"),
    ]

    def calculate_urgency(
        self,
        triage: ComplaintTriage,
        raw_text: str = "",
    ) -> UrgencyResult:
        """Calculate urgency score (0-12) based on objective complaint attributes.

        Factors:
        - Public safety hazard: 0 to 5
        - Service outage: 0 to 3
        - Duration: 0 to 2
        - Affected scale: 0 to 2

        Args:
            triage: Structured triage attributes.
            raw_text: Verbatim raw text for supplemental keyword analysis.

        Returns:
            UrgencyResult object.
        """
        combined_text = f"{raw_text} {triage.summary} {' '.join(triage.evidence)}".lower()

        # 1. Public Safety Hazard (0 to 5)
        safety_score = 0
        cat = triage.category
        if cat in self.CRITICAL_SAFETY_CATEGORIES:
            safety_score = self.CRITICAL_SAFETY_CATEGORIES[cat]
        elif cat in self.HIGH_SAFETY_CATEGORIES:
            safety_score = self.HIGH_SAFETY_CATEGORIES[cat]
        elif cat in self.MODERATE_SAFETY_CATEGORIES:
            safety_score = self.MODERATE_SAFETY_CATEGORIES[cat]

        # Additional keyword elevation for safety
        if any(w in combined_text for w in ["current", "electrocution", "accident", "hospital", "fall", "chot", "gir gaya"]):
            safety_score = min(5, safety_score + 1)

        # 2. Essential Service Outage (0 to 3)
        outage_score = self.OUTAGE_CATEGORIES.get(cat, 0)
        if any(w in combined_text for w in ["completely band", "no water", "blackout", "supply stopped", "power cut", "no power"]):
            outage_score = min(3, max(outage_score, 2))

        # 3. Duration Factor (0 to 2)
        duration_score = 0
        dur_str = (triage.duration or "").lower()
        dur_combined = f"{dur_str} {combined_text}"

        if any(w in dur_combined for w in ["3 days", "3 din", "4 days", "4 din", "5 days", "week", "hafte", "month", "mahine"]):
            duration_score = 2
        elif any(w in dur_combined for w in ["2 days", "2 din", "yesterday", "kal", "hours", "ghante"]):
            duration_score = 1

        # 4. Affected Scale (0 to 2)
        scale_score = 1  # default moderate local impact
        if any(w in combined_text for w in ["colony", "ward", "mohalla", "area", "market", "society", "entire", "sab log", "residents", "school", "main road"]):
            scale_score = 2
        elif any(w in combined_text for w in ["ghar me", "my house", "single tap", "personal"]):
            scale_score = 0

        # Composite score
        total_score = min(12, safety_score + outage_score + duration_score + scale_score)

        # Determine level
        level = "LOW"
        for threshold, lvl in self.THRESHOLDS:
            if total_score <= threshold:
                level = lvl
                break

        factors = {
            "public_safety_hazard": safety_score,
            "service_outage": outage_score,
            "duration": duration_score,
            "affected_scale": scale_score,
        }

        explanation = (
            f"Evaluated score {total_score}/12 ({level}): "
            f"Public safety: {safety_score}/5, Outage: {outage_score}/3, "
            f"Duration: {duration_score}/2, Scale: {scale_score}/2."
        )

        return UrgencyResult(
            level=level,
            score=total_score,
            factors=factors,
            explanation=explanation,
        )

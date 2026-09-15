"""Locality normalization and municipal ward resolution service."""

import re
from pathlib import Path
from pydantic import BaseModel, Field
from backend.data.loader import load_gazetteer


class LocalityResolution(BaseModel):
    """Result of locality normalization and ward resolution."""
    canonical_name: str | None = Field(default=None, description="Resolved canonical locality name")
    ward: str | None = Field(default=None, description="Resolved municipal ward number")
    status: str = Field(..., description="'resolved', 'ambiguous', or 'unresolved'")
    matched_term: str | None = Field(default=None, description="Matching alias or input term")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    candidates: list[str] = Field(default_factory=list, description="List of possible matches if ambiguous")


class LocalityService:
    """Service to normalize raw citizen locality mentions and aliases to canonical Bhopal localities and wards."""

    def __init__(self, gazetteer: dict | None = None):
        self.gazetteer = gazetteer or load_gazetteer()
        self._build_indexes()

    def _normalize(self, text: str) -> str:
        """Normalize casing, spaces, and minor punctuation for comparison."""
        cleaned = text.strip().lower()
        cleaned = re.sub(r"[^\w\s\u0900-\u097f]", " ", cleaned)
        return re.sub(r"\s+", " ", cleaned).strip()

    def _build_indexes(self):
        """Build exact and alias lookup tables."""
        self.canonical_map: dict[str, dict] = {}
        self.lookup: dict[str, set[str]] = {}  # normalized term -> set of canonical names

        for loc in self.gazetteer.get("localities", []):
            canonical = loc["name"]
            ward = loc["ward"]
            self.canonical_map[canonical] = {"ward": ward, "aliases": loc.get("aliases", [])}

            # Map canonical name
            norm_can = self._normalize(canonical)
            self.lookup.setdefault(norm_can, set()).add(canonical)

            # Map all aliases
            for alias in loc.get("aliases", []):
                norm_alias = self._normalize(alias)
                self.lookup.setdefault(norm_alias, set()).add(canonical)

    def normalize_locality(self, raw_locality: str | None) -> LocalityResolution:
        """Normalize a raw locality string or alias to canonical locality and ward.

        Args:
            raw_locality: Raw locality string (e.g. 'Kolar Road', 'कोलार', 'MP Nagar area').

        Returns:
            LocalityResolution object with canonical name, ward, and status.
        """
        if not raw_locality or not raw_locality.strip():
            return LocalityResolution(status="unresolved", confidence=0.0)

        norm_input = self._normalize(raw_locality)

        # 1. Direct exact match in canonical or alias lookup
        if norm_input in self.lookup:
            matches = list(self.lookup[norm_input])
            if len(matches) == 1:
                canonical = matches[0]
                return LocalityResolution(
                    canonical_name=canonical,
                    ward=self.canonical_map[canonical]["ward"],
                    status="resolved",
                    matched_term=raw_locality,
                    confidence=1.0,
                )
            else:
                return LocalityResolution(
                    status="ambiguous",
                    matched_term=raw_locality,
                    confidence=0.5,
                    candidates=sorted(matches),
                )

        # 2. Substring search in lookup keys
        candidate_canonicals: set[str] = set()
        for term, can_names in self.lookup.items():
            if norm_input in term or term in norm_input:
                candidate_canonicals.update(can_names)

        if len(candidate_canonicals) == 1:
            canonical = list(candidate_canonicals)[0]
            return LocalityResolution(
                canonical_name=canonical,
                ward=self.canonical_map[canonical]["ward"],
                status="resolved",
                matched_term=raw_locality,
                confidence=0.85,
            )
        elif len(candidate_canonicals) > 1:
            return LocalityResolution(
                status="ambiguous",
                matched_term=raw_locality,
                confidence=0.4,
                candidates=sorted(list(candidate_canonicals)),
            )

        return LocalityResolution(status="unresolved", matched_term=raw_locality, confidence=0.0)

    def extract_and_normalize(self, text: str) -> LocalityResolution:
        """Attempt to identify and normalize any mentioned locality directly within full text."""
        norm_text = self._normalize(text)

        # Search for longest matching alias/canonical first to favor specific names
        sorted_terms = sorted(self.lookup.keys(), key=len, reverse=True)
        found_matches: set[str] = set()

        for term in sorted_terms:
            # Word-boundary check where possible
            pattern = r"(?:\b|^)" + re.escape(term) + r"(?:\b|$)"
            if re.search(pattern, norm_text):
                found_matches.update(self.lookup[term])
                break

        if len(found_matches) == 1:
            canonical = list(found_matches)[0]
            return LocalityResolution(
                canonical_name=canonical,
                ward=self.canonical_map[canonical]["ward"],
                status="resolved",
                matched_term=canonical,
                confidence=0.90,
            )
        elif len(found_matches) > 1:
            return LocalityResolution(
                status="ambiguous",
                confidence=0.45,
                candidates=sorted(list(found_matches)),
            )

        return LocalityResolution(status="unresolved", confidence=0.0)

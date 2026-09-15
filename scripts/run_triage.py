"""Acceptance demonstration script running end-to-end CivicTriage pipeline on a sample complaint."""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.services.triage import TriageService, FinalTriageResult


async def main():
    sample_complaint = (
        "Kolar me 3 din se paani nahi aa raha hai. Bahut dikkat ho rahi hai."
    )
    if len(sys.argv) > 1:
        sample_complaint = " ".join(sys.argv[1:])

    print("=" * 65)
    print("  CIVICTRIAGE — END-TO-END ACCEPTANCE TEST")
    print("=" * 65)
    print(f"\nIncoming Citizen Complaint:\n\"{sample_complaint}\"\n")

    triage_service = TriageService()
    result: FinalTriageResult = await triage_service.triage_complaint(
        complaint=sample_complaint,
        timestamp=datetime.now(),
    )

    print("-" * 65)
    print("  1. LLM TRIAGE PREDICTION (ComplaintTriage)")
    print("-" * 65)
    print(f"Language    : {result.triage.language}")
    print(f"Department  : {result.triage.department}")
    print(f"Category    : {result.triage.category}")
    print(f"Locality    : {result.triage.locality}")
    print(f"Ward        : {result.triage.ward}")
    print(f"Duration    : {result.triage.duration}")
    print(f"Evidence    : {result.triage.evidence}")
    print(f"Summary     : {result.triage.summary}")
    print(f"Confidence  : {result.triage.confidence:.2f}")

    print("\n" + "-" * 65)
    print("  2. VALIDATION & LOCALITY NORMALIZATION")
    print("-" * 65)
    print(f"Validation Passed   : {result.validation_passed}")
    if result.validation_errors:
        print(f"Validation Errors   : {result.validation_errors}")
    print(f"Locality Status     : {result.locality_resolution.status.upper()}")
    print(f"Canonical Locality  : {result.locality_resolution.canonical_name}")
    print(f"Assigned Ward       : {result.locality_resolution.ward}")

    print("\n" + "-" * 65)
    print("  3. PYTHON URGENCY ENGINE")
    print("-" * 65)
    print(f"Urgency Level       : {result.urgency.level}")
    print(f"Urgency Score       : {result.urgency.score}/12")
    print(f"Score Factors       : {result.urgency.factors}")
    print(f"Explanation         : {result.urgency.explanation}")

    print("\n" + "-" * 65)
    print("  4. DUPLICATE & REPEAT INTELLIGENCE (Advisory)")
    print("-" * 65)
    print(f"Detection Status    : {result.duplicate_analysis.status.upper()}")
    print(f"Is Duplicate        : {result.duplicate_analysis.is_duplicate}")
    print(f"Is Repeat Problem   : {result.duplicate_analysis.is_repeat}")
    if result.duplicate_analysis.matched_incident_id:
        print(f"Matched Incident ID : {result.duplicate_analysis.matched_incident_id}")
        print(f"Existing Complaints : {result.duplicate_analysis.existing_complaints_count}")
        print(f"Vector Similarity   : {result.duplicate_analysis.similarity_score:.2f}")
    print(f"Advisory Summary    : {result.duplicate_analysis.summary}")

    print("\n" + "=" * 65)
    print("  FINAL TRIAGED TICKET")
    print("=" * 65)
    ticket = {
        "final_department": result.final_department,
        "final_category": result.final_category,
        "final_locality": result.final_locality,
        "final_ward": result.final_ward,
        "urgency_level": result.urgency.level,
        "urgency_score": result.urgency.score,
        "duplicate_advisory": result.duplicate_analysis.status,
    }
    print(json.dumps(ticket, indent=2))
    print("=" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(main())

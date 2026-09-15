# CivicTriage — System Architecture & Technical Specification

CivicTriage is built on a modular, decoupled architecture adhering to strict separation of concerns, provider abstraction, and human-in-the-loop auditability.

---

## 1. High-Level Architecture

```text
Citizens / Channels (Helpline 181, Web, Voice, Photos)
                        │
                        ▼
Frontend (Next.js 15 App Router + TypeScript + Tailwind CSS)
   - /             : Municipal Operations Dashboard & Emerging Hotspot Visibility
   - /complaints   : Multi-attribute 8-way Filterable Queue & Review Workbench
   - /reports      : Weekly Department Accountability & Hotspot Cluster Analytics
   - /evaluation   : Held-out Model Benchmark & Human Correction Rate Auditing
                        │
                        ▼ REST API (HTTP/JSON + Base64 Media)
FastAPI Backend (backend/api/ - Python 3.11)
   - complaints.py : Complaint search, filtering, detail, review, and multimodal intake
   - reports.py    : Departmental accountability, comparisons, and emerging clusters
   - evaluation.py : Benchmark execution on test dataset and metrics caching
   - health.py     : Liveness and service configuration status
                        │
                        ▼
Intelligence Services Layer (backend/services/)
   - triage.py           : End-to-end processing pipeline orchestrator
   - speech_to_text.py   : Audio transcription provider abstraction (Mock, Gemini, Groq)
   - urgency.py          : Multi-factor rule-based urgency scoring (0-12)
   - locality.py         : Gazetteer-based locality normalization & ward resolution
   - duplicate.py        : TF-IDF vector similarity & incident clustering
   - acknowledgement.py  : Automated citizen feedback draft generator
   - reports.py          : Deterministic accountability metrics & cluster detection
   - evaluation.py       : Zero-leakage held-out test evaluation engine
                        │
                        ▼
LLM Provider Abstraction Layer (backend/services/llm/)
   - base.py             : LLMProvider abstract base class & ComplaintTriage Pydantic schema
   - gemini.py           : GeminiProvider (Google GenAI SDK - Gemini 2.0 Flash + Vision)
   - groq.py             : GroqProvider (Groq SDK - LLaMA 3.3 70B & Whisper)
   - prompts.py          : Structured prompt templates with taxonomy & gazetteer grounding
                        │
                        ▼
Data & Storage Layer (SQLite + SQLAlchemy)
   - Table: complaints (strictly segregated raw, ai_*, and operator_* columns)
   - File: civic_triage.db
```

---

## 2. Multimodal Intake Pipeline

The central triage pipeline accepts a **Common Complaint Representation**. Multimodal inputs (voice recordings and photo evidence) are normalized into text before entering triage:

```text
[ Voice Audio File ]
        │
        ▼ (POST /complaints/intake/audio)
SpeechToTextService (Mock / Gemini / Groq Whisper)
        │
        ▼
   Transcript ──┐
                │
                ▼ (Operator Inspection / Edit)
[ Citizen Photo Evidence + Caption ]
        │
        ▼ (POST /complaints/intake/image)
GeminiProvider Multimodal Vision
        │
        ▼
Extracted Complaint Description ──┐
                                  │
                                  ▼ (Common Complaint Representation)
                          TriageService.triage_complaint()
                                  │
                                  ├── 1. LLM Taxonomy Classification
                                  ├── 2. Schema & Gazetteer Validation
                                  ├── 3. Locality Normalization & Ward Resolution
                                  ├── 4. Multi-Factor Urgency Scoring
                                  ├── 5. TF-IDF Duplicate & Incident Matching
                                  └── 6. Safe Citizen Acknowledgement Draft
```

---

## 3. Database Schema & Non-Overwrite Guarantee

The SQLite database table `complaints` enforces strict segregation between automated AI predictions and human operator actions. Human edits **NEVER** overwrite AI predictions.

```sql
CREATE TABLE complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    complaint_id VARCHAR(32) UNIQUE NOT NULL,
    source_channel VARCHAR(64) NOT NULL,
    timestamp DATETIME NOT NULL,
    raw_text TEXT NOT NULL,
    language VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,            -- 'New', 'Pending Review', 'Approved', 'Edited', 'Rejected'

    -- AI Predictions (immutable; never overwritten by operator)
    ai_department VARCHAR(128),
    ai_category VARCHAR(128),
    ai_locality VARCHAR(128),
    ai_ward VARCHAR(64),
    ai_urgency VARCHAR(32),                 -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    ai_urgency_score INTEGER,               -- 0 to 12
    ai_urgency_factors TEXT,                -- JSON dict of factor scores
    ai_confidence FLOAT,
    ai_evidence TEXT,                       -- JSON list of quoted snippets
    ai_summary TEXT,

    -- Operator Human Review (stored separately for auditability)
    operator_department VARCHAR(128),
    operator_category VARCHAR(128),
    operator_locality VARCHAR(128),
    operator_ward VARCHAR(64),
    operator_urgency VARCHAR(32),
    operator_notes TEXT,
    operator_decision VARCHAR(32),          -- 'approve', 'edit', 'reject'
    operator_reviewed_at DATETIME,

    -- Duplicate & Incident Advisory
    duplicate_status VARCHAR(32),           -- 'unique', 'duplicate', 'repeat'
    matched_incident_id VARCHAR(64),
    similarity_score FLOAT,
    cluster_complaints_count INTEGER,
    duplicate_summary TEXT,
    incident_id VARCHAR(64),

    -- Citizen Communication & Lifecycle
    acknowledgement_draft TEXT,             -- Formatted draft text
    resolved_at DATETIME,                   -- Exact resolution timestamp for metrics
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
```

---

## 4. Duplicate vs. Repeat Problem Definition

CivicTriage mathematically distinguishes between concurrent duplicate tickets and chronic repeat issues:

1. **Duplicate Grievance (`duplicate_status == 'duplicate'`)**:
   - Multiple citizens reporting the same active incident (e.g. water pipeline burst on 2026-06-02).
   - High text similarity (> 0.65 TF-IDF cosine similarity) within a short time window.
   - Shares the same primary `incident_id`.
2. **Repeat Grievance (`duplicate_status == 'repeat'`)**:
   - Recurring municipal failure of the same type in the same area (e.g. chronic low water pressure in Kolar recurring across separate months).
   - Occurs after previous incidents or beyond the active incident window.
   - Flagged for systemic departmental infrastructure inspection.

---

## 5. Model Evaluation Engine & Ground-Truth Isolation

The evaluation framework benchmark measures AI model accuracy against a held-out test dataset (`data/test/complaints_test.csv`):

- **Zero-Leakage Guarantee**: All `*_ground_truth` and `incident_id` columns are stripped prior to inference. The model receives only `raw_text` and `timestamp`.
- **Duplicate Confusion Matrix**:
  - **True Positive (TP)**: Model predicted `duplicate`/`repeat`, and the record belonged to an already-seen incident cluster in the test stream.
  - **False Positive (FP)**: Model predicted `duplicate`/`repeat`, but the incident was unique or seen for the first time.
  - **False Negative (FN)**: Model predicted `unique`, but the incident belonged to an earlier seen cluster.
  - **True Negative (TN)**: Model predicted `unique`, and the incident was genuinely unique.
- **Human Correction Rate**: Computed dynamically from the live SQLite database:
  $$\text{Correction Rate} = \frac{\text{Tickets with Status in ('Edited', 'Rejected')}}{\text{Total Human-Reviewed Tickets}} \times 100\%$$

# CivicTriage — AI-Powered Civic Complaint Triage & Decision-Support System

CivicTriage is a production-grade municipal complaint triage platform designed for municipal corporations (demonstrated on Bhopal Municipal Corporation / BMC). It converts messy, multilingual, and duplicate citizen grievances into structured, prioritized, and de-duplicated tickets while maintaining the human operator as the final decision maker.

---

## 1. Problem

Municipal complaint intake in Indian urban centers faces acute operational bottlenecks:
- **Messy & Multilingual Input**: Citizens submit grievances in colloquial Hindi, English, and Hinglish with colloquial spelling, missing landmarks, and emotional distress.
- **High Redundancy & Duplication**: A single broken water main or traffic pothole triggers dozens of duplicate reports across helpline, web, and chat channels.
- **Manual Misrouting**: Human operators manually read and dispatch tickets, resulting in routing errors, delayed emergency response, and backlogs.
- **Accountability Vacuum**: Lack of centralized, objective departmental resolution tracking and emerging incident cluster detection.

---

## 2. Solution

CivicTriage provides an end-to-end intelligent triage and human-in-the-loop decision-support workflow:
1. **Multimodal Intake**: Accepts text grievances, citizen voice recordings (via speech-to-text), and photo evidence (via multimodal vision understanding), converting them into a unified **Common Complaint Representation**.
2. **LLM Triage Intelligence**: Classifies the grievance against canonical municipal taxonomy (Department, Category, Sub-category) and extracts quoted evidence and reasoning.
3. **Locality Normalization**: Resolves colloquial colony names to official administrative wards using a curated Bhopal gazetteer.
4. **Multi-Factor Urgency Engine**: Evaluates severity, public hazard, duration, vulnerable population risk, and escalation probability on an objective 0–12 scale (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
5. **Duplicate & Repeat Detection**: Identifies concurrent duplicate submissions for the same active incident vs. chronic repeat grievances across months using TF-IDF vector similarity and incident clustering.
6. **Human-in-the-Loop Operator Audit**: Strictly preserves AI predictions (`ai_*`) while storing human decisions (`operator_*`), generating safe draft acknowledgements with zero automated external dispatches.
7. **Departmental Accountability & Model Benchmark**: Real-time weekly accountability metrics, emerging hotspot cluster alerts, and continuous held-out test evaluation.

---

## 3. Architecture

```text
               ┌── Text Complaint ────────────┐
               │                              │
               ├── Audio ──→ Speech-to-Text ──┼──→ Common Complaint Representation
               │             (Transcript)     │        (Text + Context)
               │                              │               │
               └── Image ──→ Multimodal AI ───┘               │
                   + Caption (Extracted Desc)                 ↓
                                                       Existing Triage
                                                              ↓
                                                    Urgency / Locality /
                                                    Duplicate Detection
                                                              ↓
                                                    Human Operator Review
                                                              ↓
                                                   Draft Acknowledgement
                                                              ↓
                                                Weekly Reports & Benchmark
```

### System Component Stack

```text
Frontend (Next.js 15 App Router, TypeScript, Tailwind CSS)
   │  - Municipal Operator Dashboard (Live KPI Cards, Priority Queue, Emerging Hotspots)
   │  - Filterable & Searchable Complaint Queue (8-way multi-attribute filtering)
   │  - Detailed Review Console (Side-by-side AI vs. Human Decision, Quoted Evidence)
   │  - Multimodal Intake Modal (Text, Audio Voice, Photo Evidence with Operator Inspection)
   │  - Weekly Reports & Model Benchmark Evaluation Visualizer
   ▼
FastAPI REST API (backend/api/ - Python 3.11)
   │  - /complaints: Queue filtering, search, detail, review (approve/edit/reject), triage
   │  - /complaints/intake: Audio transcription, image analysis, ticket creation
   │  - /reports: Weekly accountability, department comparisons, emerging issue clusters
   │  - /evaluation: Benchmark execution on held-out test data, human correction rate
   │  - /meta/taxonomy: Department, category, and locality dropdown gazetteer
   ▼
Intelligence Services Layer (backend/services/)
   │  - TriageService: Coordinator running classification, validation, normalization, urgency, duplicate
   │  - UrgencyEngine: Multi-factor rule-based scoring (0-12)
   │  - LocalityService: Fuzzy matching & ward resolution via Bhopal gazetteer
   │  - DuplicateService: TF-IDF vector indexing & incident cluster matching
   │  - SpeechToTextService: Audio transcription provider abstraction (Mock, Gemini, Groq)
   │  - ReportsService: Deterministic accountability metrics, median resolution times, hotspot clusters
   │  - EvaluationEngine: Zero-leakage held-out test benchmark & duplicate confusion matrix
   ▼
LLM Provider Abstraction (backend/services/llm/)
   │  - GeminiProvider (Google GenAI SDK - Gemini 2.0 Flash + Multimodal Vision)
   │  - GroqProvider (Groq SDK - LLaMA 3.3 70B & Whisper)
   │  - Deterministic Offline Fallbacks (ensures complete offline execution without API keys)
   ▼
Database Layer (backend/db/ - SQLite + SQLAlchemy)
   │  - Table: complaints (strictly segregated raw, ai_*, and operator_* columns)
```

---

## 4. Technology Stack

- **Backend API**: FastAPI, Uvicorn, Pydantic v2
- **Database & ORM**: SQLite, SQLAlchemy 2.0
- **AI & NLP Providers**: Google GenAI SDK (`google-genai`), Groq SDK (`groq`)
- **Text Matching & Similarity**: Scikit-Learn (TF-IDF vectorizer & cosine similarity)
- **Frontend UI**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Testing & Verification**: Pytest, Pytest-AsyncIO, Starlette TestClient

---

## 5. Data & Synthetic Corpus

- The baseline dataset (`data/processed/complaints.csv` and `data/test/complaints_test.csv`) is a synthetic, high-fidelity civic grievance dataset modeled after authentic urban grievance channels in Bhopal, Madhya Pradesh.
- It incorporates authentic local administrative geography: 85 municipal wards, major localities (Kolar, MP Nagar, Arera Colony, Shahpura, Bairagarh, TT Nagar, Karond, etc.), and standard departmental divisions (Water Supply, Sanitation, Roads, Electricity, Drainage, Public Health, Street Lighting).
- Unless partner-approved data is supplied in production, all records in the demo environment represent synthetic test data.

---

## 6. Safety Guardrails & Operational Limitations

- **Prototype & Decision Support**: CivicTriage is an operator decision-support platform. It does NOT automatically dispatch field workers, close municipal tickets, or execute live government modifications.
- **Draft-Only Citizen Communication**: All generated citizen acknowledgements remain marked as `[DRAFT ACKNOWLEDGEMENT]`. No SMS, WhatsApp, or email dispatches are automated.
- **Human Approval Required**: AI triage predictions provide actionable recommendations with confidence scores; human operators must approve, edit, or reject each recommendation.
- **Multimodal Availability**: Full speech-to-text and vision analysis operate natively with configured API keys; offline mock providers ensure 100% deterministic test and demonstration stability without external keys.

---

## 7. Demo Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 1. Seed the SQLite Database
```bash
python scripts/seed_database.py
```
*Seeds 750 realistic civic complaints into `civic_triage.db` with realistic operational statuses (`New`, `Pending Review`, `Approved`, `Edited`, `Rejected`).*

### 2. Run the Benchmark Evaluation (CLI)
```bash
python scripts/evaluate.py
```
*Runs held-out evaluation on `data/test/complaints_test.csv` and persists metrics to `data/processed/evaluation_results.json`.*

### 3. Start the FastAPI Backend Server
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
*Interactive Swagger documentation available at `http://localhost:8000/docs`.*

### 4. Start the Next.js Frontend
```bash
cd frontend
npm run dev -- -p 3000
```
*Open your browser at `http://localhost:3000`.*

### 5. Run Automated Tests
```bash
python -m pytest
```
*Executes all 83 test cases across Phases 0–5.*

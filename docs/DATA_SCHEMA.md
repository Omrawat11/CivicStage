# CivicTriage Data Foundation & Schema Specification

> **Synthetic Data Disclaimer:**
> The current dataset, taxonomy, and locality/ward mappings are synthetic/demo data and are not official government records. They are designed for development and evaluation and can later be replaced with partner-approved data.

---

## 1. Overview

**CivicTriage** processes unstructured citizen complaints submitted across diverse channels and languages (English, Hindi, Hinglish). Phase 1 establishes the canonical data foundation:
- Municipal department and complaint category taxonomy (`config/departments.json`, `config/categories.json`).
- Locality, ward, and multilingual alias gazetteer (`config/localities.json`).
- Structured Pydantic complaint record schema (`backend/data/schemas.py`).
- Deterministic synthetic dataset generator (`scripts/generate_dataset.py`) with duplicate clustering and repeat problem tracking.
- Held-out evaluation benchmark (`data/test/complaints_test.csv`).

---

## 2. Complaint Record Schema

Complaints are validated and represented using the `ComplaintRecord` Pydantic model (`backend/data/schemas.py`).

| Field Name | Type | Constraints / Allowed Values | Description |
| :--- | :--- | :--- | :--- |
| `complaint_id` | `str` | Format: `CMP-XXXX` or `CMP-TXXXX` | Unique identifier for the citizen complaint. |
| `source_channel` | `str` | `CM Helpline`, `Municipal Helpline`, `Mobile App`, `Social Media`, `Elected Representative` | Ingestion channel through which the complaint was received. |
| `timestamp` | `datetime` | ISO-8601 string / datetime | Date and time when the complaint was submitted. |
| `raw_text` | `str` | Non-empty string | Verbatim citizen text (unmodified). |
| `language_ground_truth` | `str` | `English`, `Hindi`, `Hinglish` | True linguistic format (ground truth for offline evaluation only). |
| `department_ground_truth` | `str` | One of 7 configured departments | True department handling the issue (ground truth only). |
| `category_ground_truth` | `str` | One of 24 configured categories | True category describing the issue (ground truth only). |
| `locality_ground_truth` | `str \| None` | Canonical locality name from gazetteer | True canonical locality mentioned by citizen, if present. |
| `ward_ground_truth` | `str \| None` | Valid ward string from gazetteer | True municipal ward number associated with locality. |
| `urgency_ground_truth` | `str` | `Low`, `Medium`, `High`, `Critical` | Baseline operational urgency level. |
| `incident_id` | `str` | Format: `INC-XXXX` | Ground-truth incident cluster ID for duplicate benchmarking. Hidden from LLM during inference. |
| `status` | `str` | `Pending`, `In Progress`, `Resolved` | Operational lifecycle status of the ticket. |
| `resolved_at` | `datetime \| None` | Required if `status == "Resolved"`, must be `None` if `status == "Pending"` | Timestamp of ticket resolution. Must be `>= timestamp`. |
| `ai_prediction` | `ComplaintTriage \| None` | Structured prediction | LLM inference output (populated in Phase 2+). |
| `operator_decision` | `dict \| None` | Operator audit log | Human triage approval/override record (future phases). |

---

## 3. Strict Architectural Separations

To ensure system integrity and honest evaluation metrics, CivicTriage strictly separates three dimensions of data:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Raw Citizen Input                                        │
│    - raw_text: "Kolar me 3 din se paani nahi aa raha hai"   │
│    - source_channel: "Mobile App"                           │
│    - timestamp: 2026-07-14T09:30:00                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (LLM Inference)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AI Prediction (Output of LLMProvider)                    │
│    - department: "Water Supply"                             │
│    - category: "Water outage"                               │
│    - locality: "Kolar"                                      │
│    - confidence: 0.93                                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Human Review / Approval)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Operator Decision (Human in the Loop)                    │
│    - approved_department: "Water Supply"                    │
│    - dispatched_zone: "Kolar Sub-Division"                  │
│    - operator_id: "OP-402"                                  │
└─────────────────────────────────────────────────────────────┘
```

**Evaluation Ground Truth:**
- `incident_id`, `department_ground_truth`, `category_ground_truth`, `locality_ground_truth`, `ward_ground_truth`, and `urgency_ground_truth` are **benchmark labels** used solely for measuring accuracy, recall, and deduplication precision.
- **They are strictly hidden from LLM providers during inference.**

---

## 4. Duplicates vs. Repeat Complaints

A critical distinction in municipal civic operations is the difference between **duplicate complaints** and **repeat complaints**:

### A. Duplicate Incidents (Clustering)
- **Definition:** Multiple distinct citizens reporting the **same underlying event or breakdown** within a localized time window (e.g. within 24 to 72 hours).
- **Example:**
  - `C001` (Monday 08:00): *"Kolar me 3 din se paani nahi aa raha"*
  - `C027` (Monday 10:30): *"No water supply in Kolar area"*
  - `C084` (Monday 14:15): *"कोलार में पानी की सप्लाई बंद है"*
  - `C121` (Tuesday 09:00): *"Kolar side water problem since Monday"*
- **Ground Truth Modeling:** All 4 complaints share the same `incident_id = "INC-0001"`.
- **Operational Goal:** Cluster these into a single action ticket so field engineers receive 1 dispatch rather than 4 separate work orders.

### B. Repeat Complaints (Chronic / Recurring Problems)
- **Definition:** The **same type of problem** occurring in the **same locality** at a **later time** after a prior incident was closed.
- **Example:**
  - June 10: Kolar pipeline burst (`incident_id = "INC-0010"`) -> *Resolved June 12*
  - July 15: Kolar pipeline burst (`incident_id = "INC-0042"`) -> *Resolved July 17*
  - August 22: Kolar pipeline burst (`incident_id = "INC-0089"`) -> *Resolved August 24*
- **Ground Truth Modeling:** Each event is assigned a **different incident ID**, because they are distinct real-world occurrences.
- **Operational Goal:** Identify recurring infrastructure failures for preventive capital replacement, not immediate deduplication.

---

## 5. Taxonomy Structure (`config/departments.json` & `config/categories.json`)

The taxonomy organizes municipal operations into 7 departments and 24 categories:

- **Water Supply**: Water outage, Low water pressure, Water leakage, Contaminated water
- **Sanitation**: Garbage accumulation, Irregular garbage collection, Dead animal removal, Open dumping
- **Roads**: Pothole, Road damage, Road obstruction
- **Drainage**: Drain blockage, Overflowing sewage, Damaged manhole cover
- **Street Lighting**: Streetlight not working, Flickering streetlight, Exposed wiring on pole
- **Electricity**: Power outage, Low voltage, Loose overhead wires
- **Public Health**: Mosquito breeding / fogging request, Stray dog menace, Stagnant water near habitation, Public toilet sanitation

---

## 6. Gazetteer Structure (`config/localities.json`)

Contains 40 realistic Bhopal localities with canonical names, assigned ward numbers, and multilingual variations:

```json
{
  "name": "Kolar",
  "ward": "80",
  "aliases": ["Kolar Road", "Kolar side", "Kolar area", "कोलार", "कोलार रोड", "Kolar nagar"]
}
```

Aliases include:
- Formal English names and regional sector abbreviations (`E-1 Arera Colony`, `MP Nagar Zone 1`).
- Colloquial Hindi / Devanagari script (`कोलार`, `एमपी नगर`, `अरेरा कॉलोनी`).
- Hinglish conversational forms (`Kolar side`, `Bittan market ground`).

---

## 7. Dataset Layout

```text
data/
├── raw/
│   └── complaints_raw.csv        # 750 uncurated synthetic records
├── processed/
│   └── complaints.csv            # 750 validated records with ground truth
└── test/
    └── complaints_test.csv       # 100 held-out evaluation records (disjoint IDs)
```

# CivicTriage — 5-Minute Hackathon Demonstration Script

This walkthrough script is designed for live demonstration to hackathon judges, municipal administrators, and technical evaluators.

---

## Preparation (Before Demo)

1. **Verify Services Running**:
   - Backend API running on `http://127.0.0.1:8000` (FastAPI)
   - Frontend running on `http://localhost:3000` (Next.js)
2. **Seed Clean Database**:
   ```bash
   python scripts/seed_database.py
   ```
3. **Open Browser**:
   - Navigate to `http://localhost:3000/`

---

## 5-Minute Demonstration Walkthrough

### Part 1: Municipal Operations Dashboard (1 minute)
**URL**: `http://localhost:3000/`

- **Point out Core KPIs**:
  - Show the 4 top metrics: Total Complaints (750), Urgent Complaints (119), Potential Duplicates (750), and Pending Review.
  - Explain: *"All numbers are computed in real time from the SQLite database; there are zero mock statistics on this dashboard."*
- **Highlight Emerging Hotspots**:
  - Direct attention to the **Emerging Issues & Incident Clusters** section.
  - Point out active hotspots (e.g. `🚨 Kolar — Water Supply | 12 complaints • 36h period`).
  - Click on the hotspot card to open the **Cluster Detail Modal**:
    - Show the incident ID, complaint volume, time span, and the full table of linked complaints.
    - Show that each linked ticket can be opened directly.
    - Close the modal.

---

### Part 2: Multimodal Complaint Intake (1 minute)
**URL**: `http://localhost:3000/complaints`

- Click the blue **"+ New Intake (Text / Audio / Image)"** button.
- **Scenario A: Voice / Audio Grievance**:
  - Click the **Voice / Audio Intake** tab.
  - Click the demo button: **"🎙️ Audio: Kolar Water Call"**.
  - Show the speech-to-text transcript generated:
    *"Kolar me 3 din se paani nahi aa raha hai kripya jaldi theek karein, pipeline leak ho rahi hai."*
  - Highlight: *"The human operator can inspect and edit the verbatim transcript before running triage."*
- **Scenario B: Photo Evidence Intake**:
  - Switch to the **Photo Evidence Intake** tab.
  - Click the demo button: **"📷 Photo: Kolar Pothole"**.
  - Show the multimodal understanding extraction:
    *"Visual Evidence: Photo shows a severe deep pothole and broken asphalt hazard on the road. Citizen caption: 'Dangerous deep pothole near Kolar market'."*
- Click **"Submit & Run AI Triage"**:
  - Watch the live progress spinner.
  - See the instant structured triage card: assigned Department (`Roads`), Category (`Potholes`), and Urgency level.
  - Click **"Open Ticket for Review"**.

---

### Part 3: Deep Triage & Human-in-the-Loop Audit (1.5 minutes)
**URL**: `http://localhost:3000/complaints/[id]`

- **Original Complaint**:
  - Point out the citizen statement in Hinglish.
- **AI Recommendation**:
  - Point out the confidence meter (e.g. 92%).
  - Highlight the **Quoted Evidence Pills**: show exact words extracted from citizen text (`"Kolar"`, `"paani nahi aa raha"`).
- **Multi-Factor Urgency Breakdown**:
  - Show the 0–12 score and the individual factor radar: Severity, Public Hazard, Duration, Escalation Risk.
- **Duplicate Cluster Advisory**:
  - Show the matched incident ID (e.g. `INC-0022`) and vector similarity score.
- **Human Decision Action (Human-in-the-Loop Safety)**:
  - Explain: *"AI never modifies live databases or dispatches field crews autonomously."*
  - Demonstrate an **Edit Decision**:
    - Select **Edit** mode.
    - Adjust category or ward.
    - Add an Operator Note: *"Inspected via field officer Sharma, priority pipeline repair team dispatched."*
    - Click **"Save Review Decision"**.
  - Show the **Audit Comparison Table**:
    - Point out that `ai_*` fields remain permanently preserved while `operator_*` records the human audit trail.
- **Citizen Acknowledgement Draft**:
  - Show the automatically formulated acknowledgement letter.
  - Note the prominent badge: `[DRAFT ACKNOWLEDGEMENT • NOT SENT]`.
  - Explain that no external citizen SMS or WhatsApp is dispatched automatically.

---

### Part 4: 8-Way Filterable Complaint Queue (45 seconds)
**URL**: `http://localhost:3000/complaints`

- Demonstrate multi-attribute filtering:
  - Filter by **Department**: `Water Supply`.
  - Filter by **Urgency**: `HIGH`.
  - Filter by **Locality**: `Kolar`.
  - Filter by **Language**: `Hinglish`.
- Show how the queue updates in real time.
- Click **"Reset Filters"** to restore full view.

---

### Part 5: Department Accountability & Benchmark Evaluation (45 seconds)
**URL**: `http://localhost:3000/reports` and `http://localhost:3000/evaluation`

- **Weekly Accountability Reports (`/reports`)**:
  - Show the **AI Executive Narrative Summary** based strictly on pre-computed metrics.
  - Show the **Department Comparison Table** with resolution rates and outlier-resistant median resolution times.
  - Click **"Inspect"** on Water Supply to view the single-department drilldown modal.
- **Model Evaluation Benchmark (`/evaluation`)**:
  - Show the held-out test benchmark metrics: Department Accuracy, Category Accuracy, Locality Accuracy, Urgency Agreement.
  - Show the **Duplicate Detection Matrix**: Precision, Recall, and F1 Score.
  - Show the live **Human Correction Rate** (computed directly from SQLite human decisions).
  - Click **"Re-run Evaluation"** to demonstrate live execution of the benchmark suite.

---

## 5 Presentation Examples Quick Reference

| # | Demo Case | Location / ID | Key Feature Demonstrated |
| :--- | :--- | :--- | :--- |
| **1** | **Multilingual Hinglish** | `CMP-0001` or Intake Modal | Understands mixed Hindi/English idiom and extracts clean canonical department. |
| **2** | **Duplicate Cluster** | `INC-0022` / `CMP-0022` | Identifies differently phrased reports of the same pipeline leak using TF-IDF. |
| **3** | **Repeat Chronic Issue** | Kolar Water Outages | Distinguishes recurring chronic seasonal issues from active duplicate clusters. |
| **4** | **High/Critical Urgency** | `CMP-0028` / Open Manhole | Evaluates public safety hazard and flags HIGH/CRITICAL urgency automatically. |
| **5** | **Operator Correction** | Detail Review Console | Human operator overrides recommendation with audit notes; AI fields preserved. |

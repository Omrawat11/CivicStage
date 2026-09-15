/**
 * CivicTriage Backend API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ComplaintDetail {
  id: number;
  complaint_id: string;
  source_channel: string;
  timestamp: string;
  raw_text: string;
  language: string;
  status: string;
  effective_department: string | null;
  effective_category: string | null;
  effective_locality: string | null;
  effective_ward: string | null;
  effective_urgency: string | null;
  original_complaint: {
    complaint_id: string;
    source_channel: string;
    timestamp: string;
    raw_text: string;
    language: string;
    status: string;
  };
  ai_recommendation: {
    department: string | null;
    category: string | null;
    locality: string | null;
    ward: string | null;
    urgency: string | null;
    urgency_score: number | null;
    urgency_factors: Record<string, number>;
    confidence: number | null;
    evidence: string[];
    summary: string | null;
  };
  duplicate_info: {
    duplicate_status: string;
    matched_incident_id: string | null;
    similarity_score: number | null;
    cluster_complaints_count: number;
    duplicate_summary: string | null;
    incident_id: string | null;
  };
  operator_info: {
    operator_decision: string | null;
    operator_department: string | null;
    operator_category: string | null;
    operator_locality: string | null;
    operator_ward: string | null;
    operator_urgency: string | null;
    operator_notes: string | null;
    operator_reviewed_at: string | null;
  };
  acknowledgement: {
    acknowledgement_draft: string | null;
  };
  created_at: string | null;
  updated_at: string | null;
}

export interface ComplaintListResponse {
  items: ComplaintDetail[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PriorityItem {
  urgency: string;
  category: string;
  locality: string;
  count: number;
}

export interface DashboardStats {
  total_complaints: number;
  urgent_complaints: number;
  potential_duplicates: number;
  pending_review: number;
  priority_queue: PriorityItem[];
}

export interface DepartmentTaxonomy {
  name: string;
  description: string;
  categories: string[];
}

export interface TaxonomyResponse {
  departments: DepartmentTaxonomy[];
  localities: string[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE_URL}/complaints/stats`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch stats: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchComplaints(params: Record<string, string | number | undefined>): Promise<ComplaintListResponse> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.append(key, String(value));
    }
  }
  const res = await fetch(`${API_BASE_URL}/complaints?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch complaints: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchComplaintById(complaintId: string): Promise<ComplaintDetail> {
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch complaint ${complaintId}: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerTriage(complaintId: string): Promise<ComplaintDetail> {
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/triage`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to run triage on ${complaintId}: ${res.statusText}`);
  }
  return res.json();
}

export async function submitOperatorReview(
  complaintId: string,
  payload: {
    decision: "approve" | "edit" | "reject";
    department?: string | null;
    category?: string | null;
    locality?: string | null;
    ward?: string | null;
    urgency?: string | null;
    notes?: string | null;
  }
): Promise<ComplaintDetail> {
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to record review for ${complaintId}: ${res.statusText}`);
  }
  return res.json();
}

export async function updateAcknowledgementDraft(
  complaintId: string,
  draftText: string
): Promise<{ complaint_id: string; acknowledgement_draft: string }> {
  const res = await fetch(`${API_BASE_URL}/complaints/${complaintId}/acknowledgement`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acknowledgement_draft: draftText }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update acknowledgement draft: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchTaxonomy(): Promise<TaxonomyResponse> {
  const res = await fetch(`${API_BASE_URL}/meta/taxonomy`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load taxonomy metadata: ${res.statusText}`);
  }
  return res.json();
}

// --- Phase 4 Reports & Evaluation Types & Functions ---

export interface DepartmentMetric {
  department: string;
  complaints_received: number;
  complaints_resolved: number;
  complaints_pending: number;
  resolution_rate: number;
  median_resolution_time_hours: number | null;
  repeat_complaints: number;
  duplicate_complaints: number;
  top_locality: string | null;
}

export interface EmergingIssue {
  locality: string;
  department: string;
  category: string;
  incident_id: string | null;
  complaints_count: number;
  duplicate_count: number;
  repeat_count: number;
  time_span_days: number;
  summary: string;
}

export interface WeeklyReportResponse {
  reporting_period: {
    start_date: string | null;
    end_date: string | null;
  };
  total_complaints: number;
  total_resolved: number;
  total_pending: number;
  overall_resolution_rate: number;
  overall_median_resolution_time_hours: number | null;
  departments: DepartmentMetric[];
  emerging_issues: EmergingIssue[];
  narrative_summary: string;
}

export interface EvaluationMetricResponse {
  timestamp: string;
  provider: string;
  model: string;
  test_dataset_size: number;
  department_accuracy: number;
  category_accuracy: number;
  locality_accuracy: number;
  urgency_agreement: number;
  duplicate_precision: number;
  duplicate_recall: number;
  duplicate_f1: number;
  duplicate_detection: {
    precision: number;
    recall: number;
    f1: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    true_negatives: number;
    definition: string;
  };
  human_correction_rate: number;
  human_in_the_loop: {
    total_reviewed: number;
    corrections_count: number;
    human_correction_rate: number;
    definition: string;
  };
  per_department_metrics: Record<string, { total: number; correct: number; accuracy: number }>;
}

export async function fetchWeeklyReport(params?: { start_date?: string; end_date?: string }): Promise<WeeklyReportResponse> {
  const query = new URLSearchParams();
  if (params?.start_date) query.append("start_date", params.start_date);
  if (params?.end_date) query.append("end_date", params.end_date);

  const res = await fetch(`${API_BASE_URL}/reports/weekly?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch weekly report: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchSingleDepartmentReport(
  department: string,
  params?: { start_date?: string; end_date?: string }
): Promise<DepartmentMetric> {
  const query = new URLSearchParams();
  if (params?.start_date) query.append("start_date", params.start_date);
  if (params?.end_date) query.append("end_date", params.end_date);

  const res = await fetch(`${API_BASE_URL}/reports/departments/${encodeURIComponent(department)}?${query.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch report for department ${department}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchEvaluationMetrics(): Promise<EvaluationMetricResponse> {
  const res = await fetch(`${API_BASE_URL}/evaluation`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch evaluation metrics: ${res.statusText}`);
  }
  return res.json();
}

export async function triggerEvaluationRun(): Promise<EvaluationMetricResponse> {
  const res = await fetch(`${API_BASE_URL}/evaluation/run`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to run evaluation benchmark: ${res.statusText}`);
  }
  return res.json();
}


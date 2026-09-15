"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  XCircle,
  AlertTriangle,
  Zap,
  Copy,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Save,
  Building,
  MapPin,
  Flame,
  FileCheck,
  MessageSquareQuote,
  Scale,
} from "lucide-react";
import {
  fetchComplaintById,
  triggerTriage,
  submitOperatorReview,
  updateAcknowledgementDraft,
  fetchTaxonomy,
  ComplaintDetail,
  TaxonomyResponse,
} from "@/lib/api";

export default function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const complaintId = resolvedParams.id;

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review mode states: 'view', 'edit', 'approve_confirm', 'reject_confirm'
  const [reviewMode, setReviewMode] = useState<"view" | "edit" | "approve_confirm" | "reject_confirm">("view");

  // Operator form inputs
  const [editDept, setEditDept] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editLoc, setEditLoc] = useState("");
  const [editWard, setEditWard] = useState("");
  const [editUrgency, setEditUrgency] = useState("");
  const [operatorNotes, setOperatorNotes] = useState("");

  // Acknowledgement draft input
  const [ackDraft, setAckDraft] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    fetchTaxonomy().then(setTaxonomy).catch(console.error);
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchComplaintById(complaintId);
      setComplaint(data);
      setAckDraft(data.acknowledgement.acknowledgement_draft || "");

      // Pre-fill operator edit fields from existing operator decision or AI recommendation
      const ai = data.ai_recommendation;
      const op = data.operator_info;
      setEditDept(op.operator_department || ai.department || "");
      setEditCat(op.operator_category || ai.category || "");
      setEditLoc(op.operator_locality || ai.locality || "");
      setEditWard(op.operator_ward || ai.ward || "");
      setEditUrgency(op.operator_urgency || ai.urgency || "MEDIUM");
      setOperatorNotes(op.operator_notes || "");
    } catch (err: unknown) {
      console.error(err);
      setError(`Failed to load complaint with ID ${complaintId}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [complaintId]);

  const handleTriage = async () => {
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const updated = await triggerTriage(complaintId);
      setComplaint(updated);
      setAckDraft(updated.acknowledgement.acknowledgement_draft || "");
      setSuccessMessage("Automated AI triage completed successfully.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to run AI triage pipeline on this complaint.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const updated = await submitOperatorReview(complaintId, {
        decision: "approve",
        notes: operatorNotes || "Approved by municipal operator.",
      });
      setComplaint(updated);
      setAckDraft(updated.acknowledgement.acknowledgement_draft || "");
      setReviewMode("view");
      setSuccessMessage("AI recommendation approved and ticket marked as Approved.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to submit approval.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const updated = await submitOperatorReview(complaintId, {
        decision: "edit",
        department: editDept,
        category: editCat,
        locality: editLoc,
        ward: editWard,
        urgency: editUrgency,
        notes: operatorNotes || "Adjusted by municipal operator.",
      });
      setComplaint(updated);
      setAckDraft(updated.acknowledgement.acknowledgement_draft || "");
      setReviewMode("view");
      setSuccessMessage("Operator edits saved. AI prediction remains untouched.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save edited values.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setSuccessMessage(null);
    try {
      const updated = await submitOperatorReview(complaintId, {
        decision: "reject",
        notes: operatorNotes || "Dismissed by municipal operator.",
      });
      setComplaint(updated);
      setAckDraft(updated.acknowledgement.acknowledgement_draft || "");
      setReviewMode("view");
      setSuccessMessage("Complaint marked as Rejected.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to submit rejection.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setDraftSaving(true);
    try {
      await updateAcknowledgementDraft(complaintId, ackDraft);
      setSuccessMessage("Citizen acknowledgement draft updated.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save acknowledgement draft text.");
    } finally {
      setDraftSaving(false);
    }
  };

  // Get categories available for currently selected edit department
  const selectedDeptObj = taxonomy?.departments.find((d) => d.name === editDept);
  const availableCategories = selectedDeptObj ? selectedDeptObj.categories : [];

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm">Loading complaint details...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="py-16 text-center text-slate-400">
        <p className="text-sm text-red-400 font-medium">Complaint not found.</p>
        <Link href="/complaints" className="mt-4 inline-block text-xs text-blue-400 hover:underline">
          ← Back to complaints queue
        </Link>
      </div>
    );
  }

  const ai = complaint.ai_recommendation;
  const op = complaint.operator_info;
  const dup = complaint.duplicate_info;
  const isUntriaged = complaint.status === "New" && !ai.department;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/complaints"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                {complaint.complaint_id}
              </h1>
              {/* Lifecycle Status Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${
                  complaint.status === "Approved"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : complaint.status === "Edited"
                    ? "bg-purple-950 text-purple-300 border border-purple-800"
                    : complaint.status === "Rejected"
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : complaint.status === "Pending Review"
                    ? "bg-blue-950 text-blue-300 border border-blue-800"
                    : "bg-slate-900 text-slate-300 border border-slate-700"
                }`}
              >
                {complaint.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-slate-300 font-medium">{complaint.source_channel}</span> • Recorded:{" "}
              <span className="text-slate-300 font-medium">
                {complaint.timestamp ? new Date(complaint.timestamp).toLocaleString() : "N/A"}
              </span>
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {isUntriaged && (
            <button
              onClick={handleTriage}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{actionLoading ? "Running Triage..." : "Run AI Triage"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint & AI Intelligence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Original Citizen Complaint (Section 15.1) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MessageSquareQuote className="w-4 h-4 text-blue-400" />
                Original Citizen Grievance
              </span>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-300 rounded border border-slate-700">
                Language: {complaint.language}
              </span>
            </div>
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm leading-relaxed font-sans select-text">
              &ldquo;{complaint.raw_text}&rdquo;
            </div>
          </div>

          {/* 2. AI Recommendation & Evidence (Section 15.2 & 15.3) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">AI Triage Recommendation</h2>
                  <p className="text-[11px] text-slate-400">
                    Automated classification via CivicTriage intelligence engine.
                  </p>
                </div>
              </div>
              {ai.confidence && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Confidence</span>
                  <div className="text-sm font-extrabold text-blue-400 font-mono">
                    {Math.round(ai.confidence * 100)}%
                  </div>
                </div>
              )}
            </div>

            {ai.department ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Department</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.department}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Category</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.category}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Locality</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.locality || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Ward</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.ward || "—"}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {ai.summary && (
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">AI Executive Summary</span>
                    {ai.summary}
                  </div>
                )}

                {/* Evidence Phrases (Section 15.3) */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                    Extracted Quoted Evidence:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ai.evidence && ai.evidence.length > 0 ? (
                      ai.evidence.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-mono bg-blue-950/70 text-blue-300 border border-blue-800/70 rounded-md"
                        >
                          &ldquo;{phrase}&rdquo;
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No quoted evidence recorded.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs">
                Ticket is untriaged. Click &ldquo;Run AI Triage&rdquo; to analyze with the pipeline.
              </div>
            )}
          </div>

          {/* 3. Urgency Explanation & Factor Reasoning (Section 15.4) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Urgency Reasoning & Factor-Level Breakdown
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-extrabold uppercase tracking-wide ${
                  ai.urgency === "CRITICAL"
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : ai.urgency === "HIGH"
                    ? "bg-orange-950 text-orange-400 border border-orange-800"
                    : "bg-amber-950 text-amber-400 border border-amber-800"
                }`}
              >
                {ai.urgency || "MEDIUM"} — Score {ai.urgency_score ?? 6}/12
              </span>
            </div>

            {/* Constituent Factor Scores Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Service Outage</span>
                <span className="font-mono font-bold text-blue-400">
                  +{ai.urgency_factors?.service_outage ?? 2}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Hazard Duration</span>
                <span className="font-mono font-bold text-amber-400">
                  +{ai.urgency_factors?.duration ?? 1}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Affected Scale</span>
                <span className="font-mono font-bold text-purple-400">
                  +{ai.urgency_factors?.scale ?? 2}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Public Safety</span>
                <span className="font-mono font-bold text-red-400">
                  +{ai.urgency_factors?.safety ?? 1}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Duplicate Information (Section 15.5) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-amber-400" />
                Duplicate & Repeat Incident Advisory
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  dup.duplicate_status === "duplicate"
                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                    : dup.duplicate_status === "repeat"
                    ? "bg-orange-950 text-orange-300 border border-orange-800"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {dup.duplicate_status}
              </span>
            </div>

            {dup.duplicate_status !== "unique" ? (
              <div className="p-3.5 rounded-lg bg-amber-950/30 border border-amber-800/50 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-300 font-semibold">
                  <span>Matched Cluster: {dup.matched_incident_id || "INC-CLUSTER"}</span>
                  <span className="font-mono">
                    Similarity: {Math.round((dup.similarity_score || 0) * 100)}%
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{dup.duplicate_summary}</p>
                {dup.cluster_complaints_count > 0 && (
                  <div className="text-[11px] text-amber-400 font-medium">
                    {dup.cluster_complaints_count} related complaints currently associated with this incident cluster.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400">
                Unique complaint. No semantic vector duplicates or repeat recurring incidents detected within the advisory window.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Operator Workflow & Review (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operator Controls Box (Section 15.6 & 16) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Human Operator Decision
              </span>
              {op.operator_decision && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Decision: {op.operator_decision}
                </span>
              )}
            </div>

            {/* Mode 1: Default Action Buttons */}
            {reviewMode === "view" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Select an operational action. The AI recommendations remain permanently archived and will never be overwritten.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setReviewMode("approve_confirm")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 font-semibold text-xs transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5 mb-1 text-emerald-400" />
                    Approve
                  </button>

                  <button
                    onClick={() => setReviewMode("edit")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-800/80 text-blue-300 font-semibold text-xs transition-colors"
                  >
                    <Edit3 className="w-5 h-5 mb-1 text-blue-400" />
                    Edit
                  </button>

                  <button
                    onClick={() => setReviewMode("reject_confirm")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-semibold text-xs transition-colors"
                  >
                    <XCircle className="w-5 h-5 mb-1 text-rose-400" />
                    Reject
                  </button>
                </div>

                {op.operator_notes && (
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Existing Operator Audit Note
                    </span>
                    <p className="text-slate-300">{op.operator_notes}</p>
                    {op.operator_reviewed_at && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Reviewed at: {new Date(op.operator_reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Edit Form (Section 16) */}
            {reviewMode === "edit" && (
              <div className="space-y-3 pt-1">
                <div className="p-2.5 rounded bg-blue-950/50 border border-blue-800/50 text-[11px] text-blue-300">
                  Editing operator decision values. Original AI prediction is protected and will not be overwritten.
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Department
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => {
                      setEditDept(e.target.value);
                      setEditCat("");
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {taxonomy?.departments.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Category
                  </label>
                  <select
                    value={editCat}
                    onChange={(e) => setEditCat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Locality
                    </label>
                    <input
                      type="text"
                      value={editLoc}
                      onChange={(e) => setEditLoc(e.target.value)}
                      placeholder="e.g. Kolar"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Ward
                    </label>
                    <input
                      type="text"
                      value={editWard}
                      onChange={(e) => setEditWard(e.target.value)}
                      placeholder="e.g. 80"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Urgency
                  </label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Operator Notes & Verification Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Provide justification for edits or field verification notes..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewMode("view")}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    {actionLoading ? "Saving..." : "Save Operator Edits"}
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: Approve Confirmation */}
            {reviewMode === "approve_confirm" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300">
                  Accept AI triage recommendation as official municipal ticket assignment.
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Operator Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="e.g. Verified by operator via phone call..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReviewMode("view")}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Confirm Approval"}
                  </button>
                </div>
              </div>
            )}

            {/* Mode 4: Reject Confirmation */}
            {reviewMode === "reject_confirm" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
                  Reject and close this grievance (e.g. duplicate or out of municipal jurisdiction).
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Rejection Justification (Required)
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNotes}
                    onChange={(e) => setOperatorNotes(e.target.value)}
                    placeholder="Specify why grievance is being rejected..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setReviewMode("view")}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Comparison: AI Prediction vs Operator Decision */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-blue-400" />
              AI vs. Human Decision Audit Comparison
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2 text-blue-400">AI Prediction</th>
                    <th className="px-3 py-2 text-emerald-400">Operator Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Department</td>
                    <td className="px-3 py-2 text-slate-200">{ai.department || "—"}</td>
                    <td className="px-3 py-2 text-white font-semibold">{op.operator_department || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Category</td>
                    <td className="px-3 py-2 text-slate-200">{ai.category || "—"}</td>
                    <td className="px-3 py-2 text-white font-semibold">{op.operator_category || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Locality</td>
                    <td className="px-3 py-2 text-slate-200">{ai.locality || "—"}</td>
                    <td className="px-3 py-2 text-white font-semibold">{op.operator_locality || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Ward</td>
                    <td className="px-3 py-2 text-slate-200">{ai.ward || "—"}</td>
                    <td className="px-3 py-2 text-white font-semibold">{op.operator_ward || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Urgency</td>
                    <td className="px-3 py-2 text-slate-200">{ai.urgency || "—"}</td>
                    <td className="px-3 py-2 text-white font-semibold">{op.operator_urgency || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 italic pt-1">
              Guaranteed by architecture: AI recommendations remain intact for human correction rate evaluation.
            </p>
          </div>

          {/* Citizen Acknowledgement Draft (Section 11) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Citizen Acknowledgement Draft
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                DRAFT ONLY • NOT SENT
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Generated municipal communication draft. No external dispatches (SMS/email/WhatsApp) are triggered.
            </p>

            <textarea
              rows={5}
              value={ackDraft}
              onChange={(e) => setAckDraft(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-blue-400" />
                <span>{draftSaving ? "Saving Draft..." : "Save Draft Text"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

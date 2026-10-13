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
  Check,
  ChevronRight,
  UserCheck,
  Activity,
  Layers,
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

  // Acknowledgement draft input & copy state
  const [ackDraft, setAckDraft] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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

      // Pre-fill operator edit fields
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
      setSuccessMessage("AI recommendation approved and ticket officially marked as Approved.");
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
      setSuccessMessage("Operator edits saved. AI prediction remains archived as reference.");
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
      setSuccessMessage("Citizen acknowledgement draft updated successfully.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to save acknowledgement draft text.");
    } finally {
      setDraftSaving(false);
    }
  };

  const copyToClipboard = () => {
    if (!ackDraft) return;
    navigator.clipboard.writeText(ackDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedDeptObj = taxonomy?.departments.find((d) => d.name === editDept);
  const availableCategories = selectedDeptObj ? selectedDeptObj.categories : [];

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Loading complaint triage console...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-4">
        <p className="text-sm text-rose-400 font-semibold">Complaint record not found.</p>
        <Link
          href="/complaints"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Triage Queue
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
      {/* Top Header & Breadcrumb Ribbon */}
      <div className="glass-panel rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Link
            href="/complaints"
            className="p-2 rounded-xl bg-slate-900 border border-[var(--border-subtle)] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to queue"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
                {complaint.complaint_id}
              </span>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold ${
                  complaint.status === "Approved"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    : complaint.status === "Edited"
                    ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                    : complaint.status === "Rejected"
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : complaint.status === "Pending Review"
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                    : "bg-slate-900 text-slate-300 border border-slate-700"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {complaint.status}
              </span>

              <span className="text-xs text-slate-400 font-medium">
                • Channel: <strong className="text-white">{complaint.source_channel}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 font-mono">
              Recorded: {complaint.timestamp ? new Date(complaint.timestamp).toLocaleString() : "N/A"}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {isUntriaged && (
            <button
              onClick={handleTriage}
              disabled={actionLoading}
              className="btn-sheen flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
            >
              <Zap className="w-4 h-4" />
              <span>{actionLoading ? "Processing..." : "Run AI Triage"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between animate-float-up">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between animate-float-up">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint & AI Intelligence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Original Citizen Complaint */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-blue-400" />
                Original Citizen Grievance
              </span>
              <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-slate-900 text-slate-300 rounded-md border border-white/[0.06]">
                Lang: {complaint.language}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] text-slate-100 text-sm leading-relaxed font-sans select-text shadow-inner">
              &ldquo;{complaint.raw_text}&rdquo;
            </div>
          </div>

          {/* 2. AI Recommendation & Evidence */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">AI Triage Classification</h2>
                  <p className="text-[11px] text-slate-400">
                    Extracted via Gemini 2.0 Flash intelligence pipeline.
                  </p>
                </div>
              </div>
              {ai.confidence && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Confidence</span>
                  <div className="text-sm font-black text-blue-400 font-mono">
                    {Math.round(ai.confidence * 100)}%
                  </div>
                </div>
              )}
            </div>

            {ai.department ? (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Department</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.department}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.category}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Locality</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.locality || "—"}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/[0.06]">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Ward</span>
                    <p className="text-xs font-bold text-white mt-1">{ai.ward || "—"}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {ai.summary && (
                  <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/[0.06] text-xs text-slate-300 leading-relaxed">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      AI Executive Summary
                    </span>
                    {ai.summary}
                  </div>
                )}

                {/* Extracted Evidence Phrases */}
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-2">
                    Extracted Grounded Evidence:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {ai.evidence && ai.evidence.length > 0 ? (
                      ai.evidence.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 text-xs font-mono bg-blue-500/10 text-blue-300 border border-blue-500/25 rounded-lg"
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
              <div className="p-6 text-center text-slate-400 text-xs">
                Ticket is untriaged. Click &ldquo;Run AI Triage&rdquo; to process.
              </div>
            )}
          </div>

          {/* 3. Urgency Reasoning & 4-Factor Breakdown */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Urgency Reasoning & 4-Factor Hazard Matrix
              </span>
              <span
                className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                  ai.urgency === "CRITICAL"
                    ? "badge-critical"
                    : ai.urgency === "HIGH"
                    ? "badge-high"
                    : "badge-medium"
                }`}
              >
                {ai.urgency || "MEDIUM"} — Score {ai.urgency_score ?? 6}/12
              </span>
            </div>

            {/* Factor Gauges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { label: "Public Safety", val: ai.urgency_factors?.safety ?? 1, color: "text-rose-400", bar: "bg-rose-500" },
                { label: "Service Outage", val: ai.urgency_factors?.service_outage ?? 2, color: "text-blue-400", bar: "bg-blue-500" },
                { label: "Hazard Duration", val: ai.urgency_factors?.duration ?? 1, color: "text-amber-400", bar: "bg-amber-500" },
                { label: "Affected Scale", val: ai.urgency_factors?.scale ?? 2, color: "text-purple-400", bar: "bg-purple-500" },
              ].map((factor, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] font-semibold">{factor.label}</span>
                    <span className={`font-mono font-bold ${factor.color}`}>+{factor.val}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${factor.bar} rounded-full`}
                      style={{ width: `${Math.min(100, (factor.val / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Duplicate Information */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                Duplicate & Repeat Incident Advisory
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  dup.duplicate_status === "duplicate"
                    ? "badge-high"
                    : dup.duplicate_status === "repeat"
                    ? "badge-critical"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {dup.duplicate_status}
              </span>
            </div>

            {dup.duplicate_status !== "unique" ? (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2 text-xs">
                <div className="flex items-center justify-between text-amber-300 font-semibold">
                  <span>Matched Cluster: {dup.matched_incident_id || "INC-CLUSTER"}</span>
                  <span className="font-mono">
                    Similarity: {Math.round((dup.similarity_score || 0) * 100)}%
                  </span>
                </div>
                <p className="text-slate-200 leading-relaxed">{dup.duplicate_summary}</p>
                {dup.cluster_complaints_count > 0 && (
                  <div className="text-[11px] text-amber-400 font-semibold pt-1">
                    {dup.cluster_complaints_count} related complaints currently associated with this incident cluster.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-white/[0.06] text-xs text-slate-400">
                Unique complaint. No repeat incidents or spatial duplicates detected in the active time window.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Operator Workflow & Review (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Operator Decision Console */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Human Operator Decision
              </span>
              {op.operator_decision && (
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Logged: {op.operator_decision}
                </span>
              )}
            </div>

            {/* Mode 1: Default Action Buttons */}
            {reviewMode === "view" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Review and choose an operational action. The AI recommendations remain permanently archived and will never be overwritten.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setReviewMode("approve_confirm")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/70 text-emerald-300 font-bold text-xs transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle2 className="w-5 h-5 mb-1.5 text-emerald-400" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => setReviewMode("edit")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/70 text-blue-300 font-bold text-xs transition-all hover:scale-[1.02]"
                  >
                    <Edit3 className="w-5 h-5 mb-1.5 text-blue-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => setReviewMode("reject_confirm")}
                    disabled={actionLoading}
                    className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/70 text-rose-300 font-bold text-xs transition-all hover:scale-[1.02]"
                  >
                    <XCircle className="w-5 h-5 mb-1.5 text-rose-400" />
                    <span>Reject</span>
                  </button>
                </div>

                {op.operator_notes && (
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Existing Operator Audit Note
                    </span>
                    <p className="text-slate-200">{op.operator_notes}</p>
                    {op.operator_reviewed_at && (
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Reviewed: {new Date(op.operator_reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Edit Form */}
            {reviewMode === "edit" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
                  Editing operator values. Original AI prediction is protected and will not be overwritten.
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                      className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                      className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    {actionLoading ? "Saving..." : "Save Operator Edits"}
                  </button>
                </div>
              </div>
            )}

            {/* Mode 3: Approve Confirmation */}
            {reviewMode === "approve_confirm" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300">
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Confirm Approval"}
                  </button>
                </div>
              </div>
            )}

            {/* Mode 4: Reject Confirmation */}
            {reviewMode === "reject_confirm" && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
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
                    className="w-full px-3 py-2 bg-slate-900 border border-white/[0.1] rounded-xl text-xs text-white"
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
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    {actionLoading ? "Processing..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit Comparison Table */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-400" />
              AI vs. Operator Audit Comparison
            </span>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#030712]/90 text-[10px] uppercase font-bold text-slate-400 border-b border-white/[0.06]">
                  <tr>
                    <th className="px-3.5 py-2.5">Field</th>
                    <th className="px-3.5 py-2.5 text-blue-400">AI Prediction</th>
                    <th className="px-3.5 py-2.5 text-emerald-400">Operator Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-medium bg-slate-900/40">
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-400">Department</td>
                    <td className="px-3.5 py-2.5 text-slate-200">{ai.department || "—"}</td>
                    <td className="px-3.5 py-2.5 text-white font-bold">{op.operator_department || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-400">Category</td>
                    <td className="px-3.5 py-2.5 text-slate-200">{ai.category || "—"}</td>
                    <td className="px-3.5 py-2.5 text-white font-bold">{op.operator_category || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-400">Locality</td>
                    <td className="px-3.5 py-2.5 text-slate-200">{ai.locality || "—"}</td>
                    <td className="px-3.5 py-2.5 text-white font-bold">{op.operator_locality || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-400">Ward</td>
                    <td className="px-3.5 py-2.5 text-slate-200">{ai.ward || "—"}</td>
                    <td className="px-3.5 py-2.5 text-white font-bold">{op.operator_ward || "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2.5 text-slate-400">Urgency</td>
                    <td className="px-3.5 py-2.5 text-slate-200">{ai.urgency || "—"}</td>
                    <td className="px-3.5 py-2.5 text-white font-bold">{op.operator_urgency || "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Guaranteed by architecture: AI predictions remain archived for model benchmark & accuracy evaluation.
            </p>
          </div>

          {/* Citizen Acknowledgement Draft */}
          <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Citizen Acknowledgement Draft
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
                DRAFT ONLY • ZERO DISPATCH
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              Auto-generated formal citizen draft. No external messages are transmitted without human confirmation.
            </p>

            <textarea
              rows={5}
              value={ackDraft}
              onChange={(e) => setAckDraft(e.target.value)}
              className="w-full p-3.5 bg-slate-950/80 border border-white/[0.08] rounded-xl text-xs font-mono text-slate-200 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={copyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
                <span>{copied ? "Copied!" : "Copy Draft"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftSaving}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{draftSaving ? "Saving..." : "Save Draft"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

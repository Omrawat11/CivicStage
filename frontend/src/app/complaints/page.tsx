"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  SlidersHorizontal,
  PlusCircle,
  RotateCcw,
  Inbox,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { fetchComplaints, fetchTaxonomy, ComplaintDetail, TaxonomyResponse } from "@/lib/api";
import IntakeModal from "@/components/IntakeModal";

function ComplaintQueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state initialized from URL search params (8 core filters)
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [department, setDepartment] = useState(searchParams.get("department") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [urgency, setUrgency] = useState(searchParams.get("urgency") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [locality, setLocality] = useState(searchParams.get("locality") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [sourceChannel, setSourceChannel] = useState(searchParams.get("source_channel") || "");
  const [duplicateStatus, setDuplicateStatus] = useState(searchParams.get("duplicate_status") || "");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  // Intake Modal state
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);

  const [complaints, setComplaints] = useState<ComplaintDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [taxonomy, setTaxonomy] = useState<TaxonomyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load taxonomy for filter dropdowns
  useEffect(() => {
    fetchTaxonomy()
      .then(setTaxonomy)
      .catch((e) => console.error("Taxonomy load error:", e));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchComplaints({
        search,
        department,
        category,
        urgency,
        status,
        locality,
        language,
        source_channel: sourceChannel,
        duplicate_status: duplicateStatus,
        page,
        page_size: 20,
      });
      setComplaints(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to fetch complaints list from the backend.");
    } finally {
      setLoading(false);
    }
  }, [search, department, category, urgency, status, locality, language, sourceChannel, duplicateStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setSearch("");
    setDepartment("");
    setCategory("");
    setUrgency("");
    setStatus("");
    setLocality("");
    setLanguage("");
    setSourceChannel("");
    setDuplicateStatus("");
    setPage(1);
  };

  // Derive categories available for selected department
  const availableCategories = department
    ? taxonomy?.departments.find((d) => d.name === department)?.categories || []
    : Array.from(new Set(taxonomy?.departments.flatMap((d) => d.categories) || [])).sort();

  const selectStyles = "w-full px-3 py-2.5 rounded-xl text-xs text-slate-200 transition-all duration-200"
    + " focus:outline-none focus:border-blue-500/60 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Civic Complaint Queue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and inspect incoming municipal grievances across all wards and departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsIntakeOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white rounded-xl shadow-lg transition-all duration-200 hover:shadow-blue-500/25 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
            }}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Intake
          </button>
          <span className="text-xs text-slate-500 font-mono px-3 py-2 rounded-xl border border-[var(--border-subtle)]"
            style={{ background: 'rgba(5,10,20,0.5)' }}>
            {loading ? "..." : `${total.toLocaleString()} total`}
          </span>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-slate-400 rounded-xl transition-all duration-200 hover:text-white"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        className="glass-panel rounded-2xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search text or CMP-ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-600 transition-all duration-200`}
              style={{
                background: 'rgba(5,10,20,0.6)',
                border: '1px solid var(--border-subtle)',
              }}
            />
          </div>

          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setCategory(""); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Departments</option>
            {taxonomy?.departments.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgency}
            onChange={(e) => { setUrgency(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Urgencies</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Edited">Edited</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Locality Filter */}
          <select
            value={locality}
            onChange={(e) => { setLocality(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Localities</option>
            {taxonomy?.localities.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Language Filter */}
          <select
            value={language}
            onChange={(e) => { setLanguage(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Languages</option>
            <option value="Hinglish">Hinglish</option>
            <option value="Hindi">Hindi</option>
            <option value="English">English</option>
          </select>

          {/* Source Channel Filter */}
          <select
            value={sourceChannel}
            onChange={(e) => { setSourceChannel(e.target.value); setPage(1); }}
            className={selectStyles}
            style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
          >
            <option value="">All Channels</option>
            <option value="Helpline 181">Helpline 181</option>
            <option value="Web Portal">Web Portal</option>
            <option value="Voice Recording">Voice Recording</option>
            <option value="Citizen Photo">Citizen Photo</option>
            <option value="WhatsApp Bot">WhatsApp Bot</option>
            <option value="Walk-in Kiosk">Walk-in Kiosk</option>
            <option value="Mobile App">Mobile App</option>
          </select>
        </div>

        {/* Bottom Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Duplicate:</span>
            <select
              value={duplicateStatus}
              onChange={(e) => { setDuplicateStatus(e.target.value); setPage(1); }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-200 transition-colors"
              style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
            >
              <option value="">All</option>
              <option value="unique">Unique Only</option>
              <option value="duplicate">Potential Duplicate</option>
              <option value="repeat">Repeat Issue</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium text-slate-400 hover:text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-semibold text-white transition-all hover:shadow-blue-500/20 hover:shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-xs"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.04) 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Main Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-semibold text-slate-500 border-b border-[var(--border-subtle)]"
              style={{ background: 'rgba(5,10,20,0.6)' }}>
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Citizen Grievance</th>
                <th className="px-4 py-3.5">Department</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Urgency</th>
                <th className="px-4 py-3.5">Locality</th>
                <th className="px-4 py-3.5">Lang</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Duplicate</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading complaints queue...
                    </div>
                  </td>
                </tr>
              ) : complaints.length > 0 ? (
                complaints.map((c) => {
                  const urgencyLevel = c.effective_urgency || c.ai_recommendation.urgency || "UNKNOWN";
                  const isCritical = urgencyLevel === "CRITICAL";
                  const isHigh = urgencyLevel === "HIGH";
                  const isMedium = urgencyLevel === "MEDIUM";

                  const isDuplicate = c.duplicate_info.duplicate_status === "duplicate";
                  const isRepeat = c.duplicate_info.duplicate_status === "repeat";

                  return (
                    <tr
                      key={c.complaint_id}
                      className="table-row-hover group cursor-pointer"
                      onClick={() => router.push(`/complaints/${c.complaint_id}`)}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-blue-400 group-hover:text-blue-300">
                        {c.complaint_id}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs sm:max-w-sm lg:max-w-md truncate text-slate-300">
                        {c.raw_text}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                        {c.effective_department || (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                        {c.effective_category || (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? "badge-critical"
                              : isHigh
                              ? "badge-high"
                              : isMedium
                              ? "badge-medium"
                              : "badge-low"
                          }`}
                        >
                          {urgencyLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                        {c.effective_locality || "—"}
                        {c.effective_ward && (
                          <span className="text-slate-600 text-[10px] ml-1 font-mono">
                            (W-{c.effective_ward})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                        {c.language}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            c.status === "Approved"
                              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                              : c.status === "Edited"
                              ? "text-purple-400 bg-purple-500/10 border border-purple-500/20"
                              : c.status === "Rejected"
                              ? "text-slate-400 bg-slate-500/10 border border-slate-500/20"
                              : c.status === "Pending Review"
                              ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                              : "text-slate-400 bg-white/[0.03] border border-[var(--border-subtle)]"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 badge-medium px-2 py-0.5 rounded-md">
                            <Copy className="w-3 h-3" />
                            {Math.round((c.duplicate_info.similarity_score || 0) * 100)}%
                          </span>
                        ) : isRepeat ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold badge-high px-2 py-0.5 rounded-md">
                            Repeat
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Unique</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <Link
                          href={`/complaints/${c.complaint_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/[0.08] transition-colors"
                        >
                          Review
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-20 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-slate-500" style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">No matching complaints</p>
                      <p className="text-xs text-slate-500">
                        Try clearing or relaxing some filter parameters.
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-slate-500"
          style={{ background: 'rgba(5,10,20,0.4)' }}>
          <div>
            Showing <span className="font-semibold text-slate-300">{complaints.length}</span> of{" "}
            <span className="font-semibold text-slate-300">{total}</span> complaints
            <span className="text-slate-600 ml-2">
              Page {page}/{totalPages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/[0.04]"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/[0.04]"
              style={{ border: '1px solid var(--border-subtle)' }}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multimodal Intake Modal */}
      <IntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

export default function ComplaintQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Loading Complaint Queue...</p>
        </div>
      }
    >
      <ComplaintQueueContent />
    </Suspense>
  );
}

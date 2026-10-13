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
  LayoutGrid,
  List,
  MapPin,
  Clock,
  Layers,
  X,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { fetchComplaints, fetchTaxonomy, ComplaintDetail, TaxonomyResponse } from "@/lib/api";
import IntakeModal from "@/components/IntakeModal";

function ComplaintQueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter state
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

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // Active filter count
  const activeFilterCount = [
    search,
    department,
    category,
    urgency,
    status,
    locality,
    language,
    sourceChannel,
    duplicateStatus,
  ].filter(Boolean).length;

  const selectStyles =
    "w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-200 transition-all duration-200" +
    " bg-slate-900/70 border border-[var(--border-subtle)] focus:outline-none focus:border-blue-500/60";

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-blue-300 bg-blue-500/15 border border-blue-500/25">
              Live Operations Queue
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {total.toLocaleString()} Records Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            Municipal Grievance Triage Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-channel grievance monitoring, LLM-triaged severity assessment, spatial clustering, and operator review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/60 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={() => setIsIntakeOpen(true)}
            className="btn-sheen flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.35)",
            }}
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Intake</span>
          </button>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-300 rounded-xl glass-pill hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap pl-1">
          Quick Filters:
        </span>
        {[
          { label: "All Grievances", active: !urgency && !status && !duplicateStatus, action: handleReset },
          {
            label: "🚨 Critical Hazards",
            active: urgency === "CRITICAL",
            action: () => { setUrgency("CRITICAL"); setPage(1); },
          },
          {
            label: "⚠️ High Urgency",
            active: urgency === "HIGH",
            action: () => { setUrgency("HIGH"); setPage(1); },
          },
          {
            label: "🕒 Pending Review",
            active: status === "Pending Review",
            action: () => { setStatus("Pending Review"); setPage(1); },
          },
          {
            label: "📋 Potential Duplicates",
            active: duplicateStatus === "duplicate",
            action: () => { setDuplicateStatus("duplicate"); setPage(1); },
          },
          {
            label: "💧 Water Works",
            active: department === "Water Works",
            action: () => { setDepartment("Water Works"); setCategory(""); setPage(1); },
          },
          {
            label: "🛣️ Roads & Traffic",
            active: department === "Roads and Traffic",
            action: () => { setDepartment("Roads and Traffic"); setCategory(""); setPage(1); },
          },
        ].map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={chip.action}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full font-semibold transition-all ${
              chip.active
                ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)] border border-blue-400/40"
                : "bg-slate-900/60 text-slate-400 hover:text-white border border-[var(--border-subtle)] hover:border-slate-600"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Filter Toolbar & Advanced Search */}
      <form onSubmit={handleFilterSubmit} className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Main Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by keyword, address, or CMP-ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs text-white placeholder-slate-500 bg-slate-900/80 border border-[var(--border-subtle)] transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCategory("");
              setPage(1);
            }}
            className={selectStyles}
          >
            <option value="">All Departments</option>
            {taxonomy?.departments.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgency}
            onChange={(e) => {
              setUrgency(e.target.value);
              setPage(1);
            }}
            className={selectStyles}
          >
            <option value="">All Urgencies</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06] animate-float-up">
            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className={selectStyles}
            >
              <option value="">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={selectStyles}
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
              onChange={(e) => {
                setLocality(e.target.value);
                setPage(1);
              }}
              className={selectStyles}
            >
              <option value="">All Localities</option>
              {taxonomy?.localities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Source Channel Filter */}
            <select
              value={sourceChannel}
              onChange={(e) => {
                setSourceChannel(e.target.value);
                setPage(1);
              }}
              className={selectStyles}
            >
              <option value="">All Source Channels</option>
              <option value="Helpline 181">Helpline 181</option>
              <option value="Web Portal">Web Portal</option>
              <option value="Voice Recording">Voice Recording</option>
              <option value="Citizen Photo">Citizen Photo</option>
              <option value="WhatsApp Bot">WhatsApp Bot</option>
              <option value="Walk-in Kiosk">Walk-in Kiosk</option>
              <option value="Mobile App">Mobile App</option>
            </select>
          </div>
        )}

        {/* Filter Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white font-semibold transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>{showAdvancedFilters ? "Hide Filters" : "More Filters"}</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset all</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2 rounded-xl font-bold text-white shadow-md transition-all hover:scale-[1.02] bg-blue-600 hover:bg-blue-500"
          >
            Apply Filters
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-xs bg-rose-950/40 border border-rose-800/40 text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content Rendering: Table or Grid */}
      {viewMode === "table" ? (
        <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-[var(--border-subtle)] bg-[#030712]/70">
                <tr>
                  <th className="px-4 py-3.5">ID</th>
                  <th className="px-4 py-3.5">Citizen Grievance</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Urgency</th>
                  <th className="px-4 py-3.5">Locality</th>
                  <th className="px-4 py-3.5">Channel</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Duplicate</th>
                  <th className="px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
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
                        <td className="px-4 py-3.5 max-w-xs sm:max-w-sm lg:max-w-md truncate text-slate-200">
                          {c.raw_text}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-300">
                          {c.effective_department || <span className="text-slate-600 italic">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-400">
                          {c.effective_category || <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? "badge-critical"
                                : isHigh
                                ? "badge-high"
                                : isMedium
                                ? "badge-medium"
                                : "badge-low"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {urgencyLevel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-300">
                          {c.effective_locality || "—"}
                          {c.effective_ward && (
                            <span className="text-slate-500 text-[10px] ml-1 font-mono">
                              (W-{c.effective_ward})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                          {c.source_channel}
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
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 badge-medium px-2 py-0.5 rounded-md">
                              <Copy className="w-3 h-3" />
                              {Math.round((c.duplicate_info.similarity_score || 0) * 100)}%
                            </span>
                          ) : isRepeat ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold badge-high px-2 py-0.5 rounded-md">
                              Repeat
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Unique</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-right">
                          <Link
                            href={`/complaints/${c.complaint_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:text-white hover:bg-blue-600 transition-colors"
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
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto text-slate-500 bg-slate-900 border border-white/[0.06]">
                          <Inbox className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-white">No matching grievances found</p>
                        <p className="text-xs text-slate-500">
                          Try clearing search terms or selecting different filters.
                        </p>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-200 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Clear All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading complaints...
            </div>
          ) : complaints.length > 0 ? (
            complaints.map((c) => {
              const urgencyLevel = c.effective_urgency || c.ai_recommendation.urgency || "UNKNOWN";
              const isCritical = urgencyLevel === "CRITICAL";
              const isHigh = urgencyLevel === "HIGH";

              return (
                <div
                  key={c.complaint_id}
                  onClick={() => router.push(`/complaints/${c.complaint_id}`)}
                  className="glass-panel p-5 rounded-2xl card-hover cursor-pointer flex flex-col justify-between gap-4 border border-[var(--border-subtle)]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        {c.complaint_id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isCritical
                            ? "badge-critical"
                            : isHigh
                            ? "badge-high"
                            : "badge-medium"
                        }`}
                      >
                        {urgencyLevel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-3 mt-3 font-normal leading-relaxed">
                      {c.raw_text}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-300">{c.effective_department || "Unassigned"}</span>
                      <span>{c.effective_locality || "Bhopal"}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{c.source_channel}</span>
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        Review Ticket <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-16 text-center text-slate-400">
              No matching complaints.
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="glass-panel px-5 py-4 rounded-2xl border border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-white">{complaints.length}</span> of{" "}
          <span className="font-bold text-white">{total.toLocaleString()}</span> grievances
          <span className="text-slate-600 ml-2">
            (Page {page} of {totalPages})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/[0.06] border border-white/[0.08]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-white/[0.06] border border-white/[0.08]"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
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

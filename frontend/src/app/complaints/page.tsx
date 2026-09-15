"use client";

import { useEffect, useState, useTransition, useCallback, Suspense } from "react";
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Civic Complaint Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search, filter, and inspect incoming municipal grievances across all wards and departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsIntakeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + New Intake (Text / Audio / Image)
          </button>
          <span className="text-xs text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            {loading ? "..." : `${total.toLocaleString()} complaints`}
          </span>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar (8 Filters: Dept, Cat, Urg, Stat, Lang, Loc, Source, Dup) */}
      <form
        onSubmit={handleFilterSubmit}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search text or CMP-ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* 2. Department Filter */}
          <div>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setCategory("");
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Departments</option>
              {taxonomy?.departments.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Urgency Filter */}
          <div>
            <select
              value={urgency}
              onChange={(e) => {
                setUrgency(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Urgencies</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {/* 5. Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Edited">Edited</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* 6. Locality Filter */}
          <div>
            <select
              value={locality}
              onChange={(e) => {
                setLocality(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Localities</option>
              {taxonomy?.localities.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Language Filter */}
          <div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">All Languages</option>
              <option value="Hinglish">Hinglish</option>
              <option value="Hindi">Hindi</option>
              <option value="English">English</option>
            </select>
          </div>

          {/* 8. Source Channel Filter */}
          <div>
            <select
              value={sourceChannel}
              onChange={(e) => {
                setSourceChannel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
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
        </div>

        {/* Bottom Filter Controls: Duplicate Status & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Duplicate Status:</span>
            <select
              value={duplicateStatus}
              onChange={(e) => {
                setDuplicateStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="unique">Unique Only</option>
              <option value="duplicate">Potential Duplicate</option>
              <option value="repeat">Repeat Issue</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-semibold"
            >
              Apply Filter
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs">
          {error}
        </div>
      )}

      {/* Main Table (Section 14) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Citizen Grievance</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Urgency</th>
                <th className="px-4 py-3">Locality</th>
                <th className="px-4 py-3">Language</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duplicate</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    Loading complaints queue...
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
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/complaints/${c.complaint_id}`)}
                    >
                      {/* ID */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold text-blue-400 group-hover:text-blue-300">
                        {c.complaint_id}
                      </td>

                      {/* Complaint raw snippet */}
                      <td className="px-4 py-3 max-w-xs sm:max-w-sm lg:max-w-md truncate text-slate-200">
                        {c.raw_text}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                        {c.effective_department || (
                          <span className="text-slate-600 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                        {c.effective_category || (
                          <span className="text-slate-600 italic">—</span>
                        )}
                      </td>

                      {/* Urgency */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isCritical
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : isHigh
                              ? "bg-orange-950 text-orange-400 border border-orange-800"
                              : isMedium
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          }`}
                        >
                          {urgencyLevel}
                        </span>
                      </td>

                      {/* Locality & Ward */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                        {c.effective_locality || "—"}
                        {c.effective_ward && (
                          <span className="text-slate-500 text-[10px] ml-1 font-mono">
                            (W-{c.effective_ward})
                          </span>
                        )}
                      </td>

                      {/* Language */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                        {c.language}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            c.status === "Approved"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80"
                              : c.status === "Edited"
                              ? "bg-purple-950 text-purple-300 border border-purple-800/80"
                              : c.status === "Rejected"
                              ? "bg-slate-800 text-slate-400 border border-slate-700"
                              : c.status === "Pending Review"
                              ? "bg-blue-950 text-blue-300 border border-blue-800/80"
                              : "bg-slate-900 text-slate-300 border border-slate-700"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Duplicate */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isDuplicate ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-1.5 py-0.5 rounded">
                            <Copy className="w-3 h-3" />
                            Duplicate ({Math.round((c.duplicate_info.similarity_score || 0) * 100)}%)
                          </span>
                        ) : isRepeat ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-950/80 border border-orange-800/60 px-1.5 py-0.5 rounded">
                            Repeat
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">Unique</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Link
                          href={`/complaints/${c.complaint_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 rounded transition-colors"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                        <Filter className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-300">No complaints match the specified criteria</p>
                      <p className="text-xs text-slate-500">
                        Try clearing or relaxing some of your filter parameters to view tickets.
                      </p>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{complaints.length}</span> of{" "}
            <span className="font-semibold text-slate-200">{total}</span> complaints (Page {page} of{" "}
            {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
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

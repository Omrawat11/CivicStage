"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building,
  MapPin,
  TrendingUp,
  FileSpreadsheet,
  Sparkles,
  ChevronRight,
  X,
  Layers,
  Flame,
} from "lucide-react";
import {
  fetchWeeklyReport,
  WeeklyReportResponse,
  DepartmentMetric,
  EmergingIssue,
} from "@/lib/api";

function ReportsContent() {
  const [report, setReport] = useState<WeeklyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Period filter inputs
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Department inspection modal
  const [selectedDept, setSelectedDept] = useState<DepartmentMetric | null>(null);

  const loadReport = useCallback(async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeeklyReport({
        start_date: start || undefined,
        end_date: end || undefined,
      });
      setReport(data);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to connect to reports API. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadReport(startDate, endDate);
  };

  const handleResetFilter = () => {
    setStartDate("");
    setEndDate("");
    loadReport();
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Departmental Accountability Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic resolution metrics, median resolution times, repeat complaint analysis, and emerging clusters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadReport(startDate, endDate)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Reporting Period Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Apply Period
          </button>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards (Section 11) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Received */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Complaints</span>
          <div className="text-2xl font-extrabold text-white mt-2">
            {loading ? "..." : report?.total_complaints.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">During reporting period</span>
        </div>

        {/* Resolved */}
        <div className="p-4 rounded-xl bg-slate-900 border border-emerald-950/70 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Resolved Complaints</span>
          <div className="text-2xl font-extrabold text-emerald-300 mt-2">
            {loading ? "..." : report?.total_resolved.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-500 mt-1 block">Successfully resolved</span>
        </div>

        {/* Pending */}
        <div className="p-4 rounded-xl bg-slate-900 border border-blue-950/70 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">Pending Action</span>
          <div className="text-2xl font-extrabold text-blue-300 mt-2">
            {loading ? "..." : report?.total_pending.toLocaleString()}
          </div>
          <span className="text-[10px] text-blue-500 mt-1 block">Underfield operation</span>
        </div>

        {/* Overall Resolution Rate */}
        <div className="p-4 rounded-xl bg-slate-900 border border-purple-950/70 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">Resolution Rate</span>
          <div className="text-2xl font-extrabold text-purple-300 mt-2">
            {loading ? "..." : `${report?.overall_resolution_rate ?? 0}%`}
          </div>
          <span className="text-[10px] text-purple-500 mt-1 block">Resolved / received</span>
        </div>

        {/* Median Resolution Time */}
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-950/70 shadow-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Median Time</span>
          <div className="text-2xl font-extrabold text-amber-300 mt-2">
            {loading ? "..." : report?.overall_median_resolution_time_hours != null ? `${report.overall_median_resolution_time_hours} hrs` : "N/A"}
          </div>
          <span className="text-[10px] text-amber-500 mt-1 block">Outlier-resistant median</span>
        </div>
      </div>

      {/* Narrative Executive Summary (Section 10) */}
      {report?.narrative_summary && (
        <div className="p-5 rounded-xl bg-slate-900/90 border border-blue-900/40 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Executive Narrative Briefing
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Deterministic Stats • Narrative Layer
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {report.narrative_summary}
          </p>
        </div>
      )}

      {/* Department Performance Comparison Table (Section 11 & 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Department Performance Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Department-level resolution counts, median response duration, repeat complaints, and top grievance hotspots.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-right">Received</th>
                <th className="px-5 py-3.5 text-right">Resolved</th>
                <th className="px-5 py-3.5 text-right">Pending</th>
                <th className="px-5 py-3.5">Resolution Rate</th>
                <th className="px-5 py-3.5 text-right">Median Time</th>
                <th className="px-5 py-3.5 text-right">Repeat</th>
                <th className="px-5 py-3.5 text-right">Duplicate</th>
                <th className="px-5 py-3.5">Top Locality</th>
                <th className="px-5 py-3.5 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                    Loading department comparison metrics...
                  </td>
                </tr>
              ) : report?.departments && report.departments.length > 0 ? (
                report.departments.map((d) => (
                  <tr key={d.department} className="hover:bg-slate-800/40 transition-colors">
                    {/* Department Name */}
                    <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                      {d.department}
                    </td>

                    {/* Received */}
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-200">
                      {d.complaints_received}
                    </td>

                    {/* Resolved */}
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-400 font-semibold">
                      {d.complaints_resolved}
                    </td>

                    {/* Pending */}
                    <td className="px-5 py-3.5 text-right font-mono text-blue-400">
                      {d.complaints_pending}
                    </td>

                    {/* Resolution Rate */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, d.resolution_rate)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-200">
                          {d.resolution_rate}%
                        </span>
                      </div>
                    </td>

                    {/* Median Time */}
                    <td className="px-5 py-3.5 text-right font-mono text-amber-300">
                      {d.median_resolution_time_hours != null ? `${d.median_resolution_time_hours} hrs` : "—"}
                    </td>

                    {/* Repeat Complaints */}
                    <td className="px-5 py-3.5 text-right font-mono text-orange-400">
                      {d.repeat_complaints}
                    </td>

                    {/* Duplicate Complaints */}
                    <td className="px-5 py-3.5 text-right font-mono text-amber-400">
                      {d.duplicate_complaints}
                    </td>

                    {/* Top Locality */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-300">
                      {d.top_locality || "—"}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedDept(d)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-950/60 rounded transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                    No departmental complaint records available for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emerging Issues & Incident Clusters (Section 7 & 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Emerging Hotspot Clusters</h2>
              <p className="text-xs text-slate-400">
                Factual, cluster-driven incident detection across localities based on duplicate submission volume.
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {report?.emerging_issues?.length ?? 0} active clusters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {report?.emerging_issues && report.emerging_issues.length > 0 ? (
            report.emerging_issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {issue.locality}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    {issue.department}
                  </span>
                </div>

                <p className="text-xs font-medium text-slate-200">{issue.category}</p>

                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Complaints:</span>
                    <span className="text-slate-200 font-bold">{issue.complaints_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicates:</span>
                    <span className="text-amber-400">{issue.duplicate_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{issue.time_span_days} days</span>
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800/80">
                  {issue.summary}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-8 text-center text-slate-500 text-xs">
              No emerging incident clusters detected for this period.
            </div>
          )}
        </div>
      </div>

      {/* Department Detail Modal (Section 12) */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Department: {selectedDept.department}
                  </h3>
                  <span className="text-xs text-slate-400">Accountability Inspection</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Complaints Received</span>
                <p className="text-lg font-bold text-white mt-1 font-mono">{selectedDept.complaints_received}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Complaints Resolved</span>
                <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">{selectedDept.complaints_resolved}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Pending Action</span>
                <p className="text-lg font-bold text-blue-400 mt-1 font-mono">{selectedDept.complaints_pending}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Resolution Rate</span>
                <p className="text-lg font-bold text-purple-400 mt-1 font-mono">{selectedDept.resolution_rate}%</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Median Resolution Time</span>
                <p className="text-lg font-bold text-amber-400 mt-1 font-mono">
                  {selectedDept.median_resolution_time_hours != null ? `${selectedDept.median_resolution_time_hours} hrs` : "N/A"}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Top Locality</span>
                <p className="text-sm font-bold text-white mt-1 truncate">{selectedDept.top_locality || "—"}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Duplicate Submissions</span>
                <p className="text-lg font-bold text-amber-400 mt-1 font-mono">{selectedDept.duplicate_complaints}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Repeat Issues</span>
                <p className="text-lg font-bold text-orange-400 mt-1 font-mono">{selectedDept.repeat_complaints}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDept(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Loading Accountability Reports...</p>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}

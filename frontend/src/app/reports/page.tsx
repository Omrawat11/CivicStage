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
  ArrowUpRight,
  Shield,
  Activity,
  ArrowRight,
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

  const kpiCards = [
    {
      label: "Total Ingested",
      value: report?.total_complaints.toLocaleString(),
      sub: "During active reporting window",
      color: "text-white",
      borderColor: "border-blue-500/20",
      barColor: "bg-blue-500",
    },
    {
      label: "Resolved Grievances",
      value: report?.total_resolved.toLocaleString(),
      sub: "Field confirmed resolution",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/20",
      barColor: "bg-emerald-500",
    },
    {
      label: "Pending In-Field",
      value: report?.total_pending.toLocaleString(),
      sub: "Active municipal backlog",
      color: "text-blue-400",
      borderColor: "border-indigo-500/20",
      barColor: "bg-indigo-500",
    },
    {
      label: "Resolution Rate",
      value: `${report?.overall_resolution_rate ?? 0}%`,
      sub: "Resolved vs Received",
      color: "text-purple-400",
      borderColor: "border-purple-500/20",
      barColor: "bg-purple-500",
    },
    {
      label: "Median Resolution",
      value: report?.overall_median_resolution_time_hours != null ? `${report.overall_median_resolution_time_hours}h` : "N/A",
      sub: "Outlier-resistant median",
      color: "text-amber-400",
      borderColor: "border-amber-500/20",
      barColor: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-blue-300 bg-blue-500/15 border border-blue-500/25">
              Municipal Accountability & KPI Reports
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            Executive Operations Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Deterministic resolution metrics, department dispatch efficiency, recurring hotspot analysis, and spatial clustering.
          </p>
        </div>

        <button
          onClick={() => loadReport(startDate, endDate)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white glass-pill hover:bg-white/[0.08] transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Date Range Filter Bar */}
      <form
        onSubmit={handleApplyFilter}
        className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-[var(--border-subtle)]"
      >
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Filter Report Timeframe:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Start:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-slate-200 bg-slate-900 border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">End:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-slate-200 bg-slate-900 border border-[var(--border-subtle)] text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-white font-bold text-xs bg-blue-600 hover:bg-blue-500 transition-all shadow-md"
          >
            Apply
          </button>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-3 py-2 text-slate-400 hover:text-white text-xs transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-xs bg-rose-950/40 border border-rose-800/40 text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-2xl p-5 card-hover animate-float-up border ${kpi.borderColor} flex flex-col justify-between`}
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {kpi.label}
              </span>
              <div className={`text-2xl sm:text-3xl font-extrabold ${kpi.color} mt-2 font-mono`}>
                {loading ? <div className="skeleton h-8 w-16 rounded-lg" /> : kpi.value}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block font-medium">{kpi.sub}</span>
            </div>

            <div className="w-full bg-slate-800/50 h-1 rounded-full mt-4 overflow-hidden">
              <div className={`h-full ${kpi.barColor} rounded-full`} style={{ width: "100%" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Executive Narrative Briefing */}
      {report?.narrative_summary && (
        <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-3.5 border border-blue-500/20 animate-float-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Executive AI Narrative Briefing
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full text-blue-300 bg-blue-500/15 border border-blue-500/30">
              Deterministic Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
            {report.narrative_summary}
          </p>
        </div>
      )}

      {/* Department Performance Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/25">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Department Performance & Resolution Benchmarks
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Resolution counts, outlier-resistant median resolution times, and top grievance hotspots.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-[var(--border-subtle)] bg-[#030712]/70">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4 text-right">Received</th>
                <th className="px-5 py-4 text-right">Resolved</th>
                <th className="px-5 py-4 text-right">Pending</th>
                <th className="px-5 py-4">Resolution Rate</th>
                <th className="px-5 py-4 text-right">Median Time</th>
                <th className="px-5 py-4 text-right">Repeat</th>
                <th className="px-5 py-4 text-right">Duplicate</th>
                <th className="px-5 py-4">Top Locality</th>
                <th className="px-5 py-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Computing metrics...
                    </div>
                  </td>
                </tr>
              ) : report?.departments && report.departments.length > 0 ? (
                report.departments.map((d) => (
                  <tr key={d.department} className="table-row-hover">
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">{d.department}</td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-slate-200">
                      {d.complaints_received}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-emerald-400 font-bold">
                      {d.complaints_resolved}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-blue-400 font-semibold">
                      {d.complaints_pending}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                            style={{ width: `${Math.min(100, d.resolution_rate)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-white">
                          {d.resolution_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-amber-400 font-bold">
                      {d.median_resolution_time_hours != null ? `${d.median_resolution_time_hours}h` : "—"}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-orange-400 font-semibold">
                      {d.repeat_complaints}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-amber-400 font-semibold">
                      {d.duplicate_complaints}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-slate-300">{d.top_locality || "—"}</td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedDept(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        Inspect
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-400">
                    No department data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emerging Hotspot Clusters */}
      <div className="glass-panel rounded-2xl p-6 sm:p-7 space-y-4 border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/25">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Emerging Hotspot Clusters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Spatial-temporal incident clusters grouped across municipal wards.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-bold">
            {report?.emerging_issues?.length ?? 0} active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report?.emerging_issues && report.emerging_issues.length > 0 ? (
            report.emerging_issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl card-hover space-y-3 animate-float-up bg-slate-900/60 border border-[var(--border-subtle)]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {issue.locality}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20">
                    {issue.department}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300">{issue.category}</p>
                <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-1">
                  <div className="flex justify-between">
                    <span>Complaints:</span>
                    <span className="text-white font-bold">{issue.complaints_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicates:</span>
                    <span className="text-amber-400 font-semibold">{issue.duplicate_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Window:</span>
                    <span className="text-slate-300">{issue.time_span_days}d</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-slate-400 border-t border-white/[0.06] leading-relaxed">
                  {issue.summary}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-8 text-center text-slate-400 text-xs">
              No emerging clusters detected in reporting window.
            </div>
          )}
        </div>
      </div>

      {/* Department Detail Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="glass-panel-elevated rounded-3xl max-w-lg w-full p-6 space-y-5 animate-float-up border border-[var(--border-default)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedDept.department}</h3>
                  <span className="text-xs text-slate-400">Accountability Inspection</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDept(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Received", value: selectedDept.complaints_received, color: "text-white" },
                { label: "Resolved", value: selectedDept.complaints_resolved, color: "text-emerald-400" },
                { label: "Pending", value: selectedDept.complaints_pending, color: "text-blue-400" },
                { label: "Resolution Rate", value: `${selectedDept.resolution_rate}%`, color: "text-purple-400" },
                {
                  label: "Median Time",
                  value: selectedDept.median_resolution_time_hours != null ? `${selectedDept.median_resolution_time_hours}h` : "N/A",
                  color: "text-amber-400",
                },
                { label: "Top Locality", value: selectedDept.top_locality || "—", color: "text-white", isText: true },
                { label: "Duplicates", value: selectedDept.duplicate_complaints, color: "text-amber-400" },
                { label: "Repeat Issues", value: selectedDept.repeat_complaints, color: "text-orange-400" },
              ].map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-slate-900/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">{item.label}</span>
                  <p className={`${item.isText ? "text-sm truncate" : "text-lg font-mono"} font-black ${item.color} mt-1`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDept(null)}
                className="px-5 py-2 text-xs font-bold text-slate-200 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Close
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

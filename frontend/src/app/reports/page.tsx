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
      label: "Total Complaints",
      value: report?.total_complaints.toLocaleString(),
      sub: "During reporting period",
      color: "text-white",
      borderColor: "var(--border-subtle)",
    },
    {
      label: "Resolved",
      value: report?.total_resolved.toLocaleString(),
      sub: "Successfully resolved",
      color: "text-emerald-400",
      borderColor: "rgba(16,185,129,0.2)",
    },
    {
      label: "Pending Action",
      value: report?.total_pending.toLocaleString(),
      sub: "Underfield operation",
      color: "text-blue-400",
      borderColor: "rgba(59,130,246,0.2)",
    },
    {
      label: "Resolution Rate",
      value: `${report?.overall_resolution_rate ?? 0}%`,
      sub: "Resolved / received",
      color: "text-purple-400",
      borderColor: "rgba(139,92,246,0.2)",
    },
    {
      label: "Median Time",
      value: report?.overall_median_resolution_time_hours != null ? `${report.overall_median_resolution_time_hours}h` : "N/A",
      sub: "Outlier-resistant median",
      color: "text-amber-400",
      borderColor: "rgba(245,158,11,0.2)",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Accountability Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic resolution metrics, median resolution times, repeat complaint analysis, and emerging clusters.
          </p>
        </div>
        <button
          onClick={() => loadReport(startDate, endDate)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl text-slate-400 hover:text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Period Filter */}
      <form
        onSubmit={handleApplyFilter}
        className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Reporting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-slate-200 transition-all text-xs"
              style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-slate-200 transition-all text-xs"
              style={{ background: 'rgba(5,10,20,0.6)', border: '1px solid var(--border-subtle)' }}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-white font-semibold text-xs transition-all"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
          >
            Apply
          </button>
          {(startDate || endDate) && (
            <button type="button" onClick={handleResetFilter}
              className="px-3 py-2 text-slate-500 hover:text-slate-300 text-xs transition-colors">
              Reset
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl flex items-center gap-2 text-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.04) 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-xs">{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-4 card-hover animate-float-up"
            style={{ animationDelay: `${idx * 50}ms`, borderColor: kpi.borderColor }}>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{kpi.label}</span>
            <div className={`text-2xl font-extrabold ${kpi.color} mt-2 font-mono`}>
              {loading ? <div className="skeleton h-7 w-14 rounded-lg" /> : kpi.value}
            </div>
            <span className="text-[10px] text-slate-600 mt-1 block">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* Executive Summary */}
      {report?.narrative_summary && (
        <div className="glass-panel rounded-2xl p-6 space-y-3 animate-float-up" style={{
          borderColor: 'rgba(59,130,246,0.15)',
        }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Executive Narrative Briefing
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg text-blue-300/70"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                border: '1px solid rgba(59,130,246,0.15)',
              }}>
              Deterministic Stats
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{report.narrative_summary}</p>
        </div>
      )}

      {/* Department Performance Table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Department Performance</h2>
              <p className="text-[11px] text-slate-500">Resolution counts, median times, and top grievance hotspots.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase font-semibold text-slate-500 border-b border-[var(--border-subtle)]"
              style={{ background: 'rgba(5,10,20,0.6)' }}>
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
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading metrics...
                    </div>
                  </td>
                </tr>
              ) : report?.departments && report.departments.length > 0 ? (
                report.departments.map((d) => (
                  <tr key={d.department} className="table-row-hover">
                    <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">{d.department}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-300">{d.complaints_received}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-400 font-semibold">{d.complaints_resolved}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-blue-400">{d.complaints_pending}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div
                            className="h-full rounded-full progress-bar"
                            style={{
                              width: `${Math.min(100, d.resolution_rate)}%`,
                              background: 'linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)',
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-300">
                          {d.resolution_rate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-400">
                      {d.median_resolution_time_hours != null ? `${d.median_resolution_time_hours}h` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-orange-400">{d.repeat_complaints}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-amber-400">{d.duplicate_complaints}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-400">{d.top_locality || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedDept(d)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/[0.08] rounded-lg transition-colors"
                      >
                        Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-slate-500">
                    No department data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emerging Clusters */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Emerging Hotspot Clusters</h2>
              <p className="text-[11px] text-slate-500">Factual, cluster-driven incident detection across localities.</p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {report?.emerging_issues?.length ?? 0} active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report?.emerging_issues && report.emerging_issues.length > 0 ? (
            report.emerging_issues.map((issue, idx) => (
              <div key={idx} className="p-4 rounded-xl card-hover space-y-3 animate-float-up"
                style={{
                  animationDelay: `${idx * 50}ms`,
                  background: 'linear-gradient(135deg, rgba(10,22,40,0.8) 0%, rgba(5,10,20,0.9) 100%)',
                  border: '1px solid var(--border-subtle)',
                }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    {issue.locality}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-blue-300/80"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)',
                      border: '1px solid rgba(59,130,246,0.15)',
                    }}>
                    {issue.department}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-300">{issue.category}</p>
                <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Complaints:</span>
                    <span className="text-white font-bold">{issue.complaints_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duplicates:</span>
                    <span className="text-amber-400">{issue.duplicate_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="text-slate-300">{issue.time_span_days}d</span>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-slate-500 border-t border-[var(--border-subtle)] leading-relaxed">
                  {issue.summary}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-8 text-center text-slate-500 text-xs">
              No emerging clusters detected.
            </div>
          )}
        </div>
      </div>

      {/* Department Detail Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="glass-panel-elevated rounded-2xl max-w-lg w-full p-6 space-y-5 animate-float-up">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedDept.department}</h3>
                  <span className="text-[11px] text-slate-500">Accountability Inspection</span>
                </div>
              </div>
              <button onClick={() => setSelectedDept(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.05] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Received", value: selectedDept.complaints_received, color: "text-white" },
                { label: "Resolved", value: selectedDept.complaints_resolved, color: "text-emerald-400" },
                { label: "Pending", value: selectedDept.complaints_pending, color: "text-blue-400" },
                { label: "Resolution Rate", value: `${selectedDept.resolution_rate}%`, color: "text-purple-400" },
                { label: "Median Time", value: selectedDept.median_resolution_time_hours != null ? `${selectedDept.median_resolution_time_hours}h` : "N/A", color: "text-amber-400" },
                { label: "Top Locality", value: selectedDept.top_locality || "—", color: "text-white", isText: true },
                { label: "Duplicates", value: selectedDept.duplicate_complaints, color: "text-amber-400" },
                { label: "Repeat Issues", value: selectedDept.repeat_complaints, color: "text-orange-400" },
              ].map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-[var(--border-subtle)]" style={{ background: 'rgba(5,10,20,0.5)' }}>
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">{item.label}</span>
                  <p className={`${item.isText ? 'text-sm truncate' : 'text-lg font-mono'} font-bold ${item.color} mt-1`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedDept(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid var(--border-subtle)',
                }}>
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

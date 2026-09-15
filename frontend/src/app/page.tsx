"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Copy,
  FileText,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  Filter,
  Flame,
  X,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  fetchDashboardStats,
  fetchEmergingIssues,
  DashboardStats,
  EmergingIssue,
} from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [emergingIssues, setEmergingIssues] = useState<EmergingIssue[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<EmergingIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, issuesData] = await Promise.all([
        fetchDashboardStats(),
        fetchEmergingIssues(2).catch(() => []),
      ]);
      setStats(statsData);
      setEmergingIssues(issuesData);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to connect to the CivicTriage backend API. Ensure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            Municipal Operations Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time civic intelligence, multi-factor urgency assessment, and human-in-the-loop review.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            Refresh Data
          </button>
          <Link
            href="/complaints"
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm shadow-blue-500/20 transition-colors"
          >
            Open Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800/80 text-red-200 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Backend Connection Error</p>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 4 Core Municipal Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <Link
          href="/complaints"
          className="group p-5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Complaints</span>
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-slate-700 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? "..." : stats?.total_complaints.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>All recorded municipal reports</span>
            </p>
          </div>
        </Link>

        {/* Urgent Complaints */}
        <Link
          href="/complaints?urgency=HIGH"
          className="group p-5 rounded-xl bg-slate-900/90 border border-red-950/60 hover:border-red-800/80 shadow-sm transition-all relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Urgent Complaints</span>
            <div className="w-9 h-9 rounded-lg bg-red-950/80 border border-red-800/50 flex items-center justify-center text-red-400 group-hover:bg-red-900/90 transition-colors">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-red-200 tracking-tight">
              {loading ? "..." : stats?.urgent_complaints.toLocaleString()}
            </span>
            <p className="text-xs text-red-400/80 mt-1 flex items-center gap-1">
              <span>High & Critical hazard level</span>
            </p>
          </div>
        </Link>

        {/* Potential Duplicates */}
        <Link
          href="/complaints?duplicate_status=duplicate"
          className="group p-5 rounded-xl bg-slate-900/90 border border-amber-950/60 hover:border-amber-800/80 shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Potential Duplicates</span>
            <div className="w-9 h-9 rounded-lg bg-amber-950/80 border border-amber-800/50 flex items-center justify-center text-amber-400 group-hover:bg-amber-900/90 transition-colors">
              <Copy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-200 tracking-tight">
              {loading ? "..." : stats?.potential_duplicates.toLocaleString()}
            </span>
            <p className="text-xs text-amber-400/80 mt-1 flex items-center gap-1">
              <span>Incident clusters & repeat issues</span>
            </p>
          </div>
        </Link>

        {/* Pending Review */}
        <Link
          href="/complaints?status=Pending+Review"
          className="group p-5 rounded-xl bg-slate-900/90 border border-blue-950/60 hover:border-blue-800/80 shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Pending Review</span>
            <div className="w-9 h-9 rounded-lg bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-900/90 transition-colors">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-blue-200 tracking-tight">
              {loading ? "..." : stats?.pending_review.toLocaleString()}
            </span>
            <p className="text-xs text-blue-400/80 mt-1 flex items-center gap-1">
              <span>Awaiting operator decision</span>
            </p>
          </div>
        </Link>
      </div>
      {/* Emerging Issues Section (Phase 5) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-red-950 text-red-400 border border-red-800/60">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight uppercase tracking-wider text-xs">
                  Emerging Issues & Incident Clusters
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60">
                  {emergingIssues.length} Active Hotspots
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-complaint grievance clusters grouped by locality and time span for urgent field dispatch.
              </p>
            </div>
          </div>
          <Link
            href="/reports"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>Accountability Reports</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Detecting active grievance clusters...
            </div>
          ) : emergingIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergingIssues.map((issue, idx) => {
                const isHighVolume = issue.complaints_count >= 5;
                const icon = isHighVolume ? "🚨" : "⚠️";

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCluster(issue)}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{icon}</span>
                          <span>{issue.locality} — {issue.department}</span>
                        </span>
                        {issue.incident_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                            {issue.incident_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Category: <span className="text-slate-200 font-medium">{issue.category}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-white text-base tracking-tight">
                          {issue.complaints_count}
                        </span>
                        <span className="text-slate-400 ml-1">complaints</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 font-medium">
                          {issue.time_span_hours !== undefined ? `${issue.time_span_hours}h period` : `${issue.time_span_days}d period`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-400 group-hover:text-blue-300 font-medium pt-1">
                      <span>{issue.duplicate_count} duplicates</span>
                      <span className="flex items-center gap-1">
                        Inspect Cluster <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No active emerging clusters detected matching current sensitivity thresholds.
            </div>
          )}
        </div>
      </div>

      {/* Priority Queue Section (Section 13) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-blue-950 text-blue-400 border border-blue-800/60">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Priority Queue</h2>
              <p className="text-xs text-slate-400">
                Top high-severity municipal issues grouped by category & locality for swift dispatch.
              </p>
            </div>
          </div>
          <Link
            href="/complaints?urgency=HIGH"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
          >
            <span>View All Urgent</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Urgency</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Locality</th>
                <th className="px-6 py-3.5 text-right">Active Reports</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading priority queue...
                  </td>
                </tr>
              ) : stats?.priority_queue && stats.priority_queue.length > 0 ? (
                stats.priority_queue.map((item, idx) => {
                  const isCritical = item.urgency === "CRITICAL";
                  const isHigh = item.urgency === "HIGH";

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${
                            isCritical
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : isHigh
                              ? "bg-orange-950 text-orange-400 border border-orange-800"
                              : "bg-amber-950 text-amber-400 border border-amber-800"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-white font-medium">{item.category}</td>
                      <td className="px-6 py-3.5 text-slate-300">{item.locality}</td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 font-mono text-xs font-semibold">
                          {item.count}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <Link
                          href={`/complaints?search=${encodeURIComponent(item.category)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-950/50 transition-colors"
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
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No urgent pending complaints found in the priority queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Workflow Guide */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 flex-shrink-0 font-bold text-xs">
            1
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Review Recommendations</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Examine automated LLM triage, extracted quoted evidence, multi-factor urgency, and duplicate matches.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 flex-shrink-0 font-bold text-xs">
            2
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Human Decision</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Approve, Edit, or Reject. Human operator values are permanently stored separately from AI predictions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 flex-shrink-0 font-bold text-xs">
            3
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Safe Citizen Draft</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              A formal acknowledgement draft is automatically formulated for citizen feedback with zero automated dispatch.
            </p>
          </div>
        </div>
      </div>

      {/* Cluster Detail Modal (Section 9) */}
      {selectedCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-950 text-red-400 border border-red-800/60">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedCluster.locality} — {selectedCluster.department}
                    </h2>
                    {selectedCluster.incident_id && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                        {selectedCluster.incident_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Category: <span className="text-slate-200 font-medium">{selectedCluster.category}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCluster(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cluster stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Complaints</span>
                  <p className="text-xl font-bold text-white mt-0.5">{selectedCluster.complaints_count}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Duplicates</span>
                  <p className="text-xl font-bold text-amber-400 mt-0.5">{selectedCluster.duplicate_count}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Time Window</span>
                  <p className="text-xl font-bold text-blue-400 mt-0.5">
                    {selectedCluster.time_span_hours !== undefined ? `${selectedCluster.time_span_hours}h` : `${selectedCluster.time_span_days}d`}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Repeat Reports</span>
                  <p className="text-xl font-bold text-orange-400 mt-0.5">{selectedCluster.repeat_count}</p>
                </div>
              </div>

              {/* Factual cluster summary */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1">Factual Cluster Summary</span>
                {selectedCluster.summary}
              </div>

              {/* Related complaints list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Associated Grievance Tickets ({selectedCluster.related_complaints?.length || 0})
                </h3>

                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                      <tr>
                        <th className="px-3.5 py-2.5">Ticket ID</th>
                        <th className="px-3.5 py-2.5">Channel</th>
                        <th className="px-3.5 py-2.5">Urgency</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5">Verbatim Snippet</th>
                        <th className="px-3.5 py-2.5 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                      {selectedCluster.related_complaints && selectedCluster.related_complaints.length > 0 ? (
                        selectedCluster.related_complaints.map((item) => (
                          <tr key={item.complaint_id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                              {item.complaint_id}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">{item.source_channel}</td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.urgency === "CRITICAL"
                                  ? "bg-red-950 text-red-400 border border-red-800/80"
                                  : item.urgency === "HIGH"
                                  ? "bg-orange-950 text-orange-400 border border-orange-800/80"
                                  : "bg-amber-950 text-amber-400 border border-amber-800/80"
                              }`}>
                                {item.urgency}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">{item.status}</td>
                            <td className="px-3.5 py-2.5 text-slate-400 max-w-xs truncate">{item.raw_text_snippet}</td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <Link
                                href={`/complaints/${item.complaint_id}`}
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-[11px]"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            No related ticket records linked.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <Link
                  href={`/complaints?department=${encodeURIComponent(selectedCluster.department)}&locality=${encodeURIComponent(selectedCluster.locality)}`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  View Sector in Queue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedCluster(null)}
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

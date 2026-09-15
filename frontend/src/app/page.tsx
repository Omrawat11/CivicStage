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
} from "lucide-react";
import { fetchDashboardStats, DashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
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
    </div>
  );
}

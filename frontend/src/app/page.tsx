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
  Activity,
  Zap,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchDashboardStats,
  fetchEmergingIssues,
  DashboardStats,
  EmergingIssue,
} from "@/lib/api";

function StatCard({
  href,
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
  delay = 0,
}: {
  href: string;
  label: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: "default" | "red" | "amber" | "blue";
  loading: boolean;
  delay?: number;
}) {
  const colorMap = {
    default: {
      border: "border-[var(--border-subtle)] hover:border-[var(--border-default)]",
      iconBg: "bg-slate-800/50",
      iconColor: "text-slate-300",
      valueColor: "text-white",
      glow: "",
    },
    red: {
      border: "border-red-900/30 hover:border-red-800/50",
      iconBg: "bg-red-950/60",
      iconColor: "text-red-400",
      valueColor: "text-red-200",
      glow: "absolute top-0 right-0 w-32 h-32 bg-red-500/[0.04] rounded-full blur-3xl pointer-events-none",
    },
    amber: {
      border: "border-amber-900/30 hover:border-amber-800/50",
      iconBg: "bg-amber-950/60",
      iconColor: "text-amber-400",
      valueColor: "text-amber-200",
      glow: "absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.04] rounded-full blur-3xl pointer-events-none",
    },
    blue: {
      border: "border-blue-900/30 hover:border-blue-800/50",
      iconBg: "bg-blue-950/60",
      iconColor: "text-blue-400",
      valueColor: "text-blue-200",
      glow: "absolute top-0 right-0 w-32 h-32 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none",
    },
  };

  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`group relative p-5 rounded-2xl glass-panel ${c.border} card-hover overflow-hidden animate-float-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {c.glow && <div className={c.glow} />}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {label}
          </span>
          <div className={`w-9 h-9 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconColor} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-[18px] h-[18px]" />
          </div>
        </div>
        <div className="mt-4">
          <span className={`text-3xl font-extrabold ${c.valueColor} tracking-tight font-mono`}>
            {loading ? (
              <div className="skeleton h-8 w-16 rounded-lg" />
            ) : (
              value
            )}
          </span>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span>{subtitle}</span>
            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </div>
      </div>
    </Link>
  );
}

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
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel-elevated p-6 sm:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/[0.02] rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-blue-400/80"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.05) 100%)',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}>
                <Activity className="w-3 h-3" />
                Live Operations
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Municipal Operations
              <span className="block text-lg sm:text-xl font-semibold text-slate-400 mt-1">
                Intelligence Dashboard
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
              Real-time civic intelligence with multi-factor urgency scoring, automated duplicate detection, and human-in-the-loop review pipeline.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 text-slate-300 hover:text-white"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
              Refresh
            </button>
            <Link
              href="/complaints"
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-lg transition-all duration-200 hover:shadow-blue-500/25 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
              }}
            >
              Open Queue
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl flex items-start gap-3 animate-float-up"
          style={{
            background: 'linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(220,38,38,0.04) 100%)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}>
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300 text-sm">Backend Connection Error</p>
            <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          href="/complaints"
          label="Total Complaints"
          value={stats?.total_complaints.toLocaleString() || "0"}
          subtitle="All recorded municipal reports"
          icon={FileText}
          color="default"
          loading={loading}
          delay={0}
        />
        <StatCard
          href="/complaints?urgency=HIGH"
          label="Urgent Complaints"
          value={stats?.urgent_complaints.toLocaleString() || "0"}
          subtitle="High & Critical hazard level"
          icon={AlertTriangle}
          color="red"
          loading={loading}
          delay={50}
        />
        <StatCard
          href="/complaints?duplicate_status=duplicate"
          label="Potential Duplicates"
          value={stats?.potential_duplicates.toLocaleString() || "0"}
          subtitle="Incident clusters & repeat issues"
          icon={Copy}
          color="amber"
          loading={loading}
          delay={100}
        />
        <StatCard
          href="/complaints?status=Pending+Review"
          label="Pending Review"
          value={stats?.pending_review.toLocaleString() || "0"}
          subtitle="Awaiting operator decision"
          icon={Clock}
          color="blue"
          loading={loading}
          delay={150}
        />
      </div>

      {/* Emerging Issues Section */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
              <Flame className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Emerging Issues & Incident Clusters
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-red-400"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                  {emergingIssues.length} Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Multi-complaint grievance clusters grouped by locality and time span.
              </p>
            </div>
          </div>
          <Link
            href="/reports"
            className="text-xs text-blue-400/80 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>Reports</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Detecting active grievance clusters...
            </div>
          ) : emergingIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {emergingIssues.map((issue, idx) => {
                const isHighVolume = issue.complaints_count >= 5;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCluster(issue)}
                    className="relative p-4 rounded-xl cursor-pointer group flex flex-col justify-between gap-3 card-hover animate-float-up"
                    style={{
                      animationDelay: `${idx * 60}ms`,
                      background: 'linear-gradient(135deg, rgba(10,22,40,0.8) 0%, rgba(5,10,20,0.9) 100%)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {isHighVolume && (
                      <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-xl" style={{
                        background: 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)',
                      }} />
                    )}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{isHighVolume ? "🚨" : "⚠️"}</span>
                          <span>{issue.locality} — {issue.department}</span>
                        </span>
                        {issue.incident_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-[var(--border-subtle)] font-semibold">
                            {issue.incident_id}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">
                        Category: <span className="text-slate-300 font-medium">{issue.category}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-extrabold text-white text-base tracking-tight font-mono">
                          {issue.complaints_count}
                        </span>
                        <span className="text-slate-500 ml-1">complaints</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-medium">
                          {issue.time_span_hours !== undefined ? `${issue.time_span_hours}h` : `${issue.time_span_days}d`} window
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-400/80 group-hover:text-blue-300 font-medium">
                      <span>{issue.duplicate_count} duplicates</span>
                      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Inspect <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500 text-xs">
              No active emerging clusters detected.
            </div>
          )}
        </div>
      </div>

      {/* Priority Queue Section */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Priority Queue</h2>
              <p className="text-[11px] text-slate-500">
                Top high-severity issues grouped by category & locality.
              </p>
            </div>
          </div>
          <Link
            href="/complaints?urgency=HIGH"
            className="text-xs text-blue-400/80 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
          >
            <span>View All Urgent</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase font-semibold text-slate-500 border-b border-[var(--border-subtle)]"
              style={{ background: 'rgba(5,10,20,0.6)' }}>
              <tr>
                <th className="px-6 py-3.5">Urgency</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Locality</th>
                <th className="px-6 py-3.5 text-right">Active Reports</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading priority queue...
                    </div>
                  </td>
                </tr>
              ) : stats?.priority_queue && stats.priority_queue.length > 0 ? (
                stats.priority_queue.map((item, idx) => {
                  const isCritical = item.urgency === "CRITICAL";
                  const isHigh = item.urgency === "HIGH";

                  return (
                    <tr key={idx} className="table-row-hover">
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${
                            isCritical
                              ? "badge-critical"
                              : isHigh
                              ? "badge-high"
                              : "badge-medium"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-white font-medium">{item.category}</td>
                      <td className="px-6 py-3.5 text-slate-400">{item.locality}</td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/50 text-white font-mono text-xs font-bold border border-[var(--border-subtle)]">
                          {item.count}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <Link
                          href={`/complaints?search=${encodeURIComponent(item.category)}`}
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
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No urgent pending complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Workflow Guide */}
      <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            step: "1",
            title: "Review Recommendations",
            desc: "Examine automated LLM triage, extracted evidence, multi-factor urgency, and duplicate matches.",
            color: "blue",
            gradient: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)",
            borderColor: "rgba(59,130,246,0.25)",
          },
          {
            step: "2",
            title: "Human Decision",
            desc: "Approve, Edit, or Reject. Operator values stored separately from AI predictions.",
            color: "emerald",
            gradient: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
            borderColor: "rgba(16,185,129,0.25)",
          },
          {
            step: "3",
            title: "Safe Citizen Draft",
            desc: "Formal acknowledgement draft auto-generated for citizen feedback — zero automated dispatch.",
            color: "purple",
            gradient: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(139,92,246,0.05) 100%)",
            borderColor: "rgba(139,92,246,0.25)",
          },
        ].map(({ step, title, desc, gradient, borderColor }, idx) => (
          <div key={idx} className="flex items-start gap-3 animate-float-up" style={{ animationDelay: `${idx * 80}ms` }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs text-white"
              style={{ background: gradient, border: `1px solid ${borderColor}` }}
            >
              {step}
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">{title}</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl glass-panel-elevated overflow-hidden my-8 animate-float-up">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.06) 100%)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <Flame className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedCluster.locality} — {selectedCluster.department}
                    </h2>
                    {selectedCluster.incident_id && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-400 border border-[var(--border-subtle)] font-semibold">
                        {selectedCluster.incident_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: <span className="text-slate-300 font-medium">{selectedCluster.category}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCluster(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Cluster stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Complaints", value: selectedCluster.complaints_count, color: "text-white" },
                  { label: "Duplicates", value: selectedCluster.duplicate_count, color: "text-amber-400" },
                  {
                    label: "Time Window",
                    value: selectedCluster.time_span_hours !== undefined ? `${selectedCluster.time_span_hours}h` : `${selectedCluster.time_span_days}d`,
                    color: "text-blue-400",
                  },
                  { label: "Repeat Reports", value: selectedCluster.repeat_count, color: "text-orange-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-[var(--border-subtle)]" style={{ background: 'rgba(5,10,20,0.6)' }}>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">{stat.label}</span>
                    <p className={`text-xl font-bold ${stat.color} mt-0.5 font-mono`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Factual cluster summary */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] text-xs text-slate-300 leading-relaxed" style={{ background: 'rgba(5,10,20,0.5)' }}>
                <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-1.5">Factual Cluster Summary</span>
                {selectedCluster.summary}
              </div>

              {/* Related complaints list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Associated Grievance Tickets ({selectedCluster.related_complaints?.length || 0})
                </h3>

                <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-[var(--border-subtle)] uppercase text-[10px]" style={{ background: 'rgba(5,10,20,0.6)' }}>
                      <tr>
                        <th className="px-3.5 py-2.5">Ticket ID</th>
                        <th className="px-3.5 py-2.5">Channel</th>
                        <th className="px-3.5 py-2.5">Urgency</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5">Verbatim Snippet</th>
                        <th className="px-3.5 py-2.5 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]" style={{ background: 'rgba(5,10,20,0.3)' }}>
                      {selectedCluster.related_complaints && selectedCluster.related_complaints.length > 0 ? (
                        selectedCluster.related_complaints.map((item) => (
                          <tr key={item.complaint_id} className="table-row-hover">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                              {item.complaint_id}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">{item.source_channel}</td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                item.urgency === "CRITICAL"
                                  ? "badge-critical"
                                  : item.urgency === "HIGH"
                                  ? "badge-high"
                                  : "badge-medium"
                              }`}>
                                {item.urgency}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">{item.status}</td>
                            <td className="px-3.5 py-2.5 text-slate-500 max-w-xs truncate">{item.raw_text_snippet}</td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <Link
                                href={`/complaints/${item.complaint_id}`}
                                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold text-[11px]"
                              >
                                Open
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
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <Link
                  href={`/complaints?department=${encodeURIComponent(selectedCluster.department)}&locality=${encodeURIComponent(selectedCluster.locality)}`}
                  className="text-xs text-blue-400/80 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  View Sector in Queue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedCluster(null)}
                  className="px-5 py-2 text-xs font-semibold text-slate-200 rounded-xl transition-colors hover:bg-white/[0.05]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid var(--border-subtle)',
                  }}
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

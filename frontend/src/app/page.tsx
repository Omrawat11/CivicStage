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
  PlusCircle,
  MapPin,
  Droplets,
  Trash2,
  Construction,
  Power,
  HeartPulse,
  Compass,
} from "lucide-react";
import {
  fetchDashboardStats,
  fetchEmergingIssues,
  DashboardStats,
  EmergingIssue,
} from "@/lib/api";

function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("water") || c.includes("leak") || c.includes("supply")) return Droplets;
  if (c.includes("waste") || c.includes("garbage") || c.includes("clean")) return Trash2;
  if (c.includes("road") || c.includes("pothole") || c.includes("traffic")) return Construction;
  if (c.includes("electric") || c.includes("light") || c.includes("power")) return Power;
  if (c.includes("health") || c.includes("hospital") || c.includes("sanitation")) return HeartPulse;
  return Compass;
}

function StatCard({
  href,
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
  delay = 0,
  trend,
}: {
  href: string;
  label: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: "default" | "red" | "amber" | "blue";
  loading: boolean;
  delay?: number;
  trend?: string;
}) {
  const colorMap = {
    default: {
      border: "border-[var(--border-subtle)] hover:border-blue-500/40",
      iconBg: "bg-blue-600/15 border border-blue-500/25",
      iconColor: "text-blue-400",
      valueColor: "text-white",
      glow: "hover:shadow-[0_0_28px_rgba(59,130,246,0.18)]",
      barColor: "bg-blue-500",
      badgeColor: "text-blue-300 bg-blue-500/10 border-blue-500/20",
    },
    red: {
      border: "border-rose-500/20 hover:border-rose-500/50",
      iconBg: "bg-rose-500/15 border border-rose-500/25",
      iconColor: "text-rose-400",
      valueColor: "text-rose-100",
      glow: "hover:shadow-[0_0_28px_rgba(244,63,94,0.2)]",
      barColor: "bg-rose-500",
      badgeColor: "text-rose-300 bg-rose-500/10 border-rose-500/20",
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-500/50",
      iconBg: "bg-amber-500/15 border border-amber-500/25",
      iconColor: "text-amber-400",
      valueColor: "text-amber-100",
      glow: "hover:shadow-[0_0_28px_rgba(245,158,11,0.2)]",
      barColor: "bg-amber-500",
      badgeColor: "text-amber-300 bg-amber-500/10 border-amber-500/20",
    },
    blue: {
      border: "border-indigo-500/20 hover:border-indigo-500/50",
      iconBg: "bg-indigo-500/15 border border-indigo-500/25",
      iconColor: "text-indigo-400",
      valueColor: "text-indigo-100",
      glow: "hover:shadow-[0_0_28px_rgba(99,102,241,0.2)]",
      barColor: "bg-indigo-500",
      badgeColor: "text-indigo-300 bg-indigo-500/10 border-indigo-500/20",
    },
  };

  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`group relative p-5 rounded-2xl glass-panel ${c.border} ${c.glow} card-hover overflow-hidden animate-float-up flex flex-col justify-between`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </span>
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center ${c.iconColor} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-extrabold ${c.valueColor} tracking-tight font-mono`}>
              {loading ? <div className="skeleton h-9 w-20 rounded-lg" /> : value}
            </span>
            {trend && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badgeColor}`}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center justify-between font-medium">
            <span>{subtitle}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </p>
        </div>
      </div>

      <div className="w-full bg-slate-800/40 h-1 rounded-full mt-4 overflow-hidden">
        <div className={`h-full ${c.barColor} rounded-full transition-all duration-700`} style={{ width: loading ? '30%' : '100%' }} />
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
      setError("Unable to connect to the CivicStage backend API. Ensure FastAPI server is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Compute urgency breakdown ratio for the visual distribution bar
  const totalCount = stats?.total_complaints || 0;
  const urgentCount = stats?.urgent_complaints || 0;
  const duplicateCount = stats?.potential_duplicates || 0;
  const pendingCount = stats?.pending_review || 0;
  const normalCount = Math.max(0, totalCount - urgentCount);

  return (
    <div className="space-y-8">
      {/* Hero Command Section */}
      <div className="relative overflow-hidden rounded-3xl glass-panel-elevated p-6 sm:p-8 lg:p-10 border border-[var(--border-default)]">
        {/* Ambient glow mesh background */}
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl text-[11px] font-bold uppercase tracking-wider text-blue-300 bg-blue-500/15 border border-blue-500/30">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Municipal Command Center</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Bhopal Smart City Shift Active</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Civic Operations
              <span className="block text-xl sm:text-2xl font-bold text-gradient-accent mt-1">
                AI Grievance Triage & Dispatch Intelligence
              </span>
            </h1>

            <p className="text-sm text-slate-300/80 mt-3 leading-relaxed">
              Real-time multi-factor urgency scoring, automated duplicate clustering, and safe human-in-the-loop review pipeline for Bhopal Municipal Corporation.
            </p>

            {/* Quick telemetry chips */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/[0.06] text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <Zap className="w-3.5 h-3.5 text-blue-400" />
                Gemini 2.0 Flash
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Zero Ground-Truth Leakage
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                TF-IDF / DBSCAN Clustering
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-3 text-xs font-semibold rounded-xl text-slate-300 hover:text-white glass-pill hover:bg-white/[0.08] transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
              <span>Refresh Stats</span>
            </button>

            <Link
              href="/complaints"
              className="btn-sheen flex items-center gap-2 px-6 py-3 text-xs font-bold text-white rounded-xl shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)",
                boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
              }}
            >
              <span>Open Triage Queue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Backend Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl flex items-start gap-3 bg-rose-950/40 border border-rose-800/60 animate-float-up text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-200 text-sm">Backend Service Unavailable</p>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          href="/complaints"
          label="Total Ingested"
          value={stats?.total_complaints.toLocaleString() || "0"}
          subtitle="All recorded municipal grievances"
          icon={FileText}
          color="default"
          loading={loading}
          delay={0}
          trend="All Wards"
        />
        <StatCard
          href="/complaints?urgency=HIGH"
          label="Urgent Hazards"
          value={stats?.urgent_complaints.toLocaleString() || "0"}
          subtitle="Critical & High public risk tickets"
          icon={AlertTriangle}
          color="red"
          loading={loading}
          delay={50}
          trend="Immediate Action"
        />
        <StatCard
          href="/complaints?duplicate_status=duplicate"
          label="Potential Duplicates"
          value={stats?.potential_duplicates.toLocaleString() || "0"}
          subtitle="Identified grievance clusters"
          icon={Copy}
          color="amber"
          loading={loading}
          delay={100}
          trend="DBSCAN Match"
        />
        <StatCard
          href="/complaints?status=Pending+Review"
          label="Pending Review"
          value={stats?.pending_review.toLocaleString() || "0"}
          subtitle="Awaiting municipal operator decision"
          icon={Clock}
          color="blue"
          loading={loading}
          delay={150}
          trend="Human Review"
        />
      </div>

      {/* Queue Health & Urgency Distribution Meter */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Queue Workload Urgency Spectrum
            </h3>
            <p className="text-[11px] text-slate-500">
              Proportion of high-severity public hazards versus routine municipal maintenance requests.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              Urgent ({totalCount > 0 ? Math.round((urgentCount / totalCount) * 100) : 0}%)
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Routine ({totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Visual Stacked Bar */}
        <div className="h-3 w-full bg-slate-800/60 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-rose-500 transition-all duration-1000"
            style={{ width: `${totalCount > 0 ? (urgentCount / totalCount) * 100 : 25}%` }}
            title={`Urgent: ${urgentCount}`}
          />
          <div
            className="h-full bg-amber-500 transition-all duration-1000"
            style={{ width: `${totalCount > 0 ? (duplicateCount / totalCount) * 100 : 15}%` }}
            title={`Duplicates: ${duplicateCount}`}
          />
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
            style={{ width: `${totalCount > 0 ? (normalCount / totalCount) * 100 : 60}%` }}
            title={`Routine: ${normalCount}`}
          />
        </div>
      </div>

      {/* Emerging Issues & Incident Clusters */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Emerging Incident Clusters
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  {emergingIssues.length} Active Radar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Spatial-temporal grievance spikes grouped across localities within the last 48 hours.
              </p>
            </div>
          </div>
          <Link
            href="/reports"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <span>Analytics Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Scanning municipal sectors for multi-complaint spikes...
            </div>
          ) : emergingIssues.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {emergingIssues.map((issue, idx) => {
                const isHighVolume = issue.complaints_count >= 5;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCluster(issue)}
                    className="relative p-5 rounded-2xl cursor-pointer group flex flex-col justify-between gap-4 card-hover card-hover-danger animate-float-up bg-slate-900/60 border border-[var(--border-subtle)]"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    {isHighVolume && (
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-rose-500 to-amber-500" />
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          <span>{issue.locality}</span>
                        </span>
                        {issue.incident_id && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-[var(--border-subtle)] font-bold">
                            {issue.incident_id}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">{issue.department}</span>
                        <span>•</span>
                        <span className="text-slate-400">{issue.category}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-white text-lg tracking-tight font-mono">
                          {issue.complaints_count}
                        </span>
                        <span className="text-slate-400 ml-1.5 font-medium">grievances</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 font-mono text-[11px] bg-slate-800/60 px-2 py-0.5 rounded-md border border-white/[0.04]">
                          {issue.time_span_hours !== undefined ? `${issue.time_span_hours}h` : `${issue.time_span_days}d`} window
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-blue-400 group-hover:text-blue-300 font-semibold pt-1">
                      <span>{issue.duplicate_count} confirmed repeats</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Inspect Cluster <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400 text-xs">
              No active emerging clusters detected in current time window.
            </div>
          )}
        </div>
      </div>

      {/* Priority Queue Section */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600/15 border border-blue-500/25 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Priority Escalation Queue</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Highest severity municipal grievances ranked by hazard matrix and impact density.
              </p>
            </div>
          </div>
          <Link
            href="/complaints?urgency=HIGH"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>View All High Urgency</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase font-bold text-slate-400 border-b border-[var(--border-subtle)] bg-[#030712]/70">
              <tr>
                <th className="px-6 py-4">Urgency</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Locality</th>
                <th className="px-6 py-4 text-right">Active Reports</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      Loading priority tickets...
                    </div>
                  </td>
                </tr>
              ) : stats?.priority_queue && stats.priority_queue.length > 0 ? (
                stats.priority_queue.map((item, idx) => {
                  const isCritical = item.urgency === "CRITICAL";
                  const isHigh = item.urgency === "HIGH";
                  const CatIcon = getCategoryIcon(item.category);

                  return (
                    <tr key={idx} className="table-row-hover">
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider ${
                            isCritical ? "badge-critical" : isHigh ? "badge-high" : "badge-medium"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">
                        <div className="flex items-center gap-2">
                          <CatIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="font-semibold">{item.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.locality}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-800/70 text-white font-mono text-xs font-bold border border-[var(--border-subtle)]">
                          {item.count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/complaints?search=${encodeURIComponent(item.category)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-400 hover:text-white hover:bg-blue-600 transition-all"
                        >
                          Review
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    No urgent pending complaints found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operator Workflow Pipeline Guide */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-5 border border-[var(--border-subtle)]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Human-in-the-Loop Operational Architecture
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            How CivicStage balances deterministic multi-factor intelligence with human governance and safe citizen communications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              step: "01",
              title: "Multimodal AI Triage",
              desc: "Gemini 2.0 Flash extracts grounded evidence, computes 4-factor hazard urgency, and clusters repeat incidents via DBSCAN.",
              color: "text-blue-400",
              border: "border-blue-500/30",
              bg: "bg-blue-500/10",
            },
            {
              step: "02",
              title: "Human Operator Review",
              desc: "Municipal officer inspects recommendation. Ground-truth cannot be overridden without operator audit log and justification.",
              color: "text-emerald-400",
              border: "border-emerald-500/30",
              bg: "bg-emerald-500/10",
            },
            {
              step: "03",
              title: "Safe Dispatch & Acknowledgement",
              desc: "A formal citizen draft is generated with ticket ETA. No automated outbound messages are dispatched without human approval.",
              color: "text-purple-400",
              border: "border-purple-500/30",
              bg: "bg-purple-500/10",
            },
          ].map(({ step, title, desc, color, border, bg }, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl bg-slate-900/50 border ${border} flex flex-col justify-between gap-3 animate-float-up`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${bg} ${color}`}>
                  STEP {step}
                </span>
                <span className={`w-2 h-2 rounded-full ${bg}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mt-1">{title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cluster Detail Modal */}
      {selectedCluster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-3xl glass-panel-elevated overflow-hidden my-8 animate-float-up border border-[var(--border-default)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[#030712]/50">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">
                      {selectedCluster.locality} — {selectedCluster.department}
                    </h2>
                    {selectedCluster.incident_id && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-[var(--border-subtle)] font-bold">
                        {selectedCluster.incident_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Category: <span className="text-white font-medium">{selectedCluster.category}</span>
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
                  { label: "Grievances", value: selectedCluster.complaints_count, color: "text-white" },
                  { label: "Duplicates", value: selectedCluster.duplicate_count, color: "text-amber-400" },
                  {
                    label: "Window",
                    value: selectedCluster.time_span_hours !== undefined ? `${selectedCluster.time_span_hours}h` : `${selectedCluster.time_span_days}d`,
                    color: "text-blue-400",
                  },
                  { label: "Repeats", value: selectedCluster.repeat_count, color: "text-rose-400" },
                ].map((stat, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-[var(--border-subtle)] bg-slate-900/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                    <p className={`text-xl font-bold ${stat.color} mt-0.5 font-mono`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Factual cluster summary */}
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] text-xs text-slate-200 leading-relaxed bg-slate-900/40">
                <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Factual Cluster Summary</span>
                {selectedCluster.summary}
              </div>

              {/* Related complaints list */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Associated Grievance Tickets ({selectedCluster.related_complaints?.length || 0})
                </h3>

                <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-400 border-b border-[var(--border-subtle)] uppercase text-[10px] bg-[#030712]/80">
                      <tr>
                        <th className="px-3.5 py-2.5">Ticket ID</th>
                        <th className="px-3.5 py-2.5">Channel</th>
                        <th className="px-3.5 py-2.5">Urgency</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5">Verbatim Snippet</th>
                        <th className="px-3.5 py-2.5 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] bg-slate-900/30">
                      {selectedCluster.related_complaints && selectedCluster.related_complaints.length > 0 ? (
                        selectedCluster.related_complaints.map((item) => (
                          <tr key={item.complaint_id} className="table-row-hover">
                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-400 whitespace-nowrap">
                              {item.complaint_id}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">{item.source_channel}</td>
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
                            <td className="px-3.5 py-2.5 text-slate-300 whitespace-nowrap">{item.status}</td>
                            <td className="px-3.5 py-2.5 text-slate-400 max-w-xs truncate">{item.raw_text_snippet}</td>
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
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
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
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1.5"
                >
                  View Sector in Queue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedCluster(null)}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-200 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors border border-white/[0.08]"
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

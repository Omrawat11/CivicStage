"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import {
  Award,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Binary,
  Copy,
  Users,
  Target,
  FileCode2,
  TrendingUp,
  Cpu,
  Layers,
  Zap,
} from "lucide-react";
import {
  fetchEvaluationMetrics,
  triggerEvaluationRun,
  EvaluationMetricResponse,
} from "@/lib/api";

function EvaluationContent() {
  const [data, setData] = useState<EvaluationMetricResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reRunning, setReRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvaluationMetrics();
      setData(res);
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load evaluation benchmark metrics from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleReRun = async () => {
    setReRunning(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await triggerEvaluationRun();
      setData(res);
      setSuccessMsg("Evaluation benchmark re-executed successfully across held-out test data.");
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to run evaluation benchmark on test dataset.");
    } finally {
      setReRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-amber-300 bg-amber-500/15 border border-amber-500/25">
              LLM Benchmark & Safety Evaluation
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            Model Evaluation & Triage Benchmark
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Held-out evaluation against <span className="font-mono text-slate-300">data/test/complaints_test.csv</span> with strict ground-truth isolation.
          </p>
        </div>

        <button
          onClick={handleReRun}
          disabled={reRunning || loading}
          className="btn-sheen flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/25 disabled:opacity-50 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reRunning ? "animate-spin" : ""}`} />
          <span>{reRunning ? "Evaluating Model..." : "Re-run Evaluation"}</span>
        </button>
      </div>

      {/* Benchmark Metadata Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              LLM Model & Provider
            </span>
            <span className="font-mono text-white font-bold text-sm flex items-center gap-1.5 mt-0.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              {data?.model || "gemini-2.0-flash"} ({data?.provider || "gemini"})
            </span>
          </div>

          <div className="border-l border-white/[0.08] pl-6 hidden sm:block">
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
              Held-Out Testset Size
            </span>
            <span className="font-mono text-white font-bold text-sm mt-0.5 block">
              {data?.test_dataset_size || 100} complaints
            </span>
          </div>

          {data?.timestamp && (
            <div className="border-l border-white/[0.08] pl-6 hidden md:block">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Last Evaluated
              </span>
              <span className="text-slate-300 font-mono text-xs mt-0.5 block">
                {new Date(data.timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Strict Input Isolation (0% Leakage)</span>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2.5 animate-float-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2.5 animate-float-up">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* 4 Primary Accuracy Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          {
            label: "Department Accuracy",
            value: data?.department_accuracy,
            sub: "Predicted vs Ground-Truth Department",
            color: "text-blue-400",
            bar: "bg-blue-500",
            border: "border-blue-500/20",
          },
          {
            label: "Category Accuracy",
            value: data?.category_accuracy,
            sub: "Exact taxonomy category match",
            color: "text-purple-400",
            bar: "bg-purple-500",
            border: "border-purple-500/20",
          },
          {
            label: "Locality Accuracy",
            value: data?.locality_accuracy,
            sub: "Canonical gazetteer normalization",
            color: "text-emerald-400",
            bar: "bg-emerald-500",
            border: "border-emerald-500/20",
          },
          {
            label: "Urgency Agreement",
            value: data?.urgency_agreement,
            sub: "4-factor score vs ground-truth level",
            color: "text-amber-400",
            bar: "bg-amber-500",
            border: "border-amber-500/20",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-2xl p-5 card-hover animate-float-up border ${card.border} flex flex-col justify-between`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <Target className="w-4 h-4 text-slate-400" />
              </div>

              <div className="mt-3">
                <div className={`text-3xl sm:text-4xl font-extrabold ${card.color} tracking-tight font-mono`}>
                  {loading ? <div className="skeleton h-8 w-16 rounded-lg" /> : `${card.value ?? 0}%`}
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{card.sub}</p>
              </div>
            </div>

            <div className="w-full bg-slate-800/60 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full ${card.bar} rounded-full transition-all duration-1000`}
                style={{ width: `${card.value ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Duplicate Detection & Human-in-the-Loop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Detection Performance */}
        <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
            <div className="flex items-center gap-2.5">
              <Copy className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Duplicate Detection Performance
                </h2>
                <p className="text-xs text-slate-400">
                  Precision, recall, and F1 on multi-complaint incident clusters.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Precision</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_precision ?? 0}%`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">TP / (TP + FP)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Recall</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_recall ?? 0}%`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">TP / (TP + FN)</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.06]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">F1 Score</span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_f1 ?? 0}%`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Harmonic Mean</span>
            </div>
          </div>

          {data?.duplicate_detection && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] text-xs text-slate-300 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span>True Positives (TP):</span>
                <span className="text-emerald-400 font-bold">{data.duplicate_detection.true_positives}</span>
              </div>
              <div className="flex justify-between">
                <span>False Positives (FP):</span>
                <span className="text-rose-400 font-bold">{data.duplicate_detection.false_positives}</span>
              </div>
              <div className="flex justify-between">
                <span>False Negatives (FN):</span>
                <span className="text-rose-400 font-bold">{data.duplicate_detection.false_negatives}</span>
              </div>
              <div className="flex justify-between">
                <span>True Negatives (TN):</span>
                <span className="text-emerald-400 font-bold">{data.duplicate_detection.true_negatives}</span>
              </div>
            </div>
          )}
        </div>

        {/* Human-in-the-Loop Telemetry Card */}
        <div className="glass-panel rounded-2xl p-6 border border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Human Correction Rate
                </h2>
                <p className="text-xs text-slate-400">
                  Live operational audit metric derived from human municipal reviews.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/80 border border-white/[0.06]">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Operator Correction Frequency
              </span>
              <div className="text-3xl sm:text-4xl font-black text-blue-400 font-mono mt-1">
                {loading ? "..." : `${data?.human_correction_rate ?? 0}%`}
              </div>
            </div>
            <div className="text-right text-xs text-slate-300 font-mono space-y-1.5">
              <div>
                Reviewed: <span className="font-bold text-white text-sm">{data?.human_in_the_loop?.total_reviewed ?? 0}</span>
              </div>
              <div>
                Adjusted: <span className="font-bold text-blue-300 text-sm">{data?.human_in_the_loop?.corrections_count ?? 0}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Quantifies the proportion of tickets where human municipal officers adjusted category, urgency, department, or rejected automated triage suggestions.
          </p>
        </div>
      </div>

      {/* Accuracy by Department Breakdown Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
        <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Benchmark Accuracy by Department
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Breakdown across municipal sectors on held-out test data.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#030712]/70 text-[11px] uppercase font-bold text-slate-400 border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4 text-right">Correct Predictions</th>
                <th className="px-5 py-4 text-right">Test Ingested</th>
                <th className="px-5 py-4">Accuracy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    Loading department evaluation metrics...
                  </td>
                </tr>
              ) : data?.per_department_metrics && Object.keys(data.per_department_metrics).length > 0 ? (
                Object.entries(data.per_department_metrics).map(([deptName, deptStats]) => (
                  <tr key={deptName} className="table-row-hover">
                    <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                      {deptName}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-emerald-400 font-bold">
                      {deptStats.correct}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-200">
                      {deptStats.total}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                            style={{ width: `${Math.min(100, deptStats.accuracy)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-white">
                          {deptStats.accuracy}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    No per-department evaluation breakdown available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Loading Model Evaluation...</p>
        </div>
      }
    >
      <EvaluationContent />
    </Suspense>
  );
}

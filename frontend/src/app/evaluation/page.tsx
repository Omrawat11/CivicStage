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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Award className="w-6 h-6 text-amber-400" />
            Model Benchmark & Offline Evaluation
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Held-out evaluation against <span className="font-mono text-slate-300">data/test/complaints_test.csv</span> with zero ground-truth leakage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReRun}
            disabled={reRunning || loading}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reRunning ? "animate-spin" : ""}`} />
            <span>{reRunning ? "Evaluating Model..." : "Re-run Evaluation"}</span>
          </button>
        </div>
      </div>

      {/* Benchmark Metadata Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">LLM Model & Provider</span>
            <span className="font-mono text-slate-200 font-semibold">
              {data?.model || "gemini-2.0-flash"} ({data?.provider || "gemini"})
            </span>
          </div>

          <div className="border-l border-slate-800 pl-4">
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Held-out Test Dataset</span>
            <span className="font-mono text-slate-200 font-semibold">
              {data?.test_dataset_size || 100} complaints
            </span>
          </div>

          {data?.timestamp && (
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Last Evaluated</span>
              <span className="text-slate-300">{new Date(data.timestamp).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Strict Input Isolation (No Ground-Truth Leak)</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Primary Accuracy Metric Cards (Section 14 & 19) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Department Accuracy */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Department Accuracy</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? "..." : `${data?.department_accuracy ?? 0}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Predicted vs Ground-Truth Department</p>
          </div>
        </div>

        {/* Category Accuracy */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category Accuracy</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? "..." : `${data?.category_accuracy ?? 0}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Exact taxonomy category match</p>
          </div>
        </div>

        {/* Locality Accuracy */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Locality Accuracy</span>
            <Target className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? "..." : `${data?.locality_accuracy ?? 0}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Canonical gazetteer normalization</p>
          </div>
        </div>

        {/* Urgency Agreement */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Urgency Agreement</span>
            <Target className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {loading ? "..." : `${data?.urgency_agreement ?? 0}%`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Rule engine vs Ground-Truth level</p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Duplicate Performance & Human-in-the-Loop Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Duplicate Detection Performance (Section 15 & 19) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Duplicate Detection Performance</h2>
                <p className="text-xs text-slate-400">Precision, recall, and F1 on multi-complaint incident clusters.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Precision</span>
              <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_precision ?? 0}%`}
              </span>
              <span className="text-[9px] text-slate-500">TP / (TP + FP)</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Recall</span>
              <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_recall ?? 0}%`}
              </span>
              <span className="text-[9px] text-slate-500">TP / (TP + FN)</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">F1 Score</span>
              <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">
                {loading ? "..." : `${data?.duplicate_f1 ?? 0}%`}
              </span>
              <span className="text-[9px] text-slate-500">Harmonic Mean</span>
            </div>
          </div>

          {data?.duplicate_detection && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>True Positives (TP):</span>
                <span className="text-slate-200 font-bold">{data.duplicate_detection.true_positives}</span>
              </div>
              <div className="flex justify-between">
                <span>False Positives (FP):</span>
                <span className="text-slate-200 font-bold">{data.duplicate_detection.false_positives}</span>
              </div>
              <div className="flex justify-between">
                <span>False Negatives (FN):</span>
                <span className="text-slate-200 font-bold">{data.duplicate_detection.false_negatives}</span>
              </div>
              <div className="flex justify-between">
                <span>True Negatives (TN):</span>
                <span className="text-slate-200 font-bold">{data.duplicate_detection.true_negatives}</span>
              </div>
            </div>
          )}
        </div>

        {/* Human-in-the-Loop Audit Card (Section 17 & 19) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Human Correction Rate</h2>
                <p className="text-xs text-slate-400">Live metric derived from real human operator reviews in SQLite.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Operator Correction Rate</span>
              <div className="text-3xl font-extrabold text-blue-400 font-mono mt-1">
                {loading ? "..." : `${data?.human_correction_rate ?? 0}%`}
              </div>
            </div>
            <div className="text-right text-xs text-slate-300 font-mono space-y-1">
              <div>
                Reviewed: <span className="font-bold text-white">{data?.human_in_the_loop?.total_reviewed ?? 0}</span>
              </div>
              <div>
                Corrections: <span className="font-bold text-white">{data?.human_in_the_loop?.corrections_count ?? 0}</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Calculated as the percentage of human-reviewed complaints where the operator modified the department, category, locality, ward, or urgency, or rejected the automated prediction.
          </p>
        </div>
      </div>

      {/* Accuracy by Department Table (Section 16 & 19) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Accuracy by Department</h2>
              <p className="text-xs text-slate-400">
                Evaluation breakdown on held-out test data across municipal departments.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-right">Correct Predictions</th>
                <th className="px-5 py-3.5 text-right">Test Complaints</th>
                <th className="px-5 py-3.5">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                    Loading department evaluation metrics...
                  </td>
                </tr>
              ) : data?.per_department_metrics && Object.keys(data.per_department_metrics).length > 0 ? (
                Object.entries(data.per_department_metrics).map(([deptName, deptStats]) => (
                  <tr key={deptName} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white whitespace-nowrap">
                      {deptName}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-emerald-400 font-semibold">
                      {deptStats.correct}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-200">
                      {deptStats.total}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, deptStats.accuracy)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-200">
                          {deptStats.accuracy}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
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

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate, PipelineStage } from "@/lib/types";

interface QuickSuggestion {
  type: "stuck" | "interview" | "high-score" | "empty-job";
  icon: string;
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export default function AiDailySuggestions() {
  const [isOpen, setIsOpen] = useState(true);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickSuggestions, setQuickSuggestions] = useState<QuickSuggestion[]>(
    []
  );
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [pipelineRes, jobsRes] = await Promise.all([
      supabase
        .from("pipeline")
        .select("*, candidate:candidates(*), job:jobs(*)"),
      supabase.from("jobs").select("*"),
    ]);

    const pipelineData = (pipelineRes.data || []) as Pipeline[];
    const jobsData = (jobsRes.data || []) as Job[];

    setPipeline(pipelineData);
    setJobs(jobsData);
    computeQuickSuggestions(pipelineData, jobsData);
    setLoading(false);
  }

  function computeQuickSuggestions(
    pipelineData: Pipeline[],
    jobsData: Job[]
  ) {
    const suggestions: QuickSuggestion[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Candidates stuck in a stage for >7 days
    const stuckCandidates = pipelineData.filter((p) => {
      if (p.stage === "hired" || p.stage === "rejected") return false;
      const changedAt = new Date(p.stage_changed_at);
      return changedAt < sevenDaysAgo;
    });

    if (stuckCandidates.length > 0) {
      const names = stuckCandidates
        .slice(0, 3)
        .map(
          (p) =>
            `${p.candidate?.name || "\u4e0d\u660e"}\uff08${STAGE_LABELS[p.stage]}\uff09`
        )
        .join("\u3001");
      const extra =
        stuckCandidates.length > 3
          ? ` \u4ed6${stuckCandidates.length - 3}\u540d`
          : "";
      suggestions.push({
        type: "stuck",
        icon: "\u23f0",
        label: "\u6ede\u7559\u5019\u88dc\u8005\u3042\u308a",
        description: `${names}${extra} \u304c7\u65e5\u4ee5\u4e0a\u540c\u3058\u30b9\u30c6\u30fc\u30b8\u306b\u6ede\u7559\u3057\u3066\u3044\u307e\u3059\u3002\u6b21\u306e\u30a2\u30af\u30b7\u30e7\u30f3\u3092\u691c\u8a0e\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
        priority: "high",
      });
    }

    // 2. Upcoming interviews this week
    const interviewCandidates = pipelineData.filter((p) => {
      return p.stage === "interview1" || p.stage === "interview_final";
    });

    if (interviewCandidates.length > 0) {
      const names = interviewCandidates
        .slice(0, 3)
        .map(
          (p) =>
            `${p.candidate?.name || "\u4e0d\u660e"}\uff08${STAGE_LABELS[p.stage]}\uff09`
        )
        .join("\u3001");
      const extra =
        interviewCandidates.length > 3
          ? ` \u4ed6${interviewCandidates.length - 3}\u540d`
          : "";
      suggestions.push({
        type: "interview",
        icon: "\ud83d\udccb",
        label: "\u9762\u63a5\u4e88\u5b9a\u306e\u5019\u88dc\u8005",
        description: `${names}${extra} \u304c\u9762\u63a5\u30b9\u30c6\u30fc\u30b8\u306b\u3044\u307e\u3059\u3002\u9762\u63a5\u6e96\u5099\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
        priority: "medium",
      });
    }

    // 3. High-score candidates (80+) not yet in interview stage
    const interviewStages: PipelineStage[] = [
      "interview1",
      "interview_final",
      "offer",
      "hired",
    ];
    const highScoreNotInterview = pipelineData.filter((p) => {
      if (p.stage === "rejected") return false;
      if (interviewStages.includes(p.stage)) return false;
      return p.score !== null && p.score >= 80;
    });

    if (highScoreNotInterview.length > 0) {
      const names = highScoreNotInterview
        .slice(0, 3)
        .map(
          (p) =>
            `${p.candidate?.name || "\u4e0d\u660e"}\uff08\u30b9\u30b3\u30a2: ${p.score}\uff09`
        )
        .join("\u3001");
      const extra =
        highScoreNotInterview.length > 3
          ? ` \u4ed6${highScoreNotInterview.length - 3}\u540d`
          : "";
      suggestions.push({
        type: "high-score",
        icon: "\u2b50",
        label: "\u9ad8\u30b9\u30b3\u30a2\u5019\u88dc\u8005\u3092\u9762\u63a5\u3078",
        description: `${names}${extra} \u304c\u30b9\u30b3\u30a280\u4ee5\u4e0a\u3067\u3059\u304c\u3001\u307e\u3060\u9762\u63a5\u306b\u9032\u3093\u3067\u3044\u307e\u305b\u3093\u3002\u512a\u5148\u7684\u306b\u9762\u63a5\u3092\u8a2d\u5b9a\u3057\u307e\u3057\u3087\u3046\u3002`,
        priority: "high",
      });
    }

    // 4. Open jobs with 0 candidates
    const openJobs = jobsData.filter((j) => j.status === "open");
    const jobsWithCandidates = new Set(
      pipelineData
        .filter((p) => p.stage !== "rejected")
        .map((p) => p.job_id)
    );
    const emptyJobs = openJobs.filter((j) => !jobsWithCandidates.has(j.id));

    if (emptyJobs.length > 0) {
      const titles = emptyJobs
        .slice(0, 3)
        .map((j) => j.title)
        .join("\u3001");
      const extra =
        emptyJobs.length > 3 ? ` \u4ed6${emptyJobs.length - 3}\u4ef6` : "";
      suggestions.push({
        type: "empty-job",
        icon: "\ud83d\udd0d",
        label: "\u5019\u88dc\u8005\u304c\u3044\u306a\u3044\u6c42\u4eba",
        description: `${titles}${extra} \u306b\u306f\u30a2\u30af\u30c6\u30a3\u30d6\u306a\u5019\u88dc\u8005\u304c\u3044\u307e\u305b\u3093\u3002\u6c42\u4eba\u306e\u516c\u958b\u72b6\u6cc1\u3084\u30bd\u30fc\u30b7\u30f3\u30b0\u6226\u7565\u3092\u898b\u76f4\u3057\u3066\u304f\u3060\u3055\u3044\u3002`,
        priority: "medium",
      });
    }

    setQuickSuggestions(suggestions);
  }

  async function handleAiAnalysis() {
    setAiLoading(true);
    setAiError("");
    setAiAnalysis("");

    try {
      const activePipeline = pipeline.filter(
        (p) => p.stage !== "rejected" && p.stage !== "hired"
      );
      const stageCounts: Record<string, number> = {};
      for (const p of activePipeline) {
        stageCounts[STAGE_LABELS[p.stage]] =
          (stageCounts[STAGE_LABELS[p.stage]] || 0) + 1;
      }

      const openJobs = jobs.filter((j) => j.status === "open");

      const summaryParts = [
        "## \u73fe\u5728\u306e\u63a1\u7528\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u72b6\u6cc1",
        `\u30aa\u30fc\u30d7\u30f3\u6c42\u4eba\u6570: ${openJobs.length}\u4ef6`,
        `\u30a2\u30af\u30c6\u30a3\u30d6\u5019\u88dc\u8005\u6570: ${activePipeline.length}\u540d`,
        "",
        "### \u30b9\u30c6\u30fc\u30b8\u5225\u4eba\u6570:",
      ];

      Object.entries(stageCounts).forEach(([stage, count]) => {
        summaryParts.push(`- ${stage}: ${count}\u540d`);
      });

      summaryParts.push("", "### \u30aa\u30fc\u30d7\u30f3\u6c42\u4eba:");
      openJobs.forEach((j) => {
        summaryParts.push(`- ${j.title}\uff08${j.department}\u30fb${j.location}\uff09`);
      });

      summaryParts.push("", "### \u9ad8\u30b9\u30b3\u30a2\u5019\u88dc\u8005:");
      activePipeline
        .filter((p) => p.score !== null && p.score >= 70)
        .forEach((p) => {
          summaryParts.push(
            `- ${p.candidate?.name || "\u4e0d\u660e"}: \u30b9\u30b3\u30a2${p.score} / ${STAGE_LABELS[p.stage]}\uff08${p.job?.title || "\u4e0d\u660e"}\uff09`
          );
        });

      const summary = summaryParts.join("\n");
      const prompt = `\u3042\u306a\u305f\u306f\u63a1\u7528\u6226\u7565\u30a2\u30c9\u30d0\u30a4\u30b6\u30fc\u3067\u3059\u3002\u4ee5\u4e0b\u306e\u63a1\u7528\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u30c7\u30fc\u30bf\u3092\u5206\u6790\u3057\u3001\u4eca\u65e5\u53d6\u308b\u3079\u304d\u5177\u4f53\u7684\u306a\u30a2\u30af\u30b7\u30e7\u30f33\uff5e5\u500b\u3092\u512a\u5148\u5ea6\u4ed8\u304d\u3067\u63d0\u6848\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u5404\u30a2\u30af\u30b7\u30e7\u30f3\u306b\u306f\u7406\u7531\u3068\u671f\u5f85\u52b9\u679c\u3082\u6dfb\u3048\u3066\u304f\u3060\u3055\u3044\u3002\n\n${summary}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      setAiAnalysis(data.result || data.text || "\u5206\u6790\u7d50\u679c\u3092\u53d6\u5f97\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002");
    } catch (e: any) {
      setAiError(e.message || "AI\u5206\u6790\u4e2d\u306b\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002");
    } finally {
      setAiLoading(false);
    }
  }

  const priorityColors: Record<string, string> = {
    high: "bg-red-50 border-red-200 text-red-800",
    medium: "bg-amber-50 border-amber-200 text-amber-800",
    low: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const priorityLabels: Record<string, string> = {
    high: "\u9ad8",
    medium: "\u4e2d",
    low: "\u4f4e",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{"\ud83e\udd16"}</span>
          <h2 className="text-[14px] font-bold text-gray-800">
            AI \u30c7\u30a4\u30ea\u30fc\u30b5\u30b8\u30a7\u30b9\u30c1\u30e7\u30f3
          </h2>
          {!loading && quickSuggestions.length > 0 && (
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full">
              {quickSuggestions.length}\u4ef6
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-5 pb-5 space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400 text-[12px]">
              <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              \u30c7\u30fc\u30bf\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...
            </div>
          )}

          {/* Quick Suggestions (Rule-based) */}
          {!loading && quickSuggestions.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                \u30af\u30a4\u30c3\u30af\u30b5\u30b8\u30a7\u30b9\u30c1\u30e7\u30f3
              </h3>
              {quickSuggestions.map((s, i) => (
                <div
                  key={i}
                  className={`border rounded-lg px-4 py-3 ${priorityColors[s.priority]}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold">{s.label}</span>
                        <span className="text-[10px] font-bold opacity-60 border border-current rounded px-1.5 py-0.5">
                          \u512a\u5148\u5ea6: {priorityLabels[s.priority]}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed opacity-90">{s.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No suggestions */}
          {!loading && quickSuggestions.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-[12px]">
              \u73fe\u5728\u3001\u7279\u306b\u30a2\u30af\u30b7\u30e7\u30f3\u304c\u5fc5\u8981\u306a\u9805\u76ee\u306f\u3042\u308a\u307e\u305b\u3093\u3002
            </div>
          )}

          {/* AI Deep Analysis Button */}
          {!loading && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleAiAnalysis}
                disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-[12px] font-bold hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI\u5206\u6790\u4e2d...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI\u6226\u7565\u5206\u6790\u3092\u5b9f\u884c
                  </>
                )}
              </button>
            </div>
          )}

          {/* AI Error */}
          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[12px] text-red-700">
              {aiError}
            </div>
          )}

          {/* AI Analysis Result */}
          {aiAnalysis && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{"\ud83e\udde0"}</span>
                <h3 className="text-[12px] font-bold text-indigo-800">
                  AI\u6226\u7565\u5206\u6790\u30ec\u30dd\u30fc\u30c8
                </h3>
              </div>
              <div className="text-[12px] leading-relaxed text-indigo-900 whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate } from "@/lib/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import StepNavigation from "@/components/StepNavigation";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

type SubTab = "acceptance" | "risk" | "pipeline_forecast";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "acceptance", icon: "✅", label: "内定承諾予測" },
  { id: "risk", icon: "⚠️", label: "離脱リスク" },
  { id: "pipeline_forecast", icon: "📊", label: "パイプライン予測" },
];

export default function PredictionsPage() {
  const [tab, setTab] = useState<SubTab>("acceptance");
  const [pipeline, setPipeline] = useState<(Pipeline & { candidate: Candidate; job: Job })[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: j }] = await Promise.all([
      supabase.from("pipeline").select("*, candidate:candidates(*), job:jobs(*)").neq("stage", "rejected").order("created_at", { ascending: false }),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    ]);
    setPipeline((p as unknown as (Pipeline & { candidate: Candidate; job: Job })[]) || []);
    setJobs(j || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pipeline forecast data
  const stageCounts = STAGE_ORDER.reduce(
    (acc, stage) => {
      acc[stage] = pipeline.filter((p) => p.stage === stage).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const forecastData = {
    labels: STAGE_ORDER.map((s) => STAGE_LABELS[s]),
    datasets: [
      {
        label: "現在の人数",
        data: STAGE_ORDER.map((s) => stageCounts[s]),
        backgroundColor: [
          "rgba(99,102,241,0.7)",
          "rgba(59,130,246,0.7)",
          "rgba(139,92,246,0.7)",
          "rgba(245,158,11,0.7)",
          "rgba(16,185,129,0.7)",
          "rgba(34,197,94,0.7)",
        ],
        borderRadius: 6,
      },
    ],
  };

  // Offer candidates for acceptance prediction
  const offerCandidates = pipeline.filter((p) => p.stage === "offer");
  const interviewCandidates = pipeline.filter((p) => p.stage === "interview1" || p.stage === "interview_final");

  // Risk candidates (screening for too long)
  const riskCandidates = pipeline
    .filter((p) => p.stage !== "hired" && p.stage !== "rejected")
    .map((p) => {
      const daysInStage = Math.round((Date.now() - new Date(p.stage_changed_at).getTime()) / 86400000);
      let risk: "high" | "medium" | "low" = "low";
      if (daysInStage > 14) risk = "high";
      else if (daysInStage > 7) risk = "medium";
      return { ...p, daysInStage, risk };
    })
    .sort((a, b) => b.daysInStage - a.daysInStage);

  async function generateAiPrediction() {
    setAiLoading(true);
    const summary = {
      total: pipeline.length,
      stages: stageCounts,
      offerCount: offerCandidates.length,
      interviewCount: interviewCandidates.length,
      highRisk: riskCandidates.filter((r) => r.risk === "high").length,
      jobs: jobs.map((j) => j.title),
    };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `あなたは株式会社ピアズの採用データアナリストです。以下のパイプラインデータから採用予測を分析してください。

パイプライン概要:
- 総候補者数: ${summary.total}名
- ステージ別: ${JSON.stringify(summary.stages)}
- 内定候補者: ${summary.offerCount}名
- 面接中: ${summary.interviewCount}名
- 離脱リスク高: ${summary.highRisk}名
- 求人: ${summary.jobs.join(", ")}

以下を予測・分析してください:
1. 今後1ヶ月の内定承諾予測（人数と確率）
2. 離脱リスクの高い候補者への対策提案
3. パイプライン全体のボトルネック分析
4. 採用目標達成のための具体的アクション提案`,
        }),
      });
      const data = await res.json();
      setAiResult(data.result || data.error || "生成に失敗しました");
    } catch {
      setAiResult("エラーが発生しました");
    }
    setAiLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-gray-800 mb-1">🔮 予測分析</h1>
        <p className="text-[13px] text-gray-400">内定承諾率・離脱リスク・パイプライン予測</p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[12px] font-bold py-2.5 rounded-lg transition-all ${
              tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">読み込み中...</div>
      ) : (
        <>
          {/* Acceptance prediction */}
          {tab === "acceptance" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">✅ 内定承諾予測</h2>
                {offerCandidates.length === 0 ? (
                  <p className="text-[13px] text-gray-400 text-center py-8">現在、内定ステージの候補者はいません</p>
                ) : (
                  <div className="space-y-3">
                    {offerCandidates.map((p) => {
                      const days = Math.round((Date.now() - new Date(p.stage_changed_at).getTime()) / 86400000);
                      const probability = Math.max(20, 90 - days * 3);
                      return (
                        <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                          <div>
                            <span className="text-[13px] font-bold text-gray-700">{p.candidate?.name}</span>
                            <span className="text-[11px] text-gray-400 ml-2">{p.job?.title}</span>
                            <span className="text-[10px] text-gray-300 ml-2">({days}日経過)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${probability > 70 ? "bg-green-500" : probability > 40 ? "bg-amber-500" : "bg-red-500"}`}
                                style={{ width: `${probability}%` }}
                              />
                            </div>
                            <span className={`text-[12px] font-bold ${probability > 70 ? "text-green-600" : probability > 40 ? "text-amber-600" : "text-red-600"}`}>
                              {probability}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold text-gray-700">🤖 AI予測分析</h2>
                  <button
                    onClick={generateAiPrediction}
                    disabled={aiLoading}
                    className="text-[12px] font-bold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {aiLoading ? "⏳ 分析中..." : "予測を生成"}
                  </button>
                </div>
                {aiResult && (
                  <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                    {aiResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk analysis */}
          {tab === "risk" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-[15px] font-bold text-gray-700 mb-4">⚠️ 離脱リスク分析</h2>
              <p className="text-[12px] text-gray-400 mb-4">ステージに長期滞留している候補者を離脱リスクとして検出</p>
              {riskCandidates.length === 0 ? (
                <p className="text-[13px] text-gray-400 text-center py-8">アクティブな候補者がいません</p>
              ) : (
                <div className="space-y-2">
                  {riskCandidates.slice(0, 20).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            p.risk === "high" ? "bg-red-500" : p.risk === "medium" ? "bg-amber-500" : "bg-green-500"
                          }`}
                        />
                        <div>
                          <span className="text-[13px] font-bold text-gray-700">{p.candidate?.name}</span>
                          <span className="text-[11px] text-gray-400 ml-2">{STAGE_LABELS[p.stage as keyof typeof STAGE_LABELS]}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400">{p.daysInStage}日滞留</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.risk === "high"
                              ? "bg-red-100 text-red-700"
                              : p.risk === "medium"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {p.risk === "high" ? "高リスク" : p.risk === "medium" ? "中リスク" : "低リスク"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pipeline forecast */}
          {tab === "pipeline_forecast" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">📊 パイプライン予測</h2>
                <div className="h-64">
                  <Bar
                    data={forecastData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
                        x: { ticks: { font: { size: 11 } } },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {STAGE_ORDER.map((stage) => (
                  <div key={stage} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                    <div className="text-2xl font-extrabold text-gray-800">{stageCounts[stage]}</div>
                    <div className="text-[11px] font-bold text-gray-400 mt-1">{STAGE_LABELS[stage]}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <StepNavigation />
    </div>
  );
}

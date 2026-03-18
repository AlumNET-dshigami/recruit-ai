"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS, STAGE_ORDER } from "@/lib/types";
import type { Pipeline, Candidate } from "@/lib/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

const TABS = ["内定承諾予測", "離脱リスク", "パイプライン予測", "AI予測"] as const;

interface PipelineWithCandidate extends Pipeline {
  candidate: Candidate;
}

function calcAcceptProb(p: PipelineWithCandidate): number {
  let score = 50;
  if (p.score && p.score >= 80) score += 20;
  else if (p.score && p.score >= 60) score += 10;
  if (p.stage === "offer") score += 15;
  if (p.stage === "interview_final") score += 5;
  if (p.candidate?.experience_years && p.candidate.experience_years >= 5) score += 5;
  if (p.candidate?.source === "リファラル") score += 10;
  return Math.min(score, 95);
}

function calcChurnRisk(p: PipelineWithCandidate): "高" | "中" | "低" {
  const daysSinceChange = Math.floor(
    (Date.now() - new Date(p.stage_changed_at || p.created_at).getTime()) / 86400000
  );
  if (daysSinceChange > 14 && ["screening", "interview1"].includes(p.stage)) return "高";
  if (daysSinceChange > 7) return "中";
  return "低";
}

export default function PredictionsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [pipelines, setPipelines] = useState<PipelineWithCandidate[]>([]);
  const [aiPrediction, setAiPrediction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pipeline")
      .select("*, candidate:candidates(*)")
      .not("stage", "eq", "rejected")
      .not("stage", "eq", "hired")
      .returns<PipelineWithCandidate[]>();
    setPipelines(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runAiPredict = async () => {
    setAiLoading(true);
    try {
      const stageCounts = STAGE_ORDER.map(s => {
        const count = pipelines.filter(p => p.stage === s).length;
        return `${STAGE_LABELS[s]}: ${count}名`;
      }).join(", ");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `現在のパイプライン状況: ${stageCounts}\n今後1ヶ月の採用予測と、ボトルネック改善の提案を出してください。`,
          systemPrompt: "あなたは採用予測分析の専門家です。データに基づいて予測と改善提案をしてください。",
        }),
      });
      const data = await res.json();
      setAiPrediction(data.text || "予測を取得できませんでした");
    } catch {
      setAiPrediction("エラーが発生しました");
    }
    setAiLoading(false);
  };

  const offerCandidates = pipelines
    .filter(p => ["offer", "interview_final"].includes(p.stage))
    .map(p => ({ ...p, prob: calcAcceptProb(p) }))
    .sort((a, b) => b.prob - a.prob);

  const riskCandidates = pipelines
    .map(p => ({ ...p, risk: calcChurnRisk(p) }))
    .sort((a, b) => {
      const order = { "高": 0, "中": 1, "低": 2 };
      return order[a.risk] - order[b.risk];
    });

  const stageDistribution = STAGE_ORDER.filter(s => s !== "rejected" && s !== "hired").map(s => ({
    stage: STAGE_LABELS[s],
    count: pipelines.filter(p => p.stage === s).length,
  }));

  const barData = {
    labels: stageDistribution.map(s => s.stage),
    datasets: [{
      label: "候補者数",
      data: stageDistribution.map(s => s.count),
      backgroundColor: ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#06b6d4"],
    }],
  };

  const months = ["1月", "2月", "3月", "4月", "5月", "6月"];
  const lineData = {
    labels: months,
    datasets: [
      {
        label: "予測採用数",
        data: [3, 5, 4, 6, 5, 7],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "予測応募数",
        data: [15, 20, 18, 25, 22, 28],
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">予測分析</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">アクティブ候補者</div>
          <div className="text-2xl font-bold text-blue-600">{pipelines.length}名</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">内定/最終段階</div>
          <div className="text-2xl font-bold text-green-600">{offerCandidates.length}名</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">高リスク候補者</div>
          <div className="text-2xl font-bold text-red-600">
            {riskCandidates.filter(r => r.risk === "高").length}名
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">平均承諾率</div>
          <div className="text-2xl font-bold text-purple-600">
            {offerCandidates.length > 0
              ? Math.round(offerCandidates.reduce((s, c) => s + c.prob, 0) / offerCandidates.length)
              : 0}%
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "内定承諾予測" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">内定承諾確率</h3>
          {offerCandidates.length === 0 ? (
            <p className="text-gray-400 text-sm">内定・最終面接段階の候補者がいません</p>
          ) : (
            <div className="space-y-3">
              {offerCandidates.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium">{c.candidate?.name}</div>
                    <div className="text-xs text-gray-500">
                      {STAGE_LABELS[c.stage]} | スコア: {c.score ?? "-"}
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span>承諾率</span>
                      <span className="font-medium">{c.prob}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          c.prob >= 70 ? "bg-green-500" : c.prob >= 50 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${c.prob}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "離脱リスク" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">離脱リスク分析</h3>
          <div className="space-y-3">
            {riskCandidates.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium">{c.candidate?.name}</div>
                  <div className="text-xs text-gray-500">{STAGE_LABELS[c.stage]}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  c.risk === "高" ? "bg-red-100 text-red-700" :
                  c.risk === "中" ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  リスク: {c.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "パイプライン予測" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">ステージ別分布</h3>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">月別予測トレンド</h3>
            <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
          </div>
        </div>
      )}

      {tab === "AI予測" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">AI 採用予測</h3>
          <p className="text-sm text-gray-500 mb-4">
            パイプラインデータをAIが分析し、今後の採用予測を生成します。
          </p>
          <button
            onClick={runAiPredict}
            disabled={aiLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {aiLoading ? "予測生成中..." : "AI予測を実行"}
          </button>
          {aiPrediction && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {aiPrediction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

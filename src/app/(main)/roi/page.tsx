"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate } from "@/lib/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import StepNavigation from "@/components/StepNavigation";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend
);

type SubTab = "cost" | "channel_roi" | "prediction";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "cost", icon: "💵", label: "コスト分析" },
  { id: "channel_roi", icon: "📈", label: "チャネルROI" },
  { id: "prediction", icon: "🔮", label: "予測" },
];

const CHANNEL_COST: Record<string, number> = {
  BizReach: 35,
  LinkedIn: 20,
  エージェント: 100,
  リファラル: 5,
  direct: 2,
};

const STAGE_COST: Record<string, number> = {
  applied: 0.5,
  screening: 1,
  interview1: 3,
  interview_final: 5,
  offer: 2,
  hired: 10,
};

function getChannelCost(source: string): number {
  if (CHANNEL_COST[source] !== undefined) return CHANNEL_COST[source];
  const lower = source.toLowerCase();
  if (lower.includes("bizreach")) return CHANNEL_COST["BizReach"];
  if (lower.includes("linkedin")) return CHANNEL_COST["LinkedIn"];
  if (lower.includes("エージェント") || lower.includes("agent")) return CHANNEL_COST["エージェント"];
  if (lower.includes("リファラル") || lower.includes("referral")) return CHANNEL_COST["リファラル"];
  if (lower.includes("direct") || lower.includes("直接")) return CHANNEL_COST["direct"];
  return 15;
}

export default function RoiPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("cost");
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictionText, setPredictionText] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [pipelineRes, jobsRes] = await Promise.all([
        supabase.from("pipeline").select("*, candidate:candidates(name, source, skills, experience_years)"),
        supabase.from("jobs").select("*"),
      ]);
      setPipeline((pipelineRes.data || []) as Pipeline[]);
      setJobs((jobsRes.data || []) as Job[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  const channelData: Record<string, {
    total: number;
    hired: number;
    scores: number[];
    costPerHire: number;
  }> = {};

  pipeline.forEach((p) => {
    const source = (p.candidate as unknown as Candidate)?.source || "不明";
    if (!channelData[source]) {
      channelData[source] = { total: 0, hired: 0, scores: [], costPerHire: getChannelCost(source) };
    }
    channelData[source].total++;
    if (p.score) channelData[source].scores.push(p.score);
    if (p.stage === "hired") channelData[source].hired++;
  });

  const channels = Object.entries(channelData).map(([name, data]) => ({
    name,
    ...data,
    avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
    conversionRate: data.total > 0 ? data.hired / data.total : 0,
  }));

  const totalHired = pipeline.filter((p) => p.stage === "hired").length;
  const totalEstimatedCost = channels.reduce((sum, ch) => sum + ch.hired * ch.costPerHire, 0);
  const avgCostPerHire = totalHired > 0 ? Math.round(totalEstimatedCost / totalHired) : 0;

  const stageCosts = STAGE_ORDER.map((stage) => {
    const count = pipeline.filter((p) => {
      const idx = STAGE_ORDER.indexOf(p.stage);
      const stageIdx = STAGE_ORDER.indexOf(stage);
      return idx >= stageIdx;
    }).length;
    return {
      stage,
      label: STAGE_LABELS[stage],
      count,
      costPerCandidate: STAGE_COST[stage] || 0,
      totalCost: count * (STAGE_COST[stage] || 0),
    };
  });
  const totalStageCost = stageCosts.reduce((sum, s) => sum + s.totalCost, 0);

  const costBarData = {
    labels: channels.map((ch) => ch.name),
    datasets: [{
      label: "採用単価（万円）",
      data: channels.map((ch) => ch.costPerHire),
      backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"],
      borderRadius: 6,
    }],
  };

  const stageCostBarData = {
    labels: stageCosts.map((s) => s.label),
    datasets: [{
      label: "ステージ別コスト（万円）",
      data: stageCosts.map((s) => s.totalCost),
      backgroundColor: ["#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399"],
      borderRadius: 6,
    }],
  };

  const roiChannels = channels
    .map((ch) => {
      const qualityScore = ch.avgScore || 0;
      const convRate = ch.conversionRate;
      const cost = ch.costPerHire;
      const roiIndex = cost > 0 ? Math.round((qualityScore * convRate / cost) * 1000) / 10 : 0;
      return { ...ch, roiIndex };
    })
    .sort((a, b) => b.roiIndex - a.roiIndex);

  const roiBarData = {
    labels: roiChannels.map((ch) => ch.name),
    datasets: [{
      label: "ROI指数",
      data: roiChannels.map((ch) => ch.roiIndex),
      backgroundColor: roiChannels.map((_, i) =>
        i === 0 ? "#10b981" : i === 1 ? "#3b82f6" : i === 2 ? "#f59e0b" : "#94a3b8"
      ),
      borderRadius: 6,
    }],
  };

  const totalRoi = roiChannels.reduce((sum, ch) => sum + ch.roiIndex, 0);
  const budgetAllocation = roiChannels.map((ch) => ({
    name: ch.name,
    pct: totalRoi > 0 ? Math.round((ch.roiIndex / totalRoi) * 100) : 0,
    roiIndex: ch.roiIndex,
  }));

  const budgetDoughnutData = {
    labels: budgetAllocation.map((b) => b.name),
    datasets: [{
      data: budgetAllocation.map((b) => b.pct),
      backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"],
    }],
  };

  async function generatePrediction() {
    setPredictionLoading(true);
    setPredictionText("");

    const channelSummary = roiChannels
      .map((ch) => ch.name + ": 候補" + ch.total + "名, 入社" + ch.hired + "名, 採用単価" + ch.costPerHire + "万円, 平均スコア" + ch.avgScore + ", ROI指数" + ch.roiIndex)
      .join("\n");

    const budgetSummary = budgetAllocation
      .map((b) => b.name + ": 推奨配分" + b.pct + "%")
      .join("\n");

    const stageSummary = stageCosts
      .map((s) => s.label + ": " + s.count + "名 x " + s.costPerCandidate + "万円 = " + s.totalCost + "万円")
      .join("\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "以下の採用ROIデータに基づいて、具体的な予算配分最適化と採用ROI改善提案をしてください。\n\n【現状データ】\n- 総エントリー: " + pipeline.length + "名\n- 入社決定: " + totalHired + "名\n- 推定総採用コスト: " + totalEstimatedCost + "万円\n- 平均採用単価: " + avgCostPerHire + "万円/名\n\n【チャネル別ROI】\n" + channelSummary + "\n\n【現在の推奨予算配分】\n" + budgetSummary + "\n\n【ステージ別コスト】\n" + stageSummary + "\n\n以下の構成で提案してください:\n1. ROI最適化サマリー（3行）\n2. チャネル別予算配分の具体的提案（金額ベース、月予算100万円想定）\n3. コスト削減施策（3-5つ）\n4. 品質を維持しつつコストを下げる方法\n5. 3ヶ月後のROI改善予測シナリオ\n6. 最優先アクション（3つ）",
          systemPrompt: "あなたは採用ROIの専門家です。データに基づいた具体的で実行可能な予算最適化提案を日本語で作成してください。数値やパーセンテージを使って具体的に提案してください。",
        }),
      });
      const data = await res.json();
      setPredictionText(data.text || "予測生成に失敗しました");
    } finally {
      setPredictionLoading(false);
    }
  }

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" } } },
  };

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">💰 採用ROI</h1>
        <p className="text-[13px] text-gray-400 mb-5">チャネル別コスト分析・ROI評価・予測最適化</p>

        {/* Sub Tabs */}
        <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[12px] font-semibold px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === tab.id ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "cost" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{totalEstimatedCost}<span className="text-lg">万円</span></div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">推定総採用コスト</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-blue-600">{avgCostPerHire}<span className="text-lg">万円</span></div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">平均採用単価</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">{totalHired}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">入社決定数</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-amber-600">{channels.length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">利用チャネル数</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">💵 チャネル別採用単価（万円）</h2>
                <div style={{ height: 260 }}><Bar data={costBarData} options={barOptions} /></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">📊 ステージ別コスト（万円）</h2>
                <div style={{ height: 260 }}><Bar data={stageCostBarData} options={barOptions} /></div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-5 py-3">チャネル</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">候補者数</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">入社数</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">採用単価</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">推定コスト</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => (
                    <tr key={ch.name} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3 text-[13px] font-bold text-gray-800">{ch.name}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600 font-semibold">{ch.total}</td>
                      <td className="px-3 py-3 text-center text-[12px] font-bold text-emerald-600">{ch.hired}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600">{ch.costPerHire}万円</td>
                      <td className="px-3 py-3 text-center text-[12px] font-bold text-gray-800">{ch.hired * ch.costPerHire}万円</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-5 py-3 text-[13px] font-extrabold text-gray-800">合計</td>
                    <td className="px-3 py-3 text-center text-[12px] font-bold text-gray-800">{pipeline.length}</td>
                    <td className="px-3 py-3 text-center text-[12px] font-bold text-emerald-600">{totalHired}</td>
                    <td className="px-3 py-3 text-center text-[12px] text-gray-400">-</td>
                    <td className="px-3 py-3 text-center text-[12px] font-extrabold text-gray-800">{totalEstimatedCost}万円</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-700 mb-4">🔄 ステージ別コスト内訳</h2>
              <div className="space-y-3">
                {stageCosts.map((s) => {
                  const maxCost = Math.max(...stageCosts.map((x) => x.totalCost), 1);
                  const pct = (s.totalCost / maxCost) * 100;
                  return (
                    <div key={s.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-gray-700">{s.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400">{s.count}名 x {s.costPerCandidate}万円</span>
                          <span className="text-[12px] font-extrabold text-gray-800">{s.totalCost}万円</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: pct + "%" }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[12px] font-extrabold text-gray-800">ステージ処理コスト合計</span>
                  <span className="text-[14px] font-extrabold text-gray-800">{totalStageCost}万円</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "channel_roi" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{roiChannels.length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">評価チャネル数</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {roiChannels.length > 0 ? roiChannels[0].name : "—"}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">最高ROIチャネル</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-blue-600">
                  {roiChannels.length > 0 ? roiChannels[0].roiIndex : 0}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">最高ROI指数</div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <h2 className="text-[15px] font-bold text-gray-700 mb-4">📈 チャネル別ROI指数</h2>
              <p className="text-[11px] text-gray-400 mb-3">ROI指数 = 品質スコア x 転換率 / 採用単価 x 1000</p>
              <div style={{ height: 260 }}><Bar data={roiBarData} options={barOptions} /></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-5 py-3">#</th>
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-3 py-3">チャネル</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">候補者数</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">入社数</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">転換率</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">品質スコア</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">採用単価</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">ROI指数</th>
                  </tr>
                </thead>
                <tbody>
                  {roiChannels.map((ch, idx) => (
                    <tr key={ch.name} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`text-[12px] font-bold ${
                          idx === 0 ? "text-amber-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-700" : "text-gray-400"
                        }`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : String(idx + 1)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[13px] font-bold text-gray-800">{ch.name}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600 font-semibold">{ch.total}</td>
                      <td className="px-3 py-3 text-center text-[12px] font-bold text-emerald-600">{ch.hired}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          ch.conversionRate >= 0.2 ? "bg-emerald-100 text-emerald-700" :
                          ch.conversionRate >= 0.1 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{Math.round(ch.conversionRate * 100)}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[12px] font-extrabold ${
                          ch.avgScore >= 80 ? "text-emerald-600" :
                          ch.avgScore >= 60 ? "text-amber-600" :
                          "text-gray-400"
                        }`}>{ch.avgScore || "—"}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600">{ch.costPerHire}万円</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[12px] font-extrabold ${
                          idx === 0 ? "text-emerald-600" : idx === 1 ? "text-blue-600" : "text-gray-600"
                        }`}>{ch.roiIndex}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {roiChannels.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-[13px]">データがありません</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">🎯 推奨予算配分</h2>
                <div style={{ height: 250 }} className="flex items-center justify-center">
                  <Doughnut data={budgetDoughnutData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } },
                  }} />
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">📋 配分詳細</h2>
                <div className="space-y-3">
                  {budgetAllocation.map((b, i) => (
                    <div key={b.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-gray-700">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} {b.name}
                        </span>
                        <span className="text-[12px] font-extrabold text-gray-800">{b.pct}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            i === 0 ? "bg-emerald-400" : i === 1 ? "bg-blue-400" : i === 2 ? "bg-amber-400" : "bg-gray-300"
                          }`}
                          style={{ width: b.pct + "%" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "prediction" && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-700">🔮 AI予測・最適化提案</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">現在のROIデータからAIが予算配分と改善策を提案</p>
                </div>
                <button
                  onClick={generatePrediction}
                  disabled={predictionLoading}
                  className={`text-[12px] font-bold text-white px-5 py-2.5 rounded-lg transition-all ${
                    predictionLoading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary-dark"
                  }`}
                >
                  {predictionLoading ? "⏳ 分析中..." : "🔮 AI予測を生成"}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "推定総コスト", value: totalEstimatedCost + "万円", icon: "💰" },
                  { label: "平均採用単価", value: avgCostPerHire + "万円", icon: "📊" },
                  { label: "最高ROIチャネル", value: roiChannels.length > 0 ? roiChannels[0].name : "—", icon: "🏆" },
                  { label: "入社決定数", value: totalHired + "名", icon: "✅" },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-[16px]">{item.icon}</div>
                    <div className="text-[14px] font-extrabold text-gray-800">{item.value}</div>
                    <div className="text-[10px] text-gray-400 font-bold">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-[12px] font-bold text-blue-800 mb-2">📊 チャネル別ROIサマリー</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {roiChannels.map((ch, i) => (
                    <div key={ch.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-blue-700 font-semibold">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  "} {ch.name}
                      </span>
                      <span className="text-blue-800 font-bold">
                        ROI: {ch.roiIndex} / 単価: {ch.costPerHire}万円 / 転換率: {Math.round(ch.conversionRate * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {predictionText && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-gray-700">💡 AI最適化提案</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(predictionText)}
                    className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    📋 コピー
                  </button>
                </div>
                <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                  {predictionText}
                </div>
              </div>
            )}
          </>
        )}

        <StepNavigation />
      </div>
    </div>
  );
}

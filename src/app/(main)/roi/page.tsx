"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TABS = ["コスト分析", "チャネルROI", "AI最適化"] as const;

const CHANNEL_COSTS: Record<string, number> = {
  BizReach: 85,
  Green: 60,
  "MS-Japan": 70,
  Wantedly: 30,
  リファラル: 10,
  自社HP: 5,
  LinkedIn: 50,
  doda: 65,
  エージェント: 100,
};

export default function RoiPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [channelData, setChannelData] = useState<
    { source: string; total: number; hired: number; cost: number; cpa: number; roi: number }[]
  >([]);
  const [totals, setTotals] = useState({ totalCost: 0, avgCpa: 0, hiredCount: 0, channelCount: 0 });
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: pipelines } = await supabase
      .from("pipeline")
      .select("stage, candidate:candidates(source)")
      .returns<{ stage: string; candidate: { source: string } | null }[]>();

    if (!pipelines) { setLoading(false); return; }

    const bySource: Record<string, { total: number; hired: number }> = {};
    for (const p of pipelines) {
      const src = p.candidate?.source || "不明";
      if (!bySource[src]) bySource[src] = { total: 0, hired: 0 };
      bySource[src].total++;
      if (p.stage === "hired") bySource[src].hired++;
    }

    const channels = Object.entries(bySource).map(([source, d]) => {
      const costPer = CHANNEL_COSTS[source] || 50;
      const cost = d.total * costPer;
      const cpa = d.hired > 0 ? Math.round(cost / d.hired) : 0;
      const roi = d.hired > 0 ? Math.round((d.hired * 300 - cost) / cost * 100) : 0;
      return { source, ...d, cost, cpa, roi };
    }).sort((a, b) => b.total - a.total);

    const totalCost = channels.reduce((s, c) => s + c.cost, 0);
    const hiredCount = channels.reduce((s, c) => s + c.hired, 0);
    setChannelData(channels);
    setTotals({
      totalCost,
      avgCpa: hiredCount > 0 ? Math.round(totalCost / hiredCount) : 0,
      hiredCount,
      channelCount: channels.length,
    });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runAiOptimize = async () => {
    setAiLoading(true);
    try {
      const summary = channelData.map(c =>
        `${c.source}: 候補者${c.total}名, 採用${c.hired}名, CPA ${c.cpa}万円, ROI ${c.roi}%`
      ).join("\n");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の採用チャネル別データを分析し、コスト最適化の提案を3つ挙げてください:\n${summary}`,
          systemPrompt: "あなたは採用ROI最適化の専門家です。データに基づいて具体的な改善提案をしてください。",
        }),
      });
      const data = await res.json();
      setAiInsight(data.text || "分析結果を取得できませんでした");
    } catch {
      setAiInsight("エラーが発生しました");
    }
    setAiLoading(false);
  };

  const barData = {
    labels: channelData.map(c => c.source),
    datasets: [
      { label: "候補者数", data: channelData.map(c => c.total), backgroundColor: "rgba(59,130,246,0.7)" },
      { label: "採用数", data: channelData.map(c => c.hired), backgroundColor: "rgba(16,185,129,0.7)" },
    ],
  };

  const doughnutData = {
    labels: channelData.map(c => c.source),
    datasets: [{
      data: channelData.map(c => c.cost),
      backgroundColor: ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316"],
    }],
  };

  const kpis = [
    { label: "総採用コスト", value: `${totals.totalCost.toLocaleString()}万円`, color: "text-blue-600" },
    { label: "平均CPA", value: `${totals.avgCpa.toLocaleString()}万円`, color: "text-green-600" },
    { label: "採用数", value: `${totals.hiredCount}名`, color: "text-purple-600" },
    { label: "チャネル数", value: `${totals.channelCount}`, color: "text-orange-600" },
  ];

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">採用ROIダッシュボード</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
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

      {tab === "コスト分析" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">チャネル別 候補者・採用数</h3>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">コスト配分</h3>
            <div className="max-w-xs mx-auto">
              <Doughnut data={doughnutData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
            </div>
          </div>
        </div>
      )}

      {tab === "チャネルROI" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">チャネル別ROIランキング</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">チャネル</th>
                  <th className="pb-2 text-right">候補者</th>
                  <th className="pb-2 text-right">採用</th>
                  <th className="pb-2 text-right">コスト(万)</th>
                  <th className="pb-2 text-right">CPA(万)</th>
                  <th className="pb-2 text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {[...channelData].sort((a, b) => b.roi - a.roi).map(c => (
                  <tr key={c.source} className="border-b last:border-0">
                    <td className="py-2 font-medium">{c.source}</td>
                    <td className="py-2 text-right">{c.total}</td>
                    <td className="py-2 text-right">{c.hired}</td>
                    <td className="py-2 text-right">{c.cost.toLocaleString()}</td>
                    <td className="py-2 text-right">{c.cpa > 0 ? c.cpa.toLocaleString() : "-"}</td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        c.roi > 200 ? "bg-green-100 text-green-700" :
                        c.roi > 0 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {c.roi > 0 ? `+${c.roi}%` : c.roi === 0 ? "-" : `${c.roi}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "AI最適化" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">AI コスト最適化分析</h3>
          <p className="text-sm text-gray-500 mb-4">
            現在の採用データをAIが分析し、コスト最適化の提案を行います。
          </p>
          <button
            onClick={runAiOptimize}
            disabled={aiLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {aiLoading ? "分析中..." : "AI分析を実行"}
          </button>
          {aiInsight && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {aiInsight}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

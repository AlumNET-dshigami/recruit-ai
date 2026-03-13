"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate, PipelineStage } from "@/lib/types";
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
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend
);

type SubTab = "funnel" | "leadtime" | "agents" | "report" | "ai_suggestion";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "funnel", icon: "📊", label: "ファネル" },
  { id: "leadtime", icon: "⏱️", label: "リードタイム" },
  { id: "agents", icon: "🏢", label: "エージェント" },
  { id: "report", icon: "📋", label: "レポート" },
  { id: "ai_suggestion", icon: "🤖", label: "AI提案" },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("funnel");
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportText, setReportText] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);

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

  // ===== ファネルデータ =====
  const funnelCounts = STAGE_ORDER.map((s) => pipeline.filter((p) => p.stage === s).length);
  const funnelChartData = {
    labels: STAGE_ORDER.map((s) => STAGE_LABELS[s]),
    datasets: [{
      label: "候補者数",
      data: funnelCounts,
      backgroundColor: ["#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399"],
      borderRadius: 6,
    }],
  };

  // ソース別
  const sourceCounts: Record<string, number> = {};
  pipeline.forEach((p) => {
    const source = (p.candidate as unknown as Candidate)?.source || "不明";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  const sourceChartData = {
    labels: Object.keys(sourceCounts),
    datasets: [{
      data: Object.values(sourceCounts),
      backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"],
    }],
  };

  // 案件別進捗
  const stageColors = ["#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399"];
  const jobProgressData = {
    labels: jobs.map((j) => j.title.length > 12 ? j.title.slice(0, 12) + "…" : j.title),
    datasets: STAGE_ORDER.map((stage, i) => ({
      label: STAGE_LABELS[stage],
      data: jobs.map((j) => pipeline.filter((p) => p.job_id === j.id && p.stage === stage).length),
      backgroundColor: stageColors[i],
      borderRadius: 3,
    })),
  };

  // ===== リードタイム分析 =====
  function calcLeadTime() {
    // ステージごとの平均滞在日数を算出
    const stageData: Record<string, { total: number; count: number }> = {};
    STAGE_ORDER.forEach((s) => { stageData[s] = { total: 0, count: 0 }; });

    pipeline.forEach((p) => {
      if (p.stage !== "applied") {
        const days = Math.max(1, Math.round(
          (new Date(p.stage_changed_at).getTime() - new Date(p.created_at).getTime()) / 86400000
        ));
        stageData[p.stage] = {
          total: stageData[p.stage].total + days,
          count: stageData[p.stage].count + 1,
        };
      }
    });

    return STAGE_ORDER.map((s) => ({
      stage: s,
      label: STAGE_LABELS[s],
      avgDays: stageData[s].count > 0 ? Math.round(stageData[s].total / stageData[s].count) : 0,
      count: stageData[s].count,
    }));
  }

  const leadTimeData = calcLeadTime();
  const totalAvgDays = leadTimeData.reduce((sum, d) => sum + d.avgDays, 0);
  const bottleneck = leadTimeData.reduce((max, d) => d.avgDays > max.avgDays ? d : max, leadTimeData[0]);

  const leadTimeChartData = {
    labels: leadTimeData.map((d) => d.label),
    datasets: [{
      label: "平均日数",
      data: leadTimeData.map((d) => d.avgDays),
      backgroundColor: leadTimeData.map((d) =>
        d.stage === bottleneck.stage && d.avgDays > 0 ? "#ef4444" : "#60a5fa"
      ),
      borderRadius: 6,
    }],
  };

  // ===== エージェント別パフォーマンス =====
  function calcAgentPerformance() {
    const agents: Record<string, {
      total: number;
      screening: number;
      interview: number;
      offer: number;
      hired: number;
      rejected: number;
      avgScore: number;
      scores: number[];
    }> = {};

    pipeline.forEach((p) => {
      const source = (p.candidate as unknown as Candidate)?.source || "不明";
      if (!agents[source]) {
        agents[source] = { total: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0, avgScore: 0, scores: [] };
      }
      agents[source].total++;
      if (p.score) agents[source].scores.push(p.score);

      const stageIdx = STAGE_ORDER.indexOf(p.stage);
      if (stageIdx >= 1) agents[source].screening++;
      if (stageIdx >= 2) agents[source].interview++;
      if (stageIdx >= 4) agents[source].offer++;
      if (p.stage === "hired") agents[source].hired++;
      if (p.stage === "rejected") agents[source].rejected++;
    });

    return Object.entries(agents)
      .map(([name, data]) => ({
        name,
        ...data,
        avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : 0,
        passRate: data.total > 0 ? Math.round((data.screening / data.total) * 100) : 0,
        hireRate: data.total > 0 ? Math.round((data.hired / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.hireRate - a.hireRate || b.total - a.total);
  }

  const agentData = calcAgentPerformance();

  // ===== レポート生成 =====
  async function generateReport() {
    setReportLoading(true);
    setReportText("");

    const funnelSummary = STAGE_ORDER.map((s) => `${STAGE_LABELS[s]}: ${pipeline.filter((p) => p.stage === s).length}名`).join("\n");
    const sourceSummary = Object.entries(sourceCounts).map(([k, v]) => `${k}: ${v}名`).join("\n");
    const agentSummary = agentData.map((a) => `${a.name}: 紹介${a.total}名, 通過率${a.passRate}%, 入社率${a.hireRate}%, 平均スコア${a.avgScore}`).join("\n");
    const leadTimeSummary = leadTimeData.map((d) => `${d.label}: 平均${d.avgDays}日`).join("\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の採用データに基づいて、経営層向けの月次採用レポートを作成してください。

【基本指標】
- 総エントリー: ${pipeline.length}名
- 進行中案件: ${jobs.filter((j) => j.status === "open").length}件
- 入社決定: ${pipeline.filter((p) => p.stage === "hired").length}名
- 不合格: ${pipeline.filter((p) => p.stage === "rejected").length}名

【ファネル状況】
${funnelSummary}

【チャネル別】
${sourceSummary}

【エージェント別パフォーマンス】
${agentSummary}

【選考リードタイム】
${leadTimeSummary}
合計平均: ${totalAvgDays}日
ボトルネック: ${bottleneck.label}（${bottleneck.avgDays}日）

以下の構成で作成:
■ エグゼクティブサマリー（3行）
■ 採用実績サマリー（数値ベース）
■ ファネル分析
■ チャネル・エージェント評価
■ 選考リードタイム分析
■ 課題・改善提案（3-5点）
■ 来月のアクションプラン`,
          systemPrompt: "あなたは採用データアナリストです。経営層向けに、データに基づいた簡潔で示唆に富むレポートを日本語で作成してください。",
        }),
      });
      const data = await res.json();
      setReportText(data.text || "レポート生成に失敗しました");
    } finally {
      setReportLoading(false);
    }
  }

  // ===== AI戦略提案 =====
  async function generateAiSuggestion() {
    setAiSuggestionLoading(true);
    setAiSuggestion("");

    const agentSummary = agentData.map((a) => `${a.name}: 紹介${a.total}名, 書類通過率${a.passRate}%, 入社率${a.hireRate}%`).join("\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の採用データを分析し、具体的な改善提案をしてください。

【現状データ】
- 総応募: ${pipeline.length}名
- 入社: ${pipeline.filter((p) => p.stage === "hired").length}名
- 不合格: ${pipeline.filter((p) => p.stage === "rejected").length}名
- ボトルネック: ${bottleneck.label}（平均${bottleneck.avgDays}日）
- 全体リードタイム: 平均${totalAvgDays}日

【チャネル別パフォーマンス】
${agentSummary}

以下を提案:
1. 歩留まり改善策（具体的に3つ）
2. チャネル最適化（投資対効果の観点から）
3. リードタイム短縮策
4. スクリーニング精度の改善
5. 来月の重点アクション（優先度付き）`,
          systemPrompt: "あなたは採用戦略コンサルタントです。データに基づいた実践的で具体的な改善提案をしてください。",
        }),
      });
      const data = await res.json();
      setAiSuggestion(data.text || "提案の生成に失敗しました");
    } finally {
      setAiSuggestionLoading(false);
    }
  }

  const barOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" }, ticks: { stepSize: 1 } } },
  };
  const stackedOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: "#f1f5f9" }, ticks: { stepSize: 1 } } },
  };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">📊 数値分析</h1>
        <p className="text-[13px] text-gray-400 mb-5">ファネル・リードタイム・エージェント分析・レポート自動生成</p>

        {/* Sub Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5">
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

        {/* ===== ファネル ===== */}
        {activeTab === "funnel" && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{pipeline.length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">総エントリー</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">{pipeline.filter((p) => p.stage === "hired").length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">入社決定</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-blue-600">
                  {pipeline.filter((p) => p.score).length > 0 ? Math.round(pipeline.filter((p) => p.score).reduce((sum, p) => sum + (p.score || 0), 0) / pipeline.filter((p) => p.score).length) : 0}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">平均AIスコア</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">採用ファネル</h2>
                <div style={{ height: 250 }}><Bar data={funnelChartData} options={barOptions} /></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">チャネル別応募数</h2>
                <div style={{ height: 250 }} className="flex items-center justify-center">
                  <Doughnut data={sourceChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } } }} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-700 mb-4">案件別進捗</h2>
              <div style={{ height: 280 }}><Bar data={jobProgressData} options={stackedOptions} /></div>
            </div>
          </>
        )}

        {/* ===== リードタイム分析 ===== */}
        {activeTab === "leadtime" && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{totalAvgDays}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">平均選考日数（合計）</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-red-500">{bottleneck.avgDays}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">
                  ボトルネック: {bottleneck.label}
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {pipeline.filter((p) => p.stage === "hired").length}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">入社完了数</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">⏱️ ステージ別平均日数</h2>
                <div style={{ height: 260 }}>
                  <Bar data={leadTimeChartData} options={{
                    ...barOptions,
                    indexAxis: "y" as const,
                  }} />
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">📊 ステージ別詳細</h2>
                <div className="space-y-3">
                  {leadTimeData.map((d) => {
                    const maxDays = Math.max(...leadTimeData.map((x) => x.avgDays), 1);
                    const pct = (d.avgDays / maxDays) * 100;
                    const isBottleneck = d.stage === bottleneck.stage && d.avgDays > 0;
                    return (
                      <div key={d.stage}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-bold text-gray-700">{d.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">{d.count}名</span>
                            <span className={`text-[12px] font-extrabold ${isBottleneck ? "text-red-500" : "text-gray-800"}`}>
                              {d.avgDays}日
                            </span>
                            {isBottleneck && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                ボトルネック
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isBottleneck ? "bg-red-400" : "bg-blue-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 改善ヒント */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <h3 className="text-[13px] font-bold text-amber-800 mb-2">💡 改善ヒント</h3>
              <div className="text-[12px] text-amber-700 space-y-1">
                {bottleneck.avgDays > 5 && (
                  <p>・<strong>{bottleneck.label}</strong>が平均{bottleneck.avgDays}日で最も時間がかかっています。プロセスの見直しを検討してください。</p>
                )}
                {totalAvgDays > 30 && (
                  <p>・全体リードタイムが{totalAvgDays}日です。業界平均（IT: 25-35日）と比較して適正か確認してください。</p>
                )}
                <p>・選考ステップの並行実施（1次面接と適性検査の同時進行など）でリードタイムを短縮できます。</p>
              </div>
            </div>
          </>
        )}

        {/* ===== エージェント別パフォーマンス ===== */}
        {activeTab === "agents" && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{agentData.length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">チャネル数</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-blue-600">
                  {agentData.length > 0 ? agentData[0].name : "—"}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">最高入社率チャネル</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {agentData.reduce((sum, a) => sum + a.hired, 0)}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">全チャネル入社計</div>
              </div>
            </div>

            {/* ランキングテーブル */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-5 py-3">#</th>
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-3 py-3">チャネル/エージェント</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">紹介数</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">書類通過</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">面接</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">内定</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">入社</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">通過率</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">入社率</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">平均スコア</th>
                  </tr>
                </thead>
                <tbody>
                  {agentData.map((agent, idx) => (
                    <tr key={agent.name} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className={`text-[12px] font-bold ${
                          idx === 0 ? "text-amber-500" : idx === 1 ? "text-gray-400" : idx === 2 ? "text-amber-700" : "text-gray-400"
                        }`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[13px] font-bold text-gray-800">{agent.name}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600 font-semibold">{agent.total}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600">{agent.screening}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600">{agent.interview}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-gray-600">{agent.offer}</td>
                      <td className="px-3 py-3 text-center text-[12px] font-bold text-emerald-600">{agent.hired}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          agent.passRate >= 70 ? "bg-emerald-100 text-emerald-700" :
                          agent.passRate >= 40 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-600"
                        }`}>{agent.passRate}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          agent.hireRate >= 20 ? "bg-emerald-100 text-emerald-700" :
                          agent.hireRate >= 10 ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{agent.hireRate}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[12px] font-extrabold ${
                          agent.avgScore >= 80 ? "text-emerald-600" :
                          agent.avgScore >= 60 ? "text-amber-600" :
                          "text-gray-400"
                        }`}>{agent.avgScore || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {agentData.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-[13px]">データがありません</div>
              )}
            </div>

            {/* チャネル別ファネル */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-[15px] font-bold text-gray-700 mb-4">📊 チャネル別ファネル比較</h2>
              <div style={{ height: 280 }}>
                <Bar
                  data={{
                    labels: agentData.map((a) => a.name),
                    datasets: [
                      { label: "紹介数", data: agentData.map((a) => a.total), backgroundColor: "#94a3b8", borderRadius: 3 },
                      { label: "書類通過", data: agentData.map((a) => a.screening), backgroundColor: "#60a5fa", borderRadius: 3 },
                      { label: "面接", data: agentData.map((a) => a.interview), backgroundColor: "#818cf8", borderRadius: 3 },
                      { label: "入社", data: agentData.map((a) => a.hired), backgroundColor: "#34d399", borderRadius: 3 },
                    ],
                  }}
                  options={stackedOptions}
                />
              </div>
            </div>
          </>
        )}

        {/* ===== レポート生成 ===== */}
        {activeTab === "report" && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-700">📋 採用レポート自動生成</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">現在のデータからAIが経営層向けレポートを作成</p>
                </div>
                <button
                  onClick={generateReport}
                  disabled={reportLoading}
                  className={`text-[12px] font-bold text-white px-5 py-2.5 rounded-lg transition-all ${
                    reportLoading ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary-dark"
                  }`}
                >
                  {reportLoading ? "⏳ 生成中..." : "📋 レポートを生成"}
                </button>
              </div>

              {/* データサマリー */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: "総エントリー", value: pipeline.length, icon: "👥" },
                  { label: "入社決定", value: pipeline.filter((p) => p.stage === "hired").length, icon: "✅" },
                  { label: "不合格", value: pipeline.filter((p) => p.stage === "rejected").length, icon: "❌" },
                  { label: "平均リードタイム", value: `${totalAvgDays}日`, icon: "⏱️" },
                ].map((item) => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-[16px]">{item.icon}</div>
                    <div className="text-[14px] font-extrabold text-gray-800">{item.value}</div>
                    <div className="text-[10px] text-gray-400 font-bold">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {reportText && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-gray-700">📄 生成レポート</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(reportText)}
                    className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    📋 コピー
                  </button>
                </div>
                <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                  {reportText}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== AI戦略提案 ===== */}
        {activeTab === "ai_suggestion" && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-700">🤖 AI戦略提案</h2>
                  <p className="text-[12px] text-gray-400 mt-0.5">歩留まり・リードタイムデータからAIが改善策を提案</p>
                </div>
                <button
                  onClick={generateAiSuggestion}
                  disabled={aiSuggestionLoading}
                  className={`text-[12px] font-bold text-white px-5 py-2.5 rounded-lg transition-all ${
                    aiSuggestionLoading ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {aiSuggestionLoading ? "⏳ 分析中..." : "🤖 AI分析を実行"}
                </button>
              </div>
            </div>

            {aiSuggestion && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-bold text-gray-700">💡 改善提案</h3>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiSuggestion)}
                    className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                  >
                    📋 コピー
                  </button>
                </div>
                <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                  {aiSuggestion}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

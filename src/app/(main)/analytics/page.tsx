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
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Title, Tooltip, Legend
);

type SubTab = "funnel" | "channels" | "cost" | "ai_suggestion";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "funnel", icon: "📊", label: "ファネル分析" },
  { id: "channels", icon: "📡", label: "チャネル別歩留まり" },
  { id: "cost", icon: "💰", label: "コスト分析" },
  { id: "ai_suggestion", icon: "🤖", label: "AI戦略提案" },
];

function ComingSoon({ phase, description }: { phase: number; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">{description}</h3>
      <span className="bg-amber-100 text-amber-700 text-[12px] font-bold px-3 py-1 rounded-full">
        Phase {phase} で実装予定
      </span>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("funnel");
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pipelineRes, jobsRes] = await Promise.all([
        supabase.from("pipeline").select("*, candidate:candidates(source)"),
        supabase.from("jobs").select("*"),
      ]);
      setPipeline((pipelineRes.data || []) as Pipeline[]);
      setJobs((jobsRes.data || []) as Job[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        読み込み中...
      </div>
    );
  }

  // ファネルデータ
  const funnelCounts = STAGE_ORDER.map(
    (s) => pipeline.filter((p) => p.stage === s).length
  );
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
    labels: jobs.map((j) => j.title),
    datasets: STAGE_ORDER.map((stage, i) => ({
      label: STAGE_LABELS[stage],
      data: jobs.map((j) => pipeline.filter((p) => p.job_id === j.id && p.stage === stage).length),
      backgroundColor: stageColors[i],
      borderRadius: 3,
    })),
  };

  // 月次トレンド
  const months = ["10月", "11月", "12月", "1月", "2月", "3月"];
  const trendData = {
    labels: months,
    datasets: [
      {
        label: "応募数",
        data: [12, 15, 18, 22, 19, pipeline.length],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true, tension: 0.3,
      },
      {
        label: "内定数",
        data: [2, 3, 2, 4, 3, pipeline.filter((p) => p.stage === "offer" || p.stage === "hired").length],
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.1)",
        fill: true, tension: 0.3,
      },
    ],
  };

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
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: "#f1f5f9" }, ticks: { stepSize: 5 } } },
  };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
          📊 数値分析
        </h1>
        <p className="text-[13px] text-gray-400 mb-5">
          チャネル別歩留まり・ファネル分析・コスト分析・AI戦略提案
        </p>

        {/* Sub Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "funnel" && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-gray-800">{pipeline.length}</div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">総エントリー</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-emerald-600">
                  {pipeline.filter((p) => p.stage === "hired").length}
                </div>
                <div className="text-[12px] text-gray-400 font-bold mt-1">入社決定</div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-3xl font-extrabold text-blue-600">
                  {pipeline.filter((p) => p.score).length > 0
                    ? Math.round(
                        pipeline.filter((p) => p.score).reduce((sum, p) => sum + (p.score || 0), 0) /
                        pipeline.filter((p) => p.score).length
                      )
                    : 0}
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
                  <Doughnut data={sourceChartData} options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } },
                  }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">案件別進捗</h2>
                <div style={{ height: 280 }}><Bar data={jobProgressData} options={stackedOptions} /></div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">月次推移</h2>
                <div style={{ height: 280 }}><Line data={trendData} options={lineOptions} /></div>
              </div>
            </div>
          </>
        )}

        {activeTab === "channels" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <ComingSoon phase={3} description="チャネル別歩留まり分析（CSV取込データと連携）" />
          </div>
        )}

        {activeTab === "cost" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <ComingSoon phase={3} description="チャネル別CPA・CPH（Cost Per Hire）分析" />
          </div>
        )}

        {activeTab === "ai_suggestion" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <ComingSoon phase={4} description="歩留まりデータに基づくAI改善提案" />
          </div>
        )}
      </div>
    </div>
  );
}

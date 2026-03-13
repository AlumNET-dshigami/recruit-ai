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
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ReportsPage() {
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
    datasets: [
      {
        label: "候補者数",
        data: funnelCounts,
        backgroundColor: ["#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399"],
        borderRadius: 6,
      },
    ],
  };

  // ソース別データ
  const sourceCounts: Record<string, number> = {};
  pipeline.forEach((p) => {
    const source = (p.candidate as unknown as Candidate)?.source || "不明";
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  const sourceChartData = {
    labels: Object.keys(sourceCounts),
    datasets: [
      {
        data: Object.values(sourceCounts),
        backgroundColor: [
          "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4",
        ],
      },
    ],
  };

  // 案件別進捗（積み上げ棒）
  const jobLabels = jobs.map((j) => j.title);
  const stageColors = ["#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399"];

  const jobProgressData = {
    labels: jobLabels,
    datasets: STAGE_ORDER.map((stage, i) => ({
      label: STAGE_LABELS[stage],
      data: jobs.map(
        (j) => pipeline.filter((p) => p.job_id === j.id && p.stage === stage).length
      ),
      backgroundColor: stageColors[i],
      borderRadius: 3,
    })),
  };

  // 月次ダミートレンド（デモ用）
  const months = ["10月", "11月", "12月", "1月", "2月", "3月"];
  const trendData = {
    labels: months,
    datasets: [
      {
        label: "応募数",
        data: [12, 15, 18, 22, 19, pipeline.length],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "内定数",
        data: [2, 3, 2, 4, 3, pipeline.filter((p) => p.stage === "offer" || p.stage === "hired").length],
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.1)",
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#f1f5f9" }, ticks: { stepSize: 1 } },
    },
  };

  const stackedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: "#f1f5f9" }, ticks: { stepSize: 1 } },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } } },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "#f1f5f9" }, ticks: { stepSize: 5 } },
    },
  };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">
          レポート
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{pipeline.length}</div>
            <div className="text-[12px] text-gray-400 font-bold mt-1">総候補者エントリー</div>
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
                    pipeline
                      .filter((p) => p.score)
                      .reduce((sum, p) => sum + (p.score || 0), 0) /
                      pipeline.filter((p) => p.score).length
                  )
                : 0}
            </div>
            <div className="text-[12px] text-gray-400 font-bold mt-1">平均AIスコア</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Funnel */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              採用ファネル
            </h2>
            <div style={{ height: 250 }}>
              <Bar data={funnelChartData} options={barOptions} />
            </div>
          </div>

          {/* Source */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              チャネル別応募数
            </h2>
            <div style={{ height: 250 }} className="flex items-center justify-center">
              <Doughnut
                data={sourceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "right", labels: { boxWidth: 12, font: { size: 11 } } } },
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Job Progress */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              案件別進捗
            </h2>
            <div style={{ height: 280 }}>
              <Bar data={jobProgressData} options={stackedOptions} />
            </div>
          </div>

          {/* Trend */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              月次推移
            </h2>
            <div style={{ height: 280 }}>
              <Line data={trendData} options={lineOptions} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

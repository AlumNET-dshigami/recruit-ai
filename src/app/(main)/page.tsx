"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job } from "@/lib/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface KpiData {
  openJobs: number;
  totalCandidates: number;
  interviewsThisMonth: number;
  offerRate: number;
}

export default function Dashboard() {
  const [kpi, setKpi] = useState<KpiData>({
    openJobs: 0,
    totalCandidates: 0,
    interviewsThisMonth: 0,
    offerRate: 0,
  });
  const [funnelData, setFunnelData] = useState<Record<string, number>>({});
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const [jobsRes, candidatesRes, pipelineRes] = await Promise.all([
      supabase.from("jobs").select("*"),
      supabase.from("candidates").select("id"),
      supabase.from("pipeline").select("*, candidate:candidates(name), job:jobs(title)"),
    ]);

    const jobsList = (jobsRes.data || []) as Job[];
    const pipelineList = (pipelineRes.data || []) as Pipeline[];

    // KPI計算
    const openJobs = jobsList.filter((j) => j.status === "open").length;
    const totalCandidates = candidatesRes.data?.length || 0;
    const interviewStages = ["interview1", "interview_final"];
    const interviewsThisMonth = pipelineList.filter((p) =>
      interviewStages.includes(p.stage)
    ).length;
    const offerOrHired = pipelineList.filter(
      (p) => p.stage === "offer" || p.stage === "hired"
    ).length;
    const offerRate =
      pipelineList.length > 0
        ? Math.round((offerOrHired / pipelineList.length) * 100)
        : 0;

    setKpi({ openJobs, totalCandidates, interviewsThisMonth, offerRate });

    // ファネルデータ
    const funnel: Record<string, number> = {};
    STAGE_ORDER.forEach((s) => {
      funnel[s] = pipelineList.filter((p) => p.stage === s).length;
    });
    setFunnelData(funnel);
    setJobs(jobsList);
    setPipeline(pipelineList);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        読み込み中...
      </div>
    );
  }

  const kpiCards = [
    { label: "進行中の案件", value: kpi.openJobs, unit: "件", color: "bg-blue-500" },
    { label: "候補者数", value: kpi.totalCandidates, unit: "名", color: "bg-emerald-500" },
    { label: "面接進行中", value: kpi.interviewsThisMonth, unit: "名", color: "bg-amber-500" },
    { label: "内定率", value: kpi.offerRate, unit: "%", color: "bg-violet-500" },
  ];

  const chartData = {
    labels: STAGE_ORDER.map((s) => STAGE_LABELS[s]),
    datasets: [
      {
        label: "候補者数",
        data: STAGE_ORDER.map((s) => funnelData[s] || 0),
        backgroundColor: [
          "#94a3b8", "#60a5fa", "#38bdf8", "#818cf8", "#a78bfa", "#34d399",
        ],
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { stepSize: 1 } },
      y: { grid: { display: false } },
    },
  };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">
          ダッシュボード
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                {card.label}
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-gray-800">
                  {card.value}
                </span>
                <span className="text-sm text-gray-400 mb-1">{card.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              採用ファネル
            </h2>
            <div style={{ height: 260 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Job Status Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              案件ステータス
            </h2>
            <div className="space-y-3">
              {jobs.map((job) => {
                const count = pipeline.filter(
                  (p) => p.job_id === job.id && p.stage !== "rejected"
                ).length;
                const statusColor =
                  job.status === "open"
                    ? "bg-emerald-100 text-emerald-700"
                    : job.status === "paused"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-100 text-gray-500";
                const statusLabel =
                  job.status === "open" ? "募集中" : job.status === "paused" ? "一時停止" : "クローズ";
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="text-[13.5px] font-bold text-gray-700">
                        {job.title}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {job.department}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-gray-500">
                        {count}名
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-[15px] font-bold text-gray-700 mb-4">
            最近のアクティビティ
          </h2>
          <div className="space-y-2">
            {pipeline
              .sort(
                (a, b) =>
                  new Date(b.stage_changed_at).getTime() -
                  new Date(a.stage_changed_at).getTime()
              )
              .slice(0, 8)
              .map((p) => {
                const candidateName =
                  (p.candidate as unknown as { name: string })?.name || "不明";
                const jobTitle =
                  (p.job as unknown as { title: string })?.title || "不明";
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg text-[13px]"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-gray-700 font-semibold">
                      {candidateName}
                    </span>
                    <span className="text-gray-400">が</span>
                    <span className="text-gray-600">{jobTitle}</span>
                    <span className="text-gray-400">の</span>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded">
                      {STAGE_LABELS[p.stage as keyof typeof STAGE_LABELS] || p.stage}
                    </span>
                    <span className="text-gray-400">に進行</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

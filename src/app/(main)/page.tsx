"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, PipelineStage } from "@/lib/types";
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
  avgDaysToHire: number | null;
  hiredThisMonth: number;
  rejectedThisMonth: number;
  newAppsThisWeek: number;
}

export default function Dashboard() {
  const [kpi, setKpi] = useState<KpiData>({
    openJobs: 0,
    totalCandidates: 0,
    interviewsThisMonth: 0,
    offerRate: 0,
    avgDaysToHire: null,
    hiredThisMonth: 0,
    rejectedThisMonth: 0,
    newAppsThisWeek: 0,
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

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);

    // KPI計算
    const openJobs = jobsList.filter((j) => j.status === "open").length;
    const totalCandidates = candidatesRes.data?.length || 0;
    const interviewStages = ["interview1", "interview_final"];
    const interviewsThisMonth = pipelineList.filter(
      (p) => interviewStages.includes(p.stage) && new Date(p.stage_changed_at) >= thisMonthStart
    ).length;
    const offerOrHired = pipelineList.filter(
      (p) => p.stage === "offer" || p.stage === "hired"
    ).length;
    const offerRate =
      pipelineList.length > 0
        ? Math.round((offerOrHired / pipelineList.length) * 100)
        : 0;

    // 平均選考日数（応募→入社）
    const hiredPipelines = pipelineList.filter((p) => p.stage === "hired");
    let avgDaysToHire: number | null = null;
    if (hiredPipelines.length > 0) {
      const totalDays = hiredPipelines.reduce((sum, p) => {
        const days = Math.round(
          (new Date(p.stage_changed_at).getTime() - new Date(p.created_at).getTime()) / 86400000
        );
        return sum + days;
      }, 0);
      avgDaysToHire = Math.round(totalDays / hiredPipelines.length);
    }

    // 今月の入社・不合格
    const hiredThisMonth = pipelineList.filter(
      (p) => p.stage === "hired" && new Date(p.stage_changed_at) >= thisMonthStart
    ).length;
    const rejectedThisMonth = pipelineList.filter(
      (p) => p.stage === "rejected" && new Date(p.stage_changed_at) >= thisMonthStart
    ).length;

    // 今週の新規応募
    const newAppsThisWeek = pipelineList.filter(
      (p) => p.stage === "applied" && new Date(p.created_at) >= oneWeekAgo
    ).length;

    setKpi({
      openJobs,
      totalCandidates,
      interviewsThisMonth,
      offerRate,
      avgDaysToHire,
      hiredThisMonth,
      rejectedThisMonth,
      newAppsThisWeek,
    });

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
    { label: "進行中の案件", value: kpi.openJobs, unit: "件", color: "text-blue-600", icon: "💼" },
    { label: "候補者数", value: kpi.totalCandidates, unit: "名", color: "text-emerald-600", icon: "👥" },
    { label: "今月の面接", value: kpi.interviewsThisMonth, unit: "件", color: "text-violet-600", icon: "🎤" },
    { label: "内定率", value: kpi.offerRate, unit: "%", color: "text-amber-600", icon: "🎯" },
    { label: "平均選考日数", value: kpi.avgDaysToHire ?? "—", unit: kpi.avgDaysToHire ? "日" : "", color: "text-cyan-600", icon: "⏱️" },
    { label: "今月の入社", value: kpi.hiredThisMonth, unit: "名", color: "text-emerald-600", icon: "✅" },
    { label: "今月の不合格", value: kpi.rejectedThisMonth, unit: "名", color: "text-red-500", icon: "❌" },
    { label: "今週の新規応募", value: kpi.newAppsThisWeek, unit: "名", color: "text-blue-600", icon: "📩" },
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

  // 求人別の進捗
  const jobProgress = jobs.filter((j) => j.status === "open").map((job) => {
    const jobPipeline = pipeline.filter((p) => p.job_id === job.id);
    const stages: Record<string, number> = {};
    STAGE_ORDER.forEach((s) => {
      stages[s] = jobPipeline.filter((p) => p.stage === s).length;
    });
    const rejected = jobPipeline.filter((p) => p.stage === "rejected").length;
    return { job, stages, rejected, total: jobPipeline.length };
  });

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">
          🏠 ダッシュボード
        </h1>

        {/* KPI Cards - 2行4列 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {card.label}
                </div>
                <span className="text-[18px]">{card.icon}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className={`text-2xl font-extrabold ${card.color}`}>
                  {card.value}
                </span>
                <span className="text-[12px] text-gray-400 mb-0.5">{card.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              📊 採用ファネル
            </h2>
            <div style={{ height: 260 }}>
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Job Progress */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              💼 案件別進捗
            </h2>
            <div className="space-y-4">
              {jobProgress.map(({ job, stages, total }) => (
                <div key={job.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] font-bold text-gray-700">{job.title}</span>
                    <span className="text-[11px] text-gray-400">{total}名</span>
                  </div>
                  <div className="flex h-5 rounded-full overflow-hidden bg-gray-100">
                    {STAGE_ORDER.map((stage) => {
                      const count = stages[stage] || 0;
                      if (count === 0 || total === 0) return null;
                      const pct = (count / total) * 100;
                      const colors: Record<string, string> = {
                        applied: "bg-gray-400",
                        screening: "bg-blue-400",
                        interview1: "bg-sky-400",
                        interview_final: "bg-violet-400",
                        offer: "bg-amber-400",
                        hired: "bg-emerald-400",
                      };
                      return (
                        <div
                          key={stage}
                          className={`${colors[stage] || "bg-gray-300"} relative group`}
                          style={{ width: `${pct}%` }}
                          title={`${STAGE_LABELS[stage]}: ${count}名`}
                        >
                          {pct > 15 && (
                            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {jobProgress.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-[12px]">進行中の案件がありません</div>
              )}
            </div>
            {/* 凡例 */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
              {STAGE_ORDER.map((stage) => {
                const colors: Record<string, string> = {
                  applied: "bg-gray-400",
                  screening: "bg-blue-400",
                  interview1: "bg-sky-400",
                  interview_final: "bg-violet-400",
                  offer: "bg-amber-400",
                  hired: "bg-emerald-400",
                };
                return (
                  <div key={stage} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors[stage]}`} />
                    <span className="text-[9px] text-gray-500">{STAGE_LABELS[stage]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
          <h2 className="text-[15px] font-bold text-gray-700 mb-4">
            🕐 最近のアクティビティ
          </h2>
          <div className="space-y-2">
            {pipeline
              .sort(
                (a, b) =>
                  new Date(b.stage_changed_at).getTime() -
                  new Date(a.stage_changed_at).getTime()
              )
              .slice(0, 10)
              .map((p) => {
                const candidateName =
                  (p.candidate as unknown as { name: string })?.name || "不明";
                const jobTitle =
                  (p.job as unknown as { title: string })?.title || "不明";
                const stageIcon: Record<string, string> = {
                  applied: "📩",
                  screening: "📄",
                  interview1: "🎤",
                  interview_final: "🎤",
                  offer: "🎉",
                  hired: "✅",
                  rejected: "❌",
                };
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors text-[13px]"
                  >
                    <span className="text-[16px]">{stageIcon[p.stage] || "📋"}</span>
                    <span className="text-gray-700 font-semibold">
                      {candidateName}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600">{jobTitle}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.stage === "hired" ? "bg-emerald-100 text-emerald-700" :
                      p.stage === "rejected" ? "bg-red-100 text-red-600" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {STAGE_LABELS[p.stage as PipelineStage] || p.stage}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400">
                      {new Date(p.stage_changed_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

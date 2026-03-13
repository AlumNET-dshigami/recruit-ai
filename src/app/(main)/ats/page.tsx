"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate, PipelineStage } from "@/lib/types";
import CandidateRegisterModal from "@/components/CandidateRegisterModal";
import CandidateDetailModal from "@/components/CandidateDetailModal";

export default function AtsPage() {
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const loadData = useCallback(async () => {
    const [jobsRes, pipelineRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at"),
      supabase.from("pipeline").select("*, candidate:candidates(*), job:jobs(title)"),
    ]);
    setJobs((jobsRes.data || []) as Job[]);
    setPipeline((pipelineRes.data || []) as Pipeline[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = pipeline
    .filter((p) => selectedJobId === "all" || p.job_id === selectedJobId)
    .filter((p) => selectedStage === "all" || p.stage === selectedStage);

  const stageStyles: Record<string, string> = {
    applied: "bg-gray-100 text-gray-600",
    screening: "bg-blue-100 text-blue-700",
    interview1: "bg-sky-100 text-sky-700",
    interview_final: "bg-violet-100 text-violet-700",
    offer: "bg-amber-100 text-amber-700",
    hired: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">👥 選考管理</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">候補者をクリックして詳細・AIサポートを実行</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
            >
              <option value="all">全ステージ</option>
              <option value="applied">応募受付</option>
              <option value="screening">書類選考</option>
              <option value="interview1">1次面接</option>
              <option value="interview_final">最終面接</option>
              <option value="offer">内定</option>
              <option value="hired">入社</option>
              <option value="rejected">不合格</option>
            </select>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
            >
              <option value="all">全案件</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <button
              onClick={() => setShowRegister(true)}
              className="text-[12px] font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              ➕ 候補者登録
            </button>
            <Link
              href="/ats/import"
              className="text-[12px] font-bold text-primary bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors no-underline"
            >
              📥 CSV取込
            </Link>
            <Link
              href="/ats/pipeline"
              className="text-[12px] font-bold text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors no-underline"
            >
              📋 カンバン表示
            </Link>
          </div>
        </div>

        {/* Candidate Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-5 py-3">候補者</th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-3">案件</th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-3">ステージ</th>
                <th className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-3">AIスコア</th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-3">ソース</th>
                <th className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-3">更新日</th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .sort((a, b) => new Date(b.stage_changed_at).getTime() - new Date(a.stage_changed_at).getTime())
                .map((p) => {
                  const c = p.candidate as Candidate | undefined;
                  const j = p.job as unknown as { title: string } | undefined;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPipeline(p)}
                      className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-[13.5px] font-bold text-gray-800">{c?.name || "不明"}</div>
                        <div className="text-[11px] text-gray-400">{c?.current_company} {c?.current_position}</div>
                      </td>
                      <td className="px-3 py-3.5 text-[12.5px] text-gray-600">{j?.title}</td>
                      <td className="px-3 py-3.5">
                        <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${stageStyles[p.stage] || "bg-gray-100 text-gray-500"}`}>
                          {STAGE_LABELS[p.stage as PipelineStage] || p.stage}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        {p.score ? (
                          <span className={`text-[12px] font-extrabold ${
                            p.score >= 80 ? "text-emerald-600" : p.score >= 60 ? "text-amber-600" : "text-red-500"
                          }`}>{p.score}</span>
                        ) : (
                          <span className="text-[11px] text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-[12px] text-gray-500">{c?.source}</td>
                      <td className="px-3 py-3.5 text-[11px] text-gray-400">
                        {new Date(p.stage_changed_at).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-[13px]">候補者がいません</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPipeline && (
        <CandidateDetailModal
          pipeline={selectedPipeline}
          onClose={() => setSelectedPipeline(null)}
          onUpdated={() => loadData()}
        />
      )}

      {/* Register Modal */}
      {showRegister && (
        <CandidateRegisterModal
          jobs={jobs}
          onClose={() => setShowRegister(false)}
          onRegistered={() => loadData()}
        />
      )}
    </div>
  );
}

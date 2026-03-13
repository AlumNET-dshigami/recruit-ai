"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate, PipelineStage } from "@/lib/types";

export default function ComparePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [jobsRes, pipelineRes] = await Promise.all([
        supabase.from("jobs").select("*").order("created_at"),
        supabase.from("pipeline").select("*, candidate:candidates(*), job:jobs(title)"),
      ]);
      const jobsList = (jobsRes.data || []) as Job[];
      setJobs(jobsList);
      setPipeline((pipelineRes.data || []) as Pipeline[]);
      if (jobsList.length > 0) setSelectedJobId(jobsList[0].id);
      setLoading(false);
    }
    load();
  }, []);

  // 選考中の候補者（rejected除外）
  const filtered = pipeline
    .filter((p) => p.job_id === selectedJobId && p.stage !== "rejected" && p.stage !== "hired")
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // 入社済み・辞退者（同じ求人の過去データ）
  const hiredOrDeclined = pipeline
    .filter((p) => p.job_id === selectedJobId && (p.stage === "hired" || p.stage === "rejected"))
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  const maxScore = Math.max(...filtered.map((p) => p.score || 0), 1);

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">📊 候補者比較</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">同一求人の候補者をスコア・スキル・経験で横並び比較</p>
          </div>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
          >
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📊</div>
            <div className="text-[14px]">この求人にはまだ候補者がいません</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              {filtered.map((p, idx) => {
                const c = p.candidate as Candidate | undefined;
                const scorePercent = p.score ? (p.score / maxScore) * 100 : 0;
                const stageStyles: Record<string, string> = {
                  applied: "bg-gray-100 text-gray-600",
                  screening: "bg-blue-100 text-blue-700",
                  interview1: "bg-sky-100 text-sky-700",
                  interview_final: "bg-violet-100 text-violet-700",
                  offer: "bg-amber-100 text-amber-700",
                  hired: "bg-emerald-100 text-emerald-700",
                };
                return (
                  <div key={p.id} className={`w-[240px] bg-white rounded-xl shadow-sm border ${idx === 0 ? "border-emerald-200 ring-2 ring-emerald-100" : "border-gray-100"} shrink-0`}>
                    {/* Rank Badge */}
                    {idx < 3 && (
                      <div className={`text-center py-1.5 text-[11px] font-bold rounded-t-xl ${
                        idx === 0 ? "bg-emerald-500 text-white" : idx === 1 ? "bg-blue-500 text-white" : "bg-amber-500 text-white"
                      }`}>
                        {idx === 0 ? "🥇 1位" : idx === 1 ? "🥈 2位" : "🥉 3位"}
                      </div>
                    )}

                    <div className="p-4">
                      {/* Name & Score */}
                      <div className="text-center mb-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-[18px] mx-auto mb-2">
                          {c?.name?.charAt(0) || "?"}
                        </div>
                        <div className="text-[14px] font-bold text-gray-800">{c?.name}</div>
                        <div className="text-[11px] text-gray-400">{c?.current_company}</div>
                      </div>

                      {/* Score Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-gray-400">AIスコア</span>
                          <span className={`text-[14px] font-extrabold ${
                            (p.score || 0) >= 80 ? "text-emerald-600" : (p.score || 0) >= 60 ? "text-amber-600" : "text-red-500"
                          }`}>{p.score || "—"}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (p.score || 0) >= 80 ? "bg-emerald-500" : (p.score || 0) >= 60 ? "bg-amber-500" : "bg-red-400"
                            }`}
                            style={{ width: `${scorePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-gray-400">ステージ</span>
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${stageStyles[p.stage] || "bg-gray-100"}`}>
                            {STAGE_LABELS[p.stage as PipelineStage]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">経験年数</span>
                          <span className="font-semibold text-gray-700">{c?.experience_years}年</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">ポジション</span>
                          <span className="font-semibold text-gray-700 text-right max-w-[120px] truncate">{c?.current_position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">ソース</span>
                          <span className="font-semibold text-gray-700">{c?.source}</span>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-[10px] font-bold text-gray-400 mb-1.5">スキル</div>
                        <div className="flex flex-wrap gap-1">
                          {c?.skills?.map((s) => (
                            <span key={s} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* AI Summary */}
                      {p.ai_summary && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-[10px] font-bold text-gray-400 mb-1">AI評価</div>
                          <div className="text-[10px] text-gray-500 leading-relaxed line-clamp-3">{p.ai_summary}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ⑦ 入社者・不合格/辞退者 */}
        {hiredOrDeclined.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[15px] font-bold text-gray-600 mb-4">
              📁 過去の入社者・不合格/辞退者
            </h2>
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {hiredOrDeclined.map((p) => {
                  const c = p.candidate as Candidate | undefined;
                  const isHired = p.stage === "hired";
                  return (
                    <div key={p.id} className={`w-[240px] rounded-xl shadow-sm border shrink-0 ${
                      isHired ? "bg-gray-50 border-emerald-200" : "bg-pink-50/50 border-pink-200"
                    }`}>
                      <div className={`text-center py-1.5 text-[11px] font-bold rounded-t-xl ${
                        isHired ? "bg-emerald-600 text-white" : "bg-pink-400 text-white"
                      }`}>
                        {isHired ? "✅ 入社済み" : "❌ 不合格/辞退"}
                      </div>
                      <div className="p-4">
                        <div className="text-center mb-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-[18px] mx-auto mb-2 ${
                            isHired ? "bg-emerald-400" : "bg-pink-300"
                          }`}>
                            {c?.name?.charAt(0) || "?"}
                          </div>
                          <div className="text-[14px] font-bold text-gray-800">{c?.name}</div>
                          <div className="text-[11px] text-gray-400">{c?.current_company}</div>
                        </div>
                        {p.score && (
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-gray-400">AIスコア</span>
                            <span className={`text-[14px] font-extrabold ${
                              p.score >= 80 ? "text-emerald-600" : p.score >= 60 ? "text-amber-600" : "text-red-500"
                            }`}>{p.score}</span>
                          </div>
                        )}
                        <div className="space-y-2 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">経験年数</span>
                            <span className="font-semibold text-gray-700">{c?.experience_years}年</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">ソース</span>
                            <span className="font-semibold text-gray-700">{c?.source}</span>
                          </div>
                        </div>
                        {c?.skills && c.skills.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex flex-wrap gap-1">
                              {c.skills.map((s) => (
                                <span key={s} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

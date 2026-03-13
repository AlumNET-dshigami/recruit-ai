"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Pipeline, Job, Candidate } from "@/lib/types";

export default function TalentPoolPage() {
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMatching, setAiMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<string>("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

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

  // rejected / 辞退 候補者 = タレントプール
  const poolCandidates = pipeline.filter((p) => p.stage === "rejected");

  // 重複排除（同一候補者が複数案件で不合格のケース）
  const uniquePool: Pipeline[] = [];
  const seenIds = new Set<string>();
  poolCandidates.forEach((p) => {
    if (!seenIds.has(p.candidate_id)) {
      seenIds.add(p.candidate_id);
      uniquePool.push(p);
    }
  });

  const openJobs = jobs.filter((j) => j.status === "open");

  async function runMatching(p: Pipeline) {
    const c = p.candidate as Candidate | undefined;
    setSelectedCandidateId(p.candidate_id);
    setAiMatching(true);
    setMatchResult("");

    const jobList = openJobs.map((j) => `- ${j.title}（${j.department}）: ${j.requirements}`).join("\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の候補者と現在募集中のポジションのマッチングを行ってください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\n職務経歴: ${c?.resume_text?.slice(0, 500)}\n前回スコア: ${p.score || "未評価"}\n\n【募集中ポジション一覧】\n${jobList}\n\n各ポジションとの適合度を%で評価し、最も適合するポジションを推薦してください。\n推薦理由と、前回不合格だった点を踏まえた懸念点・改善ポイントも述べてください。`,
          systemPrompt: "あなたはタレントマッチングの専門家です。候補者の経歴・スキルと求人要件を照合し、最適なマッチングを提案してください。",
        }),
      });
      const data = await res.json();
      setMatchResult(data.text || "マッチング結果を取得できませんでした");
    } finally {
      setAiMatching(false);
    }
  }

  async function reactivateCandidate(p: Pipeline, jobId: string) {
    await supabase.from("pipeline").insert([{
      job_id: jobId,
      candidate_id: p.candidate_id,
      stage: "applied",
      stage_changed_at: new Date().toISOString(),
      notes: "タレントプールから再エントリー",
    }]);
    loadData();
    setMatchResult("");
    setSelectedCandidateId(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-800">🏊 タレントプール</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            過去の不合格・辞退者を保持し、新しい求人とAIマッチング
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{uniquePool.length}</div>
            <div className="text-[12px] text-gray-400 font-bold mt-1">プール人数</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-blue-600">{openJobs.length}</div>
            <div className="text-[12px] text-gray-400 font-bold mt-1">募集中の求人</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">
              {uniquePool.filter((p) => (p.score || 0) >= 60).length}
            </div>
            <div className="text-[12px] text-gray-400 font-bold mt-1">スコア60以上</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pool List */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-4 py-3">候補者</th>
                    <th className="text-left text-[11px] font-bold text-gray-400 uppercase px-3 py-3">前回の案件</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">スコア</th>
                    <th className="text-center text-[11px] font-bold text-gray-400 uppercase px-3 py-3">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {uniquePool.map((p) => {
                    const c = p.candidate as Candidate | undefined;
                    const j = p.job as unknown as { title: string } | undefined;
                    return (
                      <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-[13px] font-bold text-gray-800">{c?.name}</div>
                          <div className="text-[10px] text-gray-400">{c?.current_company} / {c?.skills?.slice(0, 3).join(", ")}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-gray-500">{j?.title}</td>
                        <td className="px-3 py-3 text-center">
                          {p.score ? (
                            <span className={`text-[12px] font-bold ${p.score >= 60 ? "text-amber-600" : "text-gray-400"}`}>{p.score}</span>
                          ) : <span className="text-[11px] text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => runMatching(p)}
                            disabled={aiMatching}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            🤖 AIマッチング
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {uniquePool.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-[13px]">
                  タレントプールは空です（不合格/辞退の候補者がここに表示されます）
                </div>
              )}
            </div>
          </div>

          {/* Matching Result */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-6">
              <h3 className="text-[14px] font-bold text-gray-700 mb-3">🤖 マッチング結果</h3>
              {aiMatching && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2 animate-pulse">🔍</div>
                  <div className="text-[12px]">AIがマッチング中...</div>
                </div>
              )}
              {!aiMatching && !matchResult && (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">🏊</div>
                  <div className="text-[12px]">候補者の「AIマッチング」を<br />クリックしてください</div>
                </div>
              )}
              {!aiMatching && matchResult && (
                <>
                  <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto mb-4">
                    {matchResult}
                  </div>
                  {selectedCandidateId && openJobs.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 mb-2">再エントリー先を選択:</div>
                      <div className="space-y-1.5">
                        {openJobs.map((j) => (
                          <button
                            key={j.id}
                            onClick={() => {
                              const p = uniquePool.find((p) => p.candidate_id === selectedCandidateId);
                              if (p) reactivateCandidate(p, j.id);
                            }}
                            className="w-full text-left text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            → {j.title}に再エントリー
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

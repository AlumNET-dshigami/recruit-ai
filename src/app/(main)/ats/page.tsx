"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Job, Candidate, AiLog, PipelineStage } from "@/lib/types";
import CandidateRegisterModal from "@/components/CandidateRegisterModal";

export default function AtsPage() {
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState("all");
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
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

  const filtered = selectedJobId === "all"
    ? pipeline
    : pipeline.filter((p) => p.job_id === selectedJobId);

  async function openDetail(p: Pipeline) {
    setSelectedPipeline(p);
    const { data } = await supabase
      .from("ai_logs").select("*")
      .eq("pipeline_id", p.id)
      .order("created_at", { ascending: false });
    setAiLogs((data || []) as AiLog[]);
  }

  async function runAiAction(actionType: string, prompt: string) {
    if (!selectedPipeline) return;
    setAiLoading(true);
    const systemPrompts: Record<string, string> = {
      screening: "あなたは2026年のスキルベース採用に精通した書類選考AIです。候補者の経歴・スキルを多角的に評価し、0-100点のスコアと詳細フィードバックを返してください。",
      interview_questions: "あなたは構造化面接設計の専門家です。候補者の経歴に基づいたパーソナライズド質問を生成してください。",
      offer_letter: "あなたは人事・法務に精通したオファーレター作成のプロです。",
      judgment: "あなたは構造化面接評価の専門家です。面接データをもとに合否判定と根拠を提示してください。",
      schedule: "あなたは採用面接の日程調整アシスタントです。候補者と面接官の都合を考慮した日程案を提示してください。",
      prep: "あなたは面接準備支援AIです。候補者の経歴に基づいた面接の事前準備資料を作成してください。",
    };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemPrompt: systemPrompts[actionType] || "あなたは採用・人事エキスパートです。",
        }),
      });
      const data = await res.json();
      const result = data.text || data.error || "エラー";

      await supabase.from("ai_logs").insert([{
        pipeline_id: selectedPipeline.id,
        action_type: actionType,
        prompt,
        result,
      }]);

      if (actionType === "screening") {
        const scoreMatch = result.match(/(\d{1,3})\s*[点\/]/);
        if (scoreMatch) {
          await supabase.from("pipeline")
            .update({ score: parseInt(scoreMatch[1]), ai_summary: result.slice(0, 200) })
            .eq("id", selectedPipeline.id);
        }
      }

      const { data: logsData } = await supabase
        .from("ai_logs").select("*")
        .eq("pipeline_id", selectedPipeline.id)
        .order("created_at", { ascending: false });
      setAiLogs((logsData || []) as AiLog[]);
      loadData();
    } finally {
      setAiLoading(false);
    }
  }

  function getAiActions(p: Pipeline) {
    const c = p.candidate as Candidate | undefined;
    const j = p.job as unknown as { title: string } | undefined;
    const actions: { label: string; icon: string; type: string; prompt: string; color: string }[] = [];

    if (p.stage === "applied" || p.stage === "screening") {
      actions.push({
        label: "AI書類選考", icon: "📄", type: "screening", color: "bg-blue-500",
        prompt: `以下の候補者の書類選考を実施してください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\n\n【職務経歴】\n${c?.resume_text}\n\n【募集ポジション】${j?.title}\n\n総合評価スコア(0-100点)と詳細評価を出してください。`,
      });
    }
    if (p.stage === "screening" || p.stage === "interview1") {
      actions.push({
        label: "日程調整案", icon: "📅", type: "schedule", color: "bg-emerald-500",
        prompt: `以下の候補者の面接日程案を3パターン提示してください。\n\n【候補者】${c?.name}（${c?.current_company}）\n【ポジション】${j?.title}\n\n候補者が在職中であることを考慮し、平日夜間・土曜日を含めてください。オンライン/対面のオプションも提示してください。`,
      });
    }
    if (p.stage === "interview1" || p.stage === "interview_final") {
      actions.push({
        label: "面接準備資料", icon: "📋", type: "prep", color: "bg-amber-500",
        prompt: `以下の候補者の面接準備資料を作成してください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\n\n【ポジション】${j?.title}\n\n面接官向けに、確認すべきポイント・深掘り質問・注意事項をまとめてください。`,
      });
      actions.push({
        label: "面接質問生成", icon: "🎤", type: "interview_questions", color: "bg-violet-500",
        prompt: `以下のポジション・候補者に対する${p.stage === "interview_final" ? "最終" : "1次"}面接の質問を生成してください。\n\n【ポジション】${j?.title}\n【候補者】${c?.name}（${c?.current_company} ${c?.current_position}、${c?.experience_years}年経験）\nスキル: ${c?.skills?.join(", ")}`,
      });
    }
    if (p.stage === "interview_final") {
      actions.push({
        label: "合否判定AI", icon: "⚖️", type: "judgment", color: "bg-rose-500",
        prompt: `以下の候補者の合否判定を行ってください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\nAIスコア: ${p.score || "未評価"}\n\n【ポジション】${j?.title}\n\n合格/不合格/保留の判定と、その根拠を詳しく述べてください。`,
      });
    }
    if (p.stage === "offer") {
      actions.push({
        label: "オファーレター", icon: "💌", type: "offer_letter", color: "bg-pink-500",
        prompt: `以下の候補者へのオファーレターを生成してください。\n\n【候補者名】${c?.name}\n【ポジション】${j?.title}\n【入社予定日】2026年4月1日`,
      });
    }
    return actions;
  }

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

  const candidate = selectedPipeline?.candidate as Candidate | undefined;

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">👥 選考管理</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">候補者をクリックしてAIサポートを実行</p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
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
                      onClick={() => openDetail(p)}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedPipeline(null)}>
          <div className="bg-white rounded-2xl w-[740px] max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{candidate?.name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageStyles[selectedPipeline.stage]}`}>
                  {STAGE_LABELS[selectedPipeline.stage]}
                </span>
              </div>
              <button onClick={() => setSelectedPipeline(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-5">
              {/* Profile */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">現職</div>
                  <div className="text-[13px] text-gray-700">{candidate?.current_company}<br/>{candidate?.current_position}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">経験年数</div>
                  <div className="text-[13px] text-gray-700">{candidate?.experience_years}年</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">ソース</div>
                  <div className="text-[13px] text-gray-700">{candidate?.source}</div>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-5">
                <div className="text-[10px] font-bold text-gray-400 mb-1.5">スキル</div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate?.skills?.map((s) => (
                    <span key={s} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>

              {/* AI Actions */}
              <div className="mb-5">
                <h3 className="text-[13px] font-bold text-gray-700 mb-3">🤖 AIサポート</h3>
                <div className="grid grid-cols-2 gap-2">
                  {getAiActions(selectedPipeline).map((action) => (
                    <button
                      key={action.type}
                      onClick={() => runAiAction(action.type, action.prompt)}
                      disabled={aiLoading}
                      className={`text-[12px] font-bold px-4 py-3 rounded-xl text-white transition-all ${
                        aiLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-md"
                      } ${action.color}`}
                    >
                      {aiLoading ? "⏳ 実行中..." : `${action.icon} ${action.label}`}
                    </button>
                  ))}
                  {getAiActions(selectedPipeline).length === 0 && (
                    <span className="text-[12px] text-gray-400 col-span-2">このステージで利用可能なAIアクションはありません</span>
                  )}
                </div>
              </div>

              {/* AI Logs */}
              {aiLogs.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-gray-700 mb-3">📝 AI実行ログ</h3>
                  <div className="space-y-3">
                    {aiLogs.map((log) => (
                      <div key={log.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">{log.action_type}</span>
                          <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString("ja-JP")}</span>
                        </div>
                        <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">{log.result}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
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

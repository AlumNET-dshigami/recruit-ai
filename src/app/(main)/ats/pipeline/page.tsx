"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  STAGE_ORDER,
  STAGE_LABELS,
  type Pipeline,
  type Job,
  type Candidate,
  type AiLog,
  type PipelineStage,
} from "@/lib/types";

export default function PipelinePage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [jobsRes, pipelineRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at"),
      supabase.from("pipeline").select("*, candidate:candidates(*), job:jobs(title)"),
    ]);
    setJobs((jobsRes.data || []) as Job[]);
    setPipeline((pipelineRes.data || []) as Pipeline[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function moveStage(pipelineId: string, newStage: PipelineStage) {
    await supabase
      .from("pipeline")
      .update({ stage: newStage, stage_changed_at: new Date().toISOString() })
      .eq("id", pipelineId);
    loadData();
    if (selectedPipeline?.id === pipelineId) {
      setSelectedPipeline((prev) =>
        prev ? { ...prev, stage: newStage } : null
      );
    }
  }

  async function rejectCandidate(pipelineId: string) {
    await supabase
      .from("pipeline")
      .update({ stage: "rejected", stage_changed_at: new Date().toISOString() })
      .eq("id", pipelineId);
    loadData();
    setSelectedPipeline(null);
  }

  async function openDetail(p: Pipeline) {
    setSelectedPipeline(p);
    const { data } = await supabase
      .from("ai_logs")
      .select("*")
      .eq("pipeline_id", p.id)
      .order("created_at", { ascending: false });
    setAiLogs((data || []) as AiLog[]);
  }

  async function runAiAction(actionType: string, prompt: string) {
    if (!selectedPipeline) return;
    setAiLoading(true);

    const systemPrompts: Record<string, string> = {
      screening: "あなたは2026年のスキルベース採用に精通した書類選考AIです。",
      interview_questions: "あなたは構造化面接設計の専門家です。",
      offer_letter: "あなたは人事・法務に精通したオファーレター作成のプロです。",
      judgment: "あなたは構造化面接評価の専門家です。",
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

      // ログ保存
      await supabase.from("ai_logs").insert([
        {
          pipeline_id: selectedPipeline.id,
          action_type: actionType,
          prompt,
          result,
        },
      ]);

      // スコア更新（スクリーニング時）
      if (actionType === "screening") {
        const scoreMatch = result.match(/(\d{1,3})\s*[点\/]/);
        if (scoreMatch) {
          await supabase
            .from("pipeline")
            .update({ score: parseInt(scoreMatch[1]), ai_summary: result.slice(0, 200) })
            .eq("id", selectedPipeline.id);
        }
      }

      // ログ再取得
      const { data: logsData } = await supabase
        .from("ai_logs")
        .select("*")
        .eq("pipeline_id", selectedPipeline.id)
        .order("created_at", { ascending: false });
      setAiLogs((logsData || []) as AiLog[]);
      loadData();
    } finally {
      setAiLoading(false);
    }
  }

  const filtered =
    selectedJobId === "all"
      ? pipeline
      : pipeline.filter((p) => p.job_id === selectedJobId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        読み込み中...
      </div>
    );
  }

  const candidate = selectedPipeline?.candidate as Candidate | undefined;

  // ステージに応じたAIアクション
  function getAiActions(p: Pipeline) {
    const c = p.candidate as Candidate | undefined;
    const j = p.job as unknown as { title: string } | undefined;
    const actions: { label: string; type: string; prompt: string }[] = [];

    if (p.stage === "applied" || p.stage === "screening") {
      actions.push({
        label: "AIスクリーニング",
        type: "screening",
        prompt: `以下の候補者の書類選考を実施してください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\n\n【職務経歴】\n${c?.resume_text}\n\n【募集ポジション】${j?.title}\n\n総合評価スコア(0-100点)と詳細評価を出してください。`,
      });
    }
    if (p.stage === "interview1" || p.stage === "interview_final") {
      actions.push({
        label: "面接質問生成",
        type: "interview_questions",
        prompt: `以下のポジション・候補者に対する${p.stage === "interview_final" ? "最終" : "1次"}面接の質問を生成してください。\n\n【ポジション】${j?.title}\n【候補者】${c?.name}（${c?.current_company} ${c?.current_position}、${c?.experience_years}年経験）\nスキル: ${c?.skills?.join(", ")}`,
      });
    }
    if (p.stage === "offer") {
      actions.push({
        label: "オファーレター生成",
        type: "offer_letter",
        prompt: `以下の候補者へのオファーレターを生成してください。\n\n【候補者名】${c?.name}\n【ポジション】${j?.title}\n【入社予定日】2026年4月1日`,
      });
    }
    return actions;
  }

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-gray-800">
          候補者パイプライン
        </h1>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
        >
          <option value="all">全案件</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
        {STAGE_ORDER.map((stage) => {
          const items = filtered.filter((p) => p.stage === stage);
          return (
            <div
              key={stage}
              className="flex-1 min-w-[180px] bg-gray-50 rounded-xl p-3"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  {STAGE_LABELS[stage]}
                </h3>
                <span className="text-[11px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((p) => {
                  const c = p.candidate as Candidate | undefined;
                  const j = p.job as unknown as { title: string } | undefined;
                  const nextStage =
                    STAGE_ORDER[STAGE_ORDER.indexOf(stage) + 1] || null;
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => openDetail(p)}
                    >
                      <div className="text-[13px] font-bold text-gray-700 mb-1">
                        {c?.name || "不明"}
                      </div>
                      <div className="text-[11px] text-gray-400 mb-2">
                        {j?.title}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {p.score && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.score >= 80
                                ? "bg-emerald-100 text-emerald-700"
                                : p.score >= 60
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.score}点
                          </span>
                        )}
                        <span className="text-[10px] text-gray-300">
                          {c?.source}
                        </span>
                      </div>
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {nextStage && (
                          <button
                            onClick={() => moveStage(p.id, nextStage)}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                          >
                            → 次へ
                          </button>
                        )}
                        <button
                          onClick={() => rejectCandidate(p.id)}
                          className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Candidate Detail Modal */}
      {selectedPipeline && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setSelectedPipeline(null)}
        >
          <div
            className="bg-white rounded-2xl w-full md:w-[700px] max-h-[85vh] overflow-y-auto shadow-xl mx-4 md:mx-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {candidate?.name}
              </h2>
              <button
                onClick={() => setSelectedPipeline(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Profile */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-1">
                    現職
                  </div>
                  <div className="text-[13px] text-gray-700">
                    {candidate?.current_company} / {candidate?.current_position}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-1">
                    経験年数
                  </div>
                  <div className="text-[13px] text-gray-700">
                    {candidate?.experience_years}年
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-1">
                    ソース
                  </div>
                  <div className="text-[13px] text-gray-700">
                    {candidate?.source}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-gray-400 mb-1">
                    スキル
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {candidate?.skills?.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Actions */}
              <div className="mb-6">
                <h3 className="text-[13px] font-bold text-gray-600 mb-3">
                  AIアクション
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getAiActions(selectedPipeline).map((action) => (
                    <button
                      key={action.type}
                      onClick={() => runAiAction(action.type, action.prompt)}
                      disabled={aiLoading}
                      className={`text-[12px] font-bold px-4 py-2 rounded-lg transition-colors ${
                        aiLoading
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary-dark"
                      }`}
                    >
                      {aiLoading ? "実行中..." : `🤖 ${action.label}`}
                    </button>
                  ))}
                  {getAiActions(selectedPipeline).length === 0 && (
                    <span className="text-[12px] text-gray-400">
                      このステージで利用可能なAIアクションはありません
                    </span>
                  )}
                </div>
              </div>

              {/* AI Logs */}
              {aiLogs.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-bold text-gray-600 mb-3">
                    AI実行ログ
                  </h3>
                  <div className="space-y-3">
                    {aiLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-100"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                            {log.action_type}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.created_at).toLocaleString("ja-JP")}
                          </span>
                        </div>
                        <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                          {log.result}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

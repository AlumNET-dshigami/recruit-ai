"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS, INTERVIEW_TYPE_LABELS } from "@/lib/types";
import type { Pipeline, Candidate, AiLog, InterviewRecord, PipelineStage } from "@/lib/types";

interface Props {
  pipeline: Pipeline;
  onClose: () => void;
  onUpdated: () => void;
}

type Tab = "profile" | "interviews" | "ai_logs";

const STAGE_ORDER: PipelineStage[] = ["applied", "screening", "interview1", "interview_final", "offer", "hired"];

export default function CandidateDetailModal({ pipeline, onClose, onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    interview_type: "interview1",
    interviewer_name: "",
    interview_date: new Date().toISOString().split("T")[0],
    transcript: "",
    notes: "",
    rating: "",
  });
  const [hasInterviewTable, setHasInterviewTable] = useState(true);

  const candidate = pipeline.candidate as Candidate | undefined;
  const jobTitle = (pipeline.job as unknown as { title: string })?.title || "";

  useEffect(() => {
    loadLogs();
    loadInterviews();
  }, [pipeline.id]);

  async function loadLogs() {
    const { data } = await supabase
      .from("ai_logs").select("*")
      .eq("pipeline_id", pipeline.id)
      .order("created_at", { ascending: false });
    setAiLogs((data || []) as AiLog[]);
  }

  async function loadInterviews() {
    const { data, error } = await supabase
      .from("interview_records").select("*")
      .eq("pipeline_id", pipeline.id)
      .order("interview_date", { ascending: false });
    if (error && error.code === "42P01") {
      setHasInterviewTable(false);
    } else {
      setInterviews((data || []) as InterviewRecord[]);
    }
  }

  async function saveInterview() {
    if (!interviewForm.interviewer_name.trim()) return;
    await supabase.from("interview_records").insert([{
      pipeline_id: pipeline.id,
      interview_type: interviewForm.interview_type,
      interviewer_name: interviewForm.interviewer_name.trim(),
      interview_date: interviewForm.interview_date,
      transcript: interviewForm.transcript.trim(),
      notes: interviewForm.notes.trim(),
      rating: interviewForm.rating ? parseInt(interviewForm.rating) : null,
    }]);
    setShowAddInterview(false);
    setInterviewForm({
      interview_type: "interview1", interviewer_name: "", interview_date: new Date().toISOString().split("T")[0],
      transcript: "", notes: "", rating: "",
    });
    loadInterviews();
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".srt") || file.name.endsWith(".vtt")) {
      const text = await file.text();
      setInterviewForm((f) => ({ ...f, transcript: text }));
    }
  }

  async function runAi(actionType: string, prompt: string) {
    setAiLoading(true);
    const systemPrompts: Record<string, string> = {
      screening: "あなたは2026年のスキルベース採用に精通した書類選考AIです。",
      interview_questions: "あなたは構造化面接設計の専門家です。候補者の経歴に基づいたパーソナライズド質問を生成してください。",
      judgment: "あなたは構造化面接評価の専門家です。面接データ・文字起こしをもとに合否判定と根拠を詳細に提示してください。合格/保留/不合格の判定、スコア(0-100)、強み・懸念点・推奨アクションを含めてください。",
      handover: "あなたは採用プロセスの申し送り・引継ぎ文書作成の専門家です。次の面接官や意思決定者に向けた、簡潔かつ必要十分な申し送り事項を作成してください。",
      offer_letter: "あなたは人事・法務に精通したオファーレター作成のプロです。",
      schedule: "あなたは採用面接の日程調整アシスタントです。",
      prep: "あなたは面接準備支援AIです。",
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
        pipeline_id: pipeline.id,
        action_type: actionType,
        prompt,
        result,
      }]);

      if (actionType === "screening") {
        const scoreMatch = result.match(/(\d{1,3})\s*点/);
        if (scoreMatch) {
          await supabase.from("pipeline")
            .update({ score: parseInt(scoreMatch[1]), ai_summary: result.slice(0, 300) })
            .eq("id", pipeline.id);
        }
      }

      loadLogs();
      onUpdated();
    } finally {
      setAiLoading(false);
    }
  }

  // 面談記録をまとめたテキスト
  function getInterviewSummaryText() {
    if (interviews.length === 0) return "面談記録なし";
    return interviews.map((iv) =>
      `【${INTERVIEW_TYPE_LABELS[iv.interview_type] || iv.interview_type}】面接官: ${iv.interviewer_name}　${iv.interview_date}\n評価: ${iv.rating || "未評価"}/5\nメモ: ${iv.notes}\n${iv.transcript ? `文字起こし:\n${iv.transcript.slice(0, 1000)}` : ""}`
    ).join("\n\n---\n\n");
  }

  // AIアクション生成
  function getAiActions() {
    const c = candidate;
    const interviewText = getInterviewSummaryText();
    const actions: { label: string; icon: string; type: string; prompt: string; color: string }[] = [];

    if (pipeline.stage === "applied" || pipeline.stage === "screening") {
      actions.push({
        label: "AI書類選考", icon: "📄", type: "screening", color: "bg-blue-500",
        prompt: `以下の候補者の書類選考を実施してください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\n\n【職務経歴】\n${c?.resume_text}\n\n【募集ポジション】${jobTitle}\n\n総合評価スコア(0-100点)と詳細評価を出してください。`,
      });
    }
    if (pipeline.stage === "interview1" || pipeline.stage === "interview_final") {
      actions.push({
        label: "面接質問生成", icon: "🎤", type: "interview_questions", color: "bg-violet-500",
        prompt: `以下のポジション・候補者に対する${pipeline.stage === "interview_final" ? "最終" : "1次"}面接の質問を生成してください。\n\n【ポジション】${jobTitle}\n【候補者】${c?.name}（${c?.current_company} ${c?.current_position}、${c?.experience_years}年経験）\nスキル: ${c?.skills?.join(", ")}\n\n【これまでの面談記録】\n${interviewText}`,
      });
    }
    if (interviews.length > 0) {
      actions.push({
        label: "合否判定アシスト", icon: "⚖️", type: "judgment", color: "bg-rose-500",
        prompt: `以下の候補者について、全面談記録をもとに合否判定を行ってください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\nAIスクリーニングスコア: ${pipeline.score || "未評価"}\n\n【募集ポジション】${jobTitle}\n\n【全面談記録】\n${interviewText}\n\n以下の形式で回答してください:\n■ 判定: 合格 / 保留 / 不合格\n■ 判定スコア: XX点/100点\n■ 判定根拠（3-5点）\n■ 強み\n■ 懸念点\n■ 条件面の留意事項\n■ 推奨ネクストアクション`,
      });
      actions.push({
        label: "申し送り事項作成", icon: "📝", type: "handover", color: "bg-amber-500",
        prompt: `以下の候補者について、次の面接官/意思決定者向けの申し送り事項を作成してください。\n\n【候補者】${c?.name}\n現職: ${c?.current_company} ${c?.current_position}\n経験年数: ${c?.experience_years}年\nスキル: ${c?.skills?.join(", ")}\nAIスクリーニングスコア: ${pipeline.score || "未評価"}\n\n【募集ポジション】${jobTitle}\n\n【全面談記録】\n${interviewText}\n\n以下を含めてください:\n■ 候補者サマリー（1-2行）\n■ これまでの選考経緯\n■ 確認済み事項（スキル・志望動機・カルチャーフィット等）\n■ 未確認・要深掘り事項\n■ 懸念点・リスク\n■ 面接官への申し送り（確認してほしいポイント）\n■ 処遇条件の目安（分かる範囲で）`,
      });
    }
    if (pipeline.stage === "offer") {
      actions.push({
        label: "オファーレター", icon: "💌", type: "offer_letter", color: "bg-pink-500",
        prompt: `以下の候補者へのオファーレターを生成してください。\n\n【候補者名】${c?.name}\n【ポジション】${jobTitle}\n【入社予定日】2026年4月1日\n\n【面談記録サマリー】\n${interviewText.slice(0, 500)}`,
      });
    }
    return actions;
  }

  async function moveStage(newStage: PipelineStage) {
    await supabase.from("pipeline")
      .update({ stage: newStage, stage_changed_at: new Date().toISOString() })
      .eq("id", pipeline.id);
    onUpdated();
    onClose();
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

  const currentIdx = STAGE_ORDER.indexOf(pipeline.stage);
  const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "profile", label: "プロフィール" },
    { id: "interviews", label: "面談記録", count: interviews.length },
    { id: "ai_logs", label: "AIログ", count: aiLogs.length },
  ];

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[800px] max-h-[90vh] overflow-hidden shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white font-bold text-[15px]">
                {candidate?.name?.charAt(0) || "?"}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{candidate?.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageStyles[pipeline.stage]}`}>
                    {STAGE_LABELS[pipeline.stage]}
                  </span>
                  <span className="text-[11px] text-gray-400">{jobTitle}</span>
                  {pipeline.score && (
                    <span className={`text-[11px] font-bold ${pipeline.score >= 80 ? "text-emerald-600" : pipeline.score >= 60 ? "text-amber-600" : "text-red-500"}`}>
                      スコア {pipeline.score}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {nextStage && (
                <button onClick={() => moveStage(nextStage)} className="text-[11px] font-bold text-white bg-blue-500 px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
                  → {STAGE_LABELS[nextStage]}へ
                </button>
              )}
              <button onClick={() => moveStage("rejected")} className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors">
                不合格
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl ml-2">✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id ? "bg-gray-800 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-white/20" : "bg-gray-200"
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 mb-0.5">現職</div>
                  <div className="text-[13px] text-gray-700">{candidate?.current_company}<br />{candidate?.current_position}</div>
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
              <div className="mb-5">
                <div className="text-[10px] font-bold text-gray-400 mb-1.5">スキル</div>
                <div className="flex flex-wrap gap-1.5">
                  {candidate?.skills?.map((s) => (
                    <span key={s} className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
              {candidate?.resume_text && (
                <div className="mb-5">
                  <div className="text-[10px] font-bold text-gray-400 mb-1.5">職務経歴</div>
                  <div className="text-[12px] text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed max-h-[150px] overflow-y-auto">
                    {candidate.resume_text}
                  </div>
                </div>
              )}

              {/* AI Actions */}
              <div>
                <h3 className="text-[13px] font-bold text-gray-700 mb-3">🤖 AIサポート</h3>
                <div className="grid grid-cols-2 gap-2">
                  {getAiActions().map((action) => (
                    <button
                      key={action.type}
                      onClick={() => runAi(action.type, action.prompt)}
                      disabled={aiLoading}
                      className={`text-[12px] font-bold px-4 py-3 rounded-xl text-white transition-all text-left ${
                        aiLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-md"
                      } ${action.color}`}
                    >
                      {aiLoading ? "⏳ 実行中..." : `${action.icon} ${action.label}`}
                    </button>
                  ))}
                  {getAiActions().length === 0 && (
                    <span className="text-[12px] text-gray-400 col-span-2">
                      💡 面談記録を追加すると「合否判定」「申し送り」が使えます
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interviews Tab */}
          {activeTab === "interviews" && (
            <div>
              {!hasInterviewTable && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-[13px] text-amber-700">
                  ⚠️ interview_records テーブルが未作成です。Supabase SQL Editorで作成してください。
                  <br />
                  <code className="text-[11px] mt-2 block bg-amber-100 rounded p-2">
                    POST /api/setup-interviews でSQLを確認できます
                  </code>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[14px] font-bold text-gray-700">面談記録</h3>
                <button
                  onClick={() => setShowAddInterview(true)}
                  className="text-[12px] font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  ➕ 面談記録を追加
                </button>
              </div>

              {/* Add Interview Form */}
              {showAddInterview && (
                <div className="bg-slate-50 rounded-xl p-5 mb-5 border border-slate-200">
                  <h4 className="text-[13px] font-bold text-gray-700 mb-3">新しい面談記録</h4>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">種別</label>
                      <select className={inputClass} value={interviewForm.interview_type} onChange={(e) => setInterviewForm((f) => ({ ...f, interview_type: e.target.value }))}>
                        <option value="casual">カジュアル面談</option>
                        <option value="interview1">1次面接</option>
                        <option value="interview_final">最終面接</option>
                        <option value="other">その他</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">面接官名 *</label>
                      <input className={inputClass} value={interviewForm.interviewer_name} onChange={(e) => setInterviewForm((f) => ({ ...f, interviewer_name: e.target.value }))} placeholder="山田太郎" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">面接日</label>
                      <input className={inputClass} type="date" value={interviewForm.interview_date} onChange={(e) => setInterviewForm((f) => ({ ...f, interview_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">評価（1-5）</label>
                      <select className={inputClass} value={interviewForm.rating} onChange={(e) => setInterviewForm((f) => ({ ...f, rating: e.target.value }))}>
                        <option value="">未評価</option>
                        <option value="5">5 - 非常に優秀</option>
                        <option value="4">4 - 優秀</option>
                        <option value="3">3 - 標準</option>
                        <option value="2">2 - やや不足</option>
                        <option value="1">1 - 不適合</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">メモ</label>
                      <input className={inputClass} value={interviewForm.notes} onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))} placeholder="印象・所感など" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-gray-400 block mb-1">文字起こし / 面談メモ</label>
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                      className="border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-blue-300 transition-colors"
                    >
                      <textarea
                        className="w-full text-[12px] outline-none resize-none min-h-[100px] bg-transparent"
                        value={interviewForm.transcript}
                        onChange={(e) => setInterviewForm((f) => ({ ...f, transcript: e.target.value }))}
                        placeholder="面接の文字起こしやメモを貼り付け...&#10;.txt / .srt / .vtt ファイルをドロップすることもできます"
                      />
                      <div className="text-[10px] text-gray-400 text-center mt-1">
                        📎 .txt .srt .vtt ファイルをドラッグ＆ドロップで読み込み可能
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowAddInterview(false)} className="text-[12px] font-semibold text-gray-500 px-4 py-2 hover:text-gray-700">キャンセル</button>
                    <button onClick={saveInterview} className="text-[12px] font-bold text-white bg-emerald-600 px-5 py-2 rounded-lg hover:bg-emerald-700">保存</button>
                  </div>
                </div>
              )}

              {/* Interview List */}
              {interviews.length === 0 && !showAddInterview && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">🎤</div>
                  <div className="text-[13px]">面談記録がありません</div>
                  <div className="text-[11px] mt-1">面談記録を追加すると、AIが合否判定・申し送り作成をサポートします</div>
                </div>
              )}
              {interviews.map((iv) => (
                <div key={iv.id} className="bg-white border border-gray-100 rounded-xl p-4 mb-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                        {INTERVIEW_TYPE_LABELS[iv.interview_type] || iv.interview_type}
                      </span>
                      <span className="text-[12px] font-semibold text-gray-700">面接官: {iv.interviewer_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.rating && (
                        <span className="text-[11px] font-bold">
                          {"⭐".repeat(iv.rating)}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">{new Date(iv.interview_date).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </div>
                  {iv.notes && <div className="text-[12px] text-gray-600 mb-2">{iv.notes}</div>}
                  {iv.transcript && (
                    <details className="group">
                      <summary className="text-[11px] font-bold text-blue-600 cursor-pointer hover:text-blue-800">
                        📄 文字起こしを表示（{iv.transcript.length}文字）
                      </summary>
                      <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg p-3 mt-2 whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                        {iv.transcript}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Logs Tab */}
          {activeTab === "ai_logs" && (
            <div>
              {aiLogs.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">🤖</div>
                  <div className="text-[13px]">AIログがありません</div>
                </div>
              )}
              {aiLogs.map((log) => {
                const typeLabels: Record<string, { label: string; color: string }> = {
                  screening: { label: "書類選考", color: "bg-blue-100 text-blue-600" },
                  auto_screening: { label: "自動書類選考", color: "bg-blue-100 text-blue-600" },
                  interview_questions: { label: "面接質問生成", color: "bg-violet-100 text-violet-600" },
                  judgment: { label: "合否判定", color: "bg-rose-100 text-rose-600" },
                  handover: { label: "申し送り", color: "bg-amber-100 text-amber-600" },
                  offer_letter: { label: "オファーレター", color: "bg-pink-100 text-pink-600" },
                  schedule: { label: "日程調整", color: "bg-emerald-100 text-emerald-600" },
                  prep: { label: "面接準備", color: "bg-cyan-100 text-cyan-600" },
                };
                const t = typeLabels[log.action_type] || { label: log.action_type, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={log.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.color}`}>{t.label}</span>
                      <span className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString("ja-JP")}</span>
                    </div>
                    <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto">{log.result}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

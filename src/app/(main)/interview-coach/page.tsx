"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Job, Pipeline, Candidate } from "@/lib/types";
import { INTERVIEW_TYPE_LABELS } from "@/lib/types";
import StepNavigation from "@/components/StepNavigation";

type SubTab = "questions" | "feedback" | "debrief";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "questions", icon: "❓", label: "面接質問生成" },
  { id: "feedback", icon: "📊", label: "面接官分析" },
  { id: "debrief", icon: "📝", label: "AI振り返り" },
];

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors";

export default function InterviewCoachPage() {
  const [tab, setTab] = useState<SubTab>("questions");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pipeline, setPipeline] = useState<(Pipeline & { candidate: Candidate })[]>([]);
  const [loading, setLoading] = useState(true);

  // Questions
  const [selectedJobId, setSelectedJobId] = useState("");
  const [interviewType, setInterviewType] = useState("1次面接");
  const [questionsResult, setQuestionsResult] = useState("");
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Debrief
  const [debriefNotes, setDebriefNotes] = useState("");
  const [debriefResult, setDebriefResult] = useState("");
  const [debriefLoading, setDebriefLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: j }, { data: p }] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase
        .from("pipeline")
        .select("*, candidate:candidates(*)")
        .in("stage", ["interview1", "interview_final"])
        .order("stage_changed_at", { ascending: false }),
    ]);
    setJobs(j || []);
    setPipeline((p as unknown as (Pipeline & { candidate: Candidate })[]) || []);
    if (j && j.length > 0 && !selectedJobId) setSelectedJobId(j[0].id);
    setLoading(false);
  }, [selectedJobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateQuestions() {
    if (!selectedJobId) return;
    setQuestionsLoading(true);
    const job = jobs.find((j) => j.id === selectedJobId);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `あなたは株式会社ピアズの採用面接官のコーチです。以下の求人の${interviewType}で使える面接質問を10問生成してください。

求人: ${job?.title}
部門: ${job?.department}
職務内容: ${job?.description}
要件: ${job?.requirements || "特になし"}

以下の観点を含めてください:
1. 技術/スキル確認（3問）
2. カルチャーフィット（2問）
3. 志望動機・キャリアビジョン（2問）
4. 行動面接（STAR法）（2問）
5. 逆質問の促し（1問）

各質問に「観点」「期待する回答の方向性」「フォローアップ質問」を付けてください。`,
        }),
      });
      const data = await res.json();
      setQuestionsResult(data.result || data.error || "生成に失敗しました");
    } catch {
      setQuestionsResult("エラーが発生しました");
    }
    setQuestionsLoading(false);
  }

  async function requestDebrief() {
    if (!debriefNotes.trim()) return;
    setDebriefLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `あなたは株式会社ピアズの採用面接のAIコーチです。以下の面接メモを分析し、構造化されたフィードバックを提供してください。

面接メモ:
${debriefNotes}

以下の形式でフィードバックしてください:
1. 候補者の総合評価（5段階）
2. 強み（3点）
3. 懸念点（3点）
4. 次のステップの推奨（通過/保留/不合格）とその理由
5. 面接官への改善アドバイス（質問の深掘り方など）`,
        }),
      });
      const data = await res.json();
      setDebriefResult(data.result || data.error || "生成に失敗しました");
    } catch {
      setDebriefResult("エラーが発生しました");
    }
    setDebriefLoading(false);
  }

  // Stats for feedback tab
  const interviewCandidates = pipeline.length;
  const stageDistribution = pipeline.reduce(
    (acc, p) => {
      acc[p.stage] = (acc[p.stage] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-gray-800 mb-1">🎓 面接AIコーチ</h1>
        <p className="text-[13px] text-gray-400">面接官のパフォーマンス分析とAIコーチング</p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-[12px] font-bold py-2.5 rounded-lg transition-all ${
              tab === t.id ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">読み込み中...</div>
      ) : (
        <>
          {/* Tab: Questions */}
          {tab === "questions" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-[15px] font-bold text-gray-700 mb-1">❓ AI面接質問ジェネレーター</h2>
              <p className="text-[12px] text-gray-400 mb-4">求人と面接種別を選択すると、AIが最適な面接質問を生成します</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">求人</label>
                  <select className={inputClass} value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">面接種別</label>
                  <select className={inputClass} value={interviewType} onChange={(e) => setInterviewType(e.target.value)}>
                    <option value="カジュアル面談">カジュアル面談</option>
                    <option value="1次面接">1次面接</option>
                    <option value="2次面接">2次面接</option>
                    <option value="最終面接">最終面接</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={generateQuestions}
                  disabled={questionsLoading || !selectedJobId}
                  className="text-[12px] font-bold text-white bg-blue-600 px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {questionsLoading ? "⏳ 生成中..." : "🤖 質問を生成"}
                </button>
              </div>

              {questionsResult && (
                <div className="mt-6 bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold text-gray-700">生成された面接質問</h3>
                    <button onClick={() => setQuestionsResult("")} className="text-[11px] text-gray-400 hover:text-gray-600">
                      ✕ 閉じる
                    </button>
                  </div>
                  <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">{questionsResult}</div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Feedback / Stats */}
          {tab === "feedback" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">📊 面接パイプライン状況</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-blue-700">{interviewCandidates}</div>
                    <div className="text-[11px] text-blue-500 font-bold mt-1">面接中の候補者</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-purple-700">{stageDistribution["interview1"] || 0}</div>
                    <div className="text-[11px] text-purple-500 font-bold mt-1">1次面接</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-extrabold text-amber-700">{stageDistribution["interview_final"] || 0}</div>
                    <div className="text-[11px] text-amber-500 font-bold mt-1">最終面接</div>
                  </div>
                </div>
              </div>

              {pipeline.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-3">面接予定の候補者</h3>
                  <div className="space-y-2">
                    {pipeline.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50">
                        <div>
                          <span className="text-[13px] font-bold text-gray-700">{p.candidate?.name || "不明"}</span>
                          <span className="text-[11px] text-gray-400 ml-2">{p.candidate?.current_position}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                            p.stage === "interview_final" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {p.stage === "interview_final" ? "最終面接" : "1次面接"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Debrief */}
          {tab === "debrief" && (
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-[15px] font-bold text-gray-700 mb-1">📝 面接後AI振り返り</h2>
                <p className="text-[12px] text-gray-400 mb-4">面接メモを貼り付けると、AIが構造化されたフィードバックを生成します</p>
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-gray-500 block mb-1">面接メモ・ノート</label>
                  <textarea
                    className={`${inputClass} resize-none min-h-[180px]`}
                    value={debriefNotes}
                    onChange={(e) => setDebriefNotes(e.target.value)}
                    placeholder={`例:\n田中太郎さん（フロントエンドエンジニア候補）\n- Reactの経験は3年、実プロダクトでの開発経験あり\n- チームリーダー経験なし、マネジメント志向は低め\n- 技術的な質問にはスムーズに回答\n- 転職理由がやや曖昧だった\n- カルチャーフィットは良さそう`}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={requestDebrief}
                    disabled={debriefLoading || !debriefNotes.trim()}
                    className="text-[12px] font-bold text-white bg-emerald-600 px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {debriefLoading ? "⏳ 分析中..." : "🤖 AIフィードバックを生成"}
                  </button>
                </div>
              </div>

              {debriefLoading && (
                <div className="bg-emerald-50 rounded-xl p-6 mb-6 text-center">
                  <div className="text-3xl mb-2 animate-pulse">📝</div>
                  <div className="text-[13px] font-bold text-emerald-700">AIが面接メモを分析中...</div>
                  <div className="text-[11px] text-emerald-500 mt-1">構造化されたフィードバックを生成しています</div>
                </div>
              )}

              {debriefResult && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-bold text-gray-700">🤖 AI振り返りフィードバック</h3>
                    <button onClick={() => setDebriefResult("")} className="text-[11px] text-gray-400 hover:text-gray-600">
                      ✕ 閉じる
                    </button>
                  </div>
                  <div className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none">
                    {debriefResult}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <StepNavigation />
    </div>
  );
}

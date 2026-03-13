"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface AssessmentQuestion {
  id: string;
  question: string;
  type: "single" | "multi" | "text" | "scale";
  options?: string[];
  weight: number;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  job_id: string | null;
  questions: AssessmentQuestion[];
  time_limit_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface AssessmentResult {
  id: string;
  assessment_id: string;
  candidate_id: string;
  answers: Record<string, string | string[]>;
  total_score: number | null;
  ai_evaluation: string;
  completed_at: string;
  candidate?: { name: string };
}

export default function AssessmentPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showResults, setShowResults] = useState(false);

  // フォーム
  const [form, setForm] = useState({
    title: "",
    description: "",
    time_limit_minutes: 30,
    questions: [] as AssessmentQuestion[],
  });
  const [aiPrompt, setAiPrompt] = useState("");

  const loadData = useCallback(async () => {
    const { data: assessData, error } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error && error.code === "42P01") {
      // テーブル未作成 — 空表示
      setLoading(false);
      return;
    }

    setAssessments((assessData || []) as Assessment[]);

    const { data: resultData } = await supabase
      .from("assessment_results")
      .select("*, candidate:candidates(name)")
      .order("completed_at", { ascending: false });

    setResults((resultData || []) as AssessmentResult[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // AI で問題自動生成
  async function aiGenerateQuestions() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の要件に基づいて適性検査の問題を5問作成してください。\n\n【要件】\n${aiPrompt}\n\nJSON形式で出力してください:\n[\n  {\n    "question": "問題文",\n    "type": "single",\n    "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],\n    "weight": 20\n  }\n]\n\ntypeは "single"（単一選択）, "multi"（複数選択）, "text"（自由記述）, "scale"（5段階評価）のいずれか。\nweightは配点（合計100になるよう調整）。\noptionsはsingle/multiの場合のみ。`,
          systemPrompt:
            "あなたは適性検査・アセスメント設計の専門家です。採用選考で使う実践的な問題を作成してください。JSONのみ出力してください。",
        }),
      });
      const data = await res.json();
      const text = data.text || "";
      // JSON部分を抽出
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Omit<AssessmentQuestion, "id">[];
        const questions: AssessmentQuestion[] = parsed.map((q, i) => ({
          ...q,
          id: `q_${Date.now()}_${i}`,
        }));
        setForm((f) => ({ ...f, questions: [...f.questions, ...questions] }));
      }
    } catch (e) {
      console.error("AI生成エラー:", e);
    } finally {
      setAiGenerating(false);
    }
  }

  // 問題を手動追加
  function addQuestion() {
    setForm((f) => ({
      ...f,
      questions: [
        ...f.questions,
        {
          id: `q_${Date.now()}`,
          question: "",
          type: "single",
          options: ["", "", "", ""],
          weight: 20,
        },
      ],
    }));
  }

  function updateQuestion(id: string, updates: Partial<AssessmentQuestion>) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
  }

  function removeQuestion(id: string) {
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((q) => q.id !== id),
    }));
  }

  async function saveAssessment() {
    if (!form.title.trim() || form.questions.length === 0) return;
    await supabase.from("assessments").insert([
      {
        title: form.title.trim(),
        description: form.description.trim(),
        time_limit_minutes: form.time_limit_minutes,
        questions: form.questions,
        is_active: true,
      },
    ]);
    setForm({ title: "", description: "", time_limit_minutes: 30, questions: [] });
    setShowCreate(false);
    setAiPrompt("");
    loadData();
  }

  async function toggleActive(a: Assessment) {
    await supabase
      .from("assessments")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    loadData();
  }

  async function deleteAssessment(a: Assessment) {
    await supabase.from("assessments").delete().eq("id", a.id);
    loadData();
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100";

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">📝 適性検査</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              独自の適性検査を作成し、候補者に実施
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-[12px] font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            ➕ 検査を作成
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{assessments.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">検査数</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-blue-600">
              {assessments.filter((a) => a.is_active).length}
            </div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">有効な検査</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">{results.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">回答数</div>
          </div>
        </div>

        {/* 作成フォーム */}
        {showCreate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">新しい適性検査を作成</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">検査タイトル *</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="例: フロントエンドエンジニア適性検査"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">制限時間（分）</label>
                <input
                  className={inputClass}
                  type="number"
                  value={form.time_limit_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-[11px] font-bold text-gray-500 block mb-1">説明</label>
              <textarea
                className={`${inputClass} resize-none min-h-[60px]`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="検査の目的や注意事項"
              />
            </div>

            {/* AI自動生成 */}
            <div className="bg-blue-50 rounded-xl p-4 mb-5">
              <h3 className="text-[12px] font-bold text-blue-700 mb-2">🤖 AIで問題を自動生成</h3>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-[13px] outline-none bg-white"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="例: Reactの実務経験を測る問題、論理思考力テスト、コミュニケーション力"
                />
                <button
                  onClick={aiGenerateQuestions}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="text-[12px] font-bold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {aiGenerating ? "⏳ 生成中..." : "🤖 AI生成"}
                </button>
              </div>
            </div>

            {/* 問題一覧 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-gray-700">
                  問題一覧（{form.questions.length}問）
                </h3>
                <button
                  onClick={addQuestion}
                  className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                >
                  ➕ 手動で追加
                </button>
              </div>

              {form.questions.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <div className="text-3xl mb-2">📝</div>
                  <div className="text-[12px]">AIで自動生成するか、手動で問題を追加してください</div>
                </div>
              )}

              <div className="space-y-3">
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestion(q.id, { type: e.target.value as AssessmentQuestion["type"] })}
                          className="text-[11px] px-2 py-1 rounded border border-gray-200 bg-white"
                        >
                          <option value="single">単一選択</option>
                          <option value="multi">複数選択</option>
                          <option value="text">自由記述</option>
                          <option value="scale">5段階評価</option>
                        </select>
                        <input
                          type="number"
                          value={q.weight}
                          onChange={(e) => updateQuestion(q.id, { weight: parseInt(e.target.value) || 0 })}
                          className="w-16 text-[11px] px-2 py-1 rounded border border-gray-200 text-center"
                          title="配点"
                        />
                        <span className="text-[10px] text-gray-400">点</span>
                        <button
                          onClick={() => removeQuestion(q.id)}
                          className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <input
                      className="w-full text-[13px] font-semibold bg-white px-3 py-2 rounded-lg border border-gray-200 mb-2 outline-none"
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                      placeholder="問題文を入力..."
                    />
                    {(q.type === "single" || q.type === "multi") && (
                      <div className="grid grid-cols-2 gap-2">
                        {(q.options || []).map((opt, oi) => (
                          <input
                            key={oi}
                            className="text-[12px] px-2.5 py-1.5 rounded border border-gray-200 bg-white outline-none"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(q.options || [])];
                              newOpts[oi] = e.target.value;
                              updateQuestion(q.id, { options: newOpts });
                            }}
                            placeholder={`選択肢${oi + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    {q.type === "scale" && (
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>1（低い）</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold">
                              {n}
                            </span>
                          ))}
                        </div>
                        <span>5（高い）</span>
                      </div>
                    )}
                    {q.type === "text" && (
                      <div className="text-[11px] text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-4 text-center">
                        自由記述欄（候補者が回答を入力）
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setForm({ title: "", description: "", time_limit_minutes: 30, questions: [] });
                  setAiPrompt("");
                }}
                className="text-[12px] font-semibold text-gray-500 px-4 py-2 hover:text-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={saveAssessment}
                disabled={!form.title.trim() || form.questions.length === 0}
                className="text-[12px] font-bold text-white bg-emerald-600 px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* 検査一覧 */}
        <div className="space-y-4">
          {assessments.map((a) => {
            const resultCount = results.filter((r) => r.assessment_id === a.id).length;
            const avgScore =
              resultCount > 0
                ? Math.round(
                    results
                      .filter((r) => r.assessment_id === a.id && r.total_score !== null)
                      .reduce((sum, r) => sum + (r.total_score || 0), 0) /
                      Math.max(results.filter((r) => r.assessment_id === a.id && r.total_score !== null).length, 1)
                  )
                : null;

            return (
              <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[15px] font-bold text-gray-800">{a.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          a.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {a.is_active ? "有効" : "無効"}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-[12px] text-gray-500 mb-2">{a.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-[11px] text-gray-400">
                      <span>📝 {a.questions?.length || 0}問</span>
                      <span>⏱️ {a.time_limit_minutes}分</span>
                      <span>👤 {resultCount}名受検</span>
                      {avgScore !== null && <span>📊 平均{avgScore}点</span>}
                      <span>
                        {new Date(a.created_at).toLocaleDateString("ja-JP")}作成
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedAssessment(a);
                        setShowResults(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                    >
                      📊 結果
                    </button>
                    <button
                      onClick={() => toggleActive(a)}
                      className="text-[11px] font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200"
                    >
                      {a.is_active ? "無効化" : "有効化"}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/assessment/${a.id}`
                        );
                      }}
                      className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                    >
                      🔗 URL
                    </button>
                    <button
                      onClick={() => deleteAssessment(a)}
                      className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* 問題プレビュー */}
                {selectedAssessment?.id === a.id && !showResults && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {a.questions?.map((q, idx) => (
                      <div key={q.id} className="mb-3 text-[12px]">
                        <span className="font-bold text-blue-600">Q{idx + 1}.</span>{" "}
                        <span className="text-gray-700">{q.question}</span>
                        <span className="text-[10px] text-gray-400 ml-2">({q.weight}点)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {assessments.length === 0 && !showCreate && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📝</div>
              <div className="text-[14px]">適性検査がまだありません</div>
              <div className="text-[12px] mt-1">「検査を作成」から独自の適性検査を作りましょう</div>
            </div>
          )}
        </div>

        {/* 結果モーダル */}
        {showResults && selectedAssessment && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowResults(false)}>
            <div className="bg-white rounded-2xl w-full md:w-[700px] max-h-[80vh] overflow-hidden shadow-xl flex flex-col mx-4 md:mx-0" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{selectedAssessment.title}</h2>
                  <p className="text-[12px] text-gray-400">受検結果一覧</p>
                </div>
                <button onClick={() => setShowResults(false)} className="text-gray-400 hover:text-gray-600 text-xl">
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {results.filter((r) => r.assessment_id === selectedAssessment.id).length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="text-[13px]">まだ回答がありません</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results
                      .filter((r) => r.assessment_id === selectedAssessment.id)
                      .map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-bold text-gray-800">
                              {(r.candidate as { name: string } | undefined)?.name || "不明"}
                            </span>
                            <div className="flex items-center gap-2">
                              {r.total_score !== null && (
                                <span
                                  className={`text-[13px] font-extrabold ${
                                    r.total_score >= 80
                                      ? "text-emerald-600"
                                      : r.total_score >= 60
                                      ? "text-amber-600"
                                      : "text-red-500"
                                  }`}
                                >
                                  {r.total_score}点
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {new Date(r.completed_at).toLocaleDateString("ja-JP")}
                              </span>
                            </div>
                          </div>
                          {r.ai_evaluation && (
                            <div className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">
                              {r.ai_evaluation}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

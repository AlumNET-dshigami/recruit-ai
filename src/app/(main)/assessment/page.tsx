"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";
import type { MikiwameResult } from "@/lib/types";
import { MIKIWAME_TRAIT_LABELS, MIKIWAME_SCORE_LABELS } from "@/lib/types";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const MAIN_TABS = ["MIKIWAME結果", "カスタム検査"] as const;

const RADAR_KEYS = [
  "listening", "assertion", "problem_solving", "proactiveness",
  "persistence", "self_efficacy", "ambition", "sociability",
  "emotional_care", "objectivity",
] as const;

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
  const [mainTab, setMainTab] = useState<(typeof MAIN_TABS)[number]>(MAIN_TABS[0]);
  const [loading, setLoading] = useState(true);
  const [mikiwame, setMikiwame] = useState<MikiwameResult[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<MikiwameResult | null>(null);

  // Custom assessment state
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    time_limit_minutes: 30,
    questions: [] as AssessmentQuestion[],
  });
  const [aiPrompt, setAiPrompt] = useState("");

  const loadData = useCallback(async () => {
    const [mRes, aRes, rRes] = await Promise.all([
      supabase.from("mikiwame_results").select("*"),
      supabase.from("assessments").select("*").order("created_at", { ascending: false }),
      supabase.from("assessment_results").select("*, candidate:candidates(name)").order("completed_at", { ascending: false }),
    ]);
    setMikiwame((mRes.data || []) as MikiwameResult[]);
    if (!aRes.error || aRes.error.code !== "42P01") setAssessments((aRes.data || []) as Assessment[]);
    if (!rRes.error) setResults((rRes.data || []) as AssessmentResult[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    mikiwame.forEach((m) => { if (m.department) depts.add(m.department); });
    return Array.from(depts).sort();
  }, [mikiwame]);

  const filtered = useMemo(() => {
    return mikiwame.filter((m) => {
      if (search && !m.name.includes(search) && !m.email.includes(search.toLowerCase())) return false;
      if (deptFilter && m.department !== deptFilter) return false;
      return true;
    });
  }, [mikiwame, search, deptFilter]);

  const orgAvg = useMemo(() => {
    return RADAR_KEYS.map((k) => {
      const vals = mikiwame.map((m) => m.traits?.[k]).filter((v) => v != null) as number[];
      return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    });
  }, [mikiwame]);

  // Custom assessment functions
  async function aiGenerateQuestions() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の要件に基づいて適性検査の問題を5問作成してください。\n\n【要件】\n${aiPrompt}\n\nJSON形式で出力:\n[\n  {"question": "問題文", "type": "single", "options": ["A", "B", "C", "D"], "weight": 20}\n]\ntypeは "single","multi","text","scale" のいずれか。JSONのみ出力。`,
          systemPrompt: "あなたは適性検査設計の専門家です。JSONのみ出力してください。",
        }),
      });
      const data = await res.json();
      const jsonMatch = (data.text || "").match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Omit<AssessmentQuestion, "id">[];
        setForm((f) => ({
          ...f,
          questions: [...f.questions, ...parsed.map((q, i) => ({ ...q, id: `q_${Date.now()}_${i}` }))],
        }));
      }
    } catch (e) { console.error(e); }
    setAiGenerating(false);
  }

  async function saveAssessment() {
    if (!form.title.trim() || form.questions.length === 0) return;
    await supabase.from("assessments").insert([{
      title: form.title.trim(),
      description: form.description.trim(),
      time_limit_minutes: form.time_limit_minutes,
      questions: form.questions,
      is_active: true,
    }]);
    setForm({ title: "", description: "", time_limit_minutes: 30, questions: [] });
    setShowCreate(false);
    loadData();
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100";

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">適性検査</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              MIKIWAME検査結果 {mikiwame.length}名 / カスタム検査 {assessments.length}件
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          {MAIN_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                mainTab === t ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* MIKIWAME Results Tab */}
        {mainTab === "MIKIWAME結果" && (
          <>
            {mikiwame.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📊</div>
                <div className="text-[14px]">MIKIWAMEデータが未登録です</div>
              </div>
            ) : (
              <>
                {/* Search & Filter */}
                <div className="flex gap-3 mb-4">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
                    placeholder="名前・メールで検索..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                  >
                    <option value="">全部署</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Results List */}
                  <div className="md:col-span-2 space-y-2 max-h-[700px] overflow-y-auto">
                    <div className="text-[11px] text-gray-400 font-bold mb-1">
                      {filtered.length}名表示
                    </div>
                    {filtered.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setSelectedPerson(m)}
                        className={`p-3 rounded-xl border cursor-pointer transition ${
                          selectedPerson?.id === m.id
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-white border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-[13px]">
                              {m.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-[13px] font-bold text-gray-800">{m.name}</div>
                              <div className="text-[10px] text-gray-400">
                                {m.department} {m.role ? `/ ${m.role}` : ""}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {m.personality_type?.replace(/（.*）/, "")}
                            </span>
                            {typeof m.match_scores?.hp_all === "number" && (
                              <span className={`text-[11px] font-extrabold ${
                                (m.match_scores.hp_all as number) >= 7 ? "text-emerald-600" :
                                (m.match_scores.hp_all as number) >= 5 ? "text-blue-600" : "text-gray-500"
                              }`}>
                                {(m.match_scores.hp_all as number).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detail Panel */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-6">
                    {selectedPerson ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                            {selectedPerson.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-[15px] font-bold text-gray-800">{selectedPerson.name}</div>
                            <div className="text-[11px] text-gray-400">{selectedPerson.department}</div>
                            <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {selectedPerson.personality_type}
                            </span>
                          </div>
                        </div>

                        {/* Radar Chart: person vs org avg */}
                        <div className="mb-4">
                          <Radar
                            data={{
                              labels: RADAR_KEYS.map((k) => MIKIWAME_TRAIT_LABELS[k] || k),
                              datasets: [
                                {
                                  label: selectedPerson.name,
                                  data: RADAR_KEYS.map((k) => selectedPerson.traits?.[k] || 0),
                                  backgroundColor: "rgba(99,102,241,0.15)",
                                  borderColor: "#6366f1",
                                  borderWidth: 2,
                                },
                                {
                                  label: "全社平均",
                                  data: orgAvg,
                                  backgroundColor: "rgba(156,163,175,0.1)",
                                  borderColor: "#9ca3af",
                                  borderWidth: 1,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              scales: { r: { beginAtZero: true, max: 70, ticks: { display: false }, pointLabels: { font: { size: 9 } } } },
                              plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
                            }}
                          />
                        </div>

                        {/* Match Scores */}
                        <div className="mb-3">
                          <div className="text-[11px] font-bold text-gray-500 mb-2">マッチスコア</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(MIKIWAME_SCORE_LABELS).map(([key, label]) => {
                              const val = selectedPerson.match_scores?.[key];
                              const numVal = typeof val === "number" ? val : null;
                              return (
                                <div key={key} className="bg-gray-50 rounded px-2 py-1.5 flex items-center justify-between">
                                  <span className="text-[9px] text-gray-500">{label}</span>
                                  <span className={`text-[11px] font-bold ${
                                    numVal && numVal >= 7 ? "text-emerald-600" :
                                    numVal && numVal >= 5 ? "text-blue-600" :
                                    typeof val === "string" ? "text-gray-700" : "text-gray-400"
                                  }`}>
                                    {numVal ? numVal.toFixed(1) : val || "-"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Basic info */}
                        <div className="text-[10px] text-gray-400 space-y-0.5">
                          <div>雇用形態: {selectedPerson.employment_type}</div>
                          {selectedPerson.hire_year && <div>入社年: {selectedPerson.hire_year}</div>}
                          {selectedPerson.assessed_at && (
                            <div>検査日: {new Date(selectedPerson.assessed_at).toLocaleDateString("ja-JP")}</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <div className="text-4xl mb-3">📊</div>
                        <div className="text-[12px]">左のリストから<br />社員を選択</div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Custom Assessment Tab */}
        {mainTab === "カスタム検査" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreate(true)}
                className="text-[12px] font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                + 検査を作成
              </button>
            </div>

            {showCreate && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-[15px] font-bold text-gray-700 mb-4">新しい適性検査を作成</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">タイトル *</label>
                    <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">制限時間（分）</label>
                    <input className={inputClass} type="number" value={form.time_limit_minutes} onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: parseInt(e.target.value) || 30 }))} />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 mb-4">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg border border-blue-200 text-[13px] outline-none bg-white"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="例: Reactの実務経験を測る問題"
                    />
                    <button onClick={aiGenerateQuestions} disabled={aiGenerating || !aiPrompt.trim()} className="text-[12px] font-bold text-white bg-blue-600 px-4 py-2 rounded-lg disabled:opacity-50">
                      {aiGenerating ? "生成中..." : "AI生成"}
                    </button>
                  </div>
                </div>
                <div className="text-[12px] text-gray-500 mb-2">{form.questions.length}問</div>
                {form.questions.map((q, idx) => (
                  <div key={q.id} className="bg-gray-50 rounded-lg p-3 mb-2 text-[12px]">
                    <span className="font-bold text-blue-600">Q{idx + 1}.</span> {q.question}
                    <button onClick={() => setForm((f) => ({ ...f, questions: f.questions.filter((x) => x.id !== q.id) }))} className="text-red-400 ml-2 text-[10px]">x</button>
                  </div>
                ))}
                <div className="flex gap-2 justify-end mt-3">
                  <button onClick={() => { setShowCreate(false); setForm({ title: "", description: "", time_limit_minutes: 30, questions: [] }); }} className="text-[12px] text-gray-500 px-4 py-2">キャンセル</button>
                  <button onClick={saveAssessment} disabled={!form.title.trim() || form.questions.length === 0} className="text-[12px] font-bold text-white bg-emerald-600 px-6 py-2 rounded-lg disabled:opacity-50">保存</button>
                </div>
              </div>
            )}

            {assessments.length === 0 && !showCreate ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📝</div>
                <div className="text-[14px]">カスタム検査がまだありません</div>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((a) => {
                  const resultCount = results.filter((r) => r.assessment_id === a.id).length;
                  return (
                    <div key={a.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-[15px] font-bold text-gray-800">{a.title}</h3>
                          <div className="text-[11px] text-gray-400 mt-1">
                            {a.questions?.length || 0}問 / {a.time_limit_minutes}分 / {resultCount}名受検
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedAssessment(a); setShowResults(true); }} className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">結果</button>
                          <button onClick={async () => { await supabase.from("assessments").delete().eq("id", a.id); loadData(); }} className="text-[11px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">削除</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showResults && selectedAssessment && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowResults(false)}>
                <div className="bg-white rounded-2xl w-full md:w-[700px] max-h-[80vh] overflow-hidden shadow-xl flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">{selectedAssessment.title}</h2>
                    <button onClick={() => setShowResults(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    {results.filter((r) => r.assessment_id === selectedAssessment.id).length === 0 ? (
                      <div className="text-center py-10 text-gray-400">まだ回答がありません</div>
                    ) : (
                      results.filter((r) => r.assessment_id === selectedAssessment.id).map((r) => (
                        <div key={r.id} className="bg-gray-50 rounded-xl p-4 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[13px] font-bold">{(r.candidate as { name: string } | undefined)?.name || "不明"}</span>
                            {r.total_score !== null && <span className="text-[13px] font-extrabold text-emerald-600">{r.total_score}点</span>}
                          </div>
                          {r.ai_evaluation && <div className="text-[11px] text-gray-500 whitespace-pre-wrap">{r.ai_evaluation}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

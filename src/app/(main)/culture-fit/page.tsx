"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Pipeline, Candidate } from "@/lib/types";

interface HighPerformerProfile {
  id: string;
  name: string;
  role: string;
  department: string;
  traits: string[];
  strengths: string[];
  values: string[];
  personality_type: string;
  performance_score: number;
  notes: string;
  created_at: string;
}

export default function CultureFitPage() {
  const [profiles, setProfiles] = useState<HighPerformerProfile[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [fitResult, setFitResult] = useState<{ candidateId: string; result: string } | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [aiProfileGenerating, setAiProfileGenerating] = useState(false);

  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "",
    traits: "",
    strengths: "",
    values: "",
    personality_type: "",
    performance_score: 5,
    notes: "",
  });

  const loadData = useCallback(async () => {
    const [profilesRes, pipelineRes] = await Promise.all([
      supabase.from("high_performers").select("*").order("performance_score", { ascending: false }),
      supabase.from("pipeline").select("*, candidate:candidates(*)").neq("stage", "rejected"),
    ]);

    if (profilesRes.error && profilesRes.error.code === "42P01") {
      setLoading(false);
      return;
    }

    setProfiles((profilesRes.data || []) as HighPerformerProfile[]);
    setPipeline((pipelineRes.data || []) as Pipeline[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveProfile() {
    if (!form.name.trim()) return;
    await supabase.from("high_performers").insert([{
      name: form.name.trim(),
      role: form.role.trim(),
      department: form.department.trim(),
      traits: form.traits.split(",").map((t) => t.trim()).filter(Boolean),
      strengths: form.strengths.split(",").map((t) => t.trim()).filter(Boolean),
      values: form.values.split(",").map((t) => t.trim()).filter(Boolean),
      personality_type: form.personality_type.trim(),
      performance_score: form.performance_score,
      notes: form.notes.trim(),
    }]);
    setForm({ name: "", role: "", department: "", traits: "", strengths: "", values: "", personality_type: "", performance_score: 5, notes: "" });
    setShowAdd(false);
    loadData();
  }

  async function deleteProfile(id: string) {
    await supabase.from("high_performers").delete().eq("id", id);
    loadData();
  }

  // AIでハイパフォーマープロフィールを自動生成
  async function aiGenerateProfile() {
    if (!form.name.trim() || !form.role.trim()) return;
    setAiProfileGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下のハイパフォーマーの情報から、性格特性・強み・価値観を分析してください。

【氏名】${form.name}
【役職】${form.role}
【部署】${form.department}
${form.notes ? `【備考】${form.notes}` : ""}

以下のJSON形式で出力してください:
{
  "traits": ["論理思考", "行動力", "コミュニケーション力", ...],
  "strengths": ["問題解決", "チームビルディング", ...],
  "values": ["成長志向", "チームワーク", ...],
  "personality_type": "ENTJ（指揮官型）"
}

IT・コンサル業界のハイパフォーマーに典型的な特性を参考にしつつ、具体的に5つ以上の特性を出してください。JSONのみ出力。`,
          systemPrompt: "あなたは組織心理学・タレントマネジメントの専門家です。ハイパフォーマーの行動特性を分析してください。JSONのみ出力してください。",
        }),
      });
      const data = await res.json();
      const text = data.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setForm((f) => ({
          ...f,
          traits: (parsed.traits || []).join(", "),
          strengths: (parsed.strengths || []).join(", "),
          values: (parsed.values || []).join(", "),
          personality_type: parsed.personality_type || "",
        }));
      }
    } catch (e) {
      console.error("AI生成エラー:", e);
    } finally {
      setAiProfileGenerating(false);
    }
  }

  // 候補者のカルチャーフィット分析
  async function analyzeFit(candidateId: string) {
    const p = pipeline.find((x) => x.candidate_id === candidateId);
    const c = p?.candidate as Candidate | undefined;
    if (!c) return;

    setAiAnalyzing(true);
    setFitResult(null);
    setSelectedCandidateId(candidateId);

    const profilesSummary = profiles.map((hp) =>
      `【${hp.name}（${hp.role}）】パフォーマンス: ${hp.performance_score}/10\n特性: ${hp.traits?.join(", ")}\n強み: ${hp.strengths?.join(", ")}\n価値観: ${hp.values?.join(", ")}\n性格タイプ: ${hp.personality_type}`
    ).join("\n\n");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の自社ハイパフォーマーの特性と、候補者のプロフィールを比較して、カルチャーフィット分析を行ってください。

【自社ハイパフォーマー一覧】
${profilesSummary}

【分析対象の候補者】
氏名: ${c.name}
現職: ${c.current_company} ${c.current_position}
経験年数: ${c.experience_years}年
スキル: ${c.skills?.join(", ")}
職務経歴: ${c.resume_text?.slice(0, 800)}
AIスコア: ${p?.score || "未評価"}

以下の形式で分析してください:
■ カルチャーフィット度: XX% （0-100%で数値化）
■ フィットする点（3-5点）
■ ギャップ・懸念点（2-3点）
■ 推定される性格タイプ
■ ハイパフォーマーとの類似度ランキング（最も似ている人TOP3）
■ 総合評価・推奨アクション`,
          systemPrompt: "あなたは組織心理学・カルチャーフィット分析の専門家です。自社のハイパフォーマー特性をベンチマークとして、候補者の適合度を科学的に分析してください。",
        }),
      });
      const data = await res.json();
      setFitResult({
        candidateId,
        result: data.text || "分析に失敗しました",
      });
    } finally {
      setAiAnalyzing(false);
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100";

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  // ハイパフォーマーから共通特性を抽出
  const allTraits: Record<string, number> = {};
  profiles.forEach((p) => {
    p.traits?.forEach((t) => { allTraits[t] = (allTraits[t] || 0) + 1; });
  });
  const topTraits = Object.entries(allTraits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const activeCandidates = pipeline.filter((p) => p.candidate);
  // 重複排除
  const uniqueCandidates: Pipeline[] = [];
  const seenIds = new Set<string>();
  activeCandidates.forEach((p) => {
    if (!seenIds.has(p.candidate_id)) {
      seenIds.add(p.candidate_id);
      uniqueCandidates.push(p);
    }
  });

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">🧬 カルチャーフィット</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              自社ハイパフォーマーの特性から、フィットする人材をAIが見抜く
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] font-bold text-white bg-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            ➕ ハイパフォーマーを登録
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{profiles.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">登録済みHP</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-blue-600">
              {profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + p.performance_score, 0) / profiles.length * 10) / 10 : 0}
            </div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">平均パフォーマンス</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-violet-600">{topTraits.length > 0 ? topTraits[0][0] : "—"}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">最多特性</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">{uniqueCandidates.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">分析可能候補者</div>
          </div>
        </div>

        {/* 登録フォーム */}
        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">ハイパフォーマー登録</h2>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">氏名 *</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="田中太郎" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">役職 *</label>
                <input className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="シニアエンジニア" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">部署</label>
                <input className={inputClass} value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="開発部" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">パフォーマンス評価（1-10）</label>
                <input className={inputClass} type="number" min={1} max={10} value={form.performance_score} onChange={(e) => setForm((f) => ({ ...f, performance_score: parseInt(e.target.value) || 5 }))} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">性格タイプ（MBTI等）</label>
                <input className={inputClass} value={form.personality_type} onChange={(e) => setForm((f) => ({ ...f, personality_type: e.target.value }))} placeholder="ENTJ" />
              </div>
            </div>

            {/* AI自動生成ボタン */}
            <div className="bg-blue-50 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-bold text-blue-700">🤖 AIで特性を自動分析</span>
                  <p className="text-[10px] text-blue-500 mt-0.5">氏名・役職を入力後にクリックすると、AIが特性・強み・価値観を推定します</p>
                </div>
                <button
                  onClick={aiGenerateProfile}
                  disabled={aiProfileGenerating || !form.name.trim() || !form.role.trim()}
                  className="text-[11px] font-bold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {aiProfileGenerating ? "⏳ 分析中..." : "🤖 AI分析"}
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">行動特性（カンマ区切り）</label>
                <input className={inputClass} value={form.traits} onChange={(e) => setForm((f) => ({ ...f, traits: e.target.value }))} placeholder="論理思考, 行動力, リーダーシップ" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">強み（カンマ区切り）</label>
                <input className={inputClass} value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} placeholder="問題解決, チームビルディング, 技術力" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">価値観（カンマ区切り）</label>
                <input className={inputClass} value={form.values} onChange={(e) => setForm((f) => ({ ...f, values: e.target.value }))} placeholder="成長志向, チームワーク, 顧客第一" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 block mb-1">メモ</label>
                <textarea className={`${inputClass} resize-none min-h-[60px]`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="この人が優秀な理由、エピソードなど" />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="text-[12px] font-semibold text-gray-500 px-4 py-2">キャンセル</button>
              <button onClick={saveProfile} disabled={!form.name.trim()} className="text-[12px] font-bold text-white bg-emerald-600 px-5 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">保存</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* ハイパフォーマー一覧 */}
          <div className="col-span-2 space-y-4">
            <h2 className="text-[15px] font-bold text-gray-700">🌟 ハイパフォーマー一覧</h2>

            {profiles.length === 0 && !showAdd && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🧬</div>
                <div className="text-[14px]">ハイパフォーマーが未登録です</div>
                <div className="text-[12px] mt-1">自社の優秀社員を登録して、候補者とのフィット分析を行いましょう</div>
              </div>
            )}

            {profiles.map((hp) => (
              <div key={hp.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-[15px]">
                      {hp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-gray-800">{hp.name}</div>
                      <div className="text-[11px] text-gray-400">{hp.department} / {hp.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className={`text-[16px] font-extrabold ${hp.performance_score >= 8 ? "text-emerald-600" : hp.performance_score >= 6 ? "text-amber-600" : "text-gray-600"}`}>
                        {hp.performance_score}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold">/10</div>
                    </div>
                    <button onClick={() => deleteProfile(hp.id)} className="text-[10px] text-red-400 hover:text-red-600 ml-2">削除</button>
                  </div>
                </div>

                {hp.personality_type && (
                  <div className="mb-2">
                    <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                      {hp.personality_type}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  {hp.traits && hp.traits.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400">特性: </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {hp.traits.map((t) => (
                          <span key={t} className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hp.strengths && hp.strengths.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400">強み: </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {hp.strengths.map((s) => (
                          <span key={s} className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {hp.values && hp.values.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400">価値観: </span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {hp.values.map((v) => (
                          <span key={v} className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded">{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 共通特性サマリー */}
            {topTraits.length > 0 && (
              <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-5 border border-violet-100">
                <h3 className="text-[13px] font-bold text-violet-800 mb-3">📊 ハイパフォーマー共通特性</h3>
                <div className="space-y-2">
                  {topTraits.map(([trait, count]) => (
                    <div key={trait} className="flex items-center gap-3">
                      <span className="text-[12px] font-semibold text-gray-700 w-[120px]">{trait}</span>
                      <div className="flex-1 h-3 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-400 rounded-full"
                          style={{ width: `${(count / profiles.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-violet-600">{Math.round((count / profiles.length) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 候補者フィット分析 */}
          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sticky top-6">
              <h3 className="text-[14px] font-bold text-gray-700 mb-3">🧬 フィット分析</h3>

              {profiles.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-3xl mb-2">🧬</div>
                  <div className="text-[11px]">先にハイパフォーマーを<br />登録してください</div>
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">候補者を選択</label>
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => setSelectedCandidateId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] outline-none bg-white"
                    >
                      <option value="">選択してください</option>
                      {uniqueCandidates.map((p) => {
                        const c = p.candidate as Candidate | undefined;
                        return (
                          <option key={p.candidate_id} value={p.candidate_id}>
                            {c?.name} ({c?.current_company})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button
                    onClick={() => selectedCandidateId && analyzeFit(selectedCandidateId)}
                    disabled={aiAnalyzing || !selectedCandidateId}
                    className="w-full text-[12px] font-bold text-white bg-violet-600 px-4 py-2.5 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 mb-4"
                  >
                    {aiAnalyzing ? "⏳ 分析中..." : "🧬 フィット分析を実行"}
                  </button>

                  {!fitResult && !aiAnalyzing && (
                    <div className="text-center py-6 text-gray-400">
                      <div className="text-3xl mb-2">🎯</div>
                      <div className="text-[11px]">候補者を選択して<br />フィット分析を実行</div>
                    </div>
                  )}

                  {aiAnalyzing && (
                    <div className="text-center py-6 text-gray-400">
                      <div className="text-3xl mb-2 animate-pulse">🧬</div>
                      <div className="text-[11px]">AIがフィット分析中...</div>
                    </div>
                  )}

                  {fitResult && (
                    <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                      {fitResult.result}
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

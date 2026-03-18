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
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";
import { supabase } from "@/lib/supabase";
import type { MikiwameResult, Pipeline, Candidate } from "@/lib/types";
import { MIKIWAME_TRAIT_LABELS, MIKIWAME_SCORE_LABELS } from "@/lib/types";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const TABS = ["組織プロファイル", "部署別分析", "ハイパフォーマー", "候補者フィット"] as const;

const RADAR_TRAITS = [
  "listening", "assertion", "problem_solving", "proactiveness",
  "persistence", "self_efficacy", "ambition", "sociability",
] as const;

const DEPT_GROUPS: Record<string, string[]> = {
  "SP事業本部": ["SP事業本部"],
  "オンラインセールス": ["オンラインセールス"],
  "管理本部": ["管理本部"],
  "SES事業部": ["SES事業部"],
  "事業開発": ["事業開発"],
  "経営企画": ["経営企画"],
  "社長室": ["社長室"],
  "マックスプロデュース": ["マックスプロデュース"],
  "その他": [],
};

function matchDeptGroup(dept: string): string {
  for (const [group, keywords] of Object.entries(DEPT_GROUPS)) {
    if (group === "その他") continue;
    if (keywords.some((kw) => dept.includes(kw))) return group;
  }
  return "その他";
}

function avgTraits(records: MikiwameResult[], keys: readonly string[]): number[] {
  return keys.map((k) => {
    const vals = records.map((r) => r.traits?.[k]).filter((v) => v != null) as number[];
    return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : 0;
  });
}

function avgScore(records: MikiwameResult[], key: string): number {
  const vals = records
    .map((r) => {
      const v = r.match_scores?.[key];
      return typeof v === "number" ? v : null;
    })
    .filter((v) => v != null) as number[];
  return vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : 0;
}

export default function CultureFitPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [mikiwame, setMikiwame] = useState<MikiwameResult[]>([]);
  const [pipeline, setPipeline] = useState<Pipeline[]>([]);
  const [selectedDept, setSelectedDept] = useState("SP事業本部");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [fitResult, setFitResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      supabase.from("mikiwame_results").select("*"),
      supabase.from("pipeline").select("*, candidate:candidates(*)").neq("stage", "rejected"),
    ]);
    if (mRes.error && mRes.error.code === "42P01") {
      setLoading(false);
      return;
    }
    setMikiwame((mRes.data || []) as MikiwameResult[]);
    setPipeline((pRes.data || []) as Pipeline[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Personality type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    mikiwame.forEach((m) => {
      if (m.personality_type) counts[m.personality_type] = (counts[m.personality_type] || 0) + 1;
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [mikiwame]);

  // Department groupings
  const deptGrouped = useMemo(() => {
    const groups: Record<string, MikiwameResult[]> = {};
    mikiwame.forEach((m) => {
      const g = matchDeptGroup(m.department);
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    });
    return groups;
  }, [mikiwame]);

  // HP candidates (high performer scores)
  const hpRanking = useMemo(() => {
    return [...mikiwame]
      .filter((m) => typeof m.match_scores?.hp_all === "number")
      .sort((a, b) => ((b.match_scores?.hp_all as number) || 0) - ((a.match_scores?.hp_all as number) || 0))
      .slice(0, 20);
  }, [mikiwame]);

  // Unique pipeline candidates
  const uniqueCandidates = useMemo(() => {
    const seen = new Set<string>();
    return pipeline.filter((p) => {
      if (!p.candidate || seen.has(p.candidate_id)) return false;
      seen.add(p.candidate_id);
      return true;
    });
  }, [pipeline]);

  // Org-wide radar data
  const orgRadarData = useMemo(() => ({
    labels: RADAR_TRAITS.map((k) => MIKIWAME_TRAIT_LABELS[k] || k),
    datasets: [{
      label: "全社平均",
      data: avgTraits(mikiwame, RADAR_TRAITS),
      backgroundColor: "rgba(99,102,241,0.15)",
      borderColor: "#6366f1",
      borderWidth: 2,
    }],
  }), [mikiwame]);

  // Dept comparison radar
  const deptRadarData = useMemo(() => {
    const colors = [
      { bg: "rgba(59,130,246,0.15)", border: "#3b82f6" },
      { bg: "rgba(16,185,129,0.15)", border: "#10b981" },
    ];
    const deptMembers = deptGrouped[selectedDept] || [];
    return {
      labels: RADAR_TRAITS.map((k) => MIKIWAME_TRAIT_LABELS[k] || k),
      datasets: [
        {
          label: selectedDept,
          data: avgTraits(deptMembers, RADAR_TRAITS),
          ...colors[0],
          borderWidth: 2,
        },
        {
          label: "全社平均",
          data: avgTraits(mikiwame, RADAR_TRAITS),
          ...colors[1],
          borderWidth: 2,
        },
      ],
    };
  }, [mikiwame, deptGrouped, selectedDept]);

  // HP radar: top HP vs org average
  const hpRadarData = useMemo(() => {
    const top10 = hpRanking.slice(0, 10);
    return {
      labels: RADAR_TRAITS.map((k) => MIKIWAME_TRAIT_LABELS[k] || k),
      datasets: [
        {
          label: "ハイパフォーマーTOP10",
          data: avgTraits(top10, RADAR_TRAITS),
          backgroundColor: "rgba(245,158,11,0.15)",
          borderColor: "#f59e0b",
          borderWidth: 2,
        },
        {
          label: "全社平均",
          data: avgTraits(mikiwame, RADAR_TRAITS),
          backgroundColor: "rgba(156,163,175,0.1)",
          borderColor: "#9ca3af",
          borderWidth: 1,
        },
      ],
    };
  }, [mikiwame, hpRanking]);

  // Type distribution bar chart
  const typeBarData = useMemo(() => ({
    labels: typeDistribution.slice(0, 10).map(([t]) => t.replace(/（.*）/, "")),
    datasets: [{
      label: "人数",
      data: typeDistribution.slice(0, 10).map(([, c]) => c),
      backgroundColor: [
        "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316",
      ],
    }],
  }), [typeDistribution]);

  async function analyzeFit(candidateId: string) {
    const p = pipeline.find((x) => x.candidate_id === candidateId);
    const c = p?.candidate as Candidate | undefined;
    if (!c) return;
    setAiLoading(true);
    setFitResult("");

    const orgProfile = RADAR_TRAITS.map((k) => {
      const avg = avgTraits(mikiwame, [k])[0];
      return `${MIKIWAME_TRAIT_LABELS[k]}: 全社平均${avg}`;
    }).join(", ");

    const hpProfile = hpRanking.slice(0, 5).map((h) =>
      `${h.name}(${h.department}): ${h.personality_type}, HPスコア${h.match_scores?.hp_all}`
    ).join("\n");

    const topTypes = typeDistribution.slice(0, 5).map(([t, c]) => `${t}:${c}名`).join(", ");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `MIKIWAMEの適性検査データに基づく組織プロファイルと候補者を比較し、カルチャーフィット分析を行ってください。

【組織プロファイル（MIKIWAME実データ: ${mikiwame.length}名）】
性格特性平均: ${orgProfile}
多い人物タイプ: ${topTypes}

【ハイパフォーマーTOP5】
${hpProfile}

【分析対象の候補者】
氏名: ${c.name}
現職: ${c.current_company || ""} ${c.current_position || ""}
経験年数: ${c.experience_years || 0}年
スキル: ${c.skills?.join(", ") || "不明"}
応募経路: ${c.source || "不明"}
AIスコア: ${p?.score || "未評価"}

■ カルチャーフィット度: XX%
■ フィットする点（3-5点）
■ 懸念点（2-3点）
■ 推定される人物タイプ（MIKIWAME 16タイプから）
■ 最もマッチする部署
■ ハイパフォーマーとの類似度
■ 総合評価・推奨アクション`,
          systemPrompt: "あなたはMIKIWAME適性検査のデータアナリストです。組織の実際の適性検査データに基づいて、候補者のカルチャーフィットを科学的に分析してください。",
        }),
      });
      const data = await res.json();
      setFitResult(data.text || "分析に失敗しました");
    } catch {
      setFitResult("エラーが発生しました");
    }
    setAiLoading(false);
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;

  const radarOpts = {
    responsive: true,
    scales: { r: { beginAtZero: true, max: 70, ticks: { stepSize: 10, font: { size: 10 } }, pointLabels: { font: { size: 11 } } } },
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 11 } } } },
  };

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-extrabold text-gray-800">カルチャーフィット</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            MIKIWAME適性検査データ（{mikiwame.length}名）に基づく組織分析
          </p>
        </div>

        {mikiwame.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🧬</div>
            <div className="text-[14px]">MIKIWAMEデータが未登録です</div>
            <div className="text-[12px] mt-1">
              /api/setup-mikiwame でテーブルを作成し、/api/seed-mikiwame でデータを投入してください
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-extrabold text-indigo-600">{mikiwame.length}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">検査実施者</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-extrabold text-blue-600">{Object.keys(deptGrouped).length}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">部署グループ</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-extrabold text-amber-600">{typeDistribution.length}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">人物タイプ数</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-extrabold text-emerald-600">{avgScore(mikiwame, "hp_all")}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">HP傾向(平均)</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
                <div className="text-2xl font-extrabold text-violet-600">{avgScore(mikiwame, "culture")}</div>
                <div className="text-[10px] text-gray-400 font-bold mt-1">組織風土(平均)</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === t ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 組織プロファイル */}
            {tab === "組織プロファイル" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-4">組織全体の性格特性</h3>
                  <Radar data={orgRadarData} options={radarOpts} />
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-4">人物16タイプ分布</h3>
                  <Bar
                    data={typeBarData}
                    options={{
                      responsive: true,
                      indexAxis: "y" as const,
                      plugins: { legend: { display: false } },
                      scales: { x: { ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } },
                    }}
                  />
                </div>
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-4">部署別マッチスコア</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(["sp_match", "onecolors_match", "corp_match", "links2_match", "newgrad_match", "hp_all", "hp_bu", "hp_corp"] as const).map((key) => (
                      <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                        <div className="text-[10px] text-gray-400 font-bold mb-1">
                          {MIKIWAME_SCORE_LABELS[key]}
                        </div>
                        <div className={`text-xl font-extrabold ${
                          avgScore(mikiwame, key) >= 7 ? "text-emerald-600" :
                          avgScore(mikiwame, key) >= 5 ? "text-blue-600" : "text-gray-600"
                        }`}>
                          {avgScore(mikiwame, key)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 部署別分析 */}
            {tab === "部署別分析" && (
              <div className="space-y-6">
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(deptGrouped)
                    .sort(([, a], [, b]) => b.length - a.length)
                    .map(([dept, members]) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedDept(dept)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                        selectedDept === dept
                          ? "bg-blue-600 text-white shadow"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {dept}（{members.length}名）
                    </button>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-[14px] font-bold text-gray-700 mb-4">
                      {selectedDept} vs 全社平均
                    </h3>
                    <Radar data={deptRadarData} options={radarOpts} />
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-[14px] font-bold text-gray-700 mb-4">
                      {selectedDept}の人物タイプ
                    </h3>
                    <div className="space-y-2">
                      {(() => {
                        const members = deptGrouped[selectedDept] || [];
                        const counts: Record<string, number> = {};
                        members.forEach((m) => {
                          if (m.personality_type) counts[m.personality_type] = (counts[m.personality_type] || 0) + 1;
                        });
                        return Object.entries(counts)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([type, count]) => (
                            <div key={type} className="flex items-center gap-3">
                              <span className="text-[11px] font-semibold text-gray-700 w-[160px] truncate">{type}</span>
                              <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400 rounded-full"
                                  style={{ width: `${(count / members.length) * 100}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-blue-600 w-8 text-right">{count}</span>
                            </div>
                          ));
                      })()}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-[12px] font-bold text-gray-500 mb-2">メンバー一覧</h4>
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {(deptGrouped[selectedDept] || []).map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-[11px] py-1">
                            <span className="text-gray-700">{m.name}</span>
                            <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {m.personality_type?.replace(/（.*）/, "")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ハイパフォーマー分析 */}
            {tab === "ハイパフォーマー" && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-4">
                    ハイパフォーマーTOP10 vs 全社平均
                  </h3>
                  <Radar data={hpRadarData} options={radarOpts} />
                  <div className="mt-4 bg-amber-50 rounded-lg p-3">
                    <div className="text-[11px] font-bold text-amber-700 mb-1">HPの特徴</div>
                    <div className="text-[10px] text-amber-600 leading-relaxed">
                      {(() => {
                        const top10 = hpRanking.slice(0, 10);
                        const orgAvg = avgTraits(mikiwame, RADAR_TRAITS);
                        const hpAvg = avgTraits(top10, RADAR_TRAITS);
                        const diffs = RADAR_TRAITS.map((k, i) => ({
                          trait: MIKIWAME_TRAIT_LABELS[k],
                          diff: hpAvg[i] - orgAvg[i],
                        })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
                        return diffs.slice(0, 4).map((d) =>
                          `${d.trait}: ${d.diff > 0 ? "+" : ""}${d.diff.toFixed(1)}pt`
                        ).join(" / ");
                      })()}
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-4">
                    HPスコアランキングTOP20
                  </h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {hpRanking.map((m, i) => (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                        <span className={`text-[12px] font-extrabold w-6 text-center ${
                          i < 3 ? "text-amber-500" : "text-gray-400"
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-gray-800 truncate">{m.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">
                            {m.department} {m.role ? `/ ${m.role}` : ""}
                          </div>
                        </div>
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {m.personality_type?.replace(/（.*）/, "")}
                        </span>
                        <div className="text-right">
                          <div className="text-[14px] font-extrabold text-amber-600">
                            {typeof m.match_scores?.hp_all === "number"
                              ? (m.match_scores.hp_all as number).toFixed(1)
                              : "-"}
                          </div>
                          <div className="text-[9px] text-gray-400">HP全社</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                  <h3 className="text-[14px] font-bold text-amber-800 mb-3">
                    ハイパフォーマーペルソナ
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const top10 = hpRanking.slice(0, 10);
                      const typeCounts: Record<string, number> = {};
                      top10.forEach((m) => {
                        if (m.personality_type) typeCounts[m.personality_type] = (typeCounts[m.personality_type] || 0) + 1;
                      });
                      const topType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0];
                      const avgCulture = avgScore(top10, "culture");
                      const avgStability = avgScore(top10, "stability");
                      const avgHpBu = avgScore(top10, "hp_bu");
                      return [
                        { label: "最多タイプ", value: topType ? topType[0].replace(/（.*）/, "") : "-", sub: topType ? `${topType[1]}/${top10.length}名` : "" },
                        { label: "組織風土適合", value: avgCulture.toString(), sub: "平均スコア" },
                        { label: "安定度", value: avgStability.toString(), sub: "平均スコア" },
                        { label: "事業部HP度", value: avgHpBu.toString(), sub: "平均スコア" },
                      ].map((item) => (
                        <div key={item.label} className="bg-white/70 rounded-lg p-3 text-center">
                          <div className="text-[10px] text-amber-600 font-bold mb-1">{item.label}</div>
                          <div className="text-[16px] font-extrabold text-gray-800">{item.value}</div>
                          <div className="text-[9px] text-gray-400">{item.sub}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* 候補者フィット */}
            {tab === "候補者フィット" && (
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-3">候補者を選択</h3>
                  <select
                    value={selectedCandidateId}
                    onChange={(e) => setSelectedCandidateId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[12px] outline-none bg-white mb-3"
                  >
                    <option value="">選択してください</option>
                    {uniqueCandidates.map((p) => {
                      const c = p.candidate as Candidate | undefined;
                      return (
                        <option key={p.candidate_id} value={p.candidate_id}>
                          {c?.name} ({c?.source})
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => selectedCandidateId && analyzeFit(selectedCandidateId)}
                    disabled={aiLoading || !selectedCandidateId}
                    className="w-full text-[12px] font-bold text-white bg-indigo-600 px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {aiLoading ? "分析中..." : "フィット分析を実行"}
                  </button>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="text-[10px] text-gray-400 font-bold mb-2">分析に使用するデータ</div>
                    <div className="space-y-1 text-[10px] text-gray-500">
                      <div>MIKIWAME受検者: {mikiwame.length}名</div>
                      <div>人物タイプ: {typeDistribution.length}種類</div>
                      <div>HPランキング: TOP{Math.min(hpRanking.length, 5)}</div>
                      <div>性格特性: {RADAR_TRAITS.length}指標</div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <h3 className="text-[14px] font-bold text-gray-700 mb-3">AI フィット分析結果</h3>
                  {!fitResult && !aiLoading && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-3">🧬</div>
                      <div className="text-[12px]">候補者を選択してフィット分析を実行</div>
                      <div className="text-[10px] mt-1">MIKIWAME実データに基づくAI分析</div>
                    </div>
                  )}
                  {aiLoading && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2 animate-pulse">🧬</div>
                      <div className="text-[12px]">AIがMIKIWAMEデータと照合中...</div>
                    </div>
                  )}
                  {fitResult && (
                    <div className="text-[12px] text-gray-600 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                      {fitResult}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

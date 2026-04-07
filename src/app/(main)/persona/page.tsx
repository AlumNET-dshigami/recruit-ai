"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

const TABS = ["ペルソナ生成", "ペルソナ一覧", "インサイト分析"] as const;

interface SavedPersona {
  jobId: string;
  jobTitle: string;
  content: string;
  createdAt: string;
}

export default function PersonaPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [personas, setPersonas] = useState<SavedPersona[]>([]);
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const [kpis, setKpis] = useState({ personaCount: 0, openJobs: 0, hiredCount: 0, avgScore: 0 });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: jb }, { data: pl }] = await Promise.all([
      supabase.from("jobs").select("*").eq("status", "open"),
      supabase.from("pipeline").select("stage, score"),
    ]);
    const jobList = (jb || []) as Job[];
    setJobs(jobList);
    if (jobList.length > 0) setSelectedJob(jobList[0].id);

    const hired = (pl || []).filter(p => p.stage === "hired");
    const scores = (pl || []).filter(p => p.score).map(p => p.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // Load saved personas
    const saved: SavedPersona[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("persona-")) {
        try { saved.push(JSON.parse(localStorage.getItem(key)!)); } catch {}
      }
    }
    setPersonas(saved);

    setKpis({ personaCount: saved.length, openJobs: jobList.length, hiredCount: hired.length, avgScore });
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const generatePersona = async () => {
    const job = jobs.find(j => j.id === selectedJob);
    if (!job) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の求人情報からターゲット候補者のペルソナを3パターン設計してください。

【求人】${job.title}
【部門】${job.department}
【職務内容】${job.description || "記載なし"}
【要件】${job.requirements || "記載なし"}
【年収レンジ】${job.salary_range || "記載なし"}

各ペルソナについて以下を出力:
1. ペルソナ名（架空の人物像）
2. 現在のキャリア背景（経験年数・現職・スキル）
3. 価値観・優先事項（何を重視して転職するか）
4. 転職動機（なぜ今動くのか）
5. アプローチ戦略（どのチャネル・メッセージが響くか）
6. キーメッセージ（この人に刺さる訴求ポイント3つ）

パターンA: 即戦力型（経験豊富・業界経験あり）
パターンB: ポテンシャル型（成長意欲が高い・異業種経験）
パターンC: カルチャーフィット型（価値観重視・組織貢献志向）`,
          systemPrompt: "あなたは採用ペルソナ設計の専門家です。求人情報を分析し、ターゲットとなる候補者像を具体的かつ実用的に設計してください。各ペルソナは採用チームがスカウトや求人票作成に直接活用できるレベルの詳細さで出力してください。",
        }),
      });
      const data = await res.json();
      setResult(data.text || "生成できませんでした");
    } catch {
      setResult("エラーが発生しました");
    }
    setGenerating(false);
  };

  const savePersona = () => {
    if (!result || !selectedJob) return;
    const job = jobs.find(j => j.id === selectedJob);
    const persona: SavedPersona = {
      jobId: selectedJob,
      jobTitle: job?.title || "不明",
      content: result,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(`persona-${selectedJob}-${Date.now()}`, JSON.stringify(persona));
    setPersonas(prev => [...prev, persona]);
    setKpis(prev => ({ ...prev, personaCount: prev.personaCount + 1 }));
  };

  const deletePersona = (idx: number) => {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("persona-")) keys.push(key);
    }
    if (keys[idx]) {
      localStorage.removeItem(keys[idx]);
      setPersonas(prev => prev.filter((_, i) => i !== idx));
      setKpis(prev => ({ ...prev, personaCount: prev.personaCount - 1 }));
    }
  };

  const runInsight = async () => {
    setInsightLoading(true);
    try {
      const { data } = await supabase
        .from("pipeline")
        .select("stage, score, candidate:candidates(source, experience_years, skills)")
        .eq("stage", "hired");
      const summary = (data || []).map((p: Record<string, unknown>) => {
        const c = p.candidate as Record<string, unknown> | null;
        return `ソース:${c?.source || "不明"}, 経験:${c?.experience_years || "?"}年, スコア:${p.score || "?"}`;
      }).join("\n");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の採用成功データからペルソナ改善に活かせるインサイトを抽出してください:\n${summary || "データなし"}\n\n分析してほしいこと:\n1. どのソース（媒体）から優秀な人材が採用できているか\n2. 採用成功者のスコア帯の傾向\n3. 経験年数の傾向\n4. ペルソナ設計への改善提案`,
          systemPrompt: "あなたは採用データ分析の専門家です。データからペルソナ設計に活かせる実用的なインサイトを抽出してください。",
        }),
      });
      const d = await res.json();
      setInsight(d.text || "分析できませんでした");
    } catch {
      setInsight("エラーが発生しました");
    }
    setInsightLoading(false);
  };

  const kpiCards = [
    { label: "登録ペルソナ", value: kpis.personaCount, unit: "件", color: "text-purple-600" },
    { label: "オープン求人", value: kpis.openJobs, unit: "件", color: "text-blue-600" },
    { label: "採用成功数", value: kpis.hiredCount, unit: "名", color: "text-green-600" },
    { label: "平均スコア", value: kpis.avgScore, unit: "pt", color: "text-orange-600" },
  ];

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ペルソナ設計</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpiCards.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}<span className="text-sm text-gray-400 ml-1">{k.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{t}</button>
        ))}
      </div>

      {tab === "ペルソナ生成" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">JDからペルソナを自動設計</h3>
          <p className="text-sm text-gray-500 mb-4">求人情報を基に、即戦力型・ポテンシャル型・カルチャーフィット型の3パターンを生成します。</p>
          <div className="flex gap-3 mb-4">
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.department})</option>)}
            </select>
            <button onClick={generatePersona} disabled={generating || !selectedJob} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {generating ? "生成中..." : "AIペルソナを生成"}
            </button>
          </div>
          {result && (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm whitespace-pre-wrap mb-3">{result}</div>
              <button onClick={savePersona} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">保存する</button>
            </>
          )}
        </div>
      )}

      {tab === "ペルソナ一覧" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">保存済みペルソナ</h3>
          {personas.length === 0 ? (
            <p className="text-gray-400 text-sm">まだペルソナが保存されていません</p>
          ) : (
            <div className="space-y-4">
              {personas.map((p, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{p.jobTitle}</div>
                      <div className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("ja-JP")}</div>
                    </div>
                    <button onClick={() => deletePersona(i)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                  </div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{p.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "インサイト分析" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">採用データからインサイト抽出</h3>
          <p className="text-sm text-gray-500 mb-4">採用成功者のデータを分析し、ペルソナ設計の改善に活かします。</p>
          <button onClick={runInsight} disabled={insightLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4">
            {insightLoading ? "分析中..." : "候補者データからインサイト抽出"}
          </button>
          {insight && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm whitespace-pre-wrap">{insight}</div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

const TABS = ["テンプレート生成", "再送設計", "テンプレート一覧", "Playbook"] as const;
const SCOUT_PLATFORMS = ["BizReach", "Green", "Wantedly", "LinkedIn", "doda"] as const;
const TONES = ["カジュアル", "プロフェッショナル", "熱意型"] as const;

interface ScoutTemplate {
  id: string;
  jobId: string;
  jobTitle: string;
  platform: string;
  tone: string;
  content: string;
  createdAt: string;
}

interface SeriesSet {
  templateId: string;
  jobTitle: string;
  platform: string;
  messages: { num: number; timing: string; angle: string; content: string }[];
  createdAt: string;
}

const DEFAULT_PLAYBOOK: Record<string, { tips: string[]; subjectPatterns: string[]; sendTimes: string }> = {
  BizReach: {
    tips: ["件名は20文字以内が最適", "ファーストビュー3行が開封後の勝負", "年収レンジを明記すると返信率UP", "送信者名義は役職者が効果的"],
    subjectPatterns: ["【年収○○万〜】○○ポジション", "【○○経験者限定】△△のご案内", "○○様のご経歴を拝見し..."],
    sendTimes: "火〜木 10:00-11:00 が開封率最高",
  },
  Green: {
    tips: ["技術スタックを冒頭に記載", "カジュアル面談への誘導が効果的", "プロジェクト事例を具体的に", "エンジニア目線の言葉遣いを意識"],
    subjectPatterns: ["【Go/React】○○の開発チームから", "○○さんの△△経験に興味があります", "【カジュアル面談】○○について話しませんか"],
    sendTimes: "月・水 12:00-13:00 ランチタイムが効果的",
  },
  Wantedly: {
    tips: ["共感ベースのストーリーを前面に", "会社のミッション・ビジョンを軸に", "カジュアルなトーンで親近感を", "「話を聞きに行きたい」のハードルを下げる"],
    subjectPatterns: ["○○を変えたいエンジニア募集", "私たちが○○に挑戦する理由", "一緒に○○を作りませんか？"],
    sendTimes: "平日夕方 18:00-19:00 が効果的",
  },
  LinkedIn: {
    tips: ["英語対応推奨（バイリンガル含む）", "グローバル視点での訴求", "簡潔なbullet pointsで", "プロフィールの具体的な経歴に言及"],
    subjectPatterns: ["Exciting opportunity at [Company]", "Your experience in [X] caught our eye", "[Role] - Let's connect"],
    sendTimes: "火〜木 9:00-10:00 (JST)",
  },
  doda: {
    tips: ["安定性・福利厚生を訴求", "ワークライフバランス重視の層に響く", "具体的な働き方（リモート等）を明記", "転職理由に寄り添うトーン"],
    subjectPatterns: ["【リモート可】○○ポジションのご案内", "○○様のご経験を活かせる環境があります", "【WLB重視】△△でのキャリア"],
    sendTimes: "水・木 11:00-12:00",
  },
};

export default function ScoutPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [platform, setPlatform] = useState<string>(SCOUT_PLATFORMS[0]);
  const [tone, setTone] = useState<string>(TONES[0]);
  const [whyYou, setWhyYou] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [templates, setTemplates] = useState<ScoutTemplate[]>([]);
  const [seriesList, setSeriesList] = useState<SeriesSet[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [seriesGenerating, setSeriesGenerating] = useState(false);
  const [seriesResult, setSeriesResult] = useState<SeriesSet | null>(null);
  const [playbook, setPlaybook] = useState(DEFAULT_PLAYBOOK);

  const loadTemplates = useCallback(() => {
    const raw = localStorage.getItem("scout-templates");
    const list: ScoutTemplate[] = raw ? JSON.parse(raw) : [];
    setTemplates(list);
    const rawSeries = localStorage.getItem("scout-series");
    const sList: SeriesSet[] = rawSeries ? JSON.parse(rawSeries) : [];
    setSeriesList(sList);
    const rawPb = localStorage.getItem("scout-playbook");
    if (rawPb) { try { setPlaybook(JSON.parse(rawPb)); } catch {} }
    return list;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: jb } = await supabase.from("jobs").select("*").eq("status", "open");
    const jobList = (jb || []) as Job[];
    setJobs(jobList);
    if (jobList.length > 0) setSelectedJob(jobList[0].id);
    loadTemplates();
    setLoading(false);
  }, [loadTemplates]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateTemplate = async () => {
    const job = jobs.find(j => j.id === selectedJob);
    if (!job) return;
    setGenerating(true);
    try {
      const pb = playbook[platform];
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の条件でスカウトメッセージのテンプレートを生成してください。

【求人】${job.title} (${job.department})
【職務内容】${job.description || "記載なし"}
【要件】${job.requirements || "記載なし"}
【媒体】${platform}
【トーン】${tone}
【媒体Tips】${pb?.tips.join(" / ") || "なし"}
【件名パターン例】${pb?.subjectPatterns.join(" / ") || "なし"}

出力形式:
■ 件名（${platform}最適化）
■ 本文
  - 冒頭フック（3行以内で興味を引く）
  - 【★ Why You ★】← ここに個別メッセージを入れるスペースを明示
  - 会社・ポジションの魅力（3ポイント）
  - CTA（次のアクション）
■ 送信タイミング推奨`,
          systemPrompt: `あなたは${platform}でのスカウト運用に精通した採用マーケターです。開封率・返信率を最大化するスカウトメッセージを${tone}トーンで作成してください。`,
        }),
      });
      const data = await res.json();
      setResult(data.text || "生成できませんでした");
    } catch {
      setResult("エラーが発生しました");
    }
    setGenerating(false);
  };

  const saveTemplate = () => {
    if (!result) return;
    const job = jobs.find(j => j.id === selectedJob);
    const tpl: ScoutTemplate = {
      id: `${Date.now()}`, jobId: selectedJob, jobTitle: job?.title || "不明",
      platform, tone, content: result, createdAt: new Date().toISOString(),
    };
    const updated = [...templates, tpl];
    setTemplates(updated);
    localStorage.setItem("scout-templates", JSON.stringify(updated));
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    localStorage.setItem("scout-templates", JSON.stringify(updated));
  };

  const generateSeries = async () => {
    const tpl = templates.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    setSeriesGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下のスカウトテンプレートをベースに、初回＋再送2回の計3通シリーズを設計してください。

【元テンプレート】
${tpl.content}

【媒体】${tpl.platform}
【求人】${tpl.jobTitle}

各通で異なる切り口を使い、以下の形式で出力:
━━━ 1通目（初回アプローチ）━━━
[内容]

━━━ 2通目（3日後・別角度からの訴求）━━━
[内容]

━━━ 3通目（7日後・最後のアプローチ）━━━
[内容]

注意: 各通は独立して読めるように。2通目は技術/プロジェクト視点、3通目は緊急性やキャリア視点で。`,
          systemPrompt: "あなたはスカウト再送戦略の専門家です。3通シリーズで返信率を最大化する設計をしてください。",
        }),
      });
      const data = await res.json();
      const text = data.text || "";
      const series: SeriesSet = {
        templateId: tpl.id, jobTitle: tpl.jobTitle, platform: tpl.platform,
        messages: [
          { num: 1, timing: "初回送信", angle: "最初のアプローチ", content: text },
        ],
        createdAt: new Date().toISOString(),
      };
      setSeriesResult(series);
      const updated = [...seriesList, series];
      setSeriesList(updated);
      localStorage.setItem("scout-series", JSON.stringify(updated));
    } catch {
      setSeriesResult(null);
    }
    setSeriesGenerating(false);
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  const kpiCards = [
    { label: "保存テンプレート", value: templates.length, unit: "件", color: "text-amber-600" },
    { label: "対応媒体数", value: SCOUT_PLATFORMS.length, unit: "", color: "text-blue-600" },
    { label: "生成シリーズ", value: seriesList.length, unit: "件", color: "text-green-600" },
    { label: "最終生成日", value: templates.length > 0 ? new Date(templates[templates.length - 1].createdAt).toLocaleDateString("ja-JP") : "---", unit: "", color: "text-purple-600" },
  ];

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">スカウトテンプレート生成</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpiCards.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}<span className="text-sm text-gray-400 ml-1">{k.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{t}</button>
        ))}
      </div>

      {tab === "テンプレート生成" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">スカウトメッセージ生成</h3>
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {SCOUT_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={tone} onChange={e => setTone(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              {TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Why You（個別メッセージ）</label>
            <textarea value={whyYou} onChange={e => setWhyYou(e.target.value)} rows={3} placeholder="この候補者に送る理由を記入（テンプレートの★マーク部分に挿入されます）" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={generateTemplate} disabled={generating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {generating ? "生成中..." : "スカウトテンプレート生成"}
          </button>
          {result && (
            <div className="mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm whitespace-pre-wrap mb-3">{result}</div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(result)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">コピー</button>
                <button onClick={saveTemplate} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">保存</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "再送設計" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">3通シリーズ生成（初回＋再送2回）</h3>
          <p className="text-sm text-gray-500 mb-4">保存済みテンプレートから、異なる切り口の再送メッセージを自動設計します。</p>
          <div className="flex gap-3 mb-4">
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm">
              <option value="">テンプレートを選択...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.jobTitle} ({t.platform})</option>)}
            </select>
            <button onClick={generateSeries} disabled={seriesGenerating || !selectedTemplate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {seriesGenerating ? "生成中..." : "3通シリーズ生成"}
            </button>
          </div>
          {seriesResult && (
            <div className="space-y-4">
              {seriesResult.messages.map((m, i) => (
                <div key={i} className="border-l-4 border-blue-400 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">{i + 1}通目</span>
                    <span className="text-xs text-gray-400">{m.timing}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "テンプレート一覧" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">保存済みテンプレート</h3>
          {templates.length === 0 ? (
            <p className="text-gray-400 text-sm">まだテンプレートが保存されていません</p>
          ) : (
            <div className="space-y-3">
              {templates.map(t => (
                <div key={t.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{t.jobTitle}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{t.platform}</span>
                      <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{t.tone}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => copyToClipboard(t.content)} className="text-xs text-blue-500">コピー</button>
                      <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400">削除</button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 max-h-20 overflow-hidden">{t.content.slice(0, 150)}...</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "Playbook" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">媒体別スカウトPlaybook</h3>
          <div className="space-y-6">
            {SCOUT_PLATFORMS.map(p => {
              const pb = playbook[p] || DEFAULT_PLAYBOOK[p];
              if (!pb) return null;
              return (
                <div key={p} className="border rounded-lg p-4">
                  <h4 className="font-bold text-sm mb-3">{p}</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">運用Tips</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {pb.tips.map((tip, i) => <li key={i}>- {tip}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">件名パターン</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {pb.subjectPatterns.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">最適送信時間</div>
                      <p className="text-xs text-gray-600">{pb.sendTimes}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

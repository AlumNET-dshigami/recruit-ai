"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

const TABS = ["一括変換", "媒体別プレビュー", "フォーマット設定"] as const;

const PLATFORMS = [
  { id: "bizreach", name: "BizReach", desc: "プロフェッショナル向け。年収・要件を詳細に", color: "bg-blue-100 text-blue-700" },
  { id: "green", name: "Green", desc: "IT/Web特化。技術スタック・プロジェクト詳細重視", color: "bg-green-100 text-green-700" },
  { id: "wantedly", name: "Wantedly", desc: "共感型4セクション構成。ストーリー重視", color: "bg-pink-100 text-pink-700" },
  { id: "doda", name: "doda", desc: "幅広い層向け。福利厚生・WLB訴求", color: "bg-orange-100 text-orange-700" },
  { id: "msjapan", name: "MS-Japan", desc: "管理部門・士業特化。キャリアパス重視", color: "bg-purple-100 text-purple-700" },
  { id: "linkedin", name: "LinkedIn", desc: "グローバル視点。英語対応・簡潔なbullet points", color: "bg-cyan-100 text-cyan-700" },
] as const;

const DEFAULT_FORMATS: Record<string, string> = {
  bizreach: "【BizReach形式】\n- トーン: プロフェッショナル・フォーマル\n- 構成: 募集背景/業務内容/必須要件/歓迎要件/年収/福利厚生\n- 特徴: 年収レンジを明確に記載。ハイクラス候補者向けの訴求",
  green: "【Green形式】\n- トーン: カジュアル〜プロフェッショナル\n- 構成: 募集背景/業務内容/技術スタック/開発環境/チーム構成/選考フロー\n- 特徴: 技術詳細を具体的に。プロジェクト事例を含める",
  wantedly: "【Wantedly形式】\n- トーン: 共感・ストーリーテリング\n- 構成: なにをやっているのか/なぜやるのか/どうやっているのか/こんなことやります\n- 特徴: ミッション共感型。会社のビジョンを前面に",
  doda: "【doda形式】\n- トーン: スタンダード・安心感\n- 構成: 仕事内容/応募資格/給与/勤務地/福利厚生/休日休暇\n- 特徴: 福利厚生とワークライフバランスを充実させる",
  msjapan: "【MS-Japan形式】\n- トーン: フォーマル・専門性重視\n- 構成: ポジション概要/業務詳細/必須スキル/歓迎スキル/キャリアパス/待遇\n- 特徴: キャリアパスと専門性の成長を訴求",
  linkedin: "【LinkedIn形式】\n- トーン: グローバル・簡潔\n- 構成: About the Role/Responsibilities/Requirements/Nice to Have/Benefits\n- 特徴: 英語対応可能。Bullet pointsで簡潔に",
};

interface ConvertedPosting {
  jobId: string;
  jobTitle: string;
  platform: string;
  content: string;
  createdAt: string;
}

export default function JobConvertPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<{ platform: string; content: string }[]>([]);
  const [saved, setSaved] = useState<ConvertedPosting[]>([]);
  const [previewPlatform, setPreviewPlatform] = useState<string>(PLATFORMS[0].id);
  const [formats, setFormats] = useState<Record<string, string>>(DEFAULT_FORMATS);
  const [kpis, setKpis] = useState({ openJobs: 0, convertedCount: 0, platforms: 6, lastDate: "" });

  const loadSaved = useCallback(() => {
    const items: ConvertedPosting[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("converted-")) {
        try { items.push(JSON.parse(localStorage.getItem(key)!)); } catch {}
      }
    }
    setSaved(items);
    const customFormats = localStorage.getItem("job-convert-formats");
    if (customFormats) { try { setFormats(JSON.parse(customFormats)); } catch {} }
    return items;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: jb } = await supabase.from("jobs").select("*").eq("status", "open");
    const jobList = (jb || []) as Job[];
    setJobs(jobList);
    if (jobList.length > 0) setSelectedJob(jobList[0].id);
    const items = loadSaved();
    const lastDate = items.length > 0 ? items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt : "";
    setKpis({ openJobs: jobList.length, convertedCount: items.length, platforms: 6, lastDate });
    setLoading(false);
  }, [loadSaved]);

  useEffect(() => { loadData(); }, [loadData]);

  const togglePlatform = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const convertAll = async () => {
    const job = jobs.find(j => j.id === selectedJob);
    if (!job) return;
    const targets = PLATFORMS.filter(p => checked[p.id]);
    if (targets.length === 0) return;

    setConverting(true);
    setResults([]);
    const newResults: { platform: string; content: string }[] = [];

    for (let i = 0; i < targets.length; i++) {
      const platform = targets[i];
      setProgress(`${platform.name}変換中... (${i + 1}/${targets.length})`);
      try {
        const format = formats[platform.id] || DEFAULT_FORMATS[platform.id];
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `以下の求人情報を「${platform.name}」のフォーマットに変換してください。

【求人タイトル】${job.title}
【部門】${job.department}
【職務内容】${job.description || "記載なし"}
【要件】${job.requirements || "記載なし"}
【年収】${job.salary_range || "記載なし"}
【勤務地】${job.location || "記載なし"}

【変換フォーマット】
${format}`,
            systemPrompt: `あなたは${platform.name}に精通した求人票ライターです。媒体の特性とユーザー層を理解した上で、最適な形式・トーンで求人票を作成してください。`,
          }),
        });
        const data = await res.json();
        const content = data.text || "変換失敗";
        newResults.push({ platform: platform.name, content });

        const posting: ConvertedPosting = {
          jobId: job.id, jobTitle: job.title, platform: platform.id, content, createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`converted-${job.id}-${platform.id}`, JSON.stringify(posting));
      } catch {
        newResults.push({ platform: platform.name, content: "エラーが発生しました" });
      }
    }
    setResults(newResults);
    setProgress("");
    setConverting(false);
    loadSaved();
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  const saveFormats = () => {
    localStorage.setItem("job-convert-formats", JSON.stringify(formats));
  };

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">媒体別求人票変換</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">マスター求人数</div>
          <div className="text-2xl font-bold text-blue-600">{kpis.openJobs}<span className="text-sm text-gray-400 ml-1">件</span></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">変換済み求人</div>
          <div className="text-2xl font-bold text-green-600">{kpis.convertedCount}<span className="text-sm text-gray-400 ml-1">件</span></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">対応媒体数</div>
          <div className="text-2xl font-bold text-purple-600">{kpis.platforms}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">最終変換日</div>
          <div className="text-lg font-bold text-orange-600">{kpis.lastDate ? new Date(kpis.lastDate).toLocaleDateString("ja-JP") : "---"}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{t}</button>
        ))}
      </div>

      {tab === "一括変換" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">マスター求人 → 媒体別一括変換</h3>
          <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-4">
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title} ({j.department})</option>)}
          </select>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {PLATFORMS.map(p => (
              <label key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${checked[p.id] ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="checkbox" checked={!!checked[p.id]} onChange={() => togglePlatform(p.id)} className="mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-gray-400">{p.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <button onClick={convertAll} disabled={converting || Object.values(checked).filter(Boolean).length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {converting ? progress : "選択媒体に一括変換"}
          </button>

          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              {results.map((r, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLATFORMS.find(p => p.name === r.platform)?.color || "bg-gray-100"}`}>{r.platform}</span>
                    <button onClick={() => copyToClipboard(r.content)} className="text-xs text-blue-500 hover:text-blue-700">コピー</button>
                  </div>
                  <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">{r.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "媒体別プレビュー" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">変換済み求人票プレビュー</h3>
          <div className="flex gap-2 mb-4 flex-wrap">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPreviewPlatform(p.id)} className={`px-3 py-1.5 rounded text-xs font-medium transition ${previewPlatform === p.id ? p.color : "bg-gray-100 text-gray-500"}`}>{p.name}</button>
            ))}
          </div>
          {(() => {
            const items = saved.filter(s => s.platform === previewPlatform);
            return items.length === 0 ? (
              <p className="text-gray-400 text-sm">この媒体の変換済みデータはありません</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{item.jobTitle}</span>
                      <button onClick={() => copyToClipboard(item.content)} className="text-xs text-blue-500 hover:text-blue-700">コピー</button>
                    </div>
                    <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto bg-gray-50 rounded p-3">{item.content}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {tab === "フォーマット設定" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">媒体別フォーマット定義</h3>
          <p className="text-sm text-gray-500 mb-4">各媒体の変換ルールをカスタマイズできます。</p>
          <div className="space-y-4">
            {PLATFORMS.map(p => (
              <div key={p.id}>
                <label className="block text-sm font-medium mb-1">{p.name}</label>
                <textarea value={formats[p.id] || ""} onChange={e => setFormats(prev => ({ ...prev, [p.id]: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={saveFormats} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">設定を保存</button>
        </div>
      )}
    </div>
  );
}

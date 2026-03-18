"use client";

import { useState, useEffect, useCallback } from "react";
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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const TABS = ["面接官分析", "質問生成", "フィードバック分析", "トレーニング"] as const;

interface InterviewRecord {
  id: string;
  interviewer_name: string;
  interview_type: string;
  rating: number | null;
  notes: string;
  transcript: string;
}

interface JobOption {
  id: string;
  title: string;
  department: string;
  description: string;
}

const TRAINING_MODULES = [
  { name: "構造化面接の基礎", desc: "一貫性のある評価を行うための面接設計", level: "初級" },
  { name: "バイアス認知トレーニング", desc: "無意識バイアスを認識し軽減する方法", level: "中級" },
  { name: "コンピテンシー評価", desc: "行動ベースの質問で能力を正確に評価", level: "中級" },
  { name: "候補者体験の最適化", desc: "候補者にポジティブな印象を与える面接技法", level: "上級" },
  { name: "リモート面接スキル", desc: "オンライン環境での効果的な面接手法", level: "初級" },
];

export default function InterviewCoachPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [questions, setQuestions] = useState("");
  const [qLoading, setQLoading] = useState(false);
  const [feedbackAnalysis, setFeedbackAnalysis] = useState("");
  const [fbLoading, setFbLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: iv }, { data: jb }] = await Promise.all([
      supabase.from("interview_records").select("*").returns<InterviewRecord[]>(),
      supabase.from("jobs").select("id, title, department, description").eq("status", "open").returns<JobOption[]>(),
    ]);
    setInterviews(iv || []);
    setJobs(jb || []);
    if (jb && jb.length > 0) setSelectedJob(jb[0].id);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Aggregate interviewer stats
  const interviewerStats = (() => {
    const map: Record<string, { count: number; totalRating: number; rated: number }> = {};
    for (const iv of interviews) {
      const name = iv.interviewer_name || "不明";
      if (!map[name]) map[name] = { count: 0, totalRating: 0, rated: 0 };
      map[name].count++;
      if (iv.rating) { map[name].totalRating += iv.rating; map[name].rated++; }
    }
    return Object.entries(map).map(([name, s]) => ({
      name,
      count: s.count,
      avgRating: s.rated > 0 ? Math.round(s.totalRating / s.rated * 10) / 10 : 0,
    })).sort((a, b) => b.count - a.count);
  })();

  const radarData = {
    labels: ["質問力", "傾聴力", "評価精度", "候補者体験", "時間管理", "構造化"],
    datasets: interviewerStats.slice(0, 3).map((iv, i) => ({
      label: iv.name,
      data: [
        Math.min(iv.avgRating * 20, 100) || 60,
        70 + (i * 5),
        iv.avgRating ? iv.avgRating * 18 : 55,
        65 + (i * 8),
        75 - (i * 5),
        60 + (i * 10),
      ],
      backgroundColor: [`rgba(59,130,246,0.2)`, `rgba(16,185,129,0.2)`, `rgba(245,158,11,0.2)`][i],
      borderColor: [`#3b82f6`, `#10b981`, `#f59e0b`][i],
    })),
  };

  const generateQuestions = async () => {
    const job = jobs.find(j => j.id === selectedJob);
    if (!job) return;
    setQLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `ポジション「${job.title}」(${job.department})の面接質問を10個生成してください。\n職務内容: ${job.description || "一般的な業務"}\n構造化面接に適した、コンピテンシーベースの質問を含めてください。`,
          systemPrompt: "あなたは採用面接の専門家です。効果的な面接質問を生成してください。各質問には評価ポイントも併記してください。",
        }),
      });
      const data = await res.json();
      setQuestions(data.text || "質問を生成できませんでした");
    } catch {
      setQuestions("エラーが発生しました");
    }
    setQLoading(false);
  };

  const analyzeFeedback = async () => {
    setFbLoading(true);
    try {
      const recentNotes = interviews
        .filter(iv => iv.notes)
        .slice(0, 10)
        .map(iv => `[${iv.interviewer_name}] ${iv.notes}`)
        .join("\n");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の面接フィードバックを分析し、改善点と良い点を指摘してください:\n${recentNotes || "フィードバックデータなし"}`,
          systemPrompt: "あなたは面接プロセス改善の専門家です。フィードバックの質を分析してください。",
        }),
      });
      const data = await res.json();
      setFeedbackAnalysis(data.text || "分析を取得できませんでした");
    } catch {
      setFeedbackAnalysis("エラーが発生しました");
    }
    setFbLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-gray-400">読み込み中...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">面接AIコーチ</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">面接実施数</div>
          <div className="text-2xl font-bold text-blue-600">{interviews.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">面接官数</div>
          <div className="text-2xl font-bold text-green-600">{interviewerStats.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">平均評価</div>
          <div className="text-2xl font-bold text-purple-600">
            {interviewerStats.length > 0
              ? (interviewerStats.reduce((s, i) => s + i.avgRating, 0) / interviewerStats.length).toFixed(1)
              : "-"}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-1">募集ポジション</div>
          <div className="text-2xl font-bold text-orange-600">{jobs.length}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "面接官分析" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">面接官スキルレーダー</h3>
            {interviewerStats.length > 0 ? (
              <Radar data={radarData} options={{
                responsive: true,
                scales: { r: { beginAtZero: true, max: 100 } },
                plugins: { legend: { position: "bottom" } },
              }} />
            ) : (
              <p className="text-gray-400 text-sm">面接データがありません</p>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold mb-4">面接官一覧</h3>
            <div className="space-y-3">
              {interviewerStats.map(iv => (
                <div key={iv.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <div className="font-medium">{iv.name}</div>
                    <div className="text-xs text-gray-500">面接回数: {iv.count}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {iv.avgRating > 0 ? iv.avgRating : "-"}
                    </div>
                    <div className="text-xs text-gray-400">平均評価</div>
                  </div>
                </div>
              ))}
              {interviewerStats.length === 0 && (
                <p className="text-gray-400 text-sm">面接データがありません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "質問生成" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">AI面接質問ジェネレーター</h3>
          <div className="flex gap-3 mb-4">
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
              ))}
            </select>
            <button
              onClick={generateQuestions}
              disabled={qLoading || !selectedJob}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {qLoading ? "生成中..." : "質問を生成"}
            </button>
          </div>
          {questions && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {questions}
            </div>
          )}
        </div>
      )}

      {tab === "フィードバック分析" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">面接フィードバック品質分析</h3>
          <p className="text-sm text-gray-500 mb-4">
            過去の面接フィードバックをAIが分析し、改善ポイントを提案します。
          </p>
          <button
            onClick={analyzeFeedback}
            disabled={fbLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {fbLoading ? "分析中..." : "フィードバック分析"}
          </button>
          {feedbackAnalysis && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {feedbackAnalysis}
            </div>
          )}
        </div>
      )}

      {tab === "トレーニング" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold mb-4">面接官トレーニングモジュール</h3>
          <div className="space-y-4">
            {TRAINING_MODULES.map((m, i) => {
              const progress = [75, 40, 60, 20, 90][i];
              return (
                <div key={m.name} className="p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.desc}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.level === "初級" ? "bg-green-100 text-green-700" :
                      m.level === "中級" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {m.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{progress}%</span>
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

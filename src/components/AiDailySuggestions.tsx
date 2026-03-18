"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { STAGE_LABELS } from "@/lib/types";

interface Suggestion {
  type: "warning" | "opportunity" | "action";
  title: string;
  detail: string;
}

export default function AiDailySuggestions() {
  const [open, setOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [aiStrategy, setAiStrategy] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    const items: Suggestion[] = [];

    // Check for stuck candidates (no stage change in 7+ days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: stuck } = await supabase
      .from("pipeline")
      .select("stage, candidate:candidates(name)")
      .lt("stage_changed_at", weekAgo)
      .not("stage", "in", "(hired,rejected)")
      .limit(5)
      .returns<{ stage: string; candidate: { name: string } | null }[]>();

    if (stuck && stuck.length > 0) {
      items.push({
        type: "warning",
        title: `${stuck.length}名の候補者が7日以上停滞中`,
        detail: stuck
          .map(s => `${s.candidate?.name || "不明"} (${STAGE_LABELS[s.stage as keyof typeof STAGE_LABELS] || s.stage})`)
          .join("、"),
      });
    }

    // Check interview stage candidates
    const { count: interviewCount } = await supabase
      .from("pipeline")
      .select("*", { count: "exact", head: true })
      .in("stage", ["interview1", "interview_final"]);

    if (interviewCount && interviewCount > 0) {
      items.push({
        type: "action",
        title: `${interviewCount}名が面接段階`,
        detail: "面接スケジュールの確認と評価シートの準備をおすすめします",
      });
    }

    // Check high-score candidates
    const { data: highScore } = await supabase
      .from("pipeline")
      .select("score, stage, candidate:candidates(name)")
      .gte("score", 80)
      .not("stage", "in", "(hired,rejected,offer)")
      .limit(3)
      .returns<{ score: number; stage: string; candidate: { name: string } | null }[]>();

    if (highScore && highScore.length > 0) {
      items.push({
        type: "opportunity",
        title: `${highScore.length}名の高評価候補者を確認`,
        detail: highScore
          .map(h => `${h.candidate?.name || "不明"} (スコア: ${h.score})`)
          .join("、"),
      });
    }

    // Check jobs with no candidates
    const { data: emptyJobs } = await supabase
      .from("jobs")
      .select("id, title")
      .eq("status", "open")
      .returns<{ id: string; title: string }[]>();

    if (emptyJobs) {
      const jobIds = emptyJobs.map(j => j.id);
      const { data: pipelineJobs } = await supabase
        .from("pipeline")
        .select("job_id")
        .in("job_id", jobIds)
        .not("stage", "eq", "rejected");

      const activeJobIds = new Set((pipelineJobs || []).map(p => p.job_id));
      const empty = emptyJobs.filter(j => !activeJobIds.has(j.id));
      if (empty.length > 0) {
        items.push({
          type: "warning",
          title: `${empty.length}件の求人に候補者なし`,
          detail: empty.map(j => j.title).slice(0, 3).join("、"),
        });
      }
    }

    if (items.length === 0) {
      items.push({
        type: "opportunity",
        title: "すべて順調です",
        detail: "現在対応が必要な緊急事項はありません",
      });
    }

    setSuggestions(items);
    setLoading(false);
  }, []);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const runAiStrategy = async () => {
    setAiLoading(true);
    try {
      const summary = suggestions.map(s => `[${s.type}] ${s.title}: ${s.detail}`).join("\n");
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の採用状況サマリーに基づき、今日の優先アクションを3つ提案してください:\n${summary}`,
          systemPrompt: "あなたは採用戦略アドバイザーです。具体的で実行可能なアクションを提案してください。",
        }),
      });
      const data = await res.json();
      setAiStrategy(data.text || "戦略を取得できませんでした");
    } catch {
      setAiStrategy("エラーが発生しました");
    }
    setAiLoading(false);
  };

  const typeStyles = {
    warning: { bg: "bg-red-50", border: "border-red-200", icon: "!!", color: "text-red-600" },
    opportunity: { bg: "bg-green-50", border: "border-green-200", icon: "★", color: "text-green-600" },
    action: { bg: "bg-blue-50", border: "border-blue-200", icon: "→", color: "text-blue-600" },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">AI日次サジェスション</span>
          {!loading && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
              {suggestions.length}件
            </span>
          )}
        </div>
        <span className="text-gray-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          {loading ? (
            <p className="text-gray-400 text-sm">分析中...</p>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                {suggestions.map((s, i) => {
                  const st = typeStyles[s.type];
                  return (
                    <div key={i} className={`${st.bg} ${st.border} border rounded-lg p-3`}>
                      <div className="flex items-start gap-2">
                        <span className={`${st.color} font-bold text-sm`}>{st.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{s.title}</div>
                          <div className="text-xs text-gray-600 mt-0.5">{s.detail}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={runAiStrategy}
                disabled={aiLoading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {aiLoading ? "AI分析中..." : "AI戦略アドバイスを取得"}
              </button>
              {aiStrategy && (
                <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {aiStrategy}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

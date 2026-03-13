"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

const EMPTY_JOB = {
  title: "",
  department: "",
  employment_type: "正社員",
  salary_range: "",
  location: "",
  status: "open" as const,
  description: "",
  requirements: "",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<Job> | null>(null);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const [jobsRes, pipelineRes] = await Promise.all([
      supabase.from("jobs").select("*").order("created_at", { ascending: false }),
      supabase.from("pipeline").select("job_id, stage"),
    ]);
    setJobs((jobsRes.data || []) as Job[]);

    const counts: Record<string, number> = {};
    (pipelineRes.data || []).forEach((p: { job_id: string; stage: string }) => {
      if (p.stage !== "rejected") {
        counts[p.job_id] = (counts[p.job_id] || 0) + 1;
      }
    });
    setPipelineCounts(counts);
    setLoading(false);
  }

  function openCreate() {
    setEditingJob({ ...EMPTY_JOB });
    setShowModal(true);
  }

  function openEdit(job: Job) {
    setEditingJob({ ...job });
    setShowModal(true);
  }

  async function saveJob() {
    if (!editingJob?.title) return;
    if (editingJob.id) {
      await supabase
        .from("jobs")
        .update({
          title: editingJob.title,
          department: editingJob.department,
          employment_type: editingJob.employment_type,
          salary_range: editingJob.salary_range,
          location: editingJob.location,
          status: editingJob.status,
          description: editingJob.description,
          requirements: editingJob.requirements,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingJob.id);
    } else {
      await supabase.from("jobs").insert([editingJob]);
    }
    setShowModal(false);
    setEditingJob(null);
    loadJobs();
  }

  async function aiGenerateJobDetails() {
    if (!editingJob?.title) return;
    setAiGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `以下の求人ポジションの詳細を生成してください。\n\nポジション名: ${editingJob.title}\n部門: ${editingJob.department || "未定"}\n年収レンジ: ${editingJob.salary_range || "未定"}\n勤務地: ${editingJob.location || "未定"}\n\n以下の形式でJSON形式で返してください（説明文はマークダウン不要、プレーンテキストで）:\n{"requirements": "必要なスキル・経験（箇条書き風に）", "description": "仕事内容の詳細（3-5行程度）"}`,
          systemPrompt: "あなたはIT・コンサル・人材業界に精通した求人票作成のプロです。魅力的かつ現実的な求人票を作成してください。JSON形式のみで返答してください。",
        }),
      });
      const data = await res.json();
      const text = data.text || "";
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setEditingJob((prev) => ({
            ...prev,
            requirements: parsed.requirements || prev?.requirements || "",
            description: parsed.description || prev?.description || "",
          }));
        }
      } catch {
        // JSONパース失敗時はそのままテキストを設定
        setEditingJob((prev) => ({ ...prev, description: text }));
      }
    } finally {
      setAiGenerating(false);
    }
  }

  async function toggleStatus(job: Job) {
    const next = job.status === "open" ? "paused" : "open";
    await supabase
      .from("jobs")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", job.id);
    loadJobs();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-gray-800">案件管理</h1>
          <button
            onClick={openCreate}
            className="px-5 py-2.5 bg-primary text-white text-[13.5px] font-bold rounded-lg hover:bg-primary-dark transition-colors"
          >
            + 新規案件
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {jobs.map((job) => {
            const statusColor =
              job.status === "open"
                ? "bg-emerald-100 text-emerald-700"
                : job.status === "paused"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-500";
            const statusLabel =
              job.status === "open" ? "募集中" : job.status === "paused" ? "一時停止" : "クローズ";
            return (
              <div
                key={job.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[15px] font-bold text-gray-800">
                      {job.title}
                    </h3>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      {job.department} / {job.employment_type}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-3 text-[12px] text-gray-500">
                  <span>{job.salary_range}</span>
                  <span>{job.location}</span>
                </div>

                <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
                  <span className="bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded">
                    候補者 {pipelineCounts[job.id] || 0}名
                  </span>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => openEdit(job)}
                    className="text-[12px] text-gray-500 hover:text-gray-700 font-semibold px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => toggleStatus(job)}
                    className="text-[12px] text-gray-500 hover:text-gray-700 font-semibold px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    {job.status === "open" ? "一時停止" : "再開"}
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/apply/${job.id}`;
                      navigator.clipboard.writeText(url);
                      setCopiedJobId(job.id);
                      setTimeout(() => setCopiedJobId(null), 2000);
                    }}
                    className={`text-[12px] font-semibold px-3 py-1.5 rounded-md transition-colors ml-auto ${
                      copiedJobId === job.id
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                    }`}
                  >
                    {copiedJobId === job.id ? "✓ コピー済み" : "🔗 応募URL"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && editingJob && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-[560px] max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingJob.id ? "案件を編集" : "新規案件を作成"}
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-[12px] text-blue-700">🤖 ポジション名を入力してAI生成ボタンを押すと、要件・詳細を自動生成</span>
                <button
                  onClick={aiGenerateJobDetails}
                  disabled={aiGenerating || !editingJob?.title}
                  className={`text-[11px] font-bold text-white px-3 py-1.5 rounded-lg transition-all ${
                    aiGenerating || !editingJob?.title ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {aiGenerating ? "⏳ 生成中..." : "🤖 AI生成"}
                </button>
              </div>
              {[
                { key: "title", label: "ポジション名", placeholder: "例：フロントエンドエンジニア" },
                { key: "department", label: "部門", placeholder: "例：プロダクト開発部" },
                { key: "salary_range", label: "年収レンジ", placeholder: "例：500-750万円" },
                { key: "location", label: "勤務地", placeholder: "例：東京（リモート可）" },
                { key: "requirements", label: "要件", placeholder: "必要なスキル・経験（AI生成可）", textarea: true },
                { key: "description", label: "詳細", placeholder: "仕事内容の詳細（AI生成可）", textarea: true },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">
                    {field.label}
                  </label>
                  {field.textarea ? (
                    <textarea
                      value={(editingJob as Record<string, string>)[field.key] || ""}
                      onChange={(e) =>
                        setEditingJob({ ...editingJob, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] resize-y outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      value={(editingJob as Record<string, string>)[field.key] || ""}
                      onChange={(e) =>
                        setEditingJob({ ...editingJob, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 text-[13px] font-semibold text-gray-500 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={saveJob}
                className="px-5 py-2 bg-primary text-white text-[13px] font-bold rounded-lg hover:bg-primary-dark"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

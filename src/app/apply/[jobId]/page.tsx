"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

type FormData = {
  name: string;
  email: string;
  phone: string;
  current_company: string;
  current_position: string;
  experience_years: string;
  skills: string;
  resume_text: string;
};

const EMPTY_FORM: FormData = {
  name: "",
  email: "",
  phone: "",
  current_company: "",
  current_position: "",
  experience_years: "",
  skills: "",
  resume_text: "",
};

export default function ApplyPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError("求人が見つかりません");
        } else {
          setJob(data as Job);
        }
        setLoading(false);
      });
  }, [jobId]);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === "text/plain" || file.name.endsWith(".txt")) {
      const text = await file.text();
      set("resume_text", text);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError("氏名とメールアドレスは必須です。");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          current_company: form.current_company,
          current_position: form.current_position,
          experience_years: form.experience_years,
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          resume_text: form.resume_text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow-lg text-center max-w-md">
          <div className="text-5xl mb-4">😓</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">求人が見つかりません</h1>
          <p className="text-[13px] text-gray-400">URLをご確認ください。</p>
        </div>
      </div>
    );
  }

  if (job.status !== "open") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow-lg text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">募集は終了しました</h1>
          <p className="text-[13px] text-gray-400">この求人は現在募集を停止しています。</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-10 shadow-lg text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">ご応募ありがとうございます！</h1>
          <p className="text-[14px] text-gray-600 mb-1">{job.title}</p>
          <p className="text-[13px] text-gray-400">
            AIによる書類選考を実施中です。<br />
            結果は追ってご連絡いたします。
          </p>
          <div className="mt-6 bg-blue-50 rounded-xl p-4 text-[12px] text-blue-700">
            🤖 AI選考により、通常よりスピーディーに結果をお伝えできます。
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 py-5">
          <div className="text-[12px] font-bold text-blue-600 mb-1">株式会社ピアズ</div>
          <h1 className="text-2xl font-extrabold text-gray-800">{job.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-[13px] text-gray-500">
            <span>{job.department}</span>
            <span>•</span>
            <span>{job.employment_type}</span>
            <span>•</span>
            <span>{job.location}</span>
            {job.salary_range && (
              <>
                <span>•</span>
                <span className="font-semibold text-gray-700">{job.salary_range}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Job Description */}
        {(job.description || job.requirements) && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            {job.description && (
              <div className="mb-4">
                <h2 className="text-[14px] font-bold text-gray-700 mb-2">業務内容</h2>
                <p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </div>
            )}
            {job.requirements && (
              <div>
                <h2 className="text-[14px] font-bold text-gray-700 mb-2">応募要件</h2>
                <p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{job.requirements}</p>
              </div>
            )}
          </div>
        )}

        {/* Application Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-800 mb-1">応募フォーム</h2>
          <p className="text-[12px] text-gray-400 mb-5">以下を入力して送信してください。AIが迅速に書類選考を行います。</p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-700 text-[13px]">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">氏名 *</label>
                <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">メールアドレス *</label>
                <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="taro@example.com" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">電話番号</label>
                <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="090-1234-5678" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">現在の会社</label>
                <input className={inputClass} value={form.current_company} onChange={(e) => set("current_company", e.target.value)} placeholder="株式会社〇〇" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">現在のポジション</label>
                <input className={inputClass} value={form.current_position} onChange={(e) => set("current_position", e.target.value)} placeholder="プロジェクトマネージャー" />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1.5">経験年数</label>
                <input className={inputClass} type="number" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} placeholder="5" />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-500 mb-1.5">スキル（カンマ区切り）</label>
              <input className={inputClass} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, AWS, チームマネジメント" />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-gray-500 mb-1.5">職務経歴</label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
              >
                <textarea
                  className="w-full text-[13px] outline-none resize-none min-h-[120px] bg-transparent"
                  value={form.resume_text}
                  onChange={(e) => set("resume_text", e.target.value)}
                  placeholder="これまでのご経験・実績を記載してください。&#10;テキストファイル(.txt)のドラッグ＆ドロップにも対応しています。"
                />
                <div className="text-[10px] text-gray-400 text-center mt-1">
                  📎 .txt ファイルをドラッグ＆ドロップで読み込み可能
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 text-[15px] font-bold text-white rounded-xl transition-all ${
                submitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
              }`}
            >
              {submitting ? "⏳ 送信中..." : "応募する"}
            </button>

            <p className="text-[11px] text-gray-400 text-center">
              🤖 送信後、AIによる書類選考が自動で実施されます。
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-[11px] text-gray-400">
          Powered by Peers Recruit &copy; Peers, Inc. 2026
        </div>
      </div>
    </div>
  );
}

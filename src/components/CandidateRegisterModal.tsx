"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

interface Props {
  jobs: Job[];
  onClose: () => void;
  onRegistered: () => void;
}

const SOURCES = ["BizReach", "LinkedIn", "Green", "Findy", "Wantedly", "エージェント", "リファラル", "自社HP", "その他"];

export default function CandidateRegisterModal({ jobs, onClose, onRegistered }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    current_company: "",
    current_position: "",
    experience_years: "",
    skills: "",
    source: "BizReach",
    resume_text: "",
    notes: "",
    job_id: jobs[0]?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.job_id) {
      setError("氏名と案件は必須です。");
      return;
    }
    setError("");
    setSaving(true);
    try {
      // 候補者を登録
      const { data: candidate, error: cErr } = await supabase.from("candidates").insert([{
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        current_company: form.current_company.trim(),
        current_position: form.current_position.trim(),
        experience_years: form.experience_years ? parseInt(form.experience_years) : 0,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        source: form.source,
        resume_text: form.resume_text.trim(),
        notes: form.notes.trim(),
      }]).select().single();

      if (cErr) throw cErr;

      // パイプラインに追加
      const { error: pErr } = await supabase.from("pipeline").insert([{
        job_id: form.job_id,
        candidate_id: candidate.id,
        stage: "applied",
        stage_changed_at: new Date().toISOString(),
      }]);

      if (pErr) throw pErr;

      onRegistered();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // レジュメテキストのドラッグ&ドロップ
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      const text = await file.text();
      set("resume_text", text);
    } else {
      setError("テキストファイル(.txt)をドロップしてください。PDF対応はPhase3で予定。");
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors";
  const labelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full md:w-[680px] max-h-[90vh] overflow-y-auto shadow-xl mx-4 md:mx-0" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">➕ 候補者を登録</h2>
            <p className="text-[12px] text-gray-400">新しい候補者を手動で追加します</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-[13px]">{error}</div>
          )}

          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>氏名 *</label>
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="山田 太郎" />
            </div>
            <div>
              <label className={labelClass}>メール</label>
              <input className={inputClass} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="taro@example.com" />
            </div>
            <div>
              <label className={labelClass}>電話番号</label>
              <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="090-1234-5678" />
            </div>
            <div>
              <label className={labelClass}>流入チャネル</label>
              <select className={inputClass} value={form.source} onChange={(e) => set("source", e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* 職歴 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass}>現在の会社</label>
              <input className={inputClass} value={form.current_company} onChange={(e) => set("current_company", e.target.value)} placeholder="株式会社〇〇" />
            </div>
            <div>
              <label className={labelClass}>現在のポジション</label>
              <input className={inputClass} value={form.current_position} onChange={(e) => set("current_position", e.target.value)} placeholder="シニアエンジニア" />
            </div>
            <div>
              <label className={labelClass}>経験年数</label>
              <input className={inputClass} type="number" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} placeholder="5" />
            </div>
          </div>

          {/* スキル・案件 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>スキル（カンマ区切り）</label>
              <input className={inputClass} value={form.skills} onChange={(e) => set("skills", e.target.value)} placeholder="React, TypeScript, AWS" />
            </div>
            <div>
              <label className={labelClass}>応募案件 *</label>
              <select className={inputClass} value={form.job_id} onChange={(e) => set("job_id", e.target.value)}>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
          </div>

          {/* レジュメ */}
          <div className="mb-4">
            <label className={labelClass}>職務経歴・レジュメ</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-3 hover:border-blue-300 transition-colors"
            >
              <textarea
                className="w-full text-[13px] outline-none resize-none min-h-[100px] bg-transparent"
                value={form.resume_text}
                onChange={(e) => set("resume_text", e.target.value)}
                placeholder="職務経歴を貼り付け、またはテキストファイルをここにドロップ..."
              />
              <div className="text-[10px] text-gray-400 text-center mt-1">
                📎 .txt ファイルをドラッグ＆ドロップで読み込み可能
              </div>
            </div>
          </div>

          {/* メモ */}
          <div className="mb-6">
            <label className={labelClass}>メモ</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="エージェントからの推薦コメントなど"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-[13px] font-bold text-gray-500 hover:text-gray-700 transition-colors">
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-2.5 text-[13px] font-bold text-white rounded-lg transition-all ${
                saving ? "bg-gray-400 cursor-not-allowed" : "bg-primary hover:bg-primary-dark"
              }`}
            >
              {saving ? "登録中..." : "登録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

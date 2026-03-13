"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";

interface CsvRow {
  name: string;
  email: string;
  phone: string;
  current_company: string;
  current_position: string;
  experience_years: string;
  skills: string;
  source: string;
  stage: string;
  resume_text: string;
  [key: string]: string;
}

const SAMPLE_CSV = `name,email,current_company,current_position,experience_years,skills,source,stage
田中一郎,tanaka@example.com,メルカリ,バックエンドエンジニア,5,"Go,AWS,Docker",BizReach,applied
佐藤花子,sato@example.com,リクルート,プロジェクトマネージャー,8,"PM,Agile,SQL",LinkedIn,screening
鈴木次郎,suzuki@example.com,アクセンチュア,コンサルタント,3,"Python,Tableau,戦略立案",エージェント,interview1`;

const STAGE_MAP: Record<string, string> = {
  "応募": "applied", "applied": "applied",
  "書類選考": "screening", "screening": "screening",
  "1次面接": "interview1", "interview1": "interview1",
  "最終面接": "interview_final", "interview_final": "interview_final",
  "内定": "offer", "offer": "offer",
  "入社": "hired", "hired": "hired",
};

export default function ImportPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => {
    supabase.from("jobs").select("*").order("created_at").then(({ data }) => {
      const jobsList = (data || []) as Job[];
      setJobs(jobsList);
      if (jobsList.length > 0) setSelectedJobId(jobsList[0].id);
    });
  }, []);

  function parseCsv(text: string) {
    setParseError("");
    setParsedRows([]);
    setResult(null);

    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      setParseError("ヘッダー行とデータ行が必要です（最低2行）");
      return;
    }

    // ヘッダー解析
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());

    // 必須列チェック
    if (!headers.includes("name") && !headers.includes("氏名")) {
      setParseError("name（氏名）列が見つかりません。CSVのヘッダーを確認してください。");
      return;
    }

    const HEADER_MAP: Record<string, string> = {
      "氏名": "name", "name": "name",
      "メール": "email", "email": "email",
      "電話": "phone", "phone": "phone",
      "会社": "current_company", "current_company": "current_company", "company": "current_company",
      "ポジション": "current_position", "current_position": "current_position", "position": "current_position",
      "経験年数": "experience_years", "experience_years": "experience_years", "years": "experience_years",
      "スキル": "skills", "skills": "skills",
      "ソース": "source", "source": "source", "チャネル": "source", "channel": "source",
      "ステージ": "stage", "stage": "stage", "status": "stage",
      "職務経歴": "resume_text", "resume_text": "resume_text", "resume": "resume_text",
    };

    const mappedHeaders = headers.map((h) => HEADER_MAP[h] || h);

    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: CsvRow = {
        name: "", email: "", phone: "", current_company: "", current_position: "",
        experience_years: "", skills: "", source: "", stage: "", resume_text: "",
      };
      mappedHeaders.forEach((header, idx) => {
        if (idx < values.length) {
          row[header] = values[idx].trim();
        }
      });
      if (row.name) rows.push(row);
    }

    if (rows.length === 0) {
      setParseError("有効なデータ行がありません。");
      return;
    }

    setParsedRows(rows);
  }

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  async function handleImport() {
    if (!selectedJobId || parsedRows.length === 0) return;
    setImporting(true);
    setResult(null);

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of parsedRows) {
      try {
        const { data: candidate, error: cErr } = await supabase.from("candidates").insert([{
          name: row.name,
          email: row.email || null,
          phone: row.phone || null,
          current_company: row.current_company || "",
          current_position: row.current_position || "",
          experience_years: row.experience_years ? parseInt(row.experience_years) : 0,
          skills: row.skills ? row.skills.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : [],
          source: row.source || "CSV取込",
          resume_text: row.resume_text || "",
          notes: "CSVインポート",
        }]).select().single();

        if (cErr) throw cErr;

        const stage = STAGE_MAP[row.stage] || "applied";
        const { error: pErr } = await supabase.from("pipeline").insert([{
          job_id: selectedJobId,
          candidate_id: candidate.id,
          stage,
          stage_changed_at: new Date().toISOString(),
        }]);

        if (pErr) throw pErr;
        success++;
      } catch (err) {
        failed++;
        errors.push(`${row.name}: ${err instanceof Error ? err.message : "不明なエラー"}`);
      }
    }

    setResult({ success, failed, errors });
    setImporting(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.name.endsWith(".csv") || file.name.endsWith(".tsv") || file.type === "text/csv") {
      file.text().then((text) => {
        setCsvText(text);
        parseCsv(text);
      });
    } else {
      setParseError("CSVファイルをドロップしてください。");
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      setCsvText(text);
      parseCsv(text);
    });
  }

  function loadSample() {
    setCsvText(SAMPLE_CSV);
    parseCsv(SAMPLE_CSV);
  }

  return (
    <div className="px-7 py-6">
      <div className="max-w-[900px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">📥 CSVインポート</h1>
        <p className="text-[13px] text-gray-400 mb-6">
          スカウトサイトやエージェントからエクスポートした候補者データを一括取込
        </p>

        {/* Step 1: 案件選択 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="text-[14px] font-bold text-gray-700 mb-3">① 取込先の案件を選択</h2>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-gray-200 text-[13px] outline-none bg-white w-full max-w-md"
          >
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}（{j.department}）</option>)}
          </select>
        </div>

        {/* Step 2: CSV入力 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-gray-700">② CSVデータを読み込み</h2>
            <button
              onClick={loadSample}
              className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              📋 サンプルCSVを読み込む
            </button>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors mb-3"
          >
            <textarea
              className="w-full text-[12px] font-mono outline-none resize-none min-h-[140px] bg-transparent"
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setParsedRows([]); setResult(null); }}
              placeholder={`CSVをここに貼り付け、またはファイルをドロップ...\n\n対応カラム: name, email, current_company, current_position, experience_years, skills, source, stage\n（日本語ヘッダーも対応: 氏名, メール, 会社, ポジション, 経験年数, スキル, ソース/チャネル, ステージ）`}
            />
            <div className="flex items-center justify-center gap-3 mt-2">
              <span className="text-[10px] text-gray-400">📎 CSVファイルをドラッグ＆ドロップ</span>
              <span className="text-[10px] text-gray-300">|</span>
              <label className="text-[10px] font-bold text-blue-500 cursor-pointer hover:text-blue-700">
                ファイルを選択
                <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>

          {csvText && parsedRows.length === 0 && !parseError && (
            <button
              onClick={() => parseCsv(csvText)}
              className="text-[12px] font-bold text-white bg-primary px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
            >
              🔍 CSVを解析する
            </button>
          )}

          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-[13px]">{parseError}</div>
          )}
        </div>

        {/* Step 3: プレビュー */}
        {parsedRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-bold text-gray-700">
                ③ プレビュー（{parsedRows.length}件）
              </h2>
              <button
                onClick={handleImport}
                disabled={importing}
                className={`text-[13px] font-bold text-white px-6 py-2.5 rounded-lg transition-all ${
                  importing ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {importing ? "⏳ インポート中..." : `✅ ${parsedRows.length}件をインポート`}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">#</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">氏名</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">会社</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">ポジション</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">年数</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">スキル</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">ソース</th>
                    <th className="text-left text-[10px] font-bold text-gray-400 px-3 py-2">ステージ</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-bold text-gray-700">{row.name}</td>
                      <td className="px-3 py-2 text-gray-600">{row.current_company}</td>
                      <td className="px-3 py-2 text-gray-600">{row.current_position}</td>
                      <td className="px-3 py-2 text-gray-600">{row.experience_years}</td>
                      <td className="px-3 py-2 text-gray-500">{row.skills}</td>
                      <td className="px-3 py-2">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">{row.source || "CSV取込"}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded">
                          {STAGE_MAP[row.stage] ? row.stage : "応募"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-xl p-5 mb-5 ${result.failed === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <div className="text-[15px] font-bold mb-2">
              {result.failed === 0 ? "✅ インポート完了！" : "⚠️ 一部エラーあり"}
            </div>
            <div className="text-[13px] text-gray-700">
              成功: <strong className="text-emerald-600">{result.success}件</strong>
              {result.failed > 0 && <> / 失敗: <strong className="text-red-600">{result.failed}件</strong></>}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 text-[12px] text-red-600">
                {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}
          </div>
        )}

        {/* CSV Format Guide */}
        <div className="bg-slate-50 rounded-xl p-5 text-[12px] text-gray-500">
          <h3 className="font-bold text-gray-700 mb-2">📖 CSVフォーマットガイド</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1">
            <div><strong>name / 氏名</strong>（必須）</div>
            <div><strong>source / ソース / チャネル</strong>（BizReach, LinkedIn等）</div>
            <div><strong>email / メール</strong></div>
            <div><strong>stage / ステージ</strong>（応募, 書類選考, 1次面接等）</div>
            <div><strong>current_company / 会社</strong></div>
            <div><strong>skills / スキル</strong>（カンマ区切り）</div>
            <div><strong>current_position / ポジション</strong></div>
            <div><strong>experience_years / 経験年数</strong></div>
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            💡 BizReach・Green・WantedlyなどからエクスポートしたCSVのヘッダーにも対応予定（Phase3）
          </p>
        </div>
      </div>
    </div>
  );
}

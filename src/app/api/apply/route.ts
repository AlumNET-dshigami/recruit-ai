import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { job_id, name, email, phone, current_company, current_position, experience_years, skills, resume_text } = body;

  if (!job_id || !name?.trim()) {
    return NextResponse.json({ error: "氏名と案件IDは必須です" }, { status: 400 });
  }

  // 求人存在チェック
  const { data: job, error: jobErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", job_id)
    .single();

  if (jobErr || !job) {
    return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 });
  }

  if (job.status !== "open") {
    return NextResponse.json({ error: "この求人は現在募集を停止しています" }, { status: 400 });
  }

  // 候補者登録
  const { data: candidate, error: cErr } = await supabase.from("candidates").insert([{
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    current_company: current_company?.trim() || "",
    current_position: current_position?.trim() || "",
    experience_years: experience_years ? parseInt(experience_years) : 0,
    skills: skills || [],
    source: "応募フォーム",
    resume_text: resume_text?.trim() || "",
    notes: "公開URL経由の応募",
  }]).select().single();

  if (cErr) {
    return NextResponse.json({ error: "候補者の登録に失敗しました" }, { status: 500 });
  }

  // パイプラインに追加
  const { data: pipeline, error: pErr } = await supabase.from("pipeline").insert([{
    job_id,
    candidate_id: candidate.id,
    stage: "applied",
    stage_changed_at: new Date().toISOString(),
  }]).select().single();

  if (pErr) {
    return NextResponse.json({ error: "パイプラインへの追加に失敗しました" }, { status: 500 });
  }

  // 自動AI書類選考（バックグラウンド）
  autoScreening(candidate, job, pipeline.id).catch(console.error);

  return NextResponse.json({
    success: true,
    message: "ご応募ありがとうございます。選考結果をお待ちください。",
    candidateId: candidate.id,
  });
}

async function autoScreening(
  candidate: { name: string; current_company: string; current_position: string; experience_years: number; skills: string[]; resume_text: string },
  job: { title: string; requirements: string; description: string },
  pipelineId: string
) {
  const prompt = `以下の候補者の書類選考を実施してください。

【候補者】${candidate.name}
現職: ${candidate.current_company} ${candidate.current_position}
経験年数: ${candidate.experience_years}年
スキル: ${candidate.skills?.join(", ") || "記載なし"}

【職務経歴】
${candidate.resume_text || "記載なし"}

【募集ポジション】${job.title}
【要件】${job.requirements || "記載なし"}
【業務内容】${job.description || "記載なし"}

以下の形式で評価してください：
■ 総合評価スコア: XX点/100点
■ 判定: 通過 / 保留 / 不通過
■ 評価サマリー: （1-2行）
■ 強み: （箇条書き）
■ 懸念点: （箇条書き）
■ 推奨ネクストアクション: （例: 1次面接に進む、追加情報を依頼 等）`;

  const systemPrompt = "あなたは2026年のスキルベース採用に精通した書類選考AIです。候補者の経歴・スキルを多角的に評価し、公正かつ詳細なフィードバックを返してください。";

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    let result: string;

    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      result = `【自動書類選考 - デモモード】\n■ 総合評価スコア: 75点/100点\n■ 判定: 通過\n■ 評価サマリー: ${candidate.name}さんの経歴は${job.title}ポジションに概ね適合しています。\n■ 強み:\n・${candidate.current_company}での実務経験\n・${candidate.skills?.slice(0, 3).join(", ")}のスキル\n■ 懸念点:\n・詳細な職務経歴の確認が必要\n■ 推奨ネクストアクション: 1次面接に進むことを推奨`;
    } else {
      const model = "gemini-2.0-flash-lite";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 2048 },
        }),
      });
      const data = await res.json();
      result = data.candidates?.[0]?.content?.parts?.[0]?.text || "AI選考結果を取得できませんでした";
    }

    // AI結果をログ保存
    await supabase.from("ai_logs").insert([{
      pipeline_id: pipelineId,
      action_type: "auto_screening",
      prompt,
      result,
    }]);

    // スコア抽出 & パイプライン更新
    const scoreMatch = result.match(/(\d{1,3})\s*点/);
    if (scoreMatch) {
      await supabase.from("pipeline")
        .update({
          score: parseInt(scoreMatch[1]),
          ai_summary: result.slice(0, 300),
          stage: "screening",
          stage_changed_at: new Date().toISOString(),
        })
        .eq("id", pipelineId);
    }
  } catch (err) {
    console.error("Auto screening failed:", err);
  }
}

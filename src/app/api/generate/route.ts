import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, systemPrompt } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json(
      { error: "プロンプトが空です" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // APIキー未設定 → デモモード（入力内容をそのまま確認用に返す）
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    const text = `【デモモード】APIキーが未設定のため、AI生成は無効です。\n.env.local に GEMINI_API_KEY を設定すると実際のAI生成が有効になります。\n\n--- 送信されたプロンプト（確認用）---\n${prompt.slice(0, 500)}${prompt.length > 500 ? "..." : ""}`;
    return NextResponse.json({ text });
  }

  // Gemini API 呼び出し
  const model = "gemini-2.0-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 4096,
    },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error?.message || "Gemini APIエラーが発生しました";
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return NextResponse.json({ text });
}

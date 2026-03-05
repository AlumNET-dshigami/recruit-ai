"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabCustom({ run, loading, result }: Props) {
  const [prompt, setPrompt] = useState("");
  const [ctx, setCtx] = useState("");

  const fullPrompt = ctx.trim()
    ? `## 追加コンテキスト\n${ctx}\n\n## 実行要求\n${prompt}`
    : prompt;

  return (
    <div>
      <FormGroup label="カスタムプロンプト">
        <TextArea
          value={prompt}
          onChange={setPrompt}
          rows={6}
          placeholder="例: 新卒採用のための会社説明会資料を作成してください。IT企業、従業員100名、主力事業はSaaS開発..."
        />
      </FormGroup>
      <FormGroup label="追加コンテキスト（任意）">
        <TextArea
          value={ctx}
          onChange={setCtx}
          rows={3}
          placeholder="追加の背景情報や制約条件があれば記入してください"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            fullPrompt,
            "あなたは採用・人事のエキスパートです。2026年の最新トレンドを踏まえて、採用に関連するタスクを高品質で実行します。"
          )
        }
        loading={loading}
        label="カスタム実行"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

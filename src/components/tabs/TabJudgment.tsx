"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabJudgment({ run, loading, result }: Props) {
  const [content, setContent] = useState("");
  const [logic, setLogic] = useState("");

  const prompt = `以下の面接情報を基に、2026年基準の合否判定と申し送り事項を作成してください。

## 面接内容・メモ
${content}

## 評価ロジック・基準
${logic}

### 【総合判定】
合否判定 / 信頼度（高/中/低）と理由 / 総合スコア（100点満点）

### 【詳細評価】
技術力・専門性（0-30点）: スコア + 具体的な発言・行動の引用
コミュニケーション（0-25点）: スコア + 具体的な例
問題解決・思考力（0-25点）: スコア + 具体的な例
カルチャーフィット（0-20点）: スコア + 具体的な例

### 【バイアスチェック】
アフィニティバイアス・ハロー効果等の混入チェック結果

### 【判定理由】
決定的な合格/不合格要因 / データに基づく客観的根拠

### 【申し送り事項】
次面接官へ（合格時）: 深掘りすべき領域・特に確認が必要な点
人事・現場へ: 成長ポテンシャル予測・オンボーディング注意点・最適配属先の考え方

日本語で客観的・建設的な判定を提供してください。`;

  return (
    <div>
      <FormGroup label="面接内容（メモや会話データ）">
        <TextArea
          value={content}
          onChange={setContent}
          rows={7}
          placeholder={"面接での質問と回答、観察事項、メモなどを入力してください。\n\n例:\nQ: 自己紹介をお願いします\nA: フロントエンド開発を5年やっています...\n\n【観察メモ】\nコミュニケーション能力高い、技術質問に的確回答"}
        />
      </FormGroup>
      <FormGroup label="評価ロジック・基準">
        <TextArea
          value={logic}
          onChange={setLogic}
          rows={3}
          placeholder="例: 技術力30点、コミュニケーション25点、問題解決力25点、カルチャーフィット20点。合計70点以上で合格。"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは構造化面接評価の専門家です。一貫した基準と無意識バイアスの排除を前提とした公正な判定を行います。"
          )
        }
        loading={loading}
        label="合否判定実行"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

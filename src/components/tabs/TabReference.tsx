"use client";

import { useState } from "react";
import { FormGroup, Input, Select, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabReference({ run, loading, result }: Props) {
  const [candidate, setCandidate] = useState("");
  const [focus, setFocus] = useState("");
  const [mode, setMode] = useState("questionnaire");
  const [referenceData, setReferenceData] = useState("");

  const prompt = mode === "questionnaire"
    ? `以下の情報を基に、リファレンスチェック質問票を作成してください。

## 候補者情報
${candidate}

## 確認したいポイント
${focus}

## 出力形式

### 【質問票】（10-15問、STAR法ベース）
関係性構築の質問（2問）→ 核心質問（8-10問）→ クロージング（2問）

### 【各質問の意図と評価ポイント】
質問ごとに何を見ているか、高評価/低評価の回答例

### 【レッドフラグ検出ポイント】
注意すべき回答パターン5つ

### 【個人情報保護法への配慮事項】
質問してはいけない内容・同意取得の注意点

日本語で実践的に作成してください。`
    : `以下のリファレンスチェック回答を分析してください。

## 候補者情報
${candidate}

## 確認ポイント
${focus}

## リファレンス回答内容
${referenceData}

## 出力形式

### 【リファレンス総合評価】
総合判定（推奨/条件付き推奨/非推奨）とスコア（100点満点）

### 【強み分析】
リファレンスから確認できた強み（具体的引用付き）

### 【懸念点分析】
注意すべきポイント（具体的引用付き）

### 【面接評価との整合性確認】
面接での印象と一致/乖離しているポイント

### 【採用リスク評価】
リスクレベル（高/中/低）と根拠

### 【オンボーディングへの示唆】
入社後に配慮すべきポイント・サポート体制の提案

日本語で客観的に分析してください。`;

  return (
    <div>
      <SectionNote>
        リファレンスチェックの質問票作成・回答分析
      </SectionNote>
      <FormGroup label="モード">
        <Select
          value={mode}
          onChange={setMode}
          options={[
            { value: "questionnaire", label: "質問票作成" },
            { value: "analysis", label: "回答分析" },
          ]}
        />
      </FormGroup>
      <FormGroup label="候補者名・ポジション">
        <Input value={candidate} onChange={setCandidate} placeholder="例: 山田太郎 / シニアエンジニア" />
      </FormGroup>
      <FormGroup label="確認したいポイント">
        <TextArea value={focus} onChange={setFocus} rows={3} placeholder="例: リーダーシップ、技術力、コミュニケーション、問題解決力" />
      </FormGroup>
      {mode === "analysis" && (
        <FormGroup label="リファレンス回答内容">
          <TextArea
            value={referenceData}
            onChange={setReferenceData}
            rows={5}
            placeholder="リファレンスから得た回答内容を貼り付けてください"
          />
        </FormGroup>
      )}
      <RunButton
        onClick={() => run(prompt, "あなたはリファレンスチェックの専門家です。法的配慮と個人情報保護を踏まえた、実用的なリファレンスチェックを支援します。")}
        loading={loading}
        label={mode === "questionnaire" ? "質問票作成" : "回答分析実行"}
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabPersona({ run, loading, result }: Props) {
  const [val, setVal] = useState("");

  const prompt = `以下の求人内容から、2026年の日本市場に最適化された採用ペルソナを作成してください。

## 求人内容
${val}

## 出力形式

### 基本プロフィール
- 年齢層・経験レベル・現在の職場環境・推定年収帯

### 2026年版 性格・行動特性
- キャリア観（ジョブ型 vs メンバーシップ型）
- テクノロジー親和性（AIツール活用レベル）
- 転職動機TOP3・意思決定の重視要素
- 情報収集チャネル

### 採用アプローチ戦略
- 効果的なスカウトチャネル（優先順位付き）
- 響きやすいメッセージキーワード
- 絶対に避けるべき表現
- スキルベース評価での重要観点

### 競合との差別化UVP
- 候補者が他社でなく自社を選ぶ理由
- 訴求すべき独自の価値提案

日本語で具体的・実践的に記述してください。`;

  return (
    <div>
      <SectionNote>
        スキルベース採用・ジョブ型雇用トレンド対応、競合差別化 UVP 生成
      </SectionNote>
      <FormGroup
        label="求人内容（職種・要件・魅力などまとめて入力）"
        tip="職種・スキル要件・会社情報を自由に記述してください。"
      >
        <TextArea
          value={val}
          onChange={setVal}
          rows={6}
          placeholder={"例:\n職種: シニアフロントエンドエンジニア\n必須: React/TypeScript 5年以上\n歓迎: Next.js, チームリード\n会社: 急成長SaaS, フルリモート, 年収700-1000万"}
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(prompt, "あなたは2026年の日本採用市場のエキスパートです。")
        }
        loading={loading}
        label="ペルソナ生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

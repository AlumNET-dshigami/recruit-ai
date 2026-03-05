"use client";

import { useState } from "react";
import { FormGroup, Input, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabPlan({ run, loading, result }: Props) {
  const [department, setDepartment] = useState("");
  const [positions, setPositions] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");
  const [constraints, setConstraints] = useState("");

  const prompt = `以下の情報を基に、実現可能な採用計画を策定してください。

## 入力情報
部門・事業部: ${department}
募集ポジション一覧:
${positions}
採用期間: ${timeline}
採用予算: ${budget}
制約・前提条件: ${constraints}

## 出力形式

### 【採用計画サマリー】
部門概要・合計採用人数・期間・総予算

### 【ポジション別タイムライン】
月別マイルストーン（募集開始→書類選考→面接→内定→入社）

### 【チャネル戦略】
媒体・エージェント・リファラル・ダイレクトの配分と想定コスト・期待応募数

### 【KPI設定】
応募数・書類通過率・面接通過率・内定承諾率の目標値

### 【リスクと対策】
採用難易度評価・競合分析・代替チャネル・遅延時のリカバリープラン

### 【週次アクションプラン】
最初の4週間の具体的アクション

日本語で実践的・具体的に策定してください。`;

  return (
    <div>
      <SectionNote>
        部門別の採用人数・タイムライン・予算・チャネル計画を策定
      </SectionNote>
      <FormGroup label="部門・事業部">
        <Input value={department} onChange={setDepartment} placeholder="例: プロダクト開発部" />
      </FormGroup>
      <FormGroup label="募集ポジション一覧">
        <TextArea
          value={positions}
          onChange={setPositions}
          rows={4}
          placeholder={"例:\nシニアフロントエンドエンジニア x2\nバックエンドエンジニア x1\nプロダクトマネージャー x1"}
        />
      </FormGroup>
      <div className="flex gap-3">
        <FormGroup label="採用期間">
          <Input value={timeline} onChange={setTimeline} placeholder="例: 2026年4月〜9月（6ヶ月）" />
        </FormGroup>
        <FormGroup label="採用予算">
          <Input value={budget} onChange={setBudget} placeholder="例: 500万円（エージェントフィー含む）" />
        </FormGroup>
      </div>
      <FormGroup label="制約・前提条件">
        <TextArea
          value={constraints}
          onChange={setConstraints}
          rows={3}
          placeholder="例: フルリモート必須、海外拠点なし、エージェント3社利用中"
        />
      </FormGroup>
      <RunButton
        onClick={() => run(prompt, "あなたは採用戦略コンサルタントです。データに基づいた現実的な採用計画を策定します。")}
        loading={loading}
        label="採用計画策定"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

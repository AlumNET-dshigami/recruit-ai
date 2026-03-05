"use client";

import { useState } from "react";
import { FormGroup, Input, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabReport({ run, loading, result }: Props) {
  const [period, setPeriod] = useState("");
  const [metrics, setMetrics] = useState("");
  const [channels, setChannels] = useState("");
  const [issues, setIssues] = useState("");

  const prompt = `以下の採用データを基に、採用レポートを作成してください。

## レポート期間
${period}

## 採用実績データ
${metrics}

## チャネル別データ
${channels || "データなし"}

## 課題・所感
${issues}

## 出力形式

### 【エグゼクティブサマリー】
3-5行で期間全体の採用成果を要約

### 【KPI分析】
ファネル分析（応募→書類通過→面接→内定→入社の各段階の数値と通過率）

### 【チャネル別ROI分析】
チャネルごとのコスト・応募数・採用数・CPA（1応募あたりコスト）・CPH（1採用あたりコスト）

### 【ボトルネック特定と改善提案】
最も改善インパクトの大きいポイント3つと具体的な施策

### 【採用コスト分析】
総コスト・1人あたり採用コスト・予算消化率

### 【次期アクションプラン】
優先度付きの改善施策5つ（すぐやる/今月中/来期検討）

日本語でデータに基づいた分析を提供してください。`;

  return (
    <div>
      <SectionNote>
        採用プロセスの振り返りレポート・KPI分析を生成
      </SectionNote>
      <FormGroup label="レポート期間">
        <Input value={period} onChange={setPeriod} placeholder="例: 2026年1月〜3月（Q1）" />
      </FormGroup>
      <FormGroup label="採用実績データ">
        <TextArea
          value={metrics}
          onChange={setMetrics}
          rows={5}
          placeholder={"例:\n応募数: 120件\n書類通過: 40件(33%)\n一次面接通過: 20件\n最終面接通過: 8件\n内定承諾: 5件\n入社: 5件"}
        />
      </FormGroup>
      <FormGroup label="チャネル別データ（任意）">
        <TextArea
          value={channels}
          onChange={setChannels}
          rows={3}
          placeholder={"例:\nエージェント: 応募50件, 入社2件, コスト300万\nダイレクト: 応募30件, 入社2件, コスト50万"}
        />
      </FormGroup>
      <FormGroup label="課題・所感">
        <TextArea value={issues} onChange={setIssues} rows={3} placeholder="例: 書類通過率が低い、エンジニア採用に苦戦、面接辞退が多い" />
      </FormGroup>
      <RunButton
        onClick={() => run(prompt, "あなたは採用アナリティクスの専門家です。データに基づいた採用プロセスの分析と改善提案を行います。")}
        loading={loading}
        label="レポート生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

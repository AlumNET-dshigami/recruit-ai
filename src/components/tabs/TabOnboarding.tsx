"use client";

import { useState } from "react";
import { FormGroup, Input, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabOnboarding({ run, loading, result }: Props) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [background, setBackground] = useState("");
  const [teamInfo, setTeamInfo] = useState("");

  const prompt = `以下の情報を基に、オンボーディング計画を策定してください。

## 入社者情報
入社者名: ${name}
ポジション: ${position}
入社日: ${startDate}
経験・スキル概要: ${background}
配属チーム情報: ${teamInfo}

## 出力形式

### 【オンボーディング全体スケジュール】
入社前2週間〜入社後90日の全体タイムライン

### 【入社前準備チェックリスト】
IT環境・アカウント・備品・書類の準備項目

### 【Week 1 詳細計画】
日別の予定（オリエンテーション・チーム紹介・ツール設定・最初のタスク）

### 【30-60-90日マイルストーン】
各期間の到達目標と評価指標

### 【メンター・バディ配置設計】
推奨ペアリング基準・メンターの役割定義

### 【研修スケジュール】
技術研修・業務研修・カルチャー研修の内容と時間配分

### 【1on1設計】
頻度・アジェンダテンプレート・エスカレーション基準

### 【定着リスクチェックポイント】
離職リスクの早期検知シグナルと対応策

日本語で実践的に策定してください。`;

  return (
    <div>
      <SectionNote>
        入社前後の受入計画・研修スケジュール・メンター配置を策定
      </SectionNote>
      <div className="flex gap-3">
        <FormGroup label="入社者名">
          <Input value={name} onChange={setName} placeholder="例: 山田太郎" />
        </FormGroup>
        <FormGroup label="ポジション">
          <Input value={position} onChange={setPosition} placeholder="例: シニアフロントエンドエンジニア" />
        </FormGroup>
      </div>
      <FormGroup label="入社日">
        <Input value={startDate} onChange={setStartDate} placeholder="例: 2026年4月1日" />
      </FormGroup>
      <FormGroup label="入社者の経験・スキル概要">
        <TextArea value={background} onChange={setBackground} rows={3} placeholder="例: React/TypeScript 5年、前職はBtoC EC、チームリード未経験" />
      </FormGroup>
      <FormGroup label="配属チーム情報">
        <TextArea value={teamInfo} onChange={setTeamInfo} rows={3} placeholder="例: プロダクト開発チーム（8名）、スクラム開発、使用技術: Next.js/Go" />
      </FormGroup>
      <RunButton
        onClick={() => run(prompt, "あなたはオンボーディング設計の専門家です。新入社員が最短で戦力化し、心理的安全性を感じられる受入計画を策定します。")}
        loading={loading}
        label="オンボーディング計画生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

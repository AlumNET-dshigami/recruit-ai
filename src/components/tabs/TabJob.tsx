"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabJob({ run, loading, result }: Props) {
  const [val, setVal] = useState("");

  const prompt = `以下の情報を基に、2026年基準のインクルーシブで魅力的な求人票を作成してください。

## 基本情報
${val}

### 【募集要項】
職種 / ミッション（1文）/ 雇用形態 / 勤務地（リモート可否明記）

### 【仕事内容】
Day 1から何をするかを具体的に（「等」「など」の曖昧表現を避ける）

### 【このポジションでのキャリアインパクト】
入社後1年・3年で何を達成できるか

### 【応募要件】
Must（絶対必須）: 各要件に理由も添える
Want（歓迎）:
カルチャーマッチ（バイアス表現なし）:

### 【報酬・待遇】
給与: 具体的なレンジ必須（「応相談」は使わない）
各種手当 / 福利厚生 / 休日 / リモート・フレックスルール

### 【学習・成長機会】
予算・外部研修・社内勉強会・書籍補助など具体的に

### 【チーム・職場環境】
チーム構成・文化・心理的安全性への取り組み

### 【DEI（多様性・公正性・インクルージョン）】
年齢・性別・国籍・育児状況等による不利益がない旨と具体的取り組み

日本語で作成してください。`;

  return (
    <div>
      <SectionNote>
        インクルーシブ採用対応、DEI 配慮、給与レンジ明示、ジョブ型雇用フォーマット
      </SectionNote>
      <FormGroup label="求人内容（職種・要件・会社情報などまとめて入力）">
        <TextArea
          value={val}
          onChange={setVal}
          rows={6}
          placeholder={"例:\nシニアフロントエンドエンジニア\nReact/TypeScript 5年以上必須\nチームリード経験歓迎\n急成長SaaS, 従業員100名\n年収700-1000万, フルリモート可\n技術書・カンファレンス費用全額支給"}
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは2026年のインクルーシブ採用と求人票作成のプロフェッショナルです。"
          )
        }
        loading={loading}
        label="求人票生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

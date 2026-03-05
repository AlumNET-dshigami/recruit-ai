"use client";

import { useState } from "react";
import { FormGroup, Input, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabNegotiation({ run, loading, result }: Props) {
  const [position, setPosition] = useState("");
  const [ourOffer, setOurOffer] = useState("");
  const [candidateRequest, setCandidateRequest] = useState("");
  const [budget, setBudget] = useState("");
  const [competitorInfo, setCompetitorInfo] = useState("");

  const prompt = `以下の条件交渉状況を分析し、交渉戦略を提案してください。

## 交渉状況
ポジション: ${position}
自社の提示条件: ${ourOffer}
候補者の希望・交渉内容: ${candidateRequest}
予算上限・制約: ${budget}
競合オファー情報: ${competitorInfo || "不明"}

## 出力形式

### 【交渉状況分析】
自社のポジション強度・候補者の優先事項推定・交渉の緊急度

### 【推奨交渉戦略】
3段階シナリオ（理想/現実的/最低ライン）それぞれの条件パッケージ

### 【カウンターオファー案文】
正式文書として使える丁寧なカウンターオファー

### 【金銭以外の代替提案】
ベネフィット・成長機会・柔軟な働き方・タイトル調整など5つ以上

### 【交渉トーク例】
想定Q&A 5つ（候補者の発言→推奨回答）

### 【リスク評価】
辞退可能性（高/中/低）・交渉決裂時の代替策

日本語で具体的・実践的にアドバイスしてください。`;

  return (
    <div>
      <SectionNote>
        候補者の条件交渉への対応アドバイス・カウンターオファー作成
      </SectionNote>
      <FormGroup label="ポジション">
        <Input value={position} onChange={setPosition} placeholder="例: シニアフロントエンドエンジニア" />
      </FormGroup>
      <FormGroup label="自社の提示条件">
        <TextArea value={ourOffer} onChange={setOurOffer} rows={3} placeholder="例: 年収850万円、フルリモート、フレックス制" />
      </FormGroup>
      <FormGroup label="候補者の希望・交渉内容">
        <TextArea value={candidateRequest} onChange={setCandidateRequest} rows={3} placeholder="例: 年収950万に引き上げ希望、入社日を1ヶ月遅らせたい" />
      </FormGroup>
      <FormGroup label="予算上限・制約">
        <Input value={budget} onChange={setBudget} placeholder="例: 年収900万が上限、入社日は柔軟対応可" />
      </FormGroup>
      <FormGroup label="競合オファー情報（任意）">
        <TextArea value={competitorInfo} onChange={setCompetitorInfo} rows={2} placeholder="例: A社から年収920万のオファーあり" />
      </FormGroup>
      <RunButton
        onClick={() => run(prompt, "あなたは採用交渉の専門家です。候補者と企業双方にとって最適な条件を見つけ、承諾率を最大化するアドバイスを提供します。")}
        loading={loading}
        label="交渉戦略分析"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

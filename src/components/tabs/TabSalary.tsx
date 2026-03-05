"use client";

import { useState } from "react";
import { FormGroup, Input, Select, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabSalary({ run, loading, result }: Props) {
  const [position, setPosition] = useState("");
  const [location, setLocation] = useState("");
  const [exp, setExp] = useState("mid");
  const [offer, setOffer] = useState("");

  const prompt = `以下の条件で給与・条件ベンチマーク分析を行ってください。

職種: ${position}
勤務地: ${location}
経験レベル: ${exp}
提示予定の条件: ${offer}

### 【市場レート概況（2025-2026年）】
職種の市場相場レンジ（下位25% / 中央値 / 上位25%）/ 地域別・業界別補正係数

### 【提示条件の競争力評価】
市場比較（市場平均の何%か）/ 競争力評価 / 優秀な候補者の獲得確率への影響

### 【候補者サイドの視点】
この条件で受諾しやすい候補者の特徴 / 受諾をためらわせる要因

### 【改善推奨事項】
給与以外で競争力を高められるベネフィット / 予算内での最適な条件パッケージング案

### 【2026年の報酬トレンド】
注目されているベネフィット（給与以外の価値） / 候補者が重視するTOP5要素

※上記の数値はAIによる推計です。最終的な条件設定には doda/マイナビ等の公式調査データも参照してください。

日本語で分析してください。`;

  return (
    <div>
      <SectionNote>
        2026年日本市場の相場感に基づき、提示条件の競争力を分析
      </SectionNote>
      <div className="flex gap-3 mb-0">
        <FormGroup label="職種・ポジション">
          <Input
            value={position}
            onChange={setPosition}
            placeholder="例: シニアフロントエンドエンジニア"
          />
        </FormGroup>
        <FormGroup label="勤務地">
          <Input
            value={location}
            onChange={setLocation}
            placeholder="例: 東京・フルリモート可"
          />
        </FormGroup>
      </div>
      <FormGroup label="経験レベル">
        <Select
          value={exp}
          onChange={setExp}
          options={[
            { value: "junior", label: "ジュニア（1-3年）" },
            { value: "mid", label: "ミドル（3-7年）" },
            { value: "senior", label: "シニア（7年以上）" },
            { value: "lead", label: "リード・マネージャー" },
          ]}
        />
      </FormGroup>
      <FormGroup label="提示予定の条件">
        <TextArea
          value={offer}
          onChange={setOffer}
          rows={3}
          placeholder="例: 年収800万円、フルリモート、書籍補助3万円/年、フレックス制"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは日本の労働市場と報酬ベンチマークの専門家です。"
          )
        }
        loading={loading}
        label="ベンチマーク分析"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

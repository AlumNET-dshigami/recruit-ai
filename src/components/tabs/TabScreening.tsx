"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabScreening({ run, loading, result }: Props) {
  const [req, setReq] = useState("");
  const [resume, setResume] = useState("");

  const prompt = `以下の情報を基に、2026年基準の書類選考分析を行ってください。

## 求人要件
${req}

## 候補者の履歴書・職務経歴書
${resume}

### 【総合評価】
判定（合格/不合格/保留）/ 総合スコア（100点満点）/ 推薦度

### 【スキルベース評価】(0-40点)
Must要件充足率 / Want要件充足率 / 評価理由（学歴・企業ブランドではなく実際のスキルに基づく）

### 【実績・インパクト評価】(0-30点)
定量的実績の有無と質 / 実績の再現性・汎用性

### 【成長軌道評価】(0-20点)
スキルの深化・広がりの傾向 / キャリアの一貫性と変化への適応

### 【カルチャーフィット予測】(0-10点)
価値観の推定一致度（証拠に基づく推測として明示）

### 【面接での確認ポイント】
書類では判断できない点 / 実績の深掘りポイント / 懸念点の検証方法

### 【バイアスチェック】
評価に無意識バイアスが混入していないかの自己チェック結果

日本語で客観的・公正な分析を提供してください。`;

  return (
    <div>
      <SectionNote>
        スキルベース評価、無意識バイアスチェック内蔵
      </SectionNote>
      <FormGroup label="求人要件">
        <TextArea
          value={req}
          onChange={setReq}
          rows={4}
          placeholder={"例:\nシニアフロントエンドエンジニア\nMust: React 5年以上、TypeScript\nWant: チームリード、SaaS経験"}
        />
      </FormGroup>
      <FormGroup
        label="候補者の履歴書・職務経歴書"
        tip="PDFやWordからのコピー&ペーストで可。"
      >
        <TextArea
          value={resume}
          onChange={setResume}
          rows={7}
          placeholder="候補者の履歴書や職務経歴書の内容をそのまま貼り付けてください"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは2026年のスキルベース採用に対応した書類選考の専門家です。無意識バイアスを排除した公正な分析を行います。"
          )
        }
        loading={loading}
        label="書類選考分析"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

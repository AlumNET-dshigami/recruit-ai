"use client";

import { useState } from "react";
import { FormGroup, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabDiversity({ run, loading, result }: Props) {
  const [val, setVal] = useState("");

  const prompt = `以下の求人票・文章のダイバーシティ・バイアスチェックを実施してください。

## 対象文章
${val}

### 【バイアスリスク総合評価】
リスクレベル（高/中/低）と主要な懸念点

### 【性別バイアス検査】
検出された表現 → 影響 → 修正案

### 【年齢バイアス検査】
年齢制限・年齢示唆・年功序列的表現 → 修正案

### 【学歴・出身バイアス検査】
不必要な学歴要件 → 修正案

### 【その他のバイアス】
障害者・外国籍・育児中等への配慮漏れ / ステレオタイプ表現

### 【インクルーシブ採用スコア】
現状: __/100点 → 改善後の予測: __/100点

### 【改善版の抜粋提案】
バイアスを除去した重要箇所の書き直し例

### 【2026年日本の法規制対応確認】
男女雇用機会均等法 / 障害者雇用促進法 / 年齢制限禁止規定

日本語で具体的に分析してください。`;

  return (
    <div>
      <SectionNote>
        求人票・スカウト文章の無意識バイアスを自動検出し、インクルーシブな表現に改善
      </SectionNote>
      <FormGroup label="チェックする求人票・文章">
        <TextArea
          value={val}
          onChange={setVal}
          rows={7}
          placeholder="バイアスチェックしたい求人票やスカウト文章を貼り付けてください"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたはDEIと採用バイアスの専門家です。科学的根拠に基づいてバイアスを検出し、具体的改善提案を行います。"
          )
        }
        loading={loading}
        label="バイアスチェック実行"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

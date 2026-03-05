"use client";

import { useState } from "react";
import { FormGroup, Input, Select, TextArea, RunButton, ResultBox } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabInterview({ run, loading, result }: Props) {
  const [position, setPosition] = useState("");
  const [level, setLevel] = useState("mid");
  const [type, setType] = useState("comprehensive");
  const [focus, setFocus] = useState("");

  const prompt = `以下の条件で構造化面接の質問セットを生成してください。

面接対象職種: ${position}
面接レベル: ${level}
面接種別: ${type}
重点評価項目: ${focus}

### 【面接設計方針】
評価の焦点と構造化面接としての一貫性の担保方法

### 【アイスブレイク】(5分)
2問（緊張をほぐす・最近の関心を引き出す）

### 【コア質問】(25分)
スキル・専門性評価: 3問（実務シナリオ・問題解決・AIツール活用経験）
行動面接（STAR法）: 3問（成功体験・失敗・チームワーク）
価値観・文化適合: 3問（仕事の意味・成長意欲・心理的安全性の行動実績）

### 【候補者からの逆質問対応】
想定される質問TOP5と回答例 / 企業の魅力を伝えるポイント

### 【評価チェックポイント】
高評価となる回答の特徴 / レッドフラグとなるパターン / 評価シートの項目と配点

日本語で実践的な質問を作成してください。`;

  return (
    <div>
      <FormGroup label="面接対象職種">
        <Input
          value={position}
          onChange={setPosition}
          placeholder="例: シニアフロントエンドエンジニア"
        />
      </FormGroup>
      <div className="flex gap-3">
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            面接レベル
          </label>
          <Select
            value={level}
            onChange={setLevel}
            options={[
              { value: "junior", label: "ジュニア（1-3年）" },
              { value: "mid", label: "ミドル（3-7年）" },
              { value: "senior", label: "シニア（7年以上）" },
              { value: "lead", label: "リード・マネージャー" },
            ]}
          />
        </div>
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            面接種別
          </label>
          <Select
            value={type}
            onChange={setType}
            options={[
              { value: "technical", label: "技術面接" },
              { value: "behavioral", label: "行動面接" },
              { value: "cultural", label: "カルチャーフィット" },
              { value: "comprehensive", label: "総合面接" },
            ]}
          />
        </div>
      </div>
      <FormGroup label="重点評価項目">
        <TextArea
          value={focus}
          onChange={setFocus}
          rows={3}
          placeholder="例: 技術力、コミュニケーション、リーダーシップ、AIツール活用能力"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは2026年の構造化面接設計の専門家です。科学的に予測妥当性が高い面接手法を用いた質問を作成します。"
          )
        }
        loading={loading}
        label="面接質問生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

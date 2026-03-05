"use client";

import { useState } from "react";
import { FormGroup, Input, Select, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

const CONTENT_TYPES = [
  { value: "careers_page", label: "採用ページ（会社紹介）" },
  { value: "sns_post", label: "SNS投稿（X/LinkedIn）" },
  { value: "event", label: "イベント・説明会告知" },
  { value: "tech_blog", label: "テックブログ記事構成" },
  { value: "employee_story", label: "社員インタビュー質問" },
];

const TONES = [
  { value: "professional", label: "プロフェッショナル" },
  { value: "casual", label: "カジュアル・親しみやすい" },
  { value: "passionate", label: "情熱的・ビジョナリー" },
  { value: "data_driven", label: "データドリブン・論理的" },
];

export default function TabBranding({ run, loading, result }: Props) {
  const [contentType, setContentType] = useState("careers_page");
  const [company, setCompany] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("professional");
  const [keyMessages, setKeyMessages] = useState("");

  const contentLabel = CONTENT_TYPES.find((c) => c.value === contentType)?.label || contentType;

  const prompt = `以下の情報を基に、${contentLabel}向けの採用広報コンテンツを作成してください。

## 入力情報
コンテンツ種別: ${contentLabel}
会社情報・魅力: ${company}
ターゲット候補者像: ${target}
トーン: ${TONES.find((t) => t.value === tone)?.label || tone}
訴求したいポイント: ${keyMessages}

## 出力形式

### 【コンテンツ本文】
${contentLabel}に最適化されたフォーマットで作成

### 【ハッシュタグ・キーワード提案】
SEO/SNS向けのキーワード5-10個

### 【ビジュアル提案】
画像・動画のアイデア・構成案

### 【投稿・公開タイミング推奨】
最適な曜日・時間帯・頻度

### 【A/Bテスト案】
タイトルや訴求軸の比較テスト案2パターン

日本語で作成してください。ターゲット候補者の心に響く、authentic なコンテンツにしてください。`;

  return (
    <div>
      <SectionNote>
        採用ページ・SNS投稿・イベント告知など採用広報コンテンツを作成
      </SectionNote>
      <div className="flex gap-3">
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">コンテンツ種別</label>
          <Select value={contentType} onChange={setContentType} options={CONTENT_TYPES} />
        </div>
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">トーン</label>
          <Select value={tone} onChange={setTone} options={TONES} />
        </div>
      </div>
      <FormGroup label="会社情報・魅力">
        <TextArea value={company} onChange={setCompany} rows={3} placeholder="例: SaaS企業、従業員150名、フルリモート、技術投資に積極的" />
      </FormGroup>
      <FormGroup label="ターゲット候補者像">
        <Input value={target} onChange={setTarget} placeholder="例: 20代後半〜30代のエンジニア" />
      </FormGroup>
      <FormGroup label="訴求したいポイント">
        <TextArea value={keyMessages} onChange={setKeyMessages} rows={3} placeholder="例: 技術投資・成長機会・心理的安全性・フルリモート" />
      </FormGroup>
      <RunButton
        onClick={() => run(prompt, "あなたは採用マーケティングと employer branding の専門家です。候補者の心に響くコンテンツを作成します。")}
        loading={loading}
        label="コンテンツ生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

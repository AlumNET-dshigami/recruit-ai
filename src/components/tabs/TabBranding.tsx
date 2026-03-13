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

const CHANNELS = [
  { value: "general", label: "汎用（チャネル指定なし）" },
  { value: "wantedly", label: "Wantedly" },
  { value: "note", label: "note" },
  { value: "corporate_site", label: "公式HP（採用ページ）" },
  { value: "x_twitter", label: "X（旧Twitter）" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
];

const CHANNEL_HINTS: Record<string, string> = {
  wantedly: "Wantedlyストーリー形式（共感重視・カジュアル・ビジョンドリブン）で作成。2000-3000字。",
  note: "note記事形式（読みやすい見出し構成・1人称語り・エモーショナル）で作成。3000-5000字。",
  corporate_site: "企業公式HP採用ページ向け（信頼感・網羅性・SEO重視）で作成。セクション分けを明確に。",
  x_twitter: "X（旧Twitter）投稿向け（140字以内×複数ツイートスレッド形式・ハッシュタグ必須）で作成。",
  linkedin: "LinkedIn投稿向け（プロフェッショナル・業界知見・英語交じり可）で作成。300-600字。",
  instagram: "Instagram投稿向け（ビジュアル重視・キャプション+ハッシュタグ・カルーセル構成案）で作成。",
  youtube: "YouTube動画向け（構成案・台本・サムネイル案・想定尺）で作成。",
  general: "汎用的な採用広報コンテンツとして作成。",
};

const TONES = [
  { value: "professional", label: "プロフェッショナル" },
  { value: "casual", label: "カジュアル・親しみやすい" },
  { value: "passionate", label: "情熱的・ビジョナリー" },
  { value: "data_driven", label: "データドリブン・論理的" },
];

export default function TabBranding({ run, loading, result }: Props) {
  const [contentType, setContentType] = useState("careers_page");
  const [channel, setChannel] = useState("general");
  const [company, setCompany] = useState("");
  const [target, setTarget] = useState("");
  const [tone, setTone] = useState("professional");
  const [keyMessages, setKeyMessages] = useState("");

  const contentLabel = CONTENT_TYPES.find((c) => c.value === contentType)?.label || contentType;
  const channelLabel = CHANNELS.find((c) => c.value === channel)?.label || channel;
  const channelHint = CHANNEL_HINTS[channel] || CHANNEL_HINTS.general;

  const prompt = `以下の情報を基に、${channelLabel}向けの採用広報コンテンツを作成してください。

## 入力情報
コンテンツ種別: ${contentLabel}
掲載チャネル: ${channelLabel}
チャネル最適化指示: ${channelHint}
会社情報・魅力: ${company}
ターゲット候補者像: ${target}
トーン: ${TONES.find((t) => t.value === tone)?.label || tone}
訴求したいポイント: ${keyMessages}

## 出力形式

### 【コンテンツ本文】
${channelLabel}のフォーマット・文字数制限・読者層に最適化して作成

### 【ハッシュタグ・キーワード提案】
${channelLabel}で効果的なキーワード5-10個

### 【ビジュアル提案】
${channelLabel}に適した画像・動画のアイデア

### 【投稿・公開タイミング推奨】
${channelLabel}での最適な曜日・時間帯・頻度

### 【A/Bテスト案】
タイトルや訴求軸の比較テスト案2パターン

日本語で作成してください。${channelLabel}のユーザー層・カルチャーに合わせたauthenticなコンテンツにしてください。`;

  return (
    <div>
      <SectionNote>
        採用ページ・SNS投稿・イベント告知など、チャネルに最適化された採用広報コンテンツを作成
      </SectionNote>
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[180px] mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">コンテンツ種別</label>
          <Select value={contentType} onChange={setContentType} options={CONTENT_TYPES} />
        </div>
        <div className="flex-1 min-w-[180px] mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">掲載チャネル</label>
          <Select value={channel} onChange={setChannel} options={CHANNELS} />
        </div>
        <div className="flex-1 min-w-[180px] mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">トーン</label>
          <Select value={tone} onChange={setTone} options={TONES} />
        </div>
      </div>
      {channel !== "general" && (
        <div className="bg-blue-50 rounded-lg px-4 py-2.5 mb-4 text-[11px] text-blue-700">
          💡 <span className="font-bold">{channelLabel}</span>に最適化: {channelHint}
        </div>
      )}
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
        onClick={() => run(prompt, `あなたは採用マーケティングとemployer brandingの専門家です。特に${channelLabel}でのコンテンツ制作に精通しています。候補者の心に響くコンテンツを作成します。`)}
        loading={loading}
        label={`${channelLabel}向けコンテンツ生成`}
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

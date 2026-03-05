"use client";

import { useState } from "react";
import { PLATFORMS, PLATFORM_NOTES } from "@/lib/constants";
import { FormGroup, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabScout({ run, loading, result }: Props) {
  const [platform, setPlatform] = useState("linkedin");
  const [candidate, setCandidate] = useState("");
  const [company, setCompany] = useState("");

  const prompt = `${platform.toUpperCase()}向けの実際に送信可能な高品質スカウトメッセージを作成してください。

## 候補者プロフィール
${candidate}

## 会社情報・募集ポジションの魅力
${company}

## プラットフォーム仕様
${PLATFORM_NOTES[platform]}

## 2026年版必須要件
1. AIリテラシー向上時代への対応: 候補者の80%以上がAI生成文章を見分けられる。完全に独自の語順・文体で、送信者の「個人的な視点」を必ず1箇所入れる。
2. スキルベース採用時代の訴求: 候補者の具体的なスキル・実績への言及（汎用的表現は不可）
3. 2026年の求職者優先事項: 心理的安全性・柔軟な働き方・学習機会・給与透明性
4. プラットフォーム最適化: ${platform}の文化・慣習に完全準拠

## 出力形式
${platform === "email" || platform === "linkedin" ? "**件名**: [候補者の心を動かす件名]\n\n" : ""}**本文**:
[送信可能な完成メッセージ]

文字数: [実際の文字数]文字

重要: AIが書いたとわからない、採用担当者が個別に書いた自然で温かみのあるメッセージにしてください。`;

  return (
    <div>
      <SectionNote>
        LINE・Green・Findy・OpenWork 対応、AIっぽさ排除の強化
      </SectionNote>
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-all ${
              platform === p.id
                ? "bg-primary text-white border-[1.5px] border-primary"
                : p.isNew
                  ? "bg-white text-slate-600 border-[1.5px] border-slate-300 border-dashed"
                  : "bg-white text-slate-600 border-[1.5px] border-slate-200"
            }`}
          >
            {p.label}
            {p.isNew ? " \u2728" : ""}
          </button>
        ))}
      </div>
      <FormGroup
        label="候補者プロフィール"
        tip="年齢・経験・現職・転職理由など分かる範囲で。Findyなどはスキル偏差値・GitHubへの言及が効果的です。"
      >
        <TextArea
          value={candidate}
          onChange={setCandidate}
          rows={4}
          placeholder={"例:\n29歳、React/Node.js 5年、現在SaaS企業フロントエンド\nチームリード経験あり\n転職理由: より大きな裁量と技術的挑戦を求めて"}
        />
      </FormGroup>
      <FormGroup label="会社情報・募集ポジションの魅力">
        <TextArea
          value={company}
          onChange={setCompany}
          rows={4}
          placeholder={"例:\n急成長SaaS企業（従業員150名）\nシニアフロントエンドエンジニア\n年収700-1000万、フルリモート可\n最新スタック、書籍・カンファレンス全額支給"}
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは2026年の採用マーケティング専門家です。AIっぽさゼロの、真に人間味あふれるスカウトメッセージを作成します。"
          )
        }
        loading={loading}
        label="スカウト生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

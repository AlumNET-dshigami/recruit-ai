"use client";

import { useState } from "react";
import { FormGroup, Input, TextArea, RunButton, ResultBox, SectionNote } from "@/components/ui";

interface Props {
  run: (prompt: string, systemPrompt: string) => void;
  loading: boolean;
  result: string;
}

export default function TabOffer({ run, loading, result }: Props) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [benefits, setBenefits] = useState("");
  const [company, setCompany] = useState("");

  const prompt = `以下の情報を基に、候補者の承諾意欲を高める正式なオファーレターを作成してください。

候補者名: ${name}
ポジション: ${position}
提示給与: ${salary}
入社予定日: ${startDate}
主要ベネフィット: ${benefits}
会社情報: ${company}

【内定通知書】の形式で以下を含めて作成してください:
1. 内定の正式通知と候補者への感謝・歓迎の言葉
2. ポジション・雇用条件の明示（労働基準法第15条対応）
3. 給与・賞与・昇給の詳細
4. 福利厚生・働き方の概要
5. 会社・チームへの期待と成長機会
6. 承諾期限と承諾方法
7. 入社前サポートについて

重要: 法律的な明示義務事項を漏れなく含めつつ、「この会社で働きたい」という気持ちを強化する温かいトーンで作成してください。日本語で正式文書として作成してください。`;

  return (
    <div>
      <SectionNote>
        労働基準法第 15 条の明示義務に対応した、承諾意欲を高める内定通知書を生成
      </SectionNote>
      <div className="flex gap-3">
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            候補者名
          </label>
          <Input
            value={name}
            onChange={setName}
            placeholder="例: 山田 太郎 様"
          />
        </div>
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            ポジション
          </label>
          <Input
            value={position}
            onChange={setPosition}
            placeholder="例: シニアフロントエンドエンジニア"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            提示給与
          </label>
          <Input
            value={salary}
            onChange={setSalary}
            placeholder="例: 年収850万円（月給60万円 + 賞与年2回）"
          />
        </div>
        <div className="flex-1 mb-4">
          <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
            入社予定日
          </label>
          <Input
            value={startDate}
            onChange={setStartDate}
            placeholder="例: 2026年4月1日"
          />
        </div>
      </div>
      <FormGroup label="主要ベネフィット">
        <TextArea
          value={benefits}
          onChange={setBenefits}
          rows={3}
          placeholder="例: フルリモート可、フレックスタイム制、書籍補助月1万円、技術カンファレンス全額支給"
        />
      </FormGroup>
      <FormGroup label="会社情報">
        <TextArea
          value={company}
          onChange={setCompany}
          rows={3}
          placeholder="会社名、事業内容、チームの雰囲気など"
        />
      </FormGroup>
      <RunButton
        onClick={() =>
          run(
            prompt,
            "あなたは人事・法務に精通した採用のプロフェッショナルです。日本の労働法規に準拠した、候補者の承諾意欲を高めるオファーレターを作成します。"
          )
        }
        loading={loading}
        label="オファーレター生成"
      />
      <ResultBox result={result} loading={loading} />
    </div>
  );
}

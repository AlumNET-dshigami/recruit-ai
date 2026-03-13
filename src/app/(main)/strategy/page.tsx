"use client";

import { useState, useCallback } from "react";
import TabPlan from "@/components/tabs/TabPlan";
import TabPersona from "@/components/tabs/TabPersona";
import TabSalary from "@/components/tabs/TabSalary";

type SubTab = "budget" | "persona" | "salary" | "templates";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "budget", icon: "💰", label: "予算・チャネル計画" },
  { id: "persona", icon: "👤", label: "ペルソナ設計" },
  { id: "salary", icon: "💴", label: "給与ベンチマーク" },
  { id: "templates", icon: "📚", label: "業界テンプレート" },
];

const INDUSTRY_DATA = [
  {
    name: "IT・テクノロジー",
    icon: "💻",
    color: "border-blue-200 bg-blue-50",
    tagColor: "bg-blue-100 text-blue-700",
    funnel: [
      { label: "応募→書類通過", rate: "30%" },
      { label: "書類→1次面接", rate: "50%" },
      { label: "1次→最終面接", rate: "60%" },
      { label: "最終→内定", rate: "50%" },
      { label: "内定→入社", rate: "80%" },
    ],
    channels: ["BizReach", "LinkedIn", "Findy", "Green"],
    notes: "エンジニア採用はスカウト返信率が重要。Findy/Greenは技術特化で効率的。",
  },
  {
    name: "コンサルティング",
    icon: "🏢",
    color: "border-violet-200 bg-violet-50",
    tagColor: "bg-violet-100 text-violet-700",
    funnel: [
      { label: "応募→書類通過", rate: "25%" },
      { label: "書類→1次面接", rate: "45%" },
      { label: "1次→最終面接", rate: "55%" },
      { label: "最終→内定", rate: "45%" },
      { label: "内定→入社", rate: "85%" },
    ],
    channels: ["BizReach", "LinkedIn", "エージェント"],
    notes: "ケース面接が特徴。エージェント経由の歩留まりが高い傾向。選考期間は長め。",
  },
  {
    name: "人材サービス",
    icon: "🤝",
    color: "border-emerald-200 bg-emerald-50",
    tagColor: "bg-emerald-100 text-emerald-700",
    funnel: [
      { label: "応募→書類通過", rate: "35%" },
      { label: "書類→1次面接", rate: "55%" },
      { label: "1次→最終面接", rate: "65%" },
      { label: "最終→内定", rate: "55%" },
      { label: "内定→入社", rate: "90%" },
    ],
    channels: ["Wantedly", "LinkedIn", "リファラル"],
    notes: "カルチャーフィット重視。Wantedlyのミッション共感型が効果的。リファラル率も高い。",
  },
];

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("budget");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const run = useCallback(
    async (prompt: string, systemPrompt: string) => {
      if (!prompt.trim()) {
        setError("必須項目を入力してください。");
        return;
      }
      setError("");
      setLoading(true);
      setResults((r) => ({ ...r, [activeTab]: "" }));
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, systemPrompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "エラーが発生しました");
        setResults((r) => ({ ...r, [activeTab]: data.text }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "不明なエラーが発生しました");
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  const tabProps = { run, loading, result: results[activeTab] || "" };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
          🎯 採用戦略
        </h1>
        <p className="text-[13px] text-gray-400 mb-5">
          予算計画・チャネル選定・ペルソナ設計・業界ベンチマーク
        </p>

        {/* Sub Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 py-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-[13.5px]">
                {error}
              </div>
            )}

            {activeTab === "budget" && <TabPlan {...tabProps} />}
            {activeTab === "persona" && <TabPersona {...tabProps} />}
            {activeTab === "salary" && <TabSalary {...tabProps} />}
            {activeTab === "templates" && (
              <div className="space-y-5">
                <div className="bg-slate-50 rounded-lg p-4 text-[13px] text-gray-600">
                  <strong>💡 業界別の採用ベンチマーク</strong>
                  <br />
                  IT・コンサル・人材サービス業界の一般的な歩留まり率と推奨チャネルです。自社の戦略立案にご活用ください。
                </div>
                {INDUSTRY_DATA.map((industry) => (
                  <div
                    key={industry.name}
                    className={`border rounded-xl p-5 ${industry.color}`}
                  >
                    <h3 className="text-[16px] font-extrabold text-gray-800 mb-3">
                      {industry.icon} {industry.name}
                    </h3>

                    {/* Funnel Rates */}
                    <div className="flex gap-2 mb-3">
                      {industry.funnel.map((step) => (
                        <div key={step.label} className="flex-1 text-center">
                          <div className="text-[18px] font-extrabold text-gray-800">
                            {step.rate}
                          </div>
                          <div className="text-[10px] text-gray-500 leading-tight mt-0.5">
                            {step.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Channels */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-gray-500">
                        推奨チャネル:
                      </span>
                      {industry.channels.map((ch) => (
                        <span
                          key={ch}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${industry.tagColor}`}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>

                    <p className="text-[12px] text-gray-500 mt-2">
                      {industry.notes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

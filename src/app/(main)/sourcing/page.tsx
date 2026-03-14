"use client";

import { useState, useCallback } from "react";
import StepNavigation from "@/components/StepNavigation";
import TabJob from "@/components/tabs/TabJob";
import TabScout from "@/components/tabs/TabScout";
import TabBranding from "@/components/tabs/TabBranding";
import TabDiversity from "@/components/tabs/TabDiversity";

type SubTab = "job" | "scout" | "branding" | "diversity";

const SUB_TABS: { id: SubTab; icon: string; label: string }[] = [
  { id: "job", icon: "📋", label: "求人票作成" },
  { id: "scout", icon: "📧", label: "スカウト文生成" },
  { id: "branding", icon: "📢", label: "採用広報" },
  { id: "diversity", icon: "🌈", label: "バイアスチェック" },
];

export default function SourcingPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("job");
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

  const TAB_COMPONENTS: Record<SubTab, React.ReactNode> = {
    job: <TabJob {...tabProps} />,
    scout: <TabScout {...tabProps} />,
    branding: <TabBranding {...tabProps} />,
    diversity: <TabDiversity {...tabProps} />,
  };

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
          📢 母集団形成
        </h1>
        <p className="text-[13px] text-gray-400 mb-5">
          求人票・スカウト文・採用広報・バイアスチェック
        </p>

        {/* Sub Tabs */}
        <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1.5 mb-5">
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
            {TAB_COMPONENTS[activeTab]}
          </div>
        </div>
        <StepNavigation />
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import { TABS, TAB_TITLES, type TabId } from "@/lib/constants";
import TabPersona from "@/components/tabs/TabPersona";
import TabJob from "@/components/tabs/TabJob";
import TabDiversity from "@/components/tabs/TabDiversity";
import TabSalary from "@/components/tabs/TabSalary";
import TabScout from "@/components/tabs/TabScout";
import TabScreening from "@/components/tabs/TabScreening";
import TabInterview from "@/components/tabs/TabInterview";
import TabJudgment from "@/components/tabs/TabJudgment";
import TabOffer from "@/components/tabs/TabOffer";
import TabCustom from "@/components/tabs/TabCustom";
import TabPlan from "@/components/tabs/TabPlan";
import TabBranding from "@/components/tabs/TabBranding";
import TabReference from "@/components/tabs/TabReference";
import TabNegotiation from "@/components/tabs/TabNegotiation";
import TabOnboarding from "@/components/tabs/TabOnboarding";
import TabReport from "@/components/tabs/TabReport";

export default function AiPage() {
  const [activeTab, setActiveTab] = useState<TabId>("plan");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const sections = [...new Set(TABS.map((t) => t.section))];

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

  const tabProps = {
    run,
    loading,
    result: results[activeTab] || "",
  };

  const TAB_COMPONENTS: Record<TabId, React.ReactNode> = {
    plan: <TabPlan {...tabProps} />,
    persona: <TabPersona {...tabProps} />,
    salary: <TabSalary {...tabProps} />,
    job: <TabJob {...tabProps} />,
    diversity: <TabDiversity {...tabProps} />,
    scout: <TabScout {...tabProps} />,
    branding: <TabBranding {...tabProps} />,
    screening: <TabScreening {...tabProps} />,
    interview: <TabInterview {...tabProps} />,
    judgment: <TabJudgment {...tabProps} />,
    reference: <TabReference {...tabProps} />,
    offer: <TabOffer {...tabProps} />,
    negotiation: <TabNegotiation {...tabProps} />,
    onboarding: <TabOnboarding {...tabProps} />,
    report: <TabReport {...tabProps} />,
    custom: <TabCustom {...tabProps} />,
  };

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1000px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-5">
          AIアシスタント
        </h1>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-5 p-4">
          {sections.map((section) => (
            <div key={section} className="mb-3 last:mb-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-1.5 px-1">
                {section}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TABS.filter((t) => t.section === section).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="px-6 pt-5 pb-3.5 border-b border-gray-100">
            <h2 className="text-lg font-extrabold text-gray-800">
              {TAB_TITLES[activeTab]}
            </h2>
          </div>
          <div className="px-6 py-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-[13.5px]">
                {error}
              </div>
            )}
            {TAB_COMPONENTS[activeTab]}
          </div>
        </div>
      </div>
    </div>
  );
}

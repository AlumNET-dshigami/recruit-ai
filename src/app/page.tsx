"use client";

import { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { TAB_TITLES, type TabId } from "@/lib/constants";
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

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("plan");
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

  const tabProps = {
    run,
    loading,
    result: results[activeTab] || "",
  };

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-[820px] mx-auto">
          {/* Title Bar */}
          <div className="bg-card rounded-t-[14px] px-6 pt-5 pb-3.5 border-b-2 border-gray-200">
            <h2 className="m-0 text-xl font-extrabold text-gray-800 tracking-tight">
              {TAB_TITLES[activeTab]}
            </h2>
          </div>

          {/* Content Area */}
          <div className="bg-card rounded-b-[14px] px-6 py-6 shadow-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-red-700 text-[13.5px]">
                {error}
              </div>
            )}
            {activeTab === "plan" && <TabPlan {...tabProps} />}
            {activeTab === "persona" && <TabPersona {...tabProps} />}
            {activeTab === "salary" && <TabSalary {...tabProps} />}
            {activeTab === "job" && <TabJob {...tabProps} />}
            {activeTab === "diversity" && <TabDiversity {...tabProps} />}
            {activeTab === "scout" && <TabScout {...tabProps} />}
            {activeTab === "branding" && <TabBranding {...tabProps} />}
            {activeTab === "screening" && <TabScreening {...tabProps} />}
            {activeTab === "interview" && <TabInterview {...tabProps} />}
            {activeTab === "judgment" && <TabJudgment {...tabProps} />}
            {activeTab === "reference" && <TabReference {...tabProps} />}
            {activeTab === "offer" && <TabOffer {...tabProps} />}
            {activeTab === "negotiation" && <TabNegotiation {...tabProps} />}
            {activeTab === "onboarding" && <TabOnboarding {...tabProps} />}
            {activeTab === "report" && <TabReport {...tabProps} />}
            {activeTab === "custom" && <TabCustom {...tabProps} />}
          </div>
        </div>
      </div>
    </div>
  );
}

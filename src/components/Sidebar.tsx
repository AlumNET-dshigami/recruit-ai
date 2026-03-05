"use client";

import { TABS, type TabId } from "@/lib/constants";

export default function Sidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const sections = [...new Set(TABS.map((t) => t.section))];

  return (
    <div className="sidebar w-60 bg-sidebar flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 border-b border-white/[0.08]">
        <div className="text-white text-lg font-extrabold tracking-tight">
          Recruit AI
        </div>
        <div className="text-slate-400 text-[11px] font-semibold mt-0.5">
          v3.0 / 2026
        </div>
      </div>

      {/* Navigation */}
      {sections.map((section) => (
        <div key={section}>
          <div className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
            {section}
          </div>
          {TABS.filter((t) => t.section === section).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 w-full px-5 py-2.5 border-none text-left cursor-pointer text-[13px] font-semibold transition-all border-l-[3px] ${
                activeTab === tab.id
                  ? "text-white bg-sidebar-active border-l-white"
                  : "text-slate-400 bg-transparent border-l-transparent hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[15px] min-w-[18px]">{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {tab.badge && (
                <span className="bg-danger text-white text-[8px] px-1.5 py-0.5 rounded-lg font-extrabold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div className="mt-auto px-5 py-3.5 border-t border-white/[0.08] text-[10.5px] text-white/30">
        Powered by Gemini 2.0 Flash Lite
        <br />
        &copy; AlumNET 2026
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ href: "/", icon: "🏠", label: "ダッシュボード" }],
  },
  {
    title: "フェーズ①",
    items: [{ href: "/strategy", icon: "🎯", label: "採用戦略" }],
  },
  {
    title: "フェーズ②",
    items: [
      { href: "/sourcing", icon: "📢", label: "母集団形成" },
      { href: "/jobs", icon: "💼", label: "求人管理" },
    ],
  },
  {
    title: "フェーズ③",
    items: [
      { href: "/ats", icon: "👥", label: "選考管理" },
      { href: "/ats/pipeline", icon: "📋", label: "パイプライン" },
      { href: "/ats/compare", icon: "📊", label: "候補者比較" },
      { href: "/ats/calendar", icon: "📅", label: "面接カレンダー" },
      { href: "/ats/import", icon: "📥", label: "CSV取込" },
      { href: "/talent-pool", icon: "🏊", label: "タレントプール" },
      { href: "/assessment", icon: "📝", label: "適性検査" },
    ],
  },
  {
    title: "フェーズ④",
    items: [
      { href: "/analytics", icon: "📊", label: "数値分析" },
      { href: "/culture-fit", icon: "🧬", label: "カルチャーフィット" },
    ],
  },
  {
    items: [{ href: "/settings", icon: "⚙️", label: "設定" }],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/ats") return pathname === "/ats";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`sidebar w-60 bg-sidebar flex flex-col shrink-0 overflow-y-auto
          fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
          md:static md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-3 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-white text-lg font-extrabold tracking-tight">
              Recruit AI
            </div>
            <div className="text-slate-400 text-[11px] font-semibold mt-0.5">
              AI × 採用Ops Platform
            </div>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="md:hidden text-white/60 hover:text-white p-1"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div className="px-5 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-5 py-3 text-[13.5px] font-semibold transition-all border-l-[3px] no-underline ${
                      active
                        ? "text-white bg-sidebar-active border-l-white"
                        : "text-slate-400 bg-transparent border-l-transparent hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-[16px] min-w-[20px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/[0.08] text-[10.5px] text-white/30">
          Powered by Gemini 2.0 Flash Lite
          <br />
          &copy; AlumNET 2026
        </div>
      </div>
    </>
  );
}

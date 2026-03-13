"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", icon: "\u{1F4CA}", label: "ダッシュボード" },
  { href: "/jobs", icon: "\u{1F4CB}", label: "案件管理" },
  { href: "/pipeline", icon: "\u{1F465}", label: "候補者パイプライン" },
  { href: "/ai", icon: "\u{1F916}", label: "AIアシスタント" },
  { href: "/reports", icon: "\u{1F4C8}", label: "レポート" },
  { href: "/settings", icon: "\u2699\uFE0F", label: "設定" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar w-60 bg-sidebar flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-3 border-b border-white/[0.08]">
        <div className="text-white text-lg font-extrabold tracking-tight">
          Recruit AI
        </div>
        <div className="text-slate-400 text-[11px] font-semibold mt-0.5">
          AI Recruiting Ops Platform
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-3 text-[13.5px] font-semibold transition-all border-l-[3px] no-underline ${
                isActive
                  ? "text-white bg-sidebar-active border-l-white"
                  : "text-slate-400 bg-transparent border-l-transparent hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[16px] min-w-[20px]">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-white/[0.08] text-[10.5px] text-white/30">
        Powered by Gemini 2.0 Flash Lite
        <br />
        &copy; AlumNET 2026
      </div>
    </div>
  );
}

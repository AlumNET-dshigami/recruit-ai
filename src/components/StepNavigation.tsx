"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Step = {
  path: string;
  icon: string;
  label: string;
  phase: number;
  phaseLabel: string;
  description: string;
};

const STEPS: Step[] = [
  { path: "/", icon: "🏠", label: "ダッシュボード", phase: 0, phaseLabel: "概要", description: "全体KPIと進捗の一覧" },
  { path: "/strategy", icon: "🎯", label: "採用戦略", phase: 1, phaseLabel: "フェーズ①", description: "予算・ペルソナ・チャネル戦略を設計" },
  { path: "/sourcing", icon: "📢", label: "母集団形成", phase: 2, phaseLabel: "フェーズ②", description: "スカウト・ブランディングで候補者を集める" },
  { path: "/jobs", icon: "💼", label: "求人管理", phase: 2, phaseLabel: "フェーズ②", description: "求人票の作成・管理" },
  { path: "/ats", icon: "👥", label: "選考管理", phase: 3, phaseLabel: "フェーズ③", description: "候補者のステージ管理とAIスコアリング" },
  { path: "/ats/pipeline", icon: "📋", label: "パイプライン", phase: 3, phaseLabel: "フェーズ③", description: "カンバンで選考進捗を可視化" },
  { path: "/ats/compare", icon: "📊", label: "候補者比較", phase: 3, phaseLabel: "フェーズ③", description: "候補者を並べて比較・推薦" },
  { path: "/ats/calendar", icon: "📅", label: "面接カレンダー", phase: 3, phaseLabel: "フェーズ③", description: "面接日程の管理" },
  { path: "/analytics", icon: "📈", label: "数値分析", phase: 4, phaseLabel: "フェーズ④", description: "ファネル・リードタイム・レポート生成" },
  { path: "/culture-fit", icon: "🧬", label: "カルチャーフィット", phase: 4, phaseLabel: "フェーズ④", description: "ハイパフォーマー分析で文化適合度を定量化" },
];

const PHASE_COLORS: Record<number, string> = {
  0: "bg-gray-100 text-gray-600",
  1: "bg-blue-100 text-blue-700",
  2: "bg-emerald-100 text-emerald-700",
  3: "bg-purple-100 text-purple-700",
  4: "bg-amber-100 text-amber-700",
};

export default function StepNavigation() {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => s.path === pathname);
  if (currentIdx < 0) return null;

  const current = STEPS[currentIdx];
  const prev = currentIdx > 0 ? STEPS[currentIdx - 1] : null;
  const next = currentIdx < STEPS.length - 1 ? STEPS[currentIdx + 1] : null;

  return (
    <nav className="mt-8 mb-2 border-t border-gray-100 pt-6">
      {/* Phase indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {[0, 1, 2, 3, 4].map((phase) => {
          const isActive = current.phase === phase;
          return (
            <div
              key={phase}
              className={`h-1.5 rounded-full transition-all ${
                isActive ? "w-8 bg-primary" : phase < current.phase ? "w-5 bg-primary/40" : "w-5 bg-gray-200"
              }`}
            />
          );
        })}
      </div>
      <p className="text-center text-[11px] text-gray-400 mb-4">
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mr-1.5 ${PHASE_COLORS[current.phase]}`}>
          {current.phaseLabel}
        </span>
        {current.description}
      </p>

      {/* Prev / Next */}
      <div className="flex items-stretch gap-3">
        {prev ? (
          <Link
            href={prev.path}
            className="flex-1 flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 hover:border-blue-200 hover:shadow-md transition-all group"
          >
            <span className="text-gray-300 group-hover:text-blue-500 transition-colors text-lg">←</span>
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold">前のステップ</div>
              <div className="text-[13px] font-bold text-gray-700 truncate">
                {prev.icon} {prev.label}
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        {next ? (
          <Link
            href={next.path}
            className="flex-1 flex items-center justify-end gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 hover:border-blue-200 hover:shadow-md transition-all group text-right"
          >
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 font-bold">次のステップ</div>
              <div className="text-[13px] font-bold text-gray-700 truncate">
                {next.icon} {next.label}
              </div>
            </div>
            <span className="text-gray-300 group-hover:text-blue-500 transition-colors text-lg">→</span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </nav>
  );
}

/** ダッシュボード用ワークフローガイド */
export function WorkflowGuide() {
  const phases = [
    {
      phase: 1, label: "フェーズ①", title: "採用戦略",
      steps: [{ icon: "🎯", label: "採用戦略", path: "/strategy", desc: "予算・ペルソナ・チャネル設計" }],
    },
    {
      phase: 2, label: "フェーズ②", title: "母集団形成",
      steps: [
        { icon: "📢", label: "母集団形成", path: "/sourcing", desc: "スカウト・ブランディング" },
        { icon: "💼", label: "求人管理", path: "/jobs", desc: "求人票の作成・管理" },
      ],
    },
    {
      phase: 3, label: "フェーズ③", title: "選考プロセス",
      steps: [
        { icon: "👥", label: "選考管理", path: "/ats", desc: "候補者一覧・AIスコア" },
        { icon: "📋", label: "パイプライン", path: "/ats/pipeline", desc: "カンバンで進捗管理" },
        { icon: "📊", label: "候補者比較", path: "/ats/compare", desc: "並べて比較・推薦" },
        { icon: "📅", label: "面接カレンダー", path: "/ats/calendar", desc: "日程調整" },
      ],
    },
    {
      phase: 4, label: "フェーズ④", title: "分析・改善",
      steps: [
        { icon: "📈", label: "数値分析", path: "/analytics", desc: "ファネル・レポート" },
        { icon: "🧬", label: "カルチャーフィット", path: "/culture-fit", desc: "ハイパフォーマー分析" },
      ],
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <h2 className="text-[15px] font-bold text-gray-700 mb-1">🗺️ 採用ワークフロー</h2>
      <p className="text-[11px] text-gray-400 mb-4">各フェーズをクリックして採用業務を進められます</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {phases.map((p) => (
          <div key={p.phase} className="relative">
            <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2 ${PHASE_COLORS[p.phase]}`}>
              {p.label} {p.title}
            </div>
            <div className="space-y-1.5">
              {p.steps.map((s) => (
                <Link
                  key={s.path}
                  href={s.path}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 hover:shadow-sm transition-all group"
                >
                  <span className="text-[14px]">{s.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-gray-700 group-hover:text-blue-700 transition-colors truncate">
                      {s.label}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{s.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
            {/* connector arrow */}
            {p.phase < 4 && (
              <div className="hidden md:block absolute -right-2 top-1/2 text-gray-200 text-lg">›</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type TabId =
  | "plan"
  | "persona"
  | "salary"
  | "job"
  | "diversity"
  | "scout"
  | "branding"
  | "screening"
  | "interview"
  | "judgment"
  | "reference"
  | "offer"
  | "negotiation"
  | "onboarding"
  | "report"
  | "custom";

export interface Tab {
  id: TabId;
  icon: string;
  label: string;
  section: string;
  badge?: string;
}

export const TABS: Tab[] = [
  // 戦略・計画
  { id: "plan", icon: "\u{1F4CA}", label: "採用計画策定", section: "戦略・計画" },
  { id: "persona", icon: "👤", label: "ペルソナ設計", section: "戦略・計画" },
  { id: "salary", icon: "\u{1F4B4}", label: "給与ベンチマーク", section: "戦略・計画" },

  // 募集・集客
  { id: "job", icon: "\u{1F4CB}", label: "求人票作成", section: "募集・集客" },
  { id: "diversity", icon: "\u{1F308}", label: "バイアスチェック", section: "募集・集客" },
  { id: "scout", icon: "\u{1F4E7}", label: "スカウト文章作成", section: "募集・集客" },
  { id: "branding", icon: "\u{1F4E2}", label: "採用広報コンテンツ", section: "募集・集客" },

  // 選考
  { id: "screening", icon: "\u{1F4C4}", label: "書類選考支援", section: "選考" },
  { id: "interview", icon: "\u{1F3A4}", label: "面接質問生成", section: "選考" },
  { id: "judgment", icon: "\u2696\uFE0F", label: "面接合否判定", section: "選考" },
  { id: "reference", icon: "\u{1F4DE}", label: "リファレンスチェック", section: "選考" },

  // 内定・入社
  { id: "offer", icon: "\u{1F381}", label: "オファーレター", section: "内定・入社" },
  { id: "negotiation", icon: "\u{1F91D}", label: "条件交渉支援", section: "内定・入社" },
  { id: "onboarding", icon: "\u{1F680}", label: "オンボーディング計画", section: "内定・入社" },

  // 分析・ツール
  { id: "report", icon: "\u{1F4C8}", label: "採用レポート", section: "分析・ツール" },
  { id: "custom", icon: "\u2699\uFE0F", label: "カスタム実行", section: "分析・ツール" },
];

export const TAB_TITLES: Record<TabId, string> = {
  plan: "\u{1F4CA} AI採用計画策定",
  persona: "\u{1F9E0} AI採用ペルソナ設計",
  salary: "\u{1F4B4} 給与・条件ベンチマーク",
  job: "\u{1F4CB} AI求人票作成",
  diversity: "\u{1F308} ダイバーシティ・バイアスチェック",
  scout: "\u{1F4E7} AIスカウト文章作成",
  branding: "\u{1F4E2} 採用広報コンテンツ",
  screening: "\u{1F4C4} AI書類選考支援",
  interview: "\u{1F3A4} 面接質問生成",
  judgment: "\u2696\uFE0F 面接合否判定",
  reference: "\u{1F4DE} リファレンスチェック",
  offer: "\u{1F381} オファーレター生成",
  negotiation: "\u{1F91D} 条件交渉支援",
  onboarding: "\u{1F680} オンボーディング計画",
  report: "\u{1F4C8} 採用レポート",
  custom: "\u2699\uFE0F カスタムプロンプト実行",
};

export interface Platform {
  id: string;
  label: string;
  isNew?: boolean;
}

export const PLATFORMS: Platform[] = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "bizreach", label: "BizReach" },
  { id: "twitter", label: "X (Twitter)" },
  { id: "wantedly", label: "Wantedly" },
  { id: "line", label: "LINE", isNew: true },
  { id: "green", label: "Green", isNew: true },
  { id: "findy", label: "Findy", isNew: true },
  { id: "openwork", label: "OpenWork", isNew: true },
  { id: "email", label: "Email" },
];

export const PLATFORM_NOTES: Record<string, string> = {
  linkedin: "400文字以内・プロ敬語・絵文字控えめ・件名付き",
  bizreach: "600文字以内・エグゼクティブ向け・実績数値を具体化",
  twitter: "200文字以内・フラットなカジュアル・DM前提",
  wantedly: "450文字以内・ミッション共感・価値観の共鳴を重視",
  line: "250文字以内・60文字の一言冒頭で開封率最大化",
  green: "500文字以内・技術スタックへの具体的言及必須",
  findy: "400文字以内・スキル偏差値・GitHub への敬意を示す",
  openwork: "500文字以内・口コミへの改善姿勢を率直に示す",
  email: "800文字以内・段落分け・件名付き",
};

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const JOBS = [
  {
    title: "フロントエンドエンジニア",
    department: "プロダクト開発部",
    employment_type: "正社員",
    salary_range: "500-750万円",
    location: "東京（リモート可）",
    status: "open",
    description: "自社SaaSプロダクトのフロントエンド開発をリード",
    requirements: "React/TypeScript 3年以上、Next.js経験",
  },
  {
    title: "バックエンドエンジニア",
    department: "プロダクト開発部",
    employment_type: "正社員",
    salary_range: "550-800万円",
    location: "東京（リモート可）",
    status: "open",
    description: "APIサーバー・マイクロサービス設計・開発",
    requirements: "Go or Python 3年以上、AWS経験",
  },
  {
    title: "プロダクトマネージャー",
    department: "プロダクト企画部",
    employment_type: "正社員",
    salary_range: "700-1000万円",
    location: "東京",
    status: "open",
    description: "SaaSプロダクトのロードマップ策定・機能企画",
    requirements: "PM経験3年以上、B2B SaaS経験優遇",
  },
  {
    title: "UIデザイナー",
    department: "デザイン部",
    employment_type: "正社員",
    salary_range: "450-650万円",
    location: "東京（週2リモート）",
    status: "paused",
    description: "プロダクトのUI/UXデザイン、デザインシステム構築",
    requirements: "Figma、UIデザイン2年以上",
  },
  {
    title: "データサイエンティスト",
    department: "データ戦略部",
    employment_type: "正社員",
    salary_range: "600-900万円",
    location: "東京（フルリモート可）",
    status: "open",
    description: "プロダクトデータ分析・ML基盤構築",
    requirements: "Python、SQL、機械学習実務2年以上",
  },
];

const CANDIDATES = [
  { name: "田中太郎", email: "tanaka@example.com", current_company: "メルカリ", current_position: "フロントエンドエンジニア", experience_years: 5, skills: ["React", "TypeScript", "Next.js"], source: "LinkedIn", resume_text: "メルカリにてフロントエンド開発を5年間担当。React/TypeScript/Next.jsを活用したSPA開発が得意。" },
  { name: "鈴木花子", email: "suzuki@example.com", current_company: "リクルート", current_position: "プロダクトマネージャー", experience_years: 7, skills: ["PM", "Agile", "SQL"], source: "BizReach", resume_text: "リクルートにてB2C/B2B双方のプロダクトマネジメント経験7年。" },
  { name: "山田一郎", email: "yamada@example.com", current_company: "LINE", current_position: "サーバーサイドエンジニア", experience_years: 6, skills: ["Go", "Kubernetes", "AWS"], source: "紹介", resume_text: "LINEにてGo言語でのマイクロサービス開発を6年間担当。" },
  { name: "佐藤次郎", email: "sato@example.com", current_company: "サイバーエージェント", current_position: "UIデザイナー", experience_years: 4, skills: ["Figma", "UI/UX", "Design System"], source: "Wantedly", resume_text: "サイバーエージェントにてAbemaTVのUIデザインを4年間担当。" },
  { name: "高橋美咲", email: "takahashi@example.com", current_company: "DeNA", current_position: "データサイエンティスト", experience_years: 3, skills: ["Python", "ML", "SQL", "TensorFlow"], source: "Green", resume_text: "DeNAにてゲーム事業のデータ分析・予測モデル開発を3年間担当。" },
  { name: "伊藤健太", email: "ito@example.com", current_company: "楽天", current_position: "フロントエンドエンジニア", experience_years: 4, skills: ["React", "Vue.js", "TypeScript"], source: "LinkedIn", resume_text: "楽天にてECサイトのフロントエンド開発を担当。React/Vue.js両方の経験あり。" },
  { name: "渡辺麻衣", email: "watanabe@example.com", current_company: "ZOZO", current_position: "バックエンドエンジニア", experience_years: 5, skills: ["Python", "Django", "AWS"], source: "Findy", resume_text: "ZOZOにてPython/Djangoでの基幹システム開発を5年間担当。" },
  { name: "中村大輔", email: "nakamura@example.com", current_company: "SmartHR", current_position: "PM", experience_years: 4, skills: ["PM", "SaaS", "UX Research"], source: "LinkedIn", resume_text: "SmartHRにて人事労務機能のPMを4年間担当。B2B SaaS経験豊富。" },
  { name: "小林真理", email: "kobayashi@example.com", current_company: "freee", current_position: "フルスタックエンジニア", experience_years: 6, skills: ["React", "Ruby", "Rails", "TypeScript"], source: "BizReach", resume_text: "freeeにてフルスタック開発を6年間担当。フロント・バックエンド両方に精通。" },
  { name: "加藤裕子", email: "kato@example.com", current_company: "マネーフォワード", current_position: "データアナリスト", experience_years: 3, skills: ["Python", "SQL", "Tableau"], source: "Green", resume_text: "マネーフォワードにてプロダクトデータ分析・可視化を3年間担当。" },
  { name: "吉田拓也", email: "yoshida@example.com", current_company: "Preferred Networks", current_position: "MLエンジニア", experience_years: 4, skills: ["Python", "PyTorch", "ML", "AWS"], source: "紹介", resume_text: "PFNにて深層学習モデルの開発・デプロイメントを4年間担当。" },
  { name: "山口さくら", email: "yamaguchi@example.com", current_company: "ラクスル", current_position: "UIデザイナー", experience_years: 3, skills: ["Figma", "Adobe XD", "Illustration"], source: "Wantedly", resume_text: "ラクスルにてSaaSプロダクトのUIデザイン・ブランドデザインを3年間担当。" },
  { name: "松本航", email: "matsumoto@example.com", current_company: "GMOインターネット", current_position: "インフラエンジニア", experience_years: 8, skills: ["AWS", "Terraform", "Docker", "Go"], source: "LinkedIn", resume_text: "GMOにてクラウドインフラの設計・構築・運用を8年間担当。" },
  { name: "井上恵", email: "inoue@example.com", current_company: "Sansan", current_position: "フロントエンドエンジニア", experience_years: 3, skills: ["React", "TypeScript", "CSS"], source: "Findy", resume_text: "Sansanにて名刺管理アプリのフロントエンド開発を3年間担当。" },
  { name: "木村翔太", email: "kimura@example.com", current_company: "ビズリーチ", current_position: "バックエンドエンジニア", experience_years: 5, skills: ["Java", "Spring Boot", "Kotlin"], source: "BizReach", resume_text: "ビズリーチにてJava/Kotlinでの大規模サービス開発を5年間担当。" },
  { name: "林美穂", email: "hayashi@example.com", current_company: "Retty", current_position: "PM", experience_years: 5, skills: ["PM", "Growth", "Analytics"], source: "LinkedIn", resume_text: "Rettyにてグロースチームのプロダクトマネジメントを5年間担当。" },
  { name: "清水大地", email: "shimizu@example.com", current_company: "Speee", current_position: "フロントエンドエンジニア", experience_years: 2, skills: ["React", "JavaScript"], source: "Green", resume_text: "Speeeにてフロントエンド開発を2年間担当。React初学者だが成長意欲高い。" },
  { name: "森田千尋", email: "morita@example.com", current_company: "ユーザベース", current_position: "データサイエンティスト", experience_years: 5, skills: ["Python", "R", "SQL", "Spark"], source: "紹介", resume_text: "ユーザベースにてSPEEDA/NewsPicksのデータ分析を5年間担当。" },
  { name: "岡田龍之介", email: "okada@example.com", current_company: "アンドパッド", current_position: "バックエンドエンジニア", experience_years: 4, skills: ["Go", "gRPC", "PostgreSQL"], source: "Findy", resume_text: "アンドパッドにてGoでの施工管理SaaS開発を4年間担当。" },
  { name: "藤田ゆき", email: "fujita@example.com", current_company: "note", current_position: "UIデザイナー", experience_years: 4, skills: ["Figma", "UI/UX", "Frontend CSS"], source: "Wantedly", resume_text: "noteにてプロダクトUI/UXデザインを4年間担当。CSSも書けるデザイナー。" },
];

// 候補者を案件・ステージに配置するマッピング
const PIPELINE_ASSIGNMENTS = [
  // FEエンジニア (job index 0)
  { jobIdx: 0, candIdx: 0, stage: "interview_final", score: 85 },
  { jobIdx: 0, candIdx: 5, stage: "screening", score: 72 },
  { jobIdx: 0, candIdx: 8, stage: "interview1", score: 78 },
  { jobIdx: 0, candIdx: 13, stage: "applied", score: null },
  { jobIdx: 0, candIdx: 16, stage: "applied", score: null },
  // BEエンジニア (job index 1)
  { jobIdx: 1, candIdx: 2, stage: "interview1", score: 91 },
  { jobIdx: 1, candIdx: 6, stage: "screening", score: 68 },
  { jobIdx: 1, candIdx: 14, stage: "offer", score: 82 },
  { jobIdx: 1, candIdx: 18, stage: "applied", score: null },
  // PM (job index 2)
  { jobIdx: 2, candIdx: 1, stage: "interview_final", score: 88 },
  { jobIdx: 2, candIdx: 7, stage: "interview1", score: 80 },
  { jobIdx: 2, candIdx: 15, stage: "screening", score: 75 },
  // UIデザイナー (job index 3)
  { jobIdx: 3, candIdx: 3, stage: "hired", score: 90 },
  { jobIdx: 3, candIdx: 11, stage: "offer", score: 83 },
  { jobIdx: 3, candIdx: 19, stage: "screening", score: 70 },
  // データサイエンティスト (job index 4)
  { jobIdx: 4, candIdx: 4, stage: "interview1", score: 86 },
  { jobIdx: 4, candIdx: 9, stage: "screening", score: 65 },
  { jobIdx: 4, candIdx: 10, stage: "offer", score: 92 },
  { jobIdx: 4, candIdx: 17, stage: "interview_final", score: 84 },
];

export async function POST() {
  try {
    // 既存データ削除
    await supabase.from("ai_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("pipeline").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 案件投入
    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .insert(JOBS)
      .select();
    if (jobsError) throw jobsError;

    // 候補者投入
    const { data: candidatesData, error: candidatesError } = await supabase
      .from("candidates")
      .insert(CANDIDATES)
      .select();
    if (candidatesError) throw candidatesError;

    // パイプライン投入
    const pipelineRows = PIPELINE_ASSIGNMENTS.map((a) => ({
      job_id: jobsData![a.jobIdx].id,
      candidate_id: candidatesData![a.candIdx].id,
      stage: a.stage,
      score: a.score,
      ai_summary: a.score ? `AI評価スコア: ${a.score}/100` : "",
      notes: "",
    }));

    const { error: pipelineError } = await supabase
      .from("pipeline")
      .insert(pipelineRows);
    if (pipelineError) throw pipelineError;

    return NextResponse.json({
      success: true,
      counts: {
        jobs: jobsData!.length,
        candidates: candidatesData!.length,
        pipeline: pipelineRows.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

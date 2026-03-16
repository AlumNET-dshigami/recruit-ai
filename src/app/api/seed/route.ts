import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const JOBS = [
  {
    title: "店舗コンサルタント",
    department: "コンサルティング事業部",
    employment_type: "正社員",
    salary_range: "400-600万円",
    location: "東京・大阪",
    status: "open",
    description: "通信キャリアショップの売上改善・接客品質向上コンサルティング",
    requirements: "店舗運営経験3年以上、通信業界経験優遇",
  },
  {
    title: "法人営業",
    department: "営業部",
    employment_type: "正社員",
    salary_range: "450-700万円",
    location: "東京",
    status: "open",
    description: "通信キャリア・大手企業向けソリューション提案営業",
    requirements: "法人営業経験2年以上、提案型営業スキル",
  },
  {
    title: "研修トレーナー",
    department: "人材育成部",
    employment_type: "正社員",
    salary_range: "400-550万円",
    location: "東京・名古屋・大阪",
    status: "open",
    description: "通信ショップスタッフ向け接客・販売研修の企画・実施",
    requirements: "研修講師経験2年以上、接客販売経験",
  },
  {
    title: "DX推進エンジニア",
    department: "DX推進部",
    employment_type: "正社員",
    salary_range: "500-750万円",
    location: "東京（リモート可）",
    status: "open",
    description: "社内業務のDX化推進、AIツール導入・運用",
    requirements: "Web開発経験2年以上、業務改善提案力",
  },
  {
    title: "事業開発マネージャー",
    department: "経営企画部",
    employment_type: "正社員",
    salary_range: "600-900万円",
    location: "東京",
    status: "paused",
    description: "新規事業の企画立案・アライアンス推進",
    requirements: "事業開発経験3年以上、通信・小売業界知見",
  },
];

const CANDIDATES = [
  { name: "田中太郎", email: "tanaka@example.com", current_company: "NTTドコモ", current_position: "ショップ店長", experience_years: 5, skills: ["店舗運営", "接客指導", "売上管理"], source: "リクナビNEXT", resume_text: "NTTドコモショップにて店長を5年間経験。スタッフ育成と売上目標達成に注力。" },
  { name: "鈴木花子", email: "suzuki@example.com", current_company: "ソフトバンク", current_position: "法人営業", experience_years: 7, skills: ["法人営業", "提案力", "通信知識"], source: "doda", resume_text: "ソフトバンクにて法人営業7年。大手企業向けモバイルソリューション提案実績多数。" },
  { name: "山田一郎", email: "yamada@example.com", current_company: "KDDI", current_position: "法人営業マネージャー", experience_years: 6, skills: ["法人営業", "マネジメント", "戦略立案"], source: "紹介", resume_text: "KDDIにて法人営業チームのマネジメントを6年間担当。新規開拓に強み。" },
  { name: "佐藤次郎", email: "sato@example.com", current_company: "ベルパーク", current_position: "研修講師", experience_years: 4, skills: ["研修設計", "プレゼン", "接客スキル"], source: "マイナビ転職", resume_text: "ベルパークにて携帯ショップスタッフ向け研修を4年間担当。研修満足度95%以上。" },
  { name: "高橋美咲", email: "takahashi@example.com", current_company: "リクルート", current_position: "業務改善コンサルタント", experience_years: 3, skills: ["業務改善", "データ分析", "プロジェクト管理"], source: "ビズリーチ", resume_text: "リクルートにて小売業界向け業務改善コンサルティングを3年間担当。" },
  { name: "伊藤健太", email: "ito@example.com", current_company: "コネクシオ", current_position: "エリアマネージャー", experience_years: 4, skills: ["複数店舗管理", "売上分析", "人材育成"], source: "リクナビNEXT", resume_text: "コネクシオにてエリアマネージャーとして10店舗を統括。前年比120%の売上達成。" },
  { name: "渡辺麻衣", email: "watanabe@example.com", current_company: "アクセンチュア", current_position: "ITコンサルタント", experience_years: 5, skills: ["DX推進", "要件定義", "PM"], source: "ビズリーチ", resume_text: "アクセンチュアにて通信業界向けDXコンサルティングを5年間担当。" },
  { name: "中村大輔", email: "nakamura@example.com", current_company: "パーソルキャリア", current_position: "研修企画", experience_years: 4, skills: ["研修企画", "LMS運用", "効果測定"], source: "LinkedIn", resume_text: "パーソルキャリアにて法人向け研修プログラム企画を4年間担当。" },
  { name: "小林真理", email: "kobayashi@example.com", current_company: "ティーガイア", current_position: "店舗SV", experience_years: 6, skills: ["店舗指導", "KPI管理", "接客改善"], source: "doda", resume_text: "ティーガイアにてSVとして15店舗の品質管理・売上改善を6年間担当。" },
  { name: "加藤裕子", email: "kato@example.com", current_company: "野村総研", current_position: "経営コンサルタント", experience_years: 3, skills: ["戦略立案", "市場分析", "事業計画"], source: "ビズリーチ", resume_text: "野村総研にて通信・小売業界の経営コンサルティングを3年間担当。" },
  { name: "吉田拓也", email: "yoshida@example.com", current_company: "サイバーエージェント", current_position: "Webエンジニア", experience_years: 4, skills: ["React", "TypeScript", "AWS"], source: "Wantedly", resume_text: "サイバーエージェントにてWebサービス開発を4年間担当。DX領域に興味。" },
  { name: "山口さくら", email: "yamaguchi@example.com", current_company: "パソナ", current_position: "人材コーディネーター", experience_years: 3, skills: ["人材紹介", "キャリアカウンセリング", "法人折衝"], source: "マイナビ転職", resume_text: "パソナにて通信業界特化の人材コーディネートを3年間担当。" },
  { name: "松本航", email: "matsumoto@example.com", current_company: "NEC", current_position: "SE", experience_years: 8, skills: ["システム設計", "PM", "業務改善"], source: "LinkedIn", resume_text: "NECにて通信インフラ系システム設計・PMを8年間担当。" },
  { name: "井上恵", email: "inoue@example.com", current_company: "楽天モバイル", current_position: "店舗スタッフ", experience_years: 3, skills: ["接客", "モバイル知識", "販売"], source: "リクナビNEXT", resume_text: "楽天モバイルにて店舗接客・販売を3年間担当。個人売上トップ3常連。" },
  { name: "木村翔太", email: "kimura@example.com", current_company: "光通信", current_position: "営業マネージャー", experience_years: 5, skills: ["営業管理", "チームビルディング", "KPI設計"], source: "doda", resume_text: "光通信にて営業チーム20名のマネジメントを5年間担当。" },
  { name: "林美穂", email: "hayashi@example.com", current_company: "デロイト", current_position: "コンサルタント", experience_years: 5, skills: ["戦略コンサル", "新規事業", "M&A"], source: "LinkedIn", resume_text: "デロイトにて通信業界の事業戦略・M&Aアドバイザリーを5年間担当。" },
  { name: "清水大地", email: "shimizu@example.com", current_company: "USEN-NEXT", current_position: "法人営業", experience_years: 2, skills: ["営業", "通信サービス", "提案資料作成"], source: "マイナビ転職", resume_text: "USEN-NEXTにて法人向け通信サービス営業を2年間担当。成長意欲が高い。" },
  { name: "森田千尋", email: "morita@example.com", current_company: "ベイン", current_position: "シニアコンサルタント", experience_years: 5, skills: ["経営戦略", "組織改革", "デジタル戦略"], source: "紹介", resume_text: "ベインにて小売・通信業界向け経営コンサルティングを5年間担当。" },
  { name: "岡田龍之介", email: "okada@example.com", current_company: "freee", current_position: "エンジニア", experience_years: 4, skills: ["Ruby", "React", "SaaS開発"], source: "Wantedly", resume_text: "freeeにてSaaSプロダクト開発を4年間担当。業務効率化ツール開発に強み。" },
  { name: "藤田ゆき", email: "fujita@example.com", current_company: "インテリジェンス", current_position: "研修トレーナー", experience_years: 4, skills: ["研修実施", "コーチング", "カリキュラム設計"], source: "マイナビ転職", resume_text: "インテリジェンスにて企業向け研修トレーナーを4年間担当。年間100回以上の登壇実績。" },
];

// 候補者を案件・ステージに配置するマッピング（日付オフセット付き）
const PIPELINE_ASSIGNMENTS: { jobIdx: number; candIdx: number; stage: string; score: number | null; daysAgo?: number; stageChangedDaysAgo?: number }[] = [
  // 店舗コンサルタント (job index 0)
  { jobIdx: 0, candIdx: 0, stage: "interview_final", score: 85, daysAgo: 14, stageChangedDaysAgo: 0 },
  { jobIdx: 0, candIdx: 5, stage: "screening", score: 72, daysAgo: 7, stageChangedDaysAgo: 0 },
  { jobIdx: 0, candIdx: 8, stage: "interview1", score: 78, daysAgo: 12, stageChangedDaysAgo: 0 },
  { jobIdx: 0, candIdx: 13, stage: "applied", score: null, daysAgo: 2, stageChangedDaysAgo: 0 },
  { jobIdx: 0, candIdx: 4, stage: "screening", score: 80, daysAgo: 5, stageChangedDaysAgo: 0 },
  // 法人営業 (job index 1)
  { jobIdx: 1, candIdx: 2, stage: "interview1", score: 91, daysAgo: 18, stageChangedDaysAgo: 0 },
  { jobIdx: 1, candIdx: 6, stage: "rejected", score: 68, daysAgo: 20, stageChangedDaysAgo: 0 },
  { jobIdx: 1, candIdx: 14, stage: "offer", score: 82, daysAgo: 25, stageChangedDaysAgo: 0 },
  { jobIdx: 1, candIdx: 16, stage: "applied", score: null, daysAgo: 3, stageChangedDaysAgo: 0 },
  // 研修トレーナー (job index 2)
  { jobIdx: 2, candIdx: 3, stage: "interview_final", score: 88, daysAgo: 21, stageChangedDaysAgo: 0 },
  { jobIdx: 2, candIdx: 7, stage: "interview1", score: 80, daysAgo: 10, stageChangedDaysAgo: 0 },
  { jobIdx: 2, candIdx: 19, stage: "screening", score: 75, daysAgo: 6, stageChangedDaysAgo: 0 },
  // DX推進エンジニア (job index 3)
  { jobIdx: 3, candIdx: 10, stage: "hired", score: 90, daysAgo: 30, stageChangedDaysAgo: 0 },
  { jobIdx: 3, candIdx: 18, stage: "offer", score: 83, daysAgo: 15, stageChangedDaysAgo: 0 },
  { jobIdx: 3, candIdx: 12, stage: "screening", score: 70, daysAgo: 8, stageChangedDaysAgo: 0 },
  // 事業開発マネージャー (job index 4)
  { jobIdx: 4, candIdx: 1, stage: "interview1", score: 86, daysAgo: 16, stageChangedDaysAgo: 0 },
  { jobIdx: 4, candIdx: 9, stage: "screening", score: 65, daysAgo: 9, stageChangedDaysAgo: 0 },
  { jobIdx: 4, candIdx: 15, stage: "offer", score: 92, daysAgo: 22, stageChangedDaysAgo: 0 },
  { jobIdx: 4, candIdx: 17, stage: "interview_final", score: 84, daysAgo: 19, stageChangedDaysAgo: 0 },
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

    // パイプライン投入（日付バリエーション付き）
    const now = new Date();
    const pipelineRows = PIPELINE_ASSIGNMENTS.map((a) => {
      const createdAt = new Date(now.getTime() - (a.daysAgo || 0) * 86400000);
      const stageChangedAt = new Date(now.getTime() - (a.stageChangedDaysAgo || 0) * 86400000);
      return {
        job_id: jobsData![a.jobIdx].id,
        candidate_id: candidatesData![a.candIdx].id,
        stage: a.stage,
        score: a.score,
        ai_summary: a.score ? `AI評価スコア: ${a.score}/100` : "",
        notes: "",
        created_at: createdAt.toISOString(),
        stage_changed_at: stageChangedAt.toISOString(),
      };
    });

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

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// === HRMOS実データ: 求人18件 ===
const JOBS = [
  { title: "SP事業本部 本社営業部（AE）", department: "SP事業本部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【大手キャリア企業向け/既存営業】本社営業担当（アカウントエグゼクティブ）", requirements: "" },
  { title: "OLSパートナーサクセス", department: "オンラインセールス事業本部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【M&A後の営業経験が積める】オンラインセールス事業本部 パートナーサクセス", requirements: "" },
  { title: "CFO", department: "経営企画部", employment_type: "正社員", salary_range: "1000-1500万円", location: "東京（品川）", status: "open", description: "CFO～資本市場に強く、事業成長に伴走できる実行型CFO or 次期CFO候補～", requirements: "" },
  { title: "人事採用責任者", department: "人事部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【上場企業 / 採用ブランディング、戦略～実行まで】人事採用責任者", requirements: "" },
  { title: "AE（SES派遣）", department: "DX事業部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【クライアント開発課題を解決】SES営業（マネージャー候補）", requirements: "" },
  { title: "事業開発_AE（コンテンツビジネス）", department: "事業開発部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【大手キャリア企業向け】コンテンツビジネスコンサルタント", requirements: "" },
  { title: "管理_経理課長クラス", department: "管理部", employment_type: "正社員", salary_range: "500-700万円", location: "品川本社", status: "open", description: "【東証グロース上場】経理課長ポジション｜M&A推進中企業", requirements: "事業会社での経理実務経験2年以上、日商簿記3級以上" },
  { title: "SP事業本部 支社営業部（AE）", department: "SP事業本部", employment_type: "正社員", salary_range: "応相談", location: "東京", status: "open", description: "【大手キャリア企業向け/既存営業】支社営業担当（アカウントエグゼクティブ）", requirements: "" },
  { title: "オンラインセールス事業部 営業リーダー", department: "オンラインセールス事業本部", employment_type: "正社員", salary_range: "550-700万円", location: "東京（品川）", status: "open", description: "【注力事業】顧客のセールス課題を解決するソリューション営業", requirements: "" },
  { title: "SP事業本部スカウト責任者", department: "SP事業本部", employment_type: "正社員", salary_range: "800-1200万円", location: "東京（品川）", status: "open", description: "HRBP｜事業推進にコミットする採用責任者", requirements: "" },
  { title: "事業開発_AE（金融）", department: "事業開発部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【金融DX】大手通信グループ向け ソリューション企画営業", requirements: "" },
  { title: "OLS プロダクトマネージャー", department: "オンラインセールス事業本部", employment_type: "正社員", salary_range: "応相談", location: "東京", status: "open", description: "【自社サービスPM】プロダクトマネージャー/オンラインセールス事業本部", requirements: "" },
  { title: "SES営業", department: "DX事業部", employment_type: "正社員", salary_range: "500-800万円", location: "東京（品川）", status: "open", description: "IT/SES営業 アカウントマネージャー", requirements: "" },
  { title: "経営企画 M&A/PMI", department: "経営企画部", employment_type: "正社員", salary_range: "800-1500万円", location: "東京（品川）", status: "open", description: "【経営企画】成長企業のM&A戦略・PMI推進（CxO候補）", requirements: "" },
  { title: "管理_法務課長クラス", department: "管理部", employment_type: "正社員", salary_range: "500-700万円", location: "品川本社", status: "open", description: "【東証グロース上場】法務課長ポジション｜M&A法務スペシャリスト", requirements: "法務実務経験5年以上、契約法務・機関法務・コンプライアンスの知識" },
  { title: "OLS 営業責任者", department: "オンラインセールス事業本部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "【M&A後の営業経験が積める】オンラインセールス事業本部 営業責任者（MG候補）", requirements: "" },
  { title: "管理_法務部長クラス", department: "管理部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "法務部長ポジション", requirements: "" },
  { title: "管理_経理部長クラス", department: "管理部", employment_type: "正社員", salary_range: "応相談", location: "東京（品川）", status: "open", description: "経理部長ポジション", requirements: "" },
];

// === FY25採用管理シート実データ: 中途候補者 ===
const CANDIDATES = [
  { name: "阿子嶋 涼", email: "", current_company: "", current_position: "SP｜AE", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "小峯 郁美", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "穴水 浩史", email: "", current_company: "", current_position: "SP｜AE", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "矢内 佑樹", email: "", current_company: "", current_position: "開発｜QAｴﾝｼﾞﾆｱ", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "小谷 公博", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "松山 孝弘", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "IBRAGIMOV NOVRUZ", email: "", current_company: "", current_position: "開発｜ﾃﾞｻﾞｲﾅｰ", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "武末 諒祐", email: "", current_company: "", current_position: "開発｜front-end", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "水口 佳藍", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "橋本 有実", email: "", current_company: "", current_position: "営業ｱｼｽﾀﾝﾄ", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "會澤 正吾", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "鈴木 菜桜", email: "", current_company: "", current_position: "OL｜採用担当", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "灰本 絵理子", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "向田 洋平", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "藤田", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "齋藤 ユカ", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "小金井 裕太郎", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "池田 修一", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "齋藤 遥佳", email: "", current_company: "", current_position: "OL｜採用ｱｼｽﾀﾝﾄ", experience_years: 0, skills: [], source: "Wantedly", resume_text: "" },
  { name: "S. Kevin", email: "", current_company: "", current_position: "", experience_years: 0, skills: [], source: "Wantedly", resume_text: "" },
  { name: "渡辺 秀則", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "鹿野 冴果", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "髙橋 奈生人", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "門脇 茉梨亜", email: "mkadowaki001@gmail.com", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "奧山楓", email: "maple27th@gmail.com", current_company: "", current_position: "", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "川﨑 比華留", email: "hikaru5254@gmail.com", current_company: "", current_position: "", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "長谷川　北斗", email: "tokuho0610@gmail.com", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "山本 航太郎", email: "g.777.co@gmail.com", current_company: "", current_position: "第2｜営業責任者", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "栗間 一敏", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "森 優雄", email: "", current_company: "", current_position: "第2｜CS", experience_years: 0, skills: [], source: "Libz", resume_text: "" },
  { name: "栗間 一敏", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "小賀野 智久", email: "", current_company: "", current_position: "SP｜AE", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "松永 千佳", email: "", current_company: "", current_position: "管理｜経理", experience_years: 0, skills: [], source: "ワークポート", resume_text: "" },
  { name: "倉田 聡美", email: "", current_company: "", current_position: "管理｜法務", experience_years: 0, skills: [], source: "ワークポート", resume_text: "" },
  { name: "大久保　彰馬", email: "siroumatu7@gmail.com", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "若尾 充信", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "大貫 匠", email: "", current_company: "", current_position: "開発｜ﾃﾞｻﾞｲﾅｰ", experience_years: 0, skills: [], source: "㈱LiB", resume_text: "" },
  { name: "早水 潤", email: "", current_company: "", current_position: "", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "矢代 雅暁", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ワークポート", resume_text: "" },
  { name: "井上 直浩", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "廣瀬 栞奈", email: "", current_company: "", current_position: "人事｜採用担当", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "増子 嗣直", email: "", current_company: "", current_position: "開発｜back-end", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "佐々木 あや子", email: "", current_company: "", current_position: "新規｜AI伴走ｺﾝｻﾙ", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "朝倉 大雅", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "上田 遼", email: "", current_company: "", current_position: "オープン", experience_years: 0, skills: [], source: "その他", resume_text: "" },
  { name: "桑原 和久", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "高倉 英明", email: "", current_company: "", current_position: "新規｜AI伴走ｺﾝｻﾙ", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "斉藤 和浩", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "富川 皓生", email: "", current_company: "", current_position: "オープン", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "中村 優斗", email: "", current_company: "", current_position: "オープン", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "黄 光騰", email: "", current_company: "", current_position: "開発｜back-end", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "西川 一貴", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ﾄﾚｼﾞｬｰﾊﾟｰｿﾝｽﾞ", resume_text: "" },
  { name: "近江 正志", email: "m.oumi3228@gmail.com", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "千葉 美香", email: "haruka0724s2@yahoo.co.jp", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "井上 俊介", email: "", current_company: "", current_position: "オープン", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "冨田 裕樹", email: "", current_company: "", current_position: "", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "金　承明", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "蒲田 祐輔", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "小椋 唯", email: "", current_company: "", current_position: "オープン", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "新藤 恭介", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ワークポート", resume_text: "" },
  { name: "鈴木 悠耶", email: "", current_company: "", current_position: "", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "齋藤 元章", email: "", current_company: "", current_position: "OL接客｜OLH", experience_years: 0, skills: [], source: "マイナビ", resume_text: "" },
  { name: "松田 安史", email: "", current_company: "", current_position: "開発｜front-end", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "花畑　一磨", email: "hanabata1006@gmail.com", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "髙橋 健吾", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "佐野 恵隆", email: "", current_company: "", current_position: "開発｜ﾌﾙｽﾀｯｸ", experience_years: 0, skills: [], source: "LASSIC", resume_text: "" },
  { name: "中原 稔晃", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "萩原 岳穂", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "リファラル", resume_text: "" },
  { name: "永田 理実", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "佐藤 恵理香", email: "erisk.fam.4183@gmail.com", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "パーソル", resume_text: "" },
  { name: "桐山 大輝", email: "kiri.1212t@gmail.com", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "工藤 竜佑", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "MS-Japan", resume_text: "" },
  { name: "城戸口 武志", email: "", current_company: "", current_position: "OL接客｜SV以上", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "原 秀基", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "ミドルの転職", resume_text: "" },
  { name: "小山 夏実", email: "", current_company: "", current_position: "OL｜採用担当", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "大矢 光一", email: "", current_company: "", current_position: "管理｜経理Ｌ", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "藤井 政充", email: "", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "亀井 元太", email: "", current_company: "", current_position: "ST｜マーケティング支援部MG", experience_years: 0, skills: [], source: "リクルートエージェント", resume_text: "" },
  { name: "齋藤 公孝", email: "", current_company: "", current_position: "OL接客｜OLH", experience_years: 0, skills: [], source: "マイナビ", resume_text: "" },
  { name: "五嶋 恵理", email: "", current_company: "", current_position: "管理｜経理", experience_years: 0, skills: [], source: "AMBI", resume_text: "" },
  { name: "半澤 陽日", email: "", current_company: "", current_position: "人事｜採用担当", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "鈴木 貴大", email: "tkhr.0630.s@gmail.com", current_company: "", current_position: "SP｜講師", experience_years: 0, skills: [], source: "BizReach", resume_text: "" },
  { name: "中重 勇", email: "", current_company: "", current_position: "DX｜DXコンサル", experience_years: 0, skills: [], source: "Green", resume_text: "" },
  { name: "小島 康寛", email: "", current_company: "", current_position: "開発｜back-end", experience_years: 0, skills: [], source: "Green", resume_text: "" },
];

// === パイプライン配置（実選考データ） ===
const PIPELINE_ASSIGNMENTS: { jobIdx: number; candIdx: number; stage: string; score: number | null; daysAgo: number }[] = [
  { jobIdx: 0, candIdx: 0, stage: "hired", score: 85, daysAgo: 365 },
  { jobIdx: 7, candIdx: 1, stage: "hired", score: 86, daysAgo: 365 },
  { jobIdx: 0, candIdx: 2, stage: "hired", score: 87, daysAgo: 365 },
  { jobIdx: 12, candIdx: 3, stage: "hired", score: 88, daysAgo: 365 },
  { jobIdx: 7, candIdx: 4, stage: "hired", score: 89, daysAgo: 365 },
  { jobIdx: 7, candIdx: 5, stage: "hired", score: 90, daysAgo: 365 },
  { jobIdx: 12, candIdx: 6, stage: "hired", score: 91, daysAgo: 365 },
  { jobIdx: 11, candIdx: 7, stage: "hired", score: 92, daysAgo: 365 },
  { jobIdx: 7, candIdx: 8, stage: "hired", score: 93, daysAgo: 365 },
  { jobIdx: 8, candIdx: 9, stage: "hired", score: 94, daysAgo: 365 },
  { jobIdx: 7, candIdx: 10, stage: "hired", score: 95, daysAgo: 365 },
  { jobIdx: 3, candIdx: 11, stage: "hired", score: 96, daysAgo: 365 },
  { jobIdx: 7, candIdx: 12, stage: "hired", score: 97, daysAgo: 365 },
  { jobIdx: 7, candIdx: 13, stage: "hired", score: 98, daysAgo: 365 },
  { jobIdx: 7, candIdx: 14, stage: "applied", score: null, daysAgo: 365 },
  { jobIdx: 7, candIdx: 15, stage: "applied", score: null, daysAgo: 30 },
  { jobIdx: 7, candIdx: 16, stage: "screening", score: 76, daysAgo: 365 },
  { jobIdx: 12, candIdx: 17, stage: "screening", score: 77, daysAgo: 365 },
  { jobIdx: 3, candIdx: 18, stage: "screening", score: 78, daysAgo: 364 },
  { jobIdx: 0, candIdx: 19, stage: "screening", score: 79, daysAgo: 364 },
  { jobIdx: 12, candIdx: 20, stage: "screening", score: 60, daysAgo: 359 },
  { jobIdx: 12, candIdx: 21, stage: "interview1", score: 76, daysAgo: 330 },
  { jobIdx: 6, candIdx: 22, stage: "screening", score: 62, daysAgo: 302 },
  { jobIdx: 7, candIdx: 23, stage: "screening", score: 63, daysAgo: 257 },
  { jobIdx: 0, candIdx: 24, stage: "screening", score: 64, daysAgo: 259 },
  { jobIdx: 0, candIdx: 25, stage: "screening", score: 65, daysAgo: 246 },
  { jobIdx: 6, candIdx: 26, stage: "interview1", score: 81, daysAgo: 245 },
  { jobIdx: 8, candIdx: 27, stage: "screening", score: 67, daysAgo: 237 },
  { jobIdx: 7, candIdx: 28, stage: "screening", score: 68, daysAgo: 221 },
  { jobIdx: 0, candIdx: 29, stage: "interview1", score: 84, daysAgo: 216 },
  { jobIdx: 7, candIdx: 30, stage: "screening", score: 70, daysAgo: 221 },
  { jobIdx: 0, candIdx: 31, stage: "applied", score: null, daysAgo: 30 },
  { jobIdx: 6, candIdx: 32, stage: "applied", score: null, daysAgo: 200 },
  { jobIdx: 14, candIdx: 33, stage: "applied", score: null, daysAgo: 196 },
  { jobIdx: 6, candIdx: 34, stage: "rejected", score: 44, daysAgo: 250 },
  { jobIdx: 7, candIdx: 35, stage: "rejected", score: 45, daysAgo: 365 },
  { jobIdx: 12, candIdx: 36, stage: "rejected", score: 46, daysAgo: 365 },
  { jobIdx: 0, candIdx: 37, stage: "rejected", score: 47, daysAgo: 365 },
  { jobIdx: 7, candIdx: 38, stage: "rejected", score: 48, daysAgo: 365 },
  { jobIdx: 6, candIdx: 39, stage: "rejected", score: 49, daysAgo: 365 },
  { jobIdx: 3, candIdx: 40, stage: "rejected", score: 50, daysAgo: 365 },
  { jobIdx: 12, candIdx: 41, stage: "rejected", score: 51, daysAgo: 365 },
  { jobIdx: 5, candIdx: 42, stage: "rejected", score: 52, daysAgo: 365 },
  { jobIdx: 12, candIdx: 43, stage: "rejected", score: 53, daysAgo: 365 },
  { jobIdx: 0, candIdx: 44, stage: "rejected", score: 54, daysAgo: 365 },
  { jobIdx: 7, candIdx: 45, stage: "rejected", score: 55, daysAgo: 365 },
  { jobIdx: 5, candIdx: 46, stage: "rejected", score: 56, daysAgo: 365 },
  { jobIdx: 12, candIdx: 47, stage: "rejected", score: 57, daysAgo: 365 },
  { jobIdx: 0, candIdx: 48, stage: "rejected", score: 58, daysAgo: 365 },
  { jobIdx: 0, candIdx: 49, stage: "rejected", score: 59, daysAgo: 365 },
  { jobIdx: 12, candIdx: 50, stage: "rejected", score: 60, daysAgo: 365 },
  { jobIdx: 7, candIdx: 51, stage: "rejected", score: 61, daysAgo: 347 },
  { jobIdx: 7, candIdx: 52, stage: "rejected", score: 62, daysAgo: 279 },
  { jobIdx: 7, candIdx: 53, stage: "rejected", score: 63, daysAgo: 232 },
  { jobIdx: 0, candIdx: 54, stage: "rejected", score: 64, daysAgo: 365 },
  { jobIdx: 0, candIdx: 55, stage: "rejected", score: 65, daysAgo: 365 },
  { jobIdx: 6, candIdx: 56, stage: "rejected", score: 66, daysAgo: 245 },
  { jobIdx: 6, candIdx: 57, stage: "rejected", score: 67, daysAgo: 365 },
  { jobIdx: 0, candIdx: 58, stage: "rejected", score: 68, daysAgo: 365 },
  { jobIdx: 7, candIdx: 59, stage: "rejected", score: 69, daysAgo: 364 },
  { jobIdx: 0, candIdx: 60, stage: "rejected", score: 40, daysAgo: 365 },
  { jobIdx: 1, candIdx: 61, stage: "rejected", score: 41, daysAgo: 365 },
  { jobIdx: 11, candIdx: 62, stage: "rejected", score: 42, daysAgo: 365 },
  { jobIdx: 6, candIdx: 63, stage: "rejected", score: 43, daysAgo: 250 },
  { jobIdx: 7, candIdx: 64, stage: "rejected", score: 44, daysAgo: 365 },
  { jobIdx: 12, candIdx: 65, stage: "rejected", score: 45, daysAgo: 342 },
  { jobIdx: 12, candIdx: 66, stage: "rejected", score: 46, daysAgo: 365 },
  { jobIdx: 6, candIdx: 67, stage: "rejected", score: 47, daysAgo: 30 },
  { jobIdx: 6, candIdx: 68, stage: "rejected", score: 48, daysAgo: 365 },
  { jobIdx: 7, candIdx: 69, stage: "rejected", score: 49, daysAgo: 253 },
  { jobIdx: 7, candIdx: 70, stage: "rejected", score: 50, daysAgo: 279 },
  { jobIdx: 6, candIdx: 71, stage: "rejected", score: 51, daysAgo: 365 },
  { jobIdx: 1, candIdx: 72, stage: "rejected", score: 52, daysAgo: 365 },
  { jobIdx: 7, candIdx: 73, stage: "rejected", score: 53, daysAgo: 365 },
  { jobIdx: 3, candIdx: 74, stage: "rejected", score: 54, daysAgo: 365 },
  { jobIdx: 6, candIdx: 75, stage: "rejected", score: 55, daysAgo: 365 },
  { jobIdx: 7, candIdx: 76, stage: "rejected", score: 56, daysAgo: 365 },
  { jobIdx: 5, candIdx: 77, stage: "rejected", score: 57, daysAgo: 365 },
  { jobIdx: 1, candIdx: 78, stage: "rejected", score: 58, daysAgo: 365 },
  { jobIdx: 6, candIdx: 79, stage: "rejected", score: 59, daysAgo: 365 },
  { jobIdx: 3, candIdx: 80, stage: "rejected", score: 60, daysAgo: 365 },
  { jobIdx: 7, candIdx: 81, stage: "rejected", score: 61, daysAgo: 244 },
  { jobIdx: 12, candIdx: 82, stage: "rejected", score: 62, daysAgo: 365 },
  { jobIdx: 12, candIdx: 83, stage: "rejected", score: 63, daysAgo: 365 },
];

export async function POST() {
  try {
    // 既存データ削除
    await supabase.from("ai_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("pipeline").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 求人投入
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
    const now = new Date();
    const pipelineRows = PIPELINE_ASSIGNMENTS.map((a) => {
      const createdAt = new Date(now.getTime() - a.daysAgo * 86400000);
      return {
        job_id: jobsData![a.jobIdx].id,
        candidate_id: candidatesData![a.candIdx].id,
        stage: a.stage,
        score: a.score,
        ai_summary: a.score ? `AI評価スコア: ${a.score}/100` : "",
        notes: "",
        created_at: createdAt.toISOString(),
        stage_changed_at: createdAt.toISOString(),
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

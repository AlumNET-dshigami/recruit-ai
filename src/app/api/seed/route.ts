import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// ── サンプルデモ用データ ──────────────────────────────
// 架空のIT企業「株式会社テックブリッジ」の採用データ

const JOBS = [
  { title: "フロントエンドエンジニア", department: "プロダクト開発部", employment_type: "正社員", salary_range: "500万円〜800万円", location: "東京/リモート", status: "open" as const, description: "React/Next.jsを用いたWebアプリケーション開発。デザインシステムの構築・運用", requirements: "React実務3年以上、TypeScript経験" },
  { title: "バックエンドエンジニア", department: "プロダクト開発部", employment_type: "正社員", salary_range: "550万円〜850万円", location: "東京/リモート", status: "open" as const, description: "Go/Pythonによるマイクロサービス開発。APIの設計・実装・パフォーマンス最適化", requirements: "Go or Python実務3年以上、DB設計経験" },
  { title: "プロダクトマネージャー", department: "プロダクト企画部", employment_type: "正社員", salary_range: "700万円〜1100万円", location: "東京", status: "open" as const, description: "SaaSプロダクトのロードマップ策定・KPI管理・ステークホルダー連携", requirements: "PdM経験3年以上、SaaS事業経験" },
  { title: "データサイエンティスト", department: "AI・データ推進室", employment_type: "正社員", salary_range: "600万円〜1000万円", location: "東京/リモート", status: "open" as const, description: "機械学習モデルの開発・運用。推薦エンジン・需要予測の構築", requirements: "Python/ML実務2年以上、統計学の知識" },
  { title: "SRE / インフラエンジニア", department: "プラットフォーム部", employment_type: "正社員", salary_range: "600万円〜950万円", location: "東京/リモート", status: "open" as const, description: "AWS/GCPインフラ設計・構築、CI/CD、監視基盤、SLO運用", requirements: "AWS/GCP実務3年以上、Terraform/K8s経験" },
  { title: "経理マネージャー", department: "管理部", employment_type: "正社員", salary_range: "550万円〜750万円", location: "東京", status: "open" as const, description: "月次・四半期・年次決算、税務対応、管理会計レポーティング", requirements: "経理実務5年以上、マネジメント経験" },
  { title: "人事・採用リーダー", department: "人事部", employment_type: "正社員", salary_range: "500万円〜700万円", location: "東京", status: "open" as const, description: "エンジニア採用戦略の立案・実行、採用ブランディング", requirements: "IT企業での採用経験3年以上" },
  { title: "カスタマーサクセス", department: "CS部", employment_type: "正社員", salary_range: "450万円〜650万円", location: "東京", status: "open" as const, description: "エンタープライズ顧客のオンボーディング・活用支援・チャーン防止", requirements: "CS/コンサル経験2年以上" },
  { title: "セールスマネージャー", department: "営業部", employment_type: "正社員", salary_range: "600万円〜900万円", location: "東京/大阪", status: "open" as const, description: "エンタープライズセールスチームのマネジメント、営業戦略策定", requirements: "BtoB SaaS営業3年以上、マネジメント経験" },
  { title: "デザイナー（UI/UX）", department: "デザイン部", employment_type: "正社員", salary_range: "500万円〜750万円", location: "東京/リモート", status: "open" as const, description: "プロダクトUI/UXデザイン、ユーザーリサーチ、プロトタイピング", requirements: "UI/UXデザイン実務3年以上、Figma" },
  { title: "QAエンジニア", department: "品質管理部", employment_type: "正社員", salary_range: "450万円〜700万円", location: "東京/リモート", status: "open" as const, description: "テスト戦略策定、自動テスト基盤構築、品質メトリクス管理", requirements: "QA実務2年以上、テスト自動化経験" },
  { title: "マーケティングマネージャー", department: "マーケティング部", employment_type: "正社員", salary_range: "600万円〜900万円", location: "東京", status: "open" as const, description: "デジタルマーケティング戦略、リード獲得、コンテンツマーケティング", requirements: "BtoBマーケ3年以上" },
];

const CANDIDATES = [
  // エンジニア系
  { name: "佐藤 健太", email: "kenta.s@example.com", phone: "090-1234-5001", current_company: "株式会社メルカリ", current_position: "フロントエンドエンジニア", experience_years: 5, skills: ["React", "TypeScript", "Next.js", "GraphQL"], source: "BizReach", resume_text: "メルカリにてReact/Next.jsでの大規模Webアプリ開発を5年間担当。パフォーマンス最適化とアクセシビリティ改善をリード。", notes: "" },
  { name: "田中 美咲", email: "misaki.t@example.com", phone: "090-1234-5002", current_company: "サイバーエージェント", current_position: "テックリード", experience_years: 7, skills: ["React", "Vue.js", "TypeScript", "AWS"], source: "Green", resume_text: "サイバーエージェントにて広告プロダクトのフロントエンド開発をリード。チーム10名のマネジメント経験あり。", notes: "" },
  { name: "鈴木 大輝", email: "daiki.s@example.com", phone: "090-1234-5003", current_company: "LINE株式会社", current_position: "ソフトウェアエンジニア", experience_years: 4, skills: ["Go", "Kubernetes", "gRPC", "PostgreSQL"], source: "リファラル", resume_text: "LINEにてメッセージングプラットフォームのバックエンド開発。Go/K8sでマイクロサービスアーキテクチャを推進。", notes: "" },
  { name: "高橋 裕子", email: "yuko.t@example.com", phone: "090-1234-5004", current_company: "楽天グループ", current_position: "シニアエンジニア", experience_years: 8, skills: ["Java", "Spring Boot", "AWS", "Terraform"], source: "BizReach", resume_text: "楽天にてECプラットフォームのバックエンド設計・開発を8年間担当。大規模トラフィック対応の知見豊富。", notes: "" },
  { name: "伊藤 翔太", email: "shota.i@example.com", phone: "090-1234-5005", current_company: "スタートアップA社", current_position: "CTO", experience_years: 10, skills: ["Python", "Go", "AWS", "チームビルディング"], source: "LinkedIn", resume_text: "シリーズBスタートアップのCTOとして開発組織20名を構築。技術戦略からハンズオン開発まで幅広く対応。", notes: "" },
  { name: "渡辺 真理", email: "mari.w@example.com", phone: "090-1234-5006", current_company: "富士通", current_position: "データサイエンティスト", experience_years: 5, skills: ["Python", "TensorFlow", "PyTorch", "SQL"], source: "Green", resume_text: "富士通にて需要予測・異常検知のMLモデル開発を担当。Kaggle Competition入賞経験あり。", notes: "" },
  { name: "山本 拓海", email: "takumi.y@example.com", phone: "090-1234-5007", current_company: "AWS Japan", current_position: "ソリューションアーキテクト", experience_years: 6, skills: ["AWS", "Terraform", "Docker", "Kubernetes"], source: "BizReach", resume_text: "AWSにてエンタープライズ顧客向けクラウドアーキテクチャ設計を担当。認定資格5つ保有。", notes: "" },
  { name: "中村 千夏", email: "chinatsu.n@example.com", phone: "090-1234-5008", current_company: "DeNA", current_position: "フルスタックエンジニア", experience_years: 4, skills: ["React", "Node.js", "Python", "GCP"], source: "Wantedly", resume_text: "DeNAにてゲームプラットフォームのフルスタック開発。フロントからインフラまで幅広く対応。", notes: "" },
  { name: "小林 遼", email: "ryo.k@example.com", phone: "090-1234-5009", current_company: "freee", current_position: "QAエンジニア", experience_years: 5, skills: ["Selenium", "Cypress", "Jest", "CI/CD"], source: "Green", resume_text: "freeeにてE2Eテスト自動化基盤を構築。テスト工数50%削減を実現。品質メトリクスダッシュボードも開発。", notes: "" },
  { name: "加藤 ゆり", email: "yuri.k@example.com", phone: "090-1234-5010", current_company: "SmartHR", current_position: "プロダクトデザイナー", experience_years: 6, skills: ["Figma", "ユーザーリサーチ", "デザインシステム", "プロトタイピング"], source: "Wantedly", resume_text: "SmartHRにてプロダクトデザインをリード。デザインシステムの構築とユーザビリティテストの定着化に貢献。", notes: "" },
  // ビジネス系
  { name: "吉田 亮太", email: "ryota.y@example.com", phone: "090-1234-5011", current_company: "Salesforce Japan", current_position: "アカウントエグゼクティブ", experience_years: 7, skills: ["エンタープライズセールス", "SaaS", "CRM"], source: "BizReach", resume_text: "SalesforceにてエンタープライズAE。年間ARR 3億円達成。金融・製造業界に強み。", notes: "" },
  { name: "松本 さくら", email: "sakura.m@example.com", phone: "090-1234-5012", current_company: "ラクスル", current_position: "カスタマーサクセスマネージャー", experience_years: 4, skills: ["CS", "Gainsight", "データ分析", "プロジェクト管理"], source: "Green", resume_text: "ラクスルにてエンタープライズCSを担当。NRR120%、チャーンレート1%以下を維持。", notes: "" },
  { name: "井上 大樹", email: "daiki.i@example.com", phone: "090-1234-5013", current_company: "リクルート", current_position: "プロダクトマネージャー", experience_years: 8, skills: ["プロダクトマネジメント", "Agile", "データ分析", "ユーザーインタビュー"], source: "リファラル", resume_text: "リクルートにて求人サービスのPdMを8年間担当。DAU100万規模のプロダクトをグロース。", notes: "" },
  { name: "木村 香織", email: "kaori.k@example.com", phone: "090-1234-5014", current_company: "マネーフォワード", current_position: "マーケティングリーダー", experience_years: 6, skills: ["デジタルマーケ", "MA", "コンテンツマーケ", "SEO"], source: "BizReach", resume_text: "マネーフォワードにてBtoBマーケをリード。リード獲得数を前年比200%に成長させた実績。", notes: "" },
  { name: "林 健一", email: "kenichi.h@example.com", phone: "090-1234-5015", current_company: "PwCコンサルティング", current_position: "シニアマネージャー", experience_years: 12, skills: ["経営コンサル", "DX", "PMO", "変革推進"], source: "MS-Japan", resume_text: "PwCにてDXコンサルティングを12年間担当。大手製造業・金融機関の変革プロジェクトをリード。", notes: "" },
  // 管理部門系
  { name: "斉藤 麻衣", email: "mai.s@example.com", phone: "090-1234-5016", current_company: "三菱UFJ銀行", current_position: "経理部 課長", experience_years: 10, skills: ["経理", "IFRS", "連結決算", "SAP"], source: "MS-Japan", resume_text: "三菱UFJにて経理部課長として連結決算・IFRS対応をリード。上場企業の経理実務に精通。", notes: "" },
  { name: "山田 拓也", email: "takuya.y@example.com", phone: "090-1234-5017", current_company: "メルペイ", current_position: "HRマネージャー", experience_years: 7, skills: ["採用戦略", "組織開発", "エンジニア採用", "ダイレクトリクルーティング"], source: "リファラル", resume_text: "メルペイにてエンジニア採用チームをマネジメント。年間40名の技術者採用を達成。", notes: "" },
  // 追加エンジニア
  { name: "藤原 翼", email: "tsubasa.f@example.com", phone: "090-1234-5018", current_company: "Yahoo Japan", current_position: "バックエンドエンジニア", experience_years: 5, skills: ["Java", "Spring", "Kafka", "MySQL"], source: "Green", resume_text: "Yahooにて検索基盤のバックエンド開発。秒間10万リクエスト規模のシステム運用経験。", notes: "" },
  { name: "石井 彩", email: "aya.i@example.com", phone: "090-1234-5019", current_company: "Preferred Networks", current_position: "MLエンジニア", experience_years: 4, skills: ["Python", "PyTorch", "CUDA", "分散処理"], source: "LinkedIn", resume_text: "PFNにてディープラーニングモデルの最適化・本番デプロイを担当。論文投稿実績あり。", notes: "" },
  { name: "前田 剛", email: "tsuyoshi.m@example.com", phone: "090-1234-5020", current_company: "GMOペパボ", current_position: "SRE", experience_years: 6, skills: ["AWS", "GCP", "Ansible", "Prometheus"], source: "Wantedly", resume_text: "GMOペパボにてSREチームリーダー。SLO設計・オブザーバビリティ基盤の構築を主導。", notes: "" },
  { name: "岡田 莉奈", email: "rina.o@example.com", phone: "090-1234-5021", current_company: "Sansan", current_position: "フロントエンドエンジニア", experience_years: 3, skills: ["React", "TypeScript", "Storybook", "テスト"], source: "Green", resume_text: "SansanにてBtoB SaaSのフロントエンド開発。コンポーネント設計とアクセシビリティに注力。", notes: "" },
  { name: "西田 涼太", email: "ryota.n@example.com", phone: "090-1234-5022", current_company: "ZOZO", current_position: "データエンジニア", experience_years: 4, skills: ["Python", "Spark", "BigQuery", "Airflow"], source: "BizReach", resume_text: "ZOZOにてデータパイプラインの設計・構築を担当。推薦基盤のデータ整備プロジェクトをリード。", notes: "" },
  { name: "上田 美月", email: "mizuki.u@example.com", phone: "090-1234-5023", current_company: "パーソルキャリア", current_position: "採用コンサルタント", experience_years: 5, skills: ["採用戦略", "RPO", "エンジニア採用", "採用マーケ"], source: "リファラル", resume_text: "パーソルにてIT企業向けRPOを担当。年間200名規模の採用プロジェクトを成功に導いた実績。", notes: "" },
  { name: "近藤 大地", email: "daichi.k@example.com", phone: "090-1234-5024", current_company: "マクロミル", current_position: "セールスリーダー", experience_years: 6, skills: ["SaaS営業", "チームマネジメント", "CRM", "提案営業"], source: "doda", resume_text: "マクロミルにてSaaS営業チームリーダー。新規開拓から既存深耕まで幅広い営業活動を推進。", notes: "" },
  { name: "安藤 花", email: "hana.a@example.com", phone: "090-1234-5025", current_company: "note株式会社", current_position: "コンテンツマーケター", experience_years: 3, skills: ["SEO", "コンテンツ企画", "SNS運用", "ライティング"], source: "Wantedly", resume_text: "noteにてオウンドメディア運営。月間PV50万を達成。SEO戦略の立案・実行を主導。", notes: "" },
  { name: "村上 慶太", email: "keita.m@example.com", phone: "090-1234-5026", current_company: "アクセンチュア", current_position: "マネージャー", experience_years: 9, skills: ["戦略コンサル", "DX", "AI/ML導入", "PjM"], source: "BizReach", resume_text: "アクセンチュアにて大手企業のDX/AI導入プロジェクトを9年間リード。デリバリー実績多数。", notes: "" },
  { name: "坂本 沙織", email: "saori.s@example.com", phone: "090-1234-5027", current_company: "クックパッド", current_position: "プロダクトデザイナー", experience_years: 5, skills: ["UI/UX", "Figma", "ユーザーテスト", "情報設計"], source: "Green", resume_text: "クックパッドにてプロダクトUI/UXをデザイン。ユーザーリサーチ主導でリニューアルを推進。", notes: "" },
  { name: "福田 淳", email: "jun.f@example.com", phone: "090-1234-5028", current_company: "EY Japan", current_position: "経理・財務アドバイザリー", experience_years: 8, skills: ["公認会計士", "監査", "IFRS", "M&A DD"], source: "MS-Japan", resume_text: "EYにて上場企業の監査・財務アドバイザリーを担当。公認会計士資格保有、M&A DD経験豊富。", notes: "" },
  { name: "三浦 優", email: "yu.m@example.com", phone: "090-1234-5029", current_company: "スマートキャンプ", current_position: "CSリーダー", experience_years: 4, skills: ["カスタマーサクセス", "SaaS", "オンボーディング", "ヘルススコア"], source: "Wantedly", resume_text: "スマートキャンプにてCSチームリーダー。ヘルススコア導入によりチャーン率30%削減を実現。", notes: "" },
  { name: "河野 太一", email: "taichi.k@example.com", phone: "090-1234-5030", current_company: "Google Japan", current_position: "ソフトウェアエンジニア", experience_years: 6, skills: ["Go", "C++", "分散システム", "大規模データ処理"], source: "LinkedIn", resume_text: "Googleにて広告配信システムのバックエンド開発。低レイテンシ・高スループットなシステム設計に強み。", notes: "" },
  // 追加ビジネス
  { name: "原田 瑠衣", email: "rui.h@example.com", phone: "090-1234-5031", current_company: "ビズリーチ", current_position: "フィールドセールス", experience_years: 4, skills: ["BtoB営業", "SaaS", "エンタープライズ", "Salesforce"], source: "doda", resume_text: "ビズリーチにてフィールドセールスを担当。エンタープライズ向け新規開拓で四半期MVPを3回受賞。", notes: "" },
  { name: "久保 直人", email: "naoto.k@example.com", phone: "090-1234-5032", current_company: "Chatwork", current_position: "マーケティングマネージャー", experience_years: 7, skills: ["BtoBマーケ", "広告運用", "MA", "リードナーチャリング"], source: "BizReach", resume_text: "ChatworkにてBtoBマーケ部門を統括。MQL月間500件を安定的に創出する仕組みを構築。", notes: "" },
  // さらにエンジニア追加（パイプラインの多様性のため）
  { name: "長谷川 真人", email: "masato.h@example.com", phone: "090-1234-5033", current_company: "ミクシィ", current_position: "Androidエンジニア", experience_years: 4, skills: ["Kotlin", "Android", "Jetpack Compose", "CI/CD"], source: "Green", resume_text: "ミクシィにてモンストのAndroidアプリ開発。パフォーマンス改善とUI刷新プロジェクトを主導。", notes: "" },
  { name: "清水 彩花", email: "ayaka.s@example.com", phone: "090-1234-5034", current_company: "マネーフォワード", current_position: "QAマネージャー", experience_years: 7, skills: ["テスト戦略", "品質管理", "Selenium", "テスト自動化"], source: "BizReach", resume_text: "マネーフォワードにてQAチームを統括。テスト自動化率80%を達成し、リリースサイクルを2週間に短縮。", notes: "" },
  { name: "阿部 龍一", email: "ryuichi.a@example.com", phone: "090-1234-5035", current_company: "テックスタートアップB社", current_position: "フルスタックエンジニア", experience_years: 3, skills: ["React", "Node.js", "PostgreSQL", "Docker"], source: "Wantedly", resume_text: "シード期スタートアップにてプロダクトを0→1で構築。フロントからインフラまで1人で担当した経験。", notes: "" },
];

const PIPELINE_ASSIGNMENTS = [
  // フロントエンドエンジニア (jobIdx: 0)
  { jobIdx: 0, candIdx: 0, stage: "interview_final" as const, score: 88, summary: "React/Next.jsの実績が非常に豊富。デザインシステム構築経験がマッチ。最終面接へ" },
  { jobIdx: 0, candIdx: 1, stage: "offer" as const, score: 92, summary: "テックリード経験あり。チームマネジメントも可能。年収交渉中" },
  { jobIdx: 0, candIdx: 7, stage: "interview1" as const, score: 75, summary: "フルスタック志向で幅広い経験。フロント特化ではないがポテンシャル高い" },
  { jobIdx: 0, candIdx: 20, stage: "screening" as const, score: 70, summary: "経験3年と若手だがコンポーネント設計力が高い" },
  { jobIdx: 0, candIdx: 34, stage: "applied" as const, score: null, summary: "" },

  // バックエンドエンジニア (jobIdx: 1)
  { jobIdx: 1, candIdx: 2, stage: "hired" as const, score: 95, summary: "Go/K8sの実績が完璧にマッチ。LINEでの大規模開発経験も申し分なし。入社決定" },
  { jobIdx: 1, candIdx: 3, stage: "interview_final" as const, score: 85, summary: "Java/Spring中心だがGo学習意欲高い。大規模トラフィック経験が強み" },
  { jobIdx: 1, candIdx: 17, stage: "interview1" as const, score: 78, summary: "Yahoo出身。検索基盤の経験は貴重だがGo経験なし" },
  { jobIdx: 1, candIdx: 29, stage: "screening" as const, score: 82, summary: "Google出身。分散システム設計の専門家。年収交渉がポイント" },
  { jobIdx: 1, candIdx: 4, stage: "rejected" as const, score: 60, summary: "CTO経験者だが、IC（Individual Contributor）ポジションにはオーバースペック" },

  // プロダクトマネージャー (jobIdx: 2)
  { jobIdx: 2, candIdx: 12, stage: "offer" as const, score: 90, summary: "リクルートでのPdM経験8年。SaaS事業グロースの実績が豊富。最終面接後オファー提示" },
  { jobIdx: 2, candIdx: 4, stage: "interview_final" as const, score: 85, summary: "CTO→PdMへのキャリアチェンジ。技術理解が深くエンジニアとの協業に強み" },
  { jobIdx: 2, candIdx: 14, stage: "screening" as const, score: 72, summary: "コンサル出身。プロダクト実務経験はないがビジネス分析力は高い" },

  // データサイエンティスト (jobIdx: 3)
  { jobIdx: 3, candIdx: 5, stage: "hired" as const, score: 91, summary: "ML実務5年+Kaggle入賞。即戦力として入社。推薦エンジン開発に着手予定" },
  { jobIdx: 3, candIdx: 18, stage: "interview1" as const, score: 84, summary: "PFN出身のMLエンジニア。PyTorch/CUDA経験が強み。研究志向" },
  { jobIdx: 3, candIdx: 21, stage: "screening" as const, score: 73, summary: "データエンジニア寄りだがML基礎知識あり。パイプライン構築力が強み" },

  // SRE / インフラエンジニア (jobIdx: 4)
  { jobIdx: 4, candIdx: 6, stage: "hired" as const, score: 93, summary: "AWS SA出身。認定資格5つ保有。即戦力として入社決定" },
  { jobIdx: 4, candIdx: 19, stage: "interview_final" as const, score: 86, summary: "GMOペパボSREリーダー。SLO設計・オブザーバビリティ経験がマッチ" },
  { jobIdx: 4, candIdx: 7, stage: "screening" as const, score: 68, summary: "フルスタック志向でインフラ経験はやや浅い" },

  // 経理マネージャー (jobIdx: 5)
  { jobIdx: 5, candIdx: 15, stage: "offer" as const, score: 89, summary: "三菱UFJ経理課長。IFRS/連結決算の知見が豊富。オファー提示済み" },
  { jobIdx: 5, candIdx: 28, stage: "interview1" as const, score: 81, summary: "EY出身の公認会計士。監査→事業会社経理への転身希望" },

  // 人事・採用リーダー (jobIdx: 6)
  { jobIdx: 6, candIdx: 16, stage: "hired" as const, score: 90, summary: "メルペイHRマネージャー。エンジニア採用年間40名の実績が決め手で入社" },
  { jobIdx: 6, candIdx: 22, stage: "interview_final" as const, score: 83, summary: "パーソルでRPO経験。IT企業採用の知見豊富だが事業会社経験なし" },

  // カスタマーサクセス (jobIdx: 7)
  { jobIdx: 7, candIdx: 11, stage: "interview1" as const, score: 80, summary: "ラクスルCSマネージャー。NRR120%の実績は魅力的" },
  { jobIdx: 7, candIdx: 29, stage: "screening" as const, score: 65, summary: "スマートキャンプCSリーダー。SaaS CS経験4年" },
  { jobIdx: 7, candIdx: 14, stage: "rejected" as const, score: 55, summary: "コンサル出身でCS実務経験なし。オーバースペック" },

  // セールスマネージャー (jobIdx: 8)
  { jobIdx: 8, candIdx: 10, stage: "hired" as const, score: 92, summary: "Salesforce AE7年。エンタープライズセールスの第一人者。入社後営業チーム立ち上げ" },
  { jobIdx: 8, candIdx: 23, stage: "interview1" as const, score: 76, summary: "マクロミルSaaS営業リーダー。チームマネジメント経験あり" },
  { jobIdx: 8, candIdx: 30, stage: "screening" as const, score: 72, summary: "ビズリーチFS出身。エンタープライズ経験が豊富" },

  // デザイナー (jobIdx: 9)
  { jobIdx: 9, candIdx: 9, stage: "interview_final" as const, score: 87, summary: "SmartHRデザイナー。デザインシステム構築経験がぴったりマッチ" },
  { jobIdx: 9, candIdx: 26, stage: "interview1" as const, score: 79, summary: "クックパッドデザイナー。ユーザーリサーチ主導のデザインプロセスに強み" },

  // QAエンジニア (jobIdx: 10)
  { jobIdx: 10, candIdx: 8, stage: "offer" as const, score: 88, summary: "freee QAエンジニア。テスト自動化基盤構築の実績が素晴らしい。オファー提示" },
  { jobIdx: 10, candIdx: 33, stage: "interview1" as const, score: 84, summary: "マネーフォワードQAマネージャー。自動化率80%達成の実績" },

  // マーケティングマネージャー (jobIdx: 11)
  { jobIdx: 11, candIdx: 13, stage: "hired" as const, score: 91, summary: "マネーフォワード出身。BtoBマーケのリード獲得200%成長を実現。入社決定" },
  { jobIdx: 11, candIdx: 31, stage: "interview_final" as const, score: 83, summary: "ChatworkマーケマネージャーMQL月500件創出の実績" },
  { jobIdx: 11, candIdx: 24, stage: "screening" as const, score: 70, summary: "コンテンツマーケ中心。BtoBリードジェン経験はやや浅い" },
  { jobIdx: 11, candIdx: 25, stage: "rejected" as const, score: 58, summary: "アクセンチュアコンサル出身。マーケ実務経験が不足" },

  // 追加パイプライン（多様性のため）
  { jobIdx: 0, candIdx: 32, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 1, candIdx: 34, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 3, candIdx: 22, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 4, candIdx: 2, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 7, candIdx: 25, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 8, candIdx: 31, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 9, candIdx: 24, stage: "applied" as const, score: null, summary: "" },
  { jobIdx: 10, candIdx: 34, stage: "applied" as const, score: null, summary: "" },
];

export async function POST() {
  try {
    await supabase.from("ai_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // interview_records may not exist yet — ignore errors
    await supabase.from("interview_records").delete().neq("id", "00000000-0000-0000-0000-000000000000").then(() => {});
    await supabase.from("pipeline").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const jobsData = JOBS.map((j) => ({ ...j, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    const { data: insertedJobs, error: je } = await supabase.from("jobs").insert(jobsData).select("id");
    if (je) throw je;

    const candidatesData = CANDIDATES.map((c) => ({ ...c, created_at: new Date().toISOString() }));
    const batchSize = 50;
    const insertedCandidates: { id: string }[] = [];
    for (let i = 0; i < candidatesData.length; i += batchSize) {
      const batch = candidatesData.slice(i, i + batchSize);
      const { data, error } = await supabase.from("candidates").insert(batch).select("id");
      if (error) throw error;
      insertedCandidates.push(...(data || []));
    }

    const pipelineRows = PIPELINE_ASSIGNMENTS.map((a) => ({
      job_id: insertedJobs![a.jobIdx]?.id,
      candidate_id: insertedCandidates[a.candIdx]?.id,
      stage: a.stage,
      score: a.score,
      ai_summary: a.summary,
      notes: "",
      stage_changed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })).filter((r) => r.job_id && r.candidate_id);

    for (let i = 0; i < pipelineRows.length; i += batchSize) {
      const batch = pipelineRows.slice(i, i + batchSize);
      const { error } = await supabase.from("pipeline").insert(batch);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, counts: { jobs: insertedJobs!.length, candidates: insertedCandidates.length, pipeline: pipelineRows.length } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

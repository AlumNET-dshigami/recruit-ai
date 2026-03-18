export interface Job {
  id: string;
  title: string;
  department: string;
  employment_type: string;
  salary_range: string;
  location: string;
  status: "open" | "paused" | "closed";
  description: string;
  requirements: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  current_company: string;
  current_position: string;
  experience_years: number;
  skills: string[];
  source: string;
  resume_text: string;
  notes: string;
  created_at: string;
}

export type PipelineStage =
  | "applied"
  | "screening"
  | "interview1"
  | "interview_final"
  | "offer"
  | "hired"
  | "rejected";

export interface Pipeline {
  id: string;
  job_id: string;
  candidate_id: string;
  stage: PipelineStage;
  score: number | null;
  ai_summary: string;
  notes: string;
  stage_changed_at: string;
  created_at: string;
  // joined data
  candidate?: Candidate;
  job?: Job;
}

export interface AiLog {
  id: string;
  pipeline_id: string;
  action_type: string;
  prompt: string;
  result: string;
  created_at: string;
}

export interface InterviewRecord {
  id: string;
  pipeline_id: string;
  interview_type: "interview1" | "interview_final" | "casual" | "other";
  interviewer_name: string;
  interview_date: string;
  transcript: string;
  notes: string;
  rating: number | null;
  created_at: string;
}

export const INTERVIEW_TYPE_LABELS: Record<string, string> = {
  interview1: "1次面接",
  interview_final: "最終面接",
  casual: "カジュアル面談",
  other: "その他",
};

export const STAGE_LABELS: Record<PipelineStage, string> = {
  applied: "応募受付",
  screening: "書類選考",
  interview1: "1次面接",
  interview_final: "最終面接",
  offer: "内定",
  hired: "入社",
  rejected: "不合格",
};

export const STAGE_ORDER: PipelineStage[] = [
  "applied",
  "screening",
  "interview1",
  "interview_final",
  "offer",
  "hired",
];

export interface MikiwameResult {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  employment_type: string;
  hire_year: number | null;
  personality_type: string;
  traits: Record<string, number>;
  match_scores: Record<string, number | string>;
  assessed_at: string;
  created_at: string;
}

export const MIKIWAME_TRAIT_LABELS: Record<string, string> = {
  listening: "傾聴傾向",
  assertion: "主張傾向",
  relationship: "関係維持傾向",
  problem_solving: "問題解決志向",
  emotional_care: "感情配慮志向",
  selflessness: "無私性",
  optimism: "楽観性",
  independence: "独立性",
  compromise: "妥協力",
  criticism: "批判性",
  objectivity: "客観視傾向",
  mood_change: "気分転換傾向",
  help_seeking: "協力要請傾向",
  acceptance: "状況受容傾向",
  emotion_control: "感情抑制傾向",
  novelty: "新奇性",
  self_efficacy: "自己効力感",
  persistence: "やりきる力",
  positive_thinking: "ポジティブシンキング",
  important_others: "重要な他者",
  proactiveness: "積極性",
  sociability: "社交欲求",
  competitiveness: "競争心",
  ambition: "向上心",
  fulfillment: "充実感",
  security: "安心感",
  motivation: "やる気",
};

export const MIKIWAME_SCORE_LABELS: Record<string, string> = {
  job_aptitude: "適性",
  job_overall: "総合",
  culture: "組織風土",
  stability: "安定度",
  job_team: "チーム適性",
  hp_all: "HP傾向(全社)",
  hp_bu: "HP(事業部)",
  hp_corp: "HP(コーポ)",
  sp_match: "SP事業部",
  onecolors_match: "OneColors",
  corp_match: "コーポレート",
  links2_match: "2Links",
  newgrad_match: "新卒",
};

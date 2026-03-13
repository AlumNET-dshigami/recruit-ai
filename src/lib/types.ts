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

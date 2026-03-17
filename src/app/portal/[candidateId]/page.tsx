"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STAGE_ORDER, STAGE_LABELS } from "@/lib/types";
import type { Pipeline, Candidate, Job, PipelineStage } from "@/lib/types";

/* --- helpers --- */

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  return `${local[0]}***@${domain}`;
}

function stageIndex(stage: PipelineStage): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? -1 : idx;
}

/* --- sub-components --- */

function StageStepper({ stage }: { stage: PipelineStage }) {
  const isRejected = stage === "rejected";
  const currentIdx = stageIndex(stage);

  return (
    <div className="flex items-center w-full overflow-x-auto py-2">
      {STAGE_ORDER.map((s, i) => {
        const isLast = i === STAGE_ORDER.length - 1;

        let circleClass: string;
        const label: string = STAGE_LABELS[s];
        let icon: React.ReactNode = null;

        if (isRejected) {
          circleClass =
            "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-gray-200 text-gray-400";
        } else if (i < currentIdx) {
          circleClass =
            "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-green-500 text-white";
          icon = (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          );
        } else if (i === currentIdx) {
          circleClass =
            "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-blue-600 text-white ring-4 ring-blue-200";
        } else {
          circleClass =
            "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold bg-gray-200 text-gray-400";
        }

        let lineClass = "flex-1 h-[2px] mx-1 ";
        if (isRejected) {
          lineClass += "bg-gray-200";
        } else if (i < currentIdx) {
          lineClass += "bg-green-400";
        } else {
          lineClass += "bg-gray-200";
        }

        return (
          <div key={s} className="flex items-center" style={{ flex: isLast ? "0 0 auto" : 1 }}>
            <div className="flex flex-col items-center gap-1 min-w-[56px]">
              <div className={circleClass}>{icon ?? (i + 1)}</div>
              <span className="text-[10px] text-gray-500 whitespace-nowrap">{label}</span>
            </div>
            {!isLast && <div className={lineClass} />}
          </div>
        );
      })}
    </div>
  );
}

function ApplicationCard({
  pipeline,
  job,
}: {
  pipeline: Pipeline;
  job: Job | undefined;
}) {
  const isRejected = pipeline.stage === "rejected";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-gray-800">
            {job?.title ?? "ポジション情報なし"}
          </h3>
          {job && (
            <p className="text-[12px] text-gray-400 mt-0.5">
              {job.department} ・ {job.location}
            </p>
          )}
        </div>
        {isRejected ? (
          <span className="shrink-0 text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-0.5">
            選考終了
          </span>
        ) : pipeline.stage === "hired" ? (
          <span className="shrink-0 text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-0.5">
            内定承諾
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-3 py-0.5">
            {STAGE_LABELS[pipeline.stage]}
          </span>
        )}
      </div>

      <StageStepper stage={pipeline.stage} />

      <div className="flex items-center gap-4 text-[11px] text-gray-400 pt-1 border-t border-gray-50">
        <span>応募日: {new Date(pipeline.created_at).toLocaleDateString("ja-JP")}</span>
        <span>
          最終更新: {new Date(pipeline.stage_changed_at).toLocaleDateString("ja-JP")}
        </span>
      </div>
    </div>
  );
}

/* --- main page --- */

export default function CandidatePortalPage() {
  const params = useParams();
  const candidateId = params.candidateId as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [pipelines, setPipelines] = useState<(Pipeline & { job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!candidateId) return;

    async function load() {
      setLoading(true);

      const { data: cand, error: candErr } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (candErr || !cand) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setCandidate(cand as Candidate);

      const { data: pipeData } = await supabase
        .from("pipeline")
        .select("*, job:jobs(*)")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      setPipelines((pipeData ?? []) as (Pipeline & { job?: Job })[]);
      setLoading(false);
    }

    load();
  }, [candidateId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-[700px] mx-auto flex items-center gap-3">
            <div className="text-[18px] font-extrabold text-blue-700">
              Peers Recruit
            </div>
            <span className="text-[11px] text-gray-400">候補者ポータル</span>
          </div>
        </header>
        <main className="max-w-[700px] mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-[13px] text-gray-400">読み込み中...</span>
          </div>
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="max-w-[700px] mx-auto flex items-center gap-3">
            <div className="text-[18px] font-extrabold text-blue-700">
              Peers Recruit
            </div>
            <span className="text-[11px] text-gray-400">候補者ポータル</span>
          </div>
        </header>
        <main className="max-w-[700px] mx-auto px-6 py-8">
          <div className="text-center py-20">
            <div className="text-[48px] font-extrabold text-gray-200 mb-2">404</div>
            <p className="text-[14px] text-gray-500 mb-1">
              候補者情報が見つかりませんでした
            </p>
            <p className="text-[12px] text-gray-400">
              URLが正しいかご確認ください。ご不明な場合は担当リクルーターにお問い合わせください。
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-[700px] mx-auto flex items-center gap-3">
          <div className="text-[18px] font-extrabold text-blue-700">
            Peers Recruit
          </div>
          <span className="text-[11px] text-gray-400">候補者ポータル</span>
        </div>
      </header>

      <main className="max-w-[700px] mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[18px] font-bold shrink-0">
              {candidate!.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-gray-800">
                {candidate!.name} さん
              </h1>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {maskEmail(candidate!.email)}
              </p>
              {candidate!.current_company && (
                <p className="text-[12px] text-gray-400">
                  {candidate!.current_company}
                  {candidate!.current_position
                    ? ` / ${candidate!.current_position}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-[14px] font-bold text-gray-700">応募状況</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">
            現在の選考ステータスをご確認いただけます
          </p>
        </div>

        {pipelines.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-[13px] text-gray-400">
              現在進行中の応募はありません
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pipelines.map((p) => (
              <ApplicationCard key={p.id} pipeline={p} job={p.job} />
            ))}
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-[11px] text-gray-300">
            ご質問がございましたら、担当リクルーターまでご連絡ください
          </p>
        </div>
      </main>
    </div>
  );
}

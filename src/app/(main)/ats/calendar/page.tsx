"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { INTERVIEW_TYPE_LABELS } from "@/lib/types";
import type { InterviewRecord, Candidate } from "@/lib/types";

interface CalendarEvent extends InterviewRecord {
  candidate_name: string;
  job_title: string;
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9); // 9:00 ~ 19:00
const INTERVIEWER_COLORS = [
  "bg-blue-100 border-blue-400 text-blue-800",
  "bg-emerald-100 border-emerald-400 text-emerald-800",
  "bg-violet-100 border-violet-400 text-violet-800",
  "bg-amber-100 border-amber-400 text-amber-800",
  "bg-rose-100 border-rose-400 text-rose-800",
  "bg-cyan-100 border-cyan-400 text-cyan-800",
];

function getWeekDates(baseDate: Date): Date[] {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  return Array.from({ length: 5 }, (_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", weekday: "short" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function InterviewCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const { data: records } = await supabase
      .from("interview_records")
      .select("*, pipeline:pipeline(candidate:candidates(name), job:jobs(title))")
      .order("interview_date");

    const mapped: CalendarEvent[] = (records || []).map((r: Record<string, unknown>) => {
      const p = r.pipeline as Record<string, unknown> | null;
      const c = p?.candidate as { name?: string } | null;
      const j = p?.job as { title?: string } | null;
      return {
        ...r,
        candidate_name: c?.name || "不明",
        job_title: j?.title || "",
      } as CalendarEvent;
    });

    setEvents(mapped);
    setLoading(false);
  }

  // 面接官ごとの色マッピング
  const interviewers = [...new Set(events.map((e) => e.interviewer_name).filter(Boolean))];
  const interviewerColorMap: Record<string, string> = {};
  interviewers.forEach((name, i) => {
    interviewerColorMap[name] = INTERVIEWER_COLORS[i % INTERVIEWER_COLORS.length];
  });

  // 週のイベントをフィルタ
  function getEventsForDay(date: Date) {
    return events.filter((e) => {
      const ed = new Date(e.interview_date);
      return isSameDay(ed, date);
    });
  }

  // 面接官別の今週の件数
  const weekEvents = events.filter((e) => {
    const ed = new Date(e.interview_date);
    return ed >= weekDates[0] && ed <= new Date(weekDates[4].getTime() + 86400000);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">読み込み中...</div>;
  }

  return (
    <div className="px-7 py-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">📅 面接カレンダー</h1>
            <p className="text-[13px] text-gray-400 mt-0.5">面接予定を一覧表示・面接官の空き状況を可視化</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="text-[12px] font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← 前週
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[12px] font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              今週
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="text-[12px] font-bold text-gray-600 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              次週 →
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-gray-800">{weekEvents.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">今週の面接数</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-blue-600">{interviewers.length}</div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">面接官数</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-emerald-600">
              {weekEvents.filter((e) => e.interview_type === "interview_final").length}
            </div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">最終面接</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="text-3xl font-extrabold text-amber-600">
              {events.filter((e) => new Date(e.interview_date) > new Date()).length}
            </div>
            <div className="text-[11px] text-gray-400 font-bold mt-1">今後の予定</div>
          </div>
        </div>

        {/* 面接官凡例 */}
        {interviewers.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-[11px] font-bold text-gray-500">面接官:</span>
            {interviewers.map((name) => (
              <span
                key={name}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${interviewerColorMap[name]}`}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-5 border-b border-gray-100">
            {weekDates.map((date) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={date.toISOString()}
                  className={`text-center py-3 text-[12px] font-bold border-r border-gray-100 last:border-r-0 ${
                    isToday ? "bg-blue-50 text-blue-700" : "text-gray-600"
                  }`}
                >
                  {formatDate(date)}
                  {isToday && <span className="ml-1 text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">今日</span>}
                </div>
              );
            })}
          </div>

          {/* Day Content */}
          <div className="grid grid-cols-5 min-h-[500px]">
            {weekDates.map((date) => {
              const dayEvents = getEventsForDay(date);
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={date.toISOString()}
                  className={`border-r border-gray-100 last:border-r-0 p-2 ${
                    isToday ? "bg-blue-50/30" : ""
                  }`}
                >
                  {dayEvents.length === 0 && (
                    <div className="text-center py-8 text-gray-300 text-[11px]">予定なし</div>
                  )}
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`rounded-lg p-2.5 mb-2 border-l-[3px] ${
                        interviewerColorMap[evt.interviewer_name] || "bg-gray-100 border-gray-400 text-gray-800"
                      }`}
                    >
                      <div className="text-[11px] font-bold truncate">{evt.candidate_name}</div>
                      <div className="text-[9px] opacity-70 truncate">{evt.job_title}</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[8px] font-bold bg-white/60 px-1.5 py-0.5 rounded">
                          {INTERVIEW_TYPE_LABELS[evt.interview_type] || evt.interview_type}
                        </span>
                      </div>
                      <div className="text-[9px] mt-1 opacity-60">
                        👤 {evt.interviewer_name}
                        {evt.rating && <span className="ml-1">{"⭐".repeat(evt.rating)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* 直近の面接リスト */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-6 p-5">
          <h3 className="text-[14px] font-bold text-gray-700 mb-3">📋 直近の面接予定</h3>
          <div className="space-y-2">
            {events
              .filter((e) => new Date(e.interview_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
              .sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime())
              .slice(0, 10)
              .map((evt) => (
                <div key={evt.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-gray-500 w-[80px]">
                      {new Date(evt.interview_date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-[12px] font-bold text-gray-800">{evt.candidate_name}</span>
                    <span className="text-[11px] text-gray-400">{evt.job_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${interviewerColorMap[evt.interviewer_name] || "bg-gray-100"}`}>
                      {evt.interviewer_name}
                    </span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {INTERVIEW_TYPE_LABELS[evt.interview_type] || evt.interview_type}
                    </span>
                  </div>
                </div>
              ))}
            {events.filter((e) => new Date(e.interview_date) >= new Date(new Date().setHours(0, 0, 0, 0))).length === 0 && (
              <div className="text-center py-6 text-gray-400 text-[12px]">今後の面接予定はありません</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

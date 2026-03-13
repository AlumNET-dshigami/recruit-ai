import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface WebhookPayload {
  event: string;
  candidateName?: string;
  jobTitle?: string;
  stage?: string;
  score?: number;
  details?: string;
}

function buildSlackPayload(payload: WebhookPayload) {
  const emoji: Record<string, string> = {
    new_application: "📩",
    stage_change: "🔄",
    screening_complete: "🤖",
    offer_sent: "🎉",
    hired: "✅",
  };
  const icon = emoji[payload.event] || "📋";

  return {
    text: `${icon} ${payload.details || payload.event}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${icon} *${payload.details || payload.event}*`,
        },
      },
      {
        type: "section",
        fields: [
          ...(payload.candidateName
            ? [{ type: "mrkdwn", text: `*候補者:* ${payload.candidateName}` }]
            : []),
          ...(payload.jobTitle
            ? [{ type: "mrkdwn", text: `*求人:* ${payload.jobTitle}` }]
            : []),
          ...(payload.stage
            ? [{ type: "mrkdwn", text: `*ステージ:* ${payload.stage}` }]
            : []),
          ...(payload.score !== undefined
            ? [{ type: "mrkdwn", text: `*AIスコア:* ${payload.score}点` }]
            : []),
        ],
      },
    ],
  };
}

function buildTeamsPayload(payload: WebhookPayload) {
  const emoji: Record<string, string> = {
    new_application: "📩",
    stage_change: "🔄",
    screening_complete: "🤖",
    offer_sent: "🎉",
    hired: "✅",
  };
  const icon = emoji[payload.event] || "📋";

  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: payload.details || payload.event,
    themeColor: "0078D4",
    title: `${icon} ${payload.details || payload.event}`,
    sections: [
      {
        facts: [
          ...(payload.candidateName
            ? [{ name: "候補者", value: payload.candidateName }]
            : []),
          ...(payload.jobTitle
            ? [{ name: "求人", value: payload.jobTitle }]
            : []),
          ...(payload.stage
            ? [{ name: "ステージ", value: payload.stage }]
            : []),
          ...(payload.score !== undefined
            ? [{ name: "AIスコア", value: `${payload.score}点` }]
            : []),
        ],
      },
    ],
  };
}

// POST: Webhookイベント送信
export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as WebhookPayload;

    // webhook_settings からURL取得
    const { data: settings } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("is_active", true);

    if (!settings || settings.length === 0) {
      return NextResponse.json({ sent: false, reason: "No active webhooks" });
    }

    const results = [];

    for (const setting of settings) {
      const body =
        setting.platform === "teams"
          ? buildTeamsPayload(payload)
          : buildSlackPayload(payload);

      try {
        const res = await fetch(setting.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        results.push({
          platform: setting.platform,
          ok: res.ok,
          status: res.status,
        });
      } catch (e) {
        results.push({
          platform: setting.platform,
          ok: false,
          error: String(e),
        });
      }
    }

    return NextResponse.json({ sent: true, results });
  } catch {
    return NextResponse.json(
      { error: "Webhook送信に失敗しました" },
      { status: 500 }
    );
  }
}

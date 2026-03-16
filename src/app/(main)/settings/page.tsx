"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface WebhookSetting {
  id?: string;
  platform: "slack" | "teams";
  webhook_url: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<WebhookSetting[]>([]);
  const [newPlatform, setNewPlatform] = useState<"slack" | "teams">("slack");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    const { data } = await supabase
      .from("webhook_settings")
      .select("*")
      .order("created_at");
    if (data) setWebhooks(data as WebhookSetting[]);
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  async function addWebhook() {
    if (!newUrl.trim()) return;
    setSaving(true);
    await supabase.from("webhook_settings").insert([
      {
        platform: newPlatform,
        webhook_url: newUrl.trim(),
        is_active: true,
      },
    ]);
    setNewUrl("");
    await loadWebhooks();
    setSaving(false);
  }

  async function toggleWebhook(wh: WebhookSetting) {
    await supabase
      .from("webhook_settings")
      .update({ is_active: !wh.is_active })
      .eq("id", wh.id);
    await loadWebhooks();
  }

  async function deleteWebhook(wh: WebhookSetting) {
    await supabase.from("webhook_settings").delete().eq("id", wh.id);
    await loadWebhooks();
  }

  async function testWebhook() {
    setTestResult(null);
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test",
          candidateName: "テスト太郎",
          jobTitle: "フロントエンドエンジニア",
          stage: "応募",
          score: 85,
          details: "🔔 Peers Recruitからのテスト通知です",
        }),
      });
      const data = await res.json();
      setTestResult(data.sent ? "✅ 送信成功！" : `⚠️ ${data.reason || "送信できませんでした"}`);
    } catch {
      setTestResult("❌ テスト送信に失敗しました");
    }
  }

  return (
    <div className="px-4 md:px-7 py-4 md:py-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">⚙️ 設定</h1>

        <div className="space-y-6">
          {/* API設定 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              API設定
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">
                  Gemini API Key
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value="••••••••••••••••"
                    readOnly
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] bg-gray-50 text-gray-400"
                  />
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    接続済み
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">
                  Supabase接続
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value="kweviymlcmndvouvmlnj.supabase.co"
                    readOnly
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] bg-gray-50 text-gray-400"
                  />
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    接続済み
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook通知設定 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-1">
              🔔 Webhook通知
            </h2>
            <p className="text-[12px] text-gray-400 mb-4">
              Slack/Teamsに採用イベントをリアルタイム通知
            </p>

            {/* 登録済みWebhook一覧 */}
            {webhooks.length > 0 && (
              <div className="space-y-2 mb-4">
                {webhooks.map((wh) => (
                  <div
                    key={wh.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-gray-50"
                  >
                    <span className="text-[16px]">
                      {wh.platform === "slack" ? "💬" : "🟦"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-gray-700 capitalize">
                        {wh.platform}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {wh.webhook_url}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWebhook(wh)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        wh.is_active
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {wh.is_active ? "有効" : "無効"}
                    </button>
                    <button
                      onClick={() => deleteWebhook(wh)}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新規追加 */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1">
                  プラットフォーム
                </label>
                <select
                  value={newPlatform}
                  onChange={(e) =>
                    setNewPlatform(e.target.value as "slack" | "teams")
                  }
                  className="px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none bg-white"
                >
                  <option value="slack">Slack</option>
                  <option value="teams">Teams</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-gray-500 mb-1">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] outline-none"
                />
              </div>
              <button
                onClick={addWebhook}
                disabled={saving || !newUrl.trim()}
                className="text-[12px] font-bold text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                追加
              </button>
            </div>

            {/* テスト送信 */}
            {webhooks.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={testWebhook}
                  className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  🔔 テスト通知を送信
                </button>
                {testResult && (
                  <span className="text-[12px] text-gray-600">
                    {testResult}
                  </span>
                )}
              </div>
            )}

            {/* 通知イベント説明 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-500 mb-2">
                通知されるイベント:
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "📩", label: "新規応募" },
                  { icon: "🤖", label: "AIスクリーニング完了" },
                  { icon: "🔄", label: "ステージ変更" },
                  { icon: "🎉", label: "内定通知" },
                  { icon: "✅", label: "入社確定" },
                ].map((evt) => (
                  <span
                    key={evt.label}
                    className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                  >
                    {evt.icon} {evt.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* チーム管理 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              チーム管理
            </h2>
            <div className="space-y-3">
              {[
                {
                  name: "東海 大地",
                  role: "管理者",
                  email: "dishigami@alum-net.com",
                },
                {
                  name: "採用太郎",
                  role: "メンバー",
                  email: "taro@example.com",
                },
                {
                  name: "面接花子",
                  role: "面接官",
                  email: "hanako@example.com",
                },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[12px] font-bold">
                      {member.name[0]}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold text-gray-700">
                        {member.name}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
            <button className="mt-4 text-[12px] font-bold text-primary hover:underline">
              + メンバーを招待
            </button>
          </div>

          {/* メールテンプレート */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              メールテンプレート
            </h2>
            <div className="space-y-2">
              {[
                "書類選考通過のご連絡",
                "面接日程のご案内",
                "内定通知",
                "不合格のご連絡",
              ].map((template) => (
                <div
                  key={template}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-[13px] text-gray-700">{template}</span>
                  <button className="text-[11px] text-primary font-bold hover:underline">
                    編集
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

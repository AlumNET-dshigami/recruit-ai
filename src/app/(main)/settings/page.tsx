"use client";

export default function SettingsPage() {
  return (
    <div className="px-7 py-6">
      <div className="max-w-[800px] mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-800 mb-6">設定</h1>

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

          {/* チーム管理 */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-700 mb-4">
              チーム管理
            </h2>
            <div className="space-y-3">
              {[
                { name: "東海 大地", role: "管理者", email: "dishigami@alum-net.com" },
                { name: "採用太郎", role: "メンバー", email: "taro@example.com" },
                { name: "面接花子", role: "面接官", email: "hanako@example.com" },
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

          {/* テンプレート管理 */}
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

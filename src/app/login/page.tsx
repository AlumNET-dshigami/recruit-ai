"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === "peers2026") {
      localStorage.setItem("peers_auth", "1");
      router.push("/");
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Peers Recruit
          </h1>
          <p className="text-blue-300/60 text-[13px] mt-1">
            株式会社ピアズ × AI採用アシスタント
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-7">
          <label className="block text-[13px] font-bold text-gray-700 mb-2">
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="パスワードを入力"
            autoFocus
            className={`w-full px-4 py-3 rounded-lg border text-[14px] outline-none transition-colors ${
              error
                ? "border-red-400 bg-red-50"
                : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            }`}
          />
          {error && (
            <p className="text-red-500 text-[12px] mt-2 font-semibold">
              パスワードが正しくありません
            </p>
          )}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-bold rounded-lg transition-colors"
          >
            ログイン
          </button>
        </form>
        <p className="text-center text-white/20 text-[11px] mt-6">
          &copy; Peers, Inc. 2026
        </p>
      </div>
    </div>
  );
}

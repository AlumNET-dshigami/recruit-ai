"use client";

import { useState } from "react";

export function FormGroup({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block mb-1.5 text-[13px] font-bold text-gray-600 tracking-wide">
        {label}
      </label>
      {children}
      {tip && (
        <div className="mt-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12.5px] text-amber-800">
          {tip}
        </div>
      )}
    </div>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13.5px] leading-relaxed resize-y outline-none transition-colors bg-white text-gray-800 placeholder:text-gray-400 focus:border-primary"
    />
  );
}

export function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13.5px] outline-none transition-colors bg-white text-gray-800 placeholder:text-gray-400 focus:border-primary"
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-gray-200 text-[13.5px] outline-none bg-white text-gray-800"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function RunButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`mt-1 px-6 py-2.5 rounded-[9px] text-[15px] font-bold text-white border-none transition-all ${
        loading
          ? "bg-gray-400 cursor-not-allowed opacity-80"
          : "bg-primary cursor-pointer hover:bg-primary-dark hover:shadow-md active:translate-y-0"
      }`}
    >
      {loading ? "\u23F3 生成中..." : label}
    </button>
  );
}

export function ResultBox({
  result,
  loading,
}: {
  result: string;
  loading: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!result && !loading) {
    return (
      <div className="mt-5 px-5 py-5 bg-gray-50 border-[1.5px] border-dashed border-gray-300 rounded-[10px] text-gray-400 text-[13.5px] text-center">
        生成結果がここに表示されます
      </div>
    );
  }

  return (
    <div className="mt-5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          生成結果
        </span>
        {result && (
          <button
            onClick={handleCopy}
            className="bg-gray-100 border-none rounded-md px-3 py-1 text-[12px] font-semibold cursor-pointer text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {copied ? "\u2705 コピー済み" : "\u{1F4CB} コピー"}
          </button>
        )}
      </div>
      <div className="bg-gray-50 border-[1.5px] border-gray-200 rounded-[10px] px-5 py-4 min-h-[140px] whitespace-pre-wrap break-words text-[13.5px] leading-[1.8] text-gray-800">
        {loading ? (
          <span className="text-gray-400 animate-pulse">
            Claude が生成中です。しばらくお待ちください...
          </span>
        ) : (
          result
        )}
      </div>
    </div>
  );
}

export function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 mb-4 text-[12.5px] text-slate-600">
      {children}
    </div>
  );
}

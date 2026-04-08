"use client";

import { useState } from "react";

interface Props {
  count: number;
  onClear: () => void;
  actions: { label: string; key: string; variant?: "danger" | "warning" | "success" }[];
  onAction: (action: string) => void;
}

export default function BulkActionBar({ count, onClear, actions, onAction }: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);

  if (count === 0) return null;

  const variantStyles: Record<string, string> = {
    danger: "bg-red-500 hover:bg-red-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white",
  };

  function handleClick(key: string) {
    if (key === "delete" && confirming !== key) {
      setConfirming(key);
      setTimeout(() => setConfirming(null), 3000);
      return;
    }
    onAction(key);
    setConfirming(null);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-slate-800 text-white rounded-t-xl shadow-2xl px-6 py-3 flex items-center gap-4 pointer-events-auto mb-0">
        <span className="text-sm font-medium">{count} selected</span>
        <div className="w-px h-5 bg-slate-600" />
        <div className="flex items-center gap-2">
          {actions.map((a) => (
            <button
              key={a.key}
              onClick={() => handleClick(a.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                confirming === a.key
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : variantStyles[a.variant ?? "success"] ?? "bg-slate-600 hover:bg-slate-500 text-white"
              }`}
            >
              {confirming === a.key ? "Confirm?" : a.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-slate-600" />
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

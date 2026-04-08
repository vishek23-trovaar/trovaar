"use client";
import { useEffect, useState } from "react";

interface SurgeInsight {
  category: string;
  count_7d: number;
  multiplier: number;
}

export function SurgeBanner() {
  const [insights, setInsights] = useState<SurgeInsight[]>([]);

  useEffect(() => {
    fetch("/api/insights/surge")
      .then(r => r.json())
      .then(d => setInsights(d.insights ?? []));
  }, []);

  if (insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔥</span>
        <span className="font-semibold text-orange-900">High Demand Alert</span>
      </div>
      <div className="space-y-1">
        {insights.map(insight => (
          <p key={insight.category} className="text-sm text-orange-800">
            <strong className="capitalize">{insight.category.replace(/_/g, " ")}</strong> jobs are up{" "}
            <strong>{Math.round(insight.multiplier)}x</strong> this week —{" "}
            {insight.count_7d} new job{insight.count_7d !== 1 ? "s" : ""} posted
          </p>
        ))}
      </div>
    </div>
  );
}

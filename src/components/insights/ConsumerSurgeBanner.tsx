"use client";
import { useEffect, useState } from "react";
import { CATEGORY_GROUPS } from "@/lib/constants";

interface SurgeInsight {
  category: string;
  count_7d: number;
  multiplier: number;
}

export function ConsumerSurgeBanner({ category }: { category?: string }) {
  const [insights, setInsights] = useState<SurgeInsight[]>([]);

  useEffect(() => {
    fetch("/api/insights/surge")
      .then(r => r.json())
      .then(d => {
        let all: SurgeInsight[] = d.insights ?? [];
        // If a specific category is passed, filter to just that one
        if (category) {
          all = all.filter(i => i.category === category);
        }
        setInsights(all.slice(0, 2));
      })
      .catch(() => {});
  }, [category]);

  if (insights.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
      <span className="text-xl shrink-0">🔥</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">High demand in your area</p>
        <div className="mt-0.5 space-y-0.5">
          {insights.map(insight => {
            const groupIcon = CATEGORY_GROUPS.find(g =>
              g.categories.some(c => c.value === insight.category)
            )?.icon ?? "🔧";
            return (
              <p key={insight.category} className="text-xs text-amber-800">
                {groupIcon} <span className="capitalize">{insight.category.replace(/_/g, " ")}</span> jobs are up <strong>{Math.round(insight.multiplier)}×</strong> this week — bids may be slightly higher than usual
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

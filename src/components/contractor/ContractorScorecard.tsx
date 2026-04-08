"use client";
import { useEffect, useState } from "react";

interface ContractorStats {
  cancellation_count: number;
  no_show_count: number;
  acceptance_count: number;
  completion_count: number;
  completionRate: number | null;
  activeStrikes: number;
  is_suspended: number;
  suspended_until: string | null;
}

export function ContractorScorecard({ contractorId }: { contractorId: string }) {
  const [stats, setStats] = useState<ContractorStats | null>(null);

  useEffect(() => {
    fetch(`/api/contractors/${contractorId}/stats`)
      .then(r => r.json())
      .then(d => setStats(d.stats))
      .catch(() => {});
  }, [contractorId]);

  if (!stats) return null;
  // Don't show scorecard if contractor has no job history at all
  if (stats.acceptance_count === 0 && stats.cancellation_count === 0 && stats.no_show_count === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-secondary mb-3">Track Record</h3>

      {stats.is_suspended ? (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          <span className="text-red-500 text-lg">🚫</span>
          <div>
            <p className="text-sm font-semibold text-red-700">Account Suspended</p>
            <p className="text-xs text-red-600">
              {stats.suspended_until
                ? `Until ${new Date(stats.suspended_until).toLocaleDateString()}`
                : "Permanent — under review"}
            </p>
          </div>
        </div>
      ) : stats.activeStrikes > 0 ? (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
          <span className="text-amber-500 text-base">⚠️</span>
          <p className="text-xs font-medium text-amber-800">
            {stats.activeStrikes} active strike{stats.activeStrikes !== 1 ? "s" : ""} in the last 60 days
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {stats.completionRate !== null && (
          <div className="text-center p-3 rounded-lg bg-surface">
            <p className={`text-xl font-bold ${
              stats.completionRate >= 90 ? "text-emerald-600" :
              stats.completionRate >= 70 ? "text-amber-600" : "text-red-600"
            }`}>
              {stats.completionRate}%
            </p>
            <p className="text-xs text-muted mt-0.5">Completion Rate</p>
          </div>
        )}
        <div className="text-center p-3 rounded-lg bg-surface">
          <p className={`text-xl font-bold ${stats.no_show_count === 0 ? "text-emerald-600" : stats.no_show_count <= 1 ? "text-amber-600" : "text-red-600"}`}>
            {stats.no_show_count}
          </p>
          <p className="text-xs text-muted mt-0.5">No-Shows</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface">
          <p className={`text-xl font-bold ${stats.cancellation_count === 0 ? "text-emerald-600" : stats.cancellation_count <= 2 ? "text-amber-600" : "text-red-600"}`}>
            {stats.cancellation_count}
          </p>
          <p className="text-xs text-muted mt-0.5">Cancellations</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-surface">
          <p className="text-xl font-bold text-secondary">{stats.completion_count}</p>
          <p className="text-xs text-muted mt-0.5">Jobs Done</p>
        </div>
      </div>
    </div>
  );
}

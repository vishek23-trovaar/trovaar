"use client";

import { useState, useEffect, useCallback } from "react";

interface EventSummary {
  event_name: string;
  event_count: number;
  unique_users: number;
}

interface DailyCount {
  day: string;
  event_count: number;
  unique_users: number;
}

interface TopUser {
  user_id: string;
  event_count: number;
  distinct_events: number;
}

interface FunnelData {
  signups: number;
  jobs_posted: number;
  bids_placed: number;
  bids_accepted: number;
  jobs_completed: number;
  reviews_submitted: number;
}

interface AnalyticsResponse {
  summary: EventSummary[];
  daily: DailyCount[];
  topUsers: TopUser[];
  funnel: FunnelData;
}

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

const EVENT_LABELS: Record<string, string> = {
  user_signup: "User Signups",
  user_login: "User Logins",
  job_posted: "Jobs Posted",
  job_viewed: "Jobs Viewed",
  bid_placed: "Bids Placed",
  bid_accepted: "Bids Accepted",
  job_completed: "Jobs Completed",
  payment_released: "Payments Released",
  review_submitted: "Reviews Submitted",
  search_performed: "Searches",
  message_sent: "Messages Sent",
  dispute_filed: "Disputes Filed",
  video_uploaded: "Videos Uploaded",
  ai_analysis_used: "AI Analyses",
};

function formatDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "0%";
  return ((numerator / denominator) * 100).toFixed(1) + "%";
}

export default function AnalyticsEventsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [range, setRange] = useState(30);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = formatDate(range);
      const res = await fetch(
        `/api/admin/analytics/events?start_date=${startDate}`
      );
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute chart bar heights
  const maxDailyCount = data
    ? Math.max(...data.daily.map((d) => d.event_count), 1)
    : 1;

  const funnel = data?.funnel;
  const funnelSteps = funnel
    ? [
        { label: "Signups", count: funnel.signups, color: "bg-blue-500" },
        { label: "Jobs Posted", count: funnel.jobs_posted, color: "bg-indigo-500" },
        { label: "Bids Placed", count: funnel.bids_placed, color: "bg-purple-500" },
        { label: "Bids Accepted", count: funnel.bids_accepted, color: "bg-pink-500" },
        { label: "Completed", count: funnel.jobs_completed, color: "bg-orange-500" },
        { label: "Reviewed", count: funnel.reviews_submitted, color: "bg-green-500" },
      ]
    : [];
  const funnelMax = funnelSteps.length
    ? Math.max(...funnelSteps.map((s) => s.count), 1)
    : 1;

  // Key metric cards
  const totalEvents = data
    ? data.summary.reduce((sum, e) => sum + e.event_count, 0)
    : 0;
  const totalUniqueUsers = data
    ? data.summary.reduce((sum, e) => sum + e.unique_users, 0)
    : 0;
  const signups =
    data?.summary.find((e) => e.event_name === "user_signup")?.event_count ?? 0;
  const jobsPosted =
    data?.summary.find((e) => e.event_name === "job_posted")?.event_count ?? 0;
  const bidsPlaced =
    data?.summary.find((e) => e.event_name === "bid_placed")?.event_count ?? 0;
  const completionRate = funnel
    ? pct(funnel.jobs_completed, funnel.jobs_posted)
    : "0%";

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f7f8f8]">Event Analytics</h1>
          <p className="text-sm text-[#8a8f98] mt-1">
            Track user actions and conversion funnels across the platform
          </p>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                range === opt.value
                  ? "bg-[#010102] text-white"
                  : "bg-[#0f1011] text-[#8a8f98] border border-[#23252a] hover:bg-[#141516]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-20 text-[#8a8f98]">
          Loading analytics...
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Events", value: totalEvents.toLocaleString(), sub: `${range}d`, color: "text-[#60A5FA]" },
              { label: "Unique Users", value: totalUniqueUsers.toLocaleString(), sub: "active", color: "text-[#60A5FA]" },
              { label: "Signups", value: signups.toLocaleString(), sub: `${range}d`, color: "text-[#34d399]" },
              { label: "Jobs Posted", value: jobsPosted.toLocaleString(), sub: `${range}d`, color: "text-[#60A5FA]" },
              { label: "Completion Rate", value: completionRate, sub: "posted to completed", color: "text-[#fbbf24]" },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-4 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-xs font-medium text-[#8a8f98] uppercase tracking-wide">
                  {card.label}
                </div>
                <div className={`text-2xl font-bold mt-1 ${card.color}`}>
                  {card.value}
                </div>
                <div className="text-xs text-[#8a8f98] mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Funnel Visualization */}
          {funnelSteps.length > 0 && (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6">
              <h2 className="text-lg font-semibold text-[#d0d6e0] mb-4">
                Conversion Funnel
              </h2>
              <div className="space-y-3">
                {funnelSteps.map((step, i) => {
                  const widthPct = Math.max(
                    (step.count / funnelMax) * 100,
                    4
                  );
                  const conversionFromPrev =
                    i > 0 && funnelSteps[i - 1].count > 0
                      ? pct(step.count, funnelSteps[i - 1].count)
                      : null;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className="w-28 text-sm text-[#8a8f98] font-medium shrink-0 text-right">
                        {step.label}
                      </div>
                      <div className="flex-1 relative">
                        <div
                          className={`${step.color} h-8 rounded-lg flex items-center px-3 transition-all duration-500`}
                          style={{ width: `${widthPct}%` }}
                        >
                          <span className="text-white text-sm font-bold whitespace-nowrap">
                            {step.count.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {conversionFromPrev && (
                        <div className="w-16 text-xs text-[#8a8f98] shrink-0">
                          {conversionFromPrev}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Event Timeline (CSS-only bar chart) */}
          {data && data.daily.length > 0 && (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-6">
              <h2 className="text-lg font-semibold text-[#d0d6e0] mb-4">
                Daily Event Volume (Last 30 Days)
              </h2>
              <div className="flex items-end gap-[2px] h-48">
                {data.daily.map((d) => {
                  const heightPct = Math.max(
                    (d.event_count / maxDailyCount) * 100,
                    2
                  );
                  return (
                    <div
                      key={d.day}
                      className="flex-1 group relative flex flex-col items-center justify-end h-full"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600 min-w-[4px]"
                        style={{ height: `${heightPct}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-[#0f1011] text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {d.day}: {d.event_count} events, {d.unique_users} users
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-[#8a8f98]">
                <span>{data.daily[0]?.day}</span>
                <span>{data.daily[data.daily.length - 1]?.day}</span>
              </div>
            </div>
          )}

          {/* Top Events Table */}
          {data && data.summary.length > 0 && (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#23252a]">
                <h2 className="text-lg font-semibold text-[#d0d6e0]">
                  Top Events
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#010102] text-left text-xs font-medium text-[#8a8f98] uppercase tracking-wide">
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3 text-right">Count</th>
                    <th className="px-6 py-3 text-right">Unique Users</th>
                    <th className="px-6 py-3 text-right">Avg / User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]">
                  {data.summary.map((e) => (
                    <tr key={e.event_name} className="hover:bg-[#141516]">
                      <td className="px-6 py-3 font-medium text-[#d0d6e0]">
                        {EVENT_LABELS[e.event_name] || e.event_name}
                      </td>
                      <td className="px-6 py-3 text-right text-[#8a8f98]">
                        {e.event_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-[#8a8f98]">
                        {e.unique_users.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-[#8a8f98]">
                        {e.unique_users
                          ? (e.event_count / e.unique_users).toFixed(1)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Top Active Users */}
          {data && data.topUsers.length > 0 && (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#23252a]">
                <h2 className="text-lg font-semibold text-[#d0d6e0]">
                  Most Active Users (Last 30 Days)
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#010102] text-left text-xs font-medium text-[#8a8f98] uppercase tracking-wide">
                    <th className="px-6 py-3">User ID</th>
                    <th className="px-6 py-3 text-right">Total Events</th>
                    <th className="px-6 py-3 text-right">Distinct Event Types</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23252a]">
                  {data.topUsers.map((u) => (
                    <tr key={u.user_id} className="hover:bg-[#141516]">
                      <td className="px-6 py-3 font-mono text-xs text-[#8a8f98]">
                        {u.user_id}
                      </td>
                      <td className="px-6 py-3 text-right text-[#8a8f98]">
                        {u.event_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-[#8a8f98]">
                        {u.distinct_events}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty state */}
          {data && data.summary.length === 0 && (
            <div className="bg-[#0f1011] rounded-2xl border border-[#23252a] p-12 text-center">
              <div className="text-[#8a8f98] text-lg mb-2">No events tracked yet</div>
              <p className="text-sm text-[#8a8f98]">
                Analytics events will appear here as users interact with the platform.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

interface CallRecord {
  id: string;
  caller_name: string;
  receiver_name: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  recording_url: string | null;
  transcript: string | null;
}

export function CallLog({
  jobId,
  canView,
}: {
  jobId: string;
  canView: boolean;
}) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    fetch(`/api/jobs/${jobId}/calls`)
      .then((r) => r.json())
      .then((d: { calls?: CallRecord[] }) => setCalls(Array.isArray(d.calls) ? d.calls : []))
      .catch(() => {});
  }, [jobId, canView]);

  if (!canView || calls.length === 0) return null;

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-xs font-semibold text-muted mb-2">
        Call History ({calls.length})
      </p>
      <div className="space-y-2">
        {calls.map((call) => (
          <div key={call.id} className="bg-surface rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    call.status === "completed"
                      ? "bg-emerald-500"
                      : "bg-gray-300"
                  }`}
                />
                <span className="text-xs text-secondary font-medium">
                  {call.caller_name} → {call.receiver_name}
                </span>
                {call.duration_seconds > 0 && (
                  <span className="text-xs text-muted">
                    {formatDuration(call.duration_seconds)}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {new Date(call.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {call.transcript && (
              <div className="mt-2">
                <button
                  onClick={() =>
                    setExpanded(expanded === call.id ? null : call.id)
                  }
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {expanded === call.id ? "Hide transcript" : "View transcript"}
                </button>
                {expanded === call.id && (
                  <div className="mt-2 bg-white border border-border rounded-lg p-3 text-xs text-secondary leading-relaxed max-h-40 overflow-y-auto">
                    {call.transcript}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

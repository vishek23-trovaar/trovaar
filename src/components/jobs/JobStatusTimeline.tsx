"use client";

import { JobStatus } from "@/types";

const STEPS: { status: string; label: string; icon: string }[] = [
  { status: "posted",      label: "Posted",    icon: "📋" },
  { status: "bidding",     label: "Bids In",   icon: "💬" },
  { status: "accepted",    label: "Accepted",  icon: "✅" },
  { status: "arrived",     label: "Scheduled", icon: "📅" },
  { status: "in_progress", label: "Working",   icon: "🔧" },
  { status: "completed",   label: "Done",      icon: "🏁" },
];

// en_route maps to the same index as accepted (treat as accepted visually)
const STATUS_INDEX: Record<string, number> = {
  posted: 0, bidding: 1, accepted: 2, en_route: 2,
  arrived: 3, in_progress: 4, completed: 5,
};

interface Props {
  status: JobStatus | string;
  scheduledArrivalAt?: string | null;
}

export default function JobStatusTimeline({ status, scheduledArrivalAt }: Props) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-sm text-danger bg-red-50 px-4 py-3 rounded-lg">
        <span className="text-base">❌</span>
        <span className="font-semibold">Job Cancelled</span>
      </div>
    );
  }

  const currentIndex = STATUS_INDEX[status] ?? 0;

  const scheduledLabel = scheduledArrivalAt
    ? new Date(scheduledArrivalAt).toLocaleString("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : null;

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-max gap-0 px-1 py-2">
        {STEPS.map((step, i) => {
          const isDone    = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast    = i === STEPS.length - 1;

          // "Scheduled" step: show the date/time below the label when available
          const isScheduledStep = step.status === "arrived";
          const sublabel = isScheduledStep && scheduledLabel ? scheduledLabel : null;

          return (
            <div key={step.status} className="flex items-start">
              {/* Step bubble + label */}
              <div className="flex flex-col items-center gap-1.5 w-16 sm:w-20">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 transition-all ${
                    isDone    ? "bg-success text-white shadow-sm" :
                    isCurrent ? "bg-primary text-white ring-4 ring-primary/20 shadow-md animate-pulse" :
                                "bg-surface-dark text-muted border border-border"
                  }`}
                >
                  {isDone ? "✓" : step.icon}
                </div>
                <span
                  className={`text-[10px] text-center leading-tight ${
                    isCurrent ? "font-semibold text-primary" :
                    isDone    ? "text-success" :
                                "text-muted"
                  }`}
                >
                  {step.label}
                </span>
                {/* Scheduled arrival date/time beneath the step */}
                {sublabel && (
                  <span className="text-[9px] text-center leading-tight text-primary/80 font-medium max-w-[72px]">
                    {sublabel}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`h-0.5 w-8 sm:w-12 mt-3.5 shrink-0 transition-colors ${
                    i < currentIndex ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

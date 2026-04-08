"use client";

export function ResponseTimeBadge({ avgHours }: { avgHours: number | null }) {
  if (avgHours === null || avgHours === undefined) return null;
  let label: string;
  let color: string;
  if (avgHours < 1) {
    label = "Responds in < 1 hr";
    color = "bg-emerald-100 text-emerald-700";
  } else if (avgHours < 4) {
    label = "Responds in < 4 hrs";
    color = "bg-blue-100 text-blue-700";
  } else if (avgHours < 24) {
    label = "Responds same day";
    color = "bg-amber-100 text-amber-700";
  } else {
    label = "Responds within a day";
    color = "bg-gray-100 text-gray-600";
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      ⚡ {label}
    </span>
  );
}

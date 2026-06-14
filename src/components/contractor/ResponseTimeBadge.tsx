"use client";

export function ResponseTimeBadge({ avgHours }: { avgHours: number | null }) {
  if (avgHours === null || avgHours === undefined) return null;
  let label: string;
  let color: string;
  if (avgHours < 1) {
    label = "Responds in < 1 hr";
    color = "bg-[#27a644]/10 text-[#34d399]";
  } else if (avgHours < 4) {
    label = "Responds in < 4 hrs";
    color = "bg-[#3B82F6]/10 text-[#60A5FA]";
  } else if (avgHours < 24) {
    label = "Responds same day";
    color = "bg-[#fbbf24]/10 text-[#fbbf24]";
  } else {
    label = "Responds within a day";
    color = "bg-[#141516] text-[#8a8f98]";
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      ⚡ {label}
    </span>
  );
}

"use client";

import Link from "next/link";

interface GuaranteeBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

export default function GuaranteeBadge({ size = "sm", className = "" }: GuaranteeBadgeProps) {
  const isSmall = size === "sm";

  return (
    <Link
      href="/legal/guarantee"
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-colors hover:bg-blue-50 ${
        isSmall
          ? "px-2.5 py-1.5 border-blue-200 bg-blue-50/50"
          : "px-3.5 py-2 border-blue-200 bg-blue-50"
      } ${className}`}
    >
      <svg
        className={`${isSmall ? "w-4 h-4" : "w-5 h-5"} text-blue-600 flex-shrink-0`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
      <span
        className={`font-semibold text-blue-700 ${
          isSmall ? "text-xs" : "text-sm"
        }`}
      >
        Resolution Guarantee
      </span>
    </Link>
  );
}

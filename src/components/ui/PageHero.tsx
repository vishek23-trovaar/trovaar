import { ReactNode } from "react";

/**
 * Reusable page header band in Linear's design language (near-black charcoal,
 * hairline border, single brand-blue accent, tight display type) — matches the
 * homepage. Use at the top of inner pages so every screen carries the brand.
 */
export default function PageHero({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Small chip text, e.g. "Live marketplace". Omit to hide. */
  eyebrow?: string;
  /** Right-aligned CTA (e.g. a Link/Button). */
  action?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-4 sm:px-6 sm:py-5 mb-5"
      style={{ backgroundColor: "#0f1011", border: "1px solid #23252a" }}
    >
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 mb-2"
              style={{ backgroundColor: "#141516", border: "1px solid #23252a" }}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: "#27a644", opacity: 0.75 }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#27a644" }} />
              </span>
              <span style={{ fontSize: "0.75rem", color: "#8a8f98" }}>{eyebrow}</span>
            </div>
          )}
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#f7f8f8", lineHeight: 1.15 }} className="sm:text-[1.75rem]">
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: "0.875rem", color: "#8a8f98", letterSpacing: "-0.005em" }} className="mt-1 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

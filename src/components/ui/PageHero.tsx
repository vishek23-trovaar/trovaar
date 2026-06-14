import { ReactNode } from "react";

/**
 * Reusable midnight-gradient page header band (see DESIGN.md `hero-band`).
 * Use at the top of inner pages to replace plain `<h1>` headers so every
 * screen carries the brand. Matches the dashboard/auth hero treatment.
 */
export default function PageHero({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Small uppercase-ish chip text, e.g. "Live marketplace". Omit to hide. */
  eyebrow?: string;
  /** Right-aligned CTA (e.g. a Link/Button). */
  action?: ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-7 sm:px-8 sm:py-8 mb-6 text-white"
      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)" }}
    >
      <div aria-hidden className="absolute -top-24 -right-16 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && (
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-3 text-xs backdrop-blur-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
              </span>
              <span className="text-slate-200">{eyebrow}</span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
          {subtitle && <p className="text-slate-300 text-sm mt-1.5 max-w-2xl">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

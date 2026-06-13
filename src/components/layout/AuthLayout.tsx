"use client";

import Link from "next/link";
import { ShieldCheck, Zap, DollarSign } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Split auth layout matching the brand (see DESIGN.md): a midnight-gradient
 * hero panel (brand wordmark, "Stop searching, start finding." tagline, live
 * eyebrow, trust bullets) beside the form. Mirrors the mobile auth screens.
 * On mobile it stacks — a compact midnight band on top, form below.
 * Shared by login / signup / forgot-password / reset-password.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── Midnight hero panel ── */}
      <div
        className="relative overflow-hidden flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 lg:py-14 text-white"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #1e1b4b 100%)" }}
      >
        {/* grid texture + glow */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-24 -left-16 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand wordmark */}
        <Link href="/" className="relative inline-flex items-center gap-2 self-start">
          <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </span>
          <span className="text-xl font-extrabold tracking-tight">Trovaar</span>
        </Link>

        {/* Hero copy */}
        <div className="relative my-8 lg:my-0">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6 text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-slate-200">Live marketplace — pros bidding now</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight">
            Stop searching,
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #818cf8, #a78bfa)" }}
            >
              start finding.
            </span>
          </h2>
          <p className="text-slate-300 mt-5 max-w-md leading-relaxed">
            Post a job and watch verified local pros compete in real time. Home repairs, auto, commercial — save 20–40%.
          </p>

          <ul className="mt-8 space-y-3 hidden lg:block">
            {[
              { icon: <Zap className="w-4 h-4 text-blue-400" />, text: "Competitive bids within minutes" },
              { icon: <ShieldCheck className="w-4 h-4 text-green-400" />, text: "Background-checked, verified pros" },
              { icon: <DollarSign className="w-4 h-4 text-amber-400" />, text: "Free for consumers — always" },
            ].map((b) => (
              <li key={b.text} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="w-8 h-8 rounded-lg bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0">
                  {b.icon}
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500 hidden lg:block">
          © {2026} Trovaar — Stop searching, start finding.
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center px-4 py-12 bg-surface">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Zap, DollarSign } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Split auth layout in Linear's design language (near-black canvas, hairline
 * panels, single brand-blue accent, tight display type) — matches the homepage.
 * Left: a near-black brand hero (logo, "Stop searching, start finding." tagline,
 * trust bullets). Right: the form. Stacks on mobile.
 * Shared by login / signup / forgot-password / reset-password.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2" style={{ backgroundColor: "#010102" }}>
      {/* ── Brand hero panel ── */}
      <div
        className="relative flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 lg:py-14"
        style={{ backgroundColor: "#010102", borderRight: "1px solid #23252a", color: "#f7f8f8" }}
      >
        <Link href="/" className="relative inline-flex items-center gap-2.5 self-start">
          <Image src="/trovaar-icon.png" alt="Trovaar" width={30} height={22} priority style={{ height: 22, width: "auto" }} />
          <span style={{ fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.02em" }}>Trovaar</span>
        </Link>

        <div className="relative my-8 lg:my-0">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6"
            style={{ backgroundColor: "#141516", border: "1px solid #23252a" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full" style={{ backgroundColor: "#27a644", opacity: 0.75 }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#27a644" }} />
            </span>
            <span style={{ fontSize: "0.8125rem", color: "#8a8f98" }}>Live marketplace — pros bidding now</span>
          </div>
          <h2 style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: "clamp(2rem, 4.4vw, 3.25rem)", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.028em" }}>
            Stop searching,
            <br />
            <span style={{ color: "#3B82F6" }}>start finding.</span>
          </h2>
          <p style={{ fontSize: "1.0625rem", color: "#8a8f98", lineHeight: 1.5 }} className="mt-5 max-w-md">
            Post a job and watch verified local pros compete in real time. Home repairs, auto, commercial — save 20–40%.
          </p>

          <ul className="mt-8 space-y-3 hidden lg:block">
            {[
              { icon: <Zap className="w-4 h-4" style={{ color: "#3B82F6" }} />, text: "Competitive bids within minutes" },
              { icon: <ShieldCheck className="w-4 h-4" style={{ color: "#27a644" }} />, text: "Background-checked, verified pros" },
              { icon: <DollarSign className="w-4 h-4" style={{ color: "#8a8f98" }} />, text: "Free for consumers — always" },
            ].map((b) => (
              <li key={b.text} className="flex items-center gap-3" style={{ fontSize: "0.875rem", color: "#d0d6e0" }}>
                <span className="grid h-8 w-8 place-items-center rounded-lg shrink-0" style={{ backgroundColor: "#0f1011", border: "1px solid #23252a" }}>
                  {b.icon}
                </span>
                {b.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative hidden lg:block" style={{ fontSize: "0.75rem", color: "#62666d" }}>
          © 2026 Trovaar — Stop searching, start finding.
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#0f1011" }}>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

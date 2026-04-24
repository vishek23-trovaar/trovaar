"use client";

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * CATEGORY SECTION COMPARISON PREVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 * Three creative approaches for "Every trade. Every job." stacked on one page
 * so we can compare them side-by-side. The live `/` is untouched.
 *
 * 1. Tabs + Search  (currently shipped to `/`)
 * 2. Marquee Bands   (animated scrolling chip rows)
 * 3. Bento Grid      (12 tiles, click to expand inline)
 *
 * When approved, the chosen one replaces CategorySection in src/app/page.tsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { CATEGORY_GROUPS } from "@/lib/constants";
import { Search, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

type Category = { value: string; label: string };
type Group = { label: string; icon: string; categories: Category[] };

const GROUPS = CATEGORY_GROUPS as Group[];
const TOTAL = GROUPS.reduce((s, g) => s + g.categories.length, 0);
const ALL_FLAT: Array<Category & { groupIcon: string; groupLabel: string }> = GROUPS.flatMap(
  (g) => g.categories.map((c) => ({ ...c, groupIcon: g.icon, groupLabel: g.label }))
);

/* ═══════════════════════════════════════════════════════════════════════════
 * OPTION 1 — TABS + SEARCH (currently live at /)
 * ═══════════════════════════════════════════════════════════════════════════ */

function OptionTabs() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [query, setQuery] = useState("");

  const trimmed = query.trim().toLowerCase();
  const isSearching = trimmed.length > 0;
  const results = useMemo(() => {
    if (!isSearching) return [];
    return ALL_FLAT.filter((c) => c.label.toLowerCase().includes(trimmed)).slice(0, 60);
  }, [trimmed, isSearching]);

  const activeGroup = GROUPS[activeIdx];

  return (
    <section className="py-16 relative overflow-hidden" style={{ background: "#f8fafc" }}>
      <div aria-hidden className="absolute -top-32 -right-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            Every trade. Every job.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            <span className="font-semibold text-slate-700 tabular-nums">{TOTAL}</span> services across{" "}
            <span className="font-semibold text-slate-700">{GROUPS.length}</span> categories.
          </p>
        </div>

        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any service — try 'plumbing', 'detail', 'massage'..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium px-2 py-1 rounded hover:bg-slate-100">
                Clear
              </button>
            )}
          </div>
        </div>

        {!isSearching && (
          <div className="-mx-4 sm:mx-0 mb-8">
            <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 sm:flex-wrap sm:justify-center pb-2 scrollbar-hide">
              {GROUPS.map((group, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={group.label}
                    onClick={() => setActiveIdx(i)}
                    className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/10"
                        : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base leading-none">{group.icon}</span>
                    <span>{group.label}</span>
                    <span className={`text-xs tabular-nums ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                      {group.categories.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-slate-200/70 p-6 sm:p-8 shadow-sm">
          {isSearching ? (
            results.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <p className="text-sm">No services match &ldquo;{query}&rdquo;.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-4">
                  <span className="font-semibold text-slate-700 tabular-nums">{results.length}</span> match{results.length === 1 ? "" : "es"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {results.map((cat, i) => (
                    <Link
                      key={cat.value}
                      href={`/jobs?category=${cat.value}`}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/20 transition-all"
                      style={{ animation: `fadeInUp 0.3s ease-out ${Math.min(i * 15, 300)}ms both` }}
                    >
                      <span className="text-xs opacity-60 group-hover:opacity-100">{cat.groupIcon}</span>
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </>
            )
          ) : (
            <div key={activeIdx}>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-2xl leading-none">{activeGroup.icon}</span>
                <h3 className="font-semibold text-slate-900">{activeGroup.label}</h3>
                <span className="text-xs text-slate-400 tabular-nums">
                  · {activeGroup.categories.length} services
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeGroup.categories.map((cat, i) => (
                  <Link
                    key={cat.value}
                    href={`/jobs?category=${cat.value}`}
                    className="px-3 py-1.5 rounded-full text-sm bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/20 transition-all"
                    style={{ animation: `fadeInUp 0.35s ease-out ${Math.min(i * 18, 400)}ms both` }}
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-10">
          <Link href="/jobs">
            <Button variant="outline" size="lg">Browse Live Jobs</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * OPTION 2 — MARQUEE BANDS (3 rows of scrolling chips, hover pauses)
 * ═══════════════════════════════════════════════════════════════════════════ */

function MarqueeRow({
  items,
  direction,
  duration,
}: {
  items: Array<Category & { groupIcon: string }>;
  direction: "left" | "right";
  duration: number;
}) {
  const animation = direction === "left" ? "marqueeLeft" : "marqueeRight";
  // Two copies for seamless loop
  return (
    <div className="group/marquee overflow-hidden">
      <div
        className="flex gap-3 w-max group-hover/marquee:[animation-play-state:paused]"
        style={{ animation: `${animation} ${duration}s linear infinite` }}
      >
        {[...items, ...items].map((cat, i) => (
          <Link
            key={`${cat.value}-${i}`}
            href={`/jobs?category=${cat.value}`}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm bg-white border border-slate-200 text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/20 transition-colors"
          >
            <span className="text-base leading-none opacity-70">{cat.groupIcon}</span>
            {cat.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OptionMarquee() {
  // Split flat list into 3 roughly-equal rows
  const rows = useMemo(() => {
    const r: Array<typeof ALL_FLAT> = [[], [], []];
    ALL_FLAT.forEach((cat, i) => r[i % 3].push(cat));
    return r;
  }, []);

  return (
    <section className="py-16 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)" }}>
      <div aria-hidden className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/10 rounded-full blur-3xl" />
      {/* Edge fade overlays so chips fade in/out at the boundaries */}
      <div aria-hidden className="absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none" />
      <div aria-hidden className="absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-indigo-950 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 text-white">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            Every trade. Every job.
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            <span className="font-semibold text-white tabular-nums">{TOTAL}</span> live services. Hover to pause, click to browse.
          </p>
        </div>

        <div className="space-y-3">
          <MarqueeRow items={rows[0]} direction="left" duration={60} />
          <MarqueeRow items={rows[1]} direction="right" duration={75} />
          <MarqueeRow items={rows[2]} direction="left" duration={50} />
        </div>

        <div className="text-center mt-10">
          <Link href="/jobs">
            <Button variant="white" size="lg">Browse Live Jobs</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * OPTION 3 — BENTO GRID (12 tiles, click one to expand inline)
 * ═══════════════════════════════════════════════════════════════════════════ */

function OptionBento() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  // Per-group accent color cycle
  const accents = [
    { bg: "from-blue-50 to-blue-100/50", text: "text-blue-700", chip: "hover:bg-blue-600" },
    { bg: "from-emerald-50 to-emerald-100/50", text: "text-emerald-700", chip: "hover:bg-emerald-600" },
    { bg: "from-amber-50 to-amber-100/50", text: "text-amber-700", chip: "hover:bg-amber-600" },
    { bg: "from-rose-50 to-rose-100/50", text: "text-rose-700", chip: "hover:bg-rose-600" },
    { bg: "from-cyan-50 to-cyan-100/50", text: "text-cyan-700", chip: "hover:bg-cyan-600" },
    { bg: "from-violet-50 to-violet-100/50", text: "text-violet-700", chip: "hover:bg-violet-600" },
    { bg: "from-fuchsia-50 to-fuchsia-100/50", text: "text-fuchsia-700", chip: "hover:bg-fuchsia-600" },
    { bg: "from-orange-50 to-orange-100/50", text: "text-orange-700", chip: "hover:bg-orange-600" },
    { bg: "from-teal-50 to-teal-100/50", text: "text-teal-700", chip: "hover:bg-teal-600" },
    { bg: "from-sky-50 to-sky-100/50", text: "text-sky-700", chip: "hover:bg-sky-600" },
    { bg: "from-lime-50 to-lime-100/50", text: "text-lime-700", chip: "hover:bg-lime-600" },
    { bg: "from-pink-50 to-pink-100/50", text: "text-pink-700", chip: "hover:bg-pink-600" },
  ];

  return (
    <section className="py-16" style={{ background: "white" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            Every trade. Every job.
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            <span className="font-semibold text-slate-700 tabular-nums">{TOTAL}</span> services. Tap any tile to see what&apos;s inside.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {GROUPS.map((group, i) => {
            const isExpanded = expandedIdx === i;
            const accent = accents[i % accents.length];
            return (
              <div
                key={group.label}
                className={`${isExpanded ? "col-span-2 sm:col-span-3 lg:col-span-4 row-span-2" : ""} transition-all duration-300`}
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className={`w-full text-left rounded-2xl border border-slate-200 bg-gradient-to-br ${accent.bg} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
                    isExpanded ? "shadow-xl ring-2 ring-blue-500/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-3xl leading-none">{group.icon}</span>
                    {isExpanded ? (
                      <ChevronUp className={`w-5 h-5 ${accent.text}`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${accent.text} opacity-60`} />
                    )}
                  </div>
                  <h3 className={`font-semibold ${accent.text} text-sm sm:text-base mb-0.5`}>
                    {group.label}
                  </h3>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {group.categories.length} service{group.categories.length === 1 ? "" : "s"}
                  </p>

                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-white/60">
                      <div className="flex flex-wrap gap-2">
                        {group.categories.map((cat, j) => (
                          <Link
                            key={cat.value}
                            href={`/jobs?category=${cat.value}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`px-3 py-1.5 rounded-full text-sm bg-white border border-slate-200 text-slate-700 ${accent.chip} hover:text-white hover:border-transparent hover:shadow-md transition-all`}
                            style={{ animation: `fadeInUp 0.3s ease-out ${Math.min(j * 15, 300)}ms both` }}
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link href="/jobs">
            <Button variant="outline" size="lg">Browse Live Jobs</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PAGE — banners + section dividers
 * ═══════════════════════════════════════════════════════════════════════════ */

function Divider({ num, name, blurb, status }: { num: number; name: string; blurb: string; status?: "live" | "preview" }) {
  return (
    <div className="bg-slate-900 text-white py-10 px-4 border-y border-slate-800">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm font-bold tabular-nums">
            {num}
          </span>
          {status === "live" && (
            <span className="inline-flex items-center gap-1 bg-green-500/20 border border-green-400/30 rounded-full px-2 py-0.5 text-xs font-semibold text-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Currently live at /
            </span>
          )}
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
          Option {num} — {name}
        </h2>
        <p className="text-slate-400 text-sm max-w-xl mx-auto">{blurb}</p>
      </div>
    </div>
  );
}

export default function PreviewCategoriesPage() {
  return (
    <div className="bg-white">
      {/* Sticky preview banner */}
      <div className="sticky top-0 z-50 bg-amber-400 text-amber-950 text-center py-2 px-4 text-sm font-semibold shadow-md">
        <Sparkles className="inline w-4 h-4 mr-1 -mt-0.5" />
        PREVIEW — three takes on the category section. Live homepage is at{" "}
        <Link href="/" className="underline font-bold">/</Link>
      </div>

      <Divider
        num={1}
        name="Tabs + Search"
        blurb="The version currently on /. Pill tabs across the top, click one to see all its services as chips. Search input filters across all 149."
        status="live"
      />
      <OptionTabs />

      <Divider
        num={2}
        name="Marquee Bands"
        blurb="Three rows of chips scroll continuously at different speeds, alternating directions. Hover any row to pause. Visually dynamic, single fold, no clicking needed to see services."
      />
      <OptionMarquee />

      <Divider
        num={3}
        name="Bento Grid (Click to Expand)"
        blurb="Twelve color-coded tiles in a tight grid. Click one and it expands inline to reveal all services in that group. One open at a time. Compact overview, services on demand."
      />
      <OptionBento />

      <div className="bg-slate-900 text-white py-12 px-4 text-center">
        <p className="text-slate-400 text-sm mb-2">Pick your favorite and tell me the option number.</p>
        <p className="text-slate-500 text-xs">
          You can also mix and match — e.g. &ldquo;Option 2&apos;s look but with the search bar from Option 1.&rdquo;
        </p>
      </div>
    </div>
  );
}

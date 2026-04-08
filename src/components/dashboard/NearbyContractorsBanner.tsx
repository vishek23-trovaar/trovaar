"use client";

import { useState, useEffect, useRef } from "react";

type BannerState = "locating" | "loading" | "ready" | "fallback" | "error";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    startRef.current = null;

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // Ease-out cubic
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    }

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return value;
}

export default function NearbyContractorsBanner() {
  const [state, setState] = useState<BannerState>("locating");
  const [count, setCount] = useState(0);
  const [radiusMiles, setRadiusMiles] = useState<number | null>(50);
  const [isFallback, setIsFallback] = useState(false);
  const animatedCount = useCountUp(count, 1000);

  useEffect(() => {
    if (!navigator.geolocation) {
      // No geolocation support — fetch platform-wide count
      fetchCount(null, null);
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchCount(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // Permission denied or error — fall back to platform count
        fetchCount(null, null);
      },
      { timeout: 6000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  async function fetchCount(lat: number | null, lng: number | null) {
    setState("loading");
    try {
      const url =
        lat !== null && lng !== null
          ? `/api/contractors/nearby?lat=${lat}&lng=${lng}&miles=50`
          : `/api/contractors/nearby`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");

      const data = await res.json();
      setCount(data.count ?? 0);
      setRadiusMiles(data.radiusMiles ?? null);
      setIsFallback(!!data.fallback);
      setState(data.fallback ? "fallback" : "ready");
    } catch {
      setState("error");
    }
  }

  if (state === "error") return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-5 py-4 mb-6 shadow-lg">
      {/* Subtle background circles */}
      <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-8 right-16 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className="shrink-0 w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-2xl">
          📍
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {state === "locating" && (
            <>
              <p className="font-semibold text-sm leading-tight">Checking your area…</p>
              <p className="text-xs text-blue-200 mt-0.5">Finding local contractors near you</p>
            </>
          )}

          {state === "loading" && (
            <>
              <p className="font-semibold text-sm leading-tight flex items-center gap-2">
                <span className="inline-block w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Counting nearby contractors…
              </p>
              <p className="text-xs text-blue-200 mt-0.5">Searching within 50 miles</p>
            </>
          )}

          {state === "ready" && (
            <>
              <p className="font-bold text-lg leading-tight">
                {animatedCount}{" "}
                <span className="font-semibold text-white/90">
                  contractor{animatedCount !== 1 ? "s" : ""}
                </span>{" "}
                <span className="font-normal text-sm text-blue-100">
                  within {radiusMiles} miles
                </span>
              </p>
              <p className="text-xs text-blue-200 mt-0.5">
                Ready to bid on your next job — post now!
              </p>
            </>
          )}

          {state === "fallback" && (
            <>
              <p className="font-bold text-lg leading-tight">
                {animatedCount}{" "}
                <span className="font-semibold text-white/90">
                  contractor{animatedCount !== 1 ? "s" : ""}
                </span>{" "}
                <span className="font-normal text-sm text-blue-100">on the platform</span>
              </p>
              <p className="text-xs text-blue-200 mt-0.5">
                Enable location access to see contractors near you
              </p>
            </>
          )}
        </div>

        {/* Live dot + CTA */}
        <div className="shrink-0 flex flex-col items-end gap-2">
          {(state === "ready" || state === "fallback") && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-xs font-medium text-green-300">Live</span>
            </div>
          )}
          {!isFallback && state === "ready" && count === 0 && (
            <p className="text-xs text-blue-200 text-right max-w-[120px]">
              Be the first to post in your area!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

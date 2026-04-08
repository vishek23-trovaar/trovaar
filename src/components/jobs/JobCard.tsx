"use client";

import Link from "next/link";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { CATEGORIES, CATEGORY_GROUPS, URGENCY_LEVELS } from "@/lib/constants";
import { JobWithBidCount } from "@/types";
import { distanceMiles, formatDistance } from "@/lib/utils";

interface JobCardProps {
  job: JobWithBidCount;
  userLat?: number;
  userLng?: number;
}

const urgencyVariant = {
  low: "default" as const,
  medium: "info" as const,
  high: "warning" as const,
  emergency: "danger" as const,
};

export default function JobCard({ job, userLat, userLng }: JobCardProps) {
  const category = CATEGORIES.find((c) => c.value === job.category);
  const categoryGroup = CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === job.category));
  const urgency = URGENCY_LEVELS.find((u) => u.value === job.urgency);
  const distance =
    userLat != null && userLng != null && job.latitude != null && job.longitude != null
      ? formatDistance(distanceMiles(userLat, userLng, job.latitude, job.longitude))
      : null;
  const photos = (() => { try { return JSON.parse(job.photos || "[]") as string[]; } catch { return [] as string[]; } })();
  const [imgError, setImgError] = useState(false);

  const isCollab = !!job.is_collab;
  const collabPay = isCollab && job.collab_pay_cents
    ? `$${(job.collab_pay_cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null;
  const spotsLeft = isCollab && job.collab_spots != null && job.collab_spots_filled != null
    ? job.collab_spots - job.collab_spots_filled
    : null;

  const gradientStyle = {
    background: categoryGroup?.label === "Automotive"
      ? "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)"
      : categoryGroup?.label === "Outdoor & Landscaping"
      ? "linear-gradient(135deg, #1a3a2a 0%, #2d6a4f 100%)"
      : categoryGroup?.label === "Commercial (Small Business)"
      ? "linear-gradient(135deg, #2a1a3a 0%, #4a2d6a 100%)"
      : categoryGroup?.label === "Marine & Watercraft"
      ? "linear-gradient(135deg, #0a2a3a 0%, #1a5a7a 100%)"
      : categoryGroup?.label === "Technology & IT"
      ? "linear-gradient(135deg, #1a1a3a 0%, #2a2a6a 100%)"
      : categoryGroup?.label === "Specialty Trades"
      ? "linear-gradient(135deg, #3a2a1a 0%, #6a4a2a 100%)"
      : "linear-gradient(135deg, #1a2a3a 0%, #2a4a6a 100%)",
  };

  return (
    <Link href={`/jobs/${job.id}${isCollab ? "?tab=crew" : ""}`}>
      <Card hover className="overflow-hidden">
        {/* Photo / gradient header */}
        {photos.length > 0 && !imgError ? (
          <div className="h-48 bg-surface-dark overflow-hidden relative">
            <img
              src={photos[0]}
              alt={job.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            {isCollab && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-indigo-600/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                🤝 Collaboration
              </div>
            )}
          </div>
        ) : (
          <div
            className="h-48 flex flex-col items-center justify-center gap-3 relative"
            style={{ background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)" }}
          >
            <span className="text-3xl opacity-60">{categoryGroup?.icon ?? "🔧"}</span>
            <span className="text-sm font-medium text-slate-500 px-4 text-center leading-tight">
              {category?.label ?? categoryGroup?.label ?? "Service Request"}
            </span>
            {isCollab && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-indigo-600/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                🤝 Collaboration
              </div>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">{categoryGroup?.icon ?? "🔧"}</span>
            <span className="text-xs font-medium text-muted">{category?.label}</span>
            <Badge variant={urgencyVariant[job.urgency]}>{urgency?.label}</Badge>
          </div>
          <h3 className="font-semibold text-secondary mb-1 line-clamp-2">{job.title}</h3>
          {job.description && (
            <p className="text-sm text-muted line-clamp-2 mb-3">{job.description}</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted min-w-0">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{job.location}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {distance && (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  {distance}
                </span>
              )}
              {isCollab ? (
                <div className="flex items-center gap-1 font-semibold text-indigo-600">
                  <span className="text-sm">💰</span>
                  <span>{collabPay ?? "Paid"}</span>
                  {spotsLeft !== null && spotsLeft > 0 && (
                    <span className="text-xs font-normal text-muted ml-1">· {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 font-medium text-primary">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {job.bid_count} bid{job.bid_count !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collaboration bottom banner */}
        {isCollab && (
          <div className="border-t border-indigo-100 bg-indigo-50 px-4 py-2.5 flex items-center gap-2">
            <span className="text-base">🤝</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-700 leading-tight">Looking to Collaborate</p>
              <p className="text-xs text-indigo-500 leading-tight">Learn on the job under a licensed pro</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
              Apply →
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { BidWithContractor, Qualification } from "@/types";
import { CONTRACTOR_TYPES, QUALIFICATION_TYPES, getPlatformTier, PLATFORM_MARKUP } from "@/lib/constants";
import { ResponseTimeBadge } from "@/components/contractor/ResponseTimeBadge";

interface MatchScore {
  score: number;
  reasoning: string;
  highlights: string[];
  concerns: string[];
}

interface BidCardProps {
  bid: BidWithContractor;
  isConsumer?: boolean;
  isEmergency?: boolean;
  onAccept?: (bidId: string) => void;
  onReject?: (bidId: string) => void;
  revealed?: boolean;   // true after bid accepted and job paid
  bidIndex?: number;    // used for "Pro #1", "Pro #2" numbering
  matchScore?: MatchScore | null;
}

export default function BidCard({ bid, isConsumer, isEmergency, onAccept, onReject, revealed, bidIndex, matchScore }: BidCardProps) {
  const [showMatchDetails, setShowMatchDetails] = useState(false);
  // Consumers see a marked-up price; contractors see their own original bid.
  const displayCents = isConsumer ? Math.round(bid.price * (1 + PLATFORM_MARKUP)) : bid.price;
  const price = (displayCents / 100).toFixed(2);
  const bonusPrice = isEmergency ? ((displayCents * 1.25) / 100).toFixed(2) : null;

  const contractorTypeDef = CONTRACTOR_TYPES.find((t) => t.value === (bid.contractor_type ?? "independent"));
  const platformTier = getPlatformTier(bid.contractor_completed_jobs ?? 0);

  // On-platform payment rate — shown when contractor has 3+ accepted jobs (enough data to be meaningful)
  const totalAccepted: number = (bid as any).contractor_total_accepted ?? 0;
  const paidCompletions: number = (bid as any).contractor_paid_completions ?? 0;
  const onPlatformRate: number | null = totalAccepted >= 3
    ? Math.round((paidCompletions / totalAccepted) * 100)
    : null;

  const quals: Qualification[] = (() => {
    try { return JSON.parse(bid.contractor_qualifications || "[]"); } catch { return []; }
  })();

  // Trust & Verification data
  const backgroundCheck: string = (bid as any).contractor_background_check ?? "none";
  const contractorHeadline: string | null = (bid as any).contractor_headline ?? null;
  const certsList: string[] = ((bid as any).contractor_certifications_list ?? "")
    .split("||")
    .filter((s: string) => s.trim());

  // Itemized bid — labor + materials
  const hasMaterials = !!(bid as any).materials_json;
  const laborCents: number = (bid as any).labor_cents ?? 0;
  const materials: Array<{ description: string; quantity: number; subtotal_cents: number; hd_search?: string }> = hasMaterials
    ? (() => { try { return JSON.parse((bid as any).materials_json); } catch { return []; } })()
    : [];

  // Parts summary + equipment
  const partsSummary: string = (bid as any).parts_summary ?? "";
  const equipmentList: Array<{ name: string; status: "own" | "rent" | "purchase" | "borrow" }> =
    (() => { try { return JSON.parse((bid as any).equipment_json || "[]"); } catch { return []; } })();

  const EQUIPMENT_BADGE: Record<string, { label: string; cls: string }> = {
    own:      { label: "I own it",        cls: "bg-emerald-100 text-emerald-700" },
    rent:     { label: "Renting",         cls: "bg-blue-100 text-blue-700" },
    purchase: { label: "Need to Purchase",cls: "bg-orange-100 text-orange-700" },
    borrow:   { label: "Need to Borrow",  cls: "bg-purple-100 text-purple-700" },
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {isConsumer && !revealed ? (
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center border-2 border-dashed border-slate-300 flex-shrink-0">
              <span className="text-sm">🔒</span>
            </div>
          ) : (
            <Link href={`/profile/${bid.contractor_id}`}>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer flex-shrink-0">
                {bid.contractor_photo ? (
                  <img src={bid.contractor_photo} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {bid.contractor_name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>
            </Link>
          )}
          <div>
            {/* Name + skill tier badge */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Name — anonymous until revealed */}
              {isConsumer && !revealed ? (
                <span className="font-semibold text-secondary text-sm">Pro #{bidIndex ?? 1}</span>
              ) : (
                <Link href={`/profile/${bid.contractor_id}`} className="font-semibold text-secondary hover:text-primary transition-colors">
                  {bid.contractor_name}
                </Link>
              )}
              {contractorTypeDef && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${contractorTypeDef.badgeClass}`}>
                  {contractorTypeDef.icon} {contractorTypeDef.badge}
                </span>
              )}
            </div>

            {/* Headline — shown when available */}
            {contractorHeadline && !(isConsumer && !revealed) && (
              <p className="text-xs text-primary font-medium mt-0.5">{contractorHeadline}</p>
            )}

            {/* Unlock hint — shown when consumer hasn't revealed profile yet */}
            {isConsumer && !revealed && (
              <p className="text-xs text-muted mt-0.5">Accept bid to reveal full profile</p>
            )}

            {/* Track record row — Uber-style rating + jobs + on-platform rate */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {bid.contractor_rating > 0 ? (
                <span className="flex items-center gap-1 font-semibold text-sm text-secondary">
                  <svg className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {bid.contractor_rating.toFixed(1)}
                </span>
              ) : (
                <span className="text-xs text-muted">No rating yet</span>
              )}
              {(bid.contractor_completed_jobs ?? 0) > 0 && (
                <>
                  <span className="text-muted text-xs">·</span>
                  <span className="text-xs text-muted">{bid.contractor_completed_jobs} jobs</span>
                </>
              )}
              {bid.contractor_years_experience > 0 && (
                <>
                  <span className="text-muted text-xs">·</span>
                  <span className="text-xs text-muted">{bid.contractor_years_experience} yrs exp</span>
                </>
              )}
              {/* On-platform payment rate */}
              {onPlatformRate !== null && (
                <>
                  <span className="text-muted text-xs">·</span>
                  <span
                    title="% of accepted jobs paid through the platform (not cash or off-platform)"
                    className={`text-xs font-medium ${
                      onPlatformRate >= 90 ? "text-emerald-600" :
                      onPlatformRate >= 70 ? "text-amber-600" :
                      "text-red-600"
                    }`}
                  >
                    {onPlatformRate >= 90 ? "✅" : onPlatformRate >= 70 ? "⚠️" : "🚩"} {onPlatformRate}% on-platform
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
              {/* Platform tier — secondary, shown as small label */}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${platformTier.badgeClass}`}>
                {platformTier.icon} {platformTier.label}
              </span>
            </div>
            {(bid.contractor_verification_status === "approved" || bid.contractor_insurance_status === "approved" || backgroundCheck === "approved") && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {bid.contractor_verification_status === "approved" && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">✓ ID Verified</span>
                )}
                {backgroundCheck === "approved" && (
                  <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">🛡️ Background Check</span>
                )}
                {bid.contractor_insurance_status === "approved" && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">📋 Licensed &amp; Insured</span>
                )}
                {bid.contractor_rating >= 4.8 && (bid.contractor_completed_jobs ?? 0) >= 3 && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">⭐ Top Rated</span>
                )}
                {(bid.contractor_completed_jobs ?? 0) >= 50 && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">🏆 Elite Pro</span>
                )}
              </div>
            )}
            {/* Certifications badges */}
            {certsList.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {certsList.slice(0, 3).map((cert, i) => (
                  <span key={i} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                    📜 {cert}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1">
              <ResponseTimeBadge avgHours={(bid as any).avg_response_hours ?? null} />
            </div>
            {quals.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {quals.slice(0, 2).map((q, i) => {
                  const qt = QUALIFICATION_TYPES.find((t) => t.value === q.type);
                  return (
                    <span key={i} className="text-xs bg-surface text-muted px-1.5 py-0.5 rounded">
                      {qt?.icon} {q.name}
                    </span>
                  );
                })}
                {quals.length > 2 && (
                  <span className="text-xs text-muted px-1 py-0.5">+{quals.length - 2} more</span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-secondary">${price}</p>
          {bonusPrice && (
            <p className="text-xs font-medium text-amber-600">+25% bonus: ${bonusPrice}</p>
          )}
          {hasMaterials && laborCents > 0 && (
            <p className="text-xs text-muted">Labor: ${(laborCents / 100).toFixed(2)}</p>
          )}
          <p className="text-xs text-muted">{bid.timeline_days} day{bid.timeline_days !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* AI Match Score Badge — only shown to consumers */}
      {isConsumer && matchScore && matchScore.score > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowMatchDetails(!showMatchDetails)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
              matchScore.score >= 80
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                : matchScore.score >= 60
                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            <span>🎯</span>
            <span>{matchScore.score}% Match</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showMatchDetails ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMatchDetails && (
            <div className={`mt-2 rounded-lg border p-3 text-sm ${
              matchScore.score >= 80
                ? "bg-emerald-50/50 border-emerald-200"
                : matchScore.score >= 60
                ? "bg-amber-50/50 border-amber-200"
                : "bg-gray-50/50 border-gray-200"
            }`}>
              <p className="text-secondary mb-2">{matchScore.reasoning}</p>
              {matchScore.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {matchScore.highlights.map((h, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-emerald-200 text-emerald-700">
                      <span>✓</span> {h}
                    </span>
                  ))}
                </div>
              )}
              {matchScore.concerns.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {matchScore.concerns.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border border-orange-200 text-orange-600">
                      <span>!</span> {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Itemized materials breakdown */}
      {hasMaterials && materials.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-amber-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">🧾 Materials Estimate</span>
            <span className="text-xs text-amber-600 font-medium">Subject to change — approval required</span>
          </div>
          <table className="w-full text-xs bg-white">
            <tbody>
              {materials.map((m, i) => (
                <tr key={i} className="border-t border-amber-100">
                  <td className="px-3 py-1.5 text-secondary">
                    {m.hd_search ? (
                      <a href={m.hd_search} target="_blank" rel="noopener noreferrer" className="hover:text-orange-600 hover:underline">
                        🏠 {m.description}
                      </a>
                    ) : m.description}
                  </td>
                  <td className="px-2 py-1.5 text-center text-muted">×{m.quantity}</td>
                  <td className="px-3 py-1.5 text-right font-medium">${(m.subtotal_cents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Parts & Supplies Summary */}
      {partsSummary && (
        <div className="mt-3 rounded-lg border border-blue-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-blue-50 flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-900">📦 Parts &amp; Supplies</span>
          </div>
          <p className="px-3 py-2 text-xs text-secondary whitespace-pre-line bg-white leading-relaxed">
            {partsSummary}
          </p>
        </div>
      )}

      {/* Equipment list */}
      {equipmentList.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-slate-50 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">🔧 Equipment</span>
            {equipmentList.some((e) => e.status !== "own") && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                ⚠️ Some equipment to be sourced
              </span>
            )}
          </div>
          <div className="bg-white divide-y divide-slate-100">
            {equipmentList.map((eq, i) => {
              const badge = EQUIPMENT_BADGE[eq.status] ?? EQUIPMENT_BADGE.own;
              return (
                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-xs text-secondary">{eq.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm text-muted">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Available: {new Date(bid.availability_date).toLocaleDateString()}
        </span>
        {bid.status !== "pending" && (
          <Badge variant={bid.status === "accepted" ? "success" : "danger"}>
            {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
          </Badge>
        )}
      </div>

      {bid.message && (
        <p className="mt-3 text-sm text-muted bg-surface rounded-lg p-3">{bid.message}</p>
      )}

      {/* Escrow trust line — shown to consumer on pending bids */}
      {isConsumer && bid.status === "pending" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
          <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs text-emerald-700">
            Accept this bid &rarr; <strong>${price}</strong> held in escrow until you confirm
          </span>
          <span className="ml-auto text-[10px] text-emerald-600 font-medium whitespace-nowrap">Protected by Trovaar Escrow</span>
        </div>
      )}

      {isConsumer && bid.status === "pending" && (
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => onAccept?.(bid.id)}>Accept Bid</Button>
          <Button size="sm" variant="ghost" onClick={() => onReject?.(bid.id)}>Reject</Button>
          {revealed && (
            <Link href={`/profile/${bid.contractor_id}`} className="ml-auto">
              <Button size="sm" variant="outline">View Profile</Button>
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}

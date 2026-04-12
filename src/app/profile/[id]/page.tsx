"use client";

import { useState, useEffect, use } from "react";
import PortfolioManager from "@/components/portfolio/PortfolioManager";
import { CATEGORIES, CONTRACTOR_TYPES, QUALIFICATION_TYPES, getPlatformTier } from "@/lib/constants";
import { QUIZ_CATEGORIES } from "@/lib/quiz-questions";
import { Qualification } from "@/types";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractorProfile {
  id: string;
  name: string;
  email: string;
  location: string | null;
  created_at: string;
  bio: string | null;
  years_experience: number;
  categories: string;
  profile_photo: string | null;
  rating: number;
  rating_count: number;
  verification_status: "none" | "pending" | "approved" | "rejected";
  insurance_status: "none" | "pending" | "approved" | "rejected";
  business_established: number | null;
  portfolio_photos: string;
  contractor_type: string;
  qualifications: string;
  headline: string | null;
  about_me: string | null;
  license_number: string | null;
  insurance_verified: number;
  background_check_status: string;
}

interface CertificationData {
  id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  verified: number;
  document_url: string | null;
}

interface WorkHistoryEntry {
  id: string;
  company_name: string;
  role: string | null;
  start_year: number | null;
  end_year: number | null;
  verified: number;
}

interface Review {
  id: string;
  job_id: string;
  rating: number;
  comment: string | null;
  photos: string;
  created_at: string;
  reviewer_first_name: string;
}

interface ContractorStats {
  cancellation_count: number;
  no_show_count: number;
  acceptance_count: number;
  completion_count: number;
  completionRate: number | null;
  activeStrikes: number;
  is_suspended: number;
  suspended_until: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={`flex gap-0.5 ${sz}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-gray-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

function RatingBar({ count, total, star }: { count: number; total: number; star: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-amber-400 w-3 text-right font-medium">{star}</span>
      <span className="text-amber-400 text-xs">★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-400 w-6 text-right">{count}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ContractorStats | null>(null);
  const [certifications, setCertifications] = useState<CertificationData[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([]);
  const [portfolioPhotos, setPortfolioPhotos] = useState<{ url: string; caption: string | null; project_type: string | null; uploaded_at: string }[]>([]);
  const [quizScores, setQuizScores] = useState<{ category: string; percentage: number; completed_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savePending, setSavePending] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, reviewsRes, statsRes, portfolioRes, quizRes] = await Promise.all([
          fetch(`/api/contractors/${id}`),
          fetch(`/api/reviews/contractor/${id}`),
          fetch(`/api/contractors/${id}/stats`),
          fetch(`/api/contractors/${id}/portfolio`),
          fetch(`/api/quiz/scores/${id}`),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
          setCompletedJobs(data.completedJobs ?? 0);
          setCertifications(data.certifications ?? []);
          setWorkHistory(data.workHistory ?? []);
        }
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(data.reviews ?? []);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
        }
        if (portfolioRes.ok) {
          const data = await portfolioRes.json();
          setPortfolioPhotos(data.photos ?? []);
        }
        if (quizRes.ok) {
          const data = await quizRes.json();
          setQuizScores((data.scores ?? []).filter((s: { percentage: number }) => s.percentage >= 70));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== "consumer") return;
    fetch("/api/saved-contractors")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSaved(data.saved.some((s: { id: string }) => s.id === id));
      })
      .catch(() => {});
  }, [id, user]);

  async function toggleSave() {
    if (!user || user.role !== "consumer" || savePending) return;
    setSavePending(true);
    try {
      if (saved) {
        await fetch(`/api/saved-contractors?contractorId=${id}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/saved-contractors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractorId: id }),
        });
        setSaved(true);
      }
    } catch {
      /* silent */
    }
    setSavePending(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-secondary">Contractor not found</p>
        <p className="text-sm text-muted mt-1">This profile may have been removed.</p>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const categories = (() => {
    try {
      return JSON.parse(profile.categories || "[]") as string[];
    } catch {
      return [] as string[];
    }
  })();

  const quals: Qualification[] = (() => {
    try {
      return JSON.parse(profile.qualifications || "[]");
    } catch {
      return [];
    }
  })();

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const contractorTypeDef = CONTRACTOR_TYPES.find(
    (t) => t.value === (profile.contractor_type || "independent")
  );
  const platformTier = getPlatformTier(completedJobs);
  const isOwnProfile = user?.id === id;
  const canSave = user && user.role === "consumer" && !isOwnProfile;

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const firstName = profile.name.split(" ")[0];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── 1. Hero card ───────────────────────────────────────────────────── */}
        <ScrollReveal>
        <div className="bg-white shadow-sm rounded-2xl border border-border p-6 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                {profile.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Name + save button row */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-secondary leading-tight">
                    {profile.name}
                  </h1>
                  {profile.headline && (
                    <p className="text-sm font-medium text-primary mt-0.5">{profile.headline}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4 shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {profile.location}
                      </span>
                    )}
                    <span>Member since {memberSince}</span>
                  </div>
                </div>
                {canSave && (
                  <button
                    onClick={toggleSave}
                    disabled={savePending}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                      saved
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "border-border text-muted hover:border-primary/40 hover:text-secondary"
                    }`}
                  >
                    {saved ? "♥ Saved" : "♡ Save Pro"}
                  </button>
                )}
              </div>

              {/* Trust badge pills */}
              <div className="flex flex-wrap gap-2 mt-3">
                {contractorTypeDef && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${contractorTypeDef.badgeClass}`}
                  >
                    {contractorTypeDef.icon} {contractorTypeDef.badge}
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${platformTier.badgeClass}`}
                >
                  {platformTier.icon} {platformTier.label}
                </span>
                {profile.verification_status === "approved" && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    ✓ ID Verified
                  </span>
                )}
                {profile.insurance_status === "approved" && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🛡️ Insured
                  </span>
                )}
                {quals.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    🏆 {quals.length} Qualification{quals.length !== 1 ? "s" : ""}
                  </span>
                )}
                {profile.background_check_status === "approved" && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                    🛡️ Background Check Passed
                  </span>
                )}
                {profile.rating >= 4.8 && profile.rating_count >= 3 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    ⭐ Top Rated
                  </span>
                )}
                {completedJobs >= 50 && (
                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    🏆 Elite Pro
                  </span>
                )}
              </div>

              {/* Stat row */}
              <div className="flex flex-wrap items-center gap-1 mt-3 text-sm text-muted">
                {profile.rating > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span className="font-semibold text-secondary">
                      {profile.rating.toFixed(1)}
                    </span>
                  </span>
                ) : (
                  <span className="italic">No rating yet</span>
                )}
                <span className="text-gray-300 mx-1">|</span>
                <span>
                  <span className="font-semibold text-secondary">{profile.rating_count}</span>{" "}
                  review{profile.rating_count !== 1 ? "s" : ""}
                </span>
                <span className="text-gray-300 mx-1">|</span>
                <span>
                  <span className="font-semibold text-secondary">{completedJobs}</span> jobs
                  completed
                </span>
                <span className="text-gray-300 mx-1">|</span>
                <span>
                  <span className="font-semibold text-secondary">
                    {profile.years_experience ?? 0}
                  </span>{" "}
                  yr{profile.years_experience !== 1 ? "s" : ""} experience
                </span>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── 2. About ───────────────────────────────────────────────────────── */}
        {(profile.about_me || profile.bio) && (
          <ScrollReveal delay={100}>
          <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
            <h2 className="text-base font-bold text-secondary mb-3">About {firstName}</h2>
            <p className="text-secondary leading-relaxed">{profile.about_me || profile.bio}</p>
            {contractorTypeDef && contractorTypeDef.value !== "independent" && (
              <p className="text-sm text-muted mt-3 pt-3 border-t border-border">
                {contractorTypeDef.description}
              </p>
            )}
          </div>
          </ScrollReveal>
        )}

        {/* ── 3. Credentials & Verification ─────────────────────────────────── */}
        <ScrollReveal delay={150}>
        <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
          <h2 className="text-base font-bold text-secondary mb-4">Credentials &amp; Trust</h2>
          <div className="space-y-3">

            {/* Background Check / Identity */}
            <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                  profile.verification_status === "approved"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                🪪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary">Background Check / Identity</p>
              </div>
              {profile.verification_status === "approved" ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not submitted</span>
              )}
            </div>

            {/* Insurance */}
            <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                  profile.insurance_status === "approved"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                🛡️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary">Insurance</p>
              </div>
              {profile.insurance_status === "approved" ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not submitted</span>
              )}
            </div>

            {/* Licenses & Certs */}
            <div className="flex items-start gap-3 pt-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm shrink-0">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary mb-2">Licenses &amp; Certs</p>
                {quals.length === 0 ? (
                  <p className="text-xs text-gray-400">None on file</p>
                ) : (
                  <div className="space-y-2">
                    {quals.map((q, i) => {
                      const qt = QUALIFICATION_TYPES.find((t) => t.value === q.type);
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-base">{qt?.icon}</span>
                          <span className="font-medium text-secondary">{q.name}</span>
                          {q.issuer && (
                            <span className="text-muted text-xs">· {q.issuer}</span>
                          )}
                          {q.number && (
                            <span className="text-muted text-xs">· #{q.number}</span>
                          )}
                          <span className="text-emerald-500 text-xs ml-auto">✓</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>

        {/* ── Skills Assessment Scores ───────────────────────────────────── */}
        {quizScores.length > 0 && (
          <ScrollReveal delay={200}>
          <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
            <h2 className="text-base font-bold text-secondary mb-4">Skills Assessment</h2>
            <div className="flex flex-wrap gap-3">
              {quizScores.map((s) => (
                <div
                  key={s.category}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    s.percentage >= 90
                      ? "bg-emerald-50 border-emerald-200"
                      : s.percentage >= 80
                      ? "bg-blue-50 border-blue-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className="text-sm">🧠</span>
                  <span className="text-sm font-semibold text-secondary">
                    {QUIZ_CATEGORIES[s.category] ?? s.category}
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      s.percentage >= 90
                        ? "text-emerald-600"
                        : s.percentage >= 80
                        ? "text-blue-600"
                        : "text-slate-600"
                    }`}
                  >
                    {s.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          </ScrollReveal>
        )}

        {/* ── 3b. Certifications ─────────────────────────────────────────── */}
        {certifications.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-base font-bold text-secondary mb-4">Certifications</h2>
            <div className="space-y-3">
              {certifications.map((cert) => {
                const isExpired = cert.expiry_date && new Date(cert.expiry_date).getTime() < Date.now();
                return (
                  <div key={cert.id} className="flex items-center gap-3 py-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                      isExpired ? "bg-red-50 text-red-400" : "bg-purple-50 text-purple-600"
                    }`}>
                      {isExpired ? "\u26A0\uFE0F" : "\uD83D\uDCDC"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isExpired ? "text-gray-400 line-through" : "text-secondary"}`}>
                        {cert.name}
                      </p>
                      <p className="text-xs text-muted">
                        {cert.issuer && <span>{cert.issuer}</span>}
                        {cert.issue_date && <span> · Issued {cert.issue_date}</span>}
                        {cert.expiry_date && (
                          <span className={isExpired ? " text-red-500" : ""}>
                            {" "}· {isExpired ? "Expired" : "Expires"} {cert.expiry_date}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpired ? (
                        <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-medium">Expired</span>
                      ) : cert.verified ? (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">&#10003; Verified</span>
                      ) : (
                        <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full font-medium">Self-reported</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3c. Work History ────────────────────────────────────────────── */}
        {workHistory.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-base font-bold text-secondary mb-4">Work History</h2>
            <div className="space-y-3">
              {workHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
                    🏢
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-secondary">{entry.company_name}</p>
                    <p className="text-xs text-muted">
                      {entry.role && <span>{entry.role}</span>}
                      {entry.role && (entry.start_year || entry.end_year) && <span> · </span>}
                      {entry.start_year && <span>{entry.start_year}</span>}
                      {entry.start_year && entry.end_year && <span>–</span>}
                      {entry.end_year && <span>{entry.end_year}</span>}
                      {entry.start_year && !entry.end_year && <span>–Present</span>}
                    </p>
                  </div>
                  {entry.verified ? (
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">✓ Verified</span>
                  ) : (
                    <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full font-medium">Self-reported</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. Services ───────────────────────────────────────────────────── */}
        {categories.length > 0 && (
          <ScrollReveal delay={200}>
          <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
            <h2 className="text-base font-bold text-secondary mb-4">Services Offered</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const catInfo = CATEGORIES.find((c) => c.value === cat);
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center px-3 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-lg border border-primary/20"
                  >
                    {catInfo?.label || cat}
                  </span>
                );
              })}
            </div>
          </div>
          </ScrollReveal>
        )}

        {/* ── 5. Portfolio ──────────────────────────────────────────────────── */}
        <ScrollReveal delay={250}>
        <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
          <h2 className="text-base font-bold text-secondary mb-1">Work Portfolio</h2>
          <p className="text-sm text-muted mb-5">Before &amp; after photos from completed projects.</p>
          <PortfolioManager contractorId={id} editable={false} />

          {/* Portfolio photos (quick uploads) */}
          {portfolioPhotos.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-secondary mb-3">Additional Work Photos</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolioPhotos.map((photo, i) => {
                  const typeLabels: Record<string, string> = {
                    before_after: "Before & After",
                    completed_work: "Completed Work",
                    in_progress: "In Progress",
                    team_equipment: "Team / Equipment",
                  };
                  return (
                    <div key={i} className="group">
                      <div className="aspect-square rounded-xl overflow-hidden border border-border">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Work photo ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="mt-1.5">
                        {photo.caption && (
                          <p className="text-xs font-medium text-secondary truncate">{photo.caption}</p>
                        )}
                        {photo.project_type && (
                          <p className="text-[10px] text-muted">
                            {typeLabels[photo.project_type] || photo.project_type}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </ScrollReveal>

        {/* ── 6. Reviews ────────────────────────────────────────────────────── */}
        <ScrollReveal delay={300}>
        <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow duration-300">
          <h2 className="text-base font-bold text-secondary mb-4">
            Reviews{profile.rating_count > 0 ? ` (${profile.rating_count})` : ""}
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">⭐</p>
              <p className="text-base font-semibold text-secondary">No reviews yet</p>
              <p className="text-sm text-muted mt-1">
                Reviews appear after completing jobs on this platform.
              </p>
            </div>
          ) : (
            <>
              {/* Rating summary */}
              <div className="flex flex-col sm:flex-row gap-6 pb-6 mb-6 border-b border-border">
                <div className="flex flex-col items-center justify-center text-center shrink-0">
                  <p className="text-5xl font-extrabold text-secondary leading-none">
                    {profile.rating.toFixed(1)}
                  </p>
                  <div className="mt-1">
                    <StarRow rating={Math.round(profile.rating)} size="lg" />
                  </div>
                  <p className="text-sm text-muted mt-1">
                    {profile.rating_count} review{profile.rating_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex-1 space-y-2 flex flex-col justify-center">
                  {ratingDist.map(({ star, count }) => (
                    <RatingBar key={star} star={star} count={count} total={reviews.length} />
                  ))}
                </div>
              </div>

              {/* Review list */}
              <div className="space-y-5">
                {reviews.map((review) => {
                  const reviewPhotos = (() => {
                    try {
                      return JSON.parse(review.photos || "[]") as string[];
                    } catch {
                      return [] as string[];
                    }
                  })();
                  return (
                    <div
                      key={review.id}
                      className="pb-5 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {review.reviewer_first_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-secondary">
                              {review.reviewer_first_name}
                            </p>
                            <StarRow rating={review.rating} size="sm" />
                          </div>
                        </div>
                        <span className="text-xs text-muted shrink-0">
                          {new Date(review.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-secondary leading-relaxed ml-12">
                          {review.comment}
                        </p>
                      )}
                      {reviewPhotos.length > 0 && (
                        <div className="flex gap-2 mt-3 ml-12 flex-wrap">
                          {reviewPhotos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={url}
                                alt=""
                                className="w-16 h-16 object-cover rounded-lg hover:opacity-90 border border-border"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        </ScrollReveal>

      </div>
    </div>
  );
}

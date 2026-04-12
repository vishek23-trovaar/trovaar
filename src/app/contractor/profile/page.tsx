"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CONTRACTOR_TYPES, getPlatformTier, CATEGORIES } from "@/lib/constants";
import { ContractorType, Qualification } from "@/types";
import PhoneVerifyWidget from "@/components/auth/PhoneVerifyWidget";
import PortfolioManager from "@/components/portfolio/PortfolioManager";
import CredentialUploader from "@/components/portfolio/CredentialUploader";
import ScrollReveal from "@/components/ui/ScrollReveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractorProfileData {
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
  contractor_type: ContractorType;
  qualifications: string;
  headline: string | null;
  about_me: string | null;
  license_number: string | null;
  insurance_verified: number;
  background_check_status: string;
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
  avg_response_hours: number | null;
  total_bids: number;
  accepted_bids: number;
  acceptance_rate: number | null;
}

interface ReviewData {
  id: string;
  job_id: string;
  rating: number;
  comment: string | null;
  photos: string;
  created_at: string;
  reviewer_first_name: string;
}

interface EarningsJob {
  id: string;
  title: string;
  category: string;
  status: string;
  payment_status: string;
  platform_fee_cents: number | null;
  completed_at: string | null;
  bid_amount_cents: number;
}

interface EarningsData {
  totalEarnedCents: number;
  totalTipsCents: number;
  pendingCents: number;
  completedJobCount: number;
  recentJobs: EarningsJob[];
}

interface StripeStatus {
  connected: boolean;
  onboardingComplete: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "text-base" : "text-sm";
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
      <span className="text-amber-400">★</span>
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

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatResponseTime(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return "< 1 hr";
  if (hours < 24) return `${Math.round(hours)} hr${Math.round(hours) !== 1 ? "s" : ""}`;
  const days = Math.round(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractorPerformancePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"performance" | "portfolio" | "trust">("performance");
  const [portfolioSubTab, setPortfolioSubTab] = useState<"projects" | "credentials">("projects");

  const [profile, setProfile] = useState<ContractorProfileData | null>(null);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [contractorStats, setContractorStats] = useState<ContractorStats | null>(null);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);

  const [portfolioPhotoCount, setPortfolioPhotoCount] = useState(0);

  // Quiz scores
  const [quizScores, setQuizScores] = useState<{ category: string; best_percentage: number; best_score: number; total_questions: number; last_taken: string }[]>([]);

  const [profileLoading, setProfileLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(true);

  // Job Alert Preferences state
  const [alertCategories, setAlertCategories] = useState<string[]>([]);
  const [alertEmailEnabled, setAlertEmailEnabled] = useState(true);
  const [alertRadius, setAlertRadius] = useState(50);
  const [alertPrefsLoading, setAlertPrefsLoading] = useState(true);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  // Trust & Verification state
  interface CertificationData {
    id: string;
    contractor_id: string;
    name: string;
    issuer: string | null;
    issue_date: string | null;
    expiry_date: string | null;
    verified: number;
    document_url: string | null;
  }
  interface WorkHistoryData {
    id: string;
    contractor_id: string;
    company_name: string;
    role: string | null;
    start_year: number | null;
    end_year: number | null;
    verified: number;
  }

  const [certifications, setCertifications] = useState<CertificationData[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkHistoryData[]>([]);
  const [headline, setHeadline] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [trustSaving, setTrustSaving] = useState(false);
  const [trustSaved, setTrustSaved] = useState(false);

  // AI Profile Analysis
  interface AiProfileAnalysis {
    specialties: Array<{ category: string; level: string; years: number }>;
    strengths: string[];
    certifications_summary: string;
    experience_tier: "entry" | "mid" | "senior" | "master";
  }
  const [aiAnalysis, setAiAnalysis] = useState<AiProfileAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState("");

  // Identity Verification
  const [idVerifyLoading, setIdVerifyLoading] = useState(false);

  // Certification form
  const [newCertName, setNewCertName] = useState("");
  const [newCertIssuer, setNewCertIssuer] = useState("");
  const [newCertIssueDate, setNewCertIssueDate] = useState("");
  const [newCertExpiry, setNewCertExpiry] = useState("");
  const [certAdding, setCertAdding] = useState(false);

  // Trade License form
  const [licenseState, setLicenseState] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [licenseSubmitting, setLicenseSubmitting] = useState(false);
  const [licenseSubmitted, setLicenseSubmitted] = useState(false);
  const [licenseSubmissions, setLicenseSubmissions] = useState<{ id: string; name: string; issuer: string; verified: number; document_url: string | null; created_at: string }[]>([]);

  // Work history form
  const [newWorkCompany, setNewWorkCompany] = useState("");
  const [newWorkRole, setNewWorkRole] = useState("");
  const [newWorkStart, setNewWorkStart] = useState("");
  const [newWorkEnd, setNewWorkEnd] = useState("");
  const [workAdding, setWorkAdding] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "contractor")) {
      router.replace("/client/dashboard");
    }
  }, [user, authLoading, router]);

  // ── Data fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || user.role !== "contractor") return;

    async function fetchProfile() {
      if (!user) return;
      try {
        const [profileRes, statsRes, reviewsRes] = await Promise.all([
          fetch(`/api/contractors/${user.id}`),
          fetch(`/api/contractors/${user.id}/stats`),
          fetch(`/api/reviews/contractor/${user.id}`),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.profile);
          setCompletedJobs(data.completedJobs ?? 0);
          setCertifications(data.certifications ?? []);
          setWorkHistory(data.workHistory ?? []);
          setHeadline(data.profile?.headline ?? "");
          setAboutMe(data.profile?.about_me ?? "");
          setLicenseNumber(data.profile?.license_number ?? "");
          // Load existing AI profile analysis if available
          if (data.profile?.ai_profile_summary) {
            try {
              setAiAnalysis(JSON.parse(data.profile.ai_profile_summary));
            } catch { /* ignore parse errors */ }
          }
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setContractorStats(data.stats);
        }
        if (reviewsRes.ok) {
          const data = await reviewsRes.json();
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        }
      } catch (err) {
        console.error("Failed to fetch contractor profile:", err);
      } finally {
        setProfileLoading(false);
      }
    }

    async function fetchEarnings() {
      try {
        const res = await fetch("/api/earnings");
        if (res.ok) {
          const data = await res.json();
          setEarnings(data);
        }
      } catch (err) {
        console.error("Failed to fetch earnings:", err);
      } finally {
        setEarningsLoading(false);
      }
    }

    async function fetchStripe() {
      try {
        const res = await fetch("/api/stripe/connect");
        if (res.ok) {
          const data = await res.json();
          setStripeStatus(data);
        }
      } catch {
        /* silent */
      } finally {
        setStripeLoading(false);
      }
    }

    async function fetchAlertPrefs() {
      try {
        const res = await fetch("/api/job-alerts");
        if (res.ok) {
          const data = await res.json() as {
            preferences: { categories: string[]; email_alerts: boolean; radius_miles: number };
          };
          setAlertCategories(data.preferences.categories ?? []);
          setAlertEmailEnabled(data.preferences.email_alerts ?? true);
          setAlertRadius(data.preferences.radius_miles ?? 50);
        }
      } catch { /* silent */ } finally {
        setAlertPrefsLoading(false);
      }
    }

    async function fetchLicenseInfo() {
      try {
        const res = await fetch("/api/license");
        if (res.ok) {
          const data = await res.json();
          setLicenseSubmissions(data.submissions ?? []);
          if (data.license_number) setLicenseNumber(data.license_number);
          if (data.license_state) setLicenseState(data.license_state);
        }
      } catch { /* silent */ }
    }

    async function fetchPortfolioCount() {
      if (!user) return;
      try {
        // Count portfolio_items
        const itemsRes = await fetch(`/api/portfolio?contractorId=${user.id}`);
        let count = 0;
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          count += (data.items || []).length;
        }
        // Count portfolio_photos from contractor profile
        const photosRes = await fetch(`/api/contractors/${user.id}/portfolio`);
        if (photosRes.ok) {
          const data = await photosRes.json();
          count += (data.photos || []).length;
        }
        setPortfolioPhotoCount(count);
      } catch { /* silent */ }
    }

    async function fetchQuizScores() {
      if (!user) return;
      try {
        const res = await fetch(`/api/quiz/scores/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setQuizScores(data.scores ?? []);
        }
      } catch { /* silent */ }
    }

    fetchProfile();
    fetchEarnings();
    fetchStripe();
    fetchAlertPrefs();
    fetchLicenseInfo();
    fetchPortfolioCount();
    fetchQuizScores();
  }, [user]);

  async function saveAlertPrefs() {
    setAlertSaving(true);
    setAlertSaved(false);
    try {
      const res = await fetch("/api/job-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: alertCategories,
          email_alerts: alertEmailEnabled,
          radius_miles: alertRadius,
        }),
      });
      if (res.ok) {
        setAlertSaved(true);
        setTimeout(() => setAlertSaved(false), 2500);
      }
    } catch { /* silent */ } finally {
      setAlertSaving(false);
    }
  }

  async function saveTrustProfile() {
    if (!user) return;
    setTrustSaving(true);
    setTrustSaved(false);
    try {
      const res = await fetch(`/api/contractors/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          about_me: aboutMe,
          license_number: licenseNumber,
          years_experience: profile?.years_experience ?? 0,
        }),
      });
      if (res.ok) {
        setTrustSaved(true);
        setTimeout(() => setTrustSaved(false), 2500);
      }
    } catch { /* silent */ } finally {
      setTrustSaving(false);
    }
  }

  async function handleIdentityVerification() {
    setIdVerifyLoading(true);
    try {
      const res = await fetch("/api/stripe/identity", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      }
    } catch { /* silent */ } finally {
      setIdVerifyLoading(false);
    }
  }

  async function addCertification() {
    if (!user || !newCertName.trim()) return;
    setCertAdding(true);
    try {
      const res = await fetch(`/api/contractors/${user.id}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCertName.trim(),
          issuer: newCertIssuer.trim() || null,
          issue_date: newCertIssueDate || null,
          expiry_date: newCertExpiry || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCertifications((prev) => [data.certification, ...prev]);
        setNewCertName("");
        setNewCertIssuer("");
        setNewCertIssueDate("");
        setNewCertExpiry("");
      }
    } catch { /* silent */ } finally {
      setCertAdding(false);
    }
  }

  async function removeCertification(certId: string) {
    if (!user) return;
    try {
      await fetch(`/api/contractors/${user.id}/certifications?certId=${certId}`, { method: "DELETE" });
      setCertifications((prev) => prev.filter((c) => c.id !== certId));
    } catch { /* silent */ }
  }

  async function addWorkHistory() {
    if (!user || !newWorkCompany.trim()) return;
    setWorkAdding(true);
    try {
      const res = await fetch(`/api/contractors/${user.id}/work-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newWorkCompany.trim(),
          role: newWorkRole.trim() || null,
          start_year: newWorkStart ? parseInt(newWorkStart) : null,
          end_year: newWorkEnd ? parseInt(newWorkEnd) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkHistory((prev) => [data.entry, ...prev]);
        setNewWorkCompany("");
        setNewWorkRole("");
        setNewWorkStart("");
        setNewWorkEnd("");
      }
    } catch { /* silent */ } finally {
      setWorkAdding(false);
    }
  }

  async function removeWorkHistory(entryId: string) {
    if (!user) return;
    try {
      await fetch(`/api/contractors/${user.id}/work-history?entryId=${entryId}`, { method: "DELETE" });
      setWorkHistory((prev) => prev.filter((w) => w.id !== entryId));
    } catch { /* silent */ }
  }

  async function submitLicense() {
    if (!user || !licenseNumber.trim() || !licenseState || !licenseType) return;
    setLicenseSubmitting(true);
    setLicenseSubmitted(false);
    try {
      const res = await fetch("/api/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_number: licenseNumber.trim(),
          license_state: licenseState,
          license_type: licenseType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLicenseSubmitted(true);
        setLicenseSubmissions((prev) => [data.certification, ...prev]);
        setTimeout(() => setLicenseSubmitted(false), 3000);
      }
    } catch { /* silent */ } finally {
      setLicenseSubmitting(false);
    }
  }

  // Background check
  const [bgCheckRequesting, setBgCheckRequesting] = useState(false);
  const [bgCheckMessage, setBgCheckMessage] = useState("");

  async function requestBackgroundCheck() {
    setBgCheckRequesting(true);
    setBgCheckMessage("");
    try {
      const res = await fetch("/api/background-check", { method: "POST" });
      if (res.ok) {
        setBgCheckMessage("Background check requested successfully!");
        // Re-fetch profile to update status
        if (user) {
          const profileRes = await fetch(`/api/contractors/${user.id}`);
          if (profileRes.ok) {
            const data = await profileRes.json();
            setProfile(data.profile);
          }
        }
      } else {
        const data = await res.json();
        setBgCheckMessage(data.error || "Request failed");
      }
    } catch {
      setBgCheckMessage("Request failed");
    } finally {
      setBgCheckRequesting(false);
    }
  }

  // ── Auth loading ────────────────────────────────────────────────────────────
  if (authLoading || !user) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user.role !== "contractor") return null;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const quals: Qualification[] = (() => {
    try {
      return JSON.parse(profile?.qualifications || "[]");
    } catch {
      return [];
    }
  })();

  const categories: string[] = (() => {
    try {
      return JSON.parse(profile?.categories || "[]");
    } catch {
      return [] as string[];
    }
  })();

  const contractorTypeDef = CONTRACTOR_TYPES.find(
    (t) => t.value === (profile?.contractor_type || "independent")
  );
  const platformTier = getPlatformTier(completedJobs);

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: (Array.isArray(reviews) ? reviews : []).filter((r) => r.rating === star).length,
  }));

  const isSuspended = contractorStats?.is_suspended === 1;
  const hasStrikes = (contractorStats?.activeStrikes ?? 0) > 0;

  const completionRateColor =
    contractorStats?.completionRate == null
      ? "text-gray-400"
      : contractorStats.completionRate >= 90
      ? "text-emerald-600"
      : contractorStats.completionRate >= 70
      ? "text-amber-600"
      : "text-red-600";

  // Profile completeness checks
  const hasPhoto = !!(profile?.profile_photo);
  const hasBio = !!(profile?.bio && profile.bio.trim().length > 10);
  const hasServices = categories.length > 0;
  const isIdVerified = profile?.verification_status === "approved";
  const isInsured = profile?.insurance_status === "approved";
  const isStripeConnected = stripeStatus?.onboardingComplete === true;

  const completenessItems = [
    { label: "Profile photo uploaded", done: hasPhoto },
    { label: "Bio written", done: hasBio },
    { label: "Services selected", done: hasServices },
    { label: "ID Verified", done: isIdVerified },
    { label: "Insurance Verified", done: isInsured },
    { label: "Stripe connected", done: isStripeConnected },
  ];
  const completenessScore = completenessItems.filter((i) => i.done).length;
  const completenessPct = Math.round((completenessScore / completenessItems.length) * 100);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <Link
            href="/contractor/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-secondary transition-colors mb-3"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {profile?.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-secondary">My Performance</h1>
                <p className="text-sm text-muted">{user.name}</p>
              </div>
            </div>
            <Link
              href={`/profile/${user.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              View Public Profile →
            </Link>
          </div>
        </div>

        {/* ── Phone verification (compact) ───────────────────────────────── */}
        <div className="mb-4">
          <PhoneVerifyWidget compact />
        </div>

        {/* ── Account Health banner ────────────────────────────────────────── */}
        {contractorStats && (
          <div className="mb-6">
            {isSuspended ? (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="font-bold text-red-700">Account Suspended</p>
                  <p className="text-sm text-red-600 mt-0.5">
                    {contractorStats.suspended_until
                      ? `Suspended until ${new Date(contractorStats.suspended_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : "Your account is under review. Contact support for details."}
                  </p>
                </div>
              </div>
            ) : hasStrikes ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="font-bold text-amber-800">Active Warnings on Account</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    You have {contractorStats.activeStrikes} active strike
                    {contractorStats.activeStrikes !== 1 ? "s" : ""} in the last 60 days.
                    Strikes expire after 60 days of no further issues.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <span className="text-xl">✅</span>
                <p className="font-semibold text-emerald-800">Account in good standing</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tab navigation ──────────────────────────────────────────── */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "performance" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "portfolio" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab("trust")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "trust" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Trust &amp; Verification
          </button>
        </div>

        {/* ── Portfolio tab ────────────────────────────────────────────── */}
        {activeTab === "portfolio" && (
          <div className="space-y-4">
            {/* Sub-tabs: Projects / Credentials */}
            <div className="flex gap-1 bg-surface rounded-xl p-1">
              <button
                onClick={() => setPortfolioSubTab("projects")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  portfolioSubTab === "projects" ? "bg-white text-secondary shadow-sm" : "text-muted hover:text-secondary"
                }`}
              >
                Projects
              </button>
              <button
                onClick={() => setPortfolioSubTab("credentials")}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  portfolioSubTab === "credentials" ? "bg-white text-secondary shadow-sm" : "text-muted hover:text-secondary"
                }`}
              >
                Licenses &amp; Credentials
              </button>
            </div>

            {portfolioSubTab === "projects" && (
              <>
                {/* Portfolio photo requirement warning */}
                {portfolioPhotoCount < 3 && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <span className="text-xl shrink-0">&#9888;&#65039;</span>
                    <div>
                      <p className="font-bold text-amber-800">You need at least 3 work photos to start bidding on jobs</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Upload photos of your completed projects to build credibility with homeowners.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 max-w-[200px] h-2 bg-amber-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${Math.min((portfolioPhotoCount / 3) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-amber-800">
                          {portfolioPhotoCount}/3 photos uploaded
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {portfolioPhotoCount >= 3 && (
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <span className="text-xl">&#9989;</span>
                    <p className="font-semibold text-emerald-800">
                      {portfolioPhotoCount} portfolio photos uploaded &mdash; you&apos;re ready to bid!
                    </p>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-border p-6">
                  <PortfolioManager contractorId={user.id} editable={true} />
                </div>
              </>
            )}

            {portfolioSubTab === "credentials" && (
              <div className="bg-white rounded-2xl border border-border p-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-secondary">Licenses &amp; Certifications</h3>
                  <p className="text-xs text-muted mt-1">
                    Upload your professional license or certification. Our AI will automatically extract and verify the details.
                  </p>
                </div>
                <CredentialUploader contractorId={user.id} editable={true} />
              </div>
            )}
          </div>
        )}

        {/* ── Trust & Verification tab ──────────────────────────────────── */}
        {activeTab === "trust" && (
          <div className="space-y-6">

            {/* Trust Badges Display */}
            <ScrollReveal delay={0}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-4">Your Trust Badges</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Identity Verified */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  profile?.verification_status === "approved"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-xs font-semibold text-secondary">Identity Verified</p>
                  {profile?.verification_status === "approved"
                    ? <p className="text-[10px] text-blue-600 font-medium mt-1">Earned</p>
                    : <p className="text-[10px] text-gray-400 mt-1">Not yet</p>
                  }
                </div>
                {/* Background Check */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  (profile as any)?.background_check_status === "approved"
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">🛡️</p>
                  <p className="text-xs font-semibold text-secondary">Background Check</p>
                  {(profile as any)?.background_check_status === "approved"
                    ? <p className="text-[10px] text-green-600 font-medium mt-1">Passed</p>
                    : <p className="text-[10px] text-gray-400 mt-1">Not yet</p>
                  }
                </div>
                {/* Licensed & Insured */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  profile?.insurance_status === "approved"
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">📋</p>
                  <p className="text-xs font-semibold text-secondary">Licensed &amp; Insured</p>
                  {profile?.insurance_status === "approved"
                    ? <p className="text-[10px] text-emerald-600 font-medium mt-1">Verified</p>
                    : <p className="text-[10px] text-gray-400 mt-1">Not yet</p>
                  }
                </div>
                {/* Top Rated */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  profile && profile.rating >= 4.8
                    ? "bg-amber-50 border-amber-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">⭐</p>
                  <p className="text-xs font-semibold text-secondary">Top Rated</p>
                  {profile && profile.rating >= 4.8
                    ? <p className="text-[10px] text-amber-600 font-medium mt-1">4.8+ rating</p>
                    : <p className="text-[10px] text-gray-400 mt-1">Need 4.8+ rating</p>
                  }
                </div>
                {/* Elite Pro */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  completedJobs >= 50
                    ? "bg-purple-50 border-purple-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">🏆</p>
                  <p className="text-xs font-semibold text-secondary">Elite Pro</p>
                  {completedJobs >= 50
                    ? <p className="text-[10px] text-purple-600 font-medium mt-1">50+ jobs completed</p>
                    : <p className="text-[10px] text-gray-400 mt-1">{completedJobs}/50 jobs</p>
                  }
                </div>
                {/* Fast Responder */}
                <div className={`rounded-2xl p-4 text-center border hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
                  contractorStats?.avg_response_hours != null && contractorStats.avg_response_hours < 2
                    ? "bg-sky-50 border-sky-200"
                    : "bg-gray-50 border-gray-200 opacity-50"
                }`}>
                  <p className="text-2xl mb-1">⏰</p>
                  <p className="text-xs font-semibold text-secondary">Fast Responder</p>
                  {contractorStats?.avg_response_hours != null && contractorStats.avg_response_hours < 2
                    ? <p className="text-[10px] text-sky-600 font-medium mt-1">Avg &lt; 2hrs</p>
                    : <p className="text-[10px] text-gray-400 mt-1">Need avg &lt; 2hrs</p>
                  }
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Background Check */}
            <ScrollReveal delay={100}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-4">Background Check</h2>

              {profile?.background_check_status === "approved" ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-2xl">&#9989;</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">Background Check Passed</p>
                    <p className="text-xs text-emerald-600">Your background check has been verified. Consumers can see your badge.</p>
                  </div>
                </div>
              ) : profile?.background_check_status === "pending" ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-2xl">&#9203;</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Background check in progress...</p>
                    <p className="text-xs text-amber-600">Your request is being reviewed. You will be notified when it is complete.</p>
                  </div>
                </div>
              ) : profile?.background_check_status === "rejected" ? (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <span className="text-2xl">&#10060;</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700">Not passed</p>
                    <p className="text-xs text-red-600">
                      Your background check was not approved.{" "}
                      <a href="/help" className="underline hover:text-red-800">Contact support</a> for more information.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted mb-3">
                    A background check helps build trust with consumers. Passing a background check adds a verified badge to your profile and can help you win more jobs.
                  </p>
                  {bgCheckMessage && (
                    <div className="mb-3 bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">{bgCheckMessage}</div>
                  )}
                  <button
                    onClick={requestBackgroundCheck}
                    disabled={bgCheckRequesting}
                    className="px-5 py-2.5 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {bgCheckRequesting ? "Requesting..." : "Request Background Check"}
                  </button>
                </div>
              )}
            </div>
            </ScrollReveal>

            {/* Identity Verification */}
            <ScrollReveal delay={200}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-4">Identity Verification</h2>

              {profile?.verification_status === "approved" ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-2xl">&#9989;</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">ID Verified</p>
                    <p className="text-xs text-emerald-600">Your identity has been confirmed. Consumers can see your verified badge.</p>
                  </div>
                </div>
              ) : profile?.verification_status === "pending" ? (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <span className="text-2xl">&#9203;</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">Verification in progress</p>
                    <p className="text-xs text-amber-600">We&apos;re reviewing your documents. This usually takes a few minutes.</p>
                  </div>
                </div>
              ) : (
                <div>
                  {profile?.verification_status === "rejected" && (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                      <span className="text-2xl">&#10060;</span>
                      <div>
                        <p className="text-sm font-semibold text-red-700">Verification failed</p>
                        <p className="text-xs text-red-600">Your previous verification attempt could not be completed. Please try again.</p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-muted mb-4">
                    Verify your identity with a government ID and selfie. Verified contractors appear higher in search results and earn more trust from consumers.
                  </p>
                  <button
                    onClick={handleIdentityVerification}
                    disabled={idVerifyLoading}
                    className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {idVerifyLoading ? "Starting..." : "Get Verified →"}
                  </button>
                </div>
              )}
            </div>
            </ScrollReveal>

            {/* Professional Summary */}
            <ScrollReveal delay={300}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-4">Professional Summary</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Specialty / Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder='e.g., "Licensed Master Plumber — 15 Years"'
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    maxLength={120}
                  />
                  <p className="text-[10px] text-muted mt-1">{headline.length}/120 characters</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={profile?.years_experience ?? 0}
                    onChange={(e) => {
                      if (profile) {
                        setProfile({ ...profile, years_experience: parseInt(e.target.value) || 0 });
                      }
                    }}
                    min={0}
                    max={60}
                    className="w-24 px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">About Me</label>
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
                    placeholder="Tell clients about your background, approach, and what sets you apart..."
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    maxLength={500}
                  />
                  <p className="text-[10px] text-muted mt-1">{aboutMe.length}/500 characters</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">License Number (optional)</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g., CFC1234567"
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={saveTrustProfile}
                  disabled={trustSaving}
                  className={`px-6 py-2 text-sm font-semibold rounded-xl transition-colors ${
                    trustSaved
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {trustSaving ? "Saving..." : trustSaved ? "Saved!" : "Save Summary"}
                </button>
              </div>
            </div>
            </ScrollReveal>

            {/* Trade License Submission */}
            <ScrollReveal delay={400}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-1">Trade License</h2>
              <p className="text-xs text-muted mb-4">Submit your trade license for verification. Verified licenses appear on your public profile.</p>

              {/* Existing license submissions */}
              {licenseSubmissions.length > 0 && (
                <div className="space-y-3 mb-5">
                  {licenseSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        sub.verified ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
                          &#128203;
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-secondary truncate">{sub.name}</p>
                          <p className="text-xs text-muted">{sub.issuer}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {sub.verified ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Verified</span>
                        ) : (
                          <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* License submission form */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <p className="text-xs font-semibold text-muted mb-3">Submit a Trade License</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g., CFC1234567"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">State</label>
                    <select
                      value={licenseState}
                      onChange={(e) => setLicenseState(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select state...</option>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-muted mb-1">License Type</label>
                    <select
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select license type...</option>
                      {["Plumbing","Electrical","HVAC","General Contractor","Roofing","Painting","Landscaping","Carpentry","Masonry","Welding","Fire Protection","Low Voltage","Solar/PV","Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={submitLicense}
                  disabled={licenseSubmitting || !licenseNumber.trim() || !licenseState || !licenseType}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                    licenseSubmitted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {licenseSubmitting ? "Submitting..." : licenseSubmitted ? "Submitted for Review!" : "Submit License for Verification"}
                </button>
              </div>
            </div>
            </ScrollReveal>

            {/* Certifications */}
            <ScrollReveal delay={100}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-1">Certifications</h2>
              <p className="text-xs text-muted mb-4">Trade licenses, ASE certs, NATE certs, EPA certifications, and more.</p>

              {/* Expiry warnings */}
              {certifications.some((c) => {
                if (!c.expiry_date) return false;
                const daysUntil = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86_400_000);
                return daysUntil <= 60;
              }) && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
                  <span className="shrink-0 mt-0.5">&#9888;&#65039;</span>
                  <div>
                    <p className="font-semibold">Certifications expiring soon</p>
                    <ul className="mt-1 text-xs space-y-0.5">
                      {certifications.filter((c) => {
                        if (!c.expiry_date) return false;
                        const daysUntil = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86_400_000);
                        return daysUntil <= 60;
                      }).map((c) => {
                        const daysUntil = Math.ceil((new Date(c.expiry_date!).getTime() - Date.now()) / 86_400_000);
                        return (
                          <li key={c.id}>
                            <span className="font-medium">{c.name}</span>
                            {daysUntil <= 0
                              ? <span className="text-red-600 font-semibold"> -- EXPIRED</span>
                              : <span> -- expires in {daysUntil} day{daysUntil !== 1 ? "s" : ""}</span>
                            }
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {certifications.length > 0 && (
                <div className="space-y-3 mb-6">
                  {certifications.map((cert) => {
                    const isExpired = cert.expiry_date && new Date(cert.expiry_date).getTime() < Date.now();
                    const daysUntilExpiry = cert.expiry_date
                      ? Math.ceil((new Date(cert.expiry_date).getTime() - Date.now()) / 86_400_000)
                      : null;
                    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 60;

                    return (
                      <div
                        key={cert.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isExpired
                            ? "bg-red-50 border-red-200"
                            : isExpiringSoon
                            ? "bg-amber-50 border-amber-200"
                            : "bg-gray-50 border-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-sm shrink-0">
                            &#128220;
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-secondary truncate">{cert.name}</p>
                            <p className="text-xs text-muted">
                              {cert.issuer && <span>{cert.issuer}</span>}
                              {cert.issue_date && <span> · Issued {cert.issue_date}</span>}
                              {cert.expiry_date && (
                                <span className={isExpired ? " text-red-600 font-semibold" : isExpiringSoon ? " text-amber-600 font-semibold" : ""}>
                                  {" "}· {isExpired ? "Expired" : "Expires"} {cert.expiry_date}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpired && (
                            <span className="text-xs bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">Expired</span>
                          )}
                          {!isExpired && cert.verified ? (
                            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Verified</span>
                          ) : !isExpired ? (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">Self-reported</span>
                          ) : null}
                          {cert.document_url && (
                            <a
                              href={cert.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                              title="View document"
                            >
                              &#128196;
                            </a>
                          )}
                          <button
                            onClick={() => removeCertification(cert.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                          >
                            &#10005;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add certification form */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <p className="text-xs font-semibold text-muted mb-3">Add Certification</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newCertName}
                    onChange={(e) => setNewCertName(e.target.value)}
                    placeholder='e.g., "EPA Section 608", "ASE A1"'
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={newCertIssuer}
                    onChange={(e) => setNewCertIssuer(e.target.value)}
                    placeholder="Issuing body (e.g., EPA, NATE, ASE)"
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">Issue Date</label>
                    <input
                      type="date"
                      value={newCertIssueDate}
                      onChange={(e) => setNewCertIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={newCertExpiry}
                      onChange={(e) => setNewCertExpiry(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
                <button
                  onClick={addCertification}
                  disabled={certAdding || !newCertName.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {certAdding ? "Adding..." : "+ Add Certification"}
                </button>
              </div>
            </div>
            </ScrollReveal>

            {/* Work History */}
            <ScrollReveal delay={200}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-1">Work History</h2>
              <p className="text-xs text-muted mb-4">Show clients your professional background and corporate-level training.</p>
              {workHistory.length > 0 && (
                <div className="space-y-3 mb-6">
                  {workHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm shrink-0">
                          🏢
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-secondary truncate">{entry.company_name}</p>
                          <p className="text-xs text-muted">
                            {entry.role && <span>{entry.role}</span>}
                            {entry.role && (entry.start_year || entry.end_year) && <span> · </span>}
                            {entry.start_year && <span>{entry.start_year}</span>}
                            {entry.start_year && entry.end_year && <span>–</span>}
                            {entry.end_year && <span>{entry.end_year}</span>}
                            {entry.start_year && !entry.end_year && <span>–Present</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.verified ? (
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Verified</span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Self-reported</span>
                        )}
                        <button
                          onClick={() => removeWorkHistory(entry.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add work history form */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50">
                <p className="text-xs font-semibold text-muted mb-3">Add Work History</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input
                    type="text"
                    value={newWorkCompany}
                    onChange={(e) => setNewWorkCompany(e.target.value)}
                    placeholder='Company name (e.g., "Roto-Rooter")'
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="text"
                    value={newWorkRole}
                    onChange={(e) => setNewWorkRole(e.target.value)}
                    placeholder='Role (e.g., "Senior Technician")'
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    value={newWorkStart}
                    onChange={(e) => setNewWorkStart(e.target.value)}
                    placeholder="Start year"
                    min={1970}
                    max={2030}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="number"
                    value={newWorkEnd}
                    onChange={(e) => setNewWorkEnd(e.target.value)}
                    placeholder="End year (blank = present)"
                    min={1970}
                    max={2030}
                    className="px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <button
                  onClick={addWorkHistory}
                  disabled={workAdding || !newWorkCompany.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {workAdding ? "Adding..." : "+ Add Work History"}
                </button>
              </div>
            </div>
            </ScrollReveal>

            {/* Completed Jobs (portfolio showcase with ratings) */}
            <ScrollReveal delay={300}>
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-base font-bold text-secondary mb-1">Completed Jobs</h2>
              <p className="text-xs text-muted mb-4">Jobs completed on the Trovaar platform with client ratings.</p>
              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🔧</p>
                  <p className="font-semibold text-secondary">No completed jobs with reviews yet</p>
                  <p className="text-sm text-muted mt-1">Complete jobs to build your portfolio.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center text-sm shrink-0">
                        ⭐
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StarRow rating={review.rating} size="sm" />
                          <span className="text-xs text-muted">
                            by {review.reviewer_first_name} · {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-secondary leading-relaxed">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </ScrollReveal>
          </div>
        )}

        <div className={activeTab === "portfolio" || activeTab === "trust" ? "hidden" : ""}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* AI Profile Analysis */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-secondary flex items-center gap-2">
                  <span>🤖</span> AI Profile Analysis
                </h2>
                <button
                  onClick={async () => {
                    if (!user) return;
                    setAiAnalysisLoading(true);
                    setAiAnalysisError("");
                    try {
                      const res = await fetch("/api/ai/analyze-profile", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contractorId: user.id }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setAiAnalysis(data.analysis);
                      } else {
                        const data = await res.json();
                        setAiAnalysisError(data.error || "Analysis failed");
                      }
                    } catch {
                      setAiAnalysisError("Failed to analyze profile");
                    } finally {
                      setAiAnalysisLoading(false);
                    }
                  }}
                  disabled={aiAnalysisLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {aiAnalysisLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      {aiAnalysis ? "Re-analyze" : "Analyze My Profile"}
                    </>
                  )}
                </button>
              </div>

              {aiAnalysisError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg mb-3">{aiAnalysisError}</div>
              )}

              {aiAnalysis ? (
                <div className="space-y-4">
                  {/* Experience Tier */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted uppercase tracking-wide">Experience Tier:</span>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      aiAnalysis.experience_tier === "master" ? "bg-purple-100 text-purple-700" :
                      aiAnalysis.experience_tier === "senior" ? "bg-blue-100 text-blue-700" :
                      aiAnalysis.experience_tier === "mid" ? "bg-emerald-100 text-emerald-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {aiAnalysis.experience_tier.charAt(0).toUpperCase() + aiAnalysis.experience_tier.slice(1)}
                    </span>
                  </div>

                  {/* Specialties */}
                  {aiAnalysis.specialties.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Specialties</p>
                      <div className="space-y-1.5">
                        {aiAnalysis.specialties.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                            <span className="text-sm font-medium text-secondary flex-1">{s.category}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.level === "expert" ? "bg-emerald-100 text-emerald-700" :
                              s.level === "intermediate" ? "bg-blue-100 text-blue-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>
                              {s.level}
                            </span>
                            {s.years > 0 && (
                              <span className="text-xs text-muted">{s.years} yrs</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {aiAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Key Strengths</p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.strengths.map((s, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-white px-2.5 py-1.5 rounded-full border border-emerald-200 text-emerald-700 font-medium">
                            <span>✓</span> {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications Summary */}
                  {aiAnalysis.certifications_summary && (
                    <div>
                      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">Certifications</p>
                      <p className="text-sm text-secondary bg-white rounded-lg px-3 py-2 border border-blue-100">
                        {aiAnalysis.certifications_summary}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Click &ldquo;Analyze My Profile&rdquo; to get AI-powered insights about your professional strengths and how you appear to homeowners.
                </p>
              )}
            </div>

            {/* Performance Stats */}
            {profileLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div>
                <h2 className="text-base font-bold text-secondary mb-3">Performance Stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Rating */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-2xl mb-1">⭐</p>
                    <p className="text-xl font-bold text-secondary">
                      {profile && profile.rating > 0 ? profile.rating.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {profile && profile.rating > 0 ? "/ 5.0" : "No ratings"}
                    </p>
                    <p className="text-xs font-medium text-muted mt-1">Rating</p>
                  </div>

                  {/* Jobs Completed */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-xl font-bold text-secondary">
                      {contractorStats?.completion_count ?? completedJobs}
                    </p>
                    <p className="text-xs font-medium text-muted mt-1">Jobs Completed</p>
                  </div>

                  {/* Completion Rate */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-2xl mb-1">📊</p>
                    <p className={`text-xl font-bold ${completionRateColor}`}>
                      {contractorStats?.completionRate != null
                        ? `${contractorStats.completionRate}%`
                        : "—"}
                    </p>
                    <p className="text-xs font-medium text-muted mt-1">Completion Rate</p>
                  </div>

                  {/* Response Time */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                    <p className="text-2xl mb-1">⚡</p>
                    <p className="text-xl font-bold text-secondary">
                      {formatResponseTime(contractorStats?.avg_response_hours ?? null)}
                    </p>
                    <p className="text-xs font-medium text-muted mt-1">Response Time</p>
                  </div>
                </div>

                {/* Platform tier badge */}
                {contractorTypeDef && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${contractorTypeDef.badgeClass}`}
                    >
                      {contractorTypeDef.icon} {contractorTypeDef.badge}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${platformTier.badgeClass}`}
                    >
                      {platformTier.icon} {platformTier.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Earnings Overview */}
            <div>
              <h2 className="text-base font-bold text-secondary mb-3">Earnings Overview</h2>
              {earningsLoading ? (
                <div className="bg-white rounded-2xl border border-border p-8 flex justify-center">
                  <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !earnings ? (
                <div className="bg-white rounded-2xl border border-border p-8 text-center">
                  <p className="text-4xl mb-3">💸</p>
                  <p className="font-semibold text-secondary">No earnings data</p>
                  <p className="text-sm text-muted mt-1">Could not load earnings at this time.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Earnings summary cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl border border-border p-4 text-center">
                      <p className="text-xs font-medium text-muted mb-1">Total Earned</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatDollars(earnings.totalEarnedCents)}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-border p-4 text-center">
                      <p className="text-xs font-medium text-muted mb-1">Pending Payout</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatDollars(earnings.pendingCents)}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-border p-4 text-center">
                      <p className="text-xs font-medium text-muted mb-1">Tips Received</p>
                      <p className="text-xl font-bold text-secondary">
                        {formatDollars(earnings.totalTipsCents)}
                      </p>
                    </div>
                  </div>

                  {/* Recent jobs table */}
                  <div className="bg-white rounded-2xl border border-border overflow-hidden">
                    <div className="px-5 py-4 border-b border-border">
                      <h3 className="text-sm font-bold text-secondary">Recent Jobs</h3>
                    </div>
                    {earnings.recentJobs.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-3xl mb-2">🔧</p>
                        <p className="text-sm font-semibold text-secondary">
                          Complete your first job to see earnings
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {earnings.recentJobs.map((job) => {
                          const net = job.bid_amount_cents - (job.platform_fee_cents ?? 0);
                          return (
                            <div
                              key={job.id}
                              className="flex items-center justify-between px-5 py-3 gap-4"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-secondary truncate">
                                  {job.title}
                                </p>
                                <p className="text-xs text-muted">
                                  {job.completed_at
                                    ? new Date(job.completed_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-emerald-600">
                                  {formatDollars(net)}
                                </p>
                                <p
                                  className={`text-xs capitalize ${
                                    job.payment_status === "paid"
                                      ? "text-emerald-600"
                                      : "text-amber-600"
                                  }`}
                                >
                                  {job.payment_status || "pending"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reviews Received */}
            <div>
              <h2 className="text-base font-bold text-secondary mb-3">
                Reviews Received
                {reviews.length > 0 ? ` (${reviews.length})` : ""}
              </h2>
              <div className="bg-white rounded-2xl border border-border p-6">
                {profileLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">⭐</p>
                    <p className="font-semibold text-secondary">No reviews yet</p>
                    <p className="text-sm text-muted mt-1">
                      Complete jobs to start collecting reviews.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Distribution bars */}
                    <div className="space-y-2 mb-6 pb-6 border-b border-border">
                      {ratingDist.map(({ star, count }) => (
                        <RatingBar key={star} star={star} count={count} total={reviews.length} />
                      ))}
                    </div>

                    {/* Review cards */}
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="pb-4 border-b border-border last:border-0 last:pb-0"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
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
                            <p className="text-sm text-secondary leading-relaxed ml-11">
                              {review.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="lg:w-72 xl:w-80 shrink-0">
            <div className="sticky top-6 space-y-4">

              {/* Profile Completeness */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-secondary mb-1">Profile Completeness</h3>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        completenessPct === 100
                          ? "bg-emerald-500"
                          : completenessPct >= 60
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${completenessPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-secondary shrink-0">
                    {completenessPct}%
                  </span>
                </div>
                <ul className="space-y-2">
                  {completenessItems.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-sm">
                      {item.done ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0">
                          ✓
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs shrink-0">
                          ✗
                        </span>
                      )}
                      <span className={item.done ? "text-secondary" : "text-muted"}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 space-y-2">
                  <Link
                    href="/contractor/dashboard"
                    className="block w-full text-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Edit Profile
                  </Link>
                  {!stripeLoading && !isStripeConnected && (
                    <Link
                      href="/contractor/dashboard"
                      className="block w-full text-center px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                      Set Up Payouts
                    </Link>
                  )}
                </div>
              </div>

              {/* Bid Performance */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-secondary mb-4">Bid Performance</h3>
                {profileLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Total bids placed</span>
                      <span className="text-sm font-semibold text-secondary">
                        {contractorStats?.total_bids ?? 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Acceptance rate</span>
                      <span className="text-sm font-semibold text-secondary">
                        {contractorStats?.acceptance_rate != null
                          ? `${Math.round(contractorStats.acceptance_rate)}%`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted">Won jobs</span>
                      <span className="text-sm font-semibold text-secondary">
                        {contractorStats?.accepted_bids ?? 0}
                      </span>
                    </div>
                    {contractorStats?.acceptance_rate != null && (
                      <div className="pt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, contractorStats.acceptance_rate)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Number */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-secondary mb-3">Account Number</h3>
                {user.account_number ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-lg text-secondary tracking-wide">
                      {user.account_number}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠ Add your phone number in the Personal Info section to activate your account number.
                  </p>
                )}
                <p className="text-xs text-muted mt-2">
                  Your unique ID on the Trovaar platform
                </p>
              </div>

              {/* Job Alert Preferences */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-secondary mb-4">Job Alert Preferences</h3>
                {alertPrefsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin w-5 h-5 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Category checkboxes */}
                    <div>
                      <p className="text-xs font-semibold text-muted mb-2">Alert me for these categories</p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {CATEGORIES.map((cat) => (
                          <label key={cat.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={alertCategories.includes(cat.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAlertCategories((prev) => [...prev, cat.value]);
                                } else {
                                  setAlertCategories((prev) => prev.filter((c) => c !== cat.value));
                                }
                              }}
                              className="w-3.5 h-3.5 accent-emerald-600"
                            />
                            <span className="text-xs text-secondary group-hover:text-primary transition-colors">
                              {cat.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Email alerts toggle */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">Email alerts</span>
                      <button
                        type="button"
                        onClick={() => setAlertEmailEnabled((v) => !v)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          alertEmailEnabled ? "bg-emerald-500" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            alertEmailEnabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Radius selector */}
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1">Alert radius</label>
                      <select
                        value={alertRadius}
                        onChange={(e) => setAlertRadius(Number(e.target.value))}
                        className="w-full text-xs border border-border rounded-lg px-2 py-1.5 text-secondary bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value={10}>10 miles</option>
                        <option value={25}>25 miles</option>
                        <option value={50}>50 miles</option>
                        <option value={100}>100 miles</option>
                      </select>
                    </div>

                    {/* Save button */}
                    <button
                      onClick={saveAlertPrefs}
                      disabled={alertSaving}
                      className={`w-full py-2 text-sm font-semibold rounded-xl transition-colors ${
                        alertSaved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {alertSaving ? "Saving..." : alertSaved ? "Saved!" : "Save Preferences"}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-border p-5">
                <h3 className="text-sm font-bold text-secondary mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link
                    href={`/profile/${user.id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>👤</span> View Public Profile
                  </Link>
                  <Link
                    href="/contractor/dashboard"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>📋</span> Job Feed
                  </Link>
                  <Link
                    href="/contractor/profile"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <span>✏️</span> My Performance
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>{/* end performance tab wrapper */}
      </div>
    </div>
  );
}

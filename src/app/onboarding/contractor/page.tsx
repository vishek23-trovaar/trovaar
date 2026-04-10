"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CATEGORIES, CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";
import { ContractorType } from "@/types";

type Step = 1 | 2 | 3 | 4;

export default function ContractorOnboarding() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Basic Profile
  const [name, setName] = useState(user?.name || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState(0);
  const [profilePhoto, setProfilePhoto] = useState<string[]>([]);
  const [contractorType, setContractorType] = useState<ContractorType>("independent");

  // Step 1 — Optional License
  const [hasLicense, setHasLicense] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("");
  const [licenseType, setLicenseType] = useState("");

  // Step 1 — Portfolio Photos
  const [portfolioUrls, setPortfolioUrls] = useState<{ url: string; caption: string; project_type: string }[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoCaption, setNewPhotoCaption] = useState("");
  const [newPhotoType, setNewPhotoType] = useState("completed_work");

  // Step 2 — Services
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 3 — Stripe (optional)
  const [stripeLoading, setStripeLoading] = useState(false);
  const [acceptedPlatformRules, setAcceptedPlatformRules] = useState(false);
  const [requestBgCheck, setRequestBgCheck] = useState(false);

  // Step 4 — Identity Verification (optional)
  const [idVerifyLoading, setIdVerifyLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "contractor")) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  function toggleCategory(value: string) {
    setSelectedCategories((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  }

  async function saveProfileAndAdvance() {
    if (!name.trim() || !location.trim()) {
      setError("Name and location are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Update user name + location
      await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, location }),
      });

      // Update contractor profile
      await fetch(`/api/contractors/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          yearsExperience: years,
          profilePhoto: profilePhoto[0] || null,
          contractorType,
          categories: selectedCategories,
        }),
      });

      // If contractor opted in for background check, fire the request
      if (requestBgCheck) {
        try {
          await fetch("/api/background-check", { method: "POST" });
        } catch { /* non-blocking — they can request it later */ }
      }

      // Save portfolio photos if any were added
      if (portfolioUrls.length > 0 && user?.id) {
        for (const photo of portfolioUrls) {
          try {
            await fetch(`/api/contractors/${user.id}/portfolio`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                photo_url: photo.url,
                caption: photo.caption || undefined,
                project_type: photo.project_type || undefined,
              }),
            });
          } catch { /* non-blocking */ }
        }
      }

      // If contractor has a trade license, submit it for verification
      if (hasLicense && licenseNumber.trim() && licenseState && licenseType) {
        try {
          await fetch("/api/license", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              license_number: licenseNumber.trim(),
              license_state: licenseState,
              license_type: licenseType,
            }),
          });
        } catch { /* non-blocking — they can add it later */ }
      }

      await refreshUser?.();
      setStep(2);
    } catch {
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveServicesAndAdvance() {
    if (selectedCategories.length === 0) {
      setError("Select at least one service category.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await fetch(`/api/contractors/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selectedCategories }),
      });
      setStep(3);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStripeConnect() {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      }
    } catch { /* silent */ } finally {
      setStripeLoading(false);
    }
  }

  function skipStripeAndContinue() {
    setStep(4);
  }

  async function fetchVerificationStatus() {
    try {
      const res = await fetch("/api/stripe/identity");
      if (res.ok) {
        const data = await res.json();
        setVerificationStatus(data.verification_status || "none");
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (step === 4 && user) {
      fetchVerificationStatus();
    }
  }, [step, user]);

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

  function skipVerification() {
    router.push("/contractor/dashboard");
  }

  if (authLoading || !user || user.role !== "contractor") {
    return (
      <div className="flex justify-center pt-32">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const STEP_LABELS = ["Profile", "Services", "Payments", "Verify ID"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-start justify-center pt-12 px-4 pb-20">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as Step;
            const isActive = step === s;
            const isDone = step > s;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`h-0.5 w-8 ${isDone ? "bg-primary" : "bg-border"}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isDone ? "bg-primary text-white" :
                    isActive ? "bg-primary text-white ring-4 ring-primary/20" :
                    "bg-surface-dark text-muted"
                  }`}>
                    {isDone ? "✓" : s}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-primary" : "text-muted"}`}>
                    {label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-secondary mb-1">Set up your profile</h1>
            <p className="text-muted text-sm mb-6">Help consumers find and trust you.</p>

            <div className="space-y-5">
              <div className="flex justify-center mb-4">
                <div className="w-24">
                  <ImageUploader
                    images={profilePhoto}
                    onImagesChange={(imgs) => setProfilePhoto(imgs.slice(-1))}
                    maxImages={1}
                  />
                  <p className="text-xs text-center text-muted mt-1">Profile photo</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Location / Service Area</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
                  placeholder="e.g. Austin, TX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Contractor Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACTOR_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setContractorType(t.value as ContractorType)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        contractorType === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-medium text-secondary">{t.badge}</p>
                      <p className="text-xs text-muted mt-0.5">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Years of Experience</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={years}
                  onChange={(e) => setYears(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Bio <span className="text-muted font-normal">(optional)</span></label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder="Tell consumers a bit about yourself and your experience..."
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm"
                />
              </div>
            </div>

            {/* Platform Safety & Contact Policy */}
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">🔒</span>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Your Protection Policy</h3>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    All communication between you and clients <strong>must happen through the Trovaar platform</strong> — messaging, calling, and payment. This protects you legally and financially.
                  </p>
                </div>
              </div>
              <ul className="space-y-2 mb-4">
                {[
                  "📞 All calls are recorded and transcribed for dispute resolution",
                  "💬 Messages are monitored — contact info sharing is automatically removed",
                  "💳 All payments processed through escrow — you're always protected",
                  "🚫 Accepting off-platform work from clients you met here violates our Terms of Service",
                  "✅ If a client tries to take you off-platform, report it — we'll handle it",
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="shrink-0">{rule.split(" ")[0]}</span>
                    <span>{rule.split(" ").slice(1).join(" ")}</span>
                  </li>
                ))}
              </ul>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPlatformRules}
                  onChange={(e) => setAcceptedPlatformRules(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-amber-600"
                />
                <span className="text-sm font-medium text-amber-900">
                  I understand that all client communication must stay on-platform and I agree to these terms
                </span>
              </label>
            </div>

            {/* Optional Background Check */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl shrink-0">🔍</span>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Background Check <span className="text-xs font-normal text-blue-600">(optional)</span></h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    A background check adds a trust badge to your profile, helping you stand out and win more jobs. You can always request one later from your profile page.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requestBgCheck}
                  onChange={(e) => setRequestBgCheck(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-blue-600"
                />
                <span className="text-sm font-medium text-blue-900">
                  Yes, request a background check for my profile
                </span>
              </label>
            </div>

            {/* Portfolio Photos */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">&#128247;</span>
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Work Photos <span className="text-xs font-normal text-blue-600">(required to bid)</span></h3>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Upload at least 3 photos of your work to get started. Homeowners want to see the quality of your craftsmanship.
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min((portfolioUrls.length / 3) * 100, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold ${portfolioUrls.length >= 3 ? "text-emerald-700" : "text-blue-800"}`}>
                  {portfolioUrls.length >= 3 ? `${portfolioUrls.length}/3 ✓ Ready to bid!` : `${portfolioUrls.length}/3 photos`}
                </span>
              </div>

              {/* Photo grid */}
              {portfolioUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {portfolioUrls.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.caption || `Work photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setPortfolioUrls((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                      >
                        &#215;
                      </button>
                      {photo.caption && (
                        <p className="text-[10px] text-blue-700 mt-0.5 truncate">{photo.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add photo form */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-blue-800 mb-1">Photo URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="https://example.com/my-work-photo.jpg"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newPhotoUrl.trim()) {
                          setPortfolioUrls((prev) => [
                            ...prev,
                            { url: newPhotoUrl.trim(), caption: newPhotoCaption.trim(), project_type: newPhotoType },
                          ]);
                          setNewPhotoUrl("");
                          setNewPhotoCaption("");
                          setNewPhotoType("completed_work");
                        }
                      }}
                      disabled={!newPhotoUrl.trim()}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">Caption <span className="text-blue-500 font-normal">(optional)</span></label>
                    <input
                      type="text"
                      value={newPhotoCaption}
                      onChange={(e) => setNewPhotoCaption(e.target.value)}
                      placeholder="e.g. Kitchen remodel"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-800 mb-1">Project Type</label>
                    <select
                      value={newPhotoType}
                      onChange={(e) => setNewPhotoType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    >
                      <option value="before_after">Before &amp; After</option>
                      <option value="completed_work">Completed Work</option>
                      <option value="in_progress">In Progress</option>
                      <option value="team_equipment">Team / Equipment</option>
                    </select>
                  </div>
                </div>
              </div>

              {portfolioUrls.length === 0 && (
                <p className="text-xs text-blue-600 mt-3 text-center">
                  You can skip this and add photos later, but you won&apos;t be able to bid on jobs until you have at least 3 work photos.
                </p>
              )}
            </div>

            {/* Optional Trade License */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl shrink-0">&#128203;</span>
                <div>
                  <h3 className="font-semibold text-emerald-900 mb-1">Trade License <span className="text-xs font-normal text-emerald-600">(optional)</span></h3>
                  <p className="text-sm text-emerald-800 leading-relaxed">
                    If you hold a state-issued trade license, adding it earns a verified badge on your profile. You can always add this later.
                  </p>
                </div>
              </div>
              <label className="flex items-start gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={hasLicense}
                  onChange={(e) => setHasLicense(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-emerald-600"
                />
                <span className="text-sm font-medium text-emerald-900">
                  Yes, I have a trade license
                </span>
              </label>
              {hasLicense && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pl-7">
                  <div>
                    <label className="block text-xs font-medium text-emerald-800 mb-1">License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g., CFC1234567"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-800 mb-1">State</label>
                    <select
                      value={licenseState}
                      onChange={(e) => setLicenseState(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    >
                      <option value="">Select state...</option>
                      {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-emerald-800 mb-1">License Type</label>
                    <select
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    >
                      <option value="">Select license type...</option>
                      {["Plumbing","Electrical","HVAC","General Contractor","Roofing","Painting","Landscaping","Carpentry","Masonry","Welding","Fire Protection","Low Voltage","Solar/PV","Other"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && <div className="mt-4 bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

            {!acceptedPlatformRules && (
              <p className="text-xs text-amber-700 mt-3 text-center">
                Please read and accept the Platform Rules above to continue.
              </p>
            )}

            <Button
              onClick={saveProfileAndAdvance}
              loading={saving}
              disabled={!acceptedPlatformRules}
              className="w-full mt-4"
              size="lg"
            >
              Continue →
            </Button>
          </Card>
        )}

        {/* Step 2 — Services */}
        {step === 2 && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-secondary mb-1">What do you do?</h1>
            <p className="text-muted text-sm mb-6">Select all service categories that apply. You&apos;ll see more relevant jobs in your feed.</p>

            <div className="grid grid-cols-2 gap-2 mb-6 max-h-80 overflow-y-auto pr-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => toggleCategory(cat.value)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    selectedCategories.includes(cat.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="text-sm shrink-0">
                    {CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === cat.value))?.icon ?? "🔧"}
                  </span>
                  <span className="text-sm text-secondary">{cat.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-muted mb-4">{selectedCategories.length} selected</p>

            {error && <div className="mb-4 bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                ← Back
              </Button>
              <Button
                onClick={saveServicesAndAdvance}
                loading={saving}
                disabled={selectedCategories.length === 0}
                className="flex-1"
                size="lg"
              >
                Continue →
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3 — Stripe */}
        {step === 3 && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">💳</div>
              <h1 className="text-2xl font-bold text-secondary mb-2">Set up payouts</h1>
              <p className="text-muted text-sm">
                Connect Stripe to receive payments when jobs are completed. You keep <strong className="text-secondary">80%</strong> of every job.
              </p>
            </div>

            <div className="bg-surface rounded-xl p-4 space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div>
                  <p className="text-sm font-medium text-secondary">Secure payments</p>
                  <p className="text-xs text-muted">Consumer funds are held securely until you complete the job.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-medium text-secondary">Automatic transfers</p>
                  <p className="text-xs text-muted">Get paid within 2 business days of job completion.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-sm font-medium text-secondary">80/20 split</p>
                  <p className="text-xs text-muted">You receive 80% — 20% platform fee covers payment processing and support.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStripeConnect}
              loading={stripeLoading}
              className="w-full mb-3"
              size="lg"
            >
              Connect Stripe →
            </Button>
            <button
              onClick={skipStripeAndContinue}
              className="w-full text-sm text-muted hover:text-secondary transition-colors cursor-pointer py-2 underline-offset-2 hover:underline"
            >
              Skip for now — I&apos;ll set this up later
            </button>
          </Card>
        )}

        {/* Step 4 — Identity Verification */}
        {step === 4 && (
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">🪪</div>
              <h1 className="text-2xl font-bold text-secondary mb-2">Verify Your Identity</h1>
              <p className="text-muted text-sm">
                Government ID + selfie check. Takes 2 minutes. Verified contractors get more jobs.
              </p>
            </div>

            {verificationStatus === "approved" && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-center">
                <span className="text-3xl">&#9989;</span>
                <p className="text-sm font-semibold text-emerald-700 mt-2">Identity Verified</p>
                <p className="text-xs text-emerald-600 mt-1">Your identity has been confirmed.</p>
              </div>
            )}

            {verificationStatus === "pending" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
                <span className="text-3xl">&#9203;</span>
                <p className="text-sm font-semibold text-amber-700 mt-2">Verification in progress...</p>
                <p className="text-xs text-amber-600 mt-1">We&apos;re reviewing your documents. This usually takes a few minutes.</p>
              </div>
            )}

            {verificationStatus === "rejected" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
                <span className="text-3xl">&#10060;</span>
                <p className="text-sm font-semibold text-red-700 mt-2">Verification failed</p>
                <p className="text-xs text-red-600 mt-1">Please try again with a valid government ID.</p>
              </div>
            )}

            <div className="bg-surface rounded-xl p-4 space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">&#128196;</span>
                <div>
                  <p className="text-sm font-medium text-secondary">Government ID required</p>
                  <p className="text-xs text-muted">Driver&apos;s license, passport, or national ID card.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">&#129331;</span>
                <div>
                  <p className="text-sm font-medium text-secondary">Selfie match</p>
                  <p className="text-xs text-muted">A quick selfie to confirm the ID belongs to you.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">&#128170;</span>
                <div>
                  <p className="text-sm font-medium text-secondary">Boost your profile</p>
                  <p className="text-xs text-muted">Verified contractors appear higher in search and earn consumer trust.</p>
                </div>
              </div>
            </div>

            {verificationStatus !== "approved" && verificationStatus !== "pending" && (
              <Button
                onClick={handleIdentityVerification}
                loading={idVerifyLoading}
                className="w-full mb-3"
                size="lg"
              >
                Start Verification &rarr;
              </Button>
            )}

            {verificationStatus === "approved" ? (
              <Button
                onClick={() => router.push("/contractor/dashboard")}
                className="w-full"
                size="lg"
              >
                Continue to Dashboard &rarr;
              </Button>
            ) : (
              <button
                onClick={skipVerification}
                className="w-full text-sm text-muted hover:text-secondary transition-colors cursor-pointer py-2 underline-offset-2 hover:underline"
              >
                Skip for now — I&apos;ll do this later
              </button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

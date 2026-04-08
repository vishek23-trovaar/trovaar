"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CATEGORIES, CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";
import { ContractorType } from "@/types";

type Step = 1 | 2 | 3;

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

  // Step 2 — Services
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 3 — Stripe (optional)
  const [stripeLoading, setStripeLoading] = useState(false);
  const [acceptedPlatformRules, setAcceptedPlatformRules] = useState(false);

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

  function skipStripe() {
    router.push("/contractor/dashboard");
  }

  if (authLoading || !user || user.role !== "contractor") {
    return (
      <div className="flex justify-center pt-32">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const STEP_LABELS = ["Profile", "Services", "Payments"];

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
              onClick={skipStripe}
              className="w-full text-sm text-muted hover:text-secondary transition-colors cursor-pointer py-2 underline-offset-2 hover:underline"
            >
              Skip for now — I&apos;ll set this up later
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CATEGORY_GROUPS, URGENCY_LEVELS } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { ConsumerSurgeBanner } from "@/components/insights/ConsumerSurgeBanner";
import ScrollReveal from "@/components/ui/ScrollReveal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiQuestion { question: string; answer: string; type: string; placeholder: string; }
interface ReferenceLink { url: string; label: string; }

const STEPS = [
  { id: 1, label: "Upload",  icon: "📸" },
  { id: 2, label: "AI Review", icon: "🤖" },
  { id: 3, label: "Review",  icon: "✅" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

function PostJobContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState("");

  // Category (auto-detected or manually picked)
  const [category, setCategory] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categoryGroup, setCategoryGroup] = useState<string | null>(null);
  const [categoryGroupIcon, setCategoryGroupIcon] = useState("");

  // Step 1 — Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [inspirationPhotos, setInspirationPhotos] = useState<string[]>([]);
  const [referenceLinks, setReferenceLinks] = useState<ReferenceLink[]>([{ url: "", label: "" }]);

  // Step 2 — AI Analysis results (editable)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiNotice, setAiNotice] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI category suggestion state
  const [categorySuggestion, setCategorySuggestion] = useState<{
    category: string; label: string; groupIcon: string; categoryGroup: string;
  } | null>(null);
  const [categorySuggestionLoading, setCategorySuggestionLoading] = useState(false);
  const categoryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 — Review + Location + Post
  const [expectedDate, setExpectedDate] = useState("");
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState(false);
  const [location, setLocation] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Save as Template
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const canGenerateQuestions = category && (title.trim().length > 0 || description.trim().length >= 10);

  // ── Pre-fill location from user profile ────────────────────────────────────
  useEffect(() => {
    if (user?.location && !location) {
      setLocation(user.location);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.location]);

  // ── Template prefill ────────────────────────────────────────────────────────
  useEffect(() => {
    if (searchParams.get("template") !== "1") return;
    const tTitle = searchParams.get("title");
    const tCategory = searchParams.get("category");
    const tDescription = searchParams.get("description");
    const tUrgency = searchParams.get("urgency");
    const tLocation = searchParams.get("location");
    const tBudgetRange = searchParams.get("budget_range");
    if (tTitle) setTitle(tTitle);
    if (tDescription) setDescription(tDescription);
    if (tUrgency) setUrgency(tUrgency);
    if (tLocation) setLocation(tLocation);
    if (tBudgetRange) setBudgetRange(tBudgetRange);
    if (tCategory) {
      applyCategoryValue(tCategory);
    }
    // If template has data, skip to step 2 with AI already "analyzed"
    if (tTitle || tDescription) {
      setAiAnalyzed(true);
      setStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rebook prefill ──────────────────────────────────────────────────────────
  useEffect(() => {
    const rebookId = searchParams.get("rebook");
    if (!rebookId) return;
    fetch(`/api/jobs/${rebookId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data?.job) return;
        const j = data.job;
        setTitle(j.title ? `(Rebook) ${j.title}` : "");
        setDescription(j.description || "");
        setCategory(j.category || "");
        setLocation(j.location || "");
        if (j.category) applyCategoryValue(j.category);
        if (j.title || j.description) {
          setAiAnalyzed(true);
          setStep(2);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: set category + derived display values from a category value ────
  function applyCategoryValue(catValue: string) {
    setCategory(catValue);
    for (const g of CATEGORY_GROUPS) {
      const match = g.categories.find((c) => c.value === catValue);
      if (match) {
        setCategoryGroup(g.label);
        setCategoryLabel(match.label);
        setCategoryGroupIcon(g.icon);
        return;
      }
    }
  }

  function handlePhotosChange(newPhotos: string[]) {
    setPhotos(newPhotos);
  }

  // ── AI Analysis: call /api/ai/parse-job after upload ───────────────────────
  async function runAiAnalysis() {
    setAiLoading(true);
    setStepError("");
    try {
      // Send photos directly — the API uses Gemini Vision to analyze them
      const res = await fetch("/api/ai/parse-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: photos.slice(0, 4) }),
      });

      if (res.ok) {
        const data = await res.json();
        // Only auto-fill description — title and category are left for the user
        if (data.description) setDescription(data.description);
        // Set scenario-based questions with type and placeholder
        if (data.questions?.length) {
          setAiQuestions(data.questions.map((q: { question: string; type?: string; placeholder?: string }) => ({
            question: q.question,
            answer: "",
            type: q.type || "text",
            placeholder: q.placeholder || "Your answer",
          })));
          setAiGenerated(true);
        }
      }
    } catch {
      setAiNotice("AI analysis unavailable — please fill in the details manually.");
    } finally {
      setAiLoading(false);
      setAiAnalyzed(true);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // ── AI category suggestion (re-detect when description changes in step 2) ──
  useEffect(() => {
    if (step !== 2 || photos.length === 0) return;
    if (!description.trim() || description.trim().length < 15) return;
    if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current);
    categoryDebounceRef.current = setTimeout(async () => {
      setCategorySuggestionLoading(true);
      try {
        const res = await fetch("/api/ai/detect-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: photos.slice(0, 2), title, description }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.category && data.category !== category) {
            setCategorySuggestion({
              category: data.category,
              label: data.label,
              groupIcon: data.groupIcon || "",
              categoryGroup: data.categoryGroup || "",
            });
          } else {
            setCategorySuggestion(null);
          }
        }
      } catch { /* silent */ }
      finally { setCategorySuggestionLoading(false); }
    }, 1200);
    return () => { if (categoryDebounceRef.current) clearTimeout(categoryDebounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, title]);

  // ── AI questions (auto-regenerated when category/title/description change on step 2) ──
  useEffect(() => {
    if (step !== 2 || !canGenerateQuestions) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generateQuestions(category, title, description, photos), 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, title, description]);

  async function generateQuestions(cat: string, ttl: string, desc: string, photoUrls: string[]) {
    setAiQuestionsLoading(true);
    try {
      const res = await fetch("/api/ai/job-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, title: ttl, description: desc, photos: photoUrls.slice(0, 2) }),
      });
      if (res.ok) {
        const data = await res.json();
        const newQuestions: AiQuestion[] = data.questions.map((q: string | { question: string; type?: string; placeholder?: string }) => {
          if (typeof q === "string") return { question: q, answer: "", type: "text", placeholder: "Your answer" };
          return { question: q.question, answer: "", type: q.type || "text", placeholder: q.placeholder || "Your answer" };
        });
        // Preserve existing answers when a matching question comes back
        setAiQuestions((prev) => {
          const answerMap = new Map(prev.filter((p) => p.answer.trim()).map((p) => [p.question.toLowerCase().trim(), p.answer]));
          return newQuestions.map((q) => {
            const existing = answerMap.get(q.question.toLowerCase().trim());
            return existing ? { ...q, answer: existing } : q;
          });
        });
        setAiGenerated(true);
      }
    } catch {
      setAiNotice("AI questions unavailable — please fill in the details manually.");
    } finally { setAiQuestionsLoading(false); }
  }

  function updateAnswer(i: number, answer: string) {
    setAiQuestions((prev) => prev.map((q, idx) => idx === i ? { ...q, answer } : q));
  }

  // ── Location detect ─────────────────────────────────────────────────────────
  async function detectLocation() {
    setGeoError("");
    setGeoLoading(true);
    try {
      // Try browser GPS first
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false, timeout: 8000, maximumAge: 60000,
          })
        );
        const { latitude, longitude } = position.coords;
        const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          if (data.location) { setLocation(data.location); return; }
        }
      } catch {
        // GPS failed — fall through to IP fallback
      }

      // Fallback: IP-based geolocation (via server)
      const ipRes = await fetch("/api/geocode/ip");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.location) {
          setLocation(ipData.location);
          return;
        }
      }

      setGeoError("Could not detect location. Please enter manually.");
    } catch {
      setGeoError("Location detection failed.");
    } finally { setGeoLoading(false); }
  }

  // ── Vision board helpers ──────────────────────────────────────────────────
  function addRefLink() { setReferenceLinks((p) => [...p, { url: "", label: "" }]); }
  function removeRefLink(i: number) { setReferenceLinks((p) => p.filter((_, idx) => idx !== i)); }
  function updateRefLink(i: number, field: keyof ReferenceLink, val: string) {
    setReferenceLinks((p) => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  // ── Step validation & navigation ──────────────────────────────────────────
  function validateStep(s: number): string {
    if (s === 1) {
      if (photos.length === 0) return "Please upload at least one photo or video of your project.";
    }
    if (s === 2) {
      if (!category) return "Please select a service category.";
      if (!title.trim()) return "Please enter a job title.";
      if (!description.trim() || description.trim().length < 10) return "Please describe the project (at least 10 characters).";
      if (!urgency) return "Please select an urgency level.";
    }
    if (s === 3) {
      if (!expectedDate) return "Please set an expected completion date.";
      if (urgency === "emergency" && !emergencyAcknowledged) return "Please acknowledge the $100 emergency service fee.";
      if (!location.trim()) return "Please enter your location.";
    }
    return "";
  }

  function goNext() {
    const err = validateStep(step);
    if (err) { setStepError(err); return; }
    setStepError("");

    // After step 1, trigger AI analysis
    if (step === 1) {
      runAiAnalysis();
      return;
    }

    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStepError("");
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpTo(s: number) {
    if (s < step) { setStep(s); setStepError(""); }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    const err = validateStep(3);
    if (err) { setStepError(err); return; }
    setSubmitError("");
    setSubmitting(true);
    const answeredQuestions = aiQuestions.filter((q) => q.answer.trim());
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          urgency,
          location: location.trim(),
          photos,
          expected_completion_date: expectedDate || null,
          ai_questions: answeredQuestions.length > 0 ? answeredQuestions : null,
          reference_links: referenceLinks.filter((l) => l.url.trim()),
          inspiration_photos: inspirationPhotos,
          budget_range: budgetRange || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to post job");
      }
      const data = await res.json();
      router.push(`/jobs/${data.job.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // ── Save as Template ────────────────────────────────────────────────────────
  async function handleSaveTemplate() {
    if (!templateName.trim()) return;
    setTemplateSaving(true);
    try {
      const res = await fetch("/api/job-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          urgency,
          location: location.trim() || undefined,
        }),
      });
      if (res.ok) {
        setTemplateSaved(true);
        setShowTemplateSave(false);
        setTemplateName("");
        setTimeout(() => setTemplateSaved(false), 3000);
      }
    } catch { /* silent */ } finally {
      setTemplateSaving(false);
    }
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const selectedGroup = CATEGORY_GROUPS.find((g) => g.label === categoryGroup);
  const selectedCat = selectedGroup?.categories.find((c) => c.value === category);
  const selectedUrgency = URGENCY_LEVELS.find((u) => u.value === urgency);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      {/* Page header */}
      <ScrollReveal>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary">Post a Job</h1>
          <p className="text-muted text-sm mt-1">
            Snap a photo — our AI figures out the rest. Skilled pros compete for your job.
          </p>
        </div>
      </ScrollReveal>

      {/* Progress bar */}
      <ScrollReveal delay={100}>
      <div className="mb-8">
        <div className="hidden sm:flex items-center justify-between mb-2">
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors cursor-pointer ${
                s.id === step ? "text-primary" : s.id < step ? "text-primary/60 hover:text-primary" : "text-muted cursor-default"
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                s.id < step ? "bg-primary text-white" : s.id === step ? "bg-primary/10 border-2 border-primary text-primary" : "bg-surface border border-border text-muted"
              }`}>
                {s.id < step ? "✓" : s.icon}
              </span>
              <span className="hidden md:block">{s.label}</span>
            </button>
          ))}
        </div>
        <div className="relative h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <p className="sm:hidden text-xs text-muted mt-2 text-center">
          Step {step} of {STEPS.length} — {STEPS[step - 1].label}
        </p>
      </div>
      </ScrollReveal>

      {/* Step error */}
      {stepError && (
        <div role="alert" aria-live="polite" className="mb-4 bg-red-50 text-danger text-sm p-3 rounded-lg border border-red-200">
          {stepError}
        </div>
      )}

      {/* AI notice */}
      {aiNotice && (
        <div className="mb-4 bg-amber-50 text-amber-800 text-sm p-3 rounded-lg border border-amber-200 flex items-center justify-between">
          <span>{aiNotice}</span>
          <button onClick={() => setAiNotice("")} className="text-amber-600 hover:text-amber-800 ml-2 shrink-0">✕</button>
        </div>
      )}

      <Card className="p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">

        {/* ── Step 1: Upload Photo/Video ──────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary mb-1">Show us the project</h2>
              <p className="text-sm text-muted">
                Upload a photo or video and our AI will analyze it to auto-fill your job details.
              </p>
            </div>

            {/* Big upload area */}
            <div>
              <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-2">📷 Project photos / videos</p>
              <ImageUploader images={photos} onImagesChange={handlePhotosChange} />
              <p className="text-xs text-muted mt-2">
                Clear photos get you significantly better bids — pros can see exactly what&apos;s needed.
              </p>
            </div>

            {/* Inspiration board */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🎯</span>
                <p className="text-sm font-semibold text-secondary">Inspiration / Vision Board</p>
                <span className="ml-auto text-xs text-muted bg-surface px-2 py-0.5 rounded-full">optional</span>
              </div>
              <p className="text-xs text-muted mb-3">
                Show contractors what finish, style, or part you have in mind — screenshots, Pinterest saves, product pages.
              </p>
              <ImageUploader
                images={inspirationPhotos}
                onImagesChange={setInspirationPhotos}
                maxImages={8}
                label=""
                hint="Upload inspiration photos that show the result you want."
              />
            </div>

            {/* Product / reference links */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-secondary uppercase tracking-wide">🔗 Product / Part Links</p>
                <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">optional</span>
              </div>
              <p className="text-xs text-muted mb-3">
                Link the exact part, fixture, or product you want installed — so contractors quote on the right item.
              </p>
              <div className="space-y-2">
                {referenceLinks.map((link, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateRefLink(i, "url", e.target.value)}
                        placeholder="https://www.amazon.com/... or any product URL"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 bg-white placeholder-muted"
                      />
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateRefLink(i, "label", e.target.value)}
                        placeholder='Label — e.g. "OEM part I want"'
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border focus:outline-none bg-white placeholder-muted"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRefLink(i)}
                      disabled={referenceLinks.length === 1}
                      className="mt-2 text-muted hover:text-danger text-xl leading-none disabled:opacity-30 cursor-pointer"
                    >×</button>
                  </div>
                ))}
              </div>
              {referenceLinks.length < 5 && (
                <button type="button" onClick={addRefLink} className="mt-2 text-sm text-primary hover:underline cursor-pointer">
                  + Add link
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── AI Loading Transition ──────────────────────────────────── */}
        {aiLoading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-primary/20 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-secondary">AI Analyzing...</p>
              <p className="text-sm text-muted mt-1">Analyzing your photos and generating project details</p>
            </div>
          </div>
        )}

        {/* ── Step 2: AI Analysis Results (all editable) ─────────────── */}
        {step === 2 && !aiLoading && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-secondary mb-1">Describe Your Project</h2>
              <p className="text-sm text-muted">
                Our AI analyzed your photos and drafted a description. Fill in the title, category, and answer the questions below so contractors can quote accurately.
              </p>
            </div>

            {/* Surge pricing info for selected category */}
            {category && <ConsumerSurgeBanner category={category} />}

            {/* Uploaded photos preview */}
            {photos.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {photos.slice(0, 4).map((url, i) => {
                  const isVideo = url.match(/\.(mp4|mov|webm)$/i);
                  return (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                      {isVideo ? (
                        <video src={url} className="w-full h-full object-cover" muted playsInline />
                      ) : (
                        <img src={url} alt={`Upload ${i + 1}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                  );
                })}
                {photos.length > 4 && <span className="text-xs text-muted self-center">+{photos.length - 4} more</span>}
              </div>
            )}

            {/* Category dropdown */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Service Category *
              </label>
              <select
                value={category}
                onChange={(e) => applyCategoryValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
              >
                <option value="">Select a category...</option>
                {CATEGORY_GROUPS.map((group) => (
                  <optgroup key={group.label} label={`${group.icon} ${group.label}`}>
                    {group.categories.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* AI category suggestion */}
              {categorySuggestionLoading && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Re-analyzing category based on your description...
                </div>
              )}
              {categorySuggestion && !categorySuggestionLoading && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-center gap-3">
                  <span className="text-sm">
                    {categorySuggestion.groupIcon || "🤖"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-900">
                      AI suggests: {categorySuggestion.label}
                    </p>
                    <p className="text-xs text-blue-600">
                      Based on your description, this may be a better fit
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      applyCategoryValue(categorySuggestion.category);
                      setCategorySuggestion(null);
                    }}
                    className="px-3 py-1 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategorySuggestion(null)}
                    className="text-blue-400 hover:text-blue-600 text-lg leading-none cursor-pointer shrink-0"
                  >
                    x
                  </button>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Job Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. ${
                  category === "plumbing" ? "Leaking pipe under kitchen sink" :
                  category === "roofing" ? "Roof repair after storm damage" :
                  category === "electrical" ? "Install ceiling fan in living room" :
                  "Describe the job in a short phrase"
                }`}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Project Description *
                {aiAnalyzed && description && <span className="ml-2 text-xs font-normal text-primary">(AI drafted — feel free to edit)</span>}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what needs to be done. Include the problem, any relevant measurements, what you've already tried, and any specific requirements."
                rows={5}
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted resize-none"
              />
              <p className="text-xs text-muted mt-1">{description.trim().length} characters{description.trim().length < 20 ? " (more detail = better bids)" : ""}</p>
            </div>

            {/* Urgency dropdown */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Urgency *
              </label>
              <select
                value={urgency}
                onChange={(e) => { setUrgency(e.target.value); if (e.target.value !== "emergency") setEmergencyAcknowledged(false); }}
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
              >
                <option value="">Select urgency...</option>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* AI scenario-based questions */}
            {aiGenerated && aiQuestions.length > 0 && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">✨</span>
                  <p className="text-sm font-semibold text-violet-900">Help contractors quote you accurately</p>
                </div>
                <p className="text-xs text-violet-600 mb-4">
                  Answer these questions so pros have what they need to give you an accurate bid.
                </p>
                <div className="space-y-4">
                  {aiQuestions.map((q, i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-violet-900 mb-1.5">
                        {i + 1}. {q.question}
                      </label>
                      {q.type === "yesno" ? (
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => updateAnswer(i, "Yes")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              q.answer === "Yes"
                                ? "bg-primary text-white"
                                : "bg-white border border-violet-200 text-secondary hover:border-primary"
                            }`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => updateAnswer(i, "No")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              q.answer === "No"
                                ? "bg-primary text-white"
                                : "bg-white border border-violet-200 text-secondary hover:border-primary"
                            }`}
                          >
                            No
                          </button>
                        </div>
                      ) : q.type === "measurement" ? (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 text-sm">📏</span>
                          <input
                            type="text"
                            value={q.answer}
                            onChange={(e) => updateAnswer(i, e.target.value)}
                            placeholder={q.placeholder}
                            className="w-full pl-9 pr-3 py-2 rounded-lg border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-secondary placeholder-muted text-sm"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={q.answer}
                          onChange={(e) => updateAnswer(i, e.target.value)}
                          placeholder={q.placeholder}
                          className="w-full px-3 py-2 rounded-lg border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white text-secondary placeholder-muted text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {aiQuestionsLoading && (
              <div className="flex items-center gap-2 text-sm text-violet-600">
                <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                Generating questions based on your project...
              </div>
            )}

          </div>
        )}

        {/* ── Step 3: Review + Location + Post ───────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-secondary mb-1">Review &amp; Post</h2>
              <p className="text-sm text-muted">Confirm your details, set the location, and post your job.</p>
            </div>

            {submitError && (
              <div className="bg-red-50 text-danger text-sm p-3 rounded-lg border border-red-200">{submitError}</div>
            )}

            {/* Review summary */}
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">

              <ReviewRow label="Category" onEdit={() => setStep(2)}>
                <span className="font-semibold text-secondary">
                  {categoryGroupIcon || selectedGroup?.icon} {categoryLabel || selectedCat?.label}
                </span>
              </ReviewRow>

              <ReviewRow label="Photos" onEdit={() => setStep(1)}>
                {photos.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {photos.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-12 h-12 rounded-lg object-cover border border-border" />
                    ))}
                    {photos.length > 4 && <span className="text-xs text-muted self-center">+{photos.length - 4} more</span>}
                  </div>
                ) : (
                  <span className="text-muted text-sm">No photos uploaded</span>
                )}
              </ReviewRow>

              <ReviewRow label="Title" onEdit={() => setStep(2)}>
                <span className="font-semibold text-secondary">{title}</span>
              </ReviewRow>

              <ReviewRow label="Description" onEdit={() => setStep(2)}>
                <p className="text-sm text-secondary line-clamp-3">{description}</p>
              </ReviewRow>

              {aiQuestions.some((q) => q.answer.trim()) && (
                <ReviewRow label="Details" onEdit={() => setStep(2)}>
                  <div className="space-y-1">
                    {aiQuestions.filter((q) => q.answer.trim()).map((q, i) => (
                      <p key={i} className="text-xs text-muted">
                        <span className="font-medium text-secondary">{q.question.replace(/\?$/, "")}:</span>{" "}{q.answer}
                      </p>
                    ))}
                  </div>
                </ReviewRow>
              )}

              <ReviewRow label="Urgency" onEdit={() => setStep(2)}>
                <span className={`text-sm font-semibold ${urgency === "emergency" ? "text-danger" : "text-secondary"}`}>
                  {selectedUrgency?.label}
                </span>
              </ReviewRow>

              {budgetRange && (
                <ReviewRow label="Budget Range">
                  <span className="font-semibold text-green-600">{budgetRange}</span>
                </ReviewRow>
              )}
            </div>

            {/* Emergency ack */}
            {urgency === "emergency" && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-semibold text-amber-900">Emergency Service Fee — $100</p>
                    <p className="text-sm text-amber-800 mt-1">
                      A <strong>$100 fee</strong> is added. In return, all qualified contractors within 20 miles are <strong>immediately notified</strong>, and they receive a <strong>+25% bonus</strong> to prioritize your job.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emergencyAcknowledged}
                    onChange={(e) => setEmergencyAcknowledged(e.target.checked)}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600"
                  />
                  <span className="text-sm font-medium text-amber-900">I acknowledge the $100 emergency fee</span>
                </label>
              </div>
            )}

            {/* Expected date */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">Needed by (target date) *</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                min={today}
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-secondary"
              />
              <p className="text-xs text-muted mt-1">This is a goal, not a guarantee — helps pros plan availability.</p>
            </div>

            {/* Location */}
            <div className="border-t border-border pt-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-secondary mb-0.5">Where is the job? *</h3>
                <p className="text-xs text-muted">Your full address stays hidden until you accept a bid and payment is secured.</p>
              </div>

              <div className="space-y-1">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="City, State *"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Atlanta, GA"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={geoLoading}
                    onClick={detectLocation}
                    className="mb-0.5 whitespace-nowrap"
                  >
                    📍 Detect
                  </Button>
                </div>
                {geoError && <p className="text-sm text-danger">{geoError}</p>}
              </div>

              <div className="rounded-xl bg-surface border border-border p-4 text-sm text-muted space-y-1.5">
                <p className="flex items-center gap-2"><span>🔒</span> Contractors browsing jobs only see your general area.</p>
                <p className="flex items-center gap-2"><span>📍</span> Full address is revealed only after you accept a bid and secure payment.</p>
              </div>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["🔒", "Address hidden until accepted"], ["📲", "Get bids within hours"], ["💰", "No obligation to hire"]].map(([icon, text]) => (
                <div key={text} className="bg-surface rounded-xl p-3">
                  <p className="text-xl mb-1">{icon}</p>
                  <p className="text-xs text-muted leading-tight">{text}</p>
                </div>
              ))}
            </div>

            {/* Save as Template */}
            {!showTemplateSave ? (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTemplateSave(true)}
                  className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1"
                >
                  💾 Save as Template
                </button>
                {templateSaved && (
                  <span className="text-sm text-emerald-600 font-medium">Template saved!</span>
                )}
              </div>
            ) : (
              <div className="flex gap-2 items-center bg-surface rounded-xl border border-border p-3">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g. Leaky Faucet Fix)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary/20 bg-white"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveTemplate(); }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={templateSaving || !templateName.trim()}
                  className="px-3 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {templateSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowTemplateSave(false); setTemplateName(""); }}
                  className="px-3 py-2 text-sm text-muted hover:text-secondary rounded-lg border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              loading={submitting}
              className="w-full"
              size="lg"
            >
              🚀 Post My Job
            </Button>
          </div>
        )}

        {/* ── Navigation buttons ────────────────────────────────────── */}
        {!aiLoading && (
          <div className={`flex gap-3 mt-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack}>
                ← Back
              </Button>
            )}
            {step < 3 && (
              <Button type="button" onClick={goNext} className={step === 1 ? "w-full" : ""}>
                {step === 1 ? "Analyze & Continue →" : "Review Post →"}
              </Button>
            )}
          </div>
        )}

      </Card>
    </div>
  );
}

// ── Shared review row component ────────────────────────────────────────────────
function ReviewRow({ label, onEdit, children }: { label: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <p className="text-xs font-semibold text-muted uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">{label}</p>
      <div className="flex-1 min-w-0">{children}</div>
      {onEdit && <button
        type="button"
        onClick={onEdit}
        className="text-xs text-primary hover:underline flex-shrink-0 cursor-pointer"
      >
        Edit
      </button>}
    </div>
  );
}

export default function PostJobPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <PostJobContent />
    </Suspense>
  );
}

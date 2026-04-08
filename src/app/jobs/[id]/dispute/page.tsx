"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const CONSUMER_REASONS = [
  { value: "work_not_completed", label: "Work was not completed" },
  { value: "poor_quality", label: "Work quality was unacceptable" },
  { value: "no_show", label: "Contractor did not show up" },
  { value: "overcharge", label: "Charged more than agreed price" },
  { value: "property_damage", label: "Property was damaged" },
  { value: "safety_concern", label: "Safety concerns during work" },
  { value: "other", label: "Other issue" },
];

const CONTRACTOR_REASONS = [
  { value: "payment_not_received", label: "Payment not received" },
  { value: "client_not_responsive", label: "Client not responsive" },
  { value: "scope_changed", label: "Scope changed without agreement" },
  { value: "unsafe_conditions", label: "Unsafe working conditions" },
  { value: "false_description", label: "Job description was misleading" },
  { value: "other", label: "Other issue" },
];

interface JobInfo {
  id: string;
  title: string;
  status: string;
  consumer_id: string;
}

export default function DisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [existingDispute, setExistingDispute] = useState(false);
  const [loadingJob, setLoadingJob] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data.job);
        }
      } catch { /* silent */ }

      try {
        const res = await fetch(`/api/disputes?jobId=${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.disputes?.some((d: { status: string }) => d.status === "open" || d.status === "investigating")) {
            setExistingDispute(true);
          }
        }
      } catch { /* silent */ }

      setLoadingJob(false);
    }
    load();
  }, [id]);

  const isConsumer = user && job && user.id === job.consumer_id;
  const reasons = isConsumer ? CONSUMER_REASONS : CONTRACTOR_REASONS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || !description.trim()) {
      setError("Please select a reason and describe the issue.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, reason, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit dispute");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-muted">Please sign in to report a problem.</p>
      </div>
    );
  }

  if (loadingJob) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (existingDispute) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <Card className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary mb-2">Active Dispute Exists</h2>
          <p className="text-muted text-sm mb-6">
            There is already an open dispute for this job. You can view its status on the disputes page.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/disputes">
              <Button>View My Disputes</Button>
            </Link>
            <Link href={`/jobs/${id}`}>
              <Button variant="outline">Back to Job</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="mb-6">
        <Link href={`/jobs/${id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to job
        </Link>
        <h1 className="text-2xl font-bold text-secondary mt-3">File a Dispute</h1>
        <p className="text-muted text-sm mt-1">
          {job ? (
            <>Report an issue with <span className="font-medium text-secondary">{job.title}</span></>
          ) : (
            "Report a problem with this job"
          )}
        </p>
      </div>

      <Card className="p-6">
        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-secondary mb-2">Dispute Submitted</h2>
            <p className="text-muted text-sm mb-6">
              We have received your report and will investigate. Both parties have been notified and will be updated on the outcome.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/disputes">
                <Button>View My Disputes</Button>
              </Link>
              <Link href={`/jobs/${id}`}>
                <Button variant="outline">Back to Job</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                What went wrong? <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      reason === r.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm text-secondary">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Describe the issue <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Please provide as much detail as possible about what happened, including dates, amounts, and what resolution you are seeking..."
                className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm"
              />
              <p className="text-xs text-muted mt-1">{description.length} / 2000 characters</p>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">What happens next?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Our team will review your dispute within 24-48 hours. Both parties will be notified and can respond.
                    A resolution will be proposed, and both parties must accept for it to take effect.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3">
              <Link href={`/jobs/${id}`} className="flex-1">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
              <Button
                type="submit"
                loading={submitting}
                disabled={!reason || !description.trim()}
                className="flex-1 !bg-red-600 hover:!bg-red-700"
              >
                Submit Dispute
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

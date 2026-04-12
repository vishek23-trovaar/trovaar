"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import ScrollReveal from "@/components/ui/ScrollReveal";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CATEGORY_GROUPS, URGENCY_LEVELS } from "@/lib/constants";
import { JobWithBidCount } from "@/types";

export default function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [job, setJob] = useState<JobWithBidCount | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [expectedDate, setExpectedDate] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/client/dashboard");
    } catch (err) {
      console.error("Failed to delete job:", err);
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${id}`);
        if (!res.ok) { router.push(`/jobs/${id}`); return; }
        const data = await res.json();
        const j: JobWithBidCount = data.job;

        // Authorization check
        if (!user || j.consumer_id !== user.id) {
          router.push(`/jobs/${id}`);
          return;
        }

        // Lock check — if bid is accepted, redirect back
        const bidsRes = await fetch(`/api/jobs/${id}/bids`);
        if (bidsRes.ok) {
          const bidsData = await bidsRes.json();
          const hasAccepted = bidsData.bids.some((b: { status: string }) => b.status === "accepted");
          if (hasAccepted || !["posted", "bidding"].includes(j.status)) {
            router.push(`/jobs/${id}`);
            return;
          }
        }

        setJob(j);
        setTitle(j.title);
        setDescription(j.description || "");
        setCategory(j.category);
        setUrgency(j.urgency);
        setLocation(j.location);
        setPhotos(JSON.parse(j.photos || "[]"));
        setExpectedDate(j.expected_completion_date || "");
      } catch (err) {
        console.error("Failed to load job:", err);
        router.push(`/jobs/${id}`);
      } finally {
        setLoadingJob(false);
      }
    }
    if (user !== undefined) fetchJob();
  }, [id, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, category, urgency, location,
          photos, expected_completion_date: expectedDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save changes");
      }

      router.push(`/jobs/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loadingJob) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <ScrollReveal>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-secondary">Edit Job</h1>
        <p className="text-muted text-sm mt-1">
          Changes are only allowed while no bid has been accepted.
        </p>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
      <Card className="p-6 sm:p-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}

          <ImageUploader images={photos} onImagesChange={setPhotos} />

          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Brake pad replacement, Leaky faucet repair"
            required
          />

          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work needed."
              rows={4}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
            >
              <option value="">Select a category...</option>
              {CATEGORY_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Urgency *</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
            >
              {URGENCY_LEVELS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-1.5">Needed By (expected date) *</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              min={today}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary"
            />
            <p className="text-xs text-muted mt-1.5">
              * This date is a goal, not a guarantee — it helps contractors plan their availability.
            </p>
          </div>

          <Input
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State"
            required
          />

          <div className="flex gap-3">
            <Button type="submit" loading={loading} size="lg" className="flex-1">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => router.push(`/jobs/${id}`)}
            >
              Cancel
            </Button>
          </div>

          <div className="border-t border-border pt-6">
            {!deleteConfirm ? (
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-2.5 rounded-lg border border-danger/30 text-danger text-sm font-medium hover:bg-danger/5 transition-colors cursor-pointer"
              >
                🗑 Delete This Job
              </button>
            ) : (
              <div className="rounded-lg border border-danger/30 bg-red-50 p-4">
                <p className="text-sm font-semibold text-danger mb-1">Are you sure?</p>
                <p className="text-xs text-danger/80 mb-4">This cannot be undone. The job and all its bids will be permanently deleted.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {deleting ? "Deleting…" : "Yes, delete permanently"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-secondary cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </Card>
      </ScrollReveal>
    </div>
  );
}

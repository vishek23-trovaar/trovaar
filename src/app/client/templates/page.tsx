"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScrollReveal from "@/components/ui/ScrollReveal";
import PageHero from "@/components/ui/PageHero";

interface JobTemplate {
  id: string;
  consumer_id: string;
  name: string;
  title: string;
  description: string | null;
  category: string;
  urgency: string;
  location: string | null;
  budget_range: string | null;
  created_at: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  plumbing: "🔧",
  electrical: "⚡",
  roofing: "🏠",
  hvac: "❄️",
  landscaping: "🌿",
  painting: "🎨",
  flooring: "🪵",
  cleaning: "🧹",
  appliance: "🔌",
  pest_control: "🐛",
  exterior: "🏡",
  automotive: "🚗",
  moving: "📦",
  handyman: "🔨",
  carpentry: "🪚",
};

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] ?? "🔧";
}

function formatCategoryLabel(category: string): string {
  return category
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    low: "bg-[#18191a] text-[#d0d6e0]",
    medium: "bg-[#3B82F6]/10 text-[#60A5FA]",
    high: "bg-[#fbbf24]/10 text-[#fbbf24]",
    emergency: "bg-[#f87171]/10 text-[#f87171]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
        map[urgency] ?? "bg-[#141516] text-[#8a8f98]"
      }`}
    >
      {urgency}
    </span>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/job-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }

  function handlePostJob(template: JobTemplate) {
    const params = new URLSearchParams();
    params.set("template", "1");
    if (template.title) params.set("title", template.title);
    if (template.category) params.set("category", template.category);
    if (template.description) params.set("description", template.description);
    if (template.urgency) params.set("urgency", template.urgency);
    if (template.location) params.set("location", template.location);
    router.push(`/jobs/new?${params.toString()}`);
  }

  function handleDeleteClick(id: string) {
    setConfirmingId(id);
    setTimeout(() => {
      setConfirmingId((current) => (current === id ? null : current));
    }, 3000);
  }

  async function handleConfirmDelete(id: string) {
    try {
      const res = await fetch(`/api/job-templates?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete template:", err);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHero
        title="Job Templates"
        subtitle="Saved job configurations you can reuse to post new jobs in seconds."
        action={
          <Link
            href="/jobs/new"
            className="inline-flex items-center px-5 py-2.5 bg-white text-blue-700 text-sm font-bold rounded-full shadow-lg shadow-blue-900/30 hover:bg-blue-50 transition-all"
          >
            + New Job
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        /* Empty state */
        <div className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-[#d0d6e0] mb-2">No templates yet</h2>
          <p className="text-sm text-[#8a8f98] max-w-xs mx-auto">
            Save a job as a template when posting to reuse it later
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, i) => (
            <ScrollReveal key={template.id} delay={i * 80}>
            <div
              className="bg-[#0f1011] rounded-2xl shadow-sm border border-[#23252a] p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              {/* Template name */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-[#f7f8f8] text-base leading-tight">
                  {template.name}
                </p>
                <UrgencyBadge urgency={template.urgency} />
              </div>

              {/* Category */}
              <p className="text-sm text-[#8a8f98] flex items-center gap-1.5">
                <span>{getCategoryEmoji(template.category)}</span>
                <span>{formatCategoryLabel(template.category)}</span>
              </p>

              {/* Title */}
              <p className="text-sm text-[#d0d6e0] leading-snug">{template.title}</p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#23252a]">
                <button
                  onClick={() => handlePostJob(template)}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Post Job
                </button>
                {confirmingId === template.id ? (
                  <button
                    onClick={() => handleConfirmDelete(template.id)}
                    className="px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Confirm?
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeleteClick(template.id)}
                    className="px-3 py-2 border border-[#23252a] text-[#8a8f98] text-sm font-medium rounded-lg hover:border-[#f87171]/30 hover:text-[#f87171] transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}

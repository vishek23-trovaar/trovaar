"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

interface HelpRequest {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  skills_needed: string | null;
  pay_cents: number;
  spots: number;
  spots_filled: number;
  date_needed: string | null;
  job_title: string;
  job_category: string;
  job_location: string;
  lead_contractor_name: string;
  lead_rating: number | null;
  lead_years: number | null;
  applicant_count: number;
  my_application_status: string | null;
  created_at: string;
}

export default function HelpRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [showMsgFor, setShowMsgFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.role === "contractor") fetchRequests();
    else setLoading(false);
  }, [user]);

  async function fetchRequests() {
    try {
      const res = await fetch("/api/help-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.help_requests || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function applyToRequest(helpId: string, jobId: string) {
    setApplying(helpId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/help/${helpId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message[helpId] || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      setFeedback(prev => ({ ...prev, [helpId]: "✅ Application sent!" }));
      setShowMsgFor(null);
      setRequests(prev => prev.map(r => r.id === helpId ? { ...r, my_application_status: "pending", applicant_count: r.applicant_count + 1 } : r));
    } catch (err) {
      setFeedback(prev => ({ ...prev, [helpId]: err instanceof Error ? err.message : "Error" }));
    }
    setApplying(null);
  }

  async function withdrawApplication(helpId: string, jobId: string) {
    if (!confirm("Withdraw your application?")) return;
    try {
      await fetch(`/api/jobs/${jobId}/help/${helpId}/apply`, { method: "DELETE" });
      setRequests(prev => prev.map(r => r.id === helpId ? { ...r, my_application_status: "withdrawn", applicant_count: Math.max(0, r.applicant_count - 1) } : r));
      setFeedback(prev => ({ ...prev, [helpId]: "Application withdrawn." }));
    } catch { /* silent */ }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted">Please <Link href="/login" className="text-primary hover:underline">sign in</Link> to view help requests.</p>
      </div>
    );
  }

  if (user.role !== "contractor") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-3xl mb-2">🤝</p>
        <p className="text-muted">Help requests are only available to contractors.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Find Help Gigs 🤝</h1>
        <p className="text-muted text-sm mt-1">
          Contractors looking for extra hands on active jobs. Flat pay, flexible work.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔧</p>
          <p className="font-semibold text-secondary mb-1">No open help requests right now</p>
          <p className="text-muted text-sm">Check back soon — contractors post help requests when they need extra crew.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const applied = req.my_application_status === "pending";
            const accepted = req.my_application_status === "accepted";
            const fb = feedback[req.id];
            const spotsLeft = req.spots - req.spots_filled;

            return (
              <Card key={req.id} className="p-5">
                {/* Pay badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-secondary">{req.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      on <Link href={`/jobs/${req.job_id}`} className="text-primary hover:underline">{req.job_title}</Link>
                      {req.job_location && ` · ${req.job_location}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-primary">${(req.pay_cents / 100).toFixed(0)}</p>
                    <p className="text-xs text-muted">flat pay</p>
                  </div>
                </div>

                {req.description && (
                  <p className="text-sm text-muted mb-3 line-clamp-3">{req.description}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap gap-2 mb-3 text-xs text-muted">
                  {req.skills_needed && (
                    <span className="bg-surface border border-border rounded-full px-2.5 py-1">
                      🔧 {req.skills_needed}
                    </span>
                  )}
                  {req.date_needed && (
                    <span className="bg-surface border border-border rounded-full px-2.5 py-1">
                      📅 {new Date(req.date_needed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <span className="bg-surface border border-border rounded-full px-2.5 py-1">
                    👥 {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                  </span>
                  {req.applicant_count > 0 && (
                    <span className="bg-surface border border-border rounded-full px-2.5 py-1">
                      {req.applicant_count} applied
                    </span>
                  )}
                </div>

                {/* Lead contractor */}
                <div className="flex items-center gap-2 text-xs text-muted border-t border-border pt-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {req.lead_contractor_name.charAt(0).toUpperCase()}
                  </div>
                  <span>Lead: <span className="font-medium text-secondary">{req.lead_contractor_name}</span></span>
                  {req.lead_rating && <span>⭐ {req.lead_rating.toFixed(1)}</span>}
                  {req.lead_years != null && <span>· {req.lead_years} yr{req.lead_years !== 1 ? "s" : ""} exp</span>}
                </div>

                {/* Feedback */}
                {fb && (
                  <p className={`text-xs mb-2 px-3 py-1.5 rounded-lg ${fb.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-danger"}`}>
                    {fb}
                  </p>
                )}

                {/* Message input (shown before applying) */}
                {showMsgFor === req.id && !applied && !accepted && (
                  <div className="mb-3">
                    <textarea
                      value={message[req.id] || ""}
                      onChange={e => setMessage(prev => ({ ...prev, [req.id]: e.target.value }))}
                      placeholder="Optional: introduce yourself or describe relevant experience…"
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none"
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  {accepted ? (
                    <span className="text-sm font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      🎉 You&apos;re on the crew!
                    </span>
                  ) : applied ? (
                    <>
                      <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex-1 text-center">
                        ⏳ Application Pending
                      </span>
                      <button
                        onClick={() => withdrawApplication(req.id, req.job_id)}
                        className="text-xs text-muted hover:text-danger px-3 py-1.5 rounded-lg border border-border hover:border-danger/40 transition-colors cursor-pointer"
                      >
                        Withdraw
                      </button>
                    </>
                  ) : showMsgFor === req.id ? (
                    <>
                      <Button size="sm" loading={applying === req.id}
                        onClick={() => applyToRequest(req.id, req.job_id)}>
                        Send Application
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowMsgFor(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setShowMsgFor(req.id)}>
                      Apply to Help
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

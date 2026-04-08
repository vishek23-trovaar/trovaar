"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface HelpApplication {
  id: string;
  applicant_id: string;
  applicant_name: string;
  applicant_photo: string | null;
  applicant_rating: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface HelpRequest {
  id: string;
  job_id: string;
  lead_contractor_id: string;
  title: string;
  description: string | null;
  skills_needed: string | null;
  pay_cents: number;
  spots: number;
  spots_filled: number;
  date_needed: string | null;
  status: string;
  created_at: string;
  pending_applications: number;
  applications: HelpApplication[];
}

interface Props {
  jobId: string;
  isLeadContractor: boolean;
  jobStatus: string;
}

export function CollaborationPanel({ jobId, isLeadContractor, jobStatus }: Props) {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState("");
  const [pay, setPay] = useState("");
  const [spots, setSpots] = useState("1");
  const [dateNeeded, setDateNeeded] = useState("");

  const canPost = isLeadContractor && ["accepted", "en_route", "arrived", "in_progress"].includes(jobStatus);

  useEffect(() => { fetchRequests(); }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchRequests() {
    try {
      const res = await fetch(`/api/jobs/${jobId}/help`);
      if (res.ok) {
        const data = await res.json();
        setHelpRequests(data.help_requests || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    const payCents = Math.round(parseFloat(pay || "0") * 100);
    if (payCents < 100) { setError("Pay must be at least $1.00."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          skills_needed: skillsNeeded.trim() || undefined,
          pay_cents: payCents,
          spots: parseInt(spots) || 1,
          date_needed: dateNeeded || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to post");
      }
      setTitle(""); setDescription(""); setSkillsNeeded(""); setPay(""); setSpots("1"); setDateNeeded("");
      setShowForm(false);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post help request");
    }
    setSubmitting(false);
  }

  async function acceptApplication(helpId: string, appId: string) {
    setAccepting(appId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/help/${helpId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      await fetchRequests();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error accepting");
    }
    setAccepting(null);
  }

  async function cancelRequest(helpId: string) {
    if (!confirm("Cancel this help request?")) return;
    await fetch(`/api/jobs/${jobId}/help/${helpId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    await fetchRequests();
  }

  if (loading) return <div className="py-6 text-center text-muted text-sm">Loading…</div>;

  const activeRequests = helpRequests.filter(r => r.status === "open" || r.status === "filled");
  const closedRequests = helpRequests.filter(r => r.status === "cancelled" || r.status === "completed");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-secondary">Crew &amp; Collaboration</h3>
          <p className="text-xs text-muted mt-0.5">
            {isLeadContractor
              ? "Need extra hands? Post a help request and pay a flat fee."
              : "Contractors helping on this job."}
          </p>
        </div>
        {canPost && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Request Help
          </Button>
        )}
      </div>

      {/* Post form */}
      {canPost && showForm && (
        <Card className="p-4 border-2 border-indigo-200 bg-indigo-50/50">
          <p className="text-sm font-semibold text-secondary mb-3">Post a Help Request</p>
          {error && <p className="text-danger text-xs mb-2 bg-red-50 rounded p-2">{error}</p>}
          <form onSubmit={handlePost} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">What do you need help with? *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="e.g. Roofing crew for 2 days, Drywall finishing, Electrical rough-in"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Details</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Describe what the helper will be doing, timeline, and any specific requirements."
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">Skills / Tools Needed</label>
              <input type="text" value={skillsNeeded} onChange={e => setSkillsNeeded(e.target.value)}
                placeholder="e.g. Must have own tools, OSHA 10 preferred, CDL required"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Flat Pay *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
                  <input type="number" min="1" step="0.01" value={pay} onChange={e => setPay(e.target.value)} required
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none bg-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Spots Needed</label>
                <input type="number" min="1" max="20" value={spots} onChange={e => setSpots(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Date Needed</label>
                <input type="date" value={dateNeeded} onChange={e => setDateNeeded(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none bg-white" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" loading={submitting} size="sm">Post Help Request</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Active requests */}
      {activeRequests.length === 0 && !showForm ? (
        <div className="text-center py-8">
          <p className="text-3xl mb-2">🤝</p>
          <p className="text-muted text-sm">No collaboration requests yet.</p>
          {canPost && (
            <p className="text-xs text-muted mt-1">Post a help request to bring in extra crew at a flat rate.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {activeRequests.map((hr) => {
            const isExpanded = expandedRequest === hr.id;
            const pendingApps = hr.applications.filter(a => a.status === "pending");
            const acceptedApps = hr.applications.filter(a => a.status === "accepted");

            return (
              <Card key={hr.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        hr.status === "filled" ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
                      }`}>
                        {hr.status === "filled" ? "✅ Filled" : "🔵 Open"}
                      </span>
                      <span className="text-xs text-muted">
                        {hr.spots_filled}/{hr.spots} spot{hr.spots !== 1 ? "s" : ""} filled
                      </span>
                      {hr.pending_applications > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                          {hr.pending_applications} applicant{hr.pending_applications !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-secondary text-sm">{hr.title}</p>
                    {hr.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{hr.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-sm font-bold text-primary">${(hr.pay_cents / 100).toFixed(2)} flat</span>
                      {hr.date_needed && (
                        <span className="text-xs text-muted">📅 {new Date(hr.date_needed).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      )}
                      {hr.skills_needed && (
                        <span className="text-xs text-muted">🔧 {hr.skills_needed}</span>
                      )}
                    </div>
                  </div>

                  {isLeadContractor && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {hr.pending_applications > 0 && (
                        <button
                          onClick={() => setExpandedRequest(isExpanded ? null : hr.id)}
                          className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer font-medium"
                        >
                          {isExpanded ? "Hide" : `View ${hr.pending_applications}`}
                        </button>
                      )}
                      {hr.status === "open" && (
                        <button
                          onClick={() => cancelRequest(hr.id)}
                          className="text-xs text-muted hover:text-danger px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Accepted helpers */}
                {acceptedApps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs font-semibold text-secondary mb-2">✅ Accepted Crew</p>
                    <div className="flex flex-wrap gap-2">
                      {acceptedApps.map(app => (
                        <Link key={app.id} href={`/profile/${app.applicant_id}`}
                          className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 hover:bg-green-100 transition-colors">
                          <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800 flex-shrink-0">
                            {app.applicant_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-secondary">{app.applicant_name}</p>
                            {app.applicant_rating && (
                              <p className="text-xs text-muted">⭐ {app.applicant_rating.toFixed(1)}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending applications (expanded) */}
                {isExpanded && pendingApps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <p className="text-xs font-semibold text-secondary">Applicants</p>
                    {pendingApps.map(app => (
                      <div key={app.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-surface border border-border">
                        <Link href={`/profile/${app.applicant_id}`}>
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 hover:opacity-80">
                            {app.applicant_name.charAt(0).toUpperCase()}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link href={`/profile/${app.applicant_id}`} className="text-sm font-semibold text-secondary hover:text-primary">
                              {app.applicant_name}
                            </Link>
                            {app.applicant_rating && (
                              <span className="text-xs text-muted">⭐ {app.applicant_rating.toFixed(1)}</span>
                            )}
                          </div>
                          {app.message && (
                            <p className="text-xs text-muted mt-0.5">{app.message}</p>
                          )}
                          <p className="text-xs text-muted mt-0.5">
                            Applied {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <button
                          onClick={() => acceptApplication(hr.id, app.id)}
                          disabled={accepting === app.id || hr.spots_filled >= hr.spots}
                          className="flex-shrink-0 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
                        >
                          {accepting === app.id ? "…" : "Accept"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Closed/cancelled (collapsed) */}
      {closedRequests.length > 0 && (
        <details className="text-xs text-muted cursor-pointer">
          <summary className="hover:text-secondary">{closedRequests.length} closed request{closedRequests.length !== 1 ? "s" : ""}</summary>
          <div className="mt-2 space-y-1 pl-2">
            {closedRequests.map(hr => (
              <p key={hr.id} className="text-xs text-muted line-through">{hr.title} — {hr.status}</p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

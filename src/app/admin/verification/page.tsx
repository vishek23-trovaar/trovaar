"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PendingContractor {
  user_id: string;
  name: string;
  email: string;
  verification_status: string;
  insurance_status: string;
  business_established: number | null;
  rating: number;
  years_experience: number;
  created_at: string;
}

interface Dispute {
  id: string;
  job_id: string;
  job_title: string;
  filed_by: string;
  filed_by_name: string;
  filed_by_role: string;
  consumer_name: string;
  contractor_name: string | null;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

type AdminTab = "verifications" | "disputes";

export default function AdminVerificationPage() {
  const [tab, setTab] = useState<AdminTab>("verifications");

  // Verifications
  const [contractors, setContractors] = useState<PendingContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Disputes
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [disputesLoading, setDisputesLoading] = useState(false);
  const [disputesFetched, setDisputesFetched] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<"resolved" | "closed">("resolved");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  useEffect(() => {
    if (tab === "disputes" && !disputesFetched) fetchDisputes();
  }, [tab]);

  async function fetchPending() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verifications");
      if (res.ok) {
        const data = await res.json();
        setContractors(data.contractors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDisputes() {
    setDisputesLoading(true);
    try {
      const res = await fetch("/api/admin/disputes?status=open");
      if (res.ok) {
        const data = await res.json();
        setDisputes(data.disputes);
        setDisputesFetched(true);
      }
    } catch { /* silent */ } finally {
      setDisputesLoading(false);
    }
  }

  async function handleAction(contractorId: string, type: string, action: string) {
    const key = `${contractorId}-${type}-${action}`;
    setActionLoading(key);
    setMessage("");
    try {
      const res = await fetch("/api/admin/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, type, action }),
      });
      if (res.ok) {
        setMessage(`${type} ${action} for contractor.`);
        fetchPending();
      } else {
        const data = await res.json();
        setMessage(data.error || "Action failed");
      }
    } catch {
      setMessage("Request failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function resolveDispute(disputeId: string) {
    if (!resolution.trim()) return;
    setResolvingId(disputeId);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, status: resolutionStatus }),
      });
      if (res.ok) {
        setDisputes((prev) => prev.filter((d) => d.id !== disputeId));
        setSelectedDispute(null);
        setResolution("");
      }
    } catch { /* silent */ } finally {
      setResolvingId(null);
    }
  }

  const REASON_LABELS: Record<string, string> = {
    work_not_completed: "Work not completed",
    poor_quality: "Poor quality",
    no_show: "Contractor no-show",
    overcharge: "Overcharged",
    property_damage: "Property damage",
    other: "Other",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Admin Panel</h1>
        <p className="text-muted mt-1 text-sm">
          Manage verification requests and dispute resolution.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-dark rounded-lg p-1 mb-6 w-fit">
        {(["verifications", "disputes"] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer capitalize " +
              (tab === t ? "bg-white text-secondary shadow-sm" : "text-muted hover:text-secondary")
            }
          >
            {t === "verifications" ? "✓ Verifications" : "⚠️ Disputes"}
            {t === "disputes" && disputes.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {disputes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Verifications Tab */}
      {tab === "verifications" && (
        <>
          {message && (
            <div className="mb-4 bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">{message}</div>
          )}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : contractors.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted">No pending verification requests.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {contractors.map((contractor) => (
                <Card key={contractor.user_id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-secondary">{contractor.name}</h2>
                      <p className="text-sm text-muted">{contractor.email}</p>
                      <div className="flex gap-4 mt-2 text-sm text-muted">
                        <span>{contractor.years_experience} yrs experience</span>
                        {contractor.rating > 0 && <span>⭐ {contractor.rating.toFixed(1)}</span>}
                        {contractor.business_established && (
                          <span>Est. {contractor.business_established}</span>
                        )}
                        <span>Joined {new Date(contractor.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-fit">
                      {contractor.verification_status === "pending" && (
                        <div className="border rounded-lg p-3 bg-blue-50">
                          <p className="text-xs font-semibold text-blue-800 mb-2">✓ Verification Request</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(contractor.user_id, "verification", "approved")}
                              loading={actionLoading === `${contractor.user_id}-verification-approved`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(contractor.user_id, "verification", "rejected")}
                              loading={actionLoading === `${contractor.user_id}-verification-rejected`}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}

                      {contractor.insurance_status === "pending" && (
                        <div className="border rounded-lg p-3 bg-green-50">
                          <p className="text-xs font-semibold text-green-800 mb-2">🛡 Insurance Request</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(contractor.user_id, "insurance", "approved")}
                              loading={actionLoading === `${contractor.user_id}-insurance-approved`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(contractor.user_id, "insurance", "rejected")}
                              loading={actionLoading === `${contractor.user_id}-insurance-rejected`}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Disputes Tab */}
      {tab === "disputes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            {disputesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : disputes.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-muted">No open disputes.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => (
                  <Card
                    key={d.id}
                    hover
                    className={`p-4 cursor-pointer ${selectedDispute?.id === d.id ? "border-primary ring-1 ring-primary/20" : ""}`}
                    onClick={() => { setSelectedDispute(d); setResolution(""); }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-secondary text-sm">{d.job_title}</p>
                        <p className="text-xs text-muted mt-0.5">
                          Filed by <strong>{d.filed_by_name}</strong> ({d.filed_by_role}) •{" "}
                          {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium shrink-0">
                        {REASON_LABELS[d.reason] || d.reason}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2 line-clamp-2">{d.description}</p>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Resolve Panel */}
          <div>
            {selectedDispute ? (
              <Card className="p-6 sticky top-6">
                <h3 className="font-semibold text-secondary mb-4">Resolve Dispute</h3>
                <div className="space-y-3 mb-4 text-sm">
                  <div>
                    <span className="text-muted">Job:</span>{" "}
                    <span className="font-medium text-secondary">{selectedDispute.job_title}</span>
                  </div>
                  <div>
                    <span className="text-muted">Consumer:</span>{" "}
                    <span className="text-secondary">{selectedDispute.consumer_name}</span>
                  </div>
                  {selectedDispute.contractor_name && (
                    <div>
                      <span className="text-muted">Contractor:</span>{" "}
                      <span className="text-secondary">{selectedDispute.contractor_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted">Reason:</span>{" "}
                    <span className="text-secondary">{REASON_LABELS[selectedDispute.reason] || selectedDispute.reason}</span>
                  </div>
                  <div>
                    <span className="text-muted">Details:</span>
                    <p className="text-secondary mt-1 bg-surface p-2 rounded text-xs">{selectedDispute.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Outcome</label>
                    <div className="flex gap-2">
                      {(["resolved", "closed"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setResolutionStatus(s)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer capitalize ${
                            resolutionStatus === s
                              ? "border-primary bg-primary text-white"
                              : "border-border text-secondary hover:border-primary/40"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Resolution Note</label>
                    <textarea
                      value={resolution}
                      onChange={(e) => setResolution(e.target.value)}
                      rows={3}
                      placeholder="Explain the resolution to both parties..."
                      className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm"
                    />
                  </div>

                  <Button
                    onClick={() => resolveDispute(selectedDispute.id)}
                    loading={resolvingId === selectedDispute.id}
                    disabled={!resolution.trim()}
                    className="w-full"
                  >
                    Submit Resolution
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-40 text-center text-muted text-sm">
                Select a dispute to review and resolve it.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

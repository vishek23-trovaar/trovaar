"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface BackgroundCheckRequest {
  user_id: string;
  name: string;
  email: string;
  location: string | null;
  background_check_status: string;
  background_check_requested_at: string | null;
  background_check_notes: string | null;
}

export default function AdminBackgroundChecksPage() {
  const [contractors, setContractors] = useState<BackgroundCheckRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBackgroundChecks();
  }, []);

  async function fetchBackgroundChecks() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/background-checks");
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

  async function handleAction(userId: string, status: "approved" | "rejected") {
    const key = `${userId}-${status}`;
    setActionLoading(key);
    setMessage("");
    try {
      const res = await fetch("/api/admin/background-checks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          status,
          notes: notesMap[userId] || undefined,
        }),
      });
      if (res.ok) {
        setMessage(`Background check ${status} for contractor.`);
        fetchBackgroundChecks();
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

  const pending = contractors.filter((c) => c.background_check_status === "pending");
  const processed = contractors.filter((c) => c.background_check_status !== "pending");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">Background Checks</h1>
        <p className="text-muted mt-1 text-sm">
          Review and manage contractor background check requests.
        </p>
      </div>

      {message && (
        <div className="mb-4 bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">{message}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : pending.length === 0 && processed.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted">No background check requests.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pending Requests */}
          {pending.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-secondary mb-3">
                Pending Requests ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map((contractor) => (
                  <Card key={contractor.user_id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-secondary">{contractor.name}</h3>
                        <p className="text-sm text-muted">{contractor.email}</p>
                        <div className="flex gap-4 mt-2 text-sm text-muted">
                          {contractor.location && <span>{contractor.location}</span>}
                          {contractor.background_check_requested_at && (
                            <span>
                              Submitted{" "}
                              {new Date(contractor.background_check_requested_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 min-w-fit">
                        <div className="border rounded-lg p-3 bg-blue-50">
                          <p className="text-xs font-semibold text-blue-800 mb-2">
                            Background Check Request
                          </p>
                          <div className="mb-2">
                            <input
                              type="text"
                              placeholder="Notes (optional)"
                              value={notesMap[contractor.user_id] || ""}
                              onChange={(e) =>
                                setNotesMap((prev) => ({
                                  ...prev,
                                  [contractor.user_id]: e.target.value,
                                }))
                              }
                              className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAction(contractor.user_id, "approved")}
                              loading={actionLoading === `${contractor.user_id}-approved`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAction(contractor.user_id, "rejected")}
                              loading={actionLoading === `${contractor.user_id}-rejected`}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Previously Processed */}
          {processed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-secondary mb-3">
                Previously Processed ({processed.length})
              </h2>
              <div className="space-y-3">
                {processed.map((contractor) => (
                  <Card key={contractor.user_id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-medium text-secondary text-sm">{contractor.name}</h3>
                        <p className="text-xs text-muted">{contractor.email}</p>
                        {contractor.background_check_notes && (
                          <p className="text-xs text-muted mt-1">
                            Notes: {contractor.background_check_notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          contractor.background_check_status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {contractor.background_check_status === "approved"
                          ? "Approved"
                          : "Rejected"}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

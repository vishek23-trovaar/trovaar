"use client";

import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PendingLicense {
  cert_id: string;
  user_id: string;
  cert_name: string;
  issuer: string;
  document_url: string | null;
  verified: number;
  created_at: string;
  license_number: string | null;
  license_state: string | null;
  name: string;
  email: string;
}

export default function AdminLicensesPage() {
  const [licenses, setLicenses] = useState<PendingLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLicenses();
  }, []);

  async function fetchLicenses() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses);
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
      const res = await fetch("/api/admin/licenses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status, notes: notes[userId] || undefined }),
      });
      if (res.ok) {
        setMessage(`License ${status} for contractor.`);
        fetchLicenses();
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

  // Extract license type from cert_name like "Trade License: Plumbing"
  function getLicenseType(certName: string): string {
    return certName.replace("Trade License: ", "");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-secondary">License Verification</h1>
        <p className="text-muted mt-1 text-sm">
          Review and verify contractor trade license submissions.
        </p>
      </div>

      {message && (
        <div className="mb-4 bg-blue-50 text-blue-800 text-sm p-3 rounded-lg">{message}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : licenses.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted">No pending license verifications.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {licenses.map((lic) => (
            <Card key={lic.cert_id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-secondary">{lic.name}</h2>
                  <p className="text-sm text-muted">{lic.email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted">
                    <span>
                      <span className="font-medium text-secondary">License #:</span>{" "}
                      {lic.license_number || "N/A"}
                    </span>
                    <span>
                      <span className="font-medium text-secondary">State:</span>{" "}
                      {lic.license_state || "N/A"}
                    </span>
                    <span>
                      <span className="font-medium text-secondary">Type:</span>{" "}
                      {getLicenseType(lic.cert_name)}
                    </span>
                    <span>
                      Submitted {new Date(lic.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {lic.document_url && (
                    <a
                      href={lic.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                    >
                      View Document
                    </a>
                  )}
                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="Optional notes (visible to contractor on rejection)..."
                      value={notes[lic.user_id] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [lic.user_id]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-muted"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-fit">
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <p className="text-xs font-semibold text-blue-800 mb-2">License Review</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(lic.user_id, "approved")}
                        loading={actionLoading === `${lic.user_id}-approved`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(lic.user_id, "rejected")}
                        loading={actionLoading === `${lic.user_id}-rejected`}
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
      )}
    </div>
  );
}

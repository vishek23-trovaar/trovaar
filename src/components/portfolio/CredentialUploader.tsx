"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

interface VerificationResult {
  holderName: string | null;
  licenseNumber: string | null;
  licenseType: string | null;
  issuer: string | null;
  state: string | null;
  expiryDate: string | null;
  isExpired: boolean;
  confidence: "high" | "medium" | "low";
  summary: string;
}

interface CredentialData {
  license_number: string | null;
  license_type: string | null;
  license_holder_name: string | null;
  license_issuer: string | null;
  license_state: string | null;
  license_expiry_date: string | null;
  id_document_url: string | null;
  ai_verification_result: string | null;
  ai_verified_at: string | null;
}

interface Props {
  contractorId: string;
  editable?: boolean;
}

export default function CredentialUploader({ contractorId, editable = true }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [credential, setCredential] = useState<CredentialData | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");

  // Load existing credential data
  const loadCredential = useCallback(async () => {
    try {
      const res = await fetch(`/api/contractors/${contractorId}`);
      if (res.ok) {
        const data = await res.json();
        const profile = data.contractor || data;
        setCredential({
          license_number: profile.license_number || null,
          license_type: profile.license_type || null,
          license_holder_name: profile.license_holder_name || null,
          license_issuer: profile.license_issuer || null,
          license_state: profile.license_state || null,
          license_expiry_date: profile.license_expiry_date || null,
          id_document_url: profile.id_document_url || null,
          ai_verification_result: profile.ai_verification_result || null,
          ai_verified_at: profile.ai_verified_at || null,
        });
        if (profile.ai_verification_result) {
          try { setResult(JSON.parse(profile.ai_verification_result)); } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ } finally {
      setLoadingData(false);
    }
  }, [contractorId]);

  // Load on mount
  useState(() => { loadCredential(); });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      // Upload to S3
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "license");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      // Save the document URL
      await fetch(`/api/contractors/${contractorId}/id-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_url: url }),
      });

      // Now trigger AI verification
      setUploading(false);
      setVerifying(true);

      const verifyRes = await fetch("/api/ai/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentUrl: url }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verification failed");
      }

      const { result: verifyResult } = await verifyRes.json();
      setResult(verifyResult);
      await loadCredential();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUploading(false);
      setVerifying(false);
    }
  }

  if (loadingData) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-48 bg-surface rounded animate-pulse" />
        <div className="h-32 bg-surface rounded-xl animate-pulse" />
      </div>
    );
  }

  const hasCredential = credential?.id_document_url || result;
  const isOwner = user?.id === contractorId;

  return (
    <div className="space-y-4">
      {/* Upload area — only for owner */}
      {editable && isOwner && (
        <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
          {uploading ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted">Uploading document...</span>
            </div>
          ) : verifying ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm font-medium text-primary">AI scanning your license...</span>
              <span className="text-xs text-muted">Extracting name, number, expiry, and more</span>
            </div>
          ) : (
            <>
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm font-medium text-secondary mb-1">
                {hasCredential ? "Upload a new license or certification" : "Upload your license or certification"}
              </p>
              <p className="text-xs text-muted mb-3">
                JPG, PNG, or PDF — AI will automatically extract the details
              </p>
              <label className="inline-block cursor-pointer">
                <Button type="button" variant="outline" size="sm">
                  Choose File
                </Button>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleUpload}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
      )}

      {/* Verification results */}
      {result && (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-border">
            <span className="text-lg">
              {result.confidence === "high" ? "✅" : result.confidence === "medium" ? "🟡" : "⚠️"}
            </span>
            <div>
              <p className="text-sm font-semibold text-secondary">
                {result.confidence === "high"
                  ? "Verified"
                  : result.confidence === "medium"
                  ? "Partially Verified"
                  : "Needs Review"}
              </p>
              <p className="text-xs text-muted">{result.summary}</p>
            </div>
            {result.isExpired && (
              <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                Expired
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 p-4">
            {result.holderName && (
              <Field label="License Holder" value={result.holderName} />
            )}
            {result.licenseNumber && (
              <Field label="License Number" value={result.licenseNumber} />
            )}
            {result.licenseType && (
              <Field label="License Type" value={result.licenseType} />
            )}
            {result.issuer && (
              <Field label="Issuing Authority" value={result.issuer} />
            )}
            {result.state && (
              <Field label="State" value={result.state} />
            )}
            {result.expiryDate && (
              <Field
                label="Expires"
                value={result.expiryDate}
                warn={result.isExpired}
              />
            )}
          </div>
        </div>
      )}

      {/* No credential yet */}
      {!hasCredential && !editable && (
        <div className="text-center py-8 text-muted text-sm">
          No license or certification uploaded yet.
        </div>
      )}

      {/* Document preview */}
      {credential?.id_document_url && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-surface border-b border-border">
            <p className="text-xs font-medium text-muted">Document on file</p>
          </div>
          <div className="relative w-full h-48 bg-slate-50">
            <Image
              src={credential.id_document_url}
              alt="License document"
              fill
              className="object-contain p-2"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${warn ? "text-red-600" : "text-secondary"}`}>{value}</p>
    </div>
  );
}

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { CATEGORIES, CATEGORY_GROUPS, CONTRACTOR_TYPES } from "@/lib/constants";

function getCategoryIcon(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.categories.some((c) => c.value === value)) return g.icon;
  }
  return "🔧";
}

interface CertificateData {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  category: string;
  location: string;
  completedAt: string | null;
  consumerName: string;
  consumerLocation: string | null;
  contractorName: string;
  contractorType: string;
  licenseNumber: string | null;
  yearsExperience: number;
  amountCents: number;
  laborCents: number | null;
  partsSummary: string | null;
  review: { rating: number; comment: string | null } | null;
  generatedAt: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "text-amber-400" : "text-gray-300"}>★</span>
      ))}
    </span>
  );
}

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCertificate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchCertificate() {
    try {
      const res = await fetch(`/api/jobs/${id}/certificate`);
      if (res.ok) {
        const data = await res.json();
        setCert(data.certificate);
      } else {
        const data = await res.json();
        setError(data.error || "Certificate not available");
      }
    } catch {
      setError("Failed to load certificate");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted">Please sign in to view this certificate.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">📄</p>
        <p className="text-lg font-semibold text-secondary mb-2">Certificate Not Available</p>
        <p className="text-muted text-sm mb-6">{error || "This job may not be completed yet."}</p>
        <Link href={`/jobs/${id}`} className="text-primary hover:underline text-sm">← Back to job</Link>
      </div>
    );
  }

  const catInfo = CATEGORIES.find((c) => c.value === cert.category);
  const catIcon = getCategoryIcon(cert.category);
  const contractorTypeDef = CONTRACTOR_TYPES.find((t) => t.value === cert.contractorType);
  const completedDate = cert.completedAt
    ? new Date(cert.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "N/A";
  const generatedDate = new Date(cert.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Print/Back nav — hidden on print */}
      <ScrollReveal>
      <div className="flex items-center justify-between mb-8 print:hidden">
        <Link href={`/jobs/${id}`} className="text-sm text-primary hover:underline">← Back to job</Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print / Save PDF
        </button>
      </div>
      </ScrollReveal>

      {/* Certificate */}
      <ScrollReveal delay={100}>
      <div className="bg-white border-4 border-primary/20 rounded-2xl shadow-xl overflow-hidden print:border-2 print:shadow-none print:rounded-none hover:shadow-2xl transition-shadow duration-500">

        {/* Header banner */}
        <div className="bg-gradient-to-r from-primary to-accent px-8 py-6 text-white text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-3xl">{catIcon}</span>
            <h1 className="text-2xl font-bold tracking-tight">Job Completion Certificate</h1>
          </div>
          <p className="text-white/80 text-sm">Trovaar Platform · Issued {generatedDate}</p>
        </div>

        <div className="px-8 py-6 space-y-6">

          {/* Job title */}
          <div className="text-center border-b border-gray-100 pb-5">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">This certifies the completion of</p>
            <h2 className="text-2xl font-bold text-secondary">{cert.jobTitle}</h2>
            {catInfo && (
              <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                {catIcon} {catInfo.label}
              </span>
            )}
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Client</p>
              <p className="font-semibold text-secondary">{cert.consumerName}</p>
              {cert.location && <p className="text-sm text-muted mt-0.5">{cert.location}</p>}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Contractor</p>
              <p className="font-semibold text-secondary">{cert.contractorName}</p>
              {contractorTypeDef && (
                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${contractorTypeDef.badgeClass}`}>
                  {contractorTypeDef.badge}
                </span>
              )}
              {cert.licenseNumber && (
                <p className="text-xs text-muted mt-1">License #{cert.licenseNumber}</p>
              )}
              <p className="text-xs text-muted mt-0.5">{cert.yearsExperience} yrs experience</p>
            </div>
          </div>

          {/* Details */}
          <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Date Completed</span>
              <span className="text-sm font-semibold text-secondary">{completedDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted">Service Location</span>
              <span className="text-sm font-semibold text-secondary">{cert.location}</span>
            </div>
            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
              <span className="text-sm font-semibold text-secondary">Total Paid</span>
              <span className="text-lg font-bold text-primary">${(cert.amountCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Parts summary */}
          {cert.partsSummary && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Parts & Materials Used</p>
              <p className="text-sm text-secondary bg-blue-50 rounded-lg px-4 py-3">{cert.partsSummary}</p>
            </div>
          )}

          {/* Review */}
          {cert.review && (
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Client Review</p>
              <div className="flex items-center gap-2 mb-1">
                <StarRow rating={cert.review.rating} />
                <span className="text-sm font-semibold text-secondary">{cert.review.rating}/5</span>
              </div>
              {cert.review.comment && (
                <p className="text-sm text-muted italic">"{cert.review.comment}"</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-4 text-center">
            <p className="text-xs text-muted">
              This certificate was automatically generated by Trovaar upon mutual job completion confirmation.
              Job ID: <code className="text-xs">{cert.jobId}</code>
            </p>
          </div>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
}

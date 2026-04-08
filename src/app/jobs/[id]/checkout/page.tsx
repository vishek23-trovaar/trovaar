"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function CheckoutDisclaimerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<{ title: string; price?: number; terms_accepted_at?: string; status?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  // Checkboxes — all must be checked before proceeding
  const [checks, setChecks] = useState({
    adult: false,
    liability: false,
    escrow: false,
    completion: false,
    terms: false,
  });

  const allChecked = Object.values(checks).every(Boolean);

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load job details");
        return r.json();
      })
      .then((d) => setJob(d.job))
      .catch(() => setError("Unable to load job details. Please try again."))
      .finally(() => setLoading(false));
  }, [id]);

  function toggle(key: keyof typeof checks) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms_accepted_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed to accept terms");
      router.push(`/jobs/${id}/pay`);
    } catch {
      setError("Something went wrong while accepting the terms. Please try again.");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const VALID_CHECKOUT_STATUSES = ["accepted", "bidding", "pending"];
  const invalidStatus = job && job.status && !VALID_CHECKOUT_STATUSES.includes(job.status);

  if (invalidStatus) {
    const statusMessages: Record<string, string> = {
      cancelled: "This job has been cancelled and is no longer available for checkout.",
      completed: "This job has already been completed.",
      paid: "This job has already been paid for.",
    };
    const msg = (job.status && statusMessages[job.status]) || `This job is currently "${job.status}" and cannot proceed to checkout.`;
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div role="alert" aria-live="polite" className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 font-medium">{msg}</p>
          <Link href={`/jobs/${id}`} className="mt-3 inline-block text-sm text-primary hover:underline">
            Back to job details
          </Link>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div role="alert" aria-live="polite" className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/jobs/${id}`} className="text-sm text-muted hover:text-secondary flex items-center gap-1 mb-4">
          ← Back to job
        </Link>
        <h1 className="text-2xl font-bold text-secondary">Service Agreement</h1>
        <p className="text-muted mt-1">
          Please review and accept the following terms before proceeding to payment.
        </p>
      </div>

      {job && (
        <div className="bg-surface rounded-xl border border-border px-4 py-3 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Service Request</p>
            <p className="font-semibold text-secondary">{job.title}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Funds held in escrow until completion</p>
            <p className="text-xs font-medium text-green-600">🔒 Secure Payment</p>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-8">

        {/* 1. Adult present */}
        <DisclaimerBlock
          icon="🔞"
          title="Adult Must Be Present"
          color="blue"
          checked={checks.adult}
          onToggle={() => toggle("adult")}
          checkLabel="I confirm an adult (18+) will be present at the service location"
        >
          <p>
            A person <strong>18 years of age or older</strong> must be present at the service address
            at the time the contractor arrives and throughout the duration of the service. The adult must
            be available to provide access, answer questions, and approve work before the contractor begins.
          </p>
          <p className="mt-2 text-sm text-blue-700">
            If no adult is present when the contractor arrives, the service call may be rescheduled and
            a trip fee may apply per the contractor's terms.
          </p>
        </DisclaimerBlock>

        {/* 2. Platform liability */}
        <DisclaimerBlock
          icon="🤝"
          title="Platform Role & Liability Disclaimer"
          color="amber"
          checked={checks.liability}
          onToggle={() => toggle("liability")}
          checkLabel="I understand Trovaar is a marketplace only"
        >
          <p>
            <strong>Trovaar is a technology platform</strong> that connects consumers with independent
            service contractors. We are not a contractor, employer, or party to the service agreement between you
            and the contractor.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• All work is performed by and between the consumer and the contractor directly</li>
            <li>• Trovaar does not guarantee the quality, safety, or outcome of any work performed</li>
            <li>• Contractors are independent professionals, not employees of Trovaar</li>
            <li>• Any disputes arising from the work are between the consumer and contractor</li>
            <li>• Trovaar is not liable for property damage, injury, or service defects</li>
            <li>• Verify contractor licenses, permits, and insurance before work begins</li>
          </ul>
        </DisclaimerBlock>

        {/* 3. Escrow hold */}
        <DisclaimerBlock
          icon="🔒"
          title="Escrow Payment — Funds Held Until Completion"
          color="green"
          checked={checks.escrow}
          onToggle={() => toggle("escrow")}
          checkLabel="I understand my payment will be held in escrow until the job is confirmed complete"
        >
          <p>
            Your payment will be <strong>held securely</strong> and not released to the contractor until
            both parties confirm the job is complete. This protects you from paying for work that hasn't
            been done.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• Funds are collected and held by Trovaar at the time of payment</li>
            <li>• Payment is released to the contractor only after you confirm completion</li>
            <li>• If a dispute is raised, funds remain held until resolution</li>
            <li>• Trovaar collects a 20% platform fee from the contractor's payout</li>
          </ul>
        </DisclaimerBlock>

        {/* 4. Completion confirmation */}
        <DisclaimerBlock
          icon="✅"
          title="Completion Confirmation Process"
          color="violet"
          checked={checks.completion}
          onToggle={() => toggle("completion")}
          checkLabel="I understand I must confirm completion before funds are released"
        >
          <p>
            Once the contractor marks the job as complete, <strong>you will be notified</strong> to
            confirm the work is done to your satisfaction.
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• The contractor submits a completion request when work is done</li>
            <li>• You review the work and confirm or dispute</li>
            <li>• Upon your confirmation, funds are released to the contractor</li>
            <li>• You'll have the opportunity to leave a tip and review at this stage</li>
            <li>• If you do not respond within 72 hours of a completion request, funds auto-release</li>
          </ul>
        </DisclaimerBlock>

        {/* 5. General T&C */}
        <DisclaimerBlock
          icon="📄"
          title="Terms of Service & Privacy Policy"
          color="gray"
          checked={checks.terms}
          onToggle={() => toggle("terms")}
          checkLabel="I have read and agree to the Trovaar Terms of Service and Privacy Policy"
        >
          <p>
            By proceeding with payment, you agree to Trovaar's{" "}
            <Link href="/legal/terms" target="_blank" className="text-primary underline">Terms of Service</Link> and{" "}
            <Link href="/legal/privacy" target="_blank" className="text-primary underline">Privacy Policy</Link>. Key points:
          </p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>• You are responsible for accurate job descriptions and reasonable access for contractors</li>
            <li>• Change orders may be submitted by contractors and require your approval before work proceeds</li>
            <li>• Cancellation after a bid is accepted may result in a cancellation fee</li>
            <li>• Trovaar may suspend accounts for abuse, fraud, or harassment</li>
            <li>• All platform communications are subject to our Privacy Policy</li>
          </ul>
        </DisclaimerBlock>
      </div>

      {/* CTA */}
      {error && (
        <div role="alert" aria-live="polite" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}
      <div className={`rounded-xl border-2 p-6 transition-all ${allChecked ? "border-primary bg-primary/5" : "border-border bg-surface"}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${allChecked ? "bg-primary text-white" : "bg-surface-dark text-muted"}`}>
            {allChecked ? "✓" : Object.values(checks).filter(Boolean).length + "/" + Object.keys(checks).length}
          </div>
          <div>
            <p className="font-semibold text-secondary">
              {allChecked ? "All terms accepted — ready to pay" : "Accept all terms to continue"}
            </p>
            <p className="text-xs text-muted">
              {allChecked
                ? "Your payment will be securely held until the job is confirmed complete."
                : `${Object.values(checks).filter(Boolean).length} of ${Object.keys(checks).length} items acknowledged`}
            </p>
          </div>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!allChecked}
          loading={accepting}
          className="w-full"
          size="lg"
        >
          💳 Proceed to Secure Payment
        </Button>

        <p className="text-center text-xs text-muted mt-3">
          Payment is processed securely via Stripe. Your card details are never stored by Trovaar.
        </p>
      </div>
    </div>
  );
}

// ── Reusable disclaimer block ──────────────────────────────────────
const colorMap = {
  blue:   { border: "border-blue-200",   bg: "bg-blue-50",   title: "text-blue-900",   body: "text-blue-800",   check: "border-blue-300 text-blue-700"   },
  amber:  { border: "border-amber-200",  bg: "bg-amber-50",  title: "text-amber-900",  body: "text-amber-800",  check: "border-amber-300 text-amber-700"  },
  green:  { border: "border-green-200",  bg: "bg-green-50",  title: "text-green-900",  body: "text-green-800",  check: "border-green-300 text-green-700"  },
  violet: { border: "border-violet-200", bg: "bg-violet-50", title: "text-violet-900", body: "text-violet-800", check: "border-violet-300 text-violet-700" },
  gray:   { border: "border-gray-200",   bg: "bg-gray-50",   title: "text-gray-900",   body: "text-gray-700",   check: "border-gray-300 text-gray-700"    },
} as const;

function DisclaimerBlock({
  icon, title, color, checked, onToggle, checkLabel, children,
}: {
  icon: string;
  title: string;
  color: keyof typeof colorMap;
  checked: boolean;
  onToggle: () => void;
  checkLabel: string;
  children: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{icon}</span>
          <h3 className={`font-semibold text-sm ${c.title}`}>{title}</h3>
          {checked && (
            <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Accepted</span>
          )}
        </div>
        <div className={`text-sm ${c.body} space-y-1`}>{children}</div>
      </div>
      <div className={`px-5 py-3 border-t ${c.border} bg-white/60`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="mt-0.5 w-4 h-4 rounded cursor-pointer"
          />
          <span className={`text-sm font-medium ${c.check}`}>{checkLabel}</span>
        </label>
      </div>
    </div>
  );
}

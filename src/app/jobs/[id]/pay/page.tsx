"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ScrollReveal from "@/components/ui/ScrollReveal";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({
  jobId,
  clientSecret,
  amountCents,
  platformFeeCents,
  contractorPayoutCents,
}: {
  jobId: string;
  clientSecret: string;
  amountCents: number;
  platformFeeCents: number;
  contractorPayoutCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/jobs/${jobId}?payment=success`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setPaying(false);
    }
    // On success, Stripe redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface rounded-2xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Job payment</span>
          <span className="font-medium text-secondary">${(amountCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>Platform fee (20%)</span>
          <span>${(platformFeeCents / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted">
          <span>Contractor payout (80%)</span>
          <span>${(contractorPayoutCents / 100).toFixed(2)}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-semibold text-secondary">
          <span>Total charged</span>
          <span>${(amountCents / 100).toFixed(2)}</span>
        </div>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      <Button type="submit" loading={paying} disabled={!stripe || !elements} className="w-full" size="lg">
        Pay ${(amountCents / 100).toFixed(2)} Securely
      </Button>

      <p className="text-xs text-center text-muted">
        🔒 Payments are held securely until the job is completed.
      </p>
    </form>
  );
}

export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [platformFeeCents, setPlatformFeeCents] = useState(0);
  const [contractorPayoutCents, setContractorPayoutCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    async function createIntent() {
      try {
        const res = await fetch("/api/stripe/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: id }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to initialize payment");
        } else {
          setClientSecret(data.clientSecret);
          setAmountCents(data.amountCents || data.platformFeeCents + data.contractorPayoutCents);
          setPlatformFeeCents(data.platformFeeCents);
          setContractorPayoutCents(data.contractorPayoutCents);
          // Fetch actual amount from intent
          setAmountCents(data.platformFeeCents + data.contractorPayoutCents);
        }
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    createIntent();
  }, [id, user]);

  if (!user || user.role !== "consumer") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-muted">You must be signed in as a consumer to make payments.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <ScrollReveal>
      <div className="mb-8">
        <Link href={`/jobs/${id}`} className="text-sm text-primary hover:underline">
          ← Back to job
        </Link>
        <h1 className="text-2xl font-bold text-secondary mt-3">Complete Payment</h1>
        <p className="text-muted text-sm mt-1">
          Payment is held securely and released to the contractor upon job completion.
        </p>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
      <Card className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-danger mb-4">{error}</p>
            <Link href={`/jobs/${id}`}>
              <Button variant="outline">Back to Job</Button>
            </Link>
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <CheckoutForm
              jobId={id}
              clientSecret={clientSecret}
              amountCents={amountCents}
              platformFeeCents={platformFeeCents}
              contractorPayoutCents={contractorPayoutCents}
            />
          </Elements>
        ) : null}
      </Card>
      </ScrollReveal>
    </div>
  );
}

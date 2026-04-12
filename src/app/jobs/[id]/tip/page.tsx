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

const TIP_PRESETS = [500, 1000, 2000, 5000]; // cents

function TipForm({
  jobId,
  clientSecret,
  amountCents,
}: {
  jobId: string;
  clientSecret: string;
  amountCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
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
        return_url: `${window.location.origin}/jobs/${jobId}?tip=success`,
      },
    });

    if (result.error) {
      setError(result.error.message || "Payment failed");
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-surface rounded-2xl p-4 text-sm">
        <div className="flex justify-between font-semibold text-secondary">
          <span>Tip amount</span>
          <span>${(amountCents / 100).toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted mt-1">100% goes directly to your contractor</p>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
      )}

      <Button type="submit" loading={paying} disabled={!stripe || !elements} className="w-full" size="lg">
        Send ${(amountCents / 100).toFixed(2)} Tip 💝
      </Button>
    </form>
  );
}

export default function TipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [step, setStep] = useState<"choose" | "pay">("choose");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const amountCents = selectedAmount ?? (parseFloat(customAmount) * 100 || 0);

  async function initTip() {
    if (amountCents < 100) {
      setError("Minimum tip is $1.00");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id, amountCents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initialize tip");
      } else {
        setClientSecret(data.clientSecret);
        setStep("pay");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== "consumer") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-muted">Sign in as a consumer to leave a tip.</p>
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
        <h1 className="text-2xl font-bold text-secondary mt-3">Leave a Tip</h1>
        <p className="text-muted text-sm mt-1">Show your appreciation for a job well done.</p>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={100}>
      <Card className="p-6 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300">
        {step === "choose" ? (
          <div className="space-y-6">
            {/* Preset amounts */}
            <div>
              <p className="text-sm font-medium text-secondary mb-3">Choose an amount</p>
              <div className="grid grid-cols-4 gap-2">
                {TIP_PRESETS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setSelectedAmount(amt); setCustomAmount(""); }}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all duration-300 cursor-pointer ${
                      selectedAmount === amt
                        ? "border-primary bg-primary text-white shadow-md"
                        : "border-border text-secondary hover:border-primary/50 hover:shadow-sm hover:-translate-y-0.5"
                    }`}
                  >
                    ${amt / 100}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom amount */}
            <div>
              <p className="text-sm font-medium text-secondary mb-2">Or enter custom amount</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-medium">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}

            <Button
              onClick={initTip}
              loading={loading}
              disabled={amountCents < 100}
              className="w-full"
              size="lg"
            >
              Continue to Payment
            </Button>
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe" } }}
          >
            <TipForm jobId={id} clientSecret={clientSecret} amountCents={amountCents} />
          </Elements>
        ) : null}
      </Card>
      </ScrollReveal>
    </div>
  );
}

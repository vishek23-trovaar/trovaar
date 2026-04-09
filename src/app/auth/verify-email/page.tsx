"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { dashboardPath } from "@/lib/portalRoutes";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Fetch current user email for display, then auto-trigger a code send
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.email) setEmail(data.user.email);
      })
      .catch(() => {});

    // Auto-send a fresh code on page load so dev code surfaces immediately
    // if Resend isn't configured. This is a no-op if a valid code already exists.
    fetch("/api/auth/resend-verification", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.devCode) {
          setDevCode(data.devCode);
          setCode(data.devCode);
        }
        if (data.success) setCooldown(60);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      router.push(dashboardPath(data.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  const handleResend = useCallback(async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      setResendSuccess(true);
      setCooldown(60);
      // Dev mode: server couldn't send email but returned the code directly
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary">Check your email</h1>
          <p className="text-muted mt-2">
            We sent a 6-digit code to{" "}
            {email ? (
              <span className="font-medium text-secondary">{email}</span>
            ) : (
              "your email address"
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}
          {devCode && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-lg">
              <span className="font-semibold">Dev mode</span> — email not configured. Your code has been auto-filled: <span className="font-mono font-bold">{devCode}</span>
            </div>
          )}
          {resendSuccess && !devCode && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-lg">
              A new code has been sent to your email.
            </div>
          )}

          <Input
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            className="text-center text-2xl tracking-widest font-mono"
            required
          />

          <Button type="submit" loading={loading} className="w-full" disabled={code.length !== 6}>
            Verify Email
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted mb-3">Didn&apos;t receive a code?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={resendLoading}
            disabled={cooldown > 0}
            onClick={handleResend}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

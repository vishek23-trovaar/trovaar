"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-secondary">Forgot your password?</h1>
          <p className="text-muted mt-2">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium">Check your email</p>
              <p className="text-green-700 text-sm mt-1">
                If an account exists with that email, you&apos;ll receive reset instructions shortly.
              </p>
            </div>
            <p className="text-sm text-muted">
              Didn&apos;t receive it? Check your spam folder or{" "}
              <button
                onClick={() => { setSubmitted(false); setEmail(""); }}
                className="text-primary font-medium hover:underline cursor-pointer"
              >
                try again
              </button>
              .
            </p>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" aria-live="polite" className="bg-red-50 text-danger text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <Input
              id="email"
              name="email"
              autoComplete="email"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Send Reset Instructions
            </Button>

            <p className="text-center text-sm text-muted">
              Remember your password?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}

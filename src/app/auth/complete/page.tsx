"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { UserRole } from "@/types";
import { dashboardPath } from "@/lib/portalRoutes";

export default function CompleteOAuthPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("consumer");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/oauth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, location }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signup?error=session_expired");
          return;
        }
        throw new Error(data.error || "Failed to complete sign-up");
      }
      router.push(dashboardPath(data.user.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary">One last step</h1>
          <p className="text-muted mt-2">How will you use Trovaar?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}

          {/* Role Selector */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={`p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  role === "consumer"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/30"
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <p className="font-semibold text-sm">Consumer</p>
                <p className="text-xs mt-1 opacity-70">I need work done</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("contractor")}
                className={`p-4 rounded-lg border-2 text-center transition-all cursor-pointer ${
                  role === "contractor"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted hover:border-primary/30"
                }`}
              >
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="font-semibold text-sm">Contractor</p>
                <p className="text-xs mt-1 opacity-70">I do the work</p>
              </button>
            </div>
          </div>

          <Input
            label="Location (optional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, State"
          />

          <Button type="submit" loading={loading} className="w-full">
            Finish Setup
          </Button>
        </form>
      </Card>
    </div>
  );
}

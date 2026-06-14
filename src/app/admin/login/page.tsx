"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { password };
      if (totpRequired && totp) body.totp = totp;

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.replace("/admin");
      } else {
        const data = await res.json() as { error?: string; totpRequired?: boolean };
        if (data.totpRequired) {
          setTotpRequired(true);
          setError("Enter the 6-digit code from your authenticator app.");
        } else {
          setError(data.error ?? "Invalid credentials");
        }
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010102] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#141516] mb-4">
            <span className="text-2xl">🛡️</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Console</h1>
          <p className="text-[#8a8f98] text-sm mt-1">Trovaar Platform</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-[#0f1011] rounded-2xl p-8 shadow-xl border border-[#23252a] space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-[#8a8f98] mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus={!totpRequired}
              disabled={totpRequired}
              className="w-full bg-[#010102] border border-[#23252a] rounded-lg px-4 py-3 text-white placeholder-[#8a8f98] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:opacity-50"
            />
          </div>

          {totpRequired && (
            <div>
              <label className="block text-sm font-medium text-[#8a8f98] mb-2">
                Authenticator Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                autoFocus
                className="w-full bg-[#010102] border border-[#23252a] rounded-lg px-4 py-3 text-white placeholder-[#8a8f98] text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
              />
              <p className="text-[#8a8f98] text-xs mt-1">
                Open your authenticator app and enter the 6-digit code.
              </p>
            </div>
          )}

          {error && (
            <div className={`border text-sm rounded-lg px-4 py-3 ${
              totpRequired && error.includes("Enter the 6-digit")
                ? "bg-blue-900/30 border-blue-700 text-[#60A5FA]"
                : "bg-red-900/40 border-[#f87171]/50 text-[#f87171]"
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password || (totpRequired && totp.length !== 6)}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg text-sm transition-colors"
          >
            {loading ? "Signing in…" : totpRequired ? "Verify Code" : "Sign In"}
          </button>

          {totpRequired && (
            <button
              type="button"
              onClick={() => { setTotpRequired(false); setTotp(""); setError(""); }}
              className="w-full text-[#8a8f98] hover:text-[#8a8f98] text-xs text-center underline"
            >
              Use a different password
            </button>
          )}
        </form>

        <p className="text-center text-xs text-[#8a8f98] mt-6">
          Not an admin?{" "}
          <a href="/" className="text-[#8a8f98] hover:text-[#8a8f98] underline">
            Back to site
          </a>
        </p>
      </div>
    </div>
  );
}

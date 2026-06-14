"use client";
import { useState } from "react";

export default function AdminSetupPage() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage(`✅ ${email} is now an admin. Log out and log back in, then go to /admin`);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage("❌ Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#010102] flex items-center justify-center p-4">
      <div className="bg-[#0f1011] rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#010102] rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f7f8f8]">Admin Setup</h1>
            <p className="text-sm text-[#8a8f98]">One-time admin account promotion</p>
          </div>
        </div>

        {success ? (
          <div className="bg-[#27a644]/10 border border-[#27a644]/30 rounded-xl p-4 text-[#34d399] text-sm">
            {message}
            <div className="mt-4 flex gap-3">
              <a href="/login" className="flex-1 text-center bg-[#010102] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#141516] transition-colors">
                Go to Login
              </a>
              <a href="/admin" className="flex-1 text-center bg-green-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                Go to Admin
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Your account email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#d0d6e0] mb-1">Admin secret</label>
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Enter the admin secret"
                required
                className="w-full border border-[#23252a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
              <p className="text-xs text-[#8a8f98] mt-1">Set in your .env.local as ADMIN_SECRET</p>
            </div>

            {message && (
              <div className="bg-[#f87171]/10 border border-[#f87171]/30 rounded-lg p-3 text-[#f87171] text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#010102] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#141516] transition-colors disabled:opacity-50"
            >
              {loading ? "Promoting..." : "Make Admin"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

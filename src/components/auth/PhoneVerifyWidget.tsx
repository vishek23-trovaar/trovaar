"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Inline phone verification widget.
 * Shows when user.phone_verified === 0.
 * Step 1: confirm phone + click "Send Code"
 * Step 2: enter 6-digit SMS code + click "Verify"
 */
export default function PhoneVerifyWidget({ compact = false }: { compact?: boolean }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<"idle" | "sent" | "done">("idle");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [msg, setMsg] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.phone_verified || dismissed) return null;
  if (!user.phone) return null; // shouldn't happen — phone is required at signup

  async function sendCode() {
    setSending(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user!.phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("sent");
        setMsg("");
      } else {
        setMsg(data.error ?? "Failed to send code");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (code.length !== 6) { setMsg("Enter the 6-digit code"); return; }
    setVerifying(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user!.phone, code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("done");
        await refreshUser();
      } else {
        setMsg(data.error ?? "Invalid code");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setVerifying(false);
    }
  }

  if (step === "done") return null;

  if (compact) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
        <span className="text-lg shrink-0">📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Verify your phone number</p>
          <p className="text-xs text-amber-700 mt-0.5">{user.phone}</p>
          {step === "idle" && (
            <button
              onClick={sendCode}
              disabled={sending}
              className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {sending ? "Sending…" : "Send Verification Code"}
            </button>
          )}
          {step === "sent" && (
            <div className="mt-2 flex gap-2 items-center">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="w-28 px-2 py-1.5 border border-amber-300 rounded-lg text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {verifying ? "Verifying…" : "Verify"}
              </button>
              <button
                onClick={() => { setStep("idle"); setCode(""); }}
                className="text-xs text-amber-600 hover:underline cursor-pointer"
              >
                Resend
              </button>
            </div>
          )}
          {msg && <p className="text-xs text-red-600 mt-1">{msg}</p>}
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600 text-lg leading-none cursor-pointer" aria-label="Dismiss">×</button>
      </div>
    );
  }

  // Full banner variant
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-4 mb-6 shadow-md">
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative flex items-center gap-4">
        <div className="shrink-0 w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-2xl">📱</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Verify your phone to activate your account number</p>
          <p className="text-xs text-orange-100 mt-0.5">{user.phone}</p>
          {step === "idle" && (
            <button
              onClick={sendCode}
              disabled={sending}
              className="mt-2 px-4 py-1.5 bg-white text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-50 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {sending ? "Sending…" : "Send Verification Code →"}
            </button>
          )}
          {step === "sent" && (
            <div className="mt-2 flex gap-2 items-center flex-wrap">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                className="w-28 px-2 py-1.5 rounded-lg text-sm font-mono text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/60"
              />
              <button
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className="px-4 py-1.5 bg-white text-orange-600 text-xs font-bold rounded-lg hover:bg-orange-50 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {verifying ? "Verifying…" : "Verify ✓"}
              </button>
              <button onClick={() => { setStep("idle"); setCode(""); setMsg(""); }} className="text-xs text-orange-100 hover:text-white underline cursor-pointer">
                Resend
              </button>
            </div>
          )}
          {msg && <p className="text-xs text-red-200 mt-1">{msg}</p>}
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-white/60 hover:text-white text-xl leading-none cursor-pointer" aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

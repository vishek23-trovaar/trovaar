"use client";
import { useState } from "react";

interface CallButtonProps {
  jobId: string;
  receiverId: string;
  receiverName: string;
}

export function CallButton({ jobId, receiverId, receiverName }: CallButtonProps) {
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCall() {
    setCalling(true);
    setError(null);
    setCallStatus(null);
    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, receiverId }),
      });
      const data = await res.json() as { status?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Call failed");
        return;
      }
      if (data.status === "no_phone") {
        setError("Add your phone number in settings to make calls");
        return;
      }
      setCallStatus(data.status ?? "initiated");
    } catch {
      setError("Something went wrong");
    } finally {
      setCalling(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCall}
        disabled={calling}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z"
          />
        </svg>
        {calling ? "Calling…" : `Call ${receiverName}`}
      </button>
      {callStatus && (
        <p className="text-xs text-emerald-700 mt-1">
          Call initiated — check your phone.{" "}
          <span className="text-gray-400">This call is recorded for safety.</span>
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

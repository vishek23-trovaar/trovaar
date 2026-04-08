"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onConfirm: () => void;
  className?: string;
}

export default function InlineDeleteButton({ onConfirm, className = "" }: Props) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleClick() {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
        confirming
          ? "bg-red-600 text-white font-semibold"
          : "bg-red-50 text-red-600 hover:bg-red-100"
      } ${className}`}
    >
      {confirming ? "Confirm?" : "Delete"}
    </button>
  );
}

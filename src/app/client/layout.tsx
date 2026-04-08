"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Once confirmed as consumer, latch to true — prevents content flash during navigation
  const confirmedRef = useRef(false);
  if (!loading && user?.role === "consumer") confirmedRef.current = true;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "consumer") { router.replace("/contractor/dashboard"); return; }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        {confirmedRef.current ? children : (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}

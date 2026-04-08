"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  // Once confirmed as contractor, latch to true — prevents content flash during navigation
  const confirmedRef = useRef(false);
  if (!loading && user?.role === "contractor") confirmedRef.current = true;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role !== "contractor") { router.replace("/client/dashboard"); return; }
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

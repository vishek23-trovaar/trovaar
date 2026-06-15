"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function TrovaarIcon() { return <Image src="/trovaar-icon.png" alt="Trovaar" width={39} height={24} className="h-6 w-auto" priority />; }

function BellIcon() {
  return (
    <svg className="w-5 h-5 text-[#8a8f98]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

export default function ClientNavbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-[#0f1011] border-b border-[#23252a] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/client/dashboard" className="flex items-center gap-2">
            <TrovaarIcon />
            <span className="text-xl font-bold text-secondary">Trovaar</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Subscriptions link */}
            <Link
              href="/client/subscriptions"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#8a8f98] hover:text-[#34d399] transition-colors"
            >
              <span>🏠</span> Subscriptions
            </Link>

            {/* Templates link */}
            <Link
              href="/client/templates"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-[#8a8f98] hover:text-[#34d399] transition-colors"
            >
              <span>📋</span> Templates
            </Link>

            {/* Notification bell */}
            <button
              className="p-2 rounded-lg hover:bg-[#141516] transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>

            {/* Post a Job button */}
            <Link
              href="/client/jobs/new"
              className="inline-flex items-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Post a Job
            </Link>

            {/* User avatar */}
            {user && (
              <div className="w-8 h-8 rounded-full bg-[#27a644]/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-[#34d399]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="text-sm text-[#8a8f98] hover:text-[#f87171] transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

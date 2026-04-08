"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function TrovaarIcon() { return <Image src="/trovaar-icon.png" alt="Trovaar" width={36} height={36} className="rounded-xl" />; }

function BellIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Browse Jobs", href: "/contractor/dashboard" },
  { label: "My Bids", href: "/contractor/bids" },
  { label: "Profile", href: "/contractor/profile" },
];

export default function ContractorNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/contractor/dashboard" className="flex items-center gap-2 shrink-0">
            <TrovaarIcon />
            <span className="text-xl font-bold text-secondary">Trovaar</span>
          </Link>

          {/* Center nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <BellIcon />
            </button>

            {/* User avatar */}
            {user && (
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-indigo-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1 pb-2 overflow-x-auto">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

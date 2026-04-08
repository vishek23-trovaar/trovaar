"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/guarantee", label: "Resolution Guarantee" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const currentPage = navItems.find((item) => item.href === pathname);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-secondary mb-2">
            {currentPage?.label ?? "Legal"}
          </h1>
          <p className="text-muted text-sm">Last updated: March 2026</p>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1 mb-10 border-b border-slate-200">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-secondary hover:border-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Page content */}
        <div className="prose prose-slate max-w-none">
          {children}
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 text-sm text-muted">
          {navItems
            .filter((item) => item.href !== pathname)
            .map((item) => (
              <Link key={item.href} href={item.href} className="text-primary hover:underline">
                {item.label}
              </Link>
            ))}
          <Link href="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

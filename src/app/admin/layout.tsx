"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/users", label: "All Users", icon: "👥", exact: true },
  { href: "/admin/consumers", label: "Consumers", icon: "🙋", exact: false },
  { href: "/admin/contractors", label: "Contractors", icon: "🔧", exact: false },
  { href: "/admin/jobs", label: "Jobs", icon: "📋", exact: false },
  { href: "/admin/revenue", label: "Revenue", icon: "💰", exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: "📊", exact: true },
  { href: "/admin/analytics/events", label: "Event Tracking", icon: "📈", exact: false },
  { href: "/admin/categories", label: "Categories", icon: "🏷", exact: false },
  { href: "/admin/verification", label: "Verifications", icon: "✅", exact: false },
  { href: "/admin/background-checks", label: "Background Checks", icon: "🔍", exact: false },
  { href: "/admin/licenses", label: "Licenses", icon: "📋", exact: false },
  { href: "/admin/disputes", label: "Disputes", icon: "⚖️", exact: false },
  { href: "/admin/audit", label: "Audit Log", icon: "📝", exact: false },
  { href: "/admin/notifications", label: "Notifications", icon: "🔔", exact: false },
  { href: "/admin/support", label: "Support", icon: "🎧", exact: false },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: "🔄", exact: false },
  { href: "/admin/tax", label: "1099 Tax", icon: "📄", exact: false },
  { href: "/admin/mobile-app", label: "Mobile App", icon: "📱", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page renders without the sidebar
  if (pathname === "/admin/login") return <>{children}</>;

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Dark sidebar */}
      <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen">
        {/* Logo / title */}
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-lg font-bold text-white tracking-tight">Admin Console</div>
          <div className="text-xs text-slate-400 mt-0.5">Trovaar Platform</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-1 py-1"
          >
            <span>←</span> Back to site
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors px-1 py-1 w-full text-left"
          >
            <span>🚪</span> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}

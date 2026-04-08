"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  read: number;
  created_at: string;
}

function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setUnreadCount(0);
    setNotifications((n) => n.map((x) => ({ ...x, read: 1 })));
  }

  function handleNotifClick(notif: Notification) {
    setOpen(false);
    if (notif.job_id) router.push(`/jobs/${notif.job_id}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen(!open);
          if (!open && unreadCount > 0) markAllRead();
        }}
        className="relative p-2 rounded-lg hover:bg-surface transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-[200] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-semibold text-secondary text-sm">Notifications</p>
            {notifications.some((n) => !n.read) && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline cursor-pointer">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No notifications yet</p>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors cursor-pointer ${!notif.read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">
                      {notif.type === "bid_accepted" ? "🎉" :
                       notif.type === "new_bid"      ? "🏷" :
                       notif.type === "new_message"  ? "💬" :
                       notif.type === "emergency_job" ? "⚡" : "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm ${!notif.read ? "font-semibold text-secondary" : "text-secondary"}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted truncate">{notif.message}</p>
                      <p className="text-xs text-muted/60 mt-0.5">
                        {new Date(notif.created_at).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ href, pathname, exact, children }: { href: string; pathname: string; exact?: boolean; children: React.ReactNode }) {
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        isActive ? "bg-primary/10 text-primary" : "text-muted hover:text-secondary hover:bg-surface"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const isProfileActive = pathname === "/contractor/profile";

  return (
    <header>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md"
    >
      Skip to main content
    </a>
    <nav className="bg-white border-b border-border sticky top-0 z-[1000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/trovaar-icon.png" alt="Trovaar" width={53} height={53} />
            <span className="text-xl font-bold text-secondary">Trovaar</span>
          </Link>

          <div className="flex items-center gap-3">
            {loading ? (
              <div className="w-20 h-8 bg-surface-dark rounded animate-pulse" />
            ) : user ? (
              <>
                {/* ── CLIENT tabs ── */}
                {user.role === "consumer" && (
                  <nav className="hidden sm:flex items-center gap-1">
                    <NavLink href="/client/dashboard" pathname={pathname}>Dashboard</NavLink>
                    <NavLink href="/client/jobs/new" pathname={pathname}>Post a Job</NavLink>
                    <NavLink href="/client/messages" pathname={pathname}>Messages</NavLink>
                  </nav>
                )}

                {/* ── CONTRACTOR tabs ── */}
                {user.role === "contractor" && (
                  <nav className="hidden sm:flex items-center gap-1">
                    <NavLink href="/contractor/dashboard" pathname={pathname}>Browse Jobs</NavLink>
                    <NavLink href="/contractor/bids" pathname={pathname}>My Bids</NavLink>
                    <NavLink href="/contractor/messages" pathname={pathname}>Messages</NavLink>
                    <NavLink href="/contractor/earnings" pathname={pathname}>Earnings</NavLink>
                  </nav>
                )}

                {/* ── ADMIN tabs ── */}
                {(user as unknown as { isAdmin?: boolean }).isAdmin && (
                  <nav className="hidden sm:flex items-center gap-1">
                    <NavLink href="/admin" pathname={pathname} exact>Dashboard</NavLink>
                    <NavLink href="/admin/users" pathname={pathname}>Users</NavLink>
                    <NavLink href="/admin/contractors" pathname={pathname}>Contractors</NavLink>
                    <NavLink href="/admin/jobs" pathname={pathname}>Jobs</NavLink>
                    <NavLink href="/admin/revenue" pathname={pathname}>Revenue</NavLink>
                  </nav>
                )}

                <NotificationBell userId={user.id} />

                {/* ── Avatar + role badge + logout ── */}
                <div className="flex items-center gap-2">
                  {user.role === "contractor" ? (
                    <Link
                      href="/contractor/profile"
                      className={
                        "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all " +
                        (isProfileActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 bg-white")
                      }
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <span className="text-xs font-bold text-primary">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-secondary hidden sm:block">{user.name}</span>
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700 leading-none">Pro</span>
                    </Link>
                  ) : (user as unknown as { isAdmin?: boolean }).isAdmin ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-amber-700">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-secondary hidden sm:block">{user.name}</span>
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 leading-none">Admin</span>
                    </div>
                  ) : (
                    <Link
                      href="/client/profile"
                      className={
                        "flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all " +
                        (pathname === "/client/profile"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 bg-white")
                      }
                    >
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700">{user.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-secondary hidden sm:block">{user.name}</span>
                      <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 leading-none">Client</span>
                    </Link>
                  )}
                  <button onClick={logout} className="text-sm text-muted hover:text-danger transition-colors cursor-pointer whitespace-nowrap" title="Log out">
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <>
                <nav className="hidden sm:flex items-center gap-1 mr-2">
                  <NavLink href="/about" pathname={pathname}>About</NavLink>
                </nav>
                <Link href="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
                <Link href="/signup"><Button size="sm">Sign Up</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    </header>
  );
}

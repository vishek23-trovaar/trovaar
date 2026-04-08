"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  read: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Icon & colour mapping per notification type
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  new_bid:           { icon: "\uD83D\uDCE9", color: "bg-blue-100 text-blue-600" },
  bid_accepted:      { icon: "\uD83C\uDF89", color: "bg-green-100 text-green-600" },
  bid_rejected:      { icon: "\u274C",       color: "bg-red-100 text-red-600" },
  job_completed:     { icon: "\u2705",       color: "bg-emerald-100 text-emerald-600" },
  payment_released:  { icon: "\uD83D\uDCB0", color: "bg-green-100 text-green-700" },
  dispute_opened:    { icon: "\u26A0\uFE0F", color: "bg-amber-100 text-amber-700" },
  dispute_resolved:  { icon: "\u2696\uFE0F", color: "bg-indigo-100 text-indigo-600" },
  message_received:  { icon: "\uD83D\uDCAC", color: "bg-purple-100 text-purple-600" },
  review_received:   { icon: "\u2B50",       color: "bg-yellow-100 text-yellow-700" },
  // fallbacks for legacy notification types already in the DB
  new_message:       { icon: "\uD83D\uDCAC", color: "bg-purple-100 text-purple-600" },
  dispute_filed:     { icon: "\u26A0\uFE0F", color: "bg-amber-100 text-amber-700" },
  completion_request:{ icon: "\uD83D\uDCCB", color: "bg-teal-100 text-teal-600" },
  contractor_cancelled: { icon: "\uD83D\uDEAB", color: "bg-red-100 text-red-600" },
  cancellation_strike:  { icon: "\uD83D\uDEA8", color: "bg-red-100 text-red-700" },
  status_arrived:    { icon: "\uD83D\uDE9A", color: "bg-blue-100 text-blue-600" },
  status_in_progress:{ icon: "\uD83D\uDD27", color: "bg-amber-100 text-amber-600" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? { icon: "\uD83D\uDD14", color: "bg-gray-100 text-gray-600" };
}

// ---------------------------------------------------------------------------
// Time-ago helper
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 30_000; // 30 seconds

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ---- Fetch notifications ----
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        // If unauthorized, just silently stop (user not logged in)
        if (res.status === 401) {
          setLoading(false);
          return;
        }
        throw new Error("fetch failed");
      }
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // ---- Mark all read ----
  async function markAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch {
      // silent
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
        aria-label="Notifications"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="py-8 text-center text-sm text-gray-400">
                Failed to load notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const config = getTypeConfig(n.type);
                const inner = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    {/* Type icon */}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm shrink-0 ${config.color}`}
                    >
                      {config.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 leading-snug truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {/* Unread dot */}
                    {!n.read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                    )}
                  </div>
                );

                return n.job_id ? (
                  <Link
                    key={n.id}
                    href={`/jobs/${n.job_id}`}
                    onClick={() => setOpen(false)}
                    className="block"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

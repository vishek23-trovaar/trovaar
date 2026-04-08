"use client";
import { useState, useEffect, useCallback } from "react";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  target: string;
  sent_at: string;
  sent_by: string | null;
  recipient_count: number;
}

function TargetBadge({ target }: { target: string }) {
  if (target === "consumers") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Consumers</span>;
  if (target === "contractors") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Contractors</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">All Users</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadNotifications = useCallback(() => {
    fetch("/api/admin/notifications")
      .then((r) => r.json())
      .then((d) => { setNotifications(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setErrorMsg("Title and message are required.");
      return;
    }
    setSending(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to send notification.");
      } else {
        setSuccessMsg(`Notification sent to ${data.recipientCount} recipient${data.recipientCount !== 1 ? "s" : ""}.`);
        setTitle("");
        setMessage("");
        setTarget("all");
        loadNotifications();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notification Center</h1>
        <p className="text-slate-500 text-sm mt-1">Broadcast messages to users on the platform</p>
      </div>

      {/* Send Notification Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-5">Send Notification</h2>

        {successMsg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-700 text-sm flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <span>⚠</span>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="notif-title">
              Title
            </label>
            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Platform Maintenance Tonight"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="notif-message">
              Message
            </label>
            <textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message here…"
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={1000}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="notif-target">
              Target Audience
            </label>
            <select
              id="notif-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Users</option>
              <option value="consumers">Consumers Only</option>
              <option value="contractors">Contractors Only</option>
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                "Send Notification"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Notification History</h2>

        {loading ? (
          <div className="flex items-center gap-3 py-6 text-slate-400 text-sm">
            <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            Loading history…
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">🔔</p>
            <p className="font-medium text-slate-500">No notifications sent yet</p>
            <p className="text-sm mt-1">Use the form above to send your first notification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sent At</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Message</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Target</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recipients</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{timeAgo(n.sent_at)}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[160px] truncate">{n.title}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-[240px] truncate">{n.message}</td>
                    <td className="py-3 px-3"><TargetBadge target={n.target} /></td>
                    <td className="py-3 px-3 text-right text-slate-700 font-medium">{n.recipient_count?.toLocaleString() ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

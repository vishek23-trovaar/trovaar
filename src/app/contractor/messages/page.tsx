"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CATEGORY_GROUPS } from "@/lib/constants";

interface Conversation {
  job_id: string;
  job_title: string;
  job_category: string;
  job_status: string;
  other_user_id: string;
  other_user_name: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

function getCategoryIcon(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.categories.some((c) => c.value === value)) return g.icon;
  }
  return "🔧";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ContractorMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalUnread > 0
              ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""}`
              : "Chat with clients after your bid is accepted"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="font-semibold text-gray-800">No conversations yet</p>
          <p className="text-sm text-gray-500 mt-1">
            When a client accepts your bid, you&apos;ll be able to message them here.
          </p>
          <Link
            href="/contractor/dashboard"
            className="inline-block mt-4 px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {conversations.map((conv) => (
              <Link
                key={conv.job_id}
                href={`/jobs/${conv.job_id}`}
                className="flex items-center gap-4 p-4 hover:bg-gray-50/70 transition-colors"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700">
                    {conv.other_user_name.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`font-semibold text-gray-900 truncate ${conv.unread_count > 0 ? "font-bold" : ""}`}>
                      {conv.other_user_name}
                    </p>
                    {conv.last_message_at && (
                      <p className="text-xs text-gray-400 shrink-0">{timeAgo(conv.last_message_at)}</p>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    <span className="mr-1">{getCategoryIcon(conv.job_category)}</span>
                    {conv.job_title}
                  </p>
                  {conv.last_message ? (
                    <p className={`text-xs mt-0.5 truncate ${conv.unread_count > 0 ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                      {conv.last_message}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5 italic">No messages yet — say hello!</p>
                  )}
                </div>

                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

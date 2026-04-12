"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  read: number;
  created_at: string;
  is_mine: boolean;
}

function getCategoryIcon(value: string): string {
  for (const g of CATEGORY_GROUPS) {
    if (g.categories.some((c) => c.value === value)) return g.icon;
  }
  return "\u{1F527}";
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

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function shouldShowDate(curr: string, prev: string | null): boolean {
  if (!prev) return true;
  return new Date(curr).toDateString() !== new Date(prev).toDateString();
}

export default function ClientMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (res.ok) {
        const data = await res.json();
        setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (jobId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/messages/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch { /* silent */ } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // SSE for real-time messages in active conversation, fallback to polling
  useEffect(() => {
    if (!activeJobId) return;
    fetchMessages(activeJobId);

    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      eventSource = new EventSource(`/api/messages/${activeJobId}/stream`);

      eventSource.addEventListener("message", (e) => {
        try {
          const msg = JSON.parse(e.data);
          setMessages((prev) => {
            // Deduplicate — don't add if already present or if it's our temp message
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Replace temp messages from optimistic updates
            const withoutTemp = prev.filter((m) => !m.id.startsWith("temp-") || m.content !== msg.content);
            return [...withoutTemp, msg];
          });
        } catch { /* ignore parse errors */ }
      });

      eventSource.addEventListener("read", () => {
        // Update read status on all sent messages
        setMessages((prev) => prev.map((m) => (m.is_mine ? { ...m, read: 1 } : m)));
      });

      eventSource.addEventListener("typing", () => {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      });

      eventSource.onerror = () => {
        // On SSE error, fall back to polling
        eventSource?.close();
        eventSource = null;
        if (!pollInterval) {
          pollInterval = setInterval(() => fetchMessages(activeJobId), 5000);
        }
      };
    } catch {
      // SSE not supported, use polling
      pollInterval = setInterval(() => fetchMessages(activeJobId), 5000);
    }

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeJobId, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (activeJobId) inputRef.current?.focus();
  }, [activeJobId]);

  const selectConversation = (jobId: string) => {
    setActiveJobId(jobId);
    setMessages([]);
    setShowSidebar(false); // Hide sidebar on mobile
    // Clear unread for this conversation locally
    setConversations((prev) =>
      prev.map((c) => (c.job_id === jobId ? { ...c, unread_count: 0 } : c))
    );
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !activeJobId) return;

    setSending(true);
    setInput("");

    // Optimistic add
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: "",
      sender_name: "You",
      content: text,
      read: 0,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/messages/${activeJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMsg.id ? { ...data.message, is_mine: true, sender_name: "You" } : m))
        );
        // Update last message in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.job_id === activeJobId
              ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setInput(text); // restore input
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConv = conversations.find((c) => c.job_id === activeJobId);
  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  return (
    <div className="h-[calc(100vh-64px)] flex bg-white">
      {/* Sidebar — conversation list */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-[360px] border-r border-gray-200 bg-white`}
      >
        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/80 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
          {totalUnread > 0 && (
            <p className="text-xs text-primary font-medium mt-0.5">
              {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Search placeholder */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-gray-100/80 backdrop-blur-sm rounded-full px-3 py-2 transition-all duration-300 hover:bg-gray-100">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm text-gray-400">Search messages</span>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-semibold text-gray-800 text-sm">No conversations yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Once you accept a bid, you can chat with the contractor here.
              </p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.job_id}
                onClick={() => selectConversation(conv.job_id)}
                className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-all duration-200 text-left ${
                  activeJobId === conv.job_id ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-sm">
                    {conv.other_user_name.charAt(0).toUpperCase()}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                      {conv.other_user_name}
                    </p>
                    {conv.last_message_at && (
                      <p className={`text-[11px] shrink-0 ${conv.unread_count > 0 ? "text-primary font-semibold" : "text-gray-400"}`}>
                        {timeAgo(conv.last_message_at)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    <span className="mr-1">{getCategoryIcon(conv.job_category)}</span>
                    {conv.job_title}
                  </p>
                  {conv.last_message ? (
                    <p className={`text-xs mt-0.5 truncate ${conv.unread_count > 0 ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                      {conv.last_message}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5 italic">No messages yet</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-col flex-1 bg-white`}>
        {!activeJobId ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center bg-gray-50/50">
            <div className="text-center px-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Messages</h2>
              <p className="text-sm text-gray-500 max-w-xs">
                Select a conversation to start chatting with your contractor.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm">
              {/* Back button — mobile only */}
              <button
                onClick={() => { setShowSidebar(true); setActiveJobId(null); }}
                className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {activeConv?.other_user_name.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{activeConv?.other_user_name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {getCategoryIcon(activeConv?.job_category || "")} {activeConv?.job_title}
                </p>
              </div>
              <a
                href={`/jobs/${activeJobId}`}
                className="text-xs text-primary hover:text-primary/80 font-medium px-3 py-1.5 rounded-lg hover:bg-primary/5 transition-colors"
              >
                View Job
              </a>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/30">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm text-gray-500">No messages yet. Say hello!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg, i) => {
                    const prevMsg = i > 0 ? messages[i - 1] : null;
                    const showDate = shouldShowDate(msg.created_at, prevMsg?.created_at || null);
                    const showAvatar = !msg.is_mine && (i === 0 || messages[i - 1]?.is_mine || showDate);
                    const isLast = i === messages.length - 1 || messages[i + 1]?.is_mine !== msg.is_mine;

                    return (
                      <div key={msg.id}>
                        {/* Date separator */}
                        {showDate && (
                          <div className="flex items-center justify-center my-4">
                            <span className="text-[11px] text-gray-400 font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                              {formatDateSeparator(msg.created_at)}
                            </span>
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`flex items-end gap-2 ${msg.is_mine ? "justify-end" : "justify-start"} ${isLast ? "mb-2" : "mb-0.5"}`}>
                          {/* Other user avatar */}
                          {!msg.is_mine && (
                            <div className="w-7 h-7 shrink-0">
                              {showAvatar ? (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                                  {msg.sender_name.charAt(0).toUpperCase()}
                                </div>
                              ) : null}
                            </div>
                          )}

                          <div className={`max-w-[70%] ${msg.is_mine ? "order-1" : ""}`}>
                            <div
                              className={`px-3 py-2 text-sm leading-relaxed ${
                                msg.is_mine
                                  ? "bg-primary text-white rounded-2xl rounded-br-md"
                                  : "bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm border border-gray-100"
                              }`}
                            >
                              {msg.content}
                            </div>
                            {/* Timestamp + read receipt — show on last in group */}
                            {isLast && (
                              <div className={`flex items-center gap-1 mt-1 ${msg.is_mine ? "justify-end mr-1" : "ml-1"}`}>
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(msg.created_at)}
                                </span>
                                {msg.is_mine && (
                                  <span className={`text-[10px] ${msg.read ? "text-primary" : "text-gray-300"}`}>
                                    {msg.read ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex items-end gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                        {activeConv?.other_user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="bg-white text-gray-400 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white/90 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  maxLength={1000}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white focus:border focus:border-primary/30 transition-all disabled:opacity-50 placeholder:text-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

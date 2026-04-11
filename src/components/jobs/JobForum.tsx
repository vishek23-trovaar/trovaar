"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Discussion {
  id: string;
  parent_id: string | null;
  content: string;
  display_name: string;
  user_role: "consumer" | "contractor";
  is_mine: boolean;
  is_owner: boolean;
  created_at: string;
}

interface Props {
  jobId: string;
  jobStatus: string;
  isOwner: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function JobForum({ jobId, jobStatus, isOwner }: Props) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [redactedNotice, setRedactedNotice] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const canPost = ["posted", "bidding", "accepted"].includes(jobStatus);

  const fetchDiscussions = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/discussions`);
      if (res.ok) {
        const data = await res.json();
        setDiscussions(Array.isArray(data.discussions) ? data.discussions : []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDiscussions();
    const interval = setInterval(fetchDiscussions, 15000);
    return () => clearInterval(interval);
  }, [fetchDiscussions]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setRedactedNotice(false);

    try {
      const res = await fetch(`/api/jobs/${jobId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, parent_id: replyTo }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiscussions((prev) => [...prev, data.discussion]);
        setInput("");
        setReplyTo(null);
        if (data.wasRedacted) setRedactedNotice(true);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to post");
      }
    } catch {
      alert("Failed to post. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startReply = (discussionId: string) => {
    setReplyTo(discussionId);
    inputRef.current?.focus();
  };

  // Organize into threads: top-level posts + their replies
  const topLevel = discussions.filter((d) => !d.parent_id);
  const repliesMap = new Map<string, Discussion[]>();
  discussions.filter((d) => d.parent_id).forEach((d) => {
    const arr = repliesMap.get(d.parent_id!) || [];
    arr.push(d);
    repliesMap.set(d.parent_id!, arr);
  });

  const replyToPost = replyTo ? discussions.find((d) => d.id === replyTo) : null;

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5 text-xs text-blue-800">
        <span className="shrink-0 text-sm">💬</span>
        <p>
          <strong>Public Q&A</strong> — All questions and answers are visible to everyone.
          Identities are anonymized to keep the bidding fair. Contact info is automatically removed.
        </p>
      </div>

      {/* Redaction notice */}
      {redactedNotice && (
        <div className="flex items-start gap-2 rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 text-xs text-orange-800">
          <span className="shrink-0 text-sm">✂️</span>
          <p>
            <strong>Contact info was removed</strong> from your message. Phone numbers, emails, and social handles are not allowed to keep the process fair.
          </p>
        </div>
      )}

      {/* Discussion threads */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-3">🙋</div>
          <p className="font-semibold text-gray-800 text-sm">No questions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            {isOwner
              ? "Contractors will ask questions here about your project."
              : "Be the first to ask a question about this job!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((post) => {
            const replies = repliesMap.get(post.id) || [];
            const avatarColor = post.is_owner
              ? "from-blue-500 to-indigo-600"
              : "from-emerald-500 to-teal-600";
            const initial = post.is_owner ? "H" : post.display_name.replace("Contractor #", "C");

            return (
              <div key={post.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Main post */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold ${post.is_mine ? "text-primary" : "text-gray-900"}`}>
                          {post.display_name}
                          {post.is_mine && <span className="text-xs font-normal text-gray-400 ml-1">(you)</span>}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          post.is_owner
                            ? "bg-blue-100 text-blue-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {post.is_owner ? "Homeowner" : "Contractor"}
                        </span>
                        <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
                      </div>

                      {/* Content */}
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>

                      {/* Actions */}
                      {canPost && (
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() => startReply(post.id)}
                            className="text-xs text-gray-400 hover:text-primary font-medium flex items-center gap-1 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            Reply
                          </button>
                          <span className="text-xs text-gray-300">
                            {replies.length > 0 && `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="border-t border-gray-50 bg-gray-50/50">
                    {replies.map((reply) => {
                      const replyAvatarColor = reply.is_owner
                        ? "from-blue-500 to-indigo-600"
                        : "from-emerald-500 to-teal-600";
                      const replyInitial = reply.is_owner ? "H" : reply.display_name.replace("Contractor #", "C");

                      return (
                        <div key={reply.id} className="px-4 py-3 ml-12 border-t border-gray-100 first:border-t-0">
                          <div className="flex items-start gap-2.5">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${replyAvatarColor} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                              {replyInitial}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-semibold ${reply.is_mine ? "text-primary" : "text-gray-900"}`}>
                                  {reply.display_name}
                                  {reply.is_mine && <span className="text-[10px] font-normal text-gray-400 ml-1">(you)</span>}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                  reply.is_owner
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {reply.is_owner ? "Homeowner" : "Contractor"}
                                </span>
                                <span className="text-[10px] text-gray-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Input area */}
      {canPost && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Reply indicator */}
          {replyToPost && (
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-500">
                Replying to <span className="font-semibold">{replyToPost.display_name}</span>
              </p>
              <button
                onClick={() => setReplyTo(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="p-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyTo ? "Write a reply..." : isOwner ? "Answer a question or share details..." : "Ask a question about this job..."}
              disabled={sending}
              maxLength={1000}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all disabled:opacity-50 placeholder:text-gray-400"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-gray-400">
                Press Enter to post &middot; Shift+Enter for new line
              </p>
              <button
                onClick={handleSubmit}
                disabled={sending || !input.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? "Posting..." : replyTo ? "Reply" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

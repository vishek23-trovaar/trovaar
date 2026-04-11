"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import BidCard from "@/components/bids/BidCard";
import { ConsumerSurgeBanner } from "@/components/insights/ConsumerSurgeBanner";
import JobStatusBadge from "@/components/jobs/JobStatusBadge";
import JobStatusTimeline from "@/components/jobs/JobStatusTimeline";
import ImageUploader from "@/components/jobs/ImageUploader";
import { CallButton } from "@/components/calls/CallButton";
import { ReceiptsPanel } from "@/components/jobs/ReceiptsPanel";
import { CollaborationPanel } from "@/components/jobs/CollaborationPanel";
import { ConsumerProtectPanel } from "@/components/jobs/ConsumerProtectPanel";
import { CallLog } from "@/components/calls/CallLog";
import GuaranteeBadge from "@/components/GuaranteeBadge";
import { CATEGORIES, CATEGORY_GROUPS, URGENCY_LEVELS, PLATFORM_MARKUP } from "@/lib/constants";
import { clientScanMessage } from "@/lib/messageScanner";
import { JobWithBidCount, BidWithContractor, JobStatus, Review } from "@/types";
import { distanceMiles, formatDistance } from "@/lib/utils";
import { useBidStream } from "@/hooks/useBidStream";

const JobMap = dynamic(() => import("@/components/map/JobMap"), { ssr: false });
const JobChat = dynamic(() => import("@/components/messaging/JobChat"), { ssr: false });
const AiJobChat = dynamic(() => import("@/components/jobs/AiJobChat"), { ssr: false });
const JobForum = dynamic(() => import("@/components/jobs/JobForum"), { ssr: false });

interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  read: number;
  flagged?: number;
  flag_reasons?: string | null;
  created_at: string;
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  additional_cost_cents: number;
  materials_json: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  contractor_name: string;
  created_at: string;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobWithBidCount | null>(null);
  const [bids, setBids] = useState<BidWithContractor[]>([]);
  const [bidStreamEnabled, setBidStreamEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingReview, setExistingReview] = useState<Review | null | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Contractor review of client
  const [clientReviewExisting, setClientReviewExisting] = useState<Review | null | undefined>(undefined);
  const [clientReviewRating, setClientReviewRating] = useState(0);
  const [clientReviewHover, setClientReviewHover] = useState(0);
  const [clientReviewComment, setClientReviewComment] = useState("");
  const [clientReviewSubmitting, setClientReviewSubmitting] = useState(false);
  const [clientReviewSuccess, setClientReviewSuccess] = useState(false);
  const [clientReviewError, setClientReviewError] = useState("");

  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();

  // Change orders
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [confirmingCompletion, setConfirmingCompletion] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [changeOrderAction, setChangeOrderAction] = useState<Record<string, boolean>>({});

  // Lightbox
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [messageWarnings, setMessageWarnings] = useState<string[]>([]);
  const [messageRedacted, setMessageRedacted] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "qna" | "messages" | "receipts" | "crew">("details");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mandatory rating modal
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Feature 25 — After photo upload
  const [afterPhotoInput, setAfterPhotoInput] = useState("");
  const [afterPhotoUploading, setAfterPhotoUploading] = useState(false);
  const [afterPhotoError, setAfterPhotoError] = useState("");

  // Feature 28 — Neighborhood Group Buying
  const [groupOpportunity, setGroupOpportunity] = useState<{
    id: string;
    participant_count: number;
    category: string;
  } | null>(null);
  const [joinedGroup, setJoinedGroup] = useState(false);

  // No-show reporting
  const [reportingNoShow, setReportingNoShow] = useState(false);
  const [noShowConfirm, setNoShowConfirm] = useState(false);

  // AI Match Scores
  const [matchScores, setMatchScores] = useState<Record<string, { score: number; reasoning: string; highlights: string[]; concerns: string[] }>>({});
  const [matchScoresLoading, setMatchScoresLoading] = useState(false);
  const [bidSortMode, setBidSortMode] = useState<"price" | "match">("price");

  // Feature 20 — Real-time bid stream (hook must be called unconditionally)
  const { bids: liveBids, connected: streamConnected, newBidIds } = useBidStream(id, bidStreamEnabled);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserLat(pos.coords.latitude);
      setUserLng(pos.coords.longitude);
    });
  }, []);

  useEffect(() => {
    fetchJob();
    fetchBids();
    fetchChangeOrders();
  }, [id]);

  // Fetch AI match scores when job owner views bids
  useEffect(() => {
    if (!user || !job || user.id !== job.consumer_id) return;
    if (bids.length === 0) return;
    fetchMatchScores();
  }, [user, job?.id, bids.length]);

  useEffect(() => {
    if (!user || user.role !== "consumer") return;
    async function fetchReview() {
      try {
        const res = await fetch(`/api/reviews?jobId=${id}&type=consumer_to_contractor`);
        if (res.ok) {
          const data = await res.json();
          setExistingReview(data.review || null);
        } else {
          setExistingReview(null);
        }
      } catch {
        setExistingReview(null);
      }
    }
    fetchReview();
  }, [id, user]);

  // Fetch contractor's existing review of client
  useEffect(() => {
    if (!user || user.role !== "contractor") return;
    async function fetchClientReview() {
      try {
        const res = await fetch(`/api/reviews?jobId=${id}&type=contractor_to_consumer`);
        if (res.ok) {
          const data = await res.json();
          setClientReviewExisting(data.review || null);
        } else {
          setClientReviewExisting(null);
        }
      } catch {
        setClientReviewExisting(null);
      }
    }
    fetchClientReview();
  }, [id, user]);

  // Feature 20 — Enable bid stream when job is loaded and user is present
  useEffect(() => {
    if (!job || !user) return;
    const isJobOwner = user.id === job.consumer_id;
    const isContractorUser = user.role === "contractor";
    setBidStreamEnabled(!!(( isJobOwner || isContractorUser) && ["posted", "bidding"].includes(job.status)));
  }, [job, user]);

  // Feature C — Trigger mandatory rating modal when job is completed and no review yet
  useEffect(() => {
    const jobIsOwner = !!(user && job && user.id === job.consumer_id);
    if (job?.status === "completed" && jobIsOwner && existingReview === null) {
      const timer = setTimeout(() => setShowRatingModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [job?.status, job?.consumer_id, user, existingReview]);

  // Feature 28 — Fetch group buying opportunity when job owner views an open job
  useEffect(() => {
    if (!job || !user || user.id !== job.consumer_id) return;
    if (!["posted", "bidding"].includes(job.status)) return;
    const zipMatch = job.location?.match(/\b(\d{5})\b/);
    const zip = zipMatch ? zipMatch[1] : null;
    if (!zip || !job.category) return;
    fetch(`/api/group-jobs?category=${encodeURIComponent(job.category)}&zip=${encodeURIComponent(zip)}`)
      .then(r => r.json())
      .then(d => {
        if (d.groups && d.groups.length > 0) {
          setGroupOpportunity(d.groups[0]);
        }
      })
      .catch(() => {});
  }, [job, user]);

  // Fetch messages when tab switches to messages
  useEffect(() => {
    if (activeTab === "messages" && user) {
      fetchMessages();
    }
  }, [activeTab, user]);

  // Scroll to bottom of messages
  useEffect(() => {
    if (activeTab === "messages") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  async function fetchJob() {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      }
    } catch (err) {
      console.error("Failed to fetch job:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBids() {
    try {
      const res = await fetch(`/api/jobs/${id}/bids`);
      if (res.ok) {
        const data = await res.json();
        setBids(Array.isArray(data.bids) ? data.bids : []);
      }
    } catch (err) {
      console.error("Failed to fetch bids:", err);
    }
  }

  async function fetchMatchScores() {
    if (!user || user.role !== "consumer") return;
    setMatchScoresLoading(true);
    try {
      const res = await fetch(`/api/ai/match-scores?jobId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMatchScores(data.scores || {});
      }
    } catch (err) {
      console.error("Failed to fetch match scores:", err);
    } finally {
      setMatchScoresLoading(false);
    }
  }

  async function fetchChangeOrders() {
    try {
      const res = await fetch(`/api/jobs/${id}/change-order`);
      if (res.ok) {
        const data = await res.json();
        setChangeOrders(data.change_orders || []);
      }
    } catch { /* not critical */ }
  }

  async function handleJoinGroup() {
    if (!groupOpportunity || !job) return;
    try {
      const res = await fetch("/api/group-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_job_id: groupOpportunity.id, job_id: job.id }),
      });
      if (res.ok) {
        setJoinedGroup(true);
      }
    } catch { /* silent */ }
  }

  async function handleAfterPhotoUpload() {
    if (!afterPhotoInput.trim()) return;
    setAfterPhotoUploading(true);
    setAfterPhotoError("");
    try {
      const res = await fetch(`/api/jobs/${id}/after-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ after_photo_url: afterPhotoInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        setAfterPhotoInput("");
      } else {
        const data = await res.json();
        setAfterPhotoError(data.error || "Failed to upload photo");
      }
    } catch {
      setAfterPhotoError("Something went wrong. Please try again.");
    } finally {
      setAfterPhotoUploading(false);
    }
  }

  async function confirmCompletion() {
    setConfirmingCompletion(true);
    try {
      await fetch(`/api/jobs/${id}/confirm`, { method: "POST" });
      fetchJob();
    } finally {
      setConfirmingCompletion(false);
    }
  }

  async function handleChangeOrderAction(orderId: string, action: "approved" | "rejected") {
    setChangeOrderAction((prev) => ({ ...prev, [orderId]: true }));
    try {
      await fetch(`/api/jobs/${id}/change-order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_order_id: orderId,
          action,
          rejection_reason: rejectionReason[orderId] || undefined,
        }),
      });
      fetchChangeOrders();
    } finally {
      setChangeOrderAction((prev) => ({ ...prev, [orderId]: false }));
    }
  }

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/jobs/${id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }

  async function handleBidAction(bidId: string, status: "accepted" | "rejected") {
    // Optimistic update
    setBids((prev) => prev.map((b) => {
      if (b.id === bidId) return { ...b, status };
      if (status === "accepted" && b.status === "pending") return { ...b, status: "rejected" as const };
      return b;
    }));
    if (status === "accepted" && job) {
      setJob({ ...job, status: "accepted" });
    }

    try {
      const res = await fetch(`/api/bids/${bidId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Refresh to get authoritative state
        fetchJob();
        fetchBids();
      } else {
        // Rollback on error
        fetchBids();
        fetchJob();
      }
    } catch (err) {
      console.error("Failed to update bid:", err);
      fetchBids();
      fetchJob();
    }
  }

  async function submitReview() {
    if (!job || reviewRating === 0) {
      setReviewError("Please select a star rating.");
      return;
    }
    const acceptedBid = bids.find((b) => b.status === "accepted");
    if (!acceptedBid) return;

    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          contractorId: acceptedBid.contractor_id,
          rating: reviewRating,
          comment: reviewComment || undefined,
          photos: reviewPhotos,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setReviewError(data.error || "Failed to submit review");
      } else {
        setReviewSuccess(true);
        const data = await res.json();
        setExistingReview(data.review);
      }
    } catch {
      setReviewError("Something went wrong. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  async function submitClientReview() {
    if (!job || clientReviewRating === 0) {
      setClientReviewError("Please select a star rating.");
      return;
    }
    setClientReviewSubmitting(true);
    setClientReviewError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          consumerId: job.consumer_id,
          rating: clientReviewRating,
          comment: clientReviewComment || undefined,
          reviewType: "contractor_to_consumer",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setClientReviewError(data.error || "Failed to submit review");
      } else {
        setClientReviewSuccess(true);
        const data = await res.json();
        setClientReviewExisting(data.review);
      }
    } catch {
      setClientReviewError("Something went wrong. Please try again.");
    } finally {
      setClientReviewSubmitting(false);
    }
  }

  async function handleReportNoShow() {
    setReportingNoShow(true);
    try {
      const res = await fetch(`/api/jobs/${id}/no-show`, { method: "POST" });
      if (res.ok) {
        fetchJob();
        fetchBids();
        setNoShowConfirm(false);
      }
    } catch { /* silent */ }
    finally { setReportingNoShow(false); }
  }

  async function handleStatusUpdate(status: string) {
    if (!job) return;
    setJob({ ...job, status: status as JobStatus });
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
      } else {
        fetchJob();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      fetchJob();
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || messageSending) return;
    setMessageSending(true);
    setMessageRedacted(false);
    const content = messageInput.trim();
    setMessageInput("");
    try {
      const res = await fetch(`/api/jobs/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json() as { message: Message; was_redacted?: boolean };
        setMessages((prev) => [...prev, data.message]);
        if (data.was_redacted) {
          setMessageRedacted(true);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessageInput(content);
    } finally {
      setMessageSending(false);
    }
  }

  function openLightbox(photoSet: string[], index: number) {
    setLightboxSrc(photoSet[index]);
    setLightboxIndex(index);
    setLightboxPhotos(photoSet);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-muted text-lg">Job not found</p>
        <Link href="/client/dashboard">
          <Button variant="ghost" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const photos = JSON.parse(job.photos || "[]") as string[];
  const aiQuestions = job.ai_questions
    ? (JSON.parse(job.ai_questions) as { question: string; answer: string }[]).filter((q) => q.answer?.trim())
    : [];
  const referenceLinks: Array<{ url: string; label: string }> = (() => {
    try { return JSON.parse((job as any).reference_links || "[]"); } catch { return []; }
  })();
  const inspirationPhotos: string[] = (() => {
    try { return JSON.parse((job as any).inspiration_photos || "[]"); } catch { return []; }
  })();
  const hasVisionBoard = referenceLinks.some((l) => l.url.trim()) || inspirationPhotos.length > 0;
  const category = CATEGORIES.find((c) => c.value === job.category);
  const categoryGroup = CATEGORY_GROUPS.find((g) => g.categories.some((c) => c.value === job.category));
  const urgency = URGENCY_LEVELS.find((u) => u.value === job.urgency);
  const isOwner = user?.id === job.consumer_id;
  const isContractor = user?.role === "contractor";
  const canBid = isContractor && ["posted", "bidding"].includes(job.status);
  const alreadyBid = bids.some((b) => b.contractor_id === user?.id);
  const hasAcceptedBid = bids.some((b) => b.status === "accepted");
  const canEdit = isOwner && ["posted", "bidding"].includes(job.status) && !hasAcceptedBid;
  const canMessage = user && (isOwner || (isContractor && (alreadyBid || hasAcceptedBid)));
  const isAssignedContractor = isContractor && bids.some((b) => b.contractor_id === user?.id && b.status === "accepted");
  const acceptedBidForCalls = bids.find((b) => b.status === "accepted");
  // Who should the CallButton call?
  const callReceiverId = isOwner
    ? acceptedBidForCalls?.contractor_id ?? null
    : job.consumer_id;
  const callReceiverName = isOwner
    ? (acceptedBidForCalls as { contractor_name?: string } | undefined)?.contractor_name ?? "Contractor"
    : (job as unknown as { consumer_name?: string }).consumer_name ?? "Client";
  const canCall = !!(canMessage && acceptedBidForCalls && callReceiverId);
  const canViewCalls = !!(isOwner || isAssignedContractor);

  // Bid deadline
  const daysUntilNeeded = job.expected_completion_date
    ? Math.ceil((new Date(job.expected_completion_date + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Sort bids by price or match score
  const sortedBids = [...bids].sort((a, b) => {
    if (bidSortMode === "match" && isOwner && Object.keys(matchScores).length > 0) {
      const scoreA = matchScores[a.contractor_id]?.score ?? 0;
      const scoreB = matchScores[b.contractor_id]?.score ?? 0;
      return scoreB - scoreA; // highest match first
    }
    return a.price - b.price;
  });
  const minPrice = sortedBids.length > 0 ? sortedBids[0].price : 0;
  const maxPrice = sortedBids.length > 0 ? sortedBids[sortedBids.length - 1].price : 0;

  // Use live bids from SSE stream when available, fall back to fetched sorted bids
  const displayBids = liveBids.length > 0
    ? [...liveBids].sort((a, b) => {
        if (bidSortMode === "match" && isOwner && Object.keys(matchScores).length > 0) {
          const scoreA = matchScores[a.contractor_id]?.score ?? 0;
          const scoreB = matchScores[b.contractor_id]?.score ?? 0;
          return scoreB - scoreA;
        }
        return (a.price ?? 0) - (b.price ?? 0);
      })
    : sortedBids;

  // Feature B — reveal logic: accepted bid is revealed once job moves past bidding
  const bidIsRevealed = (bid: BidWithContractor) => {
    if (!isOwner) return true; // contractors always see full info
    if (bid.status === "accepted") return true; // accepted bid is revealed
    return false; // pending/rejected bids during bidding stay anonymous
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 z-[1000] flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl leading-none hover:opacity-70 cursor-pointer"
            onClick={() => setLightboxSrc(null)}
          >
            ×
          </button>
          {lightboxPhotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:opacity-70 cursor-pointer px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const prev = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
                  setLightboxSrc(lightboxPhotos[prev]);
                  setLightboxIndex(prev);
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none hover:opacity-70 cursor-pointer px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const next = (lightboxIndex + 1) % lightboxPhotos.length;
                  setLightboxSrc(lightboxPhotos[next]);
                  setLightboxIndex(next);
                }}
              >
                ›
              </button>
            </>
          )}
          <img
            src={lightboxSrc}
            alt="Photo"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {lightboxPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxSrc(lightboxPhotos[i]); setLightboxIndex(i); }}
                  className={`w-2 h-2 rounded-full cursor-pointer ${i === lightboxIndex ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Back to Jobs */}
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors mb-4">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-base">{categoryGroup?.icon ?? "🔧"}</span>
            <span className="text-sm font-medium text-muted">{category?.label}</span>
            <JobStatusBadge status={job.status as JobStatus} />
            <GuaranteeBadge />
            {job.urgency === "emergency" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                ⚡ Emergency — $100 fee applies
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-secondary">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted mt-2">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <strong>{job.location}</strong>
              {(job as unknown as { location_masked?: boolean }).location_masked && (
                <span className="ml-1 text-xs text-amber-700 italic">
                  — Full address revealed after you accept and payment is secured
                </span>
              )}
            </span>
            <Badge variant={
              job.urgency === "emergency" ? "danger" :
              job.urgency === "high" ? "warning" :
              job.urgency === "medium" ? "info" : "default"
            }>
              {urgency?.label}
            </Badge>
            <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
            {job.expected_completion_date && (
              <span className="flex items-center gap-1">
                📅 Needed by:{" "}
                <strong>{new Date(job.expected_completion_date + "T12:00:00").toLocaleDateString()}</strong>
                {daysUntilNeeded !== null && daysUntilNeeded >= 0 && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    daysUntilNeeded <= 2 ? "bg-red-100 text-red-700" :
                    daysUntilNeeded <= 7 ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {daysUntilNeeded === 0 ? "today" : `${daysUntilNeeded}d left`}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canBid && !alreadyBid && (
            <Link href={`/jobs/${id}/bid`}>
              <Button size="lg">Submit a Bid</Button>
            </Link>
          )}
          {canBid && alreadyBid && (
            <Badge variant="info">Bid Submitted</Badge>
          )}
          {canEdit && (
            <Link href={`/jobs/${id}/edit`}>
              <Button variant="outline" size="sm">✏️ Edit Job</Button>
            </Link>
          )}
          {isOwner && hasAcceptedBid && (
            <span className="text-xs text-muted flex items-center gap-1">
              🔒 Locked — bid accepted
            </span>
          )}
          {hasAcceptedBid && canMessage && (
            <a
              href={isOwner ? "/client/messages" : "/contractor/messages"}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              💬 Messages
            </a>
          )}
        </div>
      </div>

      {/* Status timeline */}
      <Card className="px-4 py-3 mb-6">
        <JobStatusTimeline status={job.status} scheduledArrivalAt={(job as unknown as { scheduled_arrival_at?: string | null }).scheduled_arrival_at} />
      </Card>

      {/* Escrow Status Banner */}
      {hasAcceptedBid && (() => {
        const acceptedBid = bids.find(b => b.status === "accepted");
        const escrowAmount = acceptedBid ? (isOwner ? Math.round(acceptedBid.price * (1 + PLATFORM_MARKUP)) : acceptedBid.price) : 0;
        const escrowDisplay = `$${(escrowAmount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

        if (job.status === "completed") {
          return (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-900 text-sm">Payment Released to Contractor</p>
                <p className="text-xs text-green-700 mt-0.5">
                  {escrowDisplay} has been released from escrow. The job is complete.
                </p>
              </div>
              <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Released</span>
            </div>
          );
        }

        if ((job as any).contractor_confirmed && !((job as any).consumer_confirmed)) {
          return (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold text-amber-900 text-sm">Payment Secured in Escrow</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {escrowDisplay} held securely — awaiting confirmation from both parties before release.
                </p>
              </div>
              <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Pending Confirmation</span>
            </div>
          );
        }

        if (["accepted", "en_route", "arrived", "in_progress"].includes(job.status)) {
          return (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6">
              <span className="text-2xl">🔒</span>
              <div>
                <p className="font-semibold text-blue-900 text-sm">Payment Secured in Escrow</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  💰 {escrowDisplay} held securely in escrow — released when both parties confirm completion.
                </p>
              </div>
              <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">Held</span>
            </div>
          );
        }

        return null;
      })()}

      {/* Consumer surge demand signal — shown to job owner on open/bidding jobs */}
      {isOwner && ["posted", "bidding"].includes(job.status) && (
        <div className="mb-6">
          <ConsumerSurgeBanner category={job.category} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {([
          "details" as const,
          "qna" as const,
          ...(hasAcceptedBid ? ["receipts" as const, "crew" as const] : []),
        ]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors cursor-pointer -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-secondary"
            }`}
          >
            {tab === "details" ? "Details" : tab === "qna" ? "🙋 Q&A" : tab === "receipts" ? "🧾 Receipts" : "🤝 Crew"}
          </button>
        ))}
      </div>

      {/* Post-acceptance messaging prompt */}
      {hasAcceptedBid && canMessage && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 mb-4">
          <span className="text-xl">💬</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">Bid accepted — you can now message your {isOwner ? "contractor" : "client"} directly</p>
            <p className="text-xs text-blue-700 mt-0.5">
              All communication is recorded and documented for your protection. Do not share contact info outside the platform.
            </p>
          </div>
          <a
            href={isOwner ? "/client/messages" : "/contractor/messages"}
            className="shrink-0 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open Messages
          </a>
        </div>
      )}

      {activeTab === "qna" ? (
        /* Public Q&A Forum — pre-acceptance only */
        <JobForum jobId={id} jobStatus={job.status} isOwner={isOwner} />
      ) : activeTab === "receipts" ? (
        /* ── Receipts tab ── */
        <ReceiptsPanel
          jobId={id}
          isContractor={isContractor}
          canUpload={isContractor && !!job && ["accepted","arrived","in_progress","completed"].includes(job.status)}
        />
      ) : activeTab === "crew" ? (
        /* ── Crew / Collaboration tab ── */
        <CollaborationPanel
          jobId={id}
          isLeadContractor={isContractor}
          jobStatus={job.status}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Photos + Description + Bids */}
          <div className="lg:col-span-2 space-y-6">
            {photos.length > 0 && (
              <Card className="overflow-hidden">
                <div className={`grid gap-2 p-2 ${photos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {photos.map((photo, i) => {
                    const isVideo = photo.match(/\.(mp4|mov|webm)$/i);
                    return isVideo ? (
                      <video key={i} src={photo} controls className="w-full rounded-lg max-h-80" />
                    ) : (
                      <img
                        key={i}
                        src={photo}
                        alt={`Project photo ${i + 1}`}
                        className={`w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity ${photos.length === 1 ? "max-h-96" : "h-48"}`}
                        onClick={() => openLightbox(photos, i)}
                      />
                    );
                  })}
                </div>
                {photos.length > 1 && (
                  <p className="text-xs text-muted text-center pb-2">Click any photo to enlarge</p>
                )}
              </Card>
            )}

            {job.description && (
              <Card className="p-6">
                <h2 className="font-semibold text-secondary mb-2">Description</h2>
                <p className="text-muted whitespace-pre-wrap">{job.description}</p>
              </Card>
            )}

            {/* AI Q&A */}
            {aiQuestions.length > 0 && (
              <Card className="p-6 border-violet-100 bg-violet-50/40">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">✨</span>
                  <h2 className="font-semibold text-secondary text-sm">Additional Details</h2>
                  <span className="text-xs text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full ml-auto">AI-assisted</span>
                </div>
                <div className="space-y-3">
                  {aiQuestions.map((q, i) => (
                    <div key={i} className="bg-white rounded-lg border border-violet-100 p-3">
                      <p className="text-xs font-medium text-violet-700 mb-1">{q.question}</p>
                      <p className="text-sm text-secondary">{q.answer}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Vision Board */}
            {hasVisionBoard && (
              <Card className="p-6 border-pink-100 bg-gradient-to-br from-pink-50/50 to-purple-50/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">🎯</span>
                  <h2 className="font-semibold text-secondary text-sm">Vision Board</h2>
                  <span className="text-xs text-pink-500 bg-pink-100 px-2 py-0.5 rounded-full ml-auto font-medium">
                    What the client wants
                  </span>
                </div>

                {/* Reference Links */}
                {referenceLinks.filter((l) => l.url.trim()).length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">🔗 Reference Links</p>
                    <div className="space-y-2">
                      {referenceLinks.filter((l) => l.url.trim()).map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-2 p-2.5 rounded-lg border border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50 transition-colors group"
                        >
                          <span className="text-base flex-shrink-0 mt-0.5">🔗</span>
                          <div className="min-w-0">
                            {link.label && (
                              <p className="text-sm font-medium text-secondary group-hover:text-pink-700 transition-colors truncate">
                                {link.label}
                              </p>
                            )}
                            <p className="text-xs text-muted truncate">{link.url}</p>
                          </div>
                          <svg className="w-3.5 h-3.5 text-muted flex-shrink-0 mt-1 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inspiration Photos */}
                {inspirationPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">📸 Inspiration Photos</p>
                    <div className={`grid gap-2 ${inspirationPhotos.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1"}`}>
                      {inspirationPhotos.map((photo, i) => (
                        <img
                          key={i}
                          src={photo}
                          alt={`Inspiration ${i + 1}`}
                          className="w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity h-40 border border-pink-100"
                          onClick={() => openLightbox(inspirationPhotos, i)}
                        />
                      ))}
                    </div>
                    {inspirationPhotos.length > 1 && (
                      <p className="text-xs text-muted text-center mt-1.5">Click any photo to enlarge</p>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Feature 25 — Before & After Photos */}
            {((job as any).before_photo_url || (job as any).after_photo_url) && (
              <div className="rounded-xl overflow-hidden border border-border">
                <h3 className="font-semibold text-secondary p-4 pb-2">Before &amp; After</h3>
                {(job as any).before_photo_url && (job as any).after_photo_url ? (
                  <div className="grid grid-cols-2 gap-0">
                    <div className="relative">
                      <img
                        src={(job as any).before_photo_url}
                        className="w-full aspect-video object-cover"
                        alt="Before"
                      />
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        Before
                      </span>
                    </div>
                    <div className="relative">
                      <img
                        src={(job as any).after_photo_url}
                        className="w-full aspect-video object-cover"
                        alt="After"
                      />
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        After
                      </span>
                    </div>
                  </div>
                ) : (job as any).before_photo_url ? (
                  <div className="relative px-4 pb-4">
                    <img
                      src={(job as any).before_photo_url}
                      className="w-full aspect-video object-cover rounded-lg"
                      alt="Before"
                    />
                    <span className="absolute bottom-6 left-6 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      Before
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Feature 25 — Upload Completion Photo (assigned contractor) */}
            {isAssignedContractor && !(job as any).after_photo_url && ["accepted", "in_progress", "completed"].includes(job.status) && (
              <div className="bg-surface rounded-xl p-4 border border-border">
                <h3 className="font-semibold text-secondary mb-2">📸 Upload Completion Photo</h3>
                <p className="text-sm text-muted mb-3">Show the client the finished work</p>
                {afterPhotoError && (
                  <p className="text-xs text-danger mb-2">{afterPhotoError}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={afterPhotoInput}
                    onChange={(e) => setAfterPhotoInput(e.target.value)}
                    placeholder="Photo URL (https://...)"
                    className="flex-1 px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm"
                  />
                  <Button
                    size="sm"
                    loading={afterPhotoUploading}
                    disabled={!afterPhotoInput.trim()}
                    onClick={handleAfterPhotoUpload}
                  >
                    Upload
                  </Button>
                </div>
              </div>
            )}

            {/* Change Orders */}
            {changeOrders.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-secondary flex items-center gap-2">
                  🔄 Change Orders
                  <span className="text-xs font-normal text-muted">({changeOrders.length})</span>
                </h2>
                {changeOrders.map((co) => {
                  const materials = co.materials_json ? JSON.parse(co.materials_json) as Array<{ description: string; quantity: number; unit_price_cents: number; subtotal_cents: number }> : [];
                  return (
                    <Card key={co.id} className={`p-5 border-2 ${
                      co.status === "approved" ? "border-green-200 bg-green-50/40" :
                      co.status === "rejected" ? "border-red-200 bg-red-50/40" :
                      "border-amber-200 bg-amber-50/40"
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-secondary">{co.title}</p>
                          <p className="text-xs text-muted">Submitted by {co.contractor_name}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          co.status === "approved" ? "bg-green-100 text-green-700" :
                          co.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {co.status === "pending" ? "⏳ Awaiting Approval" :
                           co.status === "approved" ? "✅ Approved" : "❌ Rejected"}
                        </span>
                      </div>

                      <p className="text-sm text-secondary mb-3">{co.description}</p>

                      {materials.length > 0 && (
                        <div className="rounded-lg border border-border overflow-hidden mb-3">
                          <table className="w-full text-xs">
                            <thead className="bg-surface">
                              <tr className="text-muted">
                                <th className="text-left px-3 py-1.5">Item</th>
                                <th className="text-center px-2 py-1.5">Qty</th>
                                <th className="text-right px-3 py-1.5">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {materials.map((m, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-3 py-1.5 text-secondary">{m.description}</td>
                                  <td className="px-2 py-1.5 text-center text-muted">{m.quantity}</td>
                                  <td className="px-3 py-1.5 text-right font-medium">${(m.subtotal_cents / 100).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {co.additional_cost_cents > 0 && (
                        <p className="text-sm font-semibold text-amber-800 mb-3">
                          Additional Cost: +${(co.additional_cost_cents / 100).toFixed(2)}
                        </p>
                      )}

                      {co.status === "rejected" && co.rejection_reason && (
                        <p className="text-xs text-red-700 bg-red-50 rounded px-3 py-2 mb-3">
                          Rejection reason: {co.rejection_reason}
                        </p>
                      )}

                      {/* Consumer approve/reject buttons */}
                      {isOwner && co.status === "pending" && (
                        <div className="space-y-2">
                          <textarea
                            value={rejectionReason[co.id] || ""}
                            onChange={(e) => setRejectionReason((prev) => ({ ...prev, [co.id]: e.target.value }))}
                            placeholder="Reason for rejection (optional)"
                            rows={2}
                            className="w-full text-sm px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              loading={changeOrderAction[co.id]}
                              onClick={() => handleChangeOrderAction(co.id, "approved")}
                            >
                              ✅ Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                              loading={changeOrderAction[co.id]}
                              onClick={() => handleChangeOrderAction(co.id, "rejected")}
                            >
                              ❌ Reject
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Feature 28 — Neighborhood Group Buying Banner */}
            {isOwner && groupOpportunity && !joinedGroup && ["posted", "bidding"].includes(job.status) && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">🤝</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-teal-900 text-sm">Group Discount Available!</h4>
                    <p className="text-sm text-teal-700 mt-0.5">
                      {groupOpportunity.participant_count} neighbor{groupOpportunity.participant_count !== 1 ? "s" : ""} in your area {groupOpportunity.participant_count !== 1 ? "are" : "is"} also looking for {CATEGORIES.find(c => c.value === groupOpportunity.category)?.label || groupOpportunity.category.replace(/_/g, " ")} work. Bundle together for a potential 10–20% group discount.
                    </p>
                    <button
                      onClick={handleJoinGroup}
                      className="mt-2 px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700 cursor-pointer"
                    >
                      Join Group ({groupOpportunity.participant_count + 1} total)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isOwner && joinedGroup && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <p className="text-sm text-teal-800">✅ You&apos;ve joined the group! Contractors will see your bundled request.</p>
              </div>
            )}

            {/* Feature B — "Your Pro is Confirmed" card (Uber-style) shown once bid accepted */}
            {isOwner && job.status !== "posted" && job.status !== "bidding" && (() => {
              const acceptedBid = bids.find(b => b.status === "accepted");
              if (!acceptedBid) return null;
              return (
                <Card className="p-5 border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✅</span>
                    <h3 className="font-semibold text-secondary">Your Pro is Confirmed</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link href={`/profile/${acceptedBid.contractor_id}`}>
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer shrink-0">
                        {acceptedBid.contractor_photo ? (
                          <img src={acceptedBid.contractor_photo} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-primary">{acceptedBid.contractor_name?.charAt(0)?.toUpperCase()}</span>
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${acceptedBid.contractor_id}`} className="font-bold text-secondary hover:text-primary text-base">
                        {acceptedBid.contractor_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {acceptedBid.contractor_rating > 0 && (
                          <span className="flex items-center gap-1 text-sm font-semibold">
                            <span className="text-amber-400">★</span> {acceptedBid.contractor_rating.toFixed(1)}
                          </span>
                        )}
                        {(acceptedBid.contractor_completed_jobs ?? 0) > 0 && (
                          <span className="text-xs text-muted">· {acceptedBid.contractor_completed_jobs} jobs completed</span>
                        )}
                        {acceptedBid.contractor_verification_status === "approved" && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-0.5">${((isOwner ? Math.round(acceptedBid.price * (1 + PLATFORM_MARKUP)) : acceptedBid.price) / 100).toFixed(2)} · {acceptedBid.timeline_days} day{acceptedBid.timeline_days !== 1 ? "s" : ""}</p>
                    </div>
                    <button
                      onClick={() => setActiveTab("messages")}
                      className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
                    >
                      💬 Message
                    </button>
                  </div>
                  {isOwner && job.status === "accepted" && (
                    <div className="mt-4 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <span className="text-base shrink-0 mt-0.5">🔒</span>
                      <p className="text-sm text-emerald-800">
                        Your payment of <strong>${((Math.round(acceptedBid.price * (1 + PLATFORM_MARKUP))) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> is now held in escrow. Funds will be released to the contractor once you confirm the job is complete.
                      </p>
                    </div>
                  )}
                </Card>
              );
            })()}

            {/* JobChat — shown when job is accepted or completed and user is consumer or accepted contractor */}
            {(["accepted", "en_route", "arrived", "in_progress", "completed"].includes(job.status)) &&
              (isOwner || isAssignedContractor) && (
              <div className="mt-4">
                <JobChat
                  jobId={id}
                  otherPartyLabel={isOwner
                    ? (bids.find(b => b.status === "accepted") as { contractor_name?: string } | undefined)?.contractor_name ?? "Contractor"
                    : "Client"
                  }
                />
              </div>
            )}

            {/* No-Show Reporting — shown to consumer when job has an accepted contractor */}
            {isOwner && ["accepted", "arrived"].includes(job.status) && (
              <div className="mt-2">
                {!noShowConfirm ? (
                  <button
                    onClick={() => setNoShowConfirm(true)}
                    className="text-xs text-muted hover:text-danger transition-colors cursor-pointer underline"
                  >
                    Contractor didn&apos;t show up?
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-2">
                    <p className="text-sm font-semibold text-red-800 mb-1">Report No-Show?</p>
                    <p className="text-xs text-red-700 mb-3">
                      This will reopen your job for new bids and issue a strike to the contractor. Only use this if they genuinely didn&apos;t show up.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleReportNoShow}
                        disabled={reportingNoShow}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                      >
                        {reportingNoShow ? "Reporting…" : "Yes, Report No-Show"}
                      </button>
                      <button
                        onClick={() => setNoShowConfirm(false)}
                        className="px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-surface cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Escrow Trust Banner — shown to job owner when viewing bids */}
            {isOwner && ["posted", "bidding"].includes(job.status) && displayBids.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 mb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-900 text-sm">Your Payment is Protected</h3>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      When you accept a bid, your payment is held in secure escrow.
                      Funds are <strong>only</strong> released after you confirm the job is complete.
                      You&apos;re always in control.
                    </p>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Escrow Protected
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Escrow Timeline — shown when job has accepted bid or is in progress */}
            {isOwner && hasAcceptedBid && ["accepted", "en_route", "arrived", "in_progress", "completed"].includes(job.status) && (
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 mb-2">
                <h3 className="font-semibold text-blue-900 text-sm mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Escrow Payment Timeline
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-0">
                  {/* Step 1 */}
                  <div className="flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 flex-1 text-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      &#10003;
                    </div>
                    <div className="sm:mt-1">
                      <p className="text-xs font-semibold text-emerald-700">Bid Accepted</p>
                      <p className="text-[10px] text-emerald-600">Payment secured in escrow</p>
                    </div>
                  </div>
                  {/* Connector */}
                  <div className="hidden sm:flex items-center flex-shrink-0 pt-4">
                    <div className={`w-8 h-0.5 ${["in_progress", "arrived", "en_route", "completed"].includes(job.status) ? "bg-emerald-400" : "bg-blue-200"}`} />
                  </div>
                  {/* Step 2 */}
                  <div className="flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 flex-1 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      ["in_progress", "arrived", "en_route", "completed"].includes(job.status)
                        ? "bg-emerald-500 text-white"
                        : "bg-blue-200 text-blue-600"
                    }`}>
                      {["in_progress", "arrived", "en_route", "completed"].includes(job.status) ? "\u2713" : "2"}
                    </div>
                    <div className="sm:mt-1">
                      <p className={`text-xs font-semibold ${["in_progress", "arrived", "en_route", "completed"].includes(job.status) ? "text-emerald-700" : "text-blue-600"}`}>Work in Progress</p>
                      <p className={`text-[10px] ${["in_progress", "arrived", "en_route", "completed"].includes(job.status) ? "text-emerald-600" : "text-blue-500"}`}>Funds held safely</p>
                    </div>
                  </div>
                  {/* Connector */}
                  <div className="hidden sm:flex items-center flex-shrink-0 pt-4">
                    <div className={`w-8 h-0.5 ${job.status === "completed" ? "bg-emerald-400" : "bg-blue-200"}`} />
                  </div>
                  {/* Step 3 */}
                  <div className="flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 flex-1 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      job.status === "completed" ? "bg-emerald-500 text-white" : "bg-blue-200 text-blue-600"
                    }`}>
                      {job.status === "completed" ? "\u2713" : "3"}
                    </div>
                    <div className="sm:mt-1">
                      <p className={`text-xs font-semibold ${job.status === "completed" ? "text-emerald-700" : "text-blue-600"}`}>You Confirm</p>
                      <p className={`text-[10px] ${job.status === "completed" ? "text-emerald-600" : "text-blue-500"}`}>Funds released to pro</p>
                    </div>
                  </div>
                  {/* Connector */}
                  <div className="hidden sm:flex items-center flex-shrink-0 pt-4">
                    <div className={`w-8 h-0.5 ${job.status === "completed" ? "bg-emerald-400" : "bg-blue-200"}`} />
                  </div>
                  {/* Step 4 */}
                  <div className="flex sm:flex-col items-start sm:items-center gap-2 sm:gap-1 flex-1 text-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                      job.status === "completed" && existingReview ? "bg-emerald-500 text-white" : "bg-blue-200 text-blue-600"
                    }`}>
                      {job.status === "completed" && existingReview ? "\u2713" : "4"}
                    </div>
                    <div className="sm:mt-1">
                      <p className={`text-xs font-semibold ${job.status === "completed" && existingReview ? "text-emerald-700" : "text-blue-600"}`}>Leave a Review</p>
                      <p className={`text-[10px] ${job.status === "completed" && existingReview ? "text-emerald-600" : "text-blue-500"}`}>Rate your experience</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Post-Acceptance Escrow Confirmation Banner */}
            {isOwner && job.status === "accepted" && hasAcceptedBid && (() => {
              const acceptedBid = bids.find(b => b.status === "accepted");
              const escrowTotal = acceptedBid ? Math.round(acceptedBid.price * (1 + PLATFORM_MARKUP)) : 0;
              const escrowStr = `$${(escrowTotal / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
              return (
                <div className="rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-green-50 p-5 mb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xl">
                      &#127881;
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900 text-sm">Bid Accepted! Your payment of {escrowStr} is now secured.</h3>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        Your money is held in escrow and will <strong>only</strong> be released when you confirm the job is done to your satisfaction.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Bids Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-semibold text-secondary">Bids ({displayBids.length})</h2>
                {streamConnected && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                )}
                {matchScoresLoading && isOwner && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Computing match scores...
                  </span>
                )}
                {displayBids.length > 1 && (
                  <div className="flex items-center gap-2 ml-auto">
                    {isOwner && Object.keys(matchScores).length > 0 && (
                      <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                        <button
                          onClick={() => setBidSortMode("price")}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            bidSortMode === "price" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Sort by Price
                        </button>
                        <button
                          onClick={() => setBidSortMode("match")}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            bidSortMode === "match" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          Sort by Match
                        </button>
                      </div>
                    )}
                    {!isOwner && (
                      <span className="text-xs text-muted">Sorted by price ↑</span>
                    )}
                  </div>
                )}
              </div>
              {displayBids.length === 0 ? (
                <Card className="p-10 text-center">
                  <div className="text-4xl mb-3">🏷</div>
                  <p className="font-medium text-secondary mb-1">No bids yet</p>
                  <p className="text-sm text-muted">
                    {isOwner ? "Contractors will submit bids here once they see your job." : "Be the first contractor to bid!"}
                  </p>
                  {canBid && !alreadyBid && (
                    <Link href={`/jobs/${id}/bid`} className="mt-4 inline-block">
                      <Button>Submit a Bid</Button>
                    </Link>
                  )}
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayBids.map((bid, bidIdx) => {
                    const isNew = newBidIds.has(bid.id);
                    return (
                      <div
                        key={bid.id}
                        className={`transition-colors duration-500 rounded-xl ${isNew ? "ring-2 ring-emerald-300" : ""}`}
                      >
                        <BidCard
                          bid={bid as BidWithContractor}
                          isConsumer={isOwner}
                          isEmergency={job.urgency === "emergency"}
                          onAccept={(bidId) => handleBidAction(bidId, "accepted")}
                          onReject={(bidId) => handleBidAction(bidId, "rejected")}
                          revealed={bidIsRevealed(bid as BidWithContractor)}
                          bidIndex={bidIdx + 1}
                          matchScore={isOwner ? matchScores[bid.contractor_id] || null : null}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Review Form */}
            {isOwner && job.status === "completed" && existingReview === null && !reviewSuccess && (
              <Card className="p-6">
                <h2 className="font-semibold text-secondary mb-4">Leave a Review</h2>
                {reviewError && (
                  <div className="bg-red-50 text-danger text-sm p-3 rounded-lg mb-4">{reviewError}</div>
                )}
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="text-3xl transition-colors cursor-pointer"
                    >
                      {star <= (reviewHover || reviewRating) ? "★" : "☆"}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted self-center">
                    {reviewRating > 0 ? ["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating] : "Select rating"}
                  </span>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about your experience (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted mb-4"
                />
                <div className="mb-4">
                  <p className="text-sm font-medium text-secondary mb-2">Photos of completed work (optional)</p>
                  <ImageUploader images={reviewPhotos} onImagesChange={setReviewPhotos} />
                </div>
                <Button onClick={submitReview} loading={reviewSubmitting} disabled={reviewRating === 0}>
                  Submit Review
                </Button>
              </Card>
            )}

            {isOwner && job.status === "completed" && (reviewSuccess || (existingReview && existingReview !== null)) && (
              <Card className="p-6">
                <div className="flex items-center gap-2 text-success">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">Review submitted — thank you!</p>
                </div>
                {existingReview && (
                  <div className="mt-2 text-sm text-muted">
                    <span>{"★".repeat(existingReview.rating)}{"☆".repeat(5 - existingReview.rating)}</span>
                    {existingReview.comment && <p className="mt-1">{existingReview.comment}</p>}
                  </div>
                )}
              </Card>
            )}

            {/* Contractor Review of Client Form */}
            {isAssignedContractor && job.status === "completed" && clientReviewExisting === null && !clientReviewSuccess && (
              <Card className="p-6">
                <h2 className="font-semibold text-secondary mb-1">Rate this Client</h2>
                <p className="text-sm text-muted mb-4">
                  How was your experience working with{" "}
                  <strong>{(job as unknown as { consumer_name?: string }).consumer_name ?? "this client"}</strong>?
                </p>
                {clientReviewError && (
                  <div className="bg-red-50 text-danger text-sm p-3 rounded-lg mb-4">{clientReviewError}</div>
                )}
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setClientReviewRating(star)}
                      onMouseEnter={() => setClientReviewHover(star)}
                      onMouseLeave={() => setClientReviewHover(0)}
                      className="text-3xl transition-colors cursor-pointer"
                    >
                      {star <= (clientReviewHover || clientReviewRating) ? "★" : "☆"}
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-muted self-center">
                    {clientReviewRating > 0 ? ["", "Poor", "Fair", "Good", "Great", "Excellent"][clientReviewRating] : "Select rating"}
                  </span>
                </div>
                <textarea
                  value={clientReviewComment}
                  onChange={(e) => setClientReviewComment(e.target.value)}
                  placeholder="How was communication, payment, access to the site, etc.? (optional)"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted mb-4"
                />
                <Button onClick={submitClientReview} loading={clientReviewSubmitting} disabled={clientReviewRating === 0}>
                  Submit Client Review
                </Button>
              </Card>
            )}

            {isAssignedContractor && job.status === "completed" && (clientReviewSuccess || (clientReviewExisting && clientReviewExisting !== null)) && (
              <Card className="p-6">
                <div className="flex items-center gap-2 text-success">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">Client review submitted — thank you!</p>
                </div>
                {clientReviewExisting && (
                  <div className="mt-2 text-sm text-muted">
                    <span>{"★".repeat(clientReviewExisting.rating)}{"☆".repeat(5 - clientReviewExisting.rating)}</span>
                    {clientReviewExisting.comment && <p className="mt-1">{clientReviewExisting.comment}</p>}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

            {/* Consumer Price Protection — shown to job owner while job is open */}
            {isOwner && ["posted", "bidding", "accepted"].includes(job.status) && (
              <ConsumerProtectPanel
                jobId={id}
                category={job.category}
                title={job.title}
                description={job.description ?? ""}
                location={job.location ?? ""}
                bids={bids.map((b) => ({ price: b.price, status: b.status }))}
              />
            )}

            {/* AI Project Assistant — shown to job owner for open jobs */}
            {isOwner && ["posted", "bidding"].includes(job.status) && job.title && job.description && (
              <AiJobChat
                jobId={id}
                jobTitle={job.title}
                jobDescription={job.description}
                jobCategory={job.category}
              />
            )}

            {/* Price Range */}
            {bids.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold text-secondary mb-3">Bid Range</h3>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-muted">Lowest</p>
                    <p className="text-xl font-bold text-success">${(minPrice / 100).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted">Highest</p>
                    <p className="text-xl font-bold text-muted">${(maxPrice / 100).toFixed(2)}</p>
                  </div>
                </div>
                <div className="h-2 bg-surface-dark rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-success to-primary rounded-full" style={{ width: "100%" }} />
                </div>
                <p className="text-xs text-muted mt-2 text-center">{bids.length} bid{bids.length !== 1 ? "s" : ""} submitted</p>
              </Card>
            )}

            {/* Pay Now → routes to checkout/disclaimer first */}
            {isOwner && job.status === "accepted" && job.payment_status !== "paid" && (
              <Card className="p-6 border-primary/30 bg-primary/5">
                <h3 className="font-semibold text-secondary mb-1">Payment Required</h3>
                <p className="text-sm text-muted mb-3">
                  Pay now to confirm the job and secure your contractor. Funds are held securely until work is complete.
                </p>
                <Link href={`/jobs/${id}/checkout`}>
                  <Button className="w-full" size="lg">💳 Pay Now</Button>
                </Link>
              </Card>
            )}
            {isOwner && job.payment_status === "failed" && (
              <Card className="p-4 border-red-300 bg-red-50">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="text-lg shrink-0">⚠️</span>
                  <div>
                    <p className="font-semibold text-sm">Payment Failed</p>
                    <p className="text-xs text-red-600">
                      Your payment could not be processed. Please try again with a different payment method.
                    </p>
                  </div>
                </div>
                <Link href={`/jobs/${id}/checkout`}>
                  <Button className="w-full mt-3" size="lg" variant="danger">Retry Payment</Button>
                </Link>
              </Card>
            )}
            {isOwner && job.payment_status === "paid" && (
              <Card className="p-4 border-green-200 bg-green-50">
                <div className="flex items-center gap-2 text-green-700">
                  <span className="text-lg shrink-0">🔒</span>
                  <div>
                    <p className="font-semibold text-sm">Payment Secured in Escrow</p>
                    <p className="text-xs text-green-600">
                      {job.status === "completed"
                        ? "Funds have been released to the contractor"
                        : "Funds held securely — released when you confirm completion"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Job Progress — contractor side (en-route + completion flow) */}
            {isContractor && bids.some((b) => b.contractor_id === user?.id && b.status === "accepted") && ["accepted", "arrived", "in_progress"].includes(job.status) && (
              <Card className="p-6">
                <h3 className="font-semibold text-secondary mb-3">Job Progress</h3>

                {/* Schedule Arrival — shown when job is accepted */}
                {job.status === "accepted" && (
                  <ScheduleArrivalBlock jobId={id} onScheduled={fetchJob} />
                )}

                {/* Scheduled — show confirmation + start work */}
                {job.status === "arrived" && (
                  <div>
                    <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4">
                      <span className="text-xl">📅</span>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Arrival Scheduled</p>
                        {(job as unknown as { scheduled_arrival_at?: string | null }).scheduled_arrival_at && (
                          <p className="text-sm text-indigo-700 mt-0.5">
                            {new Date((job as unknown as { scheduled_arrival_at: string }).scheduled_arrival_at).toLocaleString("en-US", {
                              weekday: "long", month: "long", day: "numeric",
                              hour: "numeric", minute: "2-digit",
                            })}
                          </p>
                        )}
                        <p className="text-xs text-indigo-600 mt-1">Client has been notified of your arrival time.</p>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={async () => {
                        await fetch(`/api/jobs/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "in_progress" }) });
                        fetchJob();
                      }}
                    >
                      🔧 Start Work
                    </Button>
                  </div>
                )}

                {/* Submit Completion */}
                {job.status === "in_progress" && (
                  <>
                    {!(job as any).contractor_confirmed ? (
                      <>
                        <p className="text-sm text-muted mb-3">
                          When you&apos;ve finished the work, submit a completion request for the consumer to confirm.
                        </p>
                        <Button className="w-full" loading={confirmingCompletion} onClick={confirmCompletion}>
                          ✅ Submit Completion
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                        <span>⏳</span>
                        <p className="text-sm font-medium">Waiting for consumer confirmation</p>
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}

            {/* Completion confirmation — consumer side */}
            {isOwner && !!(job as any).contractor_confirmed && !((job as any).consumer_confirmed) && job.status !== "completed" && (
              <Card className="p-6 border-green-200 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🎉</span>
                  <h3 className="font-semibold text-green-900">Contractor Marked Complete</h3>
                </div>
                <p className="text-sm text-green-800 mb-4">
                  Your contractor says the work is done. Please confirm to release payment.
                </p>
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" loading={confirmingCompletion} onClick={confirmCompletion}>
                  ✅ Confirm & Release Payment
                </Button>
                <p className="text-xs text-green-700 mt-2 text-center">
                  Not satisfied? <Link href={`/jobs/${id}/dispute`} className="underline">Report a problem</Link> instead.
                </p>
              </Card>
            )}

            {/* Change order button — contractor */}
            {isContractor && bids.some((b) => b.contractor_id === user?.id && b.status === "accepted") && ["accepted", "in_progress"].includes(job.status) && (
              <Link href={`/jobs/${id}/change-order/new`}>
                <Button variant="outline" size="sm" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                  🔄 Submit Change Order
                </Button>
              </Link>
            )}

            {/* Tip */}
            {isOwner && job.status === "completed" && (
              <Card className="p-6 text-center">
                <div className="text-3xl mb-2">💝</div>
                <h3 className="font-semibold text-secondary mb-1">Leave a Tip</h3>
                <p className="text-xs text-muted mb-3">Show your appreciation — 100% goes to your contractor.</p>
                <Link href={`/jobs/${id}/tip`}>
                  <Button variant="outline" size="sm" className="w-full">Send a Tip</Button>
                </Link>
              </Card>
            )}

            {/* Report a Problem / File Dispute */}
            {(isOwner || isAssignedContractor) && ["accepted", "in_progress", "completed"].includes(job.status) && (
              <Link href={`/jobs/${id}/dispute`}>
                <button className="w-full text-sm text-red-500 hover:text-red-700 transition-colors underline-offset-2 hover:underline cursor-pointer py-2 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  File a Dispute
                </button>
              </Link>
            )}

            {/* Location Map */}
            {job.latitude != null && job.longitude != null && (
              <Card className="overflow-hidden">
                <div style={{ height: 200 }}>
                  <JobMap
                    jobs={[job]}
                    center={[job.latitude, job.longitude]}
                    zoom={13}
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-sm text-muted">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium text-secondary">{job.location}</span>
                  </div>
                  {userLat != null && userLng != null && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span className="font-semibold text-emerald-600">
                        {formatDistance(distanceMiles(userLat, userLng, job.latitude, job.longitude))} from you
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Posted By */}
            <Card className="p-6">
              <h3 className="font-semibold text-secondary mb-2">Posted By</h3>
              <p className="text-muted">{job.consumer_name}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Feature C — Mandatory Rating Modal */}
      {showRatingModal && isOwner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎉</div>
              <h2 className="text-xl font-bold text-secondary">Job Complete!</h2>
              <p className="text-muted text-sm mt-2">
                Help the next homeowner — rate your experience with <strong>{bids.find(b => b.status === "accepted")?.contractor_name ?? "your contractor"}</strong>.
              </p>
            </div>

            {reviewError && (
              <div className="bg-red-50 text-danger text-sm p-3 rounded-lg mb-4">{reviewError}</div>
            )}

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  onMouseEnter={() => setReviewHover(star)}
                  onMouseLeave={() => setReviewHover(0)}
                  className="text-4xl transition-transform hover:scale-110 cursor-pointer"
                >
                  <span className={(reviewHover || reviewRating) >= star ? "text-amber-400" : "text-slate-200"}>★</span>
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="What did they do well? (optional)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white text-secondary placeholder-muted text-sm mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2.5 text-sm text-muted hover:text-secondary border border-border rounded-lg transition-colors cursor-pointer"
              >
                Skip for now
              </button>
              <button
                disabled={reviewRating === 0 || reviewSubmitting}
                onClick={async () => {
                  await submitReview();
                  setShowRatingModal(false);
                }}
                className="flex-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {reviewSubmitting ? "Submitting…" : reviewRating === 0 ? "Select stars to submit" : `Submit ${reviewRating}★ Review`}
              </button>
            </div>

            {reviewRating === 0 && (
              <p className="text-xs text-center text-muted mt-3">Please select at least 1 star to submit</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Schedule Arrival Block ────────────────────────────────────────────────────
function ScheduleArrivalBlock({ jobId, onScheduled }: { jobId: string; onScheduled: () => void }) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [err, setErr] = useState("");

  // Default to tomorrow at 9 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const minDateTime = new Date().toISOString().slice(0, 16);
  const defaultDateTime = tomorrow.toISOString().slice(0, 16);

  async function submit() {
    if (!scheduledAt) { setErr("Please select a date and time."); return; }
    setErr("");
    setScheduling(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "arrived", scheduled_at: new Date(scheduledAt).toISOString() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed");
      }
      onScheduled();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setScheduling(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Set your scheduled arrival date and time — the client will be notified immediately.
      </p>
      {err && <p className="text-xs text-danger bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div>
        <label className="block text-xs font-medium text-secondary mb-1">Arrival Date &amp; Time</label>
        <input
          type="datetime-local"
          defaultValue={defaultDateTime}
          min={minDateTime}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-secondary"
        />
      </div>
      <Button
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        loading={scheduling}
        onClick={submit}
      >
        📅 Confirm Arrival Schedule
      </Button>
    </div>
  );
}

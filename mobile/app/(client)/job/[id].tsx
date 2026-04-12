import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Job, Bid, Message } from "@/lib/types";
import { colors, typography, spacing, radius, shadows, getStatusColor, getUrgencyColor, getCategoryIcon } from '../../../lib/theme';


const URGENCY_COLORS: Record<string, string> = {
  low: "#64748b",
  medium: "#2563eb",
  high: "#d97706",
  emergency: "#dc2626",
};

const STATUS_COLORS: Record<string, string> = {
  posted: "#2563eb",
  bidding: "#7c3aed",
  accepted: "#059669",
  in_progress: "#d97706",
  completed: "#16a34a",
  cancelled: "#dc2626",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  plumbing: "\u{1F527}",
  electrical: "\u26A1",
  hvac: "\u{1F321}\uFE0F",
  roofing: "\u{1F3E0}",
  landscaping: "\u{1F33F}",
  painting: "\u{1F3A8}",
  cleaning: "\u{1F9F9}",
  moving: "\u{1F4E6}",
  auto_repair: "\u{1F697}",
  general_handyman: "\u{1F528}",
  handyman: "\u{1F528}",
  other: "\u2795",
};

const DISPUTE_REASONS = [
  "Work not completed as described",
  "Quality of work is unsatisfactory",
  "Contractor is unresponsive",
  "Damage to property",
  "Safety concern",
  "Other",
];

const STATUS_TIMELINE_STEPS = [
  { key: "posted", label: "Posted", icon: "megaphone-outline" as const },
  { key: "bidding", label: "Bids In", icon: "pricetag-outline" as const },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle-outline" as const },
  { key: "in_progress", label: "Working", icon: "hammer-outline" as const },
  { key: "completed", label: "Completed", icon: "trophy-outline" as const },
];

type TabKey = "bids" | "messages" | "details";

interface PriceEstimate {
  low: number;
  high: number;
  note: string;
}

interface SurgeInfo {
  active: boolean;
  multiplier: number;
  message: string;
}

interface MatchScore {
  contractor_id: string;
  score: number;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getCategoryEmoji(category: string): string {
  const key = category?.toLowerCase().replace(/[\s-]/g, "_") || "other";
  return CATEGORY_EMOJIS[key] || "\u{1F4CB}";
}

function renderStars(rating: number | undefined) {
  const r = rating || 0;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= r ? "star" : i - 0.5 <= r ? "star-half" : "star-outline"}
        size={14}
        color={i <= r ? "#f59e0b" : "#d1d5db"}
      />
    );
  }
  return <View style={{ flexDirection: "row", gap: 1 }}>{stars}</View>;
}

function StarRatingInput({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (r: number) => void;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} onPress={() => onRate(i)} activeOpacity={0.7}>
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={32}
            color={i <= rating ? "#f59e0b" : "#d1d5db"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SkeletonPulse({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const animValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.border, opacity: animValue },
        style,
      ]}
    />
  );
}

function getStatusIndex(status: string): number {
  const map: Record<string, number> = {
    posted: 0,
    bidding: 1,
    accepted: 2,
    en_route: 3,
    arrived: 3,
    in_progress: 3,
    completed: 4,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<TabKey>("bids");
  const [msgText, setMsgText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bidSort, setBidSort] = useState<"price" | "rating" | "match">("price");

  // AI features
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null);
  const [priceEstLoading, setPriceEstLoading] = useState(false);
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo | null>(null);
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  const [matchScoresLoading, setMatchScoresLoading] = useState(false);

  // Escrow & completion state
  const [confirming, setConfirming] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispute modal state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const acceptedBid = bids.find((b) => b.status === "accepted");
  const escrowAmount = acceptedBid?.price;

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, bidRes, msgRes] = await Promise.all([
        api<Job>(`/api/jobs/${id}`),
        api<{ bids: Bid[] }>(`/api/jobs/${id}/bids`),
        api<{ messages: Message[] }>(`/api/messages/${id}`).catch(() => ({
          data: { messages: [] },
          status: 200,
        })),
      ]);
      const jobData =
        (jobRes.data as unknown as Record<string, unknown>).job as Job || jobRes.data;
      setJob(jobData);
      setBids(bidRes.data.bids || []);
      setMessages(msgRes.data.messages || []);

      // Fetch AI price estimate
      if (jobData && !priceEstimate) {
        fetchPriceEstimate(jobData);
      }
      // Fetch surge info
      if (jobData?.category) {
        fetchSurgeInfo(jobData.category);
      }
      // Fetch match scores
      if (bidRes.data.bids?.length > 0) {
        fetchMatchScores();
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [id]);

  const fetchPriceEstimate = async (jobData: Job) => {
    setPriceEstLoading(true);
    try {
      const { data } = await api<PriceEstimate>("/api/ai/price-estimate", {
        method: "POST",
        body: JSON.stringify({
          category: jobData.category,
          title: jobData.title,
          description: jobData.description,
          location: jobData.location,
        }),
      });
      setPriceEstimate(data);
    } catch {
      // AI estimate not available
    }
    setPriceEstLoading(false);
  };

  const fetchSurgeInfo = async (category: string) => {
    try {
      const { data } = await api<SurgeInfo>(
        `/api/surge?category=${encodeURIComponent(category)}`
      );
      if (data?.active) {
        setSurgeInfo(data);
      }
    } catch {
      // Surge info not available
    }
  };

  const fetchMatchScores = async () => {
    setMatchScoresLoading(true);
    try {
      const { data } = await api<{ scores: MatchScore[] }>("/api/ai/match-scores", {
        method: "POST",
        body: JSON.stringify({ jobId: id }),
      });
      const map: Record<string, number> = {};
      (data.scores || []).forEach((s) => {
        map[s.contractor_id] = s.score;
      });
      setMatchScores(map);
    } catch {
      // Match scores not available
    }
    setMatchScoresLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const acceptBid = async (bidId: string, bidPrice?: number) => {
    Alert.alert(
      "Accept Bid",
      `Are you sure you want to accept this bid?${bidPrice ? `\n\n$${bidPrice.toLocaleString()} will be held in escrow until you confirm completion.` : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              await api(`/api/jobs/${id}/bids/${bidId}/accept`, {
                method: "POST",
              });
              Alert.alert(
                "Bid Accepted!",
                "The contractor has been notified. Proceed to payment to secure the job.",
                [
                  { text: "Later", style: "cancel" },
                  {
                    text: "Pay Now",
                    onPress: () => router.push(`/(client)/checkout/${id}` as never),
                  },
                ]
              );
              fetchData();
            } catch (err: unknown) {
              Alert.alert("Error", (err as Error).message);
            }
          },
        },
      ]
    );
  };

  const declineBid = async (bidId: string) => {
    Alert.alert("Decline Bid", "Are you sure you want to decline this bid?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/bids/${bidId}`, {
              method: "PUT",
              body: JSON.stringify({ status: "rejected" }),
            });
            fetchData();
          } catch (err: unknown) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
  };

  const confirmAndRelease = async () => {
    Alert.alert(
      "Confirm Completion",
      `Are you sure the work is complete? This will release $${escrowAmount?.toLocaleString() || "0"} to the contractor.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm & Release",
          style: "default",
          onPress: async () => {
            setConfirming(true);
            try {
              await api(`/api/jobs/${id}/confirm`, { method: "POST" });
              setShowReviewForm(true);
              fetchData();
            } catch (err: unknown) {
              Alert.alert("Error", (err as Error).message);
            }
            setConfirming(false);
          },
        },
      ]
    );
  };

  const submitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }
    setSubmittingReview(true);
    try {
      await api(`/api/jobs/${id}/review`, {
        method: "POST",
        body: JSON.stringify({
          contractor_id: acceptedBid?.contractor_id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      setReviewSubmitted(true);
    } catch (err: unknown) {
      // Fallback to old endpoint
      try {
        await api("/api/reviews", {
          method: "POST",
          body: JSON.stringify({
            job_id: id,
            contractor_id: acceptedBid?.contractor_id,
            rating: reviewRating,
            comment: reviewComment,
          }),
        });
        setReviewSubmitted(true);
      } catch (err2: unknown) {
        Alert.alert("Error", (err2 as Error).message);
      }
    }
    setSubmittingReview(false);
  };

  const submitDispute = async () => {
    if (!disputeReason) {
      Alert.alert("Required", "Please select a reason for the dispute.");
      return;
    }
    setSubmittingDispute(true);
    try {
      await api(`/api/jobs/${id}/dispute`, {
        method: "POST",
        body: JSON.stringify({
          reason: disputeReason,
          description: disputeDescription,
        }),
      });
      Alert.alert(
        "Report Submitted",
        "Our team will review your issue and get back to you within 24 hours."
      );
      setShowDisputeModal(false);
      setDisputeReason("");
      setDisputeDescription("");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSubmittingDispute(false);
  };

  const cancelJob = async () => {
    Alert.alert("Cancel Job", "Are you sure you want to cancel this job?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Job",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/jobs/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ status: "cancelled" }),
            });
            fetchData();
          } catch (err: unknown) {
            Alert.alert("Error", (err as Error).message);
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    if (!msgText.trim()) return;
    try {
      await api(`/api/messages/${id}`, {
        method: "POST",
        body: JSON.stringify({ content: msgText }),
      });
      setMsgText("");
      fetchData();
    } catch {
      /* ignore */
    }
  };

  const sortedBids = [...bids].sort((a, b) => {
    if (bidSort === "price") return (a.price || 0) - (b.price || 0);
    if (bidSort === "rating")
      return (b.contractor_rating || 0) - (a.contractor_rating || 0);
    if (bidSort === "match") {
      const sa = matchScores[a.contractor_id] || 0;
      const sb = matchScores[b.contractor_id] || 0;
      return sb - sa;
    }
    return 0;
  });

  const photos: string[] = job?.photos
    ? typeof job.photos === "string"
      ? job.photos.startsWith("[")
        ? JSON.parse(job.photos)
        : []
      : []
    : [];

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 20 }}>
          <SkeletonPulse width="100%" height={28} style={{ marginBottom: 8 }} />
          <SkeletonPulse width="60%" height={18} style={{ marginBottom: 16 }} />
          <SkeletonPulse width="100%" height={60} borderRadius={16} style={{ marginBottom: 14 }} />
          <SkeletonPulse width="100%" height={120} borderRadius={16} style={{ marginBottom: 14 }} />
          <SkeletonPulse width="100%" height={120} borderRadius={16} />
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={{ color: colors.muted, marginTop: 12, fontSize: 16 }}>
          Job not found
        </Text>
      </View>
    );
  }

  const jobHasAcceptedBid = !!acceptedBid;
  const isInProgressOrCompleted =
    job.status === "in_progress" || job.status === "completed";
  const currentStatusIndex = getStatusIndex(job.status);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        {(["bids", "messages", "details"] as TabKey[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
              {t === "bids"
                ? `Bids (${bids.length})`
                : t === "messages"
                  ? "Messages"
                  : "Details"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ====== BIDS TAB ====== */}
      {tab === "bids" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={sortedBids}
            keyExtractor={(b) => b.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            }
            ListHeaderComponent={
              <View>
                {/* Hero Header */}
                <View style={styles.header}>
                  <View style={styles.headerTop}>
                    <View style={styles.heroEmojiWrap}>
                      <Text style={styles.heroEmoji}>{getCategoryEmoji(job.category)}</Text>
                    </View>
                    <View style={styles.heroInfo}>
                      <Text style={styles.heroTitle} numberOfLines={2}>{job.title}</Text>
                      <View style={[styles.heroBadge, { backgroundColor: (STATUS_COLORS[job.status] || colors.muted) + "15" }]}>
                        <View style={[styles.heroBadgeDot, { backgroundColor: STATUS_COLORS[job.status] || colors.muted }]} />
                        <Text style={[styles.heroBadgeText, { color: STATUS_COLORS[job.status] || colors.muted }]}>
                          {job.status?.replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Info Row */}
                  <View style={styles.infoRow}>
                    {job.location ? (
                      <View style={styles.infoItem}>
                        <Ionicons name="location-outline" size={14} color={colors.muted} />
                        <Text style={styles.infoText}>{job.location}</Text>
                      </View>
                    ) : null}
                    <View style={styles.infoItem}>
                      <View style={[styles.urgencyDot, { backgroundColor: URGENCY_COLORS[job.urgency] || colors.muted }]} />
                      <Text style={[styles.infoText, { color: URGENCY_COLORS[job.urgency] || colors.muted, fontWeight: "600" }]}>
                        {job.urgency}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="time-outline" size={14} color={colors.muted} />
                      <Text style={styles.infoText}>{timeAgo(job.created_at)}</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Ionicons name="people-outline" size={14} color={colors.muted} />
                      <Text style={styles.infoText}>{bids.length} bids</Text>
                    </View>
                  </View>

                  {job.description ? (
                    <Text style={styles.description} numberOfLines={3}>{job.description}</Text>
                  ) : null}

                  {/* Photos */}
                  {photos.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} contentContainerStyle={{ gap: 8 }}>
                      {photos.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={styles.photoThumb} />
                      ))}
                    </ScrollView>
                  )}
                </View>

                {/* Surge Pricing Banner */}
                {surgeInfo?.active && (
                  <View style={styles.surgeBanner}>
                    <View style={styles.surgeRow}>
                      <Ionicons name="trending-up" size={20} color={colors.warning} />
                      <Text style={styles.surgeTitle}>High Demand</Text>
                      <View style={styles.surgeMultiplier}>
                        <Text style={styles.surgeMultiplierText}>{surgeInfo.multiplier}x</Text>
                      </View>
                    </View>
                    <Text style={styles.surgeMessage}>{surgeInfo.message}</Text>
                  </View>
                )}

                {/* Status Timeline */}
                {job.status !== "cancelled" && (
                  <View style={styles.timelineCard}>
                    <Text style={styles.timelineTitle}>Job Progress</Text>
                    <View style={styles.timelineRow}>
                      {STATUS_TIMELINE_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStatusIndex;
                        const isCurrent = idx === currentStatusIndex;
                        return (
                          <View key={step.key} style={styles.timelineStep}>
                            <View style={[
                              styles.timelineStepDot,
                              isDone && styles.timelineStepDotDone,
                              isCurrent && styles.timelineStepDotCurrent,
                            ]}>
                              <Ionicons
                                name={step.icon}
                                size={12}
                                color={isDone ? colors.white : colors.muted}
                              />
                            </View>
                            <Text style={[
                              styles.timelineStepLabel,
                              isDone && styles.timelineStepLabelDone,
                              isCurrent && styles.timelineStepLabelCurrent,
                            ]}>
                              {step.label}
                            </Text>
                            {idx < STATUS_TIMELINE_STEPS.length - 1 && (
                              <View style={[
                                styles.timelineStepLine,
                                isDone && idx < currentStatusIndex && styles.timelineStepLineDone,
                              ]} />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* AI Price Estimate Panel */}
                {(priceEstimate || priceEstLoading) && (
                  <View style={styles.aiCard}>
                    <View style={styles.aiCardHeader}>
                      <Ionicons name="sparkles" size={18} color={"#7c3aed"} />
                      <Text style={styles.aiCardTitle}>AI Price Estimate</Text>
                    </View>
                    {priceEstLoading ? (
                      <View style={{ gap: 8 }}>
                        <SkeletonPulse width="60%" height={24} borderRadius={6} />
                        <SkeletonPulse width="90%" height={14} borderRadius={4} />
                      </View>
                    ) : priceEstimate ? (
                      <>
                        <View style={styles.aiPriceRow}>
                          <Text style={styles.aiPriceRange}>
                            ${priceEstimate.low.toLocaleString()} - ${priceEstimate.high.toLocaleString()}
                          </Text>
                          <Text style={styles.aiPriceLabel}>estimated range</Text>
                        </View>
                        {priceEstimate.note ? (
                          <Text style={styles.aiNote}>{priceEstimate.note}</Text>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                )}

                {/* Escrow / Payment Card */}
                {jobHasAcceptedBid && escrowAmount && (
                  <View style={styles.escrowBanner}>
                    <View style={styles.escrowHeader}>
                      <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                      <Text style={styles.escrowTitle}>Payment Protected</Text>
                    </View>
                    <Text style={styles.escrowAmount}>
                      ${escrowAmount.toLocaleString()} held in escrow until you confirm completion
                    </Text>
                    <View style={styles.escrowTimeline}>
                      {[
                        { label: "Bid Accepted", icon: "checkmark-circle" as const, done: true },
                        { label: "Work in Progress", icon: "hammer" as const, done: job.status === "in_progress" || job.status === "completed" },
                        { label: "You Confirm", icon: "thumbs-up" as const, done: job.status === "completed" && showReviewForm },
                        { label: "Payment Released", icon: "cash" as const, done: reviewSubmitted },
                      ].map((step, idx) => (
                        <View key={idx} style={styles.escrowStep}>
                          <View style={[styles.escrowStepDot, step.done && styles.escrowStepDotDone]}>
                            <Ionicons name={step.icon} size={12} color={step.done ? colors.white : colors.muted} />
                          </View>
                          <Text style={[styles.escrowStepLabel, step.done && styles.escrowStepLabelDone]}>
                            {step.label}
                          </Text>
                          {idx < 3 && (
                            <View style={[styles.escrowStepLine, step.done && styles.escrowStepLineDone]} />
                          )}
                        </View>
                      ))}
                    </View>

                    {/* Pay button if not yet paid */}
                    {(job.status === "accepted") && (
                      <TouchableOpacity
                        style={styles.payNowBtn}
                        onPress={() => router.push(`/(client)/checkout/${id}` as never)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="card-outline" size={18} color={colors.white} />
                        <Text style={styles.payNowBtnText}>Pay & Secure Job</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Confirm & Release Payment / Review Form */}
                {isInProgressOrCompleted && !showReviewForm && !reviewSubmitted && (
                  <View style={styles.confirmSection}>
                    <TouchableOpacity
                      style={styles.confirmReleaseBtn}
                      onPress={confirmAndRelease}
                      disabled={confirming}
                      activeOpacity={0.8}
                    >
                      {confirming ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={22} color={colors.white} />
                          <Text style={styles.confirmReleaseBtnText}>Confirm Completion & Release Payment</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.reportIssueBtn}
                      onPress={() => setShowDisputeModal(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flag-outline" size={18} color={colors.danger} />
                      <Text style={styles.reportIssueBtnText}>Report Issue</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Review Form */}
                {showReviewForm && !reviewSubmitted && (
                  <View style={styles.reviewForm}>
                    <Text style={styles.reviewFormTitle}>Rate Your Contractor</Text>
                    <Text style={styles.reviewFormSubtitle}>
                      How was your experience with {acceptedBid?.contractor_name || "the contractor"}?
                    </Text>
                    <View style={{ alignItems: "center", marginVertical: 16 }}>
                      <StarRatingInput rating={reviewRating} onRate={setReviewRating} />
                    </View>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Share your experience (optional)..."
                      placeholderTextColor="#94a3b8"
                      value={reviewComment}
                      onChangeText={setReviewComment}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                    <TouchableOpacity
                      style={[styles.reviewSubmitBtn, submittingReview && { opacity: 0.7 }]}
                      onPress={submitReview}
                      disabled={submittingReview}
                      activeOpacity={0.8}
                    >
                      {submittingReview ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <>
                          <Ionicons name="send" size={18} color={colors.white} />
                          <Text style={styles.reviewSubmitBtnText}>Submit Review</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Review Submitted Success */}
                {reviewSubmitted && (
                  <View style={styles.reviewSuccess}>
                    <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                    <Text style={styles.reviewSuccessTitle}>Review Submitted!</Text>
                    <Text style={styles.reviewSuccessSubtitle}>
                      Thank you for your feedback. Payment has been released.
                    </Text>
                  </View>
                )}

                {/* Before/After Photos */}
                {job.status === "completed" && photos.length > 0 && (
                  <View style={styles.beforeAfterCard}>
                    <View style={styles.beforeAfterHeader}>
                      <Ionicons name="images-outline" size={18} color={colors.primary} />
                      <Text style={styles.beforeAfterTitle}>Before / After</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                      {photos.map((uri, i) => (
                        <View key={i} style={styles.beforeAfterImageWrap}>
                          <Image source={{ uri }} style={styles.beforeAfterImage} />
                          <Text style={styles.beforeAfterLabel}>{i === 0 ? "Before" : "After"}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Quick Actions */}
                {(job.status === "accepted" || job.status === "in_progress") && (
                  <View style={styles.quickActions}>
                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={() => router.push(`/(client)/reschedule/${id}` as never)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                      <Text style={styles.quickActionText}>Reschedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickActionBtn}
                      onPress={() => router.push(`/(client)/change-order/${id}` as never)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text style={styles.quickActionText}>Change Order</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Sort bar */}
                <View style={styles.sortBar}>
                  <Text style={styles.sortLabel}>Sort by:</Text>
                  {(["price", "rating", "match"] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sortChip, bidSort === s && styles.sortChipActive]}
                      onPress={() => setBidSort(s)}
                    >
                      <Text style={[styles.sortChipText, bidSort === s && styles.sortChipTextActive]}>
                        {s === "price" ? "Price" : s === "rating" ? "Rating" : "Match"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isAccepted = item.status === "accepted";
              const matchScore = matchScores[item.contractor_id];
              return (
                <View style={[styles.bidCard, isAccepted && styles.bidCardAccepted]}>
                  {isAccepted && (
                    <View style={styles.acceptedBanner}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.acceptedBannerText}>Accepted</Text>
                    </View>
                  )}
                  <View style={styles.bidHeader}>
                    <View style={styles.bidContractor}>
                      <View style={styles.bidAvatar}>
                        <Text style={styles.bidAvatarText}>
                          {(item.contractor_name || "C").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.bidName}>{item.contractor_name || "Contractor"}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {renderStars(item.contractor_rating)}
                          {item.contractor_rating ? (
                            <Text style={styles.ratingNum}>{item.contractor_rating.toFixed(1)}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.bidPrice}>${item.price?.toLocaleString()}</Text>
                      {matchScore != null && (
                        <View style={[
                          styles.matchBadge,
                          matchScore >= 80 ? styles.matchBadgeHigh :
                          matchScore >= 50 ? styles.matchBadgeMed : styles.matchBadgeLow,
                        ]}>
                          <Ionicons name="sparkles" size={10} color={
                            matchScore >= 80 ? "#059669" : matchScore >= 50 ? "#d97706" : "#64748b"
                          } />
                          <Text style={[
                            styles.matchBadgeText,
                            matchScore >= 80 ? { color: "#059669" } :
                            matchScore >= 50 ? { color: "#d97706" } : { color: "#64748b" },
                          ]}>
                            {matchScore}% match
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {item.message ? (
                    <Text style={styles.bidMsg} numberOfLines={3}>{item.message}</Text>
                  ) : null}

                  <View style={styles.bidFooter}>
                    <View style={styles.bidTimelineWrap}>
                      <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                      <Text style={styles.bidTimeline}>{item.timeline_days ? `${item.timeline_days} days` : "Flexible"}</Text>
                    </View>
                    {item.status === "pending" && job.status !== "completed" && (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => declineBid(item.id)}
                        >
                          <Ionicons name="close" size={16} color={colors.danger} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => acceptBid(item.id, item.price)}
                        >
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyTab}>
                <Ionicons name="people-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyTabText}>No bids yet</Text>
                <Text style={styles.emptyTabSub}>Contractors will start bidding soon</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ====== MESSAGES TAB ====== */}
      {tab === "messages" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View style={[styles.msgBubble, isMine ? styles.msgSent : styles.msgReceived]}>
                  {!isMine && (
                    <Text style={styles.msgSenderName}>{item.sender_name || "Other"}</Text>
                  )}
                  <Text style={[styles.msgContent, isMine && { color: colors.white }]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.msgTime, isMine && { color: "rgba(255,255,255,0.7)" }]}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyTab}>
                <Ionicons name="chatbubble-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyTabText}>No messages yet</Text>
                <Text style={styles.emptyTabSub}>Start a conversation about this job</Text>
              </View>
            }
          />
          <View style={styles.msgInputBar}>
            <TextInput
              style={styles.msgTextInput}
              placeholder="Type a message..."
              placeholderTextColor="#94a3b8"
              value={msgText}
              onChangeText={setMsgText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !msgText.trim() && { opacity: 0.5 }]}
              onPress={sendMessage}
              disabled={!msgText.trim()}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ====== DETAILS TAB ====== */}
      {tab === "details" && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.detailCard}>
            <DetailRow icon="briefcase-outline" label="Category" value={job.category?.replace(/_/g, " ")} />
            <DetailRow icon="location-outline" label="Location" value={job.location || "Not specified"} />
            <DetailRow icon="alert-circle-outline" label="Urgency" value={job.urgency} />
            <DetailRow icon="flag-outline" label="Status" value={job.status?.replace(/_/g, " ")} />
            <DetailRow icon="calendar-outline" label="Posted" value={new Date(job.created_at).toLocaleDateString()} />
            <DetailRow icon="people-outline" label="Bids" value={`${bids.length} received`} />
            {(job.budget_min || job.budget_max) && (
              <DetailRow icon="cash-outline" label="Budget" value={
                job.budget_min && job.budget_max
                  ? `$${job.budget_min.toLocaleString()} - $${job.budget_max.toLocaleString()}`
                  : job.budget_max
                    ? `Up to $${job.budget_max.toLocaleString()}`
                    : `From $${(job.budget_min || 0).toLocaleString()}`
              } />
            )}
            <DetailRow icon="document-text-outline" label="Description" value={job.description || "No description"} last />
          </View>

          {/* Full Description */}
          {job.description && job.description.length > 100 && (
            <View style={styles.fullDescCard}>
              <Text style={styles.fullDescTitle}>Full Description</Text>
              <Text style={styles.fullDescText}>{job.description}</Text>
            </View>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <View style={styles.detailPhotosCard}>
              <Text style={styles.fullDescTitle}>Photos ({photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.detailPhotoLarge} />
                ))}
              </ScrollView>
            </View>
          )}

          {(job.status === "posted" || job.status === "bidding") && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelJob}>
              <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
              <Text style={styles.cancelBtnText}>Cancel Job</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Dispute Modal */}
      <Modal
        visible={showDisputeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDisputeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            {DISPUTE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[styles.disputeReasonBtn, disputeReason === reason && styles.disputeReasonBtnActive]}
                onPress={() => setDisputeReason(reason)}
              >
                <Ionicons
                  name={disputeReason === reason ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={disputeReason === reason ? colors.primary : colors.muted}
                />
                <Text style={[styles.disputeReasonText, disputeReason === reason && { color: colors.primary, fontWeight: "600" }]}>
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>Description</Text>
            <TextInput
              style={styles.disputeInput}
              placeholder="Provide additional details..."
              placeholderTextColor="#94a3b8"
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.disputeSubmitBtn, submittingDispute && { opacity: 0.7 }]}
              onPress={submitDispute}
              disabled={submittingDispute}
              activeOpacity={0.8}
            >
              {submittingDispute ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.disputeSubmitBtnText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={18} color={colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTop: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  heroEmojiWrap: { width: 52, height: 52, borderRadius: radius.lg, backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" },
  heroEmoji: { fontSize: 26 },
  heroInfo: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: "800", color: colors.text, marginBottom: 6, lineHeight: 26 },
  heroBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5 },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },

  // Info row
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 10 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 12, color: colors.muted },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },

  description: { fontSize: 14, color: "#475569", lineHeight: 21, marginTop: 6 },

  // Photos
  photoScroll: { marginTop: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: radius.md },

  // Surge Banner
  surgeBanner: {
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#fde68a",
  },
  surgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  surgeTitle: { fontSize: 15, fontWeight: "700", color: colors.warning, flex: 1 },
  surgeMultiplier: { backgroundColor: "#fde68a", paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.lg },
  surgeMultiplierText: { fontSize: 13, fontWeight: "800", color: "#92400e" },
  surgeMessage: { fontSize: 13, color: "#92400e", lineHeight: 19 },

  // Status Timeline
  timelineCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.xl,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 14 },
  timelineRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  timelineStep: { alignItems: "center", flex: 1, position: "relative" },
  timelineStepDot: {
    width: 28, height: 28, borderRadius: radius.lg,
    backgroundColor: colors.border,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  timelineStepDotDone: { backgroundColor: colors.success },
  timelineStepDotCurrent: { backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary },
  timelineStepLabel: { fontSize: 10, color: colors.muted, textAlign: "center", fontWeight: "500" },
  timelineStepLabelDone: { color: colors.success, fontWeight: "600" },
  timelineStepLabelCurrent: { color: colors.primary, fontWeight: "700" },
  timelineStepLine: { position: "absolute", top: 14, left: "60%", right: "-40%", height: 2, backgroundColor: colors.border, zIndex: -1 },
  timelineStepLineDone: { backgroundColor: colors.success },

  // AI Card
  aiCard: {
    backgroundColor: "#f5f3ff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
  },
  aiCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  aiCardTitle: { fontSize: 15, fontWeight: "700", color: "#7c3aed" },
  aiPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 6 },
  aiPriceRange: { fontSize: 22, fontWeight: "800", color: colors.text },
  aiPriceLabel: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  aiNote: { fontSize: 13, color: "#6b21a8", lineHeight: 19 },

  // Escrow Trust Banner
  escrowBanner: {
    backgroundColor: "#D1FAE5",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  escrowHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  escrowTitle: { fontSize: 16, fontWeight: "800", color: colors.success },
  escrowAmount: { fontSize: 14, color: "#065f46", marginBottom: 14, lineHeight: 20 },
  escrowTimeline: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  escrowStep: { alignItems: "center", flex: 1, position: "relative" },
  escrowStepDot: { width: 28, height: 28, borderRadius: radius.lg, backgroundColor: "#d1d5db", justifyContent: "center", alignItems: "center", marginBottom: 4 },
  escrowStepDotDone: { backgroundColor: colors.success },
  escrowStepLabel: { fontSize: 10, color: colors.muted, textAlign: "center", fontWeight: "500" },
  escrowStepLabelDone: { color: colors.success, fontWeight: "700" },
  escrowStepLine: { position: "absolute", top: 14, left: "60%", right: "-40%", height: 2, backgroundColor: "#d1d5db", zIndex: -1 },
  escrowStepLineDone: { backgroundColor: colors.success },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.lg,
    gap: 8,
    marginTop: 14,
  },
  payNowBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Confirm & Release
  confirmSection: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  confirmReleaseBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 16, borderRadius: radius.lg, gap: 8,
    backgroundColor: colors.success,
    shadowColor: "#059669", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmReleaseBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  reportIssueBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: radius.lg, gap: 6,
    borderWidth: 1.5, borderColor: "#fecaca", backgroundColor: colors.white,
  },
  reportIssueBtnText: { color: colors.danger, fontSize: 14, fontWeight: "600" },

  // Review Form
  reviewForm: {
    backgroundColor: colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: radius.xl, padding: 20, borderWidth: 1, borderColor: colors.border,
  },
  reviewFormTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 },
  reviewFormSubtitle: { fontSize: 14, color: colors.muted },
  reviewInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, minHeight: 80, marginBottom: 16,
  },
  reviewSubmitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.lg, gap: 8,
  },
  reviewSubmitBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Review Success
  reviewSuccess: {
    alignItems: "center", backgroundColor: "#D1FAE5",
    marginHorizontal: 16, marginTop: 12, borderRadius: radius.xl, padding: 24,
    borderWidth: 1.5, borderColor: "#a7f3d0",
  },
  reviewSuccessTitle: { fontSize: 18, fontWeight: "800", color: colors.success, marginTop: 8 },
  reviewSuccessSubtitle: { fontSize: 14, color: "#065f46", marginTop: 4, textAlign: "center" },

  // Before/After
  beforeAfterCard: {
    backgroundColor: colors.white, marginHorizontal: 16, marginTop: 12,
    borderRadius: radius.xl, padding: 16, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  beforeAfterHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  beforeAfterTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  beforeAfterImageWrap: { alignItems: "center" },
  beforeAfterImage: { width: 140, height: 140, borderRadius: radius.lg },
  beforeAfterLabel: { fontSize: 11, fontWeight: "600", color: colors.muted, marginTop: 4 },

  // Quick Actions
  quickActions: { flexDirection: "row", gap: 10, marginHorizontal: 16, marginTop: 10 },
  quickActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 10, backgroundColor: "#DBEAFE",
  },
  quickActionText: { color: colors.primary, fontWeight: "600", fontSize: 14 },

  // Tabs
  tabBar: {
    flexDirection: "row", backgroundColor: colors.white,
    paddingHorizontal: 16, paddingTop: 4,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderColor: "transparent" },
  tabBtnActive: { borderColor: colors.primary },
  tabBtnText: { fontSize: 14, fontWeight: "500", color: colors.muted },
  tabBtnTextActive: { color: colors.primary, fontWeight: "700" },

  // Sort bar
  sortBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
    backgroundColor: colors.white, borderBottomWidth: 1, borderColor: colors.border,
  },
  sortLabel: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  sortChipActive: { backgroundColor: "#DBEAFE", borderColor: colors.primary },
  sortChipText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  sortChipTextActive: { color: colors.primary, fontWeight: "600" },

  // Bid cards
  bidCard: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 16,
    marginHorizontal: 16, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    borderWidth: 1.5, borderColor: colors.border,
  },
  bidCardAccepted: { borderColor: "#059669", borderWidth: 2 },
  acceptedBanner: {
    flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10,
    backgroundColor: "#f0fdf4", alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.lg,
  },
  acceptedBannerText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  bidHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  bidContractor: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  bidAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  bidAvatarText: { fontSize: 17, fontWeight: "700", color: colors.primary },
  bidName: { fontSize: 15, fontWeight: "600", color: colors.text, marginBottom: 2 },
  ratingNum: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  bidPrice: { fontSize: 22, fontWeight: "800", color: "#059669" },
  matchBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.md, marginTop: 4,
  },
  matchBadgeHigh: { backgroundColor: "#f0fdf4" },
  matchBadgeMed: { backgroundColor: "#FEF3C7" },
  matchBadgeLow: { backgroundColor: colors.surface },
  matchBadgeText: { fontSize: 11, fontWeight: "600" },
  bidMsg: { fontSize: 13, color: "#475569", lineHeight: 19, marginBottom: 14 },
  bidFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bidTimelineWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  bidTimeline: { fontSize: 12, color: colors.muted },
  acceptBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#059669", paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.md, gap: 4,
  },
  acceptBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },
  declineBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.md, gap: 4, borderWidth: 1.5, borderColor: "#fecaca",
  },
  declineBtnText: { color: colors.danger, fontSize: 13, fontWeight: "600" },

  // Messages
  msgBubble: { maxWidth: "80%", padding: 12, borderRadius: 18, marginBottom: 8 },
  msgSent: { alignSelf: "flex-end", backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  msgReceived: { alignSelf: "flex-start", backgroundColor: colors.border, borderBottomLeftRadius: 4 },
  msgSenderName: { fontSize: 11, fontWeight: "600", color: colors.muted, marginBottom: 2 },
  msgContent: { fontSize: 15, color: colors.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 4, textAlign: "right" },
  msgInputBar: {
    flexDirection: "row", padding: 12, backgroundColor: colors.white,
    borderTopWidth: 1, borderColor: colors.border, gap: 8, alignItems: "flex-end",
  },
  msgTextInput: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: colors.text,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },

  // Details tab
  detailCard: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  detailRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderColor: colors.border },
  detailIconWrap: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center" },
  detailLabel: { fontSize: 12, color: colors.muted, fontWeight: "500", marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: "600", color: colors.text, textTransform: "capitalize" },

  fullDescCard: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, marginTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  fullDescTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginBottom: 10 },
  fullDescText: { fontSize: 14, color: "#475569", lineHeight: 22 },

  detailPhotosCard: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, marginTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  detailPhotoLarge: { width: 160, height: 160, borderRadius: radius.lg },

  cancelBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.white, paddingVertical: 16, borderRadius: radius.lg, marginTop: 12, gap: 8,
    borderWidth: 1.5, borderColor: "#fecaca",
  },
  cancelBtnText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },

  // Empty tab
  emptyTab: { alignItems: "center", paddingVertical: 48 },
  emptyTabText: { fontSize: 16, fontWeight: "600", color: "#94a3b8", marginTop: 12 },
  emptyTabSub: { fontSize: 13, color: "#cbd5e1", marginTop: 4 },

  // Dispute Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  modalLabel: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 },
  disputeReasonBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  disputeReasonBtnActive: { backgroundColor: "#DBEAFE", borderRadius: radius.md, paddingHorizontal: 10 },
  disputeReasonText: { fontSize: 15, color: colors.text },
  disputeInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, fontSize: 15, color: colors.text, minHeight: 100,
  },
  disputeSubmitBtn: {
    backgroundColor: colors.danger, paddingVertical: 16, borderRadius: radius.lg,
    alignItems: "center", justifyContent: "center", marginTop: 20,
  },
  disputeSubmitBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});

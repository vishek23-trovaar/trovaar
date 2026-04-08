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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Job, Bid, Message } from "@/lib/types";

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#0f172a",
  muted: "#64748b",
  surface: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
  success: "#059669",
  successLight: "#ecfdf5",
  danger: "#dc2626",
};

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

type TabKey = "bids" | "messages" | "details";

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

// Tappable star rating component
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

// Skeleton
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
        Animated.timing(animValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "#e2e8f0",
          opacity: animValue,
        },
        style,
      ]}
    />
  );
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
  const [bidSort, setBidSort] = useState<"price" | "rating" | "timeline">(
    "price"
  );

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
      setJob(
        (jobRes.data as unknown as Record<string, unknown>).job as Job || jobRes.data
      );
      setBids(bidRes.data.bids || []);
      setMessages(msgRes.data.messages || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
              await api(`/api/bids/${bidId}`, {
                method: "PUT",
                body: JSON.stringify({ status: "accepted" }),
              });
              Alert.alert(
                "Bid Accepted!",
                "The contractor has been notified. Your payment is held securely in escrow."
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

  const confirmAndRelease = async () => {
    Alert.alert(
      "Confirm & Release Payment",
      `Are you sure? This will release $${escrowAmount?.toLocaleString() || "0"} to the contractor.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release Payment",
          style: "default",
          onPress: async () => {
            setConfirming(true);
            try {
              await api(`/api/jobs/${id}/confirm`, {
                method: "POST",
              });
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
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
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
          <SkeletonPulse
            width="100%"
            height={28}
            style={{ marginBottom: 8 }}
          />
          <SkeletonPulse
            width="60%"
            height={18}
            style={{ marginBottom: 16 }}
          />
          <SkeletonPulse
            width="100%"
            height={60}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          />
          <SkeletonPulse
            width="100%"
            height={120}
            borderRadius={12}
            style={{ marginBottom: 12 }}
          />
          <SkeletonPulse width="100%" height={120} borderRadius={12} />
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.muted} />
        <Text style={{ color: COLORS.muted, marginTop: 12, fontSize: 16 }}>
          Job not found
        </Text>
      </View>
    );
  }

  const jobHasAcceptedBid = !!acceptedBid;
  const isInProgressOrCompleted =
    job.status === "in_progress" || job.status === "completed";

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Hero Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.heroEmojiWrap}>
            <Text style={styles.heroEmoji}>
              {getCategoryEmoji(job.category)}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {job.title}
            </Text>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor:
                    (STATUS_COLORS[job.status] || COLORS.muted) + "15",
                },
              ]}
            >
              <View
                style={[
                  styles.heroBadgeDot,
                  {
                    backgroundColor:
                      STATUS_COLORS[job.status] || COLORS.muted,
                  },
                ]}
              />
              <Text
                style={[
                  styles.heroBadgeText,
                  {
                    color: STATUS_COLORS[job.status] || COLORS.muted,
                  },
                ]}
              >
                {job.status?.replace(/_/g, " ")}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          {job.location ? (
            <View style={styles.infoItem}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.muted}
              />
              <Text style={styles.infoText}>{job.location}</Text>
            </View>
          ) : null}
          <View style={styles.infoItem}>
            <View
              style={[
                styles.urgencyDot,
                {
                  backgroundColor:
                    URGENCY_COLORS[job.urgency] || COLORS.muted,
                },
              ]}
            />
            <Text
              style={[
                styles.infoText,
                {
                  color: URGENCY_COLORS[job.urgency] || COLORS.muted,
                  fontWeight: "600",
                },
              ]}
            >
              {job.urgency}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.muted} />
            <Text style={styles.infoText}>{timeAgo(job.created_at)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={14} color={COLORS.muted} />
            <Text style={styles.infoText}>{bids.length} bids</Text>
          </View>
        </View>

        {/* Description */}
        {job.description ? (
          <Text style={styles.description}>{job.description}</Text>
        ) : null}

        {/* Photos */}
        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.photoScroll}
            contentContainerStyle={{ gap: 8 }}
          >
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Escrow Trust Banner */}
      {jobHasAcceptedBid && escrowAmount && (
        <View style={styles.escrowBanner}>
          <View style={styles.escrowHeader}>
            <Text style={styles.escrowIcon}>
              {"\uD83D\uDCB0"}
            </Text>
            <Text style={styles.escrowTitle}>Your Payment is Protected</Text>
          </View>
          <Text style={styles.escrowAmount}>
            ${escrowAmount.toLocaleString()} held in escrow until you confirm
            completion
          </Text>
          <View style={styles.escrowTimeline}>
            {[
              { label: "Bid Accepted", icon: "checkmark-circle" as const, done: true },
              {
                label: "Work in Progress",
                icon: "hammer" as const,
                done:
                  job.status === "in_progress" || job.status === "completed",
              },
              {
                label: "You Confirm",
                icon: "thumbs-up" as const,
                done: job.status === "completed" && showReviewForm,
              },
              {
                label: "Payment Released",
                icon: "cash" as const,
                done: reviewSubmitted,
              },
            ].map((step, idx) => (
              <View key={idx} style={styles.escrowStep}>
                <View
                  style={[
                    styles.escrowStepDot,
                    step.done && styles.escrowStepDotDone,
                  ]}
                >
                  <Ionicons
                    name={step.icon}
                    size={12}
                    color={step.done ? COLORS.white : COLORS.muted}
                  />
                </View>
                <Text
                  style={[
                    styles.escrowStepLabel,
                    step.done && styles.escrowStepLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
                {idx < 3 && (
                  <View
                    style={[
                      styles.escrowStepLine,
                      step.done && styles.escrowStepLineDone,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>
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
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={COLORS.white}
                />
                <Text style={styles.confirmReleaseBtnText}>
                  Confirm & Release Payment
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.reportIssueBtn}
            onPress={() => setShowDisputeModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="flag-outline" size={18} color={COLORS.danger} />
            <Text style={styles.reportIssueBtnText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Review Form */}
      {showReviewForm && !reviewSubmitted && (
        <View style={styles.reviewForm}>
          <Text style={styles.reviewFormTitle}>Rate Your Contractor</Text>
          <Text style={styles.reviewFormSubtitle}>
            How was your experience with{" "}
            {acceptedBid?.contractor_name || "the contractor"}?
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
            style={[
              styles.reviewSubmitBtn,
              submittingReview && { opacity: 0.7 },
            ]}
            onPress={submitReview}
            disabled={submittingReview}
            activeOpacity={0.8}
          >
            {submittingReview ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="send" size={18} color={COLORS.white} />
                <Text style={styles.reviewSubmitBtnText}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Review Submitted Success */}
      {reviewSubmitted && (
        <View style={styles.reviewSuccess}>
          <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
          <Text style={styles.reviewSuccessTitle}>Review Submitted!</Text>
          <Text style={styles.reviewSuccessSubtitle}>
            Thank you for your feedback. Payment has been released.
          </Text>
          <TouchableOpacity
            style={styles.tipBtn}
            onPress={() => router.push(`/(client)/tip/${id}` as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="heart-outline" size={18} color={COLORS.white} />
            <Text style={styles.tipBtnText}>Leave a Tip 🎉</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions: Reschedule + Change Order (for active jobs) */}
      {(job.status === "accepted" || job.status === "in_progress") && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push(`/(client)/reschedule/${id}` as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push(`/(client)/change-order/${id}` as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.quickActionText}>Change Order</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Segmented Tabs */}
      <View style={styles.tabBar}>
        {(["bids", "messages", "details"] as TabKey[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text
              style={[
                styles.tabBtnText,
                tab === t && styles.tabBtnTextActive,
              ]}
            >
              {t === "bids"
                ? `Bids (${bids.length})`
                : t === "messages"
                  ? `Messages`
                  : "Details"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {tab === "bids" && (
        <View style={{ flex: 1 }}>
          {/* Sort bar */}
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>Sort by:</Text>
            {(["price", "rating", "timeline"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sortChip,
                  bidSort === s && styles.sortChipActive,
                ]}
                onPress={() => setBidSort(s)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    bidSort === s && styles.sortChipTextActive,
                  ]}
                >
                  {s === "price"
                    ? "Price"
                    : s === "rating"
                      ? "Rating"
                      : "Timeline"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={sortedBids}
            keyExtractor={(b) => b.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            renderItem={({ item }) => {
              const isAccepted = item.status === "accepted";
              return (
                <View
                  style={[
                    styles.bidCard,
                    isAccepted && styles.bidCardAccepted,
                  ]}
                >
                  {isAccepted && (
                    <View style={styles.acceptedBanner}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#059669"
                      />
                      <Text style={styles.acceptedBannerText}>Accepted</Text>
                    </View>
                  )}
                  <View style={styles.bidHeader}>
                    <View style={styles.bidContractor}>
                      <View style={styles.bidAvatar}>
                        <Text style={styles.bidAvatarText}>
                          {(item.contractor_name || "C")
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.bidName}>
                          {item.contractor_name || "Contractor"}
                        </Text>
                        {renderStars(item.contractor_rating)}
                      </View>
                    </View>
                    <Text style={styles.bidPrice}>
                      ${item.price?.toLocaleString()}
                    </Text>
                  </View>

                  {item.message ? (
                    <Text style={styles.bidMsg} numberOfLines={3}>
                      {item.message}
                    </Text>
                  ) : null}

                  <View style={styles.bidFooter}>
                    <View style={styles.bidTimelineWrap}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={COLORS.muted}
                      />
                      <Text style={styles.bidTimeline}>
                        {item.timeline || "Flexible"}
                      </Text>
                    </View>
                    {item.status === "pending" &&
                      job.status !== "completed" && (
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => acceptBid(item.id, item.price)}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={COLORS.white}
                          />
                          <Text style={styles.acceptBtnText}>Accept Bid</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyTab}>
                <Ionicons name="people-outline" size={40} color="#d1d5db" />
                <Text style={styles.emptyTabText}>No bids yet</Text>
                <Text style={styles.emptyTabSub}>
                  Contractors will start bidding soon
                </Text>
              </View>
            }
          />
        </View>
      )}

      {tab === "messages" && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            renderItem={({ item }) => {
              const isMine = item.sender_id === user?.id;
              return (
                <View
                  style={[
                    styles.msgBubble,
                    isMine ? styles.msgSent : styles.msgReceived,
                  ]}
                >
                  {!isMine && (
                    <Text style={styles.msgSenderName}>
                      {item.sender_name || "Other"}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.msgContent,
                      isMine && { color: COLORS.white },
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      isMine && { color: "rgba(255,255,255,0.7)" },
                    ]}
                  >
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyTab}>
                <Ionicons
                  name="chatbubble-outline"
                  size={40}
                  color="#d1d5db"
                />
                <Text style={styles.emptyTabText}>No messages yet</Text>
                <Text style={styles.emptyTabSub}>
                  Start a conversation about this job
                </Text>
              </View>
            }
          />
          {/* Message input */}
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
              <Ionicons name="send" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {tab === "details" && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          <View style={styles.detailCard}>
            <DetailRow
              icon="briefcase-outline"
              label="Category"
              value={job.category?.replace(/_/g, " ")}
            />
            <DetailRow
              icon="location-outline"
              label="Location"
              value={job.location || "Not specified"}
            />
            <DetailRow
              icon="alert-circle-outline"
              label="Urgency"
              value={job.urgency}
            />
            <DetailRow
              icon="flag-outline"
              label="Status"
              value={job.status?.replace(/_/g, " ")}
            />
            <DetailRow
              icon="calendar-outline"
              label="Posted"
              value={new Date(job.created_at).toLocaleDateString()}
            />
            <DetailRow
              icon="people-outline"
              label="Bids"
              value={`${bids.length} received`}
              last
            />
          </View>

          {/* Action buttons */}
          {(job.status === "posted" || job.status === "bidding") && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancelJob}>
              <Ionicons
                name="close-circle-outline"
                size={20}
                color="#dc2626"
              />
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
              <TouchableOpacity
                onPress={() => setShowDisputeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            {DISPUTE_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.disputeReasonBtn,
                  disputeReason === reason && styles.disputeReasonBtnActive,
                ]}
                onPress={() => setDisputeReason(reason)}
              >
                <Ionicons
                  name={
                    disputeReason === reason
                      ? "radio-button-on"
                      : "radio-button-off"
                  }
                  size={20}
                  color={
                    disputeReason === reason ? COLORS.primary : COLORS.muted
                  }
                />
                <Text
                  style={[
                    styles.disputeReasonText,
                    disputeReason === reason && { color: COLORS.primary, fontWeight: "600" },
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>
              Description
            </Text>
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
              style={[
                styles.disputeSubmitBtn,
                submittingDispute && { opacity: 0.7 },
              ]}
              onPress={submitDispute}
              disabled={submittingDispute}
              activeOpacity={0.8}
            >
              {submittingDispute ? (
                <ActivityIndicator color={COLORS.white} />
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
        <Ionicons name={icon} size={18} color={COLORS.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },

  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  heroEmojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: { fontSize: 26 },
  heroInfo: { flex: 1 },
  heroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 6,
    lineHeight: 26,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 10,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 12, color: COLORS.muted },
  urgencyDot: { width: 8, height: 8, borderRadius: 4 },

  description: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 21,
    marginTop: 6,
  },

  // Photos
  photoScroll: { marginTop: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 10 },

  // Escrow Trust Banner
  escrowBanner: {
    backgroundColor: COLORS.successLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  escrowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  escrowIcon: { fontSize: 20 },
  escrowTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.success,
  },
  escrowAmount: {
    fontSize: 14,
    color: "#065f46",
    marginBottom: 14,
    lineHeight: 20,
  },
  escrowTimeline: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  escrowStep: {
    alignItems: "center",
    flex: 1,
    position: "relative",
  },
  escrowStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#d1d5db",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  escrowStepDotDone: {
    backgroundColor: COLORS.success,
  },
  escrowStepLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "center",
    fontWeight: "500",
  },
  escrowStepLabelDone: {
    color: COLORS.success,
    fontWeight: "700",
  },
  escrowStepLine: {
    position: "absolute",
    top: 14,
    left: "60%",
    right: "-40%",
    height: 2,
    backgroundColor: "#d1d5db",
    zIndex: -1,
  },
  escrowStepLineDone: {
    backgroundColor: COLORS.success,
  },

  // Confirm & Release
  confirmSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  confirmReleaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    backgroundColor: COLORS.success,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmReleaseBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  reportIssueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#fecaca",
    backgroundColor: COLORS.white,
  },
  reportIssueBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: "600",
  },

  // Review Form
  reviewForm: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  reviewFormSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  reviewInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.secondary,
    minHeight: 80,
    marginBottom: 16,
  },
  reviewSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  reviewSubmitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // Review Success
  reviewSuccess: {
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  reviewSuccessTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.success,
    marginTop: 8,
  },
  reviewSuccessSubtitle: {
    fontSize: 14,
    color: "#065f46",
    marginTop: 4,
    textAlign: "center",
  },
  tipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
  },
  tipBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
  },
  quickActionText: { color: COLORS.primary, fontWeight: "600", fontSize: 14 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabBtnActive: { borderColor: COLORS.primary },
  tabBtnText: { fontSize: 14, fontWeight: "500", color: COLORS.muted },
  tabBtnTextActive: { color: COLORS.primary, fontWeight: "700" },

  // Sort bar
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sortLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortChipActive: {
    backgroundColor: "#eff6ff",
    borderColor: COLORS.primary,
  },
  sortChipText: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  sortChipTextActive: { color: COLORS.primary, fontWeight: "600" },

  // Bid cards
  bidCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  bidCardAccepted: {
    borderColor: "#059669",
    borderWidth: 2,
  },
  acceptedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    backgroundColor: "#f0fdf4",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  acceptedBannerText: { fontSize: 12, fontWeight: "600", color: "#059669" },
  bidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bidContractor: { flexDirection: "row", alignItems: "center", gap: 10 },
  bidAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  bidAvatarText: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  bidName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  bidPrice: { fontSize: 22, fontWeight: "800", color: "#059669" },
  bidMsg: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
    marginBottom: 12,
  },
  bidFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bidTimelineWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  bidTimeline: { fontSize: 12, color: COLORS.muted },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptBtnText: { color: COLORS.white, fontSize: 14, fontWeight: "700" },

  // Messages
  msgBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
    marginBottom: 8,
  },
  msgSent: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  msgReceived: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
  },
  msgSenderName: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 2,
  },
  msgContent: { fontSize: 15, color: COLORS.secondary, lineHeight: 20 },
  msgTime: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "right",
  },
  msgInputBar: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
    alignItems: "flex-end",
  },
  msgTextInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.secondary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Details tab
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
    textTransform: "capitalize",
  },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
  cancelBtnText: { color: "#dc2626", fontSize: 16, fontWeight: "600" },

  // Empty tab
  emptyTab: { alignItems: "center", paddingVertical: 48 },
  emptyTabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 12,
  },
  emptyTabSub: { fontSize: 13, color: "#cbd5e1", marginTop: 4 },

  // Dispute Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 8,
  },
  disputeReasonBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  disputeReasonBtnActive: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  disputeReasonText: {
    fontSize: 15,
    color: COLORS.secondary,
  },
  disputeInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.secondary,
    minHeight: 100,
  },
  disputeSubmitBtn: {
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disputeSubmitBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

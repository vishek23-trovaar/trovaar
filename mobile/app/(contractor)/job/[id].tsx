import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Job, Bid } from "@/lib/types";
import * as ImagePicker from "expo-image-picker";

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#0f172a",
  muted: "#64748b",
  surface: "#f8fafc",
  border: "#e2e8f0",
  success: "#059669",
  successLight: "#ecfdf5",
  warning: "#d97706",
  danger: "#dc2626",
  white: "#ffffff",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  plumbing: "\uD83D\uDEB0",
  electrical: "\u26A1",
  hvac: "\u2744\uFE0F",
  landscaping: "\uD83C\uDF33",
  auto: "\uD83D\uDE97",
  cleaning: "\u2728",
  painting: "\uD83C\uDFA8",
  carpentry: "\uD83D\uDD28",
  general: "\uD83D\uDD27",
};

const URGENCY_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  low: { bg: "#f1f5f9", text: "#64748b", label: "Low" },
  medium: { bg: "#eff6ff", text: "#1e40af", label: "Medium" },
  high: { bg: "#fffbeb", text: "#d97706", label: "High" },
  emergency: { bg: "#fef2f2", text: "#dc2626", label: "Emergency" },
};

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  pending: { bg: "#fffbeb", text: "#d97706", icon: "time-outline" },
  accepted: {
    bg: "#ecfdf5",
    text: "#059669",
    icon: "checkmark-circle-outline",
  },
  rejected: { bg: "#fef2f2", text: "#dc2626", icon: "close-circle-outline" },
  withdrawn: { bg: "#f1f5f9", text: "#64748b", icon: "arrow-undo-outline" },
};

const JOB_STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  posted: { bg: "#eff6ff", text: "#1e40af", label: "Posted" },
  bidding: { bg: "#f5f3ff", text: "#7c3aed", label: "Bidding" },
  accepted: { bg: "#ecfdf5", text: "#059669", label: "Accepted" },
  in_progress: { bg: "#fffbeb", text: "#d97706", label: "In Progress" },
  completed: { bg: "#ecfdf5", text: "#16a34a", label: "Completed" },
  cancelled: { bg: "#fef2f2", text: "#dc2626", label: "Cancelled" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SkeletonScreen() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ padding: 20, opacity }}>
      <View
        style={{
          width: 80,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#e2e8f0",
          marginBottom: 12,
        }}
      />
      <View
        style={{
          width: "80%",
          height: 24,
          borderRadius: 8,
          backgroundColor: "#e2e8f0",
          marginBottom: 10,
        }}
      />
      <View
        style={{
          width: "100%",
          height: 60,
          borderRadius: 8,
          backgroundColor: "#e2e8f0",
          marginBottom: 20,
        }}
      />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View
          style={{
            flex: 1,
            height: 80,
            borderRadius: 14,
            backgroundColor: "#e2e8f0",
          }}
        />
        <View
          style={{
            flex: 1,
            height: 80,
            borderRadius: 14,
            backgroundColor: "#e2e8f0",
          }}
        />
      </View>
    </Animated.View>
  );
}

export default function ContractorJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [myBid, setMyBid] = useState<Bid | null>(null);
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [timelineDays, setTimelineDays] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Photo upload state
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);

  // Portfolio gate
  const [portfolioPhotoCount, setPortfolioPhotoCount] = useState<number | null>(null);
  const [portfolioGateChecked, setPortfolioGateChecked] = useState(false);

  // AI price estimate
  const [priceEstimate, setPriceEstimate] = useState<{ low: number; high: number; average: number } | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Match score
  const [matchScore, setMatchScore] = useState<number | null>(null);

  // Enhanced bid form
  const [bidType, setBidType] = useState<"flat" | "itemized">("flat");
  const [lineItems, setLineItems] = useState<{ description: string; amount: string }[]>([{ description: "", amount: "" }]);
  const [partsNeeded, setPartsNeeded] = useState("");
  const [equipmentList, setEquipmentList] = useState("");

  const fetchJob = useCallback(async () => {
    try {
      const { data } = await api<{ job: Job }>(`/api/jobs/${id}`);
      setJob(data.job || (data as unknown as Job));
    } catch {
      /* ignore */
    }
    // Fetch bids to check if user already bid
    try {
      const { data: bidData } = await api<{
        bids: Bid[];
      }>(`/api/jobs/${id}/bids`);
      const mine = (bidData.bids || []).find(
        (b) => b.contractor_id === user?.id
      );
      if (mine) setMyBid(mine);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  // Portfolio gate check
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data } = await api<{ portfolio?: { before_photos?: string[]; after_photos?: string[] }[]; items?: { before_photos?: string[]; after_photos?: string[] }[] }>(
          `/api/portfolio?contractorId=${user.id}`
        );
        const portfolio = data.portfolio || data.items || [];
        const total = portfolio.reduce((sum: number, item: { before_photos?: string[]; after_photos?: string[] }) => {
          const b = Array.isArray(item.before_photos) ? item.before_photos.length : 0;
          const a = Array.isArray(item.after_photos) ? item.after_photos.length : 0;
          return sum + b + a;
        }, 0);
        setPortfolioPhotoCount(total);
      } catch {
        setPortfolioPhotoCount(0);
      }
      setPortfolioGateChecked(true);
    })();
  }, [user?.id]);

  // Match score and AI price estimate
  useEffect(() => {
    if (!job || !user?.id) return;
    // Fetch match score
    (async () => {
      try {
        const { data } = await api<{ match_score?: number; score?: number }>(
          `/api/jobs/${id}/match-score`
        );
        setMatchScore(data.match_score ?? data.score ?? null);
      } catch {
        /* ignore */
      }
    })();
  }, [job, user?.id, id]);

  const fetchPriceEstimate = async () => {
    if (!job) return;
    setLoadingEstimate(true);
    try {
      const { data } = await api<{ low: number; high: number; average: number }>(
        `/api/ai/price-estimate?category=${job.category}&location=${encodeURIComponent(job.location || "")}&title=${encodeURIComponent(job.title)}`
      );
      setPriceEstimate(data);
    } catch {
      /* ignore */
    }
    setLoadingEstimate(false);
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { description: "", amount: "" }]);
  };

  const updateLineItem = (index: number, field: "description" | "amount", value: string) => {
    setLineItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const itemizedTotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const handleBid = async () => {
    const finalPrice = bidType === "itemized" ? itemizedTotal : Number(price);
    if (!finalPrice || isNaN(finalPrice) || finalPrice <= 0) {
      Alert.alert("Error", "Enter a valid price");
      return;
    }
    // Portfolio gate
    if (portfolioPhotoCount !== null && portfolioPhotoCount < 3) {
      Alert.alert(
        "Portfolio Required",
        `You need at least 3 portfolio photos to bid on jobs. You currently have ${portfolioPhotoCount}. Go to Portfolio to add more.`
      );
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/jobs/${id}/bids`, {
        method: "POST",
        body: JSON.stringify({
          price: finalPrice,
          bid_type: bidType,
          line_items: bidType === "itemized" ? lineItems.filter((li) => li.description && li.amount) : undefined,
          parts_needed: partsNeeded || undefined,
          equipment_list: equipmentList || undefined,
          timeline: timeline || `${timelineDays} days`,
          timeline_days: timelineDays ? Number(timelineDays) : undefined,
          availability_date: availabilityDate || undefined,
          message,
        }),
      });
      setBidSubmitted(true);
      // Re-fetch to get updated bid
      fetchJob();
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSubmitting(false);
  };

  const updateJobStatus = async (
    status: "in_progress" | "completed"
  ) => {
    const label =
      status === "in_progress" ? "Mark as In Progress" : "Mark as Complete";
    const confirmMsg =
      status === "in_progress"
        ? "This will notify the client that you've started working."
        : "Mark this job as complete? The client will be asked to confirm and release payment.";

    Alert.alert(label, confirmMsg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          setUpdatingStatus(true);
          try {
            await api(`/api/jobs/${id}/status`, {
              method: "PUT",
              body: JSON.stringify({ status }),
            });
            Alert.alert(
              "Updated",
              status === "in_progress"
                ? "Job marked as in progress!"
                : "Job marked as complete! Waiting for client confirmation."
            );
            fetchJob();
          } catch (err: unknown) {
            Alert.alert("Error", (err as Error).message);
          }
          setUpdatingStatus(false);
        },
      },
    ]);
  };

  const pickPhotos = async (type: "before" | "after") => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      if (type === "before") {
        setBeforePhotos((prev) => [...prev, ...uris]);
      } else {
        setAfterPhotos((prev) => [...prev, ...uris]);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <SkeletonScreen />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={48} color="#94a3b8" />
        <Text style={styles.notFoundText}>Job not found</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const catKey =
    job.category?.toLowerCase().replace(/_/g, "") || "general";
  const emoji = CATEGORY_EMOJIS[catKey] || "\uD83D\uDD27";
  const urgency = URGENCY_CONFIG[job.urgency] || URGENCY_CONFIG.low;
  const jobStatus =
    JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.posted;
  const photos = job.photos
    ? (() => {
        try {
          return JSON.parse(job.photos);
        } catch {
          return [];
        }
      })()
    : [];

  const isBidAccepted = myBid?.status === "accepted";
  const isActiveJob =
    isBidAccepted &&
    (job.status === "accepted" ||
      job.status === "in_progress" ||
      job.status === "completed");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      {/* Job header */}
      <View style={styles.jobHeader}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryEmoji}>{emoji}</Text>
            <Text style={styles.categoryLabel}>
              {job.category?.replace(/_/g, " ")}
            </Text>
          </View>
          <View
            style={[
              styles.jobStatusBadge,
              { backgroundColor: jobStatus.bg },
            ]}
          >
            <Text style={[styles.jobStatusText, { color: jobStatus.text }]}>
              {jobStatus.label}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{job.title}</Text>
        {job.description ? (
          <Text style={styles.desc}>{job.description}</Text>
        ) : null}
        {matchScore !== null && matchScore > 0 && (
          <View style={styles.matchScoreBadge}>
            <Ionicons name="sparkles" size={14} color="#7c3aed" />
            <Text style={styles.matchScoreText}>{matchScore}% match</Text>
          </View>
        )}
      </View>

      {/* Info cards */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Ionicons
            name="location-outline"
            size={20}
            color={COLORS.primaryLight}
          />
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValue}>
            {job.location || "Not specified"}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons
            name="flash-outline"
            size={20}
            color={urgency.text}
          />
          <Text style={styles.infoLabel}>Urgency</Text>
          <View
            style={[styles.urgencyPill, { backgroundColor: urgency.bg }]}
          >
            <Text style={[styles.urgencyText, { color: urgency.text }]}>
              {urgency.label}
            </Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Ionicons
            name="time-outline"
            size={20}
            color={COLORS.primaryLight}
          />
          <Text style={styles.infoLabel}>Posted</Text>
          <Text style={styles.infoValue}>{timeAgo(job.created_at)}</Text>
        </View>
        <View style={styles.infoCard}>
          <Ionicons
            name="people-outline"
            size={20}
            color={COLORS.primaryLight}
          />
          <Text style={styles.infoLabel}>Bids</Text>
          <Text style={styles.infoValue}>{job.bid_count || 0} bids</Text>
        </View>
      </View>

      {/* Photos */}
      {photos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.map((url: string, i: number) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={styles.photo}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.divider} />

      {/* Escrow Info for Contractor (when bid accepted) */}
      {isBidAccepted && myBid?.price && (
        <View style={styles.escrowInfoCard}>
          <View style={styles.escrowInfoHeader}>
            <Text style={styles.escrowInfoIcon}>
              {"\uD83D\uDCB0"}
            </Text>
            <Text style={styles.escrowInfoTitle}>
              ${myBid.price.toLocaleString()} secured in escrow
            </Text>
          </View>
          <Text style={styles.escrowInfoDesc}>
            Payment releases when client confirms completion
          </Text>
        </View>
      )}

      {/* Active Job View - when bid is accepted */}
      {isActiveJob && (
        <View style={styles.activeJobCard}>
          <Text style={styles.activeJobTitle}>Active Job</Text>

          {/* Job details summary */}
          <View style={styles.activeJobRow}>
            <Ionicons
              name="briefcase-outline"
              size={16}
              color={COLORS.muted}
            />
            <Text style={styles.activeJobText}>
              {job.category?.replace(/_/g, " ")} - {job.title}
            </Text>
          </View>
          <View style={styles.activeJobRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={COLORS.muted}
            />
            <Text style={styles.activeJobText}>
              {job.location || "Location not specified"}
            </Text>
          </View>
          <View style={styles.activeJobRow}>
            <Ionicons
              name="cash-outline"
              size={16}
              color={COLORS.success}
            />
            <Text
              style={[styles.activeJobText, { color: COLORS.success, fontWeight: "700" }]}
            >
              ${myBid?.price?.toLocaleString()}
            </Text>
          </View>

          <View style={styles.dividerThin} />

          {/* Status Action Buttons */}
          <View style={styles.statusActions}>
            {job.status === "accepted" && (
              <TouchableOpacity
                style={styles.inProgressBtn}
                onPress={() => updateJobStatus("in_progress")}
                disabled={updatingStatus}
                activeOpacity={0.8}
              >
                {updatingStatus ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="hammer-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.inProgressBtnText}>
                      Mark as In Progress
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {job.status === "in_progress" && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => updateJobStatus("completed")}
                disabled={updatingStatus}
                activeOpacity={0.8}
              >
                {updatingStatus ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color={COLORS.white}
                    />
                    <Text style={styles.completeBtnText}>
                      Mark as Complete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {job.status === "completed" && (
              <View style={styles.completedBanner}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={COLORS.success}
                />
                <Text style={styles.completedBannerText}>
                  Job completed! Waiting for client to confirm.
                </Text>
              </View>
            )}
          </View>

          {/* Upload Before/After Photos */}
          {(job.status === "in_progress" || job.status === "completed") && (
            <View style={styles.photoUploadSection}>
              <Text style={styles.photoUploadTitle}>
                Before / After Photos
              </Text>
              <Text style={styles.photoUploadSubtitle}>
                Upload photos to show your work
              </Text>

              <View style={styles.photoUploadRow}>
                <View style={styles.photoUploadCol}>
                  <Text style={styles.photoUploadLabel}>Before</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {beforePhotos.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={styles.uploadedPhoto}
                      />
                    ))}
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      onPress={() => pickPhotos("before")}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color={COLORS.muted}
                      />
                      <Text style={styles.addPhotoBtnText}>Add</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                <View style={styles.photoUploadCol}>
                  <Text style={styles.photoUploadLabel}>After</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                  >
                    {afterPhotos.map((uri, i) => (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={styles.uploadedPhoto}
                      />
                    ))}
                    <TouchableOpacity
                      style={styles.addPhotoBtn}
                      onPress={() => pickPhotos("after")}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={24}
                        color={COLORS.muted}
                      />
                      <Text style={styles.addPhotoBtnText}>Add</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Client info if bid accepted */}
      {myBid?.status === "accepted" && job.consumer_name && (
        <View style={styles.clientCard}>
          <Text style={styles.clientCardTitle}>Client Information</Text>
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {job.consumer_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.clientName}>{job.consumer_name}</Text>
              <Text style={styles.clientMeta}>
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={COLORS.muted}
                />{" "}
                Client
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Bid section - show bid submitted state or form */}
      {!isActiveJob && (
        <>
          {bidSubmitted ? (
            <View style={styles.bidSubmittedCard}>
              <View style={styles.bidSubmittedIcon}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={COLORS.success}
                />
              </View>
              <Text style={styles.bidSubmittedTitle}>Bid Submitted!</Text>
              <Text style={styles.bidSubmittedSubtitle}>
                The client will be notified and can accept your bid.
              </Text>
              <TouchableOpacity
                style={styles.backToJobsBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Text style={styles.backToJobsBtnText}>Back to Jobs</Text>
              </TouchableOpacity>
            </View>
          ) : myBid ? (
            <View style={styles.existingBidCard}>
              <View style={styles.existingBidHeader}>
                <Text style={styles.existingBidTitle}>Your Bid</Text>
                <View
                  style={[
                    styles.bidStatusBadge,
                    {
                      backgroundColor: (
                        STATUS_CONFIG[myBid.status] || STATUS_CONFIG.pending
                      ).bg,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      (
                        STATUS_CONFIG[myBid.status] ||
                        STATUS_CONFIG.pending
                      ).icon as any
                    }
                    size={14}
                    color={
                      (
                        STATUS_CONFIG[myBid.status] ||
                        STATUS_CONFIG.pending
                      ).text
                    }
                  />
                  <Text
                    style={[
                      styles.bidStatusText,
                      {
                        color: (
                          STATUS_CONFIG[myBid.status] ||
                          STATUS_CONFIG.pending
                        ).text,
                      },
                    ]}
                  >
                    {myBid.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.existingBidPrice}>
                ${myBid.price?.toLocaleString()}
              </Text>
              {myBid.timeline_days ? (
                <View style={styles.existingBidRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={COLORS.muted}
                  />
                  <Text style={styles.existingBidMeta}>
                    {myBid.timeline_days} days
                  </Text>
                </View>
              ) : null}
              {myBid.message && (
                <View style={styles.existingBidRow}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={14}
                    color={COLORS.muted}
                  />
                  <Text style={styles.existingBidMeta}>
                    {myBid.message}
                  </Text>
                </View>
              )}
              <Text style={styles.existingBidTime}>
                Submitted {timeAgo(myBid.created_at)}
              </Text>
            </View>
          ) : (
            <View style={styles.bidForm}>
              <Text style={styles.formTitle}>Place Your Bid</Text>

              {/* Portfolio Gate Warning */}
              {portfolioGateChecked && portfolioPhotoCount !== null && portfolioPhotoCount < 3 && (
                <View style={styles.portfolioGateCard}>
                  <Ionicons name="alert-circle" size={20} color="#d97706" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.portfolioGateTitle}>Portfolio Required</Text>
                    <Text style={styles.portfolioGateDesc}>
                      You need at least 3 portfolio photos to bid. You have {portfolioPhotoCount}. Add more in your Portfolio.
                    </Text>
                  </View>
                </View>
              )}

              {/* AI Market Rate Insight */}
              <TouchableOpacity
                style={styles.aiInsightBtn}
                onPress={fetchPriceEstimate}
                disabled={loadingEstimate}
                activeOpacity={0.7}
              >
                {loadingEstimate ? (
                  <ActivityIndicator size="small" color={COLORS.primaryLight} />
                ) : (
                  <Ionicons name="sparkles" size={18} color={COLORS.primaryLight} />
                )}
                <Text style={styles.aiInsightBtnText}>
                  {priceEstimate ? "AI Market Rate" : "Get AI Market Rate Insight"}
                </Text>
              </TouchableOpacity>
              {priceEstimate && (
                <View style={styles.priceEstimateCard}>
                  <View style={styles.priceEstimateRow}>
                    <View style={styles.priceEstimateItem}>
                      <Text style={styles.priceEstimateLabel}>Low</Text>
                      <Text style={styles.priceEstimateValue}>${priceEstimate.low.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.priceEstimateItem, styles.priceEstimateItemHighlight]}>
                      <Text style={styles.priceEstimateLabel}>Average</Text>
                      <Text style={[styles.priceEstimateValue, { color: COLORS.primaryLight }]}>${priceEstimate.average.toLocaleString()}</Text>
                    </View>
                    <View style={styles.priceEstimateItem}>
                      <Text style={styles.priceEstimateLabel}>High</Text>
                      <Text style={styles.priceEstimateValue}>${priceEstimate.high.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Bid Type Toggle */}
              <Text style={styles.label}>Pricing Type</Text>
              <View style={styles.bidTypeToggle}>
                <TouchableOpacity
                  style={[styles.bidTypeBtn, bidType === "flat" && styles.bidTypeBtnActive]}
                  onPress={() => setBidType("flat")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cash-outline" size={16} color={bidType === "flat" ? COLORS.white : COLORS.muted} />
                  <Text style={[styles.bidTypeBtnText, bidType === "flat" && styles.bidTypeBtnTextActive]}>Flat Rate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bidTypeBtn, bidType === "itemized" && styles.bidTypeBtnActive]}
                  onPress={() => setBidType("itemized")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="list-outline" size={16} color={bidType === "itemized" ? COLORS.white : COLORS.muted} />
                  <Text style={[styles.bidTypeBtnText, bidType === "itemized" && styles.bidTypeBtnTextActive]}>Itemized</Text>
                </TouchableOpacity>
              </View>

              {bidType === "flat" ? (
                <>
                  <Text style={styles.label}>Your Price *</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.pricePrefix}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Line Items *</Text>
                  {lineItems.map((item, idx) => (
                    <View key={idx} style={styles.lineItemRow}>
                      <TextInput
                        style={[styles.input, { flex: 2 }]}
                        placeholder="Description"
                        placeholderTextColor="#94a3b8"
                        value={item.description}
                        onChangeText={(v) => updateLineItem(idx, "description", v)}
                      />
                      <View style={[styles.priceInputContainer, { flex: 1 }]}>
                        <Text style={[styles.pricePrefix, { fontSize: 16 }]}>$</Text>
                        <TextInput
                          style={[styles.priceInput, { fontSize: 16 }]}
                          placeholder="0"
                          placeholderTextColor="#94a3b8"
                          value={item.amount}
                          onChangeText={(v) => updateLineItem(idx, "amount", v)}
                          keyboardType="numeric"
                        />
                      </View>
                      {lineItems.length > 1 && (
                        <TouchableOpacity onPress={() => removeLineItem(idx)} style={{ padding: 4 }}>
                          <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addLineItemBtn} onPress={addLineItem} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.primaryLight} />
                    <Text style={styles.addLineItemText}>Add line item</Text>
                  </TouchableOpacity>
                  <View style={styles.itemizedTotalRow}>
                    <Text style={styles.itemizedTotalLabel}>Total</Text>
                    <Text style={styles.itemizedTotalValue}>${itemizedTotal.toLocaleString()}</Text>
                  </View>
                </>
              )}

              {/* Parts & Equipment */}
              <Text style={styles.label}>Parts Needed</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., PVC fittings, copper pipe, sealant"
                placeholderTextColor="#94a3b8"
                value={partsNeeded}
                onChangeText={setPartsNeeded}
              />

              <Text style={styles.label}>Equipment Required</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pipe wrench, soldering kit"
                placeholderTextColor="#94a3b8"
                value={equipmentList}
                onChangeText={setEquipmentList}
              />

              <Text style={styles.label}>Timeline (days) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                placeholderTextColor="#94a3b8"
                value={timelineDays}
                onChangeText={setTimelineDays}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Estimated timeline description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2-3 business days"
                placeholderTextColor="#94a3b8"
                value={timeline}
                onChangeText={setTimeline}
              />

              <Text style={styles.label}>Earliest availability</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Tomorrow, March 15"
                placeholderTextColor="#94a3b8"
                value={availabilityDate}
                onChangeText={setAvailabilityDate}
              />

              <Text style={styles.label}>Message to Client</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Describe your approach and experience..."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleBid}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Bid</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Bottom safe area */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    gap: 12,
  },
  notFoundText: { fontSize: 16, color: "#94a3b8", fontWeight: "500" },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    marginTop: 8,
  },
  backBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },

  jobHeader: { marginBottom: 20 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 8,
    lineHeight: 30,
  },
  desc: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    width: "48%",
    flexGrow: 1,
    gap: 6,
  },
  infoLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", color: COLORS.secondary },
  urgencyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  urgencyText: { fontSize: 12, fontWeight: "600" },

  photosSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 12,
  },
  photo: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: "#e2e8f0",
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 20,
  },
  dividerThin: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },

  // Escrow Info
  escrowInfoCard: {
    backgroundColor: COLORS.successLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  escrowInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  escrowInfoIcon: { fontSize: 20 },
  escrowInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.success,
  },
  escrowInfoDesc: {
    fontSize: 14,
    color: "#065f46",
    lineHeight: 20,
  },

  // Active Job Card
  activeJobCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  activeJobTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 14,
  },
  activeJobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  activeJobText: {
    fontSize: 14,
    color: COLORS.secondary,
    flex: 1,
  },

  // Status Action Buttons
  statusActions: {
    gap: 10,
  },
  inProgressBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.warning,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  inProgressBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  completeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.successLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  completedBannerText: {
    fontSize: 14,
    color: "#065f46",
    fontWeight: "600",
    flex: 1,
  },

  // Photo Upload
  photoUploadSection: {
    marginTop: 16,
  },
  photoUploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  photoUploadSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 14,
  },
  photoUploadRow: {
    gap: 14,
  },
  photoUploadCol: {
    gap: 8,
  },
  photoUploadLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  uploadedPhoto: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  addPhotoBtn: {
    width: 70,
    height: 70,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  addPhotoBtnText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },

  // Bid Submitted State
  bidSubmittedCard: {
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1.5,
    borderColor: "#a7f3d0",
  },
  bidSubmittedIcon: {
    marginBottom: 12,
  },
  bidSubmittedTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.success,
    marginBottom: 6,
  },
  bidSubmittedSubtitle: {
    fontSize: 15,
    color: "#065f46",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  backToJobsBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backToJobsBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },

  // Existing bid card
  existingBidCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  existingBidHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  existingBidTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  bidStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  bidStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  existingBidPrice: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.success,
    marginBottom: 12,
  },
  existingBidRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  existingBidMeta: { fontSize: 14, color: COLORS.muted, flex: 1 },
  existingBidTime: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },

  // Match Score Badge
  matchScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginTop: 10,
  },
  matchScoreText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },

  // Portfolio Gate
  portfolioGateCard: {
    flexDirection: "row",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  portfolioGateTitle: { fontSize: 14, fontWeight: "700", color: "#d97706", marginBottom: 2 },
  portfolioGateDesc: { fontSize: 13, color: "#92400e", lineHeight: 18 },

  // AI Insight
  aiInsightBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  aiInsightBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.primaryLight },
  priceEstimateCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceEstimateRow: { flexDirection: "row", justifyContent: "space-between" },
  priceEstimateItem: { alignItems: "center", flex: 1 },
  priceEstimateItemHighlight: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.border },
  priceEstimateLabel: { fontSize: 11, color: COLORS.muted, fontWeight: "500", marginBottom: 4 },
  priceEstimateValue: { fontSize: 18, fontWeight: "800", color: COLORS.secondary },

  // Bid Type Toggle
  bidTypeToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  bidTypeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  bidTypeBtnActive: { backgroundColor: COLORS.primaryLight },
  bidTypeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  bidTypeBtnTextActive: { color: COLORS.white },

  // Line Items
  lineItemRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  addLineItemBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  addLineItemText: { fontSize: 14, fontWeight: "600", color: COLORS.primaryLight },
  itemizedTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    marginBottom: 8,
  },
  itemizedTotalLabel: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  itemizedTotalValue: { fontSize: 22, fontWeight: "800", color: COLORS.success },

  bidForm: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 14,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  pricePrefix: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.secondary,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.secondary,
    paddingVertical: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.secondary,
  },
  messageInput: {
    height: 100,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  clientCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 14,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  clientMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});

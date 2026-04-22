import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import RNMapView, { Marker, Region, PROVIDER_GOOGLE } from "react-native-maps";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import {
  getCurrentLocation,
  haversineDistanceMiles,
  formatDistance,
} from "@/lib/location";
import {
  colors,
  typography,
  spacing,
  radius,
  shadows,
} from "../../lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_HEIGHT = Math.max(SCREEN_HEIGHT * 0.72, 480);
const ITEM_HEIGHT = CARD_HEIGHT + 16; // card + marginBottom

type ViewMode = "cards" | "list" | "map";

const COLORS = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  primaryBg: "#DBEAFE",
  secondary: colors.text,
  muted: colors.muted,
  mutedLight: "#94a3b8",
  surface: colors.surface,
  border: colors.border,
  white: colors.white,
  success: colors.success,
  successBg: "#f0fdf4",
  warning: colors.warning,
  warningBg: "#fffbeb",
  danger: colors.danger,
  dangerBg: "#fef2f2",
  purple: "#7c3aed",
  purpleBg: "#f5f3ff",
  cyan: "#0891b2",
  cyanBg: "#ecfeff",
};

const CATEGORIES = [
  { label: "All", value: "all", icon: "grid-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Plumbing", value: "plumbing", icon: "water-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Electrical", value: "electrical", icon: "flash-outline" as keyof typeof Ionicons.glyphMap },
  { label: "HVAC", value: "hvac", icon: "thermometer-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Landscaping", value: "landscaping", icon: "leaf-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Auto", value: "auto", icon: "car-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Cleaning", value: "cleaning", icon: "sparkles-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Painting", value: "painting", icon: "color-palette-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Carpentry", value: "carpentry", icon: "hammer-outline" as keyof typeof Ionicons.glyphMap },
  { label: "General", value: "general", icon: "construct-outline" as keyof typeof Ionicons.glyphMap },
];

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

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest", icon: "time-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Highest Budget", value: "budget", icon: "cash-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Most Urgent", value: "urgent", icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Fewest Bids", value: "bids", icon: "people-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Nearest", value: "nearest", icon: "navigate-outline" as keyof typeof Ionicons.glyphMap },
];

const URGENCY_CONFIG: Record<string, { bg: string; text: string; label: string; dotColor: string; gradient: [string, string] }> = {
  low: { bg: "#f1f5f9", text: "#64748b", label: "Low", dotColor: "#94a3b8", gradient: ["#94a3b8", "#64748b"] },
  medium: { bg: "#eff6ff", text: "#2563eb", label: "Medium", dotColor: "#3b82f6", gradient: ["#3b82f6", "#2563eb"] },
  high: { bg: "#fffbeb", text: "#d97706", label: "High", dotColor: "#f59e0b", gradient: ["#f59e0b", "#d97706"] },
  emergency: { bg: "#fef2f2", text: "#dc2626", label: "Emergency", dotColor: "#ef4444", gradient: ["#ef4444", "#dc2626"] },
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

function getCatEmoji(category: string): string {
  const key = category?.toLowerCase().replace(/[_ ]/g, "");
  for (const [k, v] of Object.entries(CATEGORY_EMOJIS)) {
    if (key?.includes(k)) return v;
  }
  return "\uD83D\uDD27";
}

/* ── Skeleton loading ── */
function SkeletonCard({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);
  return (
    <Animated.View style={[listStyles.card, { opacity }]}>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#e2e8f0" }} />
        <View style={{ flex: 1 }}>
          <View style={{ width: "70%", height: 16, borderRadius: 8, backgroundColor: "#e2e8f0", marginBottom: 6 }} />
          <View style={{ width: "40%", height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
        </View>
      </View>
      <View style={{ width: "90%", height: 18, borderRadius: 9, backgroundColor: "#e2e8f0", marginBottom: 10 }} />
      <View style={{ width: "60%", height: 14, borderRadius: 7, backgroundColor: "#e2e8f0" }} />
    </Animated.View>
  );
}

function PulseView({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

/* ══════════════════════════════════════════════════════════════
   INSTAGRAM CARD VIEW - Full-screen swipeable job cards
   ══════════════════════════════════════════════════════════════ */

function InstagramJobCard({
  item,
  onPress,
}: {
  item: Job;
  onPress: () => void;
}) {
  const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.low;
  const isHot = item.urgency === "emergency" || item.urgency === "high";
  let photos: string[] = [];
  try {
    photos = item.photos ? (typeof item.photos === "string" ? JSON.parse(item.photos) : item.photos) : [];
  } catch { /* malformed photos JSON */ }
  const hasPhoto = photos.length > 0;
  const emoji = getCatEmoji(item.category);
  const budgetText =
    item.budget_min && item.budget_max
      ? `$${item.budget_min} – $${item.budget_max}`
      : item.budget_max
        ? `Up to $${item.budget_max}`
        : item.budget_range || null;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={cardStyles.container}
    >
      {/* Background — photo or gradient */}
      {hasPhoto ? (
        <Image
          source={{ uri: photos[0] }}
          style={cardStyles.bgImage}
          blurRadius={1}
        />
      ) : (
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#0F172A"]}
          style={cardStyles.bgGradient}
        />
      )}

      {/* Overlay for readability */}
      <LinearGradient
        colors={[
          "rgba(15,23,42,0.3)",
          "rgba(15,23,42,0.1)",
          "rgba(15,23,42,0.7)",
          "rgba(15,23,42,0.95)",
        ]}
        locations={[0, 0.3, 0.6, 1]}
        style={cardStyles.overlay}
      />

      {/* Top badges */}
      <View style={cardStyles.topRow}>
        {isHot && (
          <View style={cardStyles.hotBadge}>
            <PulseView>
              <View style={cardStyles.hotDot} />
            </PulseView>
            <Text style={cardStyles.hotText}>
              {item.urgency === "emergency" ? "URGENT" : "HOT"}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <View style={cardStyles.timeBadge}>
          <Ionicons name="time-outline" size={12} color="#94A3B8" />
          <Text style={cardStyles.timeText}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>

      {/* Photo counter if multiple photos */}
      {photos.length > 1 && (
        <View style={cardStyles.photoCount}>
          <Ionicons name="images-outline" size={14} color="#FFFFFF" />
          <Text style={cardStyles.photoCountText}>{photos.length}</Text>
        </View>
      )}

      {/* Bottom content area */}
      <View style={cardStyles.bottomContent}>
        {/* Category + Urgency row */}
        <View style={cardStyles.metaRow}>
          <View style={cardStyles.categoryChip}>
            <Text style={cardStyles.categoryEmoji}>{emoji}</Text>
            <Text style={cardStyles.categoryText}>
              {item.category?.replace(/_/g, " ")}
            </Text>
          </View>
          <View
            style={[cardStyles.urgencyChip, { backgroundColor: urgency.bg + "CC" }]}
          >
            <View style={[cardStyles.urgencyDot, { backgroundColor: urgency.dotColor }]} />
            <Text style={[cardStyles.urgencyText, { color: urgency.text }]}>
              {urgency.label}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={cardStyles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Description */}
        {item.description ? (
          <Text style={cardStyles.description} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        {/* Info pills row */}
        <View style={cardStyles.pillsRow}>
          {/* Location / Distance */}
          <View style={cardStyles.pill}>
            <Ionicons name="navigate-outline" size={13} color="#818CF8" />
            <Text style={cardStyles.pillText}>
              {item.distance_miles != null
                ? formatDistance(item.distance_miles)
                : item.location || "Location hidden"}
            </Text>
          </View>

          {/* Budget */}
          {budgetText && (
            <View style={cardStyles.pill}>
              <Ionicons name="cash-outline" size={13} color="#10B981" />
              <Text style={cardStyles.pillText}>{budgetText}</Text>
            </View>
          )}

          {/* Bids */}
          <View style={cardStyles.pill}>
            <Ionicons name="people-outline" size={13} color="#F59E0B" />
            <Text style={cardStyles.pillText}>
              {item.bid_count || 0} bid{(item.bid_count || 0) !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={cardStyles.bidButton}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#2563EB", "#1D4ED8"]}
            style={cardStyles.bidButtonGradient}
          >
            <Text style={cardStyles.bidButtonText}>View & Bid</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

/* ══════════════════════════════════════════════════════════════
   UBER-STYLE MAP VIEW - Interactive map with job markers
   ══════════════════════════════════════════════════════════════ */

const URGENCY_PIN_COLORS: Record<string, string> = {
  emergency: "#EF4444",
  high: "#F59E0B",
  medium: "#2563EB",
  low: "#94A3B8",
};

function UberMapView({
  jobs,
  userLocation,
  onJobPress,
}: {
  jobs: Job[];
  userLocation: { lat: number; lng: number } | null;
  onJobPress: (job: Job) => void;
}) {
  const mapRef = useRef<RNMapView>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const slideAnim = useRef(new Animated.Value(200)).current;

  const jobsWithCoords = jobs.filter((j) => j.latitude && j.longitude);

  const initialRegion: Region = {
    latitude: userLocation?.lat ?? 37.78,
    longitude: userLocation?.lng ?? -122.42,
    latitudeDelta: 0.12,
    longitudeDelta: 0.12,
  };

  // Fit map to show all markers after they load
  useEffect(() => {
    if (jobsWithCoords.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        const ids = jobsWithCoords.map((j) => j.id);
        mapRef.current?.fitToSuppliedMarkers(ids, {
          edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
          animated: true,
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [jobsWithCoords.length]);

  // Animate the bottom card in/out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: selectedJob ? 0 : 200,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [selectedJob, slideAnim]);

  const handleMarkerPress = (job: Job) => {
    setSelectedJob(job);
    if (job.latitude && job.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: job.latitude,
          longitude: job.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        400
      );
    }
  };

  const recenterMap = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        },
        500
      );
    }
  };

  return (
    <View style={mapStyles.container}>
      <RNMapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={mapStyles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        onPress={() => setSelectedJob(null)}
      >
        {jobsWithCoords.map((job) => {
          const pinColor = URGENCY_PIN_COLORS[job.urgency] || URGENCY_PIN_COLORS.low;
          return (
            <Marker
              key={job.id}
              identifier={job.id}
              coordinate={{
                latitude: job.latitude!,
                longitude: job.longitude!,
              }}
              onPress={() => handleMarkerPress(job)}
            >
              <View style={[mapStyles.markerOuter, { borderColor: pinColor }]}>
                <View style={[mapStyles.markerInner, { backgroundColor: pinColor }]}>
                  <Text style={mapStyles.markerEmoji}>{getCatEmoji(job.category)}</Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </RNMapView>

      {/* Job count badge */}
      <View style={mapStyles.countBadge}>
        <Ionicons name="briefcase" size={14} color={COLORS.primary} />
        <Text style={mapStyles.countText}>
          {jobsWithCoords.length} job{jobsWithCoords.length !== 1 ? "s" : ""} near you
        </Text>
      </View>

      {/* Recenter button */}
      <TouchableOpacity style={mapStyles.recenterBtn} onPress={recenterMap} activeOpacity={0.8}>
        <Ionicons name="navigate" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Selected job bottom card */}
      <Animated.View
        style={[
          mapStyles.bottomCard,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {selectedJob && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onJobPress(selectedJob)}
          >
            <View style={mapStyles.bottomCardHandle} />
            <View style={mapStyles.bottomCardRow}>
              <View style={[mapStyles.bottomCardDot, { backgroundColor: URGENCY_PIN_COLORS[selectedJob.urgency] || "#94A3B8" }]} />
              <Text style={mapStyles.bottomCardCategory}>
                {getCatEmoji(selectedJob.category)}{" "}
                {selectedJob.category?.replace(/_/g, " ")}
              </Text>
              <Text style={mapStyles.bottomCardUrgency}>
                {(URGENCY_CONFIG[selectedJob.urgency] || URGENCY_CONFIG.low).label}
              </Text>
            </View>
            <Text style={mapStyles.bottomCardTitle} numberOfLines={2}>
              {selectedJob.title}
            </Text>
            {selectedJob.description ? (
              <Text style={mapStyles.bottomCardDesc} numberOfLines={2}>
                {selectedJob.description}
              </Text>
            ) : null}
            <View style={mapStyles.bottomCardInfoRow}>
              {selectedJob.distance_miles != null && (
                <View style={mapStyles.bottomCardPill}>
                  <Ionicons name="navigate-outline" size={13} color="#818CF8" />
                  <Text style={mapStyles.bottomCardPillText}>
                    {formatDistance(selectedJob.distance_miles)}
                  </Text>
                </View>
              )}
              {(selectedJob.budget_min || selectedJob.budget_max) && (
                <View style={mapStyles.bottomCardPill}>
                  <Ionicons name="cash-outline" size={13} color="#10B981" />
                  <Text style={mapStyles.bottomCardPillText}>
                    {selectedJob.budget_min && selectedJob.budget_max
                      ? `$${selectedJob.budget_min} – $${selectedJob.budget_max}`
                      : `Up to $${selectedJob.budget_max}`}
                  </Text>
                </View>
              )}
              <View style={mapStyles.bottomCardPill}>
                <Ionicons name="people-outline" size={13} color="#F59E0B" />
                <Text style={mapStyles.bottomCardPillText}>
                  {selectedJob.bid_count || 0} bid{(selectedJob.bid_count || 0) !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={mapStyles.bottomCardBtn}
              onPress={() => onJobPress(selectedJob)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#2563EB", "#1D4ED8"]}
                style={mapStyles.bottomCardBtnGradient}
              >
                <Text style={mapStyles.bottomCardBtnText}>View & Bid</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Empty state */}
      {jobsWithCoords.length === 0 && (
        <View style={mapStyles.emptyOverlay}>
          <View style={mapStyles.emptyCard}>
            <Ionicons name="location-outline" size={36} color={COLORS.mutedLight} />
            <Text style={mapStyles.emptyText}>No jobs with location data found</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */

export default function ContractorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  // Get user location for distance calculation
  useEffect(() => {
    getCurrentLocation().then((loc) => {
      if (loc) setUserLocation(loc);
    });
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api<{ jobs: Job[] }>("/api/jobs?status=posted,bidding&limit=50");
      setJobs(data.jobs || []);
    } catch (err) {
      if (__DEV__) console.error("[ContractorDashboard] error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh location too
    getCurrentLocation().then((loc) => {
      if (loc) setUserLocation(loc);
    });
    await fetchJobs();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(" ")[0] || "Pro";

  // Enrich jobs with distance
  const enrichedJobs = jobs.map((j) => {
    if (userLocation && j.latitude && j.longitude) {
      return {
        ...j,
        distance_miles: haversineDistanceMiles(
          userLocation.lat,
          userLocation.lng,
          j.latitude,
          j.longitude
        ),
      };
    }
    return j;
  });

  const filtered = enrichedJobs
    .filter((j) => {
      if (activeCategory !== "all" && !j.category?.toLowerCase().includes(activeCategory))
        return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          j.title.toLowerCase().includes(q) ||
          j.category?.toLowerCase().includes(q) ||
          j.location?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "urgent") {
        const order: Record<string, number> = { emergency: 0, high: 1, medium: 2, low: 3 };
        return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
      }
      if (sortBy === "budget") return (b.budget_max || 0) - (a.budget_max || 0);
      if (sortBy === "bids") return (a.bid_count || 0) - (b.bid_count || 0);
      if (sortBy === "nearest") {
        return (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999);
      }
      return 0;
    });

  const navigateToJob = (job: Job) => {
    router.push(`/(contractor)/job/${job.id}`);
  };

  /* ── List view job card (original) ── */
  const renderListJob = ({ item }: { item: Job }) => {
    const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.low;
    const isHot = item.urgency === "emergency" || item.urgency === "high";

    return (
      <TouchableOpacity
        style={[listStyles.card, isHot && listStyles.cardHot]}
        activeOpacity={0.7}
        onPress={() => navigateToJob(item)}
      >
        {isHot && (
          <View style={listStyles.hotBadge}>
            <PulseView>
              <View style={listStyles.hotDot} />
            </PulseView>
            <Text style={listStyles.hotText}>
              {item.urgency === "emergency" ? "URGENT" : "HOT"}
            </Text>
          </View>
        )}

        <View style={listStyles.cardHeader}>
          <View style={listStyles.categoryBadge}>
            <Text style={listStyles.categoryEmoji}>{getCatEmoji(item.category)}</Text>
            <Text style={listStyles.categoryLabel}>{item.category?.replace(/_/g, " ")}</Text>
          </View>
          <Text style={listStyles.postedTime}>{timeAgo(item.created_at)}</Text>
        </View>

        <Text style={listStyles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={listStyles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={listStyles.locationRow}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.mutedLight} />
          <Text style={listStyles.locationText}>
            {item.distance_miles != null
              ? formatDistance(item.distance_miles)
              : item.location || "No location set"}
          </Text>
        </View>

        <View style={listStyles.cardFooter}>
          <View style={[listStyles.urgencyPill, { backgroundColor: urgency.bg }]}>
            <View style={[listStyles.urgencyDot, { backgroundColor: urgency.dotColor }]} />
            <Text style={[listStyles.urgencyLabel, { color: urgency.text }]}>
              {urgency.label}
            </Text>
          </View>

          <View style={listStyles.bidCountWrap}>
            <Ionicons name="people-outline" size={13} color={COLORS.mutedLight} />
            <Text style={listStyles.bidCountText}>{item.bid_count || 0} bids</Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={listStyles.bidBtn}
            onPress={() => navigateToJob(item)}
            activeOpacity={0.85}
          >
            <Text style={listStyles.bidBtnText}>View & Bid</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
    <Animated.View style={[styles.screenInner, { opacity: screenOpacity }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hey, {firstName}</Text>
          <Text style={styles.headerTitle}>Find Jobs</Text>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.mutedLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs, skills, locations..."
            placeholderTextColor={COLORS.mutedLight}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.mutedLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.chip, activeCategory === cat.value && styles.chipActive]}
            onPress={() => setActiveCategory(cat.value)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={cat.icon}
              size={14}
              color={activeCategory === cat.value ? COLORS.white : COLORS.muted}
            />
            <Text style={[styles.chipText, activeCategory === cat.value && styles.chipTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── View mode segmented control ── */}
      <View style={styles.viewSegmentContainer}>
        {([
          { key: "cards" as ViewMode, icon: "albums-outline" as keyof typeof Ionicons.glyphMap, label: "Feed" },
          { key: "list" as ViewMode, icon: "list-outline" as keyof typeof Ionicons.glyphMap, label: "List" },
          { key: "map" as ViewMode, icon: "map-outline" as keyof typeof Ionicons.glyphMap, label: "Map" },
        ]).map((mode) => (
          <TouchableOpacity
            key={mode.key}
            style={[styles.viewSegmentBtn, viewMode === mode.key && styles.viewSegmentBtnActive]}
            onPress={() => setViewMode(mode.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode.icon}
              size={15}
              color={viewMode === mode.key ? COLORS.white : COLORS.muted}
            />
            <Text
              style={[
                styles.viewSegmentLabel,
                viewMode === mode.key && styles.viewSegmentLabelActive,
              ]}
            >
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Sort dropdown ── */}
      {showSortMenu && (
        <View style={styles.sortDropdown}>
          <Text style={styles.sortDropdownTitle}>Sort By</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(opt.value);
                setShowSortMenu(false);
              }}
            >
              <View style={styles.sortOptionLeft}>
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={sortBy === opt.value ? COLORS.primary : COLORS.muted}
                />
                <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
              </View>
              {sortBy === opt.value && (
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Sort indicator + result count ── */}
      <View style={styles.sortIndicator}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Ionicons name="swap-vertical-outline" size={14} color={COLORS.muted} />
          <Text style={styles.sortLabel}>
            {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
          </Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.muted} />
        </TouchableOpacity>
        <View style={styles.resultCountWrap}>
          <Text style={styles.resultCount}>{filtered.length}</Text>
          <Text style={styles.resultLabel}> job{filtered.length !== 1 ? "s" : ""} available</Text>
        </View>
      </View>

      {/* ── Content based on view mode ── */}
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={200} />
          <SkeletonCard delay={400} />
        </View>
      ) : viewMode === "cards" ? (
        /* ── Instagram Card View ── */
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          renderItem={({ item }) => (
            <InstagramJobCard item={item} onPress={() => navigateToJob(item)} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          getItemLayout={(_data, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          ListEmptyComponent={
            <EmptyState search={search} activeCategory={activeCategory} onClear={() => { setSearch(""); setActiveCategory("all"); }} />
          }
        />
      ) : viewMode === "map" ? (
        /* ── Uber-Style Map View ── */
        <UberMapView jobs={filtered} userLocation={userLocation} onJobPress={navigateToJob} />
      ) : (
        /* ── List View (original) ── */
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          renderItem={renderListJob}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState search={search} activeCategory={activeCategory} onClear={() => { setSearch(""); setActiveCategory("all"); }} />
          }
        />
      )}
    </Animated.View>
    </SafeAreaView>
  );
}

/* ── Shared empty state ── */
function EmptyState({
  search,
  activeCategory,
  onClear,
}: {
  search: string;
  activeCategory: string;
  onClear: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="search-outline" size={36} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>No jobs found</Text>
      <Text style={styles.emptySubtitle}>
        {search || activeCategory !== "all"
          ? "Try adjusting your filters or search terms"
          : "Check back soon for new opportunities in your area"}
      </Text>
      {(search || activeCategory !== "all") && (
        <TouchableOpacity style={styles.clearFilterBtn} onPress={onClear}>
          <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
          <Text style={styles.clearFilterText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════ */

/* ── Shared / Header styles ── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  screenInner: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerGreeting: { fontSize: 14, color: COLORS.muted, fontWeight: "500" },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.secondary, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // View segment control
  viewSegmentContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 4,
  },
  viewSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  viewSegmentBtnActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  viewSegmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
  },
  viewSegmentLabelActive: {
    color: COLORS.white,
  },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 15,
    color: COLORS.secondary,
  },

  // Category chips
  chipContainer: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginRight: 8,
    gap: 6,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  chipTextActive: { color: COLORS.white },

  // Sort dropdown
  sortDropdown: {
    position: "absolute",
    top: 145,
    right: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 200,
  },
  sortDropdownTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.mutedLight,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  sortOptionActive: { backgroundColor: COLORS.primaryBg },
  sortOptionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sortOptionText: { fontSize: 14, color: COLORS.secondary },
  sortOptionTextActive: { color: COLORS.primary, fontWeight: "700" },

  // Sort indicator
  sortIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sortLabel: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  resultCountWrap: { flexDirection: "row", alignItems: "center" },
  resultCount: { fontSize: 13, color: COLORS.primary, fontWeight: "700" },
  resultLabel: { fontSize: 12, color: COLORS.mutedLight },

  // Empty
  empty: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 32 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: COLORS.secondary, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.mutedLight,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.primaryBg,
  },
  clearFilterText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
});

/* ── Instagram Card styles ── */
const cardStyles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH - 32,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#0F172A",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hotBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  hotDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#EF4444" },
  hotText: { fontSize: 11, fontWeight: "800", color: "#EF4444", letterSpacing: 0.8 },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  timeText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  photoCount: {
    position: "absolute",
    top: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  photoCountText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  bottomContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  categoryEmoji: { fontSize: 13 },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E2E8F0",
    textTransform: "capitalize",
  },
  urgencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: 11, fontWeight: "700" },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
    lineHeight: 28,
  },
  description: {
    fontSize: 14,
    color: "#CBD5E1",
    lineHeight: 20,
    marginBottom: 14,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  pillText: { fontSize: 12, color: "#CBD5E1", fontWeight: "500" },
  bidButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  bidButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bidButtonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});

/* ── List view styles ── */
const listStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardHot: { borderWidth: 1.5, borderColor: "#fecaca" },
  hotBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
    marginBottom: 10,
  },
  hotDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.danger },
  hotText: { fontSize: 10, fontWeight: "800", color: COLORS.danger, letterSpacing: 0.8 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  categoryEmoji: { fontSize: 12 },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  postedTime: { fontSize: 12, color: COLORS.mutedLight },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
    lineHeight: 23,
  },
  cardDescription: { fontSize: 13, color: COLORS.muted, lineHeight: 19, marginBottom: 8 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  locationText: { fontSize: 13, color: COLORS.mutedLight },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  urgencyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyLabel: { fontSize: 11, fontWeight: "700" },
  bidCountWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  bidCountText: { fontSize: 12, color: COLORS.mutedLight },
  bidBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
    gap: 5,
  },
  bidBtnText: { fontSize: 13, fontWeight: "600", color: colors.white },
});

/* ── Map view styles ── */
const mapStyles = StyleSheet.create({
  container: { flex: 1 },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  // Custom map markers
  markerOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  markerInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  markerEmoji: { fontSize: 16 },
  // Job count badge (top)
  countBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countText: { fontSize: 13, fontWeight: "700", color: COLORS.secondary },
  // Recenter button
  recenterBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  // Bottom floating card
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomCardHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  bottomCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  bottomCardDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomCardCategory: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  bottomCardUrgency: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    marginLeft: "auto",
  },
  bottomCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 4,
    lineHeight: 24,
  },
  bottomCardDesc: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  bottomCardInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  bottomCardPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bottomCardPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  bottomCardBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  bottomCardBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
    borderRadius: 14,
  },
  bottomCardBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Empty overlay
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyText: { fontSize: 14, color: COLORS.mutedLight, marginTop: 12, textAlign: "center" },
});

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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

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

const SORT_OPTIONS = [
  { label: "Newest First", value: "newest", icon: "time-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Highest Budget", value: "budget", icon: "cash-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Most Urgent", value: "urgent", icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap },
  { label: "Fewest Bids", value: "bids", icon: "people-outline" as keyof typeof Ionicons.glyphMap },
];

const URGENCY_CONFIG: Record<string, { bg: string; text: string; label: string; dotColor: string }> = {
  low: { bg: "#f1f5f9", text: "#64748b", label: "Low", dotColor: "#94a3b8" },
  medium: { bg: "#eff6ff", text: "#1e40af", label: "Medium", dotColor: "#3b82f6" },
  high: { bg: "#fffbeb", text: "#d97706", label: "High", dotColor: "#f59e0b" },
  emergency: { bg: "#fef2f2", text: "#dc2626", label: "Emergency", dotColor: "#ef4444" },
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

function SkeletonCard({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);
  return (
    <Animated.View style={[styles.card, { opacity }]}>
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
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

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

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api<{ jobs: Job[] }>("/api/jobs?status=posted,bidding&limit=50");
      setJobs(data.jobs || []);
    } catch (err) {
      if (__DEV__) console.error("[ContractorDashboard] error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(" ")[0] || "Pro";

  const filtered = jobs
    .filter((j) => {
      if (activeCategory !== "all" && !j.category?.toLowerCase().includes(activeCategory)) return false;
      if (search) {
        const q = search.toLowerCase();
        return j.title.toLowerCase().includes(q) || j.category?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "urgent") {
        const order: Record<string, number> = { emergency: 0, high: 1, medium: 2, low: 3 };
        return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3);
      }
      if (sortBy === "budget") return (b.budget_max || 0) - (a.budget_max || 0);
      if (sortBy === "bids") return (a.bid_count || 0) - (b.bid_count || 0);
      return 0;
    });

  const renderJob = ({ item }: { item: Job }) => {
    const urgency = URGENCY_CONFIG[item.urgency] || URGENCY_CONFIG.low;
    const isHot = item.urgency === "emergency" || item.urgency === "high";

    return (
      <TouchableOpacity
        style={[styles.card, isHot && styles.cardHot]}
        activeOpacity={0.7}
        onPress={() => router.push(`/(contractor)/job/${item.id}`)}
      >
        {/* Hot badge */}
        {isHot && (
          <View style={styles.hotBadge}>
            <PulseView>
              <View style={styles.hotDot} />
            </PulseView>
            <Text style={styles.hotText}>{item.urgency === "emergency" ? "URGENT" : "HOT"}</Text>
          </View>
        )}

        {/* Card header with category + time */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryEmoji}>
              {CATEGORIES.find((c) => item.category?.toLowerCase().includes(c.value))?.label?.charAt(0) || "\u{1F527}"}
            </Text>
            <Text style={styles.categoryLabel}>{item.category?.replace(/_/g, " ")}</Text>
          </View>
          <Text style={styles.postedTime}>{timeAgo(item.created_at)}</Text>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Description */}
        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Location */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.mutedLight} />
          <Text style={styles.locationText}>{item.location || "No location set"}</Text>
        </View>

        {/* Footer with urgency, bids, and action */}
        <View style={styles.cardFooter}>
          <View style={[styles.urgencyPill, { backgroundColor: urgency.bg }]}>
            <View style={[styles.urgencyDot, { backgroundColor: urgency.dotColor }]} />
            <Text style={[styles.urgencyLabel, { color: urgency.text }]}>{urgency.label}</Text>
          </View>

          <View style={styles.bidCountWrap}>
            <Ionicons name="people-outline" size={13} color={COLORS.mutedLight} />
            <Text style={styles.bidCountText}>{item.bid_count || 0} bids</Text>
          </View>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            style={styles.bidBtn}
            onPress={() => router.push(`/(contractor)/job/${item.id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.bidBtnText}>View & Bid</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hey, {firstName}</Text>
          <Text style={styles.headerTitle}>Find Jobs</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push("/(contractor)/messages")}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={COLORS.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Ionicons name="options-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
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

      {/* ── Sort dropdown ── */}
      {showSortMenu && (
        <View style={styles.sortDropdown}>
          <Text style={styles.sortDropdownTitle}>Sort By</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sortOption, sortBy === opt.value && styles.sortOptionActive]}
              onPress={() => { setSortBy(opt.value); setShowSortMenu(false); }}
            >
              <View style={styles.sortOptionLeft}>
                <Ionicons name={opt.icon} size={16} color={sortBy === opt.value ? COLORS.primary : COLORS.muted} />
                <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
              </View>
              {sortBy === opt.value && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Sort indicator + result count ── */}
      <View style={styles.sortIndicator}>
        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortMenu(!showSortMenu)}>
          <Ionicons name="swap-vertical-outline" size={14} color={COLORS.muted} />
          <Text style={styles.sortLabel}>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label}</Text>
          <Ionicons name="chevron-down" size={12} color={COLORS.muted} />
        </TouchableOpacity>
        <View style={styles.resultCountWrap}>
          <Text style={styles.resultCount}>{filtered.length}</Text>
          <Text style={styles.resultLabel}> job{filtered.length !== 1 ? "s" : ""} available</Text>
        </View>
      </View>

      {/* ── Job list ── */}
      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={200} />
          <SkeletonCard delay={400} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          renderItem={renderJob}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
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
                <TouchableOpacity
                  style={styles.clearFilterBtn}
                  onPress={() => { setSearch(""); setActiveCategory("all"); }}
                >
                  <Ionicons name="refresh-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.clearFilterText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  // Header
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
  headerRight: { flexDirection: "row", gap: 8 },
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
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
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

  // Job Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardHot: {
    borderWidth: 1.5,
    borderColor: "#fecaca",
  },
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
    borderRadius: 12,
    gap: 5,
  },
  categoryEmoji: { fontSize: 12, fontWeight: "700", color: COLORS.muted },
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
  cardDescription: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 19,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
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
  emptySubtitle: { fontSize: 14, color: COLORS.mutedLight, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  clearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBg,
  },
  clearFilterText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
});

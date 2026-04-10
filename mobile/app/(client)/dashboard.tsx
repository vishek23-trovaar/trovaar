import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Job } from "@/lib/types";
import { colors, typography, spacing, radius, shadows, getStatusColor, getUrgencyColor, getCategoryIcon } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const URGENCY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  emergency: "Urgent",
};

const STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  posted: "megaphone-outline",
  bidding: "pricetag-outline",
  accepted: "checkmark-circle-outline",
  in_progress: "hammer-outline",
  completed: "trophy-outline",
  cancelled: "close-circle-outline",
};

const STATUS_LABELS: Record<string, string> = {
  posted: "Posted",
  bidding: "Bidding",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getCategoryEmoji(category: string): string {
  return getCategoryIcon(category?.replace(/_/g, " ") || "");
}

// Skeleton pulse
function SkeletonPulse({ width, height, borderRadius = 8, style }: {
  width: number | string; height: number; borderRadius?: number; style?: object;
}) {
  const animValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[{ width: width as number, height, borderRadius, backgroundColor: colors.border, opacity: animValue }, style]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 28 }}>
        <SkeletonPulse width={52} height={52} borderRadius={26} />
        <View style={{ marginLeft: 14 }}>
          <SkeletonPulse width={200} height={22} style={{ marginBottom: 8 }} />
          <SkeletonPulse width={140} height={14} />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonPulse key={i} width={130} height={90} borderRadius={18} style={{ marginRight: 12 }} />
        ))}
      </ScrollView>
      {[1, 2, 3].map((i) => (
        <SkeletonPulse key={i} width={"100%" as unknown as number} height={130} borderRadius={18} style={{ marginBottom: 14 }} />
      ))}
    </View>
  );
}

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function QuickAction({ icon, label, color, bgColor, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

interface SurgeCategory {
  category: string;
  multiplier: number;
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [surgeCategories, setSurgeCategories] = useState<SurgeCategory[]>([]);

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api<{ jobs: Job[] }>(
        "/api/jobs?status=posted,bidding,accepted,in_progress,completed&limit=50"
      );
      setJobs((data.jobs || []).filter((j) => j.consumer_id === user?.id));
    } catch (err) {
      if (__DEV__) console.error("[ClientDashboard] error:", err);
    }
    setLoading(false);
  }, [user?.id]);

  const fetchSurge = useCallback(async () => {
    try {
      const { data } = await api<{ categories: SurgeCategory[] }>("/api/surge");
      setSurgeCategories((data.categories || []).filter((c) => c.multiplier > 1));
    } catch {
      // Surge info not available
    }
  }, []);

  useEffect(() => { fetchJobs(); fetchSurge(); }, [fetchJobs, fetchSurge]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const activeJobs = jobs.filter((j) => ["posted", "bidding", "accepted", "in_progress"].includes(j.status));
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const biddingJobs = jobs.filter((j) => ["posted", "bidding"].includes(j.status));
  const inProgressJobs = jobs.filter((j) => ["accepted", "in_progress"].includes(j.status));

  const firstName = user?.name?.split(" ")[0] || "there";

  if (loading) {
    return <View style={styles.screen}><LoadingSkeleton /></View>;
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={activeJobs}
        keyExtractor={(j) => j.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <View>
            {/* ── Hero Header ── */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarLetter}>
                    {user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.greetingText}>{getGreeting()}</Text>
                  <Text style={styles.nameText}>{firstName}</Text>
                </View>
                <TouchableOpacity style={styles.notifBtn} onPress={() => router.push("/(client)/messages")}>
                  <Ionicons name="notifications-outline" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Mini Stats */}
              <View style={styles.miniStatsRow}>
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatValue, { color: colors.primaryLight }]}>{biddingJobs.length}</Text>
                  <Text style={styles.miniStatLabel}>Awaiting Bids</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatValue, { color: colors.warning }]}>{inProgressJobs.length}</Text>
                  <Text style={styles.miniStatLabel}>In Progress</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatValue, { color: colors.success }]}>{completedJobs.length}</Text>
                  <Text style={styles.miniStatLabel}>Completed</Text>
                </View>
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <View style={styles.quickActionsRow}>
              <QuickAction
                icon="add-circle-outline"
                label="Post Job"
                color={colors.primary}
                bgColor={"#DBEAFE"}
                onPress={() => router.push("/(client)/post-job")}
              />
              <QuickAction
                icon="chatbubbles-outline"
                label="Messages"
                color={"#7c3aed"}
                bgColor={"#f5f3ff"}
                onPress={() => router.push("/(client)/messages")}
              />
              <QuickAction
                icon="person-outline"
                label="Profile"
                color={colors.success}
                bgColor={"#D1FAE5"}
                onPress={() => router.push("/(client)/profile")}
              />
              <QuickAction
                icon="help-circle-outline"
                label="Support"
                color={colors.warning}
                bgColor={"#FEF3C7"}
                onPress={() => {}}
              />
            </View>

            {/* ── Surge Pricing Banner ── */}
            {surgeCategories.length > 0 && (
              <View style={styles.surgeBanner}>
                <View style={styles.surgeRow}>
                  <Ionicons name="trending-up" size={18} color="#d97706" />
                  <Text style={styles.surgeTitle}>High Demand Right Now</Text>
                </View>
                <Text style={styles.surgeText}>
                  {surgeCategories.map((c) => c.category.replace(/_/g, " ")).join(", ")} services are in high demand in your area
                </Text>
              </View>
            )}

            {/* ── Referral Banner ── */}
            <TouchableOpacity
              style={styles.referralBanner}
              onPress={() => router.push("/(client)/referral")}
              activeOpacity={0.8}
            >
              <View style={styles.referralLeft}>
                <Ionicons name="gift-outline" size={22} color={colors.primary} />
                <View>
                  <Text style={styles.referralTitle}>Invite a Friend, Earn $25</Text>
                  <Text style={styles.referralSub}>Share your referral code and both of you save</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>

            {/* ── Active Jobs Header ── */}
            {activeJobs.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Jobs</Text>
                <Text style={styles.sectionCount}>{activeJobs.length}</Text>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          const urgencyColor = getUrgencyColor(item.urgency);
          const statusIcon = STATUS_ICONS[item.status] || STATUS_ICONS.posted;
          const statusLabel = STATUS_LABELS[item.status] || STATUS_LABELS.posted;
          const urgencyLabel = URGENCY_LABELS[item.urgency] || "Medium";

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(client)/job/${item.id}`)}
              activeOpacity={0.7}
            >
              {/* Card header */}
              <View style={styles.cardTop}>
                <View style={styles.cardCategoryWrap}>
                  <Text style={styles.cardEmoji}>{getCategoryEmoji(item.category)}</Text>
                  <Text style={styles.cardCategory}>{item.category?.replace(/_/g, " ")}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                  <Ionicons name={statusIcon} size={12} color={statusColor.text} />
                  <Text style={[styles.statusText, { color: statusColor.text }]}>{statusLabel}</Text>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

              {/* Description preview */}
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}

              {/* Card footer */}
              <View style={styles.cardBottom}>
                <View style={[styles.urgencyPill, { backgroundColor: urgencyColor.bg }]}>
                  <View style={[styles.urgencyDot, { backgroundColor: urgencyColor.text }]} />
                  <Text style={[styles.urgencyText, { color: urgencyColor.text }]}>{urgencyLabel}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={colors.muted} />
                  <Text style={styles.metaText}>{Number(item.bid_count) || 0} bids</Text>
                </View>

                <View style={{ flex: 1 }} />

                <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIllustration}>
              <View style={styles.emptyCircle1} />
              <View style={styles.emptyCircle2} />
              <View style={styles.emptyIconWrap}>
                <Ionicons name="briefcase-outline" size={40} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptySub}>
              Post your first job and start receiving bids from verified contractors in your area
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/(client)/post-job")}
              activeOpacity={0.85}
            >
              <Ionicons name="add-outline" size={22} color={colors.white} />
              <Text style={styles.emptyBtnText}>Post Your First Job</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      {activeJobs.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/(client)/post-job")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  // Hero
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { fontSize: 22, fontWeight: "700", color: colors.white },
  greetingText: { fontSize: 14, color: colors.muted, fontWeight: "500" },
  nameText: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  // Mini Stats
  miniStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  miniStat: { flex: 1, alignItems: "center" },
  miniStatValue: { fontSize: 22, fontWeight: "800" },
  miniStatLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "500" },
  miniStatDivider: { width: 1, height: 30, backgroundColor: colors.border },

  // Quick Actions
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 10,
  },
  quickAction: { flex: 1, alignItems: "center", gap: 8 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionLabel: { fontSize: 11, fontWeight: "600", color: colors.muted },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
  sectionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },

  // Job Card
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 18,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardCategoryWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardEmoji: { fontSize: 16 },
  cardCategory: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
    lineHeight: 23,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  urgencyPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  urgencyDot: { width: 6, height: 6, borderRadius: 3 },
  urgencyText: { fontSize: 11, fontWeight: "600" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: colors.muted },
  timeText: { fontSize: 11, color: colors.muted },

  // Empty State
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyIllustration: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyCircle1: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#DBEAFE",
  },
  emptyCircle2: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary + "15",
  },
  emptyIconWrap: { zIndex: 1 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.md,
    gap: 8,
    ...shadows.md,
  },
  emptyBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Surge Banner
  surgeBanner: {
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#fde68a",
  },
  surgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  surgeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#d97706",
  },
  surgeText: {
    fontSize: 13,
    color: "#92400e",
    lineHeight: 19,
    textTransform: "capitalize",
  },

  // Referral Banner
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#dbeafe",
  },
  referralLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  referralSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});

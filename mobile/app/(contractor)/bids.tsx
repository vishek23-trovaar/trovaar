import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  secondary: colors.text,
  muted: colors.muted,
  surface: colors.surface,
  border: colors.border,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

interface BidItem {
  id: string;
  job_id: string;
  job_title: string;
  job_category?: string;
  job_urgency?: string;
  price: number;
  timeline?: string;
  status: string;
  created_at: string;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; icon: string }> = {
  pending: { bg: "#fffbeb", text: "#d97706", icon: "time-outline" },
  accepted: { bg: "#ecfdf5", text: "#059669", icon: "checkmark-circle-outline" },
  rejected: { bg: "#fef2f2", text: "#dc2626", icon: "close-circle-outline" },
  withdrawn: { bg: "#f1f5f9", text: "#64748b", icon: "arrow-undo-outline" },
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

const URGENCY_CONFIG: Record<string, { bg: string; text: string }> = {
  low: { bg: "#f1f5f9", text: "#64748b" },
  medium: { bg: "#eff6ff", text: "#1e40af" },
  high: { bg: "#fffbeb", text: "#d97706" },
  emergency: { bg: "#fef2f2", text: "#dc2626" },
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

function PulseView({ children, style }: { children: React.ReactNode; style?: object }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

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
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={{ width: "70%", height: 16, borderRadius: 8, backgroundColor: "#e2e8f0", marginBottom: 10 }} />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <View style={{ width: 60, height: 22, borderRadius: 11, backgroundColor: "#e2e8f0" }} />
        <View style={{ width: 50, height: 22, borderRadius: 11, backgroundColor: "#e2e8f0" }} />
      </View>
      <View style={{ width: 80, height: 28, borderRadius: 6, backgroundColor: "#e2e8f0", marginBottom: 8 }} />
      <View style={{ width: "40%", height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
    </Animated.View>
  );
}

export default function MyBids() {
  const router = useRouter();
  const [bids, setBids] = useState<BidItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const fetchBids = useCallback(async () => {
    try {
      const { data } = await api<{
        bids: Array<{
          id: string;
          job_id: string;
          job_title: string;
          category?: string;
          job_status?: string;
          price: number;
          timeline?: string;
          status: string;
          created_at: string;
        }>;
      }>("/api/contractor/bids");
      const allBids: BidItem[] = (data.bids || []).map((b) => ({
        id: b.id,
        job_id: b.job_id,
        job_title: b.job_title,
        job_category: b.category,
        job_urgency: undefined,
        price: b.price,
        timeline: b.timeline,
        status: b.status,
        created_at: b.created_at,
      }));
      setBids(allBids);
    } catch (err) {
      if (__DEV__) console.error('[Bids] error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBids();
    setRefreshing(false);
  };

  const filteredBids = activeTab === "all" ? bids : bids.filter((b) => b.status === activeTab);

  const tabCounts: Record<string, number> = {
    all: bids.length,
    pending: bids.filter((b) => b.status === "pending").length,
    accepted: bids.filter((b) => b.status === "accepted").length,
    rejected: bids.filter((b) => b.status === "rejected").length,
  };

  const emptyMessages: Record<string, { icon: string; title: string; subtitle: string }> = {
    all: { icon: "\uD83D\uDCDD", title: "No bids yet", subtitle: "Start bidding on jobs to see them here" },
    pending: { icon: "\u23F3", title: "No pending bids", subtitle: "Your pending bids will appear here" },
    accepted: { icon: "\u2705", title: "No accepted bids", subtitle: "Accepted bids will appear here" },
    rejected: { icon: "\u274C", title: "No rejected bids", subtitle: "Nothing here yet" },
  };

  const renderBid = ({ item }: { item: BidItem }) => {
    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const catKey = item.job_category?.toLowerCase().replace(/_/g, "") || "general";
    const emoji = CATEGORY_EMOJIS[catKey] || "\uD83D\uDD27";
    const urgencyCfg = URGENCY_CONFIG[item.job_urgency || "low"] || URGENCY_CONFIG.low;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/(contractor)/job/${item.job_id}`)}
      >
        <View style={styles.cardTopRow}>
          <Text style={styles.jobTitle} numberOfLines={2}>
            {item.job_title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            {item.status === "pending" ? (
              <PulseView style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.text} />
                <Text style={[styles.statusText, { color: statusCfg.text }]}>
                  {item.status}
                </Text>
              </PulseView>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name={statusCfg.icon as any} size={14} color={statusCfg.text} />
                <Text style={[styles.statusText, { color: statusCfg.text }]}>
                  {item.status}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.badgeRow}>
          {item.job_category && (
            <View style={styles.categoryBadge}>
              <Text style={{ fontSize: 12 }}>{emoji}</Text>
              <Text style={styles.categoryText}>{item.job_category.replace(/_/g, " ")}</Text>
            </View>
          )}
          {item.job_urgency && (
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyCfg.bg }]}>
              <Text style={[styles.urgencyText, { color: urgencyCfg.text }]}>
                {item.job_urgency}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.bidAmount}>${item.price?.toLocaleString()}</Text>

        {item.timeline && (
          <View style={styles.timelineRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.muted} />
            <Text style={styles.timelineText}>{item.timeline}</Text>
          </View>
        )}

        <Text style={styles.submittedTime}>
          <Ionicons name="time-outline" size={11} color="#94a3b8" /> Bid submitted {timeAgo(item.created_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  const empty = emptyMessages[activeTab] || emptyMessages.all;

  return (
    <View style={styles.screen}>
      {/* Tab filter */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tabCounts[tab.key] > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === tab.key && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === tab.key && styles.tabBadgeTextActive,
                  ]}
                >
                  {tabCounts[tab.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={200} />
          <SkeletonCard delay={400} />
        </View>
      ) : (
        <FlatList
          data={filteredBids}
          keyExtractor={(b) => b.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          renderItem={renderBid}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{empty.icon}</Text>
              <Text style={styles.emptyTitle}>{empty.title}</Text>
              <Text style={styles.emptySubtitle}>{empty.subtitle}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: COLORS.muted },
  tabBadgeTextActive: { color: "#fff" },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    flex: 1,
    lineHeight: 21,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },

  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  bidAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.success,
    marginBottom: 6,
  },

  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  timelineText: { fontSize: 13, color: COLORS.muted },

  submittedTime: { fontSize: 12, color: "#94a3b8" },

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8" },
});

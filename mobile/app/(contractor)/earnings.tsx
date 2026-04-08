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
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#0f172a",
  muted: "#64748b",
  surface: "#f8fafc",
  border: "#e2e8f0",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
};

interface EarningItem {
  job_title: string;
  amount: number;
  date: string;
  category?: string;
}

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

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type PeriodFilter = "week" | "month" | "year";

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
    <Animated.View style={[styles.earningItem, { opacity }]}>
      <View style={{ flex: 1 }}>
        <View style={{ width: "60%", height: 14, borderRadius: 7, backgroundColor: "#e2e8f0", marginBottom: 6 }} />
        <View style={{ width: "30%", height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
      </View>
      <View style={{ width: 60, height: 20, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
    </Animated.View>
  );
}

function BarChart({ data }: { data: number[] }) {
  const maxVal = Math.max(...data, 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Last 7 Days</Text>
      <View style={styles.chartBars}>
        {data.map((val, i) => {
          const height = Math.max((val / maxVal) * 100, 4);
          const opacity = val === maxVal && val > 0 ? 1 : 0.3 + (val / maxVal) * 0.7;
          return (
            <View key={i} style={styles.barCol}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: COLORS.primary,
                      opacity,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{DAY_LABELS[i]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function Earnings() {
  const [total, setTotal] = useState(0);
  const [thisWeek, setThisWeek] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);
  const [thisYear, setThisYear] = useState(0);
  const [items, setItems] = useState<EarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodFilter>("month");
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async () => {
    try {
      const { data } = await api<{
        total: number;
        thisWeek?: number;
        thisMonth?: number;
        thisYear?: number;
        items: EarningItem[];
        weeklyData?: number[];
      }>("/api/earnings");
      setTotal(data.total || 0);
      setThisWeek(data.thisWeek || 0);
      setThisMonth(data.thisMonth || 0);
      setThisYear(data.thisYear || 0);
      setItems(data.items || []);
      if (data.weeklyData) setWeeklyData(data.weeklyData);
      setError(null);
    } catch (err) {
      setError('Failed to load earnings');
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarnings();
    setRefreshing(false);
  };

  const filteredItems = items.filter((item) => {
    if (activePeriod === "week") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(item.date).getTime() > weekAgo;
    }
    if (activePeriod === "month") {
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return new Date(item.date).getTime() > monthAgo;
    }
    return true;
  });

  const formatAmount = (cents: number) =>
    "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const periods: { key: PeriodFilter; label: string; value: number }[] = [
    { key: "week", label: "This Week", value: thisWeek },
    { key: "month", label: "This Month", value: thisMonth },
    { key: "year", label: "This Year", value: thisYear },
  ];

  const renderHeader = () => (
    <View>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroGradient}>
          <Text style={styles.heroLabel}>Total Earned</Text>
          <Text style={styles.heroAmount}>{formatAmount(total)}</Text>
          <Text style={styles.heroSubtitle}>Lifetime earnings</Text>
        </View>
      </View>

      {/* Period stats row */}
      <View style={styles.statsRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.statCard, activePeriod === p.key && styles.statCardActive]}
            onPress={() => setActivePeriod(p.key)}
          >
            <Text style={[styles.statLabel, activePeriod === p.key && styles.statLabelActive]}>
              {p.label}
            </Text>
            <Text style={[styles.statValue, activePeriod === p.key && styles.statValueActive]}>
              {formatAmount(p.value)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bar chart */}
      <BarChart data={weeklyData} />

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earnings History</Text>
        <Text style={styles.sectionCount}>{filteredItems.length} items</Text>
      </View>
    </View>
  );

  const renderEarning = ({ item, index }: { item: EarningItem; index: number }) => {
    const catKey = item.category?.toLowerCase().replace(/_/g, "") || "general";
    const emoji = CATEGORY_EMOJIS[catKey] || "\uD83D\uDD27";

    return (
      <View>
        <View style={styles.earningItem}>
          <View style={styles.earningIcon}>
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </View>
          <View style={styles.earningInfo}>
            <Text style={styles.earningTitle} numberOfLines={1}>
              {item.job_title}
            </Text>
            <View style={styles.earningMeta}>
              <Text style={styles.earningDate}>{item.date}</Text>
              {item.category && (
                <View style={styles.earningCategoryBadge}>
                  <Text style={styles.earningCategoryText}>
                    {item.category.replace(/_/g, " ")}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.earningAmount}>{formatAmount(item.amount)}</Text>
        </View>
        {index < filteredItems.length - 1 && <View style={styles.divider} />}
      </View>
    );
  };

  if (error && !loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#dc2626', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 }}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={[styles.heroCard, { opacity: 0.5 }]}>
          <View style={styles.heroGradient}>
            <View style={{ width: 100, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.3)", marginBottom: 8 }} />
            <View style={{ width: 160, height: 36, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.3)" }} />
          </View>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <SkeletonCard delay={0} />
          <SkeletonCard delay={200} />
          <SkeletonCard delay={400} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredItems}
        keyExtractor={(_, i) => String(i)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListHeaderComponent={renderHeader}
        renderItem={renderEarning}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{"\uD83D\uDCB0"}</Text>
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptySubtitle}>Complete jobs to start earning</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  heroCard: {
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
  },
  heroGradient: {
    backgroundColor: COLORS.primary,
    padding: 28,
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#93c5fd",
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#93c5fd",
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  statCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#eff6ff",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 4,
  },
  statLabelActive: { color: COLORS.primary },
  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  statValueActive: { color: COLORS.primary },

  chartContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
  },
  barCol: { alignItems: "center", flex: 1 },
  barWrapper: {
    height: 100,
    justifyContent: "flex-end",
    width: "100%",
    alignItems: "center",
  },
  bar: {
    width: 24,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 6,
    fontWeight: "500",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  sectionCount: { fontSize: 12, color: "#94a3b8" },

  earningItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: "#fff",
  },
  earningIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  earningInfo: { flex: 1 },
  earningTitle: { fontSize: 14, fontWeight: "600", color: COLORS.secondary, marginBottom: 4 },
  earningMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  earningDate: { fontSize: 12, color: "#94a3b8" },
  earningCategoryBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earningCategoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "capitalize",
  },
  earningAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginLeft: 72,
  },

  empty: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8" },
});

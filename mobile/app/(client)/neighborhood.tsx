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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from '../../lib/theme';


const CATEGORIES = [
  "All",
  "Plumbing",
  "Electrical",
  "Landscaping",
  "Cleaning",
  "Painting",
  "HVAC",
  "Carpentry",
  "Moving",
  "Pest Control",
  "General Handyman",
  "Other",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Plumbing:         { bg: "#eff6ff", text: "#2563eb" },
  Electrical:       { bg: "#fefce8", text: "#ca8a04" },
  Landscaping:      { bg: "#f0fdf4", text: "#16a34a" },
  Cleaning:         { bg: "#f0f9ff", text: "#0284c7" },
  Painting:         { bg: "#fdf4ff", text: "#9333ea" },
  HVAC:             { bg: "#fff7ed", text: "#ea580c" },
  Carpentry:        { bg: "#fdf6ec", text: "#b45309" },
  Moving:           { bg: "#f5f3ff", text: "#7c3aed" },
  "Pest Control":   { bg: "#fef2f2", text: "#dc2626" },
  "General Handyman": { bg: "#f8fafc", text: "#475569" },
  Other:            { bg: "#f8fafc", text: "#64748b" },
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Plumbing:         "water-outline",
  Electrical:       "flash-outline",
  Landscaping:      "leaf-outline",
  Cleaning:         "sparkles-outline",
  Painting:         "color-palette-outline",
  HVAC:             "thermometer-outline",
  Carpentry:        "construct-outline",
  Moving:           "cube-outline",
  "Pest Control":   "bug-outline",
  "General Handyman": "hammer-outline",
  Other:            "ellipsis-horizontal-outline",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  Plumbing: "🔧",
  Electrical: "⚡",
  Landscaping: "🌿",
  Cleaning: "🧹",
  Painting: "🎨",
  HVAC: "🌡️",
  Carpentry: "🪚",
  Moving: "📦",
  "Pest Control": "🐛",
  "General Handyman": "🔨",
  Other: "➕",
};

interface ActivityItem {
  id?: string;
  category: string;
  message: string;
  location: string;
  time: string;
}

const DEMO_DATA: ActivityItem[] = [
  { id: "1", category: "Plumbing",          message: "Leaky faucet repair completed",    location: "2 miles away",   time: "10 min ago" },
  { id: "2", category: "Electrical",        message: "Outlet installation completed",    location: "0.8 miles away", time: "25 min ago" },
  { id: "3", category: "Landscaping",       message: "Lawn mowing completed",            location: "1.2 miles away", time: "1 hr ago"   },
  { id: "4", category: "Cleaning",          message: "Deep house cleaning completed",    location: "0.5 miles away", time: "2 hrs ago"  },
  { id: "5", category: "HVAC",              message: "AC tune-up completed",             location: "3 miles away",   time: "3 hrs ago"  },
  { id: "6", category: "Painting",          message: "Interior painting finished",       location: "1.5 miles away", time: "4 hrs ago"  },
  { id: "7", category: "Carpentry",         message: "Deck repair completed",            location: "2.3 miles away", time: "5 hrs ago"  },
  { id: "8", category: "General Handyman",  message: "TV mounting service done",         location: "0.7 miles away", time: "6 hrs ago"  },
];

// Skeleton pulse
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

function LoadingSkeleton() {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {/* Filter chips skeleton */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonPulse key={i} width={80} height={32} borderRadius={16} style={{ marginRight: 8 }} />
        ))}
      </ScrollView>
      {/* Cards skeleton */}
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.white,
            borderRadius: radius.xl,
            padding: 16,
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <SkeletonPulse width={44} height={44} borderRadius={22} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonPulse width="80%" height={16} />
              <SkeletonPulse width="50%" height={12} />
            </View>
            <SkeletonPulse width={60} height={22} borderRadius={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

function ActivityCard({ item, isDemo }: { item: ActivityItem; isDemo: boolean }) {
  const catColors = CATEGORY_COLORS[item.category] || { bg: colors.surface, text: colors.muted };
  const catIcon = CATEGORY_ICONS[item.category] || "checkmark-circle-outline";

  return (
    <View style={styles.card}>
      {/* Demo badge */}
      {isDemo && (
        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeText}>Demo</Text>
        </View>
      )}

      <View style={styles.cardInner}>
        {/* Icon */}
        <View style={[styles.iconCircle, { backgroundColor: catColors.bg }]}>
          <Ionicons name={catIcon} size={22} color={catColors.text} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.muted} />
            <Text style={styles.metaText}>{item.location}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="time-outline" size={12} color={colors.muted} />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
        </View>

        {/* Category badge */}
        <View style={[styles.catBadge, { backgroundColor: catColors.bg }]}>
          <Text style={[styles.catBadgeText, { color: catColors.text }]}>
            {item.category}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function NeighborhoodScreen() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const fetchActivities = useCallback(async () => {
    try {
      const { data } = await api<{ activities: ActivityItem[] }>("/api/neighborhood");
      const items = data.activities || [];
      if (items.length === 0) {
        setActivities(DEMO_DATA);
        setIsDemo(true);
      } else {
        setActivities(items);
        setIsDemo(false);
      }
    } catch {
      // API not found or error — show demo data
      setActivities(DEMO_DATA);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchActivities();
    setRefreshing(false);
  };

  const filteredActivities =
    selectedCategory === "All"
      ? activities
      : activities.filter((a) => a.category === selectedCategory);

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSkeleton />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Neighborhood</Text>
          <Text style={styles.headerSub}>Recent service activity near you</Text>
        </View>
        <View style={styles.liveDot}>
          <View style={styles.liveDotInner} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      {/* Demo notice */}
      {isDemo && (
        <View style={styles.demoNotice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primaryLight} />
          <Text style={styles.demoNoticeText}>
            Showing sample data — real activity will appear here once available in your area.
          </Text>
        </View>
      )}

      {/* Category filter chips */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const catColors = CATEGORY_COLORS[cat] || { bg: colors.surface, text: colors.muted };
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.white, borderColor: colors.border },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                {cat !== "All" && (
                  <Text style={styles.chipEmoji}>{CATEGORY_EMOJIS[cat] || "📋"}</Text>
                )}
                <Text
                  style={[
                    styles.chipText,
                    active ? { color: colors.white } : { color: colors.text },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredActivities}
        keyExtractor={(item, index) => item.id || String(index)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredActivities.length === 0 && { flex: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ActivityCard item={item} isDemo={isDemo} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🏘️</Text>
            <Text style={styles.emptyTitle}>No activity found</Text>
            <Text style={styles.emptySub}>
              No recent {selectedCategory !== "All" ? selectedCategory.toLowerCase() : ""} jobs in your area yet.
            </Text>
          </View>
        }
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  headerSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  liveDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.lg,
  },
  liveDotInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.success,
  },

  demoNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  demoNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.primaryLight,
    lineHeight: 17,
  },

  filtersWrap: {
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    gap: 4,
    marginRight: 0,
  },
  chipEmoji: { fontSize: 12 },
  chipText: { fontSize: 13, fontWeight: "600" },

  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 16,
    ...shadows.md,
  },
  demoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fef9c3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a16207",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 5,
  },
  cardMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.muted,
  },
  metaDot: {
    fontSize: 12,
    color: colors.muted,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});

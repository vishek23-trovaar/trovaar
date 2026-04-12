import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Conversation } from "@/lib/types";
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

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function SkeletonRow({ delay }: { delay: number }) {
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
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#e2e8f0" }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: "50%", height: 14, borderRadius: 7, backgroundColor: "#e2e8f0" }} />
        <View style={{ width: "70%", height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
        <View style={{ width: "40%", height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" }} />
      </View>
    </Animated.View>
  );
}

export default function ContractorMessages() {
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const fetchConvos = useCallback(async () => {
    try {
      const { data } = await api<{ conversations: Conversation[] }>("/api/messages");
      setConvos(data.conversations || []);
      setError(null);
    } catch (err) {
      setError('Failed to load messages');
      if (__DEV__) console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConvos();
  }, [fetchConvos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConvos();
    setRefreshing(false);
  };

  const filtered = convos.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.other_user_name?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  const renderConvo = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push(`/(contractor)/chat/${item.job_id}`)}
      >
        <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
          <Text style={styles.avatarText}>
            {item.other_user_name?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {item.other_user_name}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <View style={styles.previewRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewBold]}
              numberOfLines={1}
            >
              {item.last_message}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <Animated.View style={[styles.screen, { justifyContent: 'center', alignItems: 'center', opacity: screenOpacity }]}>
        <Text style={{ color: '#dc2626', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 }}>{error}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View>
          <SkeletonRow delay={0} />
          <SkeletonRow delay={150} />
          <SkeletonRow delay={300} />
          <SkeletonRow delay={450} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.job_id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={renderConvo}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{"\uD83D\uDCAC"}</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? "No conversations match your search"
                  : "Messages from clients will appear here"}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.secondary,
  },

  row: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarUnread: {
    backgroundColor: "#BFDBFE",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.secondary,
    flex: 1,
    marginRight: 8,
  },
  nameBold: { fontWeight: "700" },
  time: { fontSize: 12, color: "#94a3b8" },
  timeUnread: { color: COLORS.primary, fontWeight: "600" },
  jobTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    fontSize: 13,
    color: "#94a3b8",
    flex: 1,
  },
  previewBold: { color: COLORS.secondary, fontWeight: "500" },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#94a3b8", textAlign: "center", paddingHorizontal: 40 },
});

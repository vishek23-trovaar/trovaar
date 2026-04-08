import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Conversation } from "@/lib/types";

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#0f172a",
  muted: "#64748b",
  surface: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

// Avatar colors based on name
const AVATAR_COLORS = [
  "#1e40af", "#7c3aed", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#4f46e5", "#c026d3", "#ea580c", "#16a34a",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || "?").length; i++) {
    hash = (name || "?").charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Skeleton
function SkeletonPulse({ width, height, borderRadius = 8, style }: {
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
      style={[{ width: width as number, height, borderRadius, backgroundColor: "#e2e8f0", opacity: animValue }, style]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 }}>
          <SkeletonPulse width={52} height={52} borderRadius={26} />
          <View style={{ flex: 1 }}>
            <SkeletonPulse width="60%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonPulse width="40%" height={12} style={{ marginBottom: 4 }} />
            <SkeletonPulse width="80%" height={14} />
          </View>
          <SkeletonPulse width={28} height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export default function ClientMessages() {
  const router = useRouter();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConvos = useCallback(async () => {
    try {
      const { data } = await api<{ conversations: Conversation[] }>("/api/messages");
      setConvos(data.conversations || []);
      setError(null);
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
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

  const filteredConvos = searchQuery.trim()
    ? convos.filter(
        (c) =>
          c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : convos;

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#dc2626', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredConvos}
        keyExtractor={(c) => c.job_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={COLORS.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const hasUnread = item.unread_count > 0;
          const avatarColor = getAvatarColor(item.other_user_name);

          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push(`/(client)/chat/${item.job_id}`)}
              activeOpacity={0.6}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: avatarColor + "15" }]}>
                <Text style={[styles.avatarText, { color: avatarColor }]}>
                  {(item.other_user_name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Content */}
              <View style={styles.body}>
                <View style={styles.topRow}>
                  <Text
                    style={[styles.name, hasUnread && styles.nameUnread]}
                    numberOfLines={1}
                  >
                    {item.other_user_name}
                  </Text>
                  <Text style={[styles.timeText, hasUnread && styles.timeTextUnread]}>
                    {timeAgo(item.last_message_at)}
                  </Text>
                </View>
                <Text style={styles.jobTitle} numberOfLines={1}>
                  {item.job_title}
                </Text>
                <View style={styles.bottomRow}>
                  <Text
                    style={[styles.preview, hasUnread && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {item.last_message}
                  </Text>
                  {hasUnread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>
                        {item.unread_count > 99 ? "99+" : item.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? "No conversations match your search"
                : "When contractors bid on your jobs, you can message them here"}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Search
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.secondary,
    padding: 0,
  },

  // Conversation Row
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.secondary,
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: "700",
  },
  timeText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  timeTextUnread: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  jobTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 3,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  preview: {
    fontSize: 14,
    color: "#94a3b8",
    flex: 1,
    marginRight: 8,
  },
  previewUnread: {
    color: COLORS.secondary,
    fontWeight: "500",
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },

  // Separator
  separator: {
    paddingLeft: 80,
  },
  separatorLine: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },

  // Empty State
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});

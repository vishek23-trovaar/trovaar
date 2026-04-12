import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from '../../lib/theme';


interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  job_id?: string;
  read: boolean;
  created_at: string;
}

const NOTIF_ICONS: Record<string, { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  new_bid: { name: "pricetag-outline", color: "#7c3aed", bg: "#f5f3ff" },
  bid_accepted: { name: "checkmark-circle-outline", color: colors.success, bg: "#D1FAE5" },
  job_completed: { name: "trophy-outline", color: colors.success, bg: "#D1FAE5" },
  payment_released: { name: "wallet-outline", color: colors.success, bg: "#D1FAE5" },
  dispute_opened: { name: "warning-outline", color: colors.danger, bg: "#FEE2E2" },
  message_received: { name: "chatbubble-outline", color: colors.primaryLight, bg: "#DBEAFE" },
  review_received: { name: "star-outline", color: colors.warning, bg: "#FEF3C7" },
};

function getNotifIcon(type: string) {
  return NOTIF_ICONS[type] || { name: "notifications-outline" as keyof typeof Ionicons.glyphMap, color: colors.muted, bg: colors.surface };
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

export default function ClientNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api<{ notifications: Notification[]; unreadCount: number }>("/api/notifications");
      setNotifications(data.notifications || []);
    } catch (err) {
      if (__DEV__) console.error("[Notifications] fetch error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    setMarkingRead(true);
    try {
      await api("/api/notifications", {
        method: "PATCH",
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      if (__DEV__) console.error("[Notifications] mark read error:", err);
    }
    setMarkingRead(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePress = (notif: Notification) => {
    if (notif.job_id) {
      router.push(`/(client)/job/${notif.job_id}`);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <View style={styles.headerRow}>
              <Text style={styles.headerText}>{unreadCount} unread</Text>
              <TouchableOpacity onPress={markAllRead} disabled={markingRead} activeOpacity={0.7}>
                <Text style={[styles.markReadText, markingRead && { opacity: 0.5 }]}>
                  Mark all as read
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const icon = getNotifIcon(item.type);
          return (
            <TouchableOpacity
              style={[styles.row, !item.read && styles.rowUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                <Ionicons name={icon.name} size={20} color={icon.color} />
              </View>
              <View style={styles.body}>
                <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.message} numberOfLines={2}>
                  {item.message}
                </Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => (
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-outline" size={36} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>
              You're all caught up! Notifications about your jobs will appear here.
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  markReadText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryLight,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "flex-start",
    gap: 14,
  },
  rowUnread: {
    backgroundColor: "#DBEAFE",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: "700",
  },
  message: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: colors.muted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primaryLight,
    marginTop: 6,
  },
  separator: {
    paddingLeft: 72,
  },
  separatorLine: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
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

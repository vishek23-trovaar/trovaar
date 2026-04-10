import { useState, useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors } from "../../lib/theme";

function TabBarBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});

function NotificationBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={bellStyles.container} activeOpacity={0.7}>
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {count > 0 && (
        <View style={bellStyles.badge}>
          <Text style={bellStyles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const bellStyles = StyleSheet.create({
  container: { marginRight: 16, width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  badge: {
    position: "absolute", top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 4, borderWidth: 2, borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "700" },
});

export default function ClientLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const { data } = await api<{ conversations: Array<{ unread_count: number }> }>("/api/messages");
        setUnreadCount((data.conversations || []).reduce((sum, c) => sum + (c.unread_count > 0 ? 1 : 0), 0));
      } catch (err) { if (__DEV__) console.warn("[ClientLayout] fetchUnread error:", err); }
    };
    const fetchNotifCount = async () => {
      try {
        const { data } = await api<{ unreadCount: number }>("/api/notifications");
        setNotifUnreadCount(data.unreadCount || 0);
      } catch (err) { if (__DEV__) console.warn("[ClientLayout] fetchNotifCount error:", err); }
    };
    fetchUnread();
    fetchNotifCount();
    const interval = setInterval(fetchUnread, 30000);
    const notifInterval = setInterval(fetchNotifCount, 30000);
    return () => { clearInterval(interval); clearInterval(notifInterval); };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingTop: 6,
          height: Platform.OS === "ios" ? 88 : 64,
          ...Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
            android: { elevation: 8 },
          }),
        },
        tabBarItemStyle: { paddingVertical: 4 },
        headerStyle: {
          backgroundColor: colors.white,
          ...Platform.select({
            ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
            android: { elevation: 2 },
          }),
        },
        headerTitleStyle: { fontWeight: "700", fontSize: 17, color: colors.text },
        headerRight: undefined,
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post-job"
        options={{
          title: "Post Job",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "add-circle" : "add-circle-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "notifications" : "notifications-outline"} size={24} color={color} />
              <TabBarBadge count={notifUnreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* ── Hidden screens (navigated to from within the app) ── */}
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
      <Tabs.Screen name="chat/[jobId]" options={{ href: null, title: "Chat" }} />
      <Tabs.Screen name="neighborhood" options={{ href: null, title: "Explore" }} />
      <Tabs.Screen name="templates" options={{ href: null, title: "Job Templates" }} />
      <Tabs.Screen name="referral" options={{ href: null, title: "Refer & Earn" }} />
      <Tabs.Screen name="subscriptions" options={{ href: null, title: "My Plan" }} />
      <Tabs.Screen name="dispute/[jobId]" options={{ href: null, title: "File a Dispute" }} />
      <Tabs.Screen name="tip/[jobId]" options={{ href: null, title: "Leave a Tip" }} />
      <Tabs.Screen name="change-order/[jobId]" options={{ href: null, title: "Change Order" }} />
      <Tabs.Screen name="reschedule/[jobId]" options={{ href: null, title: "Reschedule Job" }} />
    </Tabs>
  );
}

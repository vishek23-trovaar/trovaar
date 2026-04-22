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
    position: "absolute", top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, justifyContent: "center", alignItems: "center", paddingHorizontal: 4,
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

export default function ContractorLayout() {
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
      } catch (err) { if (__DEV__) console.warn("[ContractorLayout] fetchUnread error:", err); }
    };
    const fetchNotifCount = async () => {
      try {
        const { data } = await api<{ unreadCount: number }>("/api/notifications");
        setNotifUnreadCount(data.unreadCount || 0);
      } catch (err) { if (__DEV__) console.warn("[ContractorLayout] fetchNotifCount error:", err); }
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
        headerRight: () => (
          <NotificationBell count={notifUnreadCount} onPress={() => router.push("/(contractor)/notifications")} />
        ),
      }}
    >
      {/* ── Visible tabs ── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Jobs",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bids"
        options={{
          title: "My Bids",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "pricetag" : "pricetag-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "cash" : "cash-outline"} size={24} color={color} />
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
      <Tabs.Screen name="notifications" options={{ href: null, title: "Notifications" }} />
      <Tabs.Screen name="chat/[jobId]" options={{ href: null, title: "Chat" }} />
      <Tabs.Screen name="calendar" options={{ href: null, title: "Calendar" }} />
      <Tabs.Screen name="invoices" options={{ href: null, title: "Invoices" }} />
      <Tabs.Screen name="tax" options={{ href: null, title: "Tax & Earnings" }} />
      <Tabs.Screen name="clients" options={{ href: null, title: "My Clients" }} />
      <Tabs.Screen name="portfolio" options={{ href: null, title: "Portfolio" }} />
      <Tabs.Screen name="quiz" options={{ href: null, title: "Skills Quizzes" }} />
      <Tabs.Screen name="verification" options={{ href: null, title: "Verification" }} />
    </Tabs>
  );
}

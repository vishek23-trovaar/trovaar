import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors } from "../../lib/theme";

interface SavedPro {
  id: string;
  name: string;
  location: string | null;
  rating: number | null;
  rating_count: number | null;
  contractor_type: string | null;
  profile_photo: string | null;
  years_experience: number | null;
  completed_jobs: number;
  verification_status: string | null;
}

export default function SavedProsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<SavedPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ saved: SavedPro[] }>("/api/saved-contractors");
      setItems(data.saved || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when returning to this tab (e.g. after un/saving on a profile).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  async function unsave(contractorId: string) {
    setItems((prev) => prev.filter((p) => p.id !== contractorId));
    try {
      await api(`/api/saved-contractors?contractorId=${contractorId}`, { method: "DELETE" });
    } catch {
      load(); // resync on failure
    }
  }

  const renderItem = ({ item }: { item: SavedPro }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => router.push(`/(client)/contractor/${item.id}` as never)}
    >
      {item.profile_photo ? (
        <Image source={{ uri: item.profile_photo }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarLetter}>{item.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color="#FBBF24" />
          <Text style={styles.meta}>
            {item.rating ? item.rating.toFixed(1) : "New"} · {item.completed_jobs} jobs
          </Text>
        </View>
        {item.location ? <Text style={styles.loc} numberOfLines={1}>{item.location}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => unsave(item.id)} hitSlop={10} style={styles.bookmark}>
        <Ionicons name="bookmark" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Pros</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>No saved pros yet</Text>
          <Text style={styles.emptyBody}>
            Tap the bookmark on a contractor&apos;s profile to save them here for next time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0F1011",
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#121316", borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 14,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#1a1b1f" },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 20, fontWeight: "800", color: "#ffffff" },
  name: { fontSize: 15, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  meta: { fontSize: 13, color: colors.muted },
  loc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bookmark: { padding: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
});

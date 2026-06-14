import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";
import { colors } from "../../lib/theme";

interface HelpRequest {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  skills_needed: string | null;
  pay_cents: number;
  spots: number;
  date_needed: string | null;
  job_title: string;
  job_category: string | null;
  job_location: string | null;
  lead_contractor_name: string;
  lead_rating: number | null;
  applicant_count: number;
  my_application_status: string | null;
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export default function HelpRequestsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [applyTo, setApplyTo] = useState<HelpRequest | null>(null);
  const [message, setMessage] = useState("");
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ help_requests: HelpRequest[] }>("/api/help-requests");
      setItems(data.help_requests || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  async function submitApply() {
    if (!applyTo) return;
    setApplying(true);
    try {
      await api(`/api/jobs/${applyTo.job_id}/help/${applyTo.id}/apply`, {
        method: "POST",
        body: JSON.stringify({ message: message.trim() || undefined }),
      });
      // mark applied locally
      setItems((prev) =>
        prev.map((h) => (h.id === applyTo.id ? { ...h, my_application_status: "pending", applicant_count: h.applicant_count + 1 } : h))
      );
      setApplyTo(null);
      setMessage("");
      setTimeout(() => Alert.alert("Application sent", "The lead contractor has been notified."), 150);
    } catch (e) {
      Alert.alert("Couldn't apply", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setApplying(false);
    }
  }

  const renderItem = ({ item }: { item: HelpRequest }) => {
    const applied = !!item.my_application_status && item.my_application_status !== "rejected" && item.my_application_status !== "withdrawn";
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.pay}>{money(item.pay_cents)}</Text>
        </View>
        <Text style={styles.jobMeta} numberOfLines={1}>
          {item.job_title}{item.job_location ? ` · ${item.job_location}` : ""}
        </Text>
        {item.description ? <Text style={styles.desc} numberOfLines={3}>{item.description}</Text> : null}

        {item.skills_needed ? (
          <View style={styles.skillRow}>
            <Ionicons name="construct-outline" size={13} color={colors.muted} />
            <Text style={styles.skillText} numberOfLines={1}>{item.skills_needed}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.muted} />
            <Text style={styles.metaText}>{item.lead_contractor_name}{item.lead_rating ? ` · ${item.lead_rating.toFixed(1)}★` : ""}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={colors.muted} />
            <Text style={styles.metaText}>{item.spots} spot{item.spots !== 1 ? "s" : ""} · {item.applicant_count} applied</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, applied && styles.appliedBtn]}
          disabled={applied}
          activeOpacity={0.85}
          onPress={() => { setApplyTo(item); setMessage(""); }}
        >
          <Ionicons name={applied ? "checkmark" : "hand-left-outline"} size={16} color={applied ? "#6EE7B7" : "#ffffff"} />
          <Text style={[styles.applyBtnText, applied && { color: "#6EE7B7" }]}>{applied ? "Applied" : "Apply to Help"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Subcontract Work</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyTitle}>No open help requests</Text>
          <Text style={styles.emptyBody}>
            When lead contractors need an extra hand on a job, their requests show up here.
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

      {/* Apply modal */}
      <Modal visible={!!applyTo} transparent animationType="fade" onRequestClose={() => setApplyTo(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setApplyTo(null)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply to Help</Text>
              <TouchableOpacity onPress={() => setApplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>
            {applyTo ? (
              <Text style={styles.modalSub}>
                {applyTo.title} · {money(applyTo.pay_cents)}
              </Text>
            ) : null}
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Add a short message (optional) — your experience, availability…"
              placeholderTextColor="#6b7079"
              multiline
              style={styles.textarea}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={submitApply} disabled={applying} activeOpacity={0.85}>
              {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Send Application</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  card: { backgroundColor: "#121316", borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 16 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text, letterSpacing: -0.2 },
  pay: { fontSize: 17, fontWeight: "800", color: "#6EE7B7", letterSpacing: -0.3 },
  jobMeta: { fontSize: 13, color: colors.muted, marginTop: 4 },
  desc: { fontSize: 14, color: colors.body, marginTop: 10, lineHeight: 20 },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  skillText: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 },
  metaText: { fontSize: 12, color: colors.muted, flexShrink: 1 },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    marginTop: 14, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary,
  },
  appliedBtn: { backgroundColor: "rgba(52,211,153,0.14)", borderWidth: 1, borderColor: "rgba(52,211,153,0.30)" },
  applyBtnText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.65)", paddingHorizontal: 20 },
  modalCard: { width: "100%", maxWidth: 440, backgroundColor: "#121316", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  modalSub: { fontSize: 13, color: colors.muted, marginTop: 6 },
  textarea: {
    minHeight: 96, backgroundColor: "#1a1b1f", borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, textAlignVertical: "top", marginTop: 14,
  },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  submitBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});

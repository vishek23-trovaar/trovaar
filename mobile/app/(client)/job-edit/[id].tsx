import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";
import { Job } from "@/lib/types";
import { colors } from "../../../lib/theme";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "painting", label: "Painting" },
  { value: "cleaning", label: "Cleaning" },
  { value: "moving", label: "Moving" },
  { value: "auto_repair", label: "Auto Repair" },
  { value: "general_handyman", label: "Handyman" },
  { value: "other", label: "Other" },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

// A job can only be edited before a bid is accepted.
const EDITABLE_STATUSES = ["posted", "bidding"];

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ job: Job }>(`/api/jobs/${id}`);
      const j = data.job;
      setJob(j);
      setTitle(j.title || "");
      setDescription(j.description || "");
      setCategory(j.category || "");
      setUrgency(j.urgency || "");
      setLocation(j.location || "");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this job.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await api(`/api/jobs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title,
          description,
          category,
          urgency,
          location,
          // preserve fields the mobile editor doesn't change
          photos: job?.photos ?? null,
        }),
      });
      router.back();
      setTimeout(() => Alert.alert("Saved", "Your job has been updated."), 150);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save changes.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const editable = job ? EDITABLE_STATUSES.includes(job.status) : false;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Job</Text>
        <View style={{ width: 24 }} />
      </View>

      {!editable ? (
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.muted} />
          <Text style={styles.lockedTitle}>This job can&apos;t be edited</Text>
          <Text style={styles.lockedBody}>
            Changes are only allowed before you accept a bid.
          </Text>
          <Button title="Back to job" onPress={() => router.back()} variant="outline" fullWidth={false} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Kitchen faucet replacement" />

          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the job…"
            placeholderTextColor="#6b7079"
            multiline
            style={styles.textarea}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipWrap}>
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Urgency</Text>
          <View style={styles.chipWrap}>
            {URGENCY_OPTIONS.map((u) => {
              const active = urgency === u.value;
              return (
                <TouchableOpacity
                  key={u.value}
                  onPress={() => setUrgency(u.value)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input label="Location" value={location} onChangeText={setLocation} placeholder="City or address" containerStyle={{ marginTop: 4 }} />

          <Button title="Save Changes" onPress={handleSave} loading={saving} style={{ marginTop: 20 }} size="lg" />
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface, padding: 32 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#0F1011",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 24 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  container: { padding: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6, marginTop: 10 },
  textarea: {
    minHeight: 110,
    backgroundColor: "#1a1b1f",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: "top",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#121316",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: "#ffffff" },
  errorBox: { backgroundColor: "rgba(248,113,113,0.12)", borderRadius: 10, padding: 12, marginBottom: 6 },
  errorText: { color: "#f87171", fontSize: 13 },
  lockedTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  lockedBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
});

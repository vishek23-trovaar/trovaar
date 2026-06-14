import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";
import { colors } from "../../lib/theme";
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

const RADII = [10, 25, 50, 100];

interface Prefs {
  categories: string[];
  email_alerts: boolean;
  radius_miles: number;
}

export default function JobAlertsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [radius, setRadius] = useState(50);
  const [cats, setCats] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ preferences: Prefs }>("/api/job-alerts");
      const p = data.preferences;
      setEmailAlerts(!!p.email_alerts);
      setRadius(p.radius_miles ?? 50);
      setCats(Array.isArray(p.categories) ? p.categories : []);
    } catch {
      // fall back to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleCat(v: string) {
    setCats((prev) => (prev.includes(v) ? prev.filter((c) => c !== v) : [...prev, v]));
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/job-alerts", {
        method: "PATCH",
        body: JSON.stringify({ categories: cats, email_alerts: emailAlerts, radius_miles: radius }),
      });
      router.back();
      setTimeout(() => Alert.alert("Saved", "Your job alert preferences were updated."), 150);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof ApiError ? e.message : "Please try again.");
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

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Alerts</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Get notified when new jobs match your trade and area.
        </Text>

        {/* Email toggle */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.rowTitle}>Email alerts</Text>
              <Text style={styles.rowSub}>Send matching jobs to your inbox</Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: "#23252a", true: colors.primary }}
              thumbColor="#f7f8f8"
            />
          </View>
        </View>

        {/* Radius */}
        <Text style={styles.sectionLabel}>Alert radius</Text>
        <View style={styles.chipWrap}>
          {RADII.map((r) => {
            const active = radius === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRadius(r)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r} mi</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Categories */}
        <Text style={styles.sectionLabel}>Categories {cats.length ? `(${cats.length})` : "(all)"}</Text>
        <Text style={styles.rowSub}>Leave empty to hear about every category.</Text>
        <View style={[styles.chipWrap, { marginTop: 10 }]}>
          {CATEGORIES.map((c) => {
            const active = cats.includes(c.value);
            return (
              <TouchableOpacity
                key={c.value}
                onPress={() => toggleCat(c.value)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="Save Preferences" onPress={save} loading={saving} size="lg" style={{ marginTop: 24 }} />
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface },
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  container: { padding: 16 },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: "#121316",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
  },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: colors.body, marginTop: 22, marginBottom: 10, letterSpacing: -0.1 },
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
});

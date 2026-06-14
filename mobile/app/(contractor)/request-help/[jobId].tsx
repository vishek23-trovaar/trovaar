import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";
import { colors } from "../../../lib/theme";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const SPOTS = [1, 2, 3, 4, 5];

export default function RequestHelpScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [pay, setPay] = useState("");
  const [spots, setSpots] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    const payNum = parseFloat(pay);
    if (!title.trim()) {
      setError("Add a short title for the help you need.");
      return;
    }
    if (!payNum || payNum < 1) {
      setError("Enter pay of at least $1.00.");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/jobs/${jobId}/help`, {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          skills_needed: skills.trim() || undefined,
          pay_cents: Math.round(payNum * 100),
          spots,
        }),
      });
      router.back();
      setTimeout(() => Alert.alert("Help request posted", "Available contractors can now apply."), 150);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't post help request.");
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={{ width: 24 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Help</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Need an extra pair of hands on this job? Post what you need and pay — available pros can apply.
        </Text>

        {error ? (
          <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
        ) : null}

        <Input label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Need a 2nd plumber for the morning" />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's the work, when, and any details…"
          placeholderTextColor="#6b7079"
          multiline
          style={styles.textarea}
        />

        <Input label="Skills needed (optional)" value={skills} onChangeText={setSkills} placeholder="e.g. soldering, drywall" containerStyle={{ marginTop: 4 }} />

        <Input label="Pay ($)" value={pay} onChangeText={setPay} placeholder="e.g. 150" keyboardType="numeric" containerStyle={{ marginTop: 4 }} />

        <Text style={styles.label}>Spots</Text>
        <View style={styles.chipWrap}>
          {SPOTS.map((n) => {
            const active = spots === n;
            return (
              <TouchableOpacity key={n} onPress={() => setSpots(n)} style={[styles.chip, active && styles.chipActive]} activeOpacity={0.8}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="Post Help Request" onPress={submit} loading={saving} size="lg" style={{ marginTop: 22 }} />
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0F1011",
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  container: { padding: 16, gap: 6 },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", color: colors.body, marginBottom: 6, marginTop: 10 },
  textarea: {
    minHeight: 100, backgroundColor: "#1a1b1f", borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 14, fontSize: 16, color: colors.text, textAlignVertical: "top",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minWidth: 44, alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: "#121316", borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.muted },
  chipTextActive: { color: "#ffffff" },
  errorBox: { backgroundColor: "rgba(248,113,113,0.12)", borderRadius: 10, padding: 12, marginBottom: 6 },
  errorText: { color: "#f87171", fontSize: 13 },
});

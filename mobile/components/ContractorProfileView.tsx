import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { colors } from "../lib/theme";

interface Profile {
  id: string;
  name: string;
  location: string | null;
  bio: string | null;
  about_me: string | null;
  headline: string | null;
  years_experience: number | null;
  categories: string | null;
  profile_photo: string | null;
  rating: number | null;
  rating_count: number | null;
  verification_status: string | null;
  insurance_status: string | null;
  background_check_status: string | null;
  contractor_type: string | null;
  license_number: string | null;
}
interface Cert { id: string; name?: string; title?: string; issuer?: string; }
interface Work { id: string; title?: string; company?: string; description?: string; }

function parseList(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return s.split(",").map((x) => x.trim()).filter(Boolean);
  }
}

export default function ContractorProfileView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ completedJobs: number; onPlatformRate: number | null }>({ completedJobs: 0, onPlatformRate: null });
  const [certs, setCerts] = useState<Cert[]>([]);
  const [work, setWork] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  const isConsumer = user?.role === "consumer";

  const load = useCallback(async () => {
    try {
      const { data } = await api<{
        profile: Profile;
        completedJobs: number;
        onPlatformRate: number | null;
        certifications: Cert[];
        workHistory: Work[];
      }>(`/api/contractors/${id}`);
      setProfile(data.profile);
      setStats({ completedJobs: data.completedJobs, onPlatformRate: data.onPlatformRate });
      setCerts(data.certifications || []);
      setWork(data.workHistory || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this contractor.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadSaved = useCallback(async () => {
    if (!isConsumer) return;
    try {
      const { data } = await api<{ saved: { id: string }[] }>("/api/saved-contractors");
      setSaved((data.saved || []).some((s) => s.id === id));
    } catch {
      // ignore
    }
  }, [id, isConsumer]);

  useEffect(() => {
    load();
    loadSaved();
  }, [load, loadSaved]);

  async function toggleSave() {
    if (!isConsumer || savingToggle) return;
    setSavingToggle(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) {
        await api("/api/saved-contractors", { method: "POST", body: JSON.stringify({ contractorId: id }) });
      } else {
        await api(`/api/saved-contractors?contractorId=${id}`, { method: "DELETE" });
      }
    } catch (e) {
      setSaved(!next); // revert
      Alert.alert("Couldn't update", e instanceof ApiError ? e.message : "Please try again.");
    } finally {
      setSavingToggle(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <Header onBack={() => router.back()} />
        <View style={styles.center}>
          <Ionicons name="person-outline" size={40} color={colors.muted} />
          <Text style={styles.errTitle}>Contractor unavailable</Text>
          <Text style={styles.errBody}>{error || "This profile couldn't be loaded."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const cats = parseList(profile.categories);
  const verified = profile.verification_status === "verified";
  const insured = profile.insurance_status === "verified" || profile.insurance_status === "active";
  const bgChecked = profile.background_check_status === "passed" || profile.background_check_status === "verified";

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <Header
        onBack={() => router.back()}
        right={
          isConsumer ? (
            <TouchableOpacity onPress={toggleSave} hitSlop={10} disabled={savingToggle}>
              <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? colors.primary : colors.text} />
            </TouchableOpacity>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={styles.identity}>
          {profile.profile_photo ? (
            <Image source={{ uri: profile.profile_photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{profile.name?.charAt(0)?.toUpperCase() || "?"}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          {profile.contractor_type ? (
            <Text style={styles.type}>{profile.contractor_type.replace(/_/g, " ")}</Text>
          ) : null}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={15} color="#FBBF24" />
            <Text style={styles.ratingText}>
              {profile.rating ? profile.rating.toFixed(1) : "New"}
              {profile.rating_count ? ` (${profile.rating_count})` : ""}
            </Text>
            {profile.location ? <Text style={styles.location}> · {profile.location}</Text> : null}
          </View>
        </View>

        {/* Trust badges */}
        {(verified || insured || bgChecked) && (
          <View style={styles.badgeRow}>
            {verified && <Badge icon="checkmark-circle" label="Verified" />}
            {insured && <Badge icon="shield-checkmark" label="Insured" />}
            {bgChecked && <Badge icon="finger-print" label="Background-checked" />}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <Stat value={String(stats.completedJobs)} label="Jobs done" />
          <View style={styles.statDivider} />
          <Stat value={profile.years_experience ? `${profile.years_experience}y` : "—"} label="Experience" />
          <View style={styles.statDivider} />
          <Stat value={stats.onPlatformRate != null ? `${stats.onPlatformRate}%` : "—"} label="On-platform" />
        </View>

        {/* About */}
        {(profile.headline || profile.about_me || profile.bio) && (
          <View style={styles.section}>
            {profile.headline ? <Text style={styles.headline}>{profile.headline}</Text> : null}
            {(profile.about_me || profile.bio) ? (
              <Text style={styles.about}>{profile.about_me || profile.bio}</Text>
            ) : null}
          </View>
        )}

        {/* Categories */}
        {cats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.chipWrap}>
              {cats.map((c) => (
                <View key={c} style={styles.chip}>
                  <Text style={styles.chipText}>{c.replace(/_/g, " ")}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Certifications */}
        {certs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Credentials</Text>
            {certs.map((c) => (
              <View key={c.id} style={styles.listRow}>
                <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
                <Text style={styles.listText}>{c.name || c.title || "Certification"}{c.issuer ? ` · ${c.issuer}` : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Work history */}
        {work.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work history</Text>
            {work.map((w) => (
              <View key={w.id} style={styles.listRow}>
                <Ionicons name="briefcase-outline" size={16} color={colors.muted} />
                <Text style={styles.listText}>{w.title || "Role"}{w.company ? ` · ${w.company}` : ""}</Text>
              </View>
            ))}
          </View>
        )}

        {isConsumer && (
          <TouchableOpacity style={[styles.saveBtn, saved && styles.saveBtnActive]} onPress={toggleSave} disabled={savingToggle} activeOpacity={0.85}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={18} color={saved ? "#ffffff" : colors.primary} />
            <Text style={[styles.saveBtnText, saved && { color: "#ffffff" }]}>{saved ? "Saved" : "Save Pro"}</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, right }: { onBack: () => void; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={10} style={{ width: 24 }}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Contractor</Text>
      <View style={{ width: 24, alignItems: "flex-end" }}>{right}</View>
    </View>
  );
}
function Badge({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon} size={13} color="#6EE7B7" />
      <Text style={styles.trustBadgeText}>{label}</Text>
    </View>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface, padding: 32 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0F1011",
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  container: { padding: 16 },
  identity: { alignItems: "center", paddingVertical: 8 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#1a1b1f" },
  avatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 34, fontWeight: "800", color: "#ffffff" },
  name: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 12, letterSpacing: -0.4 },
  type: { fontSize: 13, color: colors.muted, marginTop: 2, textTransform: "capitalize" },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 4 },
  ratingText: { fontSize: 14, color: colors.text, fontWeight: "600" },
  location: { fontSize: 14, color: colors.muted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 14 },
  trustBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(52,211,153,0.14)", borderWidth: 1, borderColor: "rgba(52,211,153,0.30)",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
  },
  trustBadgeText: { fontSize: 12, color: "#6EE7B7", fontWeight: "600" },
  statsCard: {
    flexDirection: "row", alignItems: "center", marginTop: 18,
    backgroundColor: "#121316", borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 3 },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 10, letterSpacing: -0.2 },
  headline: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8, letterSpacing: -0.3 },
  about: { fontSize: 14, color: colors.body, lineHeight: 21 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { backgroundColor: "#18191b", borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 13, color: colors.body, textTransform: "capitalize" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  listText: { fontSize: 14, color: colors.body, flexShrink: 1 },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    marginTop: 26, paddingVertical: 15, borderRadius: 12,
    backgroundColor: "#121316", borderWidth: 1, borderColor: "rgba(59,130,246,0.40)",
  },
  saveBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: colors.primary },
  errTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  errBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
});

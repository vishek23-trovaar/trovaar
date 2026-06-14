import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "../lib/api";
import { colors } from "../lib/theme";

interface Certificate {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  category: string;
  location: string;
  completedAt: string | null;
  consumerName: string;
  consumerLocation: string | null;
  contractorName: string;
  contractorType: string;
  licenseNumber: string | null;
  yearsExperience: number;
  amountCents: number;
  laborCents: number | null;
  partsSummary: string | null;
  review: { rating: number; comment: string | null } | null;
  generatedAt: string;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return s;
  }
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function CertificateView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ certificate: Certificate }>(`/api/jobs/${id}/certificate`);
      setCert(data.certificate);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't load this certificate.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function share() {
    if (!cert) return;
    const lines = [
      "Trovaar — Work Completion Certificate",
      "",
      `Job: ${cert.jobTitle}`,
      `Completed: ${fmtDate(cert.completedAt)}`,
      `Contractor: ${cert.contractorName}`,
      cert.licenseNumber ? `License: ${cert.licenseNumber}` : "",
      `Client: ${cert.consumerName}`,
      `Total: $${(cert.amountCents / 100).toFixed(2)}`,
      cert.review ? `Rating: ${cert.review.rating}/5` : "",
    ].filter(Boolean);
    await Share.share({ title: "Work Completion Certificate", message: lines.join("\n") });
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
        <Text style={styles.headerTitle}>Certificate</Text>
        <TouchableOpacity onPress={share} hitSlop={10} disabled={!cert} style={{ width: 24 }}>
          <Ionicons name="share-outline" size={22} color={cert ? colors.primary : colors.muted} />
        </TouchableOpacity>
      </View>

      {error || !cert ? (
        <View style={styles.center}>
          <Ionicons name="ribbon-outline" size={40} color={colors.muted} />
          <Text style={styles.errTitle}>Certificate unavailable</Text>
          <Text style={styles.errBody}>{error || "This job isn't completed yet."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.cert}>
            <View style={styles.sealRow}>
              <View style={styles.seal}>
                <Ionicons name="ribbon" size={26} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.certEyebrow}>WORK COMPLETION CERTIFICATE</Text>
            <Text style={styles.certTitle}>{cert.jobTitle}</Text>
            <Text style={styles.certSub}>
              {cert.category?.replace(/_/g, " ")} · Completed {fmtDate(cert.completedAt)}
            </Text>

            <View style={styles.divider} />

            <Row label="Contractor" value={cert.contractorName} />
            <Row label="Type" value={(cert.contractorType || "—").replace(/_/g, " ")} />
            {cert.licenseNumber ? <Row label="License" value={cert.licenseNumber} /> : null}
            {cert.yearsExperience ? <Row label="Experience" value={`${cert.yearsExperience} yrs`} /> : null}

            <View style={styles.divider} />

            <Row label="Client" value={cert.consumerName} />
            {cert.location ? <Row label="Location" value={cert.location} /> : null}
            <Row label="Total paid" value={`$${(cert.amountCents / 100).toFixed(2)}`} />
            {cert.partsSummary ? <Row label="Parts" value={cert.partsSummary} /> : null}

            {cert.review ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.rowLabel}>Client review</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons
                      key={s}
                      name="star"
                      size={16}
                      color={s <= cert.review!.rating ? "#FBBF24" : "#23252a"}
                    />
                  ))}
                </View>
                {cert.review.comment ? <Text style={styles.reviewText}>“{cert.review.comment}”</Text> : null}
              </>
            ) : null}

            <View style={styles.divider} />
            <Text style={styles.footer}>
              Issued by Trovaar · {fmtDate(cert.generatedAt)}
            </Text>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={share} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={18} color="#ffffff" />
            <Text style={styles.shareBtnText}>Share Certificate</Text>
          </TouchableOpacity>
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  container: { padding: 16 },
  cert: {
    backgroundColor: "#121316",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 22,
  },
  sealRow: { alignItems: "center", marginBottom: 14 },
  seal: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59,130,246,0.14)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  certEyebrow: { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 1, textAlign: "center" },
  certTitle: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: 8, letterSpacing: -0.4 },
  certSub: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6, textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 5, gap: 16 },
  rowLabel: { fontSize: 13, color: colors.muted },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: "600", flexShrink: 1, textAlign: "right" },
  stars: { flexDirection: "row", gap: 3, marginTop: 8 },
  reviewText: { fontSize: 14, color: colors.body, fontStyle: "italic", marginTop: 8, lineHeight: 20 },
  footer: { fontSize: 12, color: colors.muted, textAlign: "center" },
  errTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 14, letterSpacing: -0.3 },
  errBody: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 16,
  },
  shareBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});

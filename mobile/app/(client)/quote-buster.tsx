import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api, API_URL, getToken } from "@/lib/api";
import { Button } from "@/components/ui";
import { colors, spacing, radius, typography } from "../../lib/theme";

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", emoji: "\u{1F527}" },
  { value: "electrical", label: "Electrical", emoji: "\u26A1" },
  { value: "hvac", label: "HVAC", emoji: "\u{1F321}\uFE0F" },
  { value: "roofing", label: "Roofing", emoji: "\u{1F3E0}" },
  { value: "painting", label: "Painting", emoji: "\u{1F3A8}" },
  { value: "flooring", label: "Flooring", emoji: "\u{1F9F1}" },
  { value: "landscaping", label: "Landscaping", emoji: "\u{1F33F}" },
  { value: "handyman", label: "Handyman", emoji: "\u{1F528}" },
  { value: "auto_repair", label: "Auto Repair", emoji: "\u{1F697}" },
  { value: "kitchen_remodel", label: "Kitchen Remodel", emoji: "\u{1F373}" },
  { value: "bathroom_remodel", label: "Bathroom Remodel", emoji: "\u{1F6BF}" },
  { value: "concrete_masonry", label: "Concrete", emoji: "\u{1F9F1}" },
  { value: "fencing", label: "Fencing", emoji: "\u{1F3E1}" },
  { value: "deck_patio", label: "Deck / Patio", emoji: "\u{1FA9C}" },
  { value: "carpentry", label: "Carpentry", emoji: "\u{1FAB5}" },
];

interface QuoteBustResult {
  originalQuote: number;
  estimatedFairLow: number;
  estimatedFairHigh: number;
  savingsLow: number;
  savingsHigh: number;
  savingsPercentLow: number;
  savingsPercentHigh: number;
  breakdown: string;
  tips: string[];
}

export default function QuoteBusterScreen() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteBustResult | null>(null);
  const [quoteImageUri, setQuoteImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function formatCurrency(n: number) {
    return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  async function pickQuoteImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library to upload a quote.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!picked.canceled && picked.assets[0]) {
      setQuoteImageUri(picked.assets[0].uri);
    }
  }

  async function handleSubmit() {
    if (!quoteImageUri) { Alert.alert("Error", "Please upload a photo of your quote"); return; }
    const amount = parseFloat(quoteAmount.replace(/[,$]/g, ""));
    if (!category) { Alert.alert("Error", "Please select a service category"); return; }
    if (!amount || amount <= 0) { Alert.alert("Error", "Please enter a valid quote amount"); return; }

    setLoading(true);
    setUploading(true);
    setResult(null);
    try {
      // Upload the image first
      const formData = new FormData();
      const filename = quoteImageUri.split("/").pop() || "quote.jpg";
      const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      formData.append("file", { uri: quoteImageUri, name: filename, type: mimeType } as any);

      const token = await getToken();
      const uploadRes = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const uploadData = await uploadRes.json();
      const quoteImageUrl = uploadData.url;
      setUploading(false);

      // Now analyze the quote
      const { data } = await api<{ result: QuoteBustResult }>("/api/ai/quote-bust", {
        method: "POST",
        body: JSON.stringify({ category, quoteAmount: amount, description, quoteImageUrl }),
      });
      setResult(data.result);
    } catch {
      Alert.alert("Error", "Failed to analyze quote. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="cash-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Quote Buster</Text>
          <Text style={styles.headerSubtitle}>
            Got an expensive quote? See what local pros really charge.
          </Text>
        </View>

        {/* Quote Upload (required) */}
        <Text style={styles.label}>Upload Your Quote</Text>
        <TouchableOpacity
          style={[styles.uploadArea, quoteImageUri && styles.uploadAreaWithImage]}
          onPress={pickQuoteImage}
          activeOpacity={0.7}
        >
          {quoteImageUri ? (
            <View style={styles.uploadPreview}>
              <Image source={{ uri: quoteImageUri }} style={styles.previewImage} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setQuoteImageUri(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={26} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <View style={styles.uploadIconWrap}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.uploadText}>Tap to upload a photo of your quote</Text>
              <Text style={styles.uploadHint}>JPG or PNG — snap a photo or pick from gallery</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Category picker */}
        <Text style={styles.label}>Service Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.categoryChip, category === cat.value && styles.categoryChipActive]}
              onPress={() => setCategory(cat.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={[styles.categoryLabel, category === cat.value && styles.categoryLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quote Amount */}
        <Text style={styles.label}>Quote Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={quoteAmount}
            onChangeText={setQuoteAmount}
            placeholder="e.g. 2,500"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Description */}
        <Text style={styles.label}>
          Describe the work <Text style={styles.labelOptional}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Replace water heater, 50-gallon tank"
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Submit */}
        <Button
          title={loading ? "Analyzing..." : "Bust My Quote"}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
        />

        {/* Results */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>{uploading ? "Uploading document..." : "Analyzing your quote..."}</Text>
          </View>
        )}

        {result && (
          <View style={styles.results}>
            {/* Savings card */}
            <View style={styles.savingsCard}>
              <Text style={styles.savingsLabel}>You could save up to</Text>
              <Text style={styles.savingsAmount}>{formatCurrency(result.savingsHigh)}</Text>
              {result.savingsPercentHigh > 0 && (
                <Text style={styles.savingsPercent}>
                  That&apos;s {result.savingsPercentLow}–{result.savingsPercentHigh}% less
                </Text>
              )}
            </View>

            {/* Price comparison */}
            <View style={styles.comparisonCard}>
              <Text style={styles.comparisonTitle}>Price Comparison</Text>

              <View style={styles.barGroup}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabel}>Big company quote</Text>
                  <Text style={[styles.barValue, { color: colors.danger }]}>{formatCurrency(result.originalQuote)}</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: "100%", backgroundColor: "#fca5a5" }]} />
                </View>
              </View>

              <View style={styles.barGroup}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabel}>Local pro estimate</Text>
                  <Text style={[styles.barValue, { color: colors.success }]}>
                    {formatCurrency(result.estimatedFairLow)} – {formatCurrency(result.estimatedFairHigh)}
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.round((result.estimatedFairHigh / result.originalQuote) * 100)}%`,
                        backgroundColor: "#6ee7b7",
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Why the difference?</Text>
              <Text style={styles.breakdownText}>{result.breakdown}</Text>
            </View>

            {/* Tips */}
            {result.tips.length > 0 && (
              <View style={styles.tipsCard}>
                <Text style={styles.tipsTitle}>Pro tips</Text>
                {result.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* CTA */}
            <View style={styles.ctaCard}>
              <Text style={styles.ctaTitle}>Ready to save?</Text>
              <Text style={styles.ctaSubtitle}>Post your job and let local pros compete.</Text>
              <Button
                title="Post a Job"
                onPress={() => {
                  const params: Record<string, string> = {};
                  if (category) params.category = category;
                  if (description) params.description = description;
                  if (result) params.budget_range = `$${result.estimatedFairLow.toLocaleString()} – $${result.estimatedFairHigh.toLocaleString()}`;
                  const qs = new URLSearchParams(params).toString();
                  router.push(`/(client)/post-job${qs ? `?${qs}` : ""}` as any);
                }}
                size="lg"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { padding: spacing.xl, paddingBottom: spacing["4xl"] },

  // Header
  header: {
    alignItems: "center",
    marginBottom: spacing["2xl"],
    paddingTop: spacing.md,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: colors.muted, textAlign: "center", paddingHorizontal: spacing.xl },

  // Labels
  label: { ...typography.caption, fontWeight: "600", color: colors.text, marginBottom: spacing.md, marginTop: spacing.xl },
  labelOptional: { fontWeight: "400", color: colors.muted },

  // Upload area
  uploadArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    overflow: "hidden",
  },
  uploadAreaWithImage: { borderStyle: "solid", borderColor: colors.primary },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["4xl"],
    gap: 8,
  },
  uploadIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  uploadText: { ...typography.body, fontWeight: "600", color: colors.text },
  uploadHint: { ...typography.tiny, color: colors.muted },
  uploadPreview: { position: "relative" as const },
  previewImage: { width: "100%" as any, height: 200 },
  removeImage: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    backgroundColor: colors.white,
    borderRadius: 13,
  },

  // Category chips
  categoryRow: { gap: 8, paddingBottom: 4 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#DBEAFE",
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: { ...typography.caption, color: colors.muted },
  categoryLabelActive: { color: colors.primary },

  // Amount input
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  dollarSign: { fontSize: 18, fontWeight: "700", color: colors.muted, marginRight: 4 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: "600", color: colors.text, paddingVertical: 14 },

  // Text area
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
    minHeight: 80,
    marginBottom: spacing.xl,
  },

  // Loading
  loadingBox: { alignItems: "center", paddingVertical: spacing["4xl"] },
  loadingText: { ...typography.body, color: colors.muted, marginTop: spacing.lg },

  // Results
  results: { marginTop: spacing["2xl"], gap: spacing.lg },

  // Savings card
  savingsCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    ...shadows.sm,
  },
  savingsLabel: { ...typography.caption, color: colors.success },
  savingsAmount: { fontSize: 40, fontWeight: "800", color: colors.success, marginVertical: 4 },
  savingsPercent: { fontSize: 15, fontWeight: "700", color: "#34d399" },

  // Comparison card
  comparisonCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  comparisonTitle: { ...typography.caption, fontWeight: "700", color: colors.text, marginBottom: spacing.lg },
  barGroup: { marginBottom: spacing.lg },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barLabel: { ...typography.bodySmall, color: colors.muted },
  barValue: { ...typography.bodySmall, fontWeight: "700" },
  barBg: { height: 8, backgroundColor: colors.surfaceDark, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },

  // Breakdown card
  breakdownCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  breakdownTitle: { ...typography.caption, fontWeight: "700", color: colors.text, marginBottom: 8 },
  breakdownText: { ...typography.body, color: colors.muted, lineHeight: 22 },

  // Tips card
  tipsCard: {
    backgroundColor: "#DBEAFE",
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  tipsTitle: { ...typography.caption, fontWeight: "700", color: colors.primaryDark, marginBottom: spacing.md },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  tipText: { ...typography.body, color: colors.primaryDark, flex: 1 },

  // CTA card
  ctaCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    ...shadows.md,
  },
  ctaTitle: { ...typography.h4, color: colors.white, marginBottom: 4 },
  ctaSubtitle: { ...typography.body, color: "#93c5fd", marginBottom: spacing.xl },
});

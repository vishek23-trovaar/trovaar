import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, typography, spacing, radius, shadows, getCategoryIcon } from '../../../lib/theme';


interface JobSummary {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
}

interface BidSummary {
  id: string;
  contractor_id: string;
  contractor_name: string;
  contractor_rating: number;
  price: number;
  timeline_days: number;
  availability_date: string;
  status: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  plumbing: "\u{1F527}", electrical: "\u26A1", hvac: "\u{1F321}\uFE0F",
  roofing: "\u{1F3E0}", landscaping: "\u{1F33F}", painting: "\u{1F3A8}",
  cleaning: "\u{1F9F9}", moving: "\u{1F4E6}", auto_repair: "\u{1F697}",
  general_handyman: "\u{1F528}", handyman: "\u{1F528}", other: "\u2795",
};

function getCategoryEmoji(category: string): string {
  const key = category?.toLowerCase().replace(/[\s-]/g, "_") || "other";
  return CATEGORY_EMOJIS[key] || "\u{1F4CB}";
}

export default function CheckoutScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobSummary | null>(null);
  const [acceptedBid, setAcceptedBid] = useState<BidSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [paid, setPaid] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, bidRes] = await Promise.all([
        api<Record<string, unknown>>(`/api/jobs/${jobId}`),
        api<{ bids: BidSummary[] }>(`/api/jobs/${jobId}/bids`),
      ]);
      const jobData = (jobRes.data.job || jobRes.data) as JobSummary;
      setJob(jobData);
      const accepted = (bidRes.data.bids || []).find((b) => b.status === "accepted");
      setAcceptedBid(accepted || null);
    } catch {
      Alert.alert("Error", "Could not load job details.");
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCheckout = async () => {
    if (!acceptedBid) {
      Alert.alert("No Bid", "No accepted bid found for this job.");
      return;
    }
    setProcessing(true);
    try {
      await api(`/api/jobs/${jobId}/checkout`, {
        method: "POST",
      });
      setPaid(true);
      Alert.alert(
        "Payment Secured!",
        "Your payment is held in escrow and will be released once you confirm the work is complete.",
        [{ text: "View Job", onPress: () => router.replace(`/(client)/job/${jobId}` as never) }]
      );
    } catch (err: unknown) {
      Alert.alert("Payment Error", (err as Error).message);
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading checkout...</Text>
      </View>
    );
  }

  if (!job || !acceptedBid) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
        <Text style={styles.errorText}>No accepted bid found</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const PLATFORM_FEE_RATE = 0.20;
  const bidPrice = acceptedBid.price;
  const platformFee = bidPrice * PLATFORM_FEE_RATE;
  const total = bidPrice;

  if (paid) {
    return (
      <View style={styles.center}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Payment Secured!</Text>
        <Text style={styles.successSub}>
          Your funds are safely held in escrow until the job is complete.
        </Text>
        <TouchableOpacity
          style={styles.viewJobBtn}
          onPress={() => router.replace(`/(client)/job/${jobId}` as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewJobBtnText}>View Job Details</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Job Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Job Summary</Text>
          </View>
          <View style={styles.jobRow}>
            <Text style={styles.jobEmoji}>{getCategoryEmoji(job.category)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobMeta}>
                {job.category?.replace(/_/g, " ")} {job.location ? `-- ${job.location}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Contractor Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Your Contractor</Text>
          </View>
          <View style={styles.contractorRow}>
            <View style={styles.contractorAvatar}>
              <Text style={styles.contractorAvatarText}>
                {(acceptedBid.contractor_name || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contractorName}>{acceptedBid.contractor_name || "Contractor"}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.contractorRating}>
                  {acceptedBid.contractor_rating?.toFixed(1) || "New"}
                </Text>
              </View>
            </View>
            {acceptedBid.timeline_days > 0 && (
              <View style={styles.timelinePill}>
                <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                <Text style={styles.timelinePillText}>{acceptedBid.timeline_days} days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.cardTitle}>Price Breakdown</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Service Cost</Text>
            <Text style={styles.priceValue}>${(bidPrice - platformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.priceRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.priceLabel}>Platform Fee (20%)</Text>
              <TouchableOpacity
                onPress={() => Alert.alert("Platform Fee", "The 20% platform fee covers payment processing, Resolution Guarantee protection, contractor vetting, and customer support.")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceValue}>${platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        </View>

        {/* Resolution Guarantee */}
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeHeader}>
            <Ionicons name="shield-checkmark" size={22} color={colors.success} />
            <Text style={styles.guaranteeTitle}>Resolution Guarantee</Text>
          </View>
          <Text style={styles.guaranteeText}>
            Your payment is protected. If the work is not completed satisfactorily, our team will mediate a resolution or issue a refund.
          </Text>
          <View style={styles.guaranteeFeatures}>
            {[
              "Funds held securely in escrow",
              "Released only when you confirm",
              "Dispute mediation included",
              "Money-back guarantee",
            ].map((feat, i) => (
              <View key={i} style={styles.guaranteeFeatureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.guaranteeFeatureText}>{feat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Escrow Explanation */}
        <View style={styles.escrowInfoCard}>
          <View style={styles.escrowInfoHeader}>
            <Ionicons name="lock-closed" size={18} color={"#7c3aed"} />
            <Text style={styles.escrowInfoTitle}>How Escrow Works</Text>
          </View>
          <View style={styles.escrowSteps}>
            {[
              { num: "1", text: "You pay now and funds are held securely" },
              { num: "2", text: "Contractor completes the work" },
              { num: "3", text: "You confirm satisfaction" },
              { num: "4", text: "Payment is released to contractor" },
            ].map((step) => (
              <View key={step.num} style={styles.escrowStepRow}>
                <View style={styles.escrowStepNum}>
                  <Text style={styles.escrowStepNumText}>{step.num}</Text>
                </View>
                <Text style={styles.escrowStepText}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky Pay Button */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.payBtn, processing && { opacity: 0.7 }]}
          onPress={handleCheckout}
          disabled={processing}
          activeOpacity={0.85}
        >
          {processing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="lock-closed" size={18} color={colors.white} />
              <Text style={styles.payBtnText}>
                Pay & Secure -- ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.stripeNote}>
          Secured by Stripe. Your card will be charged immediately.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface, paddingHorizontal: 32 },
  scrollContent: { padding: 16, paddingTop: 12 },

  loadingText: { fontSize: 15, color: colors.muted, marginTop: 12 },
  errorText: { fontSize: 16, color: colors.muted, marginTop: 12, textAlign: "center" },
  backBtn: { marginTop: 20, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.lg, backgroundColor: "#DBEAFE" },
  backBtnText: { color: colors.primary, fontSize: 15, fontWeight: "600" },

  // Success state
  successCircle: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: "800", color: colors.success, marginBottom: 8 },
  successSub: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22, marginBottom: 28 },
  viewJobBtn: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: radius.lg },
  viewJobBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },

  // Cards
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 18, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text },

  // Job summary
  jobRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  jobEmoji: { fontSize: 28 },
  jobTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 2 },
  jobMeta: { fontSize: 13, color: colors.muted, textTransform: "capitalize" },

  // Contractor
  contractorRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  contractorAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#DBEAFE",
    justifyContent: "center", alignItems: "center",
  },
  contractorAvatarText: { fontSize: 20, fontWeight: "700", color: colors.primary },
  contractorName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 2 },
  contractorRating: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  timelinePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md,
  },
  timelinePillText: { fontSize: 12, color: colors.muted, fontWeight: "500" },

  // Price breakdown
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  priceLabel: { fontSize: 15, color: colors.muted },
  priceValue: { fontSize: 15, color: colors.text, fontWeight: "500" },
  priceDivider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  totalLabel: { fontSize: 17, fontWeight: "700", color: colors.text },
  totalValue: { fontSize: 22, fontWeight: "800", color: colors.primary },

  // Guarantee
  guaranteeCard: {
    backgroundColor: "#D1FAE5", borderRadius: radius.xl, padding: 18, marginBottom: 12,
    borderWidth: 1.5, borderColor: "#a7f3d0",
  },
  guaranteeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  guaranteeTitle: { fontSize: 16, fontWeight: "700", color: colors.success },
  guaranteeText: { fontSize: 14, color: "#065f46", lineHeight: 20, marginBottom: 12 },
  guaranteeFeatures: { gap: 8 },
  guaranteeFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  guaranteeFeatureText: { fontSize: 14, color: "#065f46", fontWeight: "500" },

  // Escrow info
  escrowInfoCard: {
    backgroundColor: "#f5f3ff", borderRadius: radius.xl, padding: 18, marginBottom: 12,
    borderWidth: 1.5, borderColor: "#ddd6fe",
  },
  escrowInfoHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  escrowInfoTitle: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  escrowSteps: { gap: 12 },
  escrowStepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  escrowStepNum: {
    width: 28, height: 28, borderRadius: radius.lg, backgroundColor: "#7c3aed",
    justifyContent: "center", alignItems: "center",
  },
  escrowStepNumText: { fontSize: 13, fontWeight: "700", color: colors.white },
  escrowStepText: { fontSize: 14, color: "#6b21a8", flex: 1 },

  // Sticky bottom
  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 34, paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10,
  },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, paddingVertical: 18, borderRadius: radius.lg, gap: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  payBtnText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  stripeNote: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 8 },
});

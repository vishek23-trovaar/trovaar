import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "../../lib/theme";

const COLORS = {
  ...colors,
  primaryBg: "#EFF6FF",
  mutedLight: "#94A3B8",
  successBg: "#F0FDF4",
  dangerBg: "#FEF2F2",
  warningBg: "#FFFBEB",
  gold: colors.warning,
  goldBg: "#FEF3C7",
};

interface Plan {
  id: string;
  name: string;
  price: number;
  visits: number | null; // null = unlimited
  features: string[];
  badge?: string;
  highlight?: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  plan_name: string;
  visits_remaining: number | null;
  visits_total: number | null;
  renewal_date: string;
  status: "active" | "cancelled" | "expired";
}

// Fallback plans that match the API response from /api/subscriptions/plans.
// Used when the API is unreachable so the UI still renders correctly.
const HARDCODED_PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 29,
    visits: 2,
    features: [
      "2 service visits per month",
      "Standard booking priority",
      "Email & chat support",
      "Access to all categories",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 59,
    visits: 5,
    features: [
      "5 service visits per month",
      "Standard booking priority",
      "Phone & chat support",
      "Access to all categories",
      "10% discount on additional visits",
    ],
    badge: "Popular",
    highlight: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 99,
    visits: null,
    features: [
      "Unlimited visits per month",
      "Priority booking (skip the queue)",
      "Dedicated support line",
      "Access to all categories",
      "20% discount on parts & materials",
      "Free annual home inspection",
    ],
    badge: "Best Value",
  },
];

function SkeletonPulse({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const animValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: "#e2e8f0", opacity: animValue },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ padding: 16, gap: 14 }}>
      <SkeletonPulse width="100%" height={140} borderRadius={20} />
      <SkeletonPulse width={180} height={22} borderRadius={8} />
      {[1, 2, 3].map((i) => (
        <SkeletonPulse key={i} width="100%" height={200} borderRadius={16} />
      ))}
    </View>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function VisitsBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? Math.min(remaining / total, 1) : 0;
  return (
    <View style={styles.visitsBar}>
      <View style={styles.visitsBarTrack}>
        <View style={[styles.visitsBarFill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={styles.visitsBarText}>
        {remaining} / {total} visits remaining
      </Text>
    </View>
  );
}

function PlanCard({
  plan,
  isActive,
  subscribing,
  onSubscribe,
}: {
  plan: Plan;
  isActive: boolean;
  subscribing: boolean;
  onSubscribe: (planId: string) => void;
}) {
  const isHighlight = plan.highlight;
  const isUnlimited = plan.visits === null;

  return (
    <View
      style={[
        styles.planCard,
        isHighlight && styles.planCardHighlight,
        isActive && styles.planCardActive,
      ]}
    >
      {/* Badges */}
      <View style={styles.planCardTopRow}>
        <View>
          <Text style={[styles.planName, isHighlight && { color: COLORS.primary }]}>
            {plan.name}
          </Text>
          <View style={styles.planPriceRow}>
            <Text style={[styles.planPrice, isHighlight && { color: COLORS.primary }]}>
              ${plan.price}
            </Text>
            <Text style={styles.planPricePeriod}>/mo</Text>
          </View>
        </View>
        <View style={styles.planBadgesCol}>
          {plan.badge && (
            <View style={[styles.planBadge, isHighlight ? styles.planBadgePrimary : styles.planBadgeGold]}>
              <Text style={[styles.planBadgeText, isHighlight ? { color: COLORS.primary } : { color: COLORS.gold }]}>
                {plan.badge}
              </Text>
            </View>
          )}
          {isActive && (
            <View style={styles.activeBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.activeBadgeText}>Current Plan</Text>
            </View>
          )}
        </View>
      </View>

      {/* Visits summary */}
      <View style={styles.visitsSummary}>
        <Ionicons
          name={isUnlimited ? "infinite-outline" : "calendar-outline"}
          size={16}
          color={isHighlight ? COLORS.primary : COLORS.muted}
        />
        <Text style={[styles.visitsSummaryText, isHighlight && { color: COLORS.primary }]}>
          {isUnlimited ? "Unlimited visits/month" : `${plan.visits} visits/month`}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.planDivider} />

      {/* Features */}
      <View style={styles.featureList}>
        {plan.features.map((feat, idx) => (
          <View key={idx} style={styles.featureRow}>
            <View style={[styles.featureCheckWrap, isHighlight && { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons
                name="checkmark"
                size={12}
                color={isHighlight ? COLORS.primary : COLORS.success}
              />
            </View>
            <Text style={styles.featureText}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* Subscribe button */}
      {!isActive ? (
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            isHighlight && styles.subscribeBtnHighlight,
            subscribing && { opacity: 0.6 },
          ]}
          onPress={() => onSubscribe(plan.id)}
          disabled={subscribing}
          activeOpacity={0.8}
        >
          {subscribing ? (
            <ActivityIndicator size="small" color={isHighlight ? COLORS.white : COLORS.primary} />
          ) : (
            <>
              <Ionicons
                name="flash-outline"
                size={16}
                color={isHighlight ? COLORS.white : COLORS.primary}
              />
              <Text
                style={[styles.subscribeBtnText, isHighlight && { color: COLORS.white }]}
              >
                Subscribe — ${plan.price}/mo
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.activeBtn}>
          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
          <Text style={styles.activeBtnText}>Active Plan</Text>
        </View>
      )}
    </View>
  );
}

export default function SubscriptionsScreen() {
  const { user } = useAuth();
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>(HARDCODED_PLANS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    // Fetch current subscription
    try {
      const { data } = await api<{ subscription: Subscription }>("/api/subscriptions");
      setSubscription(data.subscription || null);
    } catch {
      setSubscription(null);
    }

    // Try to fetch plans from API; fall back to hardcoded
    try {
      const { data } = await api<{ plans: Plan[] }>("/api/subscriptions/plans");
      if (data.plans?.length) setPlans(data.plans);
    } catch {
      setPlans(HARDCODED_PLANS);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSubscribe = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;

    Alert.alert(
      `Subscribe to ${plan.name}`,
      `You'll be charged $${plan.price}/month. You can cancel anytime.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSubscribingId(planId);
            try {
              await api("/api/subscriptions", {
                method: "POST",
                body: JSON.stringify({ plan_id: planId }),
              });
              await fetchData();
              Alert.alert("Subscribed!", `You're now on the ${plan.name} plan.`);
            } catch (err: unknown) {
              Alert.alert("Error", (err as Error).message || "Could not process subscription.");
            } finally {
              setSubscribingId(null);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel? You'll keep access until the end of your billing period.",
      [
        { text: "Keep Plan", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              await api("/api/subscriptions", { method: "DELETE" });
              setSubscription(null);
              Alert.alert("Cancelled", "Your subscription has been cancelled.");
            } catch (err: unknown) {
              Alert.alert("Error", (err as Error).message || "Could not cancel subscription.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Plan</Text>
        </View>
        <LoadingSkeleton />
      </View>
    );
  }

  const activePlanId = subscription?.status === "active" ? subscription.plan_id : null;

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Plan</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Current subscription card */}
        {subscription && subscription.status === "active" ? (
          <View style={styles.currentCard}>
            <View style={styles.currentCardTop}>
              <View style={styles.currentCardLeft}>
                <View style={styles.currentBadge}>
                  <View style={styles.currentDot} />
                  <Text style={styles.currentBadgeText}>Active</Text>
                </View>
                <Text style={styles.currentPlanName}>{subscription.plan_name}</Text>
                <Text style={styles.currentRenewal}>
                  Renews {formatDate(subscription.renewal_date)}
                </Text>
              </View>
              <View style={styles.currentCardIcon}>
                <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
              </View>
            </View>

            {subscription.visits_total !== null && subscription.visits_remaining !== null ? (
              <VisitsBar
                remaining={subscription.visits_remaining}
                total={subscription.visits_total}
              />
            ) : (
              <View style={styles.unlimitedRow}>
                <Ionicons name="infinite-outline" size={16} color={COLORS.primary} />
                <Text style={styles.unlimitedText}>Unlimited visits this month</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={cancelling}
              activeOpacity={0.7}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color={COLORS.danger} />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                  <Text style={styles.cancelBtnText}>Cancel Subscription</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noSubCard}>
            <Ionicons name="cube-outline" size={36} color={COLORS.mutedLight} />
            <Text style={styles.noSubTitle}>No active plan</Text>
            <Text style={styles.noSubSub}>
              Subscribe to a plan to unlock monthly service visits and priority booking.
            </Text>
          </View>
        )}

        {/* Plans section */}
        <Text style={styles.plansHeader}>Available Plans</Text>

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isActive={activePlanId === plan.id}
            subscribing={subscribingId === plan.id}
            onSubscribe={handleSubscribe}
          />
        ))}

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.mutedLight} />
          <Text style={styles.footerNoteText}>
            All plans billed monthly. Cancel anytime before the renewal date. Unused visits do not carry over.
          </Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
  },

  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // Current subscription card
  currentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "30",
  },
  currentCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  currentCardLeft: { gap: 6 },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.successBg,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.success,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success,
  },
  currentPlanName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  currentRenewal: {
    fontSize: 13,
    color: COLORS.muted,
  },
  currentCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },

  // Visits bar
  visitsBar: { gap: 8, marginBottom: 14 },
  visitsBarTrack: {
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  visitsBarFill: {
    height: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  visitsBarText: {
    fontSize: 13,
    color: COLORS.muted,
    fontWeight: "500",
  },

  unlimitedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  unlimitedText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.danger,
  },

  noSubCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  noSubTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  noSubSub: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  plansHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    marginTop: 4,
    marginBottom: 2,
  },

  // Plan card
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  planCardHighlight: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
  },
  planCardActive: {
    borderColor: COLORS.success,
    shadowColor: COLORS.success,
    shadowOpacity: 0.1,
  },
  planCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  planPrice: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.secondary,
  },
  planPricePeriod: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "500",
  },
  planBadgesCol: {
    gap: 6,
    alignItems: "flex-end",
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBadgePrimary: { backgroundColor: COLORS.primaryBg },
  planBadgeGold: { backgroundColor: COLORS.goldBg },
  planBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },

  visitsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  visitsSummaryText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "600",
  },

  planDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },

  featureList: { gap: 10, marginBottom: 18 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureCheckWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.successBg,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    color: COLORS.muted,
    flex: 1,
    lineHeight: 19,
  },

  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  subscribeBtnHighlight: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  activeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 13,
    backgroundColor: COLORS.successBg,
  },
  activeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.success,
  },

  // Footer
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.mutedLight,
    lineHeight: 17,
  },
});

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TrovaarLogo from "@/components/TrovaarLogo";
import { Button } from "@/components/ui";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Page {
  icon: keyof typeof Ionicons.glyphMap;
  emoji: string;
  title: string;
  description: string;
  color: string;
}

const CLIENT_PAGES: Page[] = [
  {
    icon: "briefcase-outline",
    emoji: "",
    title: "Post any job",
    description:
      "Snap a photo, describe what you need, and get bids from qualified pros in minutes.",
    color: "#3b82f6",
  },
  {
    icon: "checkmark-done-outline",
    emoji: "",
    title: "Compare & choose",
    description:
      "Review bids from verified professionals. Compare prices, ratings, and availability.",
    color: "#059669",
  },
  {
    icon: "shield-checkmark-outline",
    emoji: "",
    title: "Fair pricing, no bias",
    description:
      "Your personal details stay hidden until you accept a bid. Every quote is based on the job — not who you are. No one gets overcharged.",
    color: "#dc2626",
  },
  {
    icon: "star-outline",
    emoji: "",
    title: "Get it done",
    description:
      "Track progress in real time, pay securely through the app, and leave a review.",
    color: "#d97706",
  },
];

const PRO_PAGES: Page[] = [
  {
    icon: "map-outline",
    emoji: "",
    title: "Find jobs near you",
    description:
      "Browse live jobs in your area. Filter by category, urgency, and budget to find the right fit.",
    color: "#7c3aed",
  },
  {
    icon: "cash-outline",
    emoji: "",
    title: "Bid & win work",
    description:
      "Set your own price, timeline, and availability. Win jobs based on your skills and reputation.",
    color: "#0891b2",
  },
  {
    icon: "trending-up-outline",
    emoji: "",
    title: "Grow your business",
    description:
      "Build a 5-star portfolio, earn steady income, and get repeat clients — no monthly fees, ever.",
    color: "#059669",
  },
];

type Mode = null | "client" | "pro";

export default function OnboardingScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const pages = mode === "pro" ? PRO_PAGES : CLIENT_PAGES;

  const goToSignup = () => {
    router.replace("/(auth)/signup");
  };

  const goToLogin = () => {
    router.replace("/(auth)/login");
  };

  // ── Role Picker Screen ──
  if (mode === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.pickerScreen, { opacity: fadeAnim }]}>
          {/* Top spacer */}
          <View style={{ flex: 1 }} />

          {/* Centered Logo */}
          <View style={styles.logoCentered}>
            <View style={styles.logoBig}>
              <TrovaarLogo size={52} />
            </View>
            <Text style={styles.logoTextBig}>Trovaar</Text>
            <Text style={styles.logoTagline}>Stop searching, start finding.</Text>
          </View>

          {/* Spacer */}
          <View style={{ flex: 0.6 }} />

          {/* Role Cards */}
          <View style={styles.pickerCards}>
            <Text style={styles.pickerQuestion}>I want to...</Text>

            <Pressable
              style={styles.roleCard}
              onPress={() => setMode("client")}
            >
              <View style={[styles.roleIconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="home" size={30} color={colors.primaryLight} />
              </View>
              <View style={styles.roleTextBox}>
                <Text style={styles.roleTitle}>Hire a professional</Text>
                <Text style={styles.roleNote}>Post jobs that need to be performed</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>

            <Pressable
              style={styles.roleCard}
              onPress={() => setMode("pro")}
            >
              <View style={[styles.roleIconBox, { backgroundColor: "#f5f3ff" }]}>
                <Ionicons name="construct" size={30} color="#7c3aed" />
              </View>
              <View style={styles.roleTextBox}>
                <Text style={styles.roleTitle}>Find work</Text>
                <Text style={styles.roleNote}>I have skills to get the job done</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {/* Bottom */}
          <View style={styles.pickerBottom}>
            <Pressable onPress={goToLogin} style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Text style={styles.loginLink}>Log In</Text>
            </Pressable>
            <Text style={styles.sloganText}>The network that connects every skilled trade to every job.</Text>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── Onboarding — Stacked Cards with Tabs ──
  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setMode(null)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.secondary} />
        </Pressable>
        <Pressable onPress={goToLogin}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, mode === "client" && styles.tabActive]}
          onPress={() => setMode("client")}
        >
          <Ionicons name="home-outline" size={16} color={mode === "client" ? colors.white : colors.muted} />
          <Text style={[styles.tabText, mode === "client" && styles.tabTextActive]}>For Clients</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "pro" && styles.tabActivePro]}
          onPress={() => setMode("pro")}
        >
          <Ionicons name="construct-outline" size={16} color={mode === "pro" ? colors.white : colors.muted} />
          <Text style={[styles.tabText, mode === "pro" && styles.tabTextActive]}>For Pros</Text>
        </Pressable>
      </View>

      {/* Feature Cards */}
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {pages.map((page, idx) => (
          <View key={idx} style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: page.color + "15" }]}>
              <Ionicons name={page.icon} size={28} color={page.color} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{page.title}</Text>
              <Text style={styles.featureDesc}>{page.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottom}>
        <View style={styles.buttonArea}>
          <Button
            title="Get Started"
            onPress={goToSignup}
            size="lg"
          />
        </View>

        <Pressable onPress={goToLogin} style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Text style={styles.loginLink}>Log In</Text>
        </Pressable>
      </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    ...typography.body,
    color: colors.muted,
    fontWeight: "600",
  },

  // ── Role Picker ──
  pickerScreen: {
    flex: 1,
    paddingHorizontal: spacing["3xl"],
  },
  logoCentered: {
    alignItems: "center",
  },
  logoBig: {
    width: 80,
    height: 80,
    borderRadius: spacing["3xl"],
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoTextBig: {
    fontSize: 38,
    fontWeight: "900",
    color: colors.secondary,
    letterSpacing: -1,
    marginBottom: spacing.smd,
  },
  logoTagline: {
    ...typography.body,
    color: colors.muted,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  pickerCards: {
    paddingHorizontal: 0,
  },
  pickerQuestion: {
    ...typography.h3,
    color: colors.secondary,
    marginBottom: spacing.xl,
  },
  pickerBottom: {
    flex: 0.8,
    justifyContent: "flex-end",
    paddingBottom: spacing["4xl"],
    alignItems: "center",
  },
  sloganText: {
    ...typography.caption,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 18,
    paddingHorizontal: spacing["2xl"],
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    gap: 14,
  },
  roleIconBox: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextBox: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 3,
  },
  roleNote: {
    ...typography.bodySmall,
    color: colors.muted,
    lineHeight: 18,
  },
  pickerContainer: {
    flex: 1,
    paddingHorizontal: spacing["3xl"],
    justifyContent: "center",
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: "row",
    marginHorizontal: spacing["3xl"],
    marginBottom: spacing.xl,
    backgroundColor: colors.surfaceDark,
    borderRadius: 14,
    padding: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.smd,
    paddingVertical: spacing.lg,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabActivePro: {
    backgroundColor: "#7C3AED",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.white,
  },

  // ── Feature Cards ──
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.xl,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    gap: 14,
    ...shadows.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  featureDesc: {
    ...typography.bodySmall,
    color: colors.muted,
    lineHeight: 20,
  },

  // ── Bottom ──
  bottom: {
    paddingHorizontal: spacing["3xl"],
    paddingBottom: spacing.xl,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing["3xl"],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttonArea: {
    marginBottom: spacing.xl,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  loginText: {
    fontSize: 14,
    color: colors.muted,
  },
  loginLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
});

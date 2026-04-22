import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

interface Page {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const CLIENT_PAGES: Page[] = [
  {
    icon: "briefcase-outline",
    title: "Post any job",
    description:
      "Snap a photo, describe what you need, and get bids from qualified pros in minutes.",
    color: "#3B82F6",
  },
  {
    icon: "checkmark-done-outline",
    title: "Compare & choose",
    description:
      "Review bids from verified professionals. Compare prices, ratings, and availability.",
    color: "#10B981",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Fair pricing, no bias",
    description:
      "Your details stay hidden until you accept a bid. Every quote is based on the job — not who you are.",
    color: "#EF4444",
  },
  {
    icon: "star-outline",
    title: "Get it done",
    description:
      "Track progress in real time, pay securely through the app, and leave a review.",
    color: "#F59E0B",
  },
];

const PRO_PAGES: Page[] = [
  {
    icon: "map-outline",
    title: "Find jobs near you",
    description:
      "Browse live jobs in your area. Filter by category, urgency, and budget to find the right fit.",
    color: "#7C3AED",
  },
  {
    icon: "cash-outline",
    title: "Bid & win work",
    description:
      "Set your own price, timeline, and availability. Win jobs based on your skills and reputation.",
    color: "#0891B2",
  },
  {
    icon: "trending-up-outline",
    title: "Grow your business",
    description:
      "Build a 5-star portfolio, earn steady income, and get repeat clients — no monthly fees, ever.",
    color: "#10B981",
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

  // ── Role Picker Screen (Dark theme matching web hero) ──
  if (mode === null) {
    return (
      <View style={styles.darkContainer}>
        <LinearGradient
          colors={["#0F172A", "#131D35", "#0F172A"]}
          style={StyleSheet.absoluteFill}
        />

        {/* Glow behind logo */}
        <View style={styles.glowCircle} />

        <SafeAreaView style={styles.darkSafe}>
          <Animated.View style={[styles.pickerScreen, { opacity: fadeAnim }]}>
            {/* Top spacer */}
            <View style={{ flex: 1 }} />

            {/* Logo area */}
            <View style={styles.logoCentered}>
              <View style={styles.iconBadge}>
                <LinearGradient
                  colors={["#2563EB", "#1D4ED8"]}
                  style={styles.iconGradient}
                >
                  <Ionicons name="construct" size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <Text style={styles.logoText}>Trovaar</Text>
              <Text style={styles.logoTagline}>
                The network that connects{"\n"}
                <Text style={styles.taglineAccent}>every skilled trade</Text> to
                every job.
              </Text>
            </View>

            {/* Spacer */}
            <View style={{ flex: 0.6 }} />

            {/* Role Cards */}
            <View style={styles.pickerCards}>
              <Text style={styles.pickerQuestion}>I want to...</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.roleCard,
                  pressed && styles.roleCardPressed,
                ]}
                onPress={() => setMode("client")}
              >
                <View style={[styles.roleIconBox, { backgroundColor: "rgba(37,99,235,0.12)" }]}>
                  <Ionicons name="home" size={26} color="#3B82F6" />
                </View>
                <View style={styles.roleTextBox}>
                  <Text style={styles.roleTitle}>Hire a professional</Text>
                  <Text style={styles.roleNote}>
                    Post jobs that need to be performed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.roleCard,
                  pressed && styles.roleCardPressed,
                ]}
                onPress={() => setMode("pro")}
              >
                <View style={[styles.roleIconBox, { backgroundColor: "rgba(124,58,237,0.12)" }]}>
                  <Ionicons name="construct" size={26} color="#7C3AED" />
                </View>
                <View style={styles.roleTextBox}>
                  <Text style={styles.roleTitle}>Find work</Text>
                  <Text style={styles.roleNote}>
                    I have skills to get the job done
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#475569" />
              </Pressable>
            </View>

            {/* Bottom */}
            <View style={styles.pickerBottom}>
              <Pressable onPress={goToLogin} style={styles.loginRow}>
                <Text style={styles.loginTextDark}>
                  Already have an account?{" "}
                </Text>
                <Text style={styles.loginLinkDark}>Log In</Text>
              </Pressable>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Onboarding — Feature Cards (Light theme) ──
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
            <Ionicons
              name="home-outline"
              size={16}
              color={mode === "client" ? colors.white : colors.muted}
            />
            <Text
              style={[
                styles.tabText,
                mode === "client" && styles.tabTextActive,
              ]}
            >
              For Clients
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, mode === "pro" && styles.tabActivePro]}
            onPress={() => setMode("pro")}
          >
            <Ionicons
              name="construct-outline"
              size={16}
              color={mode === "pro" ? colors.white : colors.muted}
            />
            <Text
              style={[
                styles.tabText,
                mode === "pro" && styles.tabTextActive,
              ]}
            >
              For Pros
            </Text>
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
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: page.color + "12" },
                ]}
              >
                <Ionicons name={page.icon} size={26} color={page.color} />
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
          <Pressable style={styles.getStartedBtn} onPress={goToSignup}>
            <LinearGradient
              colors={["#2563EB", "#1D4ED8"]}
              style={styles.getStartedGradient}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={goToLogin} style={styles.loginRow}>
            <Text style={styles.loginText}>
              Already have an account?{" "}
            </Text>
            <Text style={styles.loginLink}>Log In</Text>
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Dark theme (Role Picker) ──
  darkContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  darkSafe: {
    flex: 1,
  },
  glowCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#2563EB",
    opacity: 0.06,
    top: "22%",
    alignSelf: "center",
  },
  pickerScreen: {
    flex: 1,
    paddingHorizontal: spacing["3xl"],
  },
  logoCentered: {
    alignItems: "center",
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
    marginBottom: spacing.lg,
  },
  logoTagline: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  taglineAccent: {
    color: "#818CF8",
    fontWeight: "700",
  },
  pickerCards: {
    paddingHorizontal: 0,
  },
  pickerQuestion: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: spacing.xl,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    gap: 14,
  },
  roleCardPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextBox: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  roleNote: {
    fontSize: 13,
    color: "#94A3B8",
    lineHeight: 18,
  },
  pickerBottom: {
    flex: 0.6,
    justifyContent: "flex-end",
    paddingBottom: spacing["4xl"],
    alignItems: "center",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
  loginTextDark: {
    fontSize: 14,
    color: "#64748B",
  },
  loginLinkDark: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "700",
  },

  // ── Light theme (Feature Cards) ──
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
  getStartedBtn: {
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  getStartedGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: radius.lg,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
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

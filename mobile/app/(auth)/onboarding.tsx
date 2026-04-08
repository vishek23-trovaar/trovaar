import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TrovaarLogo from "@/components/TrovaarLogo";
import { Button } from "@/components/ui";

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
        <View style={styles.pickerScreen}>
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
              <View style={[styles.roleIconBox, { backgroundColor: "#eff6ff" }]}>
                <Ionicons name="home" size={30} color="#3b82f6" />
              </View>
              <View style={styles.roleTextBox}>
                <Text style={styles.roleTitle}>Hire a professional</Text>
                <Text style={styles.roleNote}>Post jobs that need to be performed</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
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
              <Ionicons name="chevron-forward" size={22} color="#94a3b8" />
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
        </View>
      </SafeAreaView>
    );
  }

  // ── Onboarding — Stacked Cards with Tabs ──
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setMode(null)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
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
          <Ionicons name="home-outline" size={16} color={mode === "client" ? "#ffffff" : "#64748b"} />
          <Text style={[styles.tabText, mode === "client" && styles.tabTextActive]}>For Clients</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "pro" && styles.tabActivePro]}
          onPress={() => setMode("pro")}
        >
          <Ionicons name="construct-outline" size={16} color={mode === "pro" ? "#ffffff" : "#64748b"} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "600",
  },

  // ── Role Picker ──
  pickerScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  logoCentered: {
    alignItems: "center",
  },
  logoBig: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoTextBig: {
    fontSize: 38,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -1,
    marginBottom: 6,
  },
  logoTagline: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  pickerCards: {
    paddingHorizontal: 0,
  },
  pickerQuestion: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  pickerBottom: {
    flex: 0.8,
    justifyContent: "flex-end",
    paddingBottom: 32,
    alignItems: "center",
  },
  sloganText: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 18,
    marginBottom: 16,
    gap: 14,
  },
  roleIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextBox: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 3,
  },
  roleNote: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  pickerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  // ── Tabs ──
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: "#1e40af",
  },
  tabActivePro: {
    backgroundColor: "#7c3aed",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#ffffff",
  },

  // ── Feature Cards ──
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    color: "#0f172a",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },

  // ── Bottom ──
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#1e40af",
  },
  buttonArea: {
    marginBottom: 16,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loginText: {
    fontSize: 14,
    color: "#64748b",
  },
  loginLink: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "700",
  },
});

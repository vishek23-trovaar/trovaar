import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../lib/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(12)).current;
  const footerFade = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  const navigated = useRef(false);

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 140,
      }),
    ]).start();

    // Tagline enters after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // Footer fades in
    setTimeout(() => {
      Animated.timing(footerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 700);

    // Subtle pulse on the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, scaleAnim, taglineFade, taglineSlide, footerFade, pulseAnim]);

  useEffect(() => {
    AsyncStorage.getItem("hasSeenOnboarding")
      .then((value) => {
        setHasSeenOnboarding(value === "true");
      })
      .catch(() => {
        setHasSeenOnboarding(false);
      });
  }, []);

  useEffect(() => {
    if (loading || hasSeenOnboarding === null || navigated.current) return;

    const timer = setTimeout(() => {
      if (navigated.current) return;
      navigated.current = true;

      if (!user) {
        if (!hasSeenOnboarding) {
          AsyncStorage.setItem("hasSeenOnboarding", "true").catch(() => {});
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(auth)/login");
        }
      } else if (user.role === "consumer") {
        router.replace("/(client)/dashboard");
      } else {
        router.replace("/(contractor)/dashboard");
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [user, loading, router, hasSeenOnboarding]);

  return (
    <View style={styles.container}>
      {/* Background gradient matching web hero */}
      <LinearGradient
        colors={["#0F172A", "#131D35", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle grid overlay for depth */}
      <View style={styles.gridOverlay} />

      {/* Glow effect behind logo */}
      <View style={styles.glowOuter} />
      <View style={styles.glowInner} />

      {/* Main content */}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoArea,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icon badge */}
          <Animated.View
            style={[styles.iconBadge, { transform: [{ scale: pulseAnim }] }]}
          >
            <LinearGradient
              colors={["#2563EB", "#1D4ED8"]}
              style={styles.iconGradient}
            >
              <Ionicons name="construct" size={28} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Brand name */}
          <Text style={styles.brand}>Trovaar</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={{
            opacity: taglineFade,
            transform: [{ translateY: taglineSlide }],
          }}
        >
          <Text style={styles.tagline}>
            The network that connects{"\n"}
            <Text style={styles.taglineAccent}>every skilled trade</Text> to
            every job.
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: footerFade }]}>
        {/* Live indicator matching web */}
        <View style={styles.liveChip}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live marketplace</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.03,
    // Simulated grid via border
  },
  glowOuter: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#2563EB",
    opacity: 0.06,
    top: SCREEN_HEIGHT * 0.3 - 150,
    left: SCREEN_WIDTH * 0.5 - 150,
  },
  glowInner: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#7C3AED",
    opacity: 0.05,
    top: SCREEN_HEIGHT * 0.3 - 90,
    left: SCREEN_WIDTH * 0.5 - 90,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing["3xl"],
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 24,
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
  brand: {
    fontSize: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  taglineAccent: {
    color: "#818CF8",
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.3,
  },
});

import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Image } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const navigated = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 120,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then((value) => {
      setHasSeenOnboarding(value === 'true');
    }).catch(() => {
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
          AsyncStorage.setItem('hasSeenOnboarding', 'true').catch(() => {});
          router.replace("/(auth)/onboarding");
        } else {
          router.replace("/(auth)/login");
        }
      } else if (user.role === "consumer") {
        router.replace("/(client)/dashboard");
      } else {
        router.replace("/(contractor)/dashboard");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, loading, router, hasSeenOnboarding]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.iconBadge}>
          <Image
            source={require("../assets/trovaar-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brand}>trovaar</Text>
        <Text style={styles.tagline}>Stop searching, start finding.</Text>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brand: {
    fontSize: 44,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
    color: "#94a3b8",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  footer: {
    position: "absolute",
    bottom: 60,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#2563eb",
  },
});

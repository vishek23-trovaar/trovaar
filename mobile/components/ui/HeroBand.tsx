import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, Animated, Easing, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradients, glass } from "../../lib/theme";

// Accent color for inline headline highlights (the "every skilled trade" phrase).
// A solid bright indigo reads as a premium highlight on midnight and — unlike
// SVG gradient text — wraps naturally and needs no manual width measurement.
export const ACCENT_HIGHLIGHT = "#93C5FD";

/**
 * The signature midnight-gradient brand surface (see DESIGN.md `hero-band`).
 * Used on auth screens and as dashboard header bands. Renders the 135° midnight
 * gradient with a soft blue glow.
 */
export function HeroBand({
  children,
  style,
  compact = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  return (
    <LinearGradient
      colors={(compact ? gradients.midnightCompact : gradients.midnight) as readonly [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.band, style]}
    >
      <View pointerEvents="none" style={styles.glow} />
      {children}
    </LinearGradient>
  );
}

/**
 * The "Live marketplace — pros bidding now" eyebrow with a pulsing green dot.
 * Trovaar's real-time signal.
 */
export function LiveEyebrow({ label = "Live marketplace — pros bidding now" }: { label?: string }) {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Skip the infinite pulse on web — RN-web can't use the native driver, so
    // the JS-thread loop pegs the renderer (and infinite animations are poor
    // web citizens). Native gets the full ping animation.
    if (Platform.OS === "web") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <View style={styles.eyebrow}>
      <View style={styles.dotWrap}>
        <Animated.View
          style={[styles.dotRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
        />
        <View style={styles.dot} />
      </View>
      <Text style={styles.eyebrowText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -120,
    left: -60,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: glass.fill,
    borderWidth: 1,
    borderColor: glass.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  dotWrap: {
    width: 8,
    height: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dotRing: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  eyebrowText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "600",
  },
});

import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle, Animated, Easing, Platform } from "react-native";

// Accent color for inline headline highlights (the "every skilled trade" phrase).
// Linear's bright-blue accent, used sparingly on the deepest band.
export const ACCENT_HIGHLIGHT = "#60A5FA";

/**
 * The brand header band (see DESIGN.md `hero-band`). In Linear there are no
 * gradients or glows — this is a flat near-black charcoal surface separated
 * from the content below by a single hairline border. Used on auth screens and
 * as dashboard header bands.
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
    <View style={[styles.band, compact && styles.bandCompact, style]}>
      {children}
    </View>
  );
}

/**
 * The "Live marketplace — pros bidding now" eyebrow with a pulsing green dot —
 * Trovaar's real-time signal. The chip is a solid charcoal pill with a hairline
 * border (no glass).
 */
export function LiveEyebrow({ label = "Live marketplace — pros bidding now" }: { label?: string }) {
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Skip the infinite pulse on web — RN-web can't use the native driver, so
    // the JS-thread loop pegs the renderer. Native gets the full ping.
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
    backgroundColor: "#0f1011",
    borderBottomWidth: 1,
    borderBottomColor: "#23252a",
    overflow: "hidden",
  },
  bandCompact: {
    backgroundColor: "#0f1011",
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#18191b",
    borderWidth: 1,
    borderColor: "#23252a",
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
    color: "#c9cdd3",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});

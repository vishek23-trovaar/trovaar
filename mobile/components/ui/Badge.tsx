import React from "react";
import { View, Text, StyleSheet } from "react-native";

type BadgeColor = "blue" | "green" | "amber" | "red" | "slate";

interface BadgeProps {
  text: string;
  color?: BadgeColor;
}

// Linear chips — subtle tinted fill on dark, bright readable text, hairline border.
const BADGE_COLORS: Record<BadgeColor, { bg: string; text: string; border: string }> = {
  blue: { bg: "rgba(59,130,246,0.14)", text: "#93c5fd", border: "rgba(59,130,246,0.30)" },
  green: { bg: "rgba(52,211,153,0.14)", text: "#6ee7b7", border: "rgba(52,211,153,0.30)" },
  amber: { bg: "rgba(251,191,36,0.14)", text: "#fcd34d", border: "rgba(251,191,36,0.30)" },
  red: { bg: "rgba(248,113,113,0.15)", text: "#fca5a5", border: "rgba(248,113,113,0.30)" },
  slate: { bg: "rgba(138,143,152,0.14)", text: "#c0c4cc", border: "rgba(138,143,152,0.28)" },
};

export default function Badge({ text, color = "blue" }: BadgeProps) {
  const c = BADGE_COLORS[color];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});

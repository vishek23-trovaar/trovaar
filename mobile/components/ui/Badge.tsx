import React from "react";
import { View, Text, StyleSheet } from "react-native";

type BadgeColor = "blue" | "green" | "amber" | "red" | "slate";

interface BadgeProps {
  text: string;
  color?: BadgeColor;
}

const BADGE_COLORS: Record<BadgeColor, { bg: string; text: string }> = {
  blue: { bg: "#dbeafe", text: "#1e40af" },
  green: { bg: "#d1fae5", text: "#059669" },
  amber: { bg: "#fef3c7", text: "#d97706" },
  red: { bg: "#fee2e2", text: "#dc2626" },
  slate: { bg: "#f1f5f9", text: "#475569" },
};

export default function Badge({ text, color = "blue" }: BadgeProps) {
  const c = BADGE_COLORS[color];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});

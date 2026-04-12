import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

type AvatarSize = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  imageUri?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const FONT_MAP: Record<AvatarSize, number> = {
  sm: 13,
  md: 18,
  lg: 24,
  xl: 32,
};

const PALETTE = [
  "#2563eb", "#7c3aed", "#0891b2", "#059669",
  "#d97706", "#dc2626", "#9333ea", "#2563eb",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitial(name: string): string {
  return (name || "?").charAt(0).toUpperCase();
}

export default function Avatar({ name, size = "md", imageUri }: AvatarProps) {
  const dim = SIZE_MAP[size];
  const fontSize = FONT_MAP[size];
  const bg = hashColor(name);

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.image, { width: dim, height: dim, borderRadius: dim / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initial, { fontSize }]}>{getInitial(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    color: "#ffffff",
    fontWeight: "700",
  },
  image: {
    backgroundColor: "#e2e8f0",
  },
});

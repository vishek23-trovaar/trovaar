import React from "react";
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { glass } from "../../lib/theme";

// default  — flat white card, hairline border, soft shadow (on light surfaces)
// glass    — translucent card for layering on midnight gradient bands
// elevated — white card with a stronger lift
type CardVariant = "default" | "glass" | "elevated";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
}

export default function Card({
  children,
  onPress,
  padding = 16,
  variant = "default",
  style,
}: CardProps) {
  const variantStyle =
    variant === "glass" ? styles.glass : variant === "elevated" ? styles.elevated : styles.card;

  const content = <View style={[variantStyle, { padding }, style]}>{children}</View>;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  elevated: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  glass: {
    backgroundColor: glass.fill,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: glass.border,
  },
});

import React from "react";
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from "react-native";

// Linear cards — flat charcoal surface, hairline border, no shadow wash.
//  default  — raised card (#121316) on canvas, hairline border
//  glass    — inset chip surface (#18191b) for layering on a band/card
//  elevated — same surface with a stronger hairline (active/selected)
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
    variant === "glass"
      ? styles.glass
      : variant === "elevated"
      ? styles.elevated
      : styles.card;

  const content = <View style={[variantStyle, { padding }, style]}>{children}</View>;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#121316",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#23252a",
  },
  elevated: {
    backgroundColor: "#121316",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#34343a",
  },
  glass: {
    backgroundColor: "#18191b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#23252a",
  },
});

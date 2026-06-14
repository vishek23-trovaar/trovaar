import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";

// Linear variants — flat fills, hairline borders, no gradients/glows.
//  primary    — solid blue accent (the one CTA color)
//  white      — light pill, near-black text (high-contrast CTA on canvas)
//  outline    — transparent w/ hairline border (secondary)
//  glass      — solid charcoal chip w/ hairline (secondary on a band)
//  gradient   — kept for back-compat; renders as solid blue (primary)
//  secondary  — bordered charcoal (alias of outline)
//  danger     — solid red
//  ghost      — text-only
type ButtonVariant =
  | "primary"
  | "gradient"
  | "outline"
  | "white"
  | "glass"
  | "secondary"
  | "danger"
  | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  /** Linear default is a 10px rounded rect; set true for a full pill. */
  pill?: boolean;
}

const COLORS: Record<
  ButtonVariant,
  { bg: string; text: string; pressed: string; border: string }
> = {
  primary: { bg: "#3b82f6", text: "#ffffff", pressed: "#2563eb", border: "transparent" },
  gradient: { bg: "#3b82f6", text: "#ffffff", pressed: "#2563eb", border: "transparent" },
  white: { bg: "#f7f8f8", text: "#0b0b0c", pressed: "#e6e8ea", border: "transparent" },
  outline: { bg: "transparent", text: "#f7f8f8", pressed: "#1a1b1f", border: "#34343a" },
  glass: { bg: "#18191b", text: "#f7f8f8", pressed: "#1f2024", border: "#23252a" },
  secondary: { bg: "transparent", text: "#f7f8f8", pressed: "#1a1b1f", border: "#34343a" },
  danger: { bg: "#e5484d", text: "#ffffff", pressed: "#dc2626", border: "transparent" },
  ghost: { bg: "transparent", text: "#8a8f98", pressed: "#1a1b1f", border: "transparent" },
};

const SIZES = {
  sm: { paddingVertical: 9, paddingHorizontal: 16, fontSize: 13 },
  md: { paddingVertical: 13, paddingHorizontal: 22, fontSize: 15 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 },
};

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  fullWidth = true,
  pill = false,
}: ButtonProps) {
  const c = COLORS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const radius = pill ? 999 : 10;
  const hasBorder =
    variant === "outline" || variant === "secondary" || variant === "glass";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? c.pressed : c.bg,
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius,
          opacity: isDisabled ? 0.45 : 1,
        },
        hasBorder && { borderWidth: 1, borderColor: c.border },
        fullWidth && { width: "100%" as const },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: c.text, fontSize: s.fontSize },
              icon ? { marginLeft: 8 } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});

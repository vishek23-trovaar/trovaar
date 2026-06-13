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
import { LinearGradient } from "expo-linear-gradient";
import { gradients, glass } from "../../lib/theme";

// Variants per DESIGN.md:
//  primary  — solid blue pill w/ blue glow (default CTA on light)
//  gradient — blue→indigo gradient pill (hero CTA)
//  outline  — bordered blue pill (secondary on light)
//  white    — white pill w/ blue text (primary CTA on midnight)
//  glass    — translucent pill (secondary on midnight)
//  secondary/danger/ghost — retained for back-compat
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
  /** Pill (999) is the brand default; set false for a 12px rounded rect. */
  pill?: boolean;
}

const COLORS: Record<
  ButtonVariant,
  { bg: string; text: string; pressed: string; border: string }
> = {
  primary: { bg: "#2563eb", text: "#ffffff", pressed: "#1d4ed8", border: "transparent" },
  gradient: { bg: "transparent", text: "#ffffff", pressed: "transparent", border: "transparent" },
  outline: { bg: "transparent", text: "#2563eb", pressed: "#eff6ff", border: "#2563eb" },
  white: { bg: "#ffffff", text: "#2563eb", pressed: "#eff6ff", border: "transparent" },
  glass: { bg: glass.fill, text: "#f8fafc", pressed: glass.fillHover, border: glass.border },
  secondary: { bg: "transparent", text: "#2563eb", pressed: "#eff6ff", border: "#2563eb" },
  danger: { bg: "#ef4444", text: "#ffffff", pressed: "#dc2626", border: "transparent" },
  ghost: { bg: "transparent", text: "#64748b", pressed: "#f1f5f9", border: "transparent" },
};

const SIZES = {
  sm: { paddingVertical: 9, paddingHorizontal: 18, fontSize: 13 },
  md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15 },
  lg: { paddingVertical: 17, paddingHorizontal: 32, fontSize: 16 },
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
  pill = true,
}: ButtonProps) {
  const c = COLORS[variant];
  const s = SIZES[size];
  const isDisabled = disabled || loading;
  const radius = pill ? 999 : 12;
  const hasBorder = variant === "outline" || variant === "secondary" || variant === "glass";

  const inner = (showBg: boolean, pressed: boolean) => (
    <View
      style={[
        styles.base,
        {
          backgroundColor: showBg ? (pressed ? c.pressed : c.bg) : "transparent",
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: radius,
        },
        hasBorder && { borderWidth: 1.5, borderColor: c.border },
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
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        { borderRadius: radius, opacity: isDisabled ? 0.5 : 1 },
        variant === "primary" && styles.brandGlow,
        variant === "gradient" && styles.brandGlow,
        variant === "white" && styles.softShadow,
        fullWidth && { width: "100%" as const },
        style,
        pressed && variant === "gradient" ? { opacity: 0.92 } : null,
      ]}
    >
      {({ pressed }) =>
        variant === "gradient" ? (
          <LinearGradient
            colors={gradients.brand as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: radius }}
          >
            {inner(false, pressed)}
          </LinearGradient>
        ) : (
          inner(true, pressed)
        )
      }
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
    fontWeight: "700",
  },
  brandGlow: {
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  softShadow: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
});

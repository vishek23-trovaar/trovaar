import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
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
}

const COLORS = {
  primary: { bg: "#2563eb", text: "#ffffff", pressed: "#1d4ed8", border: "transparent" },
  secondary: { bg: "transparent", text: "#2563eb", pressed: "#eff6ff", border: "#2563eb" },
  danger: { bg: "#ef4444", text: "#ffffff", pressed: "#dc2626", border: "transparent" },
  ghost: { bg: "transparent", text: "#64748b", pressed: "#f1f5f9", border: "transparent" },
};

const SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13, borderRadius: 8 },
  md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 15, borderRadius: 12 },
  lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17, borderRadius: 14 },
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
}: ButtonProps) {
  const colors = COLORS[variant];
  const sizeConfig = SIZES[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? colors.pressed : colors.bg,
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          borderRadius: sizeConfig.borderRadius,
          opacity: isDisabled ? 0.5 : 1,
        },
        variant === "secondary" && {
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        variant === "primary" && styles.shadow,
        fullWidth && { width: "100%" as const },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.text}
          size={size === "sm" ? "small" : "small"}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: colors.text, fontSize: sizeConfig.fontSize },
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
    fontWeight: "700",
  },
  shadow: {
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
});

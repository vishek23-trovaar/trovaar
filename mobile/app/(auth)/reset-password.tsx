import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!password) {
      e.password = "Password is required";
    } else if (password.length < 8) {
      e.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      e.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    if (!token) {
      setErrors({ general: "Reset token is missing. Please use the link from your email." });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      router.replace({
        pathname: "/(auth)/login",
        params: { successMessage: "Password reset successfully. Please log in." },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (() => {
    if (!password) return null;
    if (password.length < 8) return { label: "Too short", color: "#dc2626" };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    if (score <= 2) return { label: "Weak", color: "#f97316" };
    if (score === 3) return { label: "Good", color: "#2563eb" };
    return { label: "Strong", color: "#16a34a" };
  })();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Animated.ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={36} color={colors.primary} />
          </View>

          {/* Header */}
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Your new password must be different from your previous password.
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={colors.danger}
                />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            {!token && (
              <View style={styles.warningBanner}>
                <Ionicons
                  name="warning-outline"
                  size={18}
                  color="#b45309"
                />
                <Text style={styles.warningBannerText}>
                  No reset token found. Please use the link sent to your email.
                </Text>
              </View>
            )}

            <View>
              <Input
                label="New Password"
                leftIcon="lock-closed-outline"
                placeholder="At least 8 characters"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
                onRightIconPress={() => setShowPassword(!showPassword)}
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.password}
              />
              {passwordStrength && !errors.password && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((i) => {
                      const filled =
                        passwordStrength.label === "Too short"
                          ? 0
                          : passwordStrength.label === "Weak"
                          ? 1
                          : passwordStrength.label === "Good"
                          ? 3
                          : 4;
                      return (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                i <= filled
                                  ? passwordStrength.color
                                  : "#e2e8f0",
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: passwordStrength.color },
                    ]}
                  >
                    {passwordStrength.label}
                  </Text>
                </View>
              )}
            </View>

            <Input
              label="Confirm Password"
              leftIcon="lock-closed-outline"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setErrors((p) => ({ ...p, confirmPassword: undefined }));
              }}
              secureTextEntry={!showConfirmPassword}
              rightIcon={
                showConfirmPassword ? "eye-off-outline" : "eye-outline"
              }
              onRightIconPress={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.confirmPassword}
            />

            <Button
              title="Reset Password"
              onPress={handleSubmit}
              loading={loading}
              disabled={!token}
              size="lg"
              style={styles.submitBtn}
            />

            <Pressable
              style={styles.backToLoginRow}
              onPress={() => router.replace("/(auth)/login")}
            >
              <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </Pressable>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing["4xl"],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["4xl"],
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["3xl"],
    alignSelf: "center",
    ...shadows.md,
  },
  title: {
    ...typography.h1,
    color: colors.secondary,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing["4xl"],
    paddingHorizontal: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.danger,
    fontWeight: "500",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#B45309",
    fontWeight: "500",
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: spacing.smd,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  strengthBars: {
    flexDirection: "row",
    gap: spacing.sm,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    ...typography.caption,
    fontWeight: "600",
    width: 52,
    textAlign: "right",
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  backToLoginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.smd,
    marginTop: spacing["2xl"],
  },
  backToLoginText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});

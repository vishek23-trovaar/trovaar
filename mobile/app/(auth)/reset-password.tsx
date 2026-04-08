import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="key-outline" size={36} color="#2563eb" />
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
                  color="#dc2626"
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
              <Ionicons name="arrow-back-outline" size={16} color="#2563eb" />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  form: {
    gap: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 4,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 4,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#b45309",
    fontWeight: "500",
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    width: 52,
    textAlign: "right",
  },
  submitBtn: {
    marginTop: 8,
  },
  backToLoginRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  backToLoginText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
  },
});

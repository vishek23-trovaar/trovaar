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
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Button, Input } from "@/components/ui";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
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
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="lock-open-outline" size={36} color={colors.primary} />
          </View>

          {/* Header */}
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>

          {submitted ? (
            /* Success state */
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={colors.primary}
                style={styles.successIcon}
              />
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                We sent a password reset link to{" "}
                <Text style={styles.successEmail}>{email}</Text>. Check your
                inbox and follow the instructions.
              </Text>
              <Button
                title="Back to Login"
                onPress={() => router.replace("/(auth)/login")}
                size="lg"
                style={styles.backToLoginBtn}
              />
            </View>
          ) : (
            /* Form state */
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

              <Input
                label="Email"
                leftIcon="mail-outline"
                placeholder="you@example.com"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <Button
                title="Send Reset Link"
                onPress={handleSubmit}
                loading={loading}
                size="lg"
                style={styles.submitBtn}
              />

              <Pressable
                style={styles.backToLoginRow}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back-outline" size={16} color={colors.primary} />
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
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
  successBox: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.secondary,
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  successText: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing["4xl"],
    paddingHorizontal: spacing.md,
  },
  successEmail: {
    color: colors.secondary,
    fontWeight: "600",
  },
  backToLoginBtn: {
    width: "100%",
  },
});

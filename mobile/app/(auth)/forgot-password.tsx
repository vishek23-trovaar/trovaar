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
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconBox}>
            <Ionicons name="lock-open-outline" size={36} color="#2563eb" />
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
                color="#2563eb"
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
                    color="#dc2626"
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
                <Ionicons name="arrow-back-outline" size={16} color="#2563eb" />
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
  successBox: {
    alignItems: "center",
    paddingTop: 8,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  successText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  successEmail: {
    color: "#1e293b",
    fontWeight: "600",
  },
  backToLoginBtn: {
    width: "100%",
  },
});

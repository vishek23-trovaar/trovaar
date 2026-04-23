import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";
import { API_URL, setToken } from "@/lib/api";
import * as AppleAuthentication from "expo-apple-authentication";

export default function LoginScreen() {
  const { login, refreshUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err: unknown) {
      toast.error((err instanceof Error && err.message) ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const res = await fetch(`${API_URL}/api/auth/oauth/apple/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          fullName: credential.fullName,
          email: credential.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Apple sign-in failed");
        return;
      }

      if (data.needsCompletion) {
        // New user — navigate to account completion with the pending token
        router.push({ pathname: "/(auth)/signup", params: { pendingToken: data.pendingToken } });
      } else if (data.token) {
        // Existing user — log them in directly
        await setToken(data.token);
        await refreshUser();
        router.replace("/");
      }
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") return;
      toast.error("Apple Sign-In failed. Please try again.");
    }
  };

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
          {/* Logo */}
          <View style={styles.logoBox}>
            <View style={styles.logoIcon}>
              <Image
                source={require("../../assets/trovaar-logo.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Header */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to Trovaar
          </Text>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              leftIcon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Password"
              leftIcon="lock-closed-outline"
              placeholder="Enter your password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: undefined })); }}
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPassword(!showPassword)}
              error={errors.password}
            />

            <Pressable style={styles.forgotRow} onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Button
              title="Log In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.lg}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    paddingVertical: spacing["4xl"],
  },
  logoBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["3xl"],
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.lg,
    shadowColor: colors.secondary,
    shadowOpacity: 0.3,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.secondary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing["4xl"],
  },
  form: {
    gap: spacing.md,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: spacing.md,
  },
  forgotText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing["3xl"],
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.muted,
  },
  appleButton: {
    width: "100%",
    height: 50,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing["3xl"],
  },
  footerText: {
    fontSize: 14,
    color: colors.muted,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
});

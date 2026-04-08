import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
      Alert.alert("Login Failed", (err instanceof Error && err.message) ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = (provider: string) => {
    Alert.alert("Coming Soon", `${provider} login will be available soon.`);
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
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <Pressable
              style={styles.socialBtn}
              onPress={() => handleSocial("Google")}
            >
              <Ionicons name="logo-google" size={22} color="#0f172a" />
              <Text style={styles.socialText}>Google</Text>
            </Pressable>
            <Pressable
              style={styles.socialBtn}
              onPress={() => handleSocial("Apple")}
            >
              <Ionicons name="logo-apple" size={22} color="#0f172a" />
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          </View>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoBox: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logoIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 36,
  },
  form: {
    gap: 8,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  forgotText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    gap: 8,
  },
  socialText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
  },
  footerLink: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "700",
  },
});

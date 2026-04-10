import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Pressable,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/ui";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

type Step = 1 | 2 | 3;

export default function SignupScreen() {
  const { signup } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<"consumer" | "contractor">("consumer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateStep = (direction: "forward" | "back") => {
    const from = direction === "forward" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    slideAnim.setValue(from);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      animateStep("forward");
    } else if (step === 2) {
      const e: Record<string, string> = {};
      if (!name.trim()) e.name = "Name is required";
      if (!email.trim()) e.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
      if (!phone.trim()) e.phone = "Phone is required";
      setErrors(e);
      if (Object.keys(e).length > 0) return;
      setStep(3);
      animateStep("forward");
    }
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => (s - 1) as Step);
      animateStep("back");
    }
  };

  const handleSignup = async () => {
    const e: Record<string, string> = {};
    if (!password || password.length < 8) e.password = "Password must be at least 8 characters";
    if (!agreeTerms) e.terms = "You must agree to the terms";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setLoading(true);
    try {
      await signup({ email, password, name, role, phone });
      if (role === "consumer") {
        router.replace("/(client)/dashboard");
      } else {
        router.replace("/(contractor)/dashboard");
      }
    } catch (err: unknown) {
      const msg = (err instanceof Error && err.message) ? err.message : 'Something went wrong. Please try again.';
      if (__DEV__) console.error("[Signup] Failed:", msg);
      Alert.alert("Signup Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const renderDots = () => (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map((d) => (
        <View
          key={d}
          style={[
            styles.dot,
            d === step && styles.dotActive,
            d < step && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What brings you here?</Text>
      <Text style={styles.stepSubtitle}>Choose how you want to use Trovaar</Text>

      <View style={styles.roleCards}>
        <Pressable
          style={[styles.roleCard, role === "consumer" && styles.roleCardActive]}
          onPress={() => setRole("consumer")}
        >
          <View style={[styles.roleIconBox, role === "consumer" && styles.roleIconBoxActive]}>
            <Ionicons name="home-outline" size={28} color={role === "consumer" ? colors.white : colors.muted} />
          </View>
          <Text style={[styles.roleTitle, role === "consumer" && styles.roleTitleActive]}>
            I need work done
          </Text>
          <Text style={styles.roleDesc}>
            Post jobs and hire skilled professionals for any task
          </Text>
          {role === "consumer" && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.roleCard, role === "contractor" && styles.roleCardActive]}
          onPress={() => setRole("contractor")}
        >
          <View style={[styles.roleIconBox, role === "contractor" && styles.roleIconBoxActive]}>
            <Ionicons name="construct-outline" size={28} color={role === "contractor" ? colors.white : colors.muted} />
          </View>
          <Text style={[styles.roleTitle, role === "contractor" && styles.roleTitleActive]}>
            I'm a professional
          </Text>
          <Text style={styles.roleDesc}>
            Find jobs, bid on projects, and grow your business
          </Text>
          {role === "contractor" && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            </View>
          )}
        </Pressable>
      </View>

      <Button title="Continue" onPress={goNext} size="lg" />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Personal info</Text>
      <Text style={styles.stepSubtitle}>Tell us a bit about yourself</Text>

      <View style={styles.formGroup}>
        <Input
          label="Full Name"
          leftIcon="person-outline"
          placeholder="John Doe"
          value={name}
          onChangeText={(t) => { setName(t); setErrors((p) => ({ ...p, name: "" })); }}
          autoCapitalize="words"
          error={errors.name}
        />
        <Input
          label="Email"
          leftIcon="mail-outline"
          placeholder="you@example.com"
          value={email}
          onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: "" })); }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        <Input
          label="Phone Number"
          leftIcon="call-outline"
          placeholder="(555) 123-4567"
          value={phone}
          onChangeText={(t) => { setPhone(t); setErrors((p) => ({ ...p, phone: "" })); }}
          keyboardType="phone-pad"
          error={errors.phone}
        />
      </View>

      <Button title="Continue" onPress={goNext} size="lg" />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Secure your account</Text>
      <Text style={styles.stepSubtitle}>Create a strong password</Text>

      <View style={styles.formGroup}>
        <Input
          label="Password"
          leftIcon="lock-closed-outline"
          placeholder="At least 8 characters"
          value={password}
          onChangeText={(t) => { setPassword(t); setErrors((p) => ({ ...p, password: "" })); }}
          secureTextEntry={!showPassword}
          rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
          onRightIconPress={() => setShowPassword(!showPassword)}
          error={errors.password}
        />

        <Pressable
          style={styles.termsRow}
          onPress={() => { setAgreeTerms(!agreeTerms); setErrors((p) => ({ ...p, terms: "" })); }}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
            {agreeTerms && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={styles.termsText}>
            By signing up you agree to our{" "}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {" & "}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}
      </View>

      <Button
        title="Create Account"
        onPress={handleSignup}
        loading={loading}
        size="lg"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.secondary} />
          </Pressable>
          {renderDots()}
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </Animated.View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.footerLink}>Log In</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  dotDone: {
    backgroundColor: colors.primaryLight,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing["3xl"],
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.smd,
    marginBottom: spacing["3xl"],
  },
  roleCards: {
    gap: spacing.xl,
    marginBottom: spacing["4xl"],
  },
  roleCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    padding: spacing["2xl"],
    position: "relative",
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#EFF6FF",
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  roleIconBoxActive: {
    backgroundColor: colors.primary,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  roleTitleActive: {
    color: colors.primary,
  },
  roleDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  checkMark: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.xl,
  },
  formGroup: {
    gap: spacing.sm,
    marginBottom: spacing["3xl"],
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.muted,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: "600",
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: spacing.sm,
    marginLeft: 34,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceDark,
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

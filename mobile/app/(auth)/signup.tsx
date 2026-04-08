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
      console.log("[Signup] Attempting signup for", email, role);
      await signup({ email, password, name, role, phone });
      console.log("[Signup] Success! Navigating to dashboard...");
      if (role === "consumer") {
        router.replace("/(client)/dashboard");
      } else {
        router.replace("/(contractor)/dashboard");
      }
    } catch (err: unknown) {
      const msg = (err instanceof Error && err.message) ? err.message : 'Something went wrong. Please try again.';
      console.error("[Signup] Failed:", msg);
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
            <Ionicons name="home-outline" size={28} color={role === "consumer" ? "#ffffff" : "#64748b"} />
          </View>
          <Text style={[styles.roleTitle, role === "consumer" && styles.roleTitleActive]}>
            I need work done
          </Text>
          <Text style={styles.roleDesc}>
            Post jobs and hire skilled professionals for any task
          </Text>
          {role === "consumer" && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color="#1e40af" />
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.roleCard, role === "contractor" && styles.roleCardActive]}
          onPress={() => setRole("contractor")}
        >
          <View style={[styles.roleIconBox, role === "contractor" && styles.roleIconBoxActive]}>
            <Ionicons name="construct-outline" size={28} color={role === "contractor" ? "#ffffff" : "#64748b"} />
          </View>
          <Text style={[styles.roleTitle, role === "contractor" && styles.roleTitleActive]}>
            I'm a professional
          </Text>
          <Text style={styles.roleDesc}>
            Find jobs, bid on projects, and grow your business
          </Text>
          {role === "contractor" && (
            <View style={styles.checkMark}>
              <Ionicons name="checkmark-circle" size={24} color="#1e40af" />
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
            {agreeTerms && <Ionicons name="checkmark" size={14} color="#ffffff" />}
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
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
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
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#1e40af",
  },
  dotDone: {
    backgroundColor: "#93c5fd",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  stepContent: {
    flex: 1,
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 15,
    color: "#64748b",
    marginTop: 6,
    marginBottom: 28,
  },
  roleCards: {
    gap: 16,
    marginBottom: 32,
  },
  roleCard: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    padding: 20,
    position: "relative",
  },
  roleCardActive: {
    borderColor: "#1e40af",
    backgroundColor: "#eff6ff",
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  roleIconBoxActive: {
    backgroundColor: "#1e40af",
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  roleTitleActive: {
    color: "#1e40af",
  },
  roleDesc: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  checkMark: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  formGroup: {
    gap: 4,
    marginBottom: 28,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
  },
  termsLink: {
    color: "#1e40af",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
    marginLeft: 34,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
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

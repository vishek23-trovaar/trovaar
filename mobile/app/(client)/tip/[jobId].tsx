import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getCategoryIcon } from '../../../lib/theme';


const QUICK_AMOUNTS = [5, 10, 20, 50];

interface JobData {
  id: string;
  title: string;
  contractor_name?: string;
  contractor?: { name: string; avatar?: string };
}

export default function TipScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<JobData | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentAmount, setSentAmount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api<JobData>(`/api/jobs/${jobId}`);
        setJob(data);
      } catch {
        // Non-critical — we still show the tip UI
      } finally {
        setLoadingJob(false);
      }
    })();
  }, [jobId]);

  const contractorName =
    job?.contractor_name ?? job?.contractor?.name ?? "your contractor";

  const effectiveAmount = isCustom
    ? parseFloat(customAmount) || 0
    : selectedAmount ?? 0;

  const canSend = effectiveAmount > 0;

  const handleSelectQuick = (amount: number) => {
    setIsCustom(false);
    setCustomAmount("");
    setSelectedAmount(amount);
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const handleSend = async () => {
    if (!canSend) return;

    const amountCents = Math.round(effectiveAmount * 100);

    setSubmitting(true);
    try {
      await api("/api/stripe/tip", {
        method: "POST",
        body: JSON.stringify({
          jobId,
          amount_cents: amountCents,
          message: message.trim() || undefined,
        }),
      });
      setSentAmount(effectiveAmount);
      setSent(true);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message || "Failed to send tip");
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (sent) {
    return (
      <View style={styles.screen}>
        <View style={styles.celebrationContainer}>
          <View style={styles.celebrationIconWrap}>
            <Ionicons name="checkmark-circle" size={80} color={colors.success} />
          </View>
          <Text style={styles.celebrationTitle}>Tip Sent!</Text>
          <View style={styles.celebrationAmountBadge}>
            <Text style={styles.celebrationAmount}>
              ${sentAmount.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.celebrationSubtitle}>
            Your tip has been sent to {contractorName}. They'll appreciate the
            recognition for their great work!
          </Text>

          <View style={styles.celebrationStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={28} color="#f59e0b" />
            ))}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave a Tip</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contractor Info Card */}
        <View style={styles.contractorCard}>
          {loadingJob ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View style={styles.contractorAvatar}>
                <Text style={styles.contractorAvatarText}>
                  {contractorName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contractorInfo}>
                <Text style={styles.contractorName}>{contractorName}</Text>
                <Text style={styles.contractorTagline}>
                  Great work deserves recognition!
                </Text>
              </View>
              <Ionicons name="heart" size={22} color="#f43f5e" />
            </>
          )}
        </View>

        {/* Quick Amount Chips */}
        <Text style={styles.sectionLabel}>Choose an amount</Text>
        <View style={styles.amountChipsRow}>
          {QUICK_AMOUNTS.map((amount) => {
            const active = !isCustom && selectedAmount === amount;
            return (
              <TouchableOpacity
                key={amount}
                style={[styles.amountChip, active && styles.amountChipActive]}
                onPress={() => handleSelectQuick(amount)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.amountChipText,
                    active && styles.amountChipTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.amountChip, isCustom && styles.amountChipActive]}
            onPress={handleSelectCustom}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.amountChipText,
                isCustom && styles.amountChipTextActive,
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {/* Custom Amount Input */}
        {isCustom && (
          <View style={styles.customAmountWrap}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              value={customAmount}
              onChangeText={(v) => {
                // Allow only valid decimal number input
                const clean = v.replace(/[^0-9.]/g, "");
                const parts = clean.split(".");
                if (parts.length <= 2) setCustomAmount(clean);
              }}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        )}

        {/* Message */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Add a note{" "}
          <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Add a note..."
          placeholderTextColor="#94a3b8"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={200}
        />

        {/* Amount preview */}
        {canSend && (
          <View style={styles.amountPreview}>
            <Text style={styles.amountPreviewLabel}>You're sending</Text>
            <Text style={styles.amountPreviewValue}>
              ${effectiveAmount.toFixed(2)}
            </Text>
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!canSend || submitting) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="gift-outline" size={22} color="#ffffff" />
              <Text style={styles.sendBtnText}>
                {canSend
                  ? `Send $${effectiveAmount.toFixed(2)} Tip`
                  : "Send Tip"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },

  // Content
  content: {
    padding: 20,
    paddingBottom: 48,
  },

  // Contractor card
  contractorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 28,
    minHeight: 72,
    gap: 14,
  },
  contractorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  contractorAvatarText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  contractorInfo: {
    flex: 1,
  },
  contractorName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 3,
  },
  contractorTagline: {
    fontSize: 13,
    color: colors.muted,
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.muted,
  },

  // Amount chips
  amountChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  amountChip: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 64,
    alignItems: "center",
  },
  amountChipActive: {
    borderColor: colors.primary,
    backgroundColor: "#eff6ff",
  },
  amountChipText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.muted,
  },
  amountChipTextActive: {
    color: colors.primary,
  },

  // Custom amount
  customAmountWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 12,
  },
  dollarSign: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginRight: 6,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: 10,
  },

  // Message
  messageInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 90,
    textAlignVertical: "top",
  },

  // Amount preview
  amountPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginTop: 16,
  },
  amountPreviewLabel: {
    fontSize: 15,
    color: "#15803d",
    fontWeight: "500",
  },
  amountPreviewValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.success,
  },

  // Send button
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: radius.lg,
    gap: 8,
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },

  // Celebration / Success
  celebrationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  celebrationIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  celebrationAmountBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
  },
  celebrationAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  celebrationStars: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 36,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 56,
    borderRadius: radius.lg,
  },
  doneBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});

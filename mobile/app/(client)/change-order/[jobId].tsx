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
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from '../../../lib/theme';


type Urgency = "normal" | "urgent";

interface JobData {
  id: string;
  title: string;
  description?: string;
  category?: string;
  contractor_name?: string;
  contractor?: { name: string };
  status?: string;
}

export default function ChangeOrderScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<JobData | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api<JobData>(`/api/jobs/${jobId}`);
        setJob(data);
      } catch {
        // Continue without job data
      } finally {
        setLoadingJob(false);
      }
    })();
  }, [jobId]);

  const contractorName =
    job?.contractor_name ?? job?.contractor?.name ?? "your contractor";

  const canSubmit = description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("Required", "Please describe the additional work needed.");
      return;
    }

    const parsedCost = estimatedCost.trim()
      ? parseFloat(estimatedCost)
      : undefined;
    if (estimatedCost.trim() && (isNaN(parsedCost!) || parsedCost! < 0)) {
      Alert.alert("Invalid amount", "Please enter a valid estimated cost.");
      return;
    }

    const payload = {
      description: description.trim(),
      estimated_cost: parsedCost,
      urgency,
    };

    setSubmitting(true);
    try {
      // Try primary endpoint first, fall back to singular
      try {
        await api(`/api/jobs/${jobId}/change-orders`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (primaryErr: unknown) {
        const err = primaryErr as { status?: number };
        if (err?.status === 404) {
          await api(`/api/jobs/${jobId}/change-order`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          throw primaryErr;
        }
      }

      Alert.alert(
        "Request Sent",
        "Change order sent to contractor. They'll respond with a quote.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message || "Failed to submit change order");
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Request Change Order</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primaryDark}
            style={{ marginTop: 1 }}
          />
          <Text style={styles.infoBoxText}>
            Need additional work done? Request a change order and your
            contractor will provide a new quote.
          </Text>
        </View>

        {/* Current Job Summary */}
        <View style={styles.jobSummaryCard}>
          {loadingJob ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : job ? (
            <>
              <Text style={styles.jobSummaryLabel}>Current Job</Text>
              <Text style={styles.jobSummaryTitle}>{job.title}</Text>
              {job.description ? (
                <Text style={styles.jobSummaryDesc} numberOfLines={2}>
                  {job.description}
                </Text>
              ) : null}
              <View style={styles.jobMetaRow}>
                <Ionicons
                  name="person-outline"
                  size={14}
                  color={colors.muted}
                />
                <Text style={styles.jobMetaText}>{contractorName}</Text>
                {job.status && (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.jobMetaText}>{job.status}</Text>
                  </>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>Job #{jobId}</Text>
          )}
        </View>

        {/* Description */}
        <Text style={styles.fieldLabel}>
          Description of additional work{" "}
          <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.textArea, !canSubmit && description.length > 0 && styles.textAreaError]}
          placeholder="Describe the additional work you'd like done..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        {/* Estimated Cost */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
          Estimated additional cost{" "}
          <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <View style={styles.costInputWrap}>
          <Text style={styles.dollarPrefix}>$</Text>
          <TextInput
            style={styles.costInput}
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
            value={estimatedCost}
            onChangeText={(v) => {
              const clean = v.replace(/[^0-9.]/g, "");
              const parts = clean.split(".");
              if (parts.length <= 2) setEstimatedCost(clean);
            }}
            keyboardType="decimal-pad"
          />
        </View>
        <Text style={styles.fieldHint}>
          This is optional — the contractor will provide the official quote.
        </Text>

        {/* Urgency */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Urgency</Text>
        <View style={styles.urgencyRow}>
          {(["normal", "urgent"] as Urgency[]).map((opt) => {
            const active = urgency === opt;
            const isUrgent = opt === "urgent";
            return (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.urgencyChip,
                  active && (isUrgent ? styles.urgencyChipUrgentActive : styles.urgencyChipNormalActive),
                ]}
                onPress={() => setUrgency(opt)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isUrgent ? "flash" : "time-outline"}
                  size={18}
                  color={
                    active
                      ? isUrgent
                        ? "#d97706"
                        : colors.primary
                      : colors.muted
                  }
                />
                <Text
                  style={[
                    styles.urgencyChipText,
                    active && (isUrgent ? styles.urgentText : styles.normalText),
                  ]}
                >
                  {opt === "normal" ? "Normal" : "Urgent"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!canSubmit || submitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#ffffff" />
              <Text style={styles.submitBtnText}>Submit Request</Text>
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

  // Info box
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#DBEAFE",
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: "#93C5FD",
    gap: 10,
    marginBottom: 20,
  },
  infoBoxText: {
    fontSize: 14,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 20,
  },

  // Job summary card
  jobSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    minHeight: 60,
    justifyContent: "center",
  },
  jobSummaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  jobSummaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  jobSummaryDesc: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 8,
  },
  jobMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  jobMetaText: {
    fontSize: 13,
    color: colors.muted,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.muted,
  },
  mutedText: {
    fontSize: 14,
    color: colors.muted,
  },

  // Field labels
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  requiredStar: {
    color: colors.danger,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "400",
    color: colors.muted,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },

  // Text area
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    minHeight: 130,
    textAlignVertical: "top",
  },
  textAreaError: {
    borderColor: colors.danger,
  },

  // Cost input
  costInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  dollarPrefix: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginRight: 6,
  },
  costInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: 14,
  },

  // Urgency chips
  urgencyRow: {
    flexDirection: "row",
    gap: 12,
  },
  urgencyChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 7,
  },
  urgencyChipNormalActive: {
    borderColor: colors.primary,
    backgroundColor: "#eff6ff",
  },
  urgencyChipUrgentActive: {
    borderColor: "#d97706",
    backgroundColor: "#fffbeb",
  },
  urgencyChipText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.muted,
  },
  normalText: {
    color: colors.primary,
  },
  urgentText: {
    color: "#d97706",
  },

  // Submit
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: radius.lg,
    gap: 8,
    marginTop: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});

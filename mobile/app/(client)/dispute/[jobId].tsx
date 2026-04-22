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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getCategoryIcon } from '../../../lib/theme';


const DISPUTE_REASONS = [
  { value: "work_not_completed", label: "Work not completed as agreed" },
  { value: "contractor_no_show", label: "Contractor no-show" },
  { value: "quality_unsatisfactory", label: "Quality of work unsatisfactory" },
  { value: "billing_error", label: "Overcharged / billing error" },
  { value: "safety_concern", label: "Safety concern" },
  { value: "other", label: "Other" },
];

interface JobData {
  id: string;
  title: string;
  contractor_name?: string;
  contractor?: { name: string };
  amount_paid?: number;
  total?: number;
  price?: number;
}

export default function DisputeScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  const [job, setJob] = useState<JobData | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api<JobData>(`/api/jobs/${jobId}`);
        setJob(data);
      } catch (err: unknown) {
        setJobError((err as Error).message || "Failed to load job details");
      } finally {
        setLoadingJob(false);
      }
    })();
  }, [jobId]);

  const contractorName =
    job?.contractor_name ?? job?.contractor?.name ?? "Contractor";
  const amountPaid = job?.amount_paid ?? job?.total ?? job?.price;

  const descriptionValid = description.trim().length >= 20;
  const canSubmit = selectedReason !== "" && descriptionValid;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!selectedReason) {
        Alert.alert("Required", "Please select a reason for your dispute.");
      } else if (!descriptionValid) {
        Alert.alert(
          "Description too short",
          "Please describe what happened in at least 20 characters."
        );
      }
      return;
    }

    setSubmitting(true);
    try {
      await api("/api/disputes", {
        method: "POST",
        body: JSON.stringify({
          jobId,
          reason: selectedReason,
          description: description.trim(),
        }),
      });
      setSubmitted(true);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message || "Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (submitted) {
    return (
      <View style={styles.screen}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <Ionicons name="shield-checkmark" size={56} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Dispute Filed</Text>
          <Text style={styles.successSubtitle}>
            We'll review your dispute within 24 hours and reach out via email
            with next steps.
          </Text>
          <TouchableOpacity
            style={styles.okButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>File a Dispute</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Job Summary */}
        <View style={styles.jobSummaryCard}>
          {loadingJob ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : jobError ? (
            <Text style={styles.errorText}>{jobError}</Text>
          ) : job ? (
            <>
              <Text style={styles.jobSummaryLabel}>Job</Text>
              <Text style={styles.jobSummaryTitle}>{job.title}</Text>
              <View style={styles.jobSummaryRow}>
                <View style={styles.jobSummaryItem}>
                  <Ionicons
                    name="person-outline"
                    size={15}
                    color={colors.muted}
                  />
                  <Text style={styles.jobSummaryMeta}>{contractorName}</Text>
                </View>
                {amountPaid != null && (
                  <View style={styles.jobSummaryItem}>
                    <Ionicons
                      name="card-outline"
                      size={15}
                      color={colors.muted}
                    />
                    <Text style={styles.jobSummaryMeta}>
                      ${amountPaid.toFixed(2)} paid
                    </Text>
                  </View>
                )}
              </View>
            </>
          ) : null}
        </View>

        {/* Reason Picker */}
        <Text style={styles.sectionLabel}>Reason for dispute *</Text>
        <View style={styles.reasonList}>
          {DISPUTE_REASONS.map((reason) => {
            const selected = selectedReason === reason.value;
            return (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonRow,
                  selected && styles.reasonRowSelected,
                ]}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selected && styles.radioOuterSelected,
                  ]}
                >
                  {selected && <View style={styles.radioInner} />}
                </View>
                <Text
                  style={[
                    styles.reasonLabel,
                    selected && styles.reasonLabelSelected,
                  ]}
                >
                  {reason.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>Description *</Text>
        <TextInput
          style={[
            styles.textArea,
            description.length > 0 &&
              !descriptionValid &&
              styles.textAreaError,
          ]}
          placeholder="Describe what happened..."
          placeholderTextColor="#94a3b8"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <View style={styles.charCountRow}>
          {description.length > 0 && !descriptionValid && (
            <Text style={styles.charCountError}>
              Minimum 20 characters ({description.trim().length}/20)
            </Text>
          )}
          {descriptionValid && (
            <Text style={styles.charCountOk}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />{" "}
              Looks good
            </Text>
          )}
        </View>

        {/* Satisfaction Guarantee Info Box */}
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primaryDark}
            style={{ marginTop: 1 }}
          />
          <Text style={styles.infoBoxText}>
            Jobs under $1,000 completed in the last 48 hours may be eligible
            for our satisfaction guarantee.
          </Text>
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
              <Ionicons name="flag-outline" size={20} color="#ffffff" />
              <Text style={styles.submitBtnText}>Submit Dispute</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
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

  // Job Summary
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
    marginBottom: 8,
  },
  jobSummaryRow: {
    flexDirection: "row",
    gap: 16,
  },
  jobSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  jobSummaryMeta: {
    fontSize: 14,
    color: colors.muted,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },

  // Radio reasons
  reasonList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    overflow: "hidden",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  reasonRowSelected: {
    backgroundColor: "#eff6ff",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonLabel: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  reasonLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
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
    minHeight: 120,
    textAlignVertical: "top",
  },
  textAreaError: {
    borderColor: colors.danger,
  },
  charCountRow: {
    minHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  charCountError: {
    fontSize: 12,
    color: colors.danger,
  },
  charCountOk: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
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
    marginBottom: 28,
  },
  infoBoxText: {
    fontSize: 14,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 20,
  },

  // Submit button
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger,
    paddingVertical: 17,
    borderRadius: radius.lg,
    gap: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },

  // Success screen
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },
  okButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: radius.lg,
  },
  okButtonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});

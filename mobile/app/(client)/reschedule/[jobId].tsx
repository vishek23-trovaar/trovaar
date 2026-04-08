import { useState, useEffect, useRef } from "react";
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

const COLORS = {
  primary: "#2563eb",
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  danger: "#dc2626",
};

const TIME_PREFERENCES = [
  {
    value: "morning",
    label: "Morning",
    sublabel: "8am – 12pm",
    icon: "sunny-outline" as const,
  },
  {
    value: "afternoon",
    label: "Afternoon",
    sublabel: "12pm – 5pm",
    icon: "partly-sunny-outline" as const,
  },
  {
    value: "evening",
    label: "Evening",
    sublabel: "5pm – 8pm",
    icon: "moon-outline" as const,
  },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function buildNext30Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateDisplay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatReadableDate(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function parseScheduledDate(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return null;
  }
}

interface JobData {
  id: string;
  title: string;
  scheduled_date?: string;
  scheduled_at?: string;
  contractor_name?: string;
  contractor?: { name: string };
}

export default function RescheduleScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const dateScrollRef = useRef<ScrollView>(null);

  const [job, setJob] = useState<JobData | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timePreference, setTimePreference] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const next30 = buildNext30Days();

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

  const currentScheduledDate =
    parseScheduledDate(job?.scheduled_date ?? job?.scheduled_at);

  const canConfirm = selectedDate !== null && timePreference !== "";

  const handleConfirm = async () => {
    if (!canConfirm) {
      if (!selectedDate) {
        Alert.alert("Required", "Please select a date.");
      } else if (!timePreference) {
        Alert.alert("Required", "Please select a time preference.");
      }
      return;
    }

    const scheduledDateStr = formatDateDisplay(selectedDate);
    const payload = {
      scheduled_date: scheduledDateStr,
      time_preference: timePreference,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      // Try PUT /reschedule first, fall back to PATCH /jobs/[jobId]
      try {
        await api(`/api/jobs/${jobId}/reschedule`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch (primaryErr: unknown) {
        const err = primaryErr as { status?: number };
        if (err?.status === 404 || err?.status === 405) {
          await api(`/api/jobs/${jobId}`, {
            method: "PATCH",
            body: JSON.stringify({ scheduled_date: scheduledDateStr }),
          });
        } else {
          throw primaryErr;
        }
      }

      Alert.alert(
        "Reschedule Confirmed",
        `Job rescheduled to ${formatReadableDate(selectedDate)}, ${
          TIME_PREFERENCES.find((t) => t.value === timePreference)?.label ?? ""
        }.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      Alert.alert(
        "Error",
        (err as Error).message || "Failed to reschedule job"
      );
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
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Job</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Current Date */}
        {loadingJob ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading job details...</Text>
          </View>
        ) : (
          <View style={styles.currentDateCard}>
            <View style={styles.currentDateIcon}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentDateLabel}>Currently scheduled</Text>
              <Text style={styles.currentDateValue}>
                {currentScheduledDate ?? "Not yet scheduled"}
              </Text>
              {job && (
                <Text style={styles.currentDateJob} numberOfLines={1}>
                  {job.title}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Date Chips — horizontal scroll */}
        <Text style={styles.sectionLabel}>Select a new date</Text>
        <ScrollView
          ref={dateScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipsContainer}
        >
          {next30.map((date, idx) => {
            const isSelected =
              selectedDate !== null &&
              formatDateDisplay(date) === formatDateDisplay(selectedDate);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dateChip,
                  isSelected && styles.dateChipSelected,
                  isWeekend && !isSelected && styles.dateChipWeekend,
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    isSelected && styles.dateChipTextSelected,
                    isWeekend && !isSelected && styles.dateChipDayWeekend,
                  ]}
                >
                  {DAY_NAMES[date.getDay()]}
                </Text>
                <Text
                  style={[
                    styles.dateChipNum,
                    isSelected && styles.dateChipTextSelected,
                  ]}
                >
                  {date.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dateChipMonth,
                    isSelected && styles.dateChipTextSelected,
                  ]}
                >
                  {MONTH_NAMES[date.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Date confirmation */}
        {selectedDate && (
          <View style={styles.selectedDateBanner}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={COLORS.success}
            />
            <Text style={styles.selectedDateBannerText}>
              {formatReadableDate(selectedDate)}
            </Text>
          </View>
        )}

        {/* Time Preference */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Time preference
        </Text>
        <View style={styles.timePrefsRow}>
          {TIME_PREFERENCES.map((pref) => {
            const active = timePreference === pref.value;
            return (
              <TouchableOpacity
                key={pref.value}
                style={[
                  styles.timePrefChip,
                  active && styles.timePrefChipActive,
                ]}
                onPress={() => setTimePreference(pref.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={pref.icon}
                  size={22}
                  color={active ? COLORS.primary : COLORS.muted}
                />
                <Text
                  style={[
                    styles.timePrefLabel,
                    active && styles.timePrefLabelActive,
                  ]}
                >
                  {pref.label}
                </Text>
                <Text
                  style={[
                    styles.timePrefSub,
                    active && styles.timePrefSubActive,
                  ]}
                >
                  {pref.sublabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notes */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Notes for contractor{" "}
          <Text style={styles.optionalTag}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Any notes for the contractor?"
          placeholderTextColor="#94a3b8"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300}
        />

        {/* Confirm Button */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (!canConfirm || submitting) && styles.confirmBtnDisabled,
          ]}
          onPress={handleConfirm}
          disabled={!canConfirm || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={20} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Confirm Reschedule</Text>
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
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
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

  // Loading
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.muted,
  },

  // Current date card
  currentDateCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    gap: 12,
  },
  currentDateIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  currentDateLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  currentDateValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  currentDateJob: {
    fontSize: 13,
    color: COLORS.muted,
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
  },
  optionalTag: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.muted,
  },

  // Date chips
  dateChipsContainer: {
    gap: 8,
    paddingBottom: 4,
    paddingRight: 16,
  },
  dateChip: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 2,
  },
  dateChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  dateChipWeekend: {
    borderColor: "#e2e8f0",
    backgroundColor: "#fafafa",
  },
  dateChipDay: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateChipNum: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 24,
  },
  dateChipMonth: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.muted,
  },
  dateChipTextSelected: {
    color: "#ffffff",
  },
  dateChipDayWeekend: {
    color: "#94a3b8",
  },

  // Selected date banner
  selectedDateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 2,
  },
  selectedDateBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.success,
  },

  // Time preferences
  timePrefsRow: {
    flexDirection: "row",
    gap: 10,
  },
  timePrefChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  timePrefChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: "#eff6ff",
  },
  timePrefLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
  },
  timePrefLabelActive: {
    color: COLORS.primary,
  },
  timePrefSub: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
  },
  timePrefSubActive: {
    color: "#93c5fd",
  },

  // Notes
  notesInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: "top",
  },

  // Confirm button
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 17,
    borderRadius: 14,
    gap: 8,
    marginTop: 28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
});

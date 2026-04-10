import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from '../../../lib/theme';


const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

interface JobInfo {
  id: string;
  title: string;
  category: string;
}

interface BidInfo {
  contractor_id: string;
  contractor_name: string;
  contractor_rating: number;
  status: string;
}

export default function ReviewScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobInfo | null>(null);
  const [contractor, setContractor] = useState<BidInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [jobRes, bidRes] = await Promise.all([
        api<Record<string, unknown>>(`/api/jobs/${jobId}`),
        api<{ bids: BidInfo[] }>(`/api/jobs/${jobId}/bids`),
      ]);
      const jobData = (jobRes.data.job || jobRes.data) as JobInfo;
      setJob(jobData);
      const accepted = (bidRes.data.bids || []).find((b) => b.status === "accepted");
      setContractor(accepted || null);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please tap a star to rate your contractor.");
      return;
    }
    if (!contractor) {
      Alert.alert("Error", "Could not find contractor info.");
      return;
    }
    setSubmitting(true);
    try {
      await api(`/api/jobs/${jobId}/review`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment,
          contractor_id: contractor.contractor_id,
        }),
      });
      setSubmitted(true);
    } catch {
      // Try fallback endpoint
      try {
        await api("/api/reviews", {
          method: "POST",
          body: JSON.stringify({
            job_id: jobId,
            contractor_id: contractor.contractor_id,
            rating,
            comment,
          }),
        });
        setSubmitted(true);
      } catch (err: unknown) {
        Alert.alert("Error", (err as Error).message);
      }
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <View style={styles.successContainer}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successSubtitle}>
            Your review has been submitted successfully. Your feedback helps other homeowners find great contractors.
          </Text>
          <View style={styles.successStars}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= rating ? "star" : "star-outline"}
                size={28}
                color={i <= rating ? "#f59e0b" : "#d1d5db"}
              />
            ))}
          </View>
          {comment ? (
            <View style={styles.successCommentCard}>
              <Text style={styles.successCommentLabel}>Your review:</Text>
              <Text style={styles.successCommentText}>"{comment}"</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/(client)/dashboard" as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Rate Your Experience</Text>
          <Text style={styles.headerSubtitle}>
            How was your experience with {contractor?.contractor_name || "your contractor"}?
          </Text>
        </View>

        {/* Job Info */}
        {job && (
          <View style={styles.jobInfoCard}>
            <Ionicons name="briefcase-outline" size={16} color={colors.muted} />
            <Text style={styles.jobInfoText} numberOfLines={1}>{job.title}</Text>
          </View>
        )}

        {/* Contractor Card */}
        {contractor && (
          <View style={styles.contractorCard}>
            <View style={styles.contractorAvatar}>
              <Text style={styles.contractorAvatarText}>
                {(contractor.contractor_name || "C").charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.contractorName}>{contractor.contractor_name || "Contractor"}</Text>
            {contractor.contractor_rating > 0 && (
              <View style={styles.existingRating}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.existingRatingText}>
                  {contractor.contractor_rating.toFixed(1)} average rating
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Tap to Rate</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setRating(i)}
                activeOpacity={0.7}
                style={styles.starTouchable}
              >
                <Ionicons
                  name={i <= rating ? "star" : "star-outline"}
                  size={44}
                  color={i <= rating ? "#f59e0b" : "#d1d5db"}
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingText}>{RATING_LABELS[rating]}</Text>
          )}
        </View>

        {/* Comment */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>Comments (optional)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us about your experience..."
            placeholderTextColor={colors.muted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Submit button */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || rating === 0) && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={colors.white} />
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface, paddingHorizontal: 24 },
  scrollContent: { padding: 20 },

  // Header
  headerSection: { alignItems: "center", marginBottom: 24, paddingTop: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 6 },
  headerSubtitle: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },

  // Job info
  jobInfoCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  jobInfoText: { fontSize: 14, color: colors.text, fontWeight: "500", flex: 1 },

  // Contractor
  contractorCard: {
    alignItems: "center", backgroundColor: colors.white, borderRadius: radius.xl, padding: 24, marginBottom: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  contractorAvatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: "#DBEAFE",
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  contractorAvatarText: { fontSize: 26, fontWeight: "700", color: colors.primary },
  contractorName: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 },
  existingRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  existingRatingText: { fontSize: 13, color: colors.muted },

  // Rating
  ratingSection: { alignItems: "center", marginBottom: 28 },
  ratingLabel: { fontSize: 14, fontWeight: "600", color: colors.muted, marginBottom: 16 },
  starsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  starTouchable: { padding: 4 },
  ratingText: { fontSize: 16, fontWeight: "700", color: colors.warning, marginTop: 4 },

  // Comment
  commentSection: { marginBottom: 20 },
  commentLabel: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10 },
  commentInput: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, fontSize: 15, color: colors.text,
    minHeight: 120, lineHeight: 22,
  },
  charCount: { fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 6 },

  // Submit
  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 34, paddingTop: 12,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, paddingVertical: 18, borderRadius: radius.lg, gap: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitBtnText: { color: colors.white, fontSize: 17, fontWeight: "800" },

  // Success state
  successContainer: { alignItems: "center", paddingHorizontal: 16 },
  successCircle: { marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: "800", color: colors.success, marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22, marginBottom: 20 },
  successStars: { flexDirection: "row", gap: 6, marginBottom: 20 },
  successCommentCard: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, width: "100%",
    marginBottom: 28, borderWidth: 1, borderColor: colors.border,
  },
  successCommentLabel: { fontSize: 12, color: colors.muted, marginBottom: 6, fontWeight: "500" },
  successCommentText: { fontSize: 15, color: colors.text, fontStyle: "italic", lineHeight: 22 },
  doneBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 16, borderRadius: radius.lg,
  },
  doneBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});

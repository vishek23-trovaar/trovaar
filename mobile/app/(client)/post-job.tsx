import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import * as ImagePicker from "expo-image-picker";
import VoiceJobRecorder from "@/components/VoiceJobRecorder";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOTAL_STEPS = 3;

const COLORS = {
  primary: "#1e40af",
  primaryLight: "#3b82f6",
  secondary: "#0f172a",
  muted: "#64748b",
  surface: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
  success: "#059669",
  successLight: "#ecfdf5",
};

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing", emoji: "\u{1F527}" },
  { value: "electrical", label: "Electrical", emoji: "\u26A1" },
  { value: "hvac", label: "HVAC", emoji: "\u{1F321}\uFE0F" },
  { value: "roofing", label: "Roofing", emoji: "\u{1F3E0}" },
  { value: "landscaping", label: "Landscaping", emoji: "\u{1F33F}" },
  { value: "painting", label: "Painting", emoji: "\u{1F3A8}" },
  { value: "cleaning", label: "Cleaning", emoji: "\u{1F9F9}" },
  { value: "moving", label: "Moving", emoji: "\u{1F4E6}" },
  { value: "auto_repair", label: "Auto Repair", emoji: "\u{1F697}" },
  { value: "general_handyman", label: "Handyman", emoji: "\u{1F528}" },
  { value: "other", label: "Other", emoji: "\u2795" },
];

const URGENCY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    icon: "time-outline" as const,
    color: "#64748b",
    desc: "Flexible timeline, no rush",
  },
  {
    value: "medium",
    label: "Medium",
    icon: "calendar-outline" as const,
    color: "#2563eb",
    desc: "Within the next week",
  },
  {
    value: "high",
    label: "High",
    icon: "alert-circle-outline" as const,
    color: "#d97706",
    desc: "Need it done in 1-2 days",
  },
  {
    value: "emergency",
    label: "Emergency",
    icon: "warning-outline" as const,
    color: "#dc2626",
    desc: "Need help right now!",
  },
];

export default function PostJobScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(
    new Animated.Value(1 / TOTAL_STEPS)
  ).current;

  // Form state
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("");

  // Media state
  const [mediaUris, setMediaUris] = useState<string[]>([]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const animateTransition = (nextStep: number) => {
    const direction = nextStep > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -direction * SCREEN_WIDTH,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(nextStep);
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) animateTransition(step + 1);
  };

  const goBack = () => {
    if (step > 1) animateTransition(step - 1);
    else router.back();
  };

  const goToStep = (s: number) => {
    animateTransition(s);
  };

  const pickMedia = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setMediaUris((prev) => [...prev, ...uris]);
    }
  };

  const takePhoto = async () => {
    const { status } =
      await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow camera access."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeMedia = (idx: number) => {
    setMediaUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAiParse = async () => {
    if (mediaUris.length === 0) {
      Alert.alert("Upload Required", "Please upload at least one photo or video.");
      return;
    }
    setAiParsing(true);
    try {
      // Build form data with media
      const formData = new FormData();
      mediaUris.forEach((uri, i) => {
        const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
        const type = ext === "mp4" || ext === "mov" ? "video/mp4" : `image/${ext}`;
        formData.append("media", {
          uri,
          name: `upload_${i}.${ext}`,
          type,
        } as any);
      });

      const { data } = await api<{
        title: string;
        description: string;
        category: string;
        urgency: string;
      }>("/api/ai/parse-job", {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Populate AI-detected fields
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.urgency) setUrgency(data.urgency);
      setAiParsed(true);

      // Move to step 2 - AI results
      animateTransition(2);
    } catch (err: unknown) {
      // If AI parsing fails, still allow manual entry
      Alert.alert(
        "AI Analysis",
        "Could not auto-detect job details. You can fill them in manually.",
        [
          {
            text: "Continue Manually",
            onPress: () => animateTransition(2),
          },
        ]
      );
    }
    setAiParsing(false);
  };

  const handleVoiceComplete = (job: {
    title: string;
    description: string;
    category: string;
    urgency: string;
  }) => {
    setTitle(job.title);
    setDescription(job.description);
    setCategory(job.category);
    setUrgency(job.urgency);
    setAiParsed(true);
    setShowVoiceRecorder(false);
    animateTransition(2);
  };

  const handlePost = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a job title");
      goToStep(2);
      return;
    }
    if (!category) {
      Alert.alert("Error", "Please select a category");
      goToStep(2);
      return;
    }
    setLoading(true);
    try {
      await api("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category,
          location,
          urgency: urgency || "medium",
          photos: mediaUris.length > 0 ? JSON.stringify(mediaUris) : undefined,
        }),
      });
      Alert.alert("Success", "Your job has been posted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = () => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat ? `${cat.emoji} ${cat.label}` : "Not set";
  };

  const getUrgencyLabel = () => {
    return (
      URGENCY_OPTIONS.find((u) => u.value === urgency)?.label || "Not set"
    );
  };

  if (showVoiceRecorder) {
    return (
      <VoiceJobRecorder
        onComplete={handleVoiceComplete}
        onCancel={() => setShowVoiceRecorder(false)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.stepIndicator}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        {/* Step 1: Upload Photo/Video */}
        {step === 1 && (
          <ScrollView
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Show us the issue</Text>
            <Text style={styles.stepSubtitle}>
              Upload a photo or video and our AI will auto-detect what you
              need
            </Text>

            {/* Voice option */}
            <TouchableOpacity
              style={styles.voiceCard}
              onPress={() => setShowVoiceRecorder(true)}
              activeOpacity={0.85}
            >
              <View style={styles.voiceIcon}>
                <Ionicons name="mic" size={28} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.voiceTitle}>
                  {"\uD83C\uDF99\uFE0F"} Tap & Talk
                </Text>
                <Text style={styles.voiceSubtitle}>
                  Just say what you need -- AI does the rest
                </Text>
              </View>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            </TouchableOpacity>

            {/* Media upload area */}
            <View style={styles.uploadSection}>
              {mediaUris.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
                >
                  {mediaUris.map((uri, i) => (
                    <View key={i} style={styles.mediaThumbWrap}>
                      <Image
                        source={{ uri }}
                        style={styles.mediaThumb}
                      />
                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() => removeMedia(i)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={22}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addMoreBtn}
                    onPress={pickMedia}
                  >
                    <Ionicons
                      name="add"
                      size={28}
                      color={COLORS.muted}
                    />
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={40}
                      color={COLORS.primaryLight}
                    />
                  </View>
                  <Text style={styles.uploadTitle}>
                    Upload photos or video
                  </Text>
                  <Text style={styles.uploadSubtitle}>
                    AI will detect the category, describe the issue, and
                    suggest urgency
                  </Text>
                </View>
              )}

              <View style={styles.uploadBtnRow}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={pickMedia}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="images-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.uploadBtnText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={takePhoto}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* AI Analyze button */}
            <TouchableOpacity
              style={[
                styles.aiAnalyzeBtn,
                mediaUris.length === 0 && { opacity: 0.5 },
                aiParsing && { opacity: 0.7 },
              ]}
              onPress={handleAiParse}
              disabled={mediaUris.length === 0 || aiParsing}
              activeOpacity={0.8}
            >
              {aiParsing ? (
                <>
                  <ActivityIndicator color={COLORS.white} />
                  <Text style={styles.aiAnalyzeBtnText}>
                    AI is analyzing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="sparkles"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.aiAnalyzeBtnText}>
                    Analyze with AI
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Skip option */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => animateTransition(2)}
              activeOpacity={0.7}
            >
              <Text style={styles.skipBtnText}>
                Skip -- fill in manually
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step 2: AI Analysis Results / Edit Fields */}
        {step === 2 && (
          <ScrollView
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {aiParsed && (
              <View style={styles.aiDetectedBanner}>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color="#7c3aed"
                />
                <Text style={styles.aiDetectedText}>
                  AI auto-detected these details. Edit as needed.
                </Text>
              </View>
            )}

            <Text style={styles.stepTitle}>Job Details</Text>
            <Text style={styles.stepSubtitle}>
              {aiParsed
                ? "Review and adjust the AI-detected fields"
                : "Describe what you need help with"}
            </Text>

            {/* Category dropdown */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    category === cat.value &&
                      styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryChipEmoji}>
                    {cat.emoji}
                  </Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat.value &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Fix leaky kitchen faucet"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the work needed in detail..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Urgency</Text>
            <View style={styles.urgencyRow}>
              {URGENCY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.urgencyChip,
                    urgency === opt.value && {
                      borderColor: opt.color,
                      backgroundColor: opt.color + "12",
                    },
                  ]}
                  onPress={() => setUrgency(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={opt.icon}
                    size={16}
                    color={
                      urgency === opt.value ? opt.color : COLORS.muted
                    }
                  />
                  <Text
                    style={[
                      styles.urgencyChipText,
                      urgency === opt.value && {
                        color: opt.color,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
              <Text style={styles.nextBtnText}>Review & Submit</Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Step 3: Review + Location + Submit */}
        {step === 3 && (
          <ScrollView
            contentContainerStyle={styles.stepContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.stepTitle}>Review & Post</Text>
            <Text style={styles.stepSubtitle}>
              Make sure everything looks good
            </Text>

            {/* Photos preview */}
            {mediaUris.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
                contentContainerStyle={{ gap: 8 }}
              >
                {mediaUris.map((uri, i) => (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={styles.reviewPhoto}
                  />
                ))}
              </ScrollView>
            )}

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              {/* Category */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>Category</Text>
                  <Text style={styles.summaryValue}>
                    {getCategoryLabel()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => goToStep(2)}>
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryDivider} />

              {/* Title & Description */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>Job Details</Text>
                  <Text style={styles.summaryValue}>
                    {title || "No title"}
                  </Text>
                  {description ? (
                    <Text
                      style={styles.summaryDesc}
                      numberOfLines={3}
                    >
                      {description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={() => goToStep(2)}>
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.summaryDivider} />

              {/* Urgency */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>Urgency</Text>
                  <Text style={styles.summaryValue}>
                    {getUrgencyLabel()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => goToStep(2)}>
                  <Ionicons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Location input on review step */}
            <Text style={styles.inputLabel}>Location</Text>
            <View style={styles.inputIconWrap}>
              <Ionicons
                name="location-outline"
                size={20}
                color={COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="City, State or ZIP"
                placeholderTextColor="#94a3b8"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <TouchableOpacity
              style={[styles.postBtn, loading && { opacity: 0.7 }]}
              onPress={handlePost}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name="rocket-outline"
                    size={20}
                    color={COLORS.white}
                  />
                  <Text style={styles.postBtnText}>Post Job</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 4,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  stepIndicator: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: "right",
  },

  // Back
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },

  // Content
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.secondary,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    marginBottom: 24,
  },

  // Voice card
  voiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    gap: 12,
  },
  voiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3b0764",
    marginBottom: 3,
  },
  voiceSubtitle: {
    fontSize: 13,
    color: "#6b21a8",
    lineHeight: 18,
  },
  newBadge: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  newBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Upload Section
  uploadSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  uploadPlaceholder: {
    alignItems: "center",
    paddingVertical: 20,
  },
  uploadIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  uploadBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: "#eff6ff",
    gap: 6,
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  mediaThumbWrap: {
    position: "relative",
  },
  mediaThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  removeMediaBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: COLORS.white,
    borderRadius: 12,
  },
  addMoreBtn: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },

  // AI Analyze
  aiAnalyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  aiAnalyzeBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },
  skipBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  skipBtnText: {
    fontSize: 14,
    color: COLORS.muted,
    fontWeight: "500",
  },

  // AI Detected Banner
  aiDetectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  aiDetectedText: {
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "600",
    flex: 1,
  },

  // Category chips (horizontal scroll)
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  categoryChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#eff6ff",
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.muted,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  // Urgency row
  urgencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  urgencyChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  urgencyChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.muted,
  },

  // Inputs
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.secondary,
  },
  textArea: {
    height: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  inputIconWrap: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    top: 15,
    zIndex: 1,
  },
  inputWithIcon: {
    paddingLeft: 42,
  },

  // Review photo
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
  },

  // Next button
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 28,
    gap: 8,
  },
  nextBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLeft: {
    flex: 1,
    marginRight: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  summaryDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  // Post
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "800",
  },
});

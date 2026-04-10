import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  secondary: colors.text,
  muted: colors.muted,
  surface: colors.surface,
  border: colors.border,
  success: colors.success,
  successLight: "#ecfdf5",
  danger: colors.danger,
  dangerLight: "#fef2f2",
  white: colors.white,
  warning: colors.warning,
  warningBg: "#fffbeb",
};

const QUIZ_CATEGORIES = [
  { id: "plumbing", label: "Plumbing", icon: "water-outline" as const, color: "#0ea5e9" },
  { id: "electrical", label: "Electrical", icon: "flash-outline" as const, color: "#f59e0b" },
  { id: "hvac", label: "HVAC", icon: "snow-outline" as const, color: "#6366f1" },
  { id: "painting", label: "Painting", icon: "color-palette-outline" as const, color: "#ec4899" },
  { id: "carpentry", label: "Carpentry", icon: "hammer-outline" as const, color: "#d97706" },
  { id: "roofing", label: "Roofing", icon: "home-outline" as const, color: "#64748b" },
  { id: "landscaping", label: "Landscaping", icon: "leaf-outline" as const, color: "#22c55e" },
  { id: "general", label: "General Repair", icon: "construct-outline" as const, color: "#8b5cf6" },
];

interface Question {
  id: string;
  question: string;
  options: string[];
  category: string;
}

interface QuizResult {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  cooldown_until?: string;
}

type ScreenState = "categories" | "quiz" | "results";

function SkeletonLoader() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ padding: 20, opacity }}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ backgroundColor: "#e2e8f0", height: 100, borderRadius: 16, marginBottom: 12 }} />
      ))}
    </Animated.View>
  );
}

export default function QuizScreen() {
  const { user } = useAuth();
  const [screenState, setScreenState] = useState<ScreenState>("categories");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ question_id: string; selected_option: string }[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [timer, setTimer] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const autoAdvanceRef = useRef(false);

  // Timer logic
  useEffect(() => {
    if (screenState !== "quiz" || questions.length === 0) return;

    autoAdvanceRef.current = false;
    setTimer(30);
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (!autoAdvanceRef.current) {
            autoAdvanceRef.current = true;
            setTimeout(() => advanceQuestion(true), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, screenState, questions.length]);

  const advanceQuestion = (timedOut: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const answer = {
      question_id: currentQuestion.id,
      selected_option: timedOut ? "" : selectedOption || "",
    };

    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const startQuiz = async (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    try {
      const { data } = await api<{ questions: Question[] }>(`/api/quiz?category=${category}`);
      if (!data.questions || data.questions.length === 0) {
        Alert.alert("No Questions", "No quiz questions available for this category yet.");
        setLoading(false);
        return;
      }
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers([]);
      setSelectedOption(null);
      setScreenState("quiz");
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (message.toLowerCase().includes("cooldown")) {
        Alert.alert("Cooldown Active", "You must wait 24 hours between quiz retakes.");
      } else {
        Alert.alert("Error", message);
      }
    }
    setLoading(false);
  };

  const submitQuiz = async (finalAnswers: { question_id: string; selected_option: string }[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    try {
      const { data } = await api<QuizResult>("/api/quiz", {
        method: "POST",
        body: JSON.stringify({
          category: selectedCategory,
          answers: finalAnswers,
        }),
      });
      setResult(data);
      setScreenState("results");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
      setScreenState("categories");
    }
    setSubmitting(false);
  };

  const resetQuiz = () => {
    setScreenState("categories");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setSelectedOption(null);
    setResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Category selection screen
  if (screenState === "categories") {
    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Skills Assessment</Text>
            <Text style={styles.headerSubtitle}>
              Prove your expertise and earn skill badges. Score 70% or higher to pass.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardTitle}>How it works</Text>
              <Text style={styles.infoCardDesc}>
                Answer multiple-choice questions within 30 seconds each. You need 70% to pass. You can retake after 24 hours.
              </Text>
            </View>
          </View>

          {loading && <SkeletonLoader />}

          <Text style={styles.sectionTitle}>Choose a Category</Text>

          <View style={styles.categoriesGrid}>
            {QUIZ_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => startQuiz(cat.id)}
                activeOpacity={0.7}
                disabled={loading}
              >
                <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + "15" }]}>
                  <Ionicons name={cat.icon} size={28} color={cat.color} />
                </View>
                <Text style={styles.categoryCardLabel}>{cat.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Quiz in progress
  if (screenState === "quiz") {
    if (submitting) {
      return (
        <SafeAreaView style={styles.screen} edges={["top"]}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.submittingText}>Submitting your answers...</Text>
          </View>
        </SafeAreaView>
      );
    }

    const currentQuestion = questions[currentIndex];
    const progress = (currentIndex + 1) / questions.length;
    const timerColor = timer <= 10 ? COLORS.danger : timer <= 20 ? COLORS.warning : COLORS.success;

    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <View style={styles.quizContainer}>
          {/* Quiz Header */}
          <View style={styles.quizHeader}>
            <TouchableOpacity onPress={resetQuiz} style={styles.quizBackBtn}>
              <Ionicons name="close" size={24} color={COLORS.muted} />
            </TouchableOpacity>
            <Text style={styles.quizProgress}>
              {currentIndex + 1} / {questions.length}
            </Text>
            <View style={[styles.timerBadge, { backgroundColor: timerColor + "15" }]}>
              <Ionicons name="time-outline" size={16} color={timerColor} />
              <Text style={[styles.timerText, { color: timerColor }]}>{timer}s</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Timer bar */}
          <Animated.View
            style={[
              styles.timerBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: timerColor,
              },
            ]}
          />

          <ScrollView contentContainerStyle={styles.quizContent} showsVerticalScrollIndicator={false}>
            {/* Question */}
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {currentQuestion?.options.map((option, index) => {
                const isSelected = selectedOption === option;
                const optionLetter = String.fromCharCode(65 + index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setSelectedOption(option)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                      <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                        {optionLetter}
                      </Text>
                    </View>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Next button */}
          <View style={styles.quizFooter}>
            <TouchableOpacity
              style={[styles.nextBtn, !selectedOption && styles.nextBtnDisabled]}
              onPress={() => advanceQuestion(false)}
              disabled={!selectedOption}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextBtnText, !selectedOption && styles.nextBtnTextDisabled]}>
                {currentIndex + 1 === questions.length ? "Submit" : "Next"}
              </Text>
              <Ionicons
                name={currentIndex + 1 === questions.length ? "checkmark" : "arrow-forward"}
                size={20}
                color={selectedOption ? COLORS.white : COLORS.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Results screen
  if (screenState === "results" && result) {
    const passed = result.passed;
    const percentage = Math.round(result.percentage);
    const cooldownUntil = result.cooldown_until ? new Date(result.cooldown_until) : null;

    return (
      <SafeAreaView style={styles.screen} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultIconWrap, passed ? styles.resultIconPass : styles.resultIconFail]}>
            <Ionicons
              name={passed ? "trophy" : "refresh-circle"}
              size={56}
              color={passed ? COLORS.success : COLORS.danger}
            />
          </View>

          <Text style={styles.resultTitle}>
            {passed ? "Congratulations!" : "Not Quite There"}
          </Text>
          <Text style={styles.resultSubtitle}>
            {passed
              ? "You passed the assessment and earned a skill badge!"
              : "You need 70% to pass. Study up and try again."}
          </Text>

          {/* Score circle */}
          <View style={[styles.scoreCircle, passed ? styles.scoreCirclePass : styles.scoreCircleFail]}>
            <Text style={[styles.scorePercent, { color: passed ? COLORS.success : COLORS.danger }]}>
              {percentage}%
            </Text>
            <Text style={styles.scoreLabel}>
              {result.score} / {result.total} correct
            </Text>
          </View>

          {/* Pass/Fail Badge */}
          <View style={[styles.resultBadge, passed ? styles.resultBadgePass : styles.resultBadgeFail]}>
            <Ionicons
              name={passed ? "checkmark-circle" : "close-circle"}
              size={18}
              color={passed ? COLORS.success : COLORS.danger}
            />
            <Text style={[styles.resultBadgeText, { color: passed ? COLORS.success : COLORS.danger }]}>
              {passed ? "PASSED" : "FAILED"} - 70% required
            </Text>
          </View>

          {cooldownUntil && !passed && (
            <View style={styles.cooldownCard}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cooldownTitle}>Retake Available</Text>
                <Text style={styles.cooldownText}>
                  You can retake this quiz after{" "}
                  {cooldownUntil.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.backToCategoriesBtn} onPress={resetQuiz} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            <Text style={styles.backToCategoriesBtnText}>Back to Categories</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { padding: 20 },
  centerContent: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  submittingText: { fontSize: 16, color: COLORS.muted, fontWeight: "500" },

  // Header
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.secondary },
  headerSubtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4, lineHeight: 20 },

  // Info card
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoCardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primaryDark, marginBottom: 2 },
  infoCardDesc: { fontSize: 13, color: "#475569", lineHeight: 18 },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 14 },

  // Categories Grid
  categoriesGrid: { gap: 10 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  categoryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryCardLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: COLORS.secondary },

  // Quiz screen
  quizContainer: { flex: 1 },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quizBackBtn: { padding: 4 },
  quizProgress: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: { fontSize: 16, fontWeight: "800" },

  progressBarBg: {
    height: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  timerBar: {
    height: 3,
    marginTop: 4,
    marginHorizontal: 20,
    borderRadius: 2,
  },

  quizContent: { padding: 20, paddingTop: 28 },
  questionText: { fontSize: 20, fontWeight: "700", color: COLORS.secondary, lineHeight: 28, marginBottom: 28 },

  optionsContainer: { gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionCardSelected: { borderColor: COLORS.primary, backgroundColor: "#eff6ff" },
  optionLetter: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLetterSelected: { backgroundColor: COLORS.primary },
  optionLetterText: { fontSize: 15, fontWeight: "700", color: COLORS.muted },
  optionLetterTextSelected: { color: COLORS.white },
  optionText: { flex: 1, fontSize: 15, color: COLORS.secondary, lineHeight: 22 },
  optionTextSelected: { fontWeight: "600", color: COLORS.primaryDark },

  quizFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  nextBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextBtnDisabled: { backgroundColor: COLORS.surface },
  nextBtnText: { color: colors.white, fontSize: 16, fontWeight: "600" },
  nextBtnTextDisabled: { color: COLORS.muted },

  // Results screen
  resultsContainer: {
    padding: 20,
    alignItems: "center",
    paddingTop: 40,
  },
  resultIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  resultIconPass: { backgroundColor: COLORS.successLight },
  resultIconFail: { backgroundColor: COLORS.dangerLight },
  resultTitle: { fontSize: 28, fontWeight: "800", color: COLORS.secondary, marginBottom: 8 },
  resultSubtitle: {
    fontSize: 15,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 20,
  },

  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    marginBottom: 20,
  },
  scoreCirclePass: { borderColor: COLORS.success, backgroundColor: COLORS.successLight },
  scoreCircleFail: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerLight },
  scorePercent: { fontSize: 40, fontWeight: "800" },
  scoreLabel: { fontSize: 13, color: COLORS.muted, fontWeight: "500" },

  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 24,
  },
  resultBadgePass: { backgroundColor: COLORS.successLight },
  resultBadgeFail: { backgroundColor: COLORS.dangerLight },
  resultBadgeText: { fontSize: 14, fontWeight: "700" },

  cooldownCard: {
    flexDirection: "row",
    backgroundColor: COLORS.warningBg,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fde68a",
    alignSelf: "stretch",
  },
  cooldownTitle: { fontSize: 14, fontWeight: "700", color: COLORS.warning, marginBottom: 2 },
  cooldownText: { fontSize: 13, color: "#92400e", lineHeight: 18 },

  backToCategoriesBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    gap: 8,
    ...shadows.md,
  },
  backToCategoriesBtnText: { color: colors.white, fontSize: 16, fontWeight: "600" },
});

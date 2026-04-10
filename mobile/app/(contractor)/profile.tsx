import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Image,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { api, getToken, API_URL } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  secondary: colors.text,
  muted: colors.muted,
  surface: colors.surface,
  border: colors.border,
  success: colors.success,
  successLight: "#ecfdf5",
  danger: colors.danger,
  white: colors.white,
  pro: colors.success,
  proBg: "#ecfdf5",
  warning: colors.warning,
  warningBg: "#fffbeb",
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const ALL_SKILLS = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Painting",
  "Carpentry",
  "Roofing",
  "Landscaping",
  "Cleaning",
  "Moving",
  "General Repair",
];
const EXPERIENCE_OPTIONS = [
  "1-2 years",
  "3-5 years",
  "5-10 years",
  "10+ years",
];

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issued_at: string;
  expires_at?: string;
}

interface WorkHistoryItem {
  id: string;
  title: string;
  category: string;
  completed_at: string;
  rating?: number;
  review?: string;
  amount?: number;
}

interface SettingsRowProps {
  icon: IoniconsName;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  danger?: boolean;
}

function SettingsRow({
  icon,
  label,
  onPress,
  rightElement,
  isLast,
  danger,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingsRowLeft}>
        <View
          style={[
            styles.settingsIconWrap,
            danger && { backgroundColor: "#fef2f2" },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={danger ? COLORS.danger : COLORS.primary}
          />
        </View>
        <Text
          style={[styles.settingsLabel, danger && { color: COLORS.danger }]}
        >
          {label}
        </Text>
      </View>
      {rightElement ?? (
        <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  danger,
}: {
  title: string;
  danger?: boolean;
}) {
  return (
    <Text
      style={[styles.sectionHeader, danger && { color: COLORS.danger }]}
    >
      {title}
    </Text>
  );
}

function VerificationBadge({
  status,
}: {
  status: "Verified" | "Pending" | "Not Submitted";
}) {
  const color =
    status === "Verified"
      ? COLORS.success
      : status === "Pending"
        ? "#f59e0b"
        : COLORS.muted;
  const bg =
    status === "Verified"
      ? COLORS.proBg
      : status === "Pending"
        ? "#fffbeb"
        : "#f1f5f9";
  return (
    <View style={[styles.verificationBadge, { backgroundColor: bg }]}>
      <Text style={[styles.verificationBadgeText, { color }]}>
        {status}
      </Text>
    </View>
  );
}

function TrustBadge({
  icon,
  label,
  verified,
}: {
  icon: IoniconsName;
  label: string;
  verified: boolean;
}) {
  return (
    <View
      style={[
        styles.trustBadge,
        verified
          ? styles.trustBadgeVerified
          : styles.trustBadgeUnverified,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={verified ? COLORS.success : COLORS.muted}
      />
      <Text
        style={[
          styles.trustBadgeLabel,
          verified
            ? { color: COLORS.success }
            : { color: COLORS.muted },
        ]}
      >
        {label}
      </Text>
      {verified && (
        <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
      )}
    </View>
  );
}

export default function ContractorProfile() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Professional fields
  const [skills, setSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [experience, setExperience] = useState("3-5 years");
  const [bio, setBio] = useState("");
  const [showExpDropdown, setShowExpDropdown] = useState(false);

  // Track original values
  const [originalName, setOriginalName] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalLocation, setOriginalLocation] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalJobs: 0,
    avgRating: 0,
    totalEarnings: 0,
    completionRate: 0,
  });

  // Portfolio & Quiz
  const [portfolioCount, setPortfolioCount] = useState(0);
  const [portfolioPhotoCount, setPortfolioPhotoCount] = useState(0);
  const [quizScores, setQuizScores] = useState<{ category: string; percentage: number; passed: boolean }[]>([]);
  const [headline, setHeadline] = useState("");
  const [analyzingProfile, setAnalyzingProfile] = useState(false);

  // Certifications & Work History
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [workHistory, setWorkHistory] = useState<WorkHistoryItem[]>([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  const hasChanges =
    name !== (user?.name || "") ||
    phone !== (user?.phone || "") ||
    location !== (user?.location || "");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api<{
          name: string;
          phone: string;
          location: string;
        }>("/api/auth/me");
        setName(data.name || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setOriginalName(data.name || "");
        setOriginalPhone(data.phone || "");
        setOriginalLocation(data.location || "");
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  // Fetch stats, certifications, work history
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      // Fetch certifications
      try {
        const { data } = await api<{ certifications: Certification[] }>(
          `/api/contractors/${user.id}/certifications`
        );
        setCertifications(data.certifications || []);
      } catch {
        /* endpoint may not exist yet */
      }

      // Fetch work history
      try {
        const { data } = await api<{ work_history: WorkHistoryItem[] }>(
          `/api/contractors/${user.id}/work-history`
        );
        setWorkHistory(data.work_history || []);
      } catch {
        /* endpoint may not exist yet */
      }

      // Fetch stats
      try {
        const { data } = await api<{
          total_jobs: number;
          avg_rating: number;
          total_earnings: number;
          completion_rate: number;
        }>(`/api/contractors/${user.id}/stats`);
        setStats({
          totalJobs: data.total_jobs || 0,
          avgRating: data.avg_rating || 0,
          totalEarnings: data.total_earnings || 0,
          completionRate: data.completion_rate || 0,
        });
      } catch {
        /* endpoint may not exist yet */
      }

      // Fetch portfolio count
      try {
        const { data } = await api<{ portfolio?: { before_photos?: string[]; after_photos?: string[] }[]; items?: { before_photos?: string[]; after_photos?: string[] }[] }>(
          `/api/portfolio?contractorId=${user.id}`
        );
        const portfolio = data.portfolio || data.items || [];
        setPortfolioCount(portfolio.length);
        const photoTotal = portfolio.reduce((sum: number, item: { before_photos?: string[]; after_photos?: string[] }) => {
          const b = Array.isArray(item.before_photos) ? item.before_photos.length : 0;
          const a = Array.isArray(item.after_photos) ? item.after_photos.length : 0;
          return sum + b + a;
        }, 0);
        setPortfolioPhotoCount(photoTotal);
      } catch {
        /* endpoint may not exist yet */
      }

      // Fetch quiz scores
      try {
        const { data } = await api<{ scores: { category: string; percentage: number; passed: boolean }[] }>(
          `/api/quiz/scores/${user.id}`
        );
        setQuizScores(data.scores || []);
      } catch {
        /* endpoint may not exist yet */
      }

      setLoadingExtra(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          phone,
          location,
          bio,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          experience,
          skills: skills.join(","),
        }),
      });
      await refreshUser();
      setOriginalName(name);
      setOriginalPhone(phone);
      setOriginalLocation(location);
      Alert.alert("Saved", "Profile updated");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSaving(false);
  };

  const handleAnalyzeProfile = async () => {
    setAnalyzingProfile(true);
    try {
      const { data } = await api<{ analysis: string; suggestions: string[] }>("/api/ai/analyze-profile", {
        method: "POST",
      });
      const suggestions = data.suggestions?.length
        ? "\n\nSuggestions:\n" + data.suggestions.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")
        : "";
      Alert.alert("AI Profile Analysis", (data.analysis || "Analysis complete.") + suggestions);
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setAnalyzingProfile(false);
  };

  const handleSaveHeadlineBio = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await api(`/api/contractors/${user.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ headline, bio }),
      });
      Alert.alert("Saved", "Headline and bio updated");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSaving(false);
  };

  const pickAvatar = useCallback(async () => {
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const comingSoon = (feature: string) => () =>
    Alert.alert(feature, "Coming soon");

  const [uploading, setUploading] = useState<string | null>(null);

  const pickAndUploadDocument = async (endpoint: string, docType: string, fieldName: string = 'file') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    setUploading(docType);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled) {
        setUploading(null);
        return;
      }
      const uri = result.assets[0].uri;
      const token = await getToken();
      const formData = new FormData();
      formData.append(fieldName, {
        uri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      if (endpoint.includes('/documents')) {
        formData.append('type', docType);
      }
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      Alert.alert("Success", `${docType.replace(/_/g, ' ')} uploaded successfully.`);
      refreshUser();
    } catch (err: unknown) {
      Alert.alert("Upload Error", (err as Error).message || "Upload failed. Please try again.");
    }
    setUploading(null);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Delete Account", "Coming soon"),
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.pro} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={pickAvatar}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarBig}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>
            {user?.name || "Contractor"}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.proBadge}>
              <Ionicons
                name="shield-checkmark"
                size={14}
                color={COLORS.pro}
              />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
          </View>

          {user?.id && (
            <Text style={styles.accountNumber}>
              Account: {user.id.slice(0, 8).toUpperCase()}
            </Text>
          )}
          <Text style={styles.memberSince}>
            {user?.created_at
              ? `Member since ${new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
              : "Member"}
          </Text>
        </View>

        {/* Stats Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalJobs}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text style={styles.statValue}>
                  {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "--"}
                </Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ${stats.totalEarnings > 0 ? (stats.totalEarnings >= 1000 ? `${(stats.totalEarnings / 1000).toFixed(1)}k` : stats.totalEarnings.toLocaleString()) : "0"}
              </Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {stats.completionRate > 0
                  ? `${stats.completionRate}%`
                  : "--"}
              </Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Trust Badges */}
        <SectionHeader title="Trust Badges" />
        <View style={styles.trustBadgesContainer}>
          <TrustBadge
            icon="id-card-outline"
            label="ID Verified"
            verified={false}
          />
          <TrustBadge
            icon="shield-checkmark-outline"
            label="Background Check"
            verified={false}
          />
          <TrustBadge
            icon="ribbon-outline"
            label="Licensed"
            verified={true}
          />
          <TrustBadge
            icon="document-text-outline"
            label="Insured"
            verified={false}
          />
        </View>

        {/* Portfolio Preview */}
        <SectionHeader title="Portfolio" />
        <TouchableOpacity
          style={styles.portfolioPreviewCard}
          onPress={() => router.push("/(contractor)/portfolio")}
          activeOpacity={0.7}
        >
          <View style={styles.portfolioPreviewLeft}>
            <View style={styles.portfolioPreviewIconWrap}>
              <Ionicons name="images-outline" size={24} color={COLORS.primaryLight} />
            </View>
            <View>
              <Text style={styles.portfolioPreviewTitle}>
                {portfolioCount} Project{portfolioCount !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.portfolioPreviewSub}>
                {portfolioPhotoCount} photo{portfolioPhotoCount !== 1 ? "s" : ""} uploaded
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {portfolioPhotoCount < 3 && (
              <View style={styles.portfolioGateBadge}>
                <Text style={styles.portfolioGateText}>Need {3 - portfolioPhotoCount} more</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
          </View>
        </TouchableOpacity>

        {/* Quiz Scores */}
        <SectionHeader title="Quiz Scores" />
        {quizScores.length > 0 ? (
          <View style={styles.quizScoresList}>
            {quizScores.map((score, idx) => (
              <View key={`${score.category}-${idx}`} style={styles.quizScoreRow}>
                <View style={styles.quizScoreLeft}>
                  <Ionicons
                    name={score.passed ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={score.passed ? COLORS.success : "#dc2626"}
                  />
                  <Text style={styles.quizScoreCategory}>{score.category}</Text>
                </View>
                <View style={[styles.quizScoreBadge, { backgroundColor: score.passed ? COLORS.successLight : "#fef2f2" }]}>
                  <Text style={[styles.quizScorePercent, { color: score.passed ? COLORS.success : "#dc2626" }]}>
                    {Math.round(score.percentage)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => router.push("/(contractor)/quiz")}
            activeOpacity={0.7}
          >
            <Ionicons name="school-outline" size={28} color="#d1d5db" />
            <Text style={styles.emptyCardText}>No quiz scores yet</Text>
            <Text style={styles.emptyCardSubtext}>Take a skills quiz to earn badges</Text>
          </TouchableOpacity>
        )}

        {/* AI Profile Analysis */}
        <SectionHeader title="Profile Insights" />
        <TouchableOpacity
          style={styles.aiAnalysisBtn}
          onPress={handleAnalyzeProfile}
          disabled={analyzingProfile}
          activeOpacity={0.7}
        >
          {analyzingProfile ? (
            <ActivityIndicator color={COLORS.primaryLight} />
          ) : (
            <>
              <View style={styles.aiAnalysisIconWrap}>
                <Ionicons name="sparkles" size={20} color={COLORS.primaryLight} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiAnalysisTitle}>AI Profile Analysis</Text>
                <Text style={styles.aiAnalysisDesc}>
                  Get AI-powered suggestions to improve your profile
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
            </>
          )}
        </TouchableOpacity>

        {/* Trust & Verification Link */}
        <SectionHeader title="Trust & Verification" />
        <TouchableOpacity
          style={styles.verificationLinkCard}
          onPress={() => router.push("/(contractor)/verification")}
          activeOpacity={0.7}
        >
          <View style={styles.verificationLinkLeft}>
            <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
            <Text style={styles.verificationLinkText}>Manage Trust Badges</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.border} />
        </TouchableOpacity>

        {/* Headline & Bio Editing */}
        <SectionHeader title="Headline & Bio" />
        <View style={styles.settingsCard}>
          <View style={[styles.settingsRow, styles.settingsRowBorder, { flexDirection: "column", alignItems: "flex-start" }]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="megaphone-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.settingsLabel}>Headline</Text>
            </View>
            <TextInput
              style={[styles.bioInput, { minHeight: 44 }]}
              value={headline}
              onChangeText={setHeadline}
              placeholder="e.g., Licensed Plumber with 10+ years experience"
              placeholderTextColor={COLORS.border}
            />
          </View>
          <View style={[styles.settingsRow, { flexDirection: "column", alignItems: "flex-start" }]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.settingsLabel}>Bio</Text>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients about yourself, your experience, and what makes you stand out..."
              placeholderTextColor={COLORS.border}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.saveHeadlineBtn}
          onPress={handleSaveHeadlineBio}
          activeOpacity={0.8}
        >
          <Text style={styles.saveHeadlineBtnText}>Save Headline & Bio</Text>
        </TouchableOpacity>

        {/* Certifications */}
        <SectionHeader title="Certifications" />
        {certifications.length > 0 ? (
          <View style={styles.certList}>
            {certifications.map((cert) => (
              <View key={cert.id} style={styles.certCard}>
                <View style={styles.certIconWrap}>
                  <Ionicons
                    name="medal-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.certName}>{cert.name}</Text>
                  <Text style={styles.certIssuer}>{cert.issuer}</Text>
                  <Text style={styles.certDate}>
                    Issued{" "}
                    {new Date(cert.issued_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                    {cert.expires_at &&
                      ` \u2022 Expires ${new Date(cert.expires_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="medal-outline"
              size={28}
              color="#d1d5db"
            />
            <Text style={styles.emptyCardText}>
              No certifications yet
            </Text>
            <Text style={styles.emptyCardSubtext}>
              Add certifications to build trust with clients
            </Text>
          </View>
        )}

        {/* Work History */}
        <SectionHeader title="Work History" />
        {workHistory.length > 0 ? (
          <View style={styles.workHistoryList}>
            {workHistory.map((item, idx) => (
              <View
                key={item.id}
                style={styles.workHistoryItem}
              >
                <View style={styles.timelineDotContainer}>
                  <View style={styles.timelineDot} />
                  {idx < workHistory.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                </View>
                <View style={styles.workHistoryContent}>
                  <Text style={styles.workHistoryTitle}>{item.title}</Text>
                  <Text style={styles.workHistoryCategory}>
                    {item.category?.replace(/_/g, " ")}
                  </Text>
                  <View style={styles.workHistoryMeta}>
                    <Text style={styles.workHistoryDate}>
                      {new Date(item.completed_at).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </Text>
                    {item.rating && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        <Ionicons
                          name="star"
                          size={12}
                          color="#f59e0b"
                        />
                        <Text style={styles.workHistoryRating}>
                          {item.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    {item.amount && (
                      <Text style={styles.workHistoryAmount}>
                        ${item.amount.toLocaleString()}
                      </Text>
                    )}
                  </View>
                  {item.review && (
                    <Text
                      style={styles.workHistoryReview}
                      numberOfLines={2}
                    >
                      "{item.review}"
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons
              name="briefcase-outline"
              size={28}
              color="#d1d5db"
            />
            <Text style={styles.emptyCardText}>No work history yet</Text>
            <Text style={styles.emptyCardSubtext}>
              Complete jobs to build your work history
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Professional Info */}
        <SectionHeader title="Professional Info" />
        <View style={styles.settingsCard}>
          <View
            style={[
              styles.settingsRow,
              styles.settingsRowBorder,
              { flexDirection: "column", alignItems: "flex-start" },
            ]}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="construct-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Skills / Services</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContainer}
            >
              {ALL_SKILLS.map((skill) => {
                const selected = skills.includes(skill);
                return (
                  <TouchableOpacity
                    key={skill}
                    style={[
                      styles.chip,
                      selected && styles.chipSelected,
                    ]}
                    onPress={() => toggleSkill(skill)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {skill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Hourly Rate</Text>
            </View>
            <View style={styles.rateInputWrap}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.rateInput}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="0"
                placeholderTextColor={COLORS.border}
                keyboardType="numeric"
              />
              <Text style={styles.perHour}>/hr</Text>
            </View>
          </View>

          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Experience</Text>
            </View>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setShowExpDropdown(!showExpDropdown)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownBtnText}>{experience}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={COLORS.muted}
              />
            </TouchableOpacity>
          </View>

          {showExpDropdown && (
            <View style={styles.dropdownList}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.dropdownItem,
                    opt === experience && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setExperience(opt);
                    setShowExpDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      opt === experience && {
                        color: COLORS.primary,
                        fontWeight: "600",
                      },
                    ]}
                  >
                    {opt}
                  </Text>
                  {opt === experience && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View
            style={[
              styles.settingsRow,
              { flexDirection: "column", alignItems: "flex-start" },
            ]}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Bio / About</Text>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell clients about yourself..."
              placeholderTextColor={COLORS.border}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Verification */}
        <SectionHeader title="Verification" />
        <View style={styles.settingsCard}>
          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsRowBorder]}
            onPress={() => pickAndUploadDocument('/api/contractors/documents', 'background_check')}
            activeOpacity={0.6}
            disabled={uploading === 'background_check'}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="id-card-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>ID Verification</Text>
            </View>
            <View style={styles.verificationRight}>
              {uploading === 'background_check' ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <VerificationBadge status="Not Submitted" />
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsRowBorder]}
            onPress={() => pickAndUploadDocument('/api/contractors/documents', 'insurance')}
            activeOpacity={0.6}
            disabled={uploading === 'insurance'}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Insurance</Text>
            </View>
            <View style={styles.verificationRight}>
              {uploading === 'insurance' ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <VerificationBadge status="Pending" />
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => pickAndUploadDocument('/api/contractors/documents', 'license')}
            activeOpacity={0.6}
            disabled={uploading === 'license'}
          >
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="ribbon-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>License</Text>
            </View>
            <View style={styles.verificationRight}>
              {uploading === 'license' ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <VerificationBadge status="Verified" />
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={COLORS.primaryLight}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Personal Information */}
        <SectionHeader title="Personal Information" />
        <View style={styles.settingsCard}>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Full Name</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.border}
            />
          </View>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.muted}
                />
              </View>
              <Text
                style={[styles.settingsLabel, { color: COLORS.muted }]}
              >
                Email
              </Text>
            </View>
            <Text style={styles.inlineValue}>{user?.email}</Text>
          </View>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Phone</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone"
              placeholderTextColor={COLORS.border}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.settingsLabel}>Location</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              placeholderTextColor={COLORS.border}
            />
          </View>
        </View>

        {/* Preferences */}
        <SectionHeader title="Preferences" />
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="notifications-outline"
            label="Notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.primaryLight,
                }}
                thumbColor={COLORS.white}
              />
            }
          />
          <SettingsRow
            icon="moon-outline"
            label="Dark Mode"
            isLast
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: COLORS.border,
                  true: COLORS.primaryLight,
                }}
                thumbColor={COLORS.white}
              />
            }
          />
        </View>

        {/* Business Tools */}
        <SectionHeader title="Business Tools" />
        <View style={styles.settingsCard}>
          <SettingsRow icon="wallet-outline" label="Earnings" onPress={() => router.push("/(contractor)/earnings")} />
          <SettingsRow icon="receipt-outline" label="Invoices" onPress={() => router.push("/(contractor)/invoices")} />
          <SettingsRow icon="bar-chart-outline" label="Tax & Reports" onPress={() => router.push("/(contractor)/tax")} />
          <SettingsRow icon="people-outline" label="My Clients" onPress={() => router.push("/(contractor)/clients")} isLast />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            onPress={comingSoon("Change Password")}
          />
          <SettingsRow
            icon="card-outline"
            label="Payment Methods"
            onPress={comingSoon("Payment Methods")}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={comingSoon("Privacy Policy")}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Terms of Service"
            onPress={comingSoon("Terms of Service")}
            isLast
          />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" danger />
        <View style={styles.settingsCard}>
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            isLast
            danger
          />
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={COLORS.danger}
          />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Save Button */}
      {hasChanges && (
        <View style={styles.stickyBottom}>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },

  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
  },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatarBig: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.pro,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: "800", color: COLORS.white },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.pro,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 4,
  },
  profileEmail: { fontSize: 14, color: COLORS.muted, marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.proBg,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  proBadgeText: { fontSize: 13, fontWeight: "700", color: COLORS.pro },

  accountNumber: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  memberSince: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  divider: { height: 8, backgroundColor: COLORS.surface },

  // Stats Card
  statsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: "500",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  // Trust Badges
  trustBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trustBadgeVerified: {
    backgroundColor: COLORS.successLight,
    borderColor: "#a7f3d0",
  },
  trustBadgeUnverified: {
    backgroundColor: "#f1f5f9",
    borderColor: COLORS.border,
  },
  trustBadgeLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Certifications
  certList: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  certCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  certIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  certName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  certIssuer: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 2,
  },
  certDate: {
    fontSize: 12,
    color: "#94a3b8",
  },

  // Empty card
  emptyCard: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94a3b8",
    marginTop: 8,
  },
  emptyCardSubtext: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 2,
  },

  // Work History
  workHistoryList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  workHistoryItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDotContainer: {
    alignItems: "center",
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryLight,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  workHistoryContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workHistoryTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  workHistoryCategory: {
    fontSize: 12,
    color: COLORS.muted,
    textTransform: "capitalize",
    marginBottom: 6,
  },
  workHistoryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workHistoryDate: {
    fontSize: 12,
    color: "#94a3b8",
  },
  workHistoryRating: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
  },
  workHistoryAmount: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
  },
  workHistoryReview: {
    fontSize: 13,
    color: "#475569",
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 18,
  },

  // Section Headers
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingsLabel: { fontSize: 16, color: COLORS.secondary },

  // Inline inputs
  inlineInput: {
    fontSize: 16,
    color: COLORS.secondary,
    textAlign: "right",
    flex: 0,
    minWidth: 120,
    paddingVertical: 0,
  },
  inlineValue: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "right",
  },

  // Skills chips
  chipsScroll: { marginTop: 10, marginLeft: 44 },
  chipsContainer: { gap: 8, paddingRight: 16, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: "#eff6ff",
    borderColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 14, color: COLORS.muted },
  chipTextSelected: { color: COLORS.primary, fontWeight: "600" },

  // Rate input
  rateInputWrap: { flexDirection: "row", alignItems: "center" },
  dollarSign: { fontSize: 16, color: COLORS.muted, marginRight: 2 },
  rateInput: {
    fontSize: 16,
    color: COLORS.secondary,
    minWidth: 40,
    textAlign: "right",
    paddingVertical: 0,
  },
  perHour: { fontSize: 14, color: COLORS.muted, marginLeft: 2 },

  // Dropdown
  dropdownBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  dropdownBtnText: { fontSize: 16, color: COLORS.primary },
  dropdownList: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  dropdownItemSelected: { backgroundColor: "#eff6ff" },
  dropdownItemText: { fontSize: 15, color: COLORS.secondary },

  // Bio
  bioInput: {
    marginTop: 10,
    marginLeft: 44,
    marginRight: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.secondary,
    minHeight: 80,
    width: "80%",
  },

  // Verification
  verificationRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationBadgeText: { fontSize: 12, fontWeight: "600" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: "600" },

  // Portfolio Preview
  portfolioPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  portfolioPreviewLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  portfolioPreviewIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  portfolioPreviewTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  portfolioPreviewSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  portfolioGateBadge: {
    backgroundColor: "#fffbeb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  portfolioGateText: { fontSize: 12, fontWeight: "600", color: "#d97706" },

  // Quiz Scores
  quizScoresList: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 8,
  },
  quizScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  quizScoreLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  quizScoreCategory: { fontSize: 15, fontWeight: "600", color: COLORS.secondary, textTransform: "capitalize" },
  quizScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  quizScorePercent: { fontSize: 13, fontWeight: "700" },

  // AI Analysis
  aiAnalysisBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    marginBottom: 8,
  },
  aiAnalysisIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  aiAnalysisTitle: { fontSize: 16, fontWeight: "700", color: COLORS.secondary },
  aiAnalysisDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },

  // Verification Link
  verificationLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  verificationLinkLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  verificationLinkText: { fontSize: 16, fontWeight: "600", color: COLORS.secondary },

  // Save Headline Btn
  saveHeadlineBtn: {
    backgroundColor: COLORS.primaryLight,
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  saveHeadlineBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },

  // Sticky Save
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.pro,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});

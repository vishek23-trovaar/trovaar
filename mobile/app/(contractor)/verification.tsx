import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Linking,
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

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TrustBadgeConfig {
  id: string;
  label: string;
  icon: IoniconsName;
  description: string;
  statusKey: string;
}

const TRUST_BADGES: TrustBadgeConfig[] = [
  { id: "identity", label: "Identity Verified", icon: "id-card-outline", description: "Verify your identity via Stripe", statusKey: "identity_verified" },
  { id: "background", label: "Background Check", icon: "shield-checkmark-outline", description: "Pass a background check", statusKey: "background_check" },
  { id: "licensed", label: "Licensed", icon: "ribbon-outline", description: "Submit your professional license", statusKey: "license_verified" },
  { id: "top_rated", label: "Top Rated", icon: "star-outline", description: "Maintain 4.8+ rating with 10+ jobs", statusKey: "top_rated" },
  { id: "elite_pro", label: "Elite Pro", icon: "diamond-outline", description: "Complete 50+ jobs with 4.9+ rating", statusKey: "elite_pro" },
  { id: "fast_responder", label: "Fast Responder", icon: "flash-outline", description: "Respond to bids within 1 hour", statusKey: "fast_responder" },
];

const LICENSE_TYPES = [
  "General Contractor",
  "Electrician",
  "Plumber",
  "HVAC Technician",
  "Roofer",
  "Painter",
  "Landscaper",
  "Other",
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

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
      <View style={{ backgroundColor: "#e2e8f0", height: 60, borderRadius: 16, marginBottom: 16 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={{ backgroundColor: "#e2e8f0", height: 100, width: "47%", borderRadius: 16 }} />
        ))}
      </View>
    </Animated.View>
  );
}

export default function VerificationScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<Record<string, string>>({});

  // License form
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseState, setLicenseState] = useState("CA");
  const [licenseType, setLicenseType] = useState("General Contractor");
  const [submittingLicense, setSubmittingLicense] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Action states
  const [requestingBgCheck, setRequestingBgCheck] = useState(false);
  const [requestingIdentity, setRequestingIdentity] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api<Record<string, unknown>>("/api/auth/me");
      const profile =
        (data as Record<string, unknown>).contractor_profiles ||
        (data as Record<string, unknown>).contractor_profile ||
        data;
      const statuses: Record<string, string> = {};
      TRUST_BADGES.forEach((badge) => {
        const val = (profile as Record<string, unknown>)[badge.statusKey];
        if (val === true || val === "verified" || val === "approved") {
          statuses[badge.id] = "verified";
        } else if (val === "pending" || val === "in_review") {
          statuses[badge.id] = "pending";
        } else {
          statuses[badge.id] = "not_started";
        }
      });
      setVerificationStatus(statuses);
    } catch {
      /* ignore */
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const getStatusColor = (status: string) => {
    if (status === "verified") return COLORS.success;
    if (status === "pending") return COLORS.warning;
    return COLORS.muted;
  };

  const getStatusBg = (status: string) => {
    if (status === "verified") return COLORS.successLight;
    if (status === "pending") return COLORS.warningBg;
    return "#f1f5f9";
  };

  const getStatusLabel = (status: string) => {
    if (status === "verified") return "Verified";
    if (status === "pending") return "Pending";
    return "Not Started";
  };

  const handleBackgroundCheck = async () => {
    setRequestingBgCheck(true);
    try {
      await api("/api/background-check", { method: "POST" });
      Alert.alert(
        "Requested",
        "Background check has been initiated. You will be notified when it is complete."
      );
      fetchStatus();
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setRequestingBgCheck(false);
  };

  const handleIdentityVerification = async () => {
    setRequestingIdentity(true);
    try {
      const { data } = await api<{ url: string }>("/api/stripe/identity", {
        method: "POST",
      });
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        Alert.alert("Error", "Could not get verification URL");
      }
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setRequestingIdentity(false);
  };

  const handleLicenseSubmit = async () => {
    if (!licenseNumber.trim()) {
      Alert.alert("Error", "Please enter your license number");
      return;
    }
    setSubmittingLicense(true);
    try {
      await api("/api/license", {
        method: "POST",
        body: JSON.stringify({
          license_number: licenseNumber,
          state: licenseState,
          type: licenseType,
        }),
      });
      Alert.alert("Submitted", "Your license has been submitted for verification.");
      setShowLicenseForm(false);
      setLicenseNumber("");
      fetchStatus();
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message);
    }
    setSubmittingLicense(false);
  };

  const verifiedCount = Object.values(verificationStatus).filter(
    (v) => v === "verified"
  ).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <SkeletonLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Trust & Verification</Text>
          <Text style={styles.headerSubtitle}>
            Build trust with clients by verifying your credentials
          </Text>
        </View>

        {/* Trust Score */}
        <View style={styles.trustScoreCard}>
          <View style={styles.trustScoreLeft}>
            <Text style={styles.trustScoreValue}>{verifiedCount}</Text>
            <Text style={styles.trustScoreMax}>/ {TRUST_BADGES.length}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trustScoreTitle}>Trust Badges Earned</Text>
            <View style={styles.trustScoreBar}>
              <View
                style={[
                  styles.trustScoreBarFill,
                  {
                    width: `${(verifiedCount / TRUST_BADGES.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.trustScoreDesc}>
              More badges means higher visibility in search results
            </Text>
          </View>
        </View>

        {/* Badge Grid */}
        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.badgeGrid}>
          {TRUST_BADGES.map((badge) => {
            const status = verificationStatus[badge.id] || "not_started";
            return (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  { borderColor: getStatusColor(status) + "40" },
                ]}
              >
                <View
                  style={[
                    styles.badgeIconWrap,
                    { backgroundColor: getStatusBg(status) },
                  ]}
                >
                  <Ionicons
                    name={badge.icon}
                    size={24}
                    color={getStatusColor(status)}
                  />
                </View>
                <Text style={styles.badgeLabel}>{badge.label}</Text>
                <View
                  style={[
                    styles.badgeStatusPill,
                    { backgroundColor: getStatusBg(status) },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeStatusText,
                      { color: getStatusColor(status) },
                    ]}
                  >
                    {getStatusLabel(status)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Action Cards */}
        <Text style={styles.sectionTitle}>Verification Actions</Text>

        {/* Identity Verification */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View style={[styles.actionIconWrap, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="id-card-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Identity Verification</Text>
              <Text style={styles.actionCardDesc}>
                Verify your identity securely via Stripe
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, requestingIdentity && { opacity: 0.7 }]}
            onPress={handleIdentityVerification}
            disabled={
              requestingIdentity || verificationStatus.identity === "verified"
            }
            activeOpacity={0.8}
          >
            {requestingIdentity ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : verificationStatus.identity === "verified" ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.actionBtnText}>Verified</Text>
              </>
            ) : (
              <>
                <Ionicons name="open-outline" size={18} color={COLORS.white} />
                <Text style={styles.actionBtnText}>Verify Identity</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Background Check */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View
              style={[styles.actionIconWrap, { backgroundColor: "#f0fdf4" }]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={COLORS.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Background Check</Text>
              <Text style={styles.actionCardDesc}>
                Request a professional background check
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              verificationStatus.background === "pending" &&
                styles.actionBtnPending,
              verificationStatus.background === "verified" &&
                styles.actionBtnVerified,
              requestingBgCheck && { opacity: 0.7 },
            ]}
            onPress={handleBackgroundCheck}
            disabled={
              requestingBgCheck ||
              verificationStatus.background === "verified" ||
              verificationStatus.background === "pending"
            }
            activeOpacity={0.8}
          >
            {requestingBgCheck ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : verificationStatus.background === "verified" ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.actionBtnText}>Passed</Text>
              </>
            ) : verificationStatus.background === "pending" ? (
              <>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.actionBtnText}>In Review</Text>
              </>
            ) : (
              <>
                <Ionicons
                  name="shield-outline"
                  size={18}
                  color={COLORS.white}
                />
                <Text style={styles.actionBtnText}>Request Check</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* License Submission */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <View
              style={[styles.actionIconWrap, { backgroundColor: "#fffbeb" }]}
            >
              <Ionicons
                name="ribbon-outline"
                size={24}
                color={COLORS.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionCardTitle}>Professional License</Text>
              <Text style={styles.actionCardDesc}>
                Submit your license for verification
              </Text>
            </View>
          </View>
          {!showLicenseForm ? (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                verificationStatus.licensed === "verified" &&
                  styles.actionBtnVerified,
                verificationStatus.licensed === "pending" &&
                  styles.actionBtnPending,
              ]}
              onPress={() => setShowLicenseForm(true)}
              disabled={verificationStatus.licensed === "verified"}
              activeOpacity={0.8}
            >
              {verificationStatus.licensed === "verified" ? (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.actionBtnText}>Verified</Text>
                </>
              ) : verificationStatus.licensed === "pending" ? (
                <>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.actionBtnText}>In Review</Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.actionBtnText}>Submit License</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.licenseForm}>
              <Text style={styles.licenseLabel}>License Number *</Text>
              <TextInput
                style={styles.licenseInput}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="e.g., LC-123456"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.licenseLabel}>State</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => {
                  setShowStatePicker(!showStatePicker);
                  setShowTypePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerBtnText}>{licenseState}</Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
              {showStatePicker && (
                <ScrollView
                  style={styles.pickerScrollList}
                  nestedScrollEnabled
                >
                  {US_STATES.map((state) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.pickerItem,
                        state === licenseState && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setLicenseState(state);
                        setShowStatePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          state === licenseState && {
                            color: COLORS.primary,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={styles.licenseLabel}>License Type</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => {
                  setShowTypePicker(!showTypePicker);
                  setShowStatePicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerBtnText}>{licenseType}</Text>
                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
              {showTypePicker && (
                <View style={styles.pickerList}>
                  {LICENSE_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.pickerItem,
                        type === licenseType && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        setLicenseType(type);
                        setShowTypePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          type === licenseType && {
                            color: COLORS.primary,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.licenseFormButtons}>
                <TouchableOpacity
                  style={styles.licenseCancelBtn}
                  onPress={() => setShowLicenseForm(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.licenseCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.licenseSubmitBtn,
                    submittingLicense && { opacity: 0.7 },
                  ]}
                  onPress={handleLicenseSubmit}
                  disabled={submittingLicense}
                  activeOpacity={0.8}
                >
                  {submittingLicense ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Text style={styles.licenseSubmitBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  container: { padding: 20 },

  header: { marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.secondary },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 20,
  },

  // Trust Score
  trustScoreCard: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  trustScoreLeft: { flexDirection: "row", alignItems: "baseline" },
  trustScoreValue: {
    fontSize: 36,
    fontWeight: "800",
    color: COLORS.primary,
  },
  trustScoreMax: { fontSize: 16, fontWeight: "600", color: COLORS.muted },
  trustScoreTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 8,
  },
  trustScoreBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 6,
  },
  trustScoreBarFill: {
    height: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  trustScoreDesc: { fontSize: 12, color: COLORS.muted, lineHeight: 16 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 14,
  },

  // Badge Grid
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  badgeCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    ...shadows.sm,
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.secondary,
    textAlign: "center",
    marginBottom: 6,
  },
  badgeStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeStatusText: { fontSize: 11, fontWeight: "700" },

  // Action Cards
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  actionCardDesc: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  actionBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnPending: { backgroundColor: COLORS.warning },
  actionBtnVerified: { backgroundColor: COLORS.success },
  actionBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },

  // License Form
  licenseForm: { marginTop: 4 },
  licenseLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 12,
  },
  licenseInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.secondary,
  },
  pickerBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerBtnText: { fontSize: 16, color: COLORS.secondary },
  pickerList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: "hidden",
  },
  pickerScrollList: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  pickerItemActive: { backgroundColor: "#eff6ff" },
  pickerItemText: { fontSize: 15, color: COLORS.secondary },

  licenseFormButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  licenseCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  licenseCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.muted,
  },
  licenseSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  licenseSubmitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },
});

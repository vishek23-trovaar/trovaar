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
  Switch,
  Image,
  Platform,
  Share,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from '../../lib/theme';


type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface SettingsRowProps {
  icon: IoniconsName;
  label: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  isLast?: boolean;
  danger?: boolean;
}

function SettingsRow({ icon, label, onPress, rightElement, isLast, danger }: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIconWrap, danger && { backgroundColor: "#FEE2E2" }]}>
          <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
        </View>
        <Text style={[styles.settingsLabel, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      {rightElement ?? (
        <Ionicons name="chevron-forward" size={18} color={colors.border} />
      )}
    </TouchableOpacity>
  );
}

function SectionHeader({ title, danger }: { title: string; danger?: boolean }) {
  return (
    <Text style={[styles.sectionHeader, danger && { color: colors.danger }]}>
      {title}
    </Text>
  );
}

export default function ClientProfile() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creditBalance, setCreditBalance] = useState(0);
  const [referralCode, setReferralCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Track original values to detect changes
  const [originalName, setOriginalName] = useState("");
  const [originalPhone, setOriginalPhone] = useState("");
  const [originalLocation, setOriginalLocation] = useState("");

  const hasChanges =
    name !== originalName || phone !== originalPhone || location !== originalLocation;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api<{
          name: string;
          phone: string;
          location: string;
          credit_balance?: number;
          referral_code?: string;
          phone_verified?: boolean;
        }>("/api/auth/me");
        setName(data.name || "");
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setOriginalName(data.name || "");
        setOriginalPhone(data.phone || "");
        setOriginalLocation(data.location || "");
        setCreditBalance(data.credit_balance || 0);
        setReferralCode(data.referral_code || "");
        setPhoneVerified(data.phone_verified || false);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name, phone, location }),
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

  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      setUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append("avatar", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || "avatar.jpg",
        } as unknown as Blob);
        await api("/api/users/avatar", {
          method: "POST",
          headers: { "Content-Type": "multipart/form-data" },
          body: formData as unknown as BodyInit,
        });
        Alert.alert("Success", "Avatar updated successfully.");
        await refreshUser();
      } catch (err: unknown) {
        Alert.alert("Upload Failed", (err as Error).message || "Could not upload avatar.");
      } finally {
        setUploadingAvatar(false);
      }
    }
  }, []);

  const shareReferralCode = async () => {
    if (!referralCode) {
      Alert.alert("No Referral Code", "Your referral code is not available yet.");
      return;
    }
    try {
      await Share.share({
        message: `Join Trovaar and get $25 off your first service! Use my referral code: ${referralCode}\n\nhttps://trovaar.com/r/${referralCode}`,
      });
    } catch {
      /* ignore */
    }
  };

  const comingSoon = (feature: string) => () =>
    Alert.alert(feature, "Coming soon");

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => Alert.alert("Delete Account", "Coming soon"),
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarBig}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color={colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{user?.name || "User"}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.clientBadge}>
              <Text style={styles.clientBadgeText}>Client</Text>
            </View>
          </View>

          {user?.id && (
            <Text style={styles.accountNumber}>Account: {user.id.slice(0, 8).toUpperCase()}</Text>
          )}
        </View>

        {/* Credit Balance & Referral */}
        <View style={styles.infoCardsRow}>
          <View style={styles.infoCard}>
            <Ionicons name="wallet-outline" size={22} color={colors.success} />
            <Text style={styles.infoCardValue}>${creditBalance.toFixed(2)}</Text>
            <Text style={styles.infoCardLabel}>Credit Balance</Text>
          </View>
          <TouchableOpacity style={styles.infoCard} onPress={shareReferralCode} activeOpacity={0.7}>
            <Ionicons name="gift-outline" size={22} color={colors.primaryLight} />
            <Text style={styles.infoCardValue}>{referralCode || "---"}</Text>
            <Text style={styles.infoCardLabel}>Referral Code</Text>
            {referralCode ? (
              <View style={styles.shareChip}>
                <Ionicons name="share-outline" size={12} color={colors.primaryLight} />
                <Text style={styles.shareChipText}>Share</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* Phone Verification Status */}
        <View style={styles.verificationCard}>
          <View style={styles.verificationRow}>
            <Ionicons
              name={phoneVerified ? "checkmark-circle" : "alert-circle-outline"}
              size={20}
              color={phoneVerified ? colors.success : "#d97706"}
            />
            <Text style={styles.verificationLabel}>Phone Verification</Text>
            <View style={[styles.verificationBadge, phoneVerified ? styles.verificationBadgeVerified : styles.verificationBadgePending]}>
              <Text style={[styles.verificationBadgeText, phoneVerified ? { color: colors.success } : { color: "#d97706" }]}>
                {phoneVerified ? "Verified" : "Pending"}
              </Text>
            </View>
          </View>
          {!phoneVerified && (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={comingSoon("Phone Verification")}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyBtnText}>Verify Now</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* Personal Information */}
        <SectionHeader title="Personal Information" />
        <View style={styles.settingsCard}>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingsLabel}>Full Name</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={colors.border}
            />
          </View>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="mail-outline" size={20} color={colors.muted} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.muted }]}>Email</Text>
            </View>
            <Text style={styles.inlineValue}>{user?.email}</Text>
          </View>
          <View style={[styles.settingsRow, styles.settingsRowBorder]}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="call-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingsLabel}>Phone</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone"
              placeholderTextColor={colors.border}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <View style={styles.settingsIconWrap}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.settingsLabel}>Location</Text>
            </View>
            <TextInput
              style={styles.inlineInput}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              placeholderTextColor={colors.border}
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
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.white}
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
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={colors.white}
              />
            }
          />
        </View>

        {/* Services */}
        <SectionHeader title="Services" />
        <View style={styles.settingsCard}>
          <SettingsRow icon="copy-outline" label="Job Templates" onPress={() => router.push("/(client)/templates")} />
          <SettingsRow icon="people-outline" label="Refer & Earn" onPress={() => router.push("/(client)/referral")} />
          <SettingsRow icon="star-outline" label="My Plan" onPress={() => router.push("/(client)/subscriptions")} isLast />
        </View>

        {/* Account */}
        <SectionHeader title="Account" />
        <View style={styles.settingsCard}>
          <SettingsRow icon="lock-closed-outline" label="Change Password" onPress={comingSoon("Change Password")} />
          <SettingsRow icon="card-outline" label="Payment Methods" onPress={comingSoon("Payment Methods")} />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy Policy" onPress={comingSoon("Privacy Policy")} />
          <SettingsRow icon="document-text-outline" label="Terms of Service" onPress={comingSoon("Terms of Service")} isLast />
        </View>

        {/* Danger Zone */}
        <SectionHeader title="Danger Zone" danger />
        <View style={styles.settingsCard}>
          <SettingsRow icon="trash-outline" label="Delete Account" onPress={handleDeleteAccount} isLast danger />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
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
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  container: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.white },

  // Profile Header
  profileHeader: { alignItems: "center", paddingTop: 24, paddingBottom: 20, backgroundColor: colors.white },
  avatarContainer: { position: "relative", marginBottom: 16 },
  avatarBig: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { fontSize: 32, fontWeight: "800", color: colors.white },
  cameraIcon: {
    position: "absolute", bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: colors.white,
  },
  profileName: { fontSize: 22, fontWeight: "700", color: colors.text, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  clientBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20,
  },
  clientBadgeText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  accountNumber: { fontSize: 12, color: colors.muted, marginTop: 4 },

  // Info Cards Row
  infoCardsRow: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: radius.lg,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  infoCardValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },
  infoCardLabel: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  shareChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  shareChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primaryLight,
  },

  // Verification Card
  verificationCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verificationLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    flex: 1,
  },
  verificationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  verificationBadgeVerified: {
    backgroundColor: "#D1FAE5",
  },
  verificationBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  verificationBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  verifyBtn: {
    marginTop: 10,
    backgroundColor: "#DBEAFE",
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: "center",
  },
  verifyBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryLight,
  },

  divider: { height: 8, backgroundColor: colors.surface },

  // Section Headers
  sectionHeader: {
    fontSize: 13, fontWeight: "600", color: colors.muted,
    textTransform: "uppercase", letterSpacing: 0.5,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  settingsRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 16,
    minHeight: 52,
  },
  settingsRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingsRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  settingsIconWrap: {
    width: 32, height: 32, borderRadius: radius.md,
    backgroundColor: "#DBEAFE",
    justifyContent: "center", alignItems: "center",
    marginRight: 12,
  },
  settingsLabel: { fontSize: 16, color: colors.text },

  // Inline inputs
  inlineInput: {
    fontSize: 16, color: colors.text,
    textAlign: "right", flex: 0, minWidth: 120,
    paddingVertical: 0,
  },
  inlineValue: { fontSize: 16, color: colors.muted, textAlign: "right" },

  // Logout
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    marginHorizontal: 16, marginTop: 24,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.white,
    gap: 8,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: "600" },

  // Sticky Save
  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: Platform.OS === "ios" ? 34 : 16, paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});

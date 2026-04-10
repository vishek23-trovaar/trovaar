import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const COLORS = {
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  primaryBg: "#eff6ff",
  secondary: "#1e293b",
  muted: "#64748b",
  mutedLight: "#94a3b8",
  surface: "#f8fafc",
  border: "#e2e8f0",
  white: "#ffffff",
  success: "#16a34a",
  successBg: "#f0fdf4",
  danger: "#dc2626",
  warning: "#d97706",
  warningBg: "#fffbeb",
  purple: "#7c3aed",
  purpleBg: "#f5f3ff",
};

interface ReferralFriend {
  id: string;
  name: string;
  email: string;
  status: "signed_up" | "first_job_done";
  referred_at: string;
  earned?: number;
}

interface ReferralData {
  referralCode: string;
  totalReferred: number;
  totalEarned: number;
  pendingRewards: number;
  referrals: ReferralFriend[];
}

// Skeleton pulse
function SkeletonPulse({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}) {
  const animValue = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animValue]);
  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: "#e2e8f0", opacity: animValue },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={{ padding: 16, gap: 16 }}>
      <SkeletonPulse width="100%" height={200} borderRadius={20} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <SkeletonPulse key={i} width={100} height={80} borderRadius={16} style={{ flex: 1 }} />
        ))}
      </View>
      <SkeletonPulse width="100%" height={52} borderRadius={14} />
      <SkeletonPulse width="100%" height={52} borderRadius={14} />
    </View>
  );
}

function StatCard({
  value,
  label,
  icon,
  color,
  bg,
}: {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FriendRow({ friend }: { friend: ReferralFriend }) {
  const isDone = friend.status === "first_job_done";
  return (
    <View style={styles.friendRow}>
      <View style={styles.friendAvatar}>
        <Text style={styles.friendAvatarText}>
          {friend.name?.charAt(0)?.toUpperCase() || "?"}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.name}</Text>
        <Text style={styles.friendEmail} numberOfLines={1}>{friend.email}</Text>
      </View>
      <View style={[styles.statusPill, isDone ? styles.statusPillDone : styles.statusPillPending]}>
        <Ionicons
          name={isDone ? "checkmark-circle" : "time-outline"}
          size={13}
          color={isDone ? COLORS.success : COLORS.warning}
        />
        <Text style={[styles.statusPillText, { color: isDone ? COLORS.success : COLORS.warning }]}>
          {isDone ? "Earned $25" : "Signed Up"}
        </Text>
      </View>
    </View>
  );
}

export default function ReferralScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferrals = useCallback(async () => {
    try {
      setError(null);
      const { data: res } = await api<ReferralData>("/api/referrals");
      setData(res);
    } catch (err: unknown) {
      setData(null);
      setError((err as Error).message || "Could not load referral data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReferrals();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!data?.referralCode) return;
    try {
      await Share.share({
        message: `Use my referral code ${data.referralCode} to sign up and get $10 credit on your first job! Download the app and use code: ${data.referralCode}`,
        title: "Join me on Trovaar",
      });
    } catch {
      // User dismissed share sheet — no action needed
    }
  };

  const handleCopy = async () => {
    if (!data?.referralCode) return;
    setCopying(true);
    try {
      // Use Share as fallback since expo-clipboard may not be installed
      await Share.share({ message: data.referralCode });
    } catch {
      Alert.alert("Your Code", data.referralCode);
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
        </View>
        <LoadingSkeleton />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Refer & Earn</Text>
        </View>
        <View style={styles.emptyFriends}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
          <Text style={[styles.emptyFriendsText, { color: COLORS.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.shareBtn, { alignSelf: "center", flex: 0, paddingHorizontal: 24, marginTop: 8 }]}
            onPress={() => { setLoading(true); fetchReferrals(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.shareBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const heroHeader = (
    <View>
      {/* Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Ionicons name="gift-outline" size={14} color={COLORS.primary} />
          <Text style={styles.heroBadgeText}>Referral Program</Text>
        </View>

        <Text style={styles.heroTitle}>Invite friends,{"\n"}earn rewards</Text>
        <Text style={styles.heroSub}>
          Share your code and earn{" "}
          <Text style={{ fontWeight: "800", color: COLORS.secondary }}>$25</Text> when a friend completes their first job.{"\n"}
          Your friend gets{" "}
          <Text style={{ fontWeight: "800", color: COLORS.secondary }}>$10 credit</Text> just for signing up.
        </Text>

        {/* Referral Code Display */}
        <TouchableOpacity
          style={styles.codeBox}
          onPress={handleCopy}
          activeOpacity={0.75}
        >
          <View style={styles.codeLeft}>
            <Text style={styles.codeLabel}>Your Referral Code</Text>
            <Text style={styles.codeValue}>{data?.referralCode || "—"}</Text>
          </View>
          <View style={styles.copyIconWrap}>
            <Ionicons
              name={copying ? "checkmark" : "copy-outline"}
              size={20}
              color={copying ? COLORS.success : COLORS.primary}
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={String(data?.totalReferred ?? 0)}
          label="Referred"
          icon="people-outline"
          color={COLORS.primary}
          bg={COLORS.primaryBg}
        />
        <StatCard
          value={`$${data?.totalEarned ?? 0}`}
          label="Earned"
          icon="cash-outline"
          color={COLORS.success}
          bg={COLORS.successBg}
        />
        <StatCard
          value={`$${data?.pendingRewards ?? 0}`}
          label="Pending"
          icon="hourglass-outline"
          color={COLORS.warning}
          bg={COLORS.warningBg}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={18} color={COLORS.white} />
          <Text style={styles.shareBtnText}>Share Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.8}>
          <Ionicons
            name={copying ? "checkmark-outline" : "copy-outline"}
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.copyBtnText}>{copying ? "Copied!" : "Copy Code"}</Text>
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>How it works</Text>
        <View style={styles.howSteps}>
          {[
            { icon: "share-outline" as const,           step: "1", text: "Share your referral code with friends" },
            { icon: "person-add-outline" as const,       step: "2", text: "Friend signs up — they get $10 credit" },
            { icon: "briefcase-outline" as const,        step: "3", text: "Friend completes first job" },
            { icon: "wallet-outline" as const,           step: "4", text: "You earn $25 in account credit" },
          ].map((s) => (
            <View key={s.step} style={styles.howStep}>
              <View style={styles.howStepNum}>
                <Text style={styles.howStepNumText}>{s.step}</Text>
              </View>
              <View style={styles.howStepIconWrap}>
                <Ionicons name={s.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.howStepText}>{s.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Friends list header */}
      {(data?.referrals?.length ?? 0) > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Referrals</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{data?.referrals?.length}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const referrals = data?.referrals ?? [];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
      </View>

      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListHeaderComponent={heroHeader}
        contentContainerStyle={[
          styles.listContent,
          referrals.length === 0 && { paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <FriendRow friend={item} />}
        ListEmptyComponent={
          <View style={styles.emptyFriends}>
            <Ionicons name="people-outline" size={32} color={COLORS.mutedLight} />
            <Text style={styles.emptyFriendsText}>
              No referrals yet. Share your code to get started!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.secondary,
  },

  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 22,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryBg,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 14,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.secondary,
    lineHeight: 33,
    marginBottom: 10,
  },
  heroSub: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 21,
    marginBottom: 20,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primaryBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary + "40",
    borderStyle: "dashed",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  codeLeft: { gap: 4 },
  codeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primaryLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
    letterSpacing: 3,
  },
  copyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    textAlign: "center",
  },

  // Action buttons
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  copyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  copyBtnText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "700",
  },

  // How it works
  howCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  howTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 14,
  },
  howSteps: { gap: 12 },
  howStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  howStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  howStepNumText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.white,
  },
  howStepIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  howStepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  sectionCount: {
    backgroundColor: COLORS.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  // Friend rows
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  friendAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  friendInfo: { flex: 1 },
  friendName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusPillDone: { backgroundColor: COLORS.successBg },
  statusPillPending: { backgroundColor: COLORS.warningBg },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  // Empty friends
  emptyFriends: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyFriendsText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});

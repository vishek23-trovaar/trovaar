import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Conversation } from "@/lib/types";
import { colors, typography, spacing, radius, shadows } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryLight: colors.primaryLight,
  secondary: colors.text,
  muted: colors.muted,
  surface: colors.surface,
  border: colors.border,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

type TabMode = "direct" | "qa";

interface Discussion {
  id: string;
  job_id: string;
  job_title: string;
  parent_id: string | null;
  content: string;
  display_name: string;
  user_role: "consumer" | "contractor";
  is_mine: boolean;
  is_owner: boolean;
  created_at: string;
  reply_count?: number;
}

interface QAThread {
  job_id: string;
  job_title: string;
  last_question: string;
  last_activity: string;
  total_questions: number;
  my_questions: number;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function SkeletonRow({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, delay, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#1A1B1F" }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: "50%", height: 14, borderRadius: 7, backgroundColor: "#1A1B1F" }} />
        <View style={{ width: "70%", height: 12, borderRadius: 6, backgroundColor: "#1A1B1F" }} />
        <View style={{ width: "40%", height: 12, borderRadius: 6, backgroundColor: "#1A1B1F" }} />
      </View>
    </Animated.View>
  );
}

export default function ContractorMessages() {
  const router = useRouter();
  const [tab, setTab] = useState<TabMode>("direct");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [qaThreads, setQaThreads] = useState<QAThread[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qaLoading, setQaLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const fetchConvos = useCallback(async () => {
    try {
      const { data } = await api<{ conversations: Conversation[] }>("/api/messages");
      setConvos(data.conversations || []);
      setError(null);
    } catch (err) {
      setError("Failed to load messages");
      if (__DEV__) console.error(err);
    }
    setLoading(false);
  }, []);

  const fetchQAThreads = useCallback(async () => {
    try {
      // Fetch all jobs the contractor has interacted with via Q&A
      const { data } = await api<{ conversations: Conversation[] }>("/api/messages");
      // Also fetch discussions from jobs they've bid on or viewed
      const { data: bidsData } = await api<{ bids: { job_id: string; job_title?: string }[] }>("/api/contractor/bids");
      const bids = bidsData.bids || [];

      // Fetch discussions for each unique job
      const jobIds = [...new Set(bids.map((b) => b.job_id))];
      const threads: QAThread[] = [];

      await Promise.all(
        jobIds.slice(0, 20).map(async (jobId) => {
          try {
            const { data: discData } = await api<{ discussions: Discussion[] }>(`/api/jobs/${jobId}/discussions`);
            const discussions = discData.discussions || [];
            if (discussions.length === 0) return;

            const topLevel = discussions.filter((d) => !d.parent_id);
            const myQuestions = discussions.filter((d) => d.is_mine);
            const lastActivity = discussions.reduce((latest, d) =>
              new Date(d.created_at) > new Date(latest) ? d.created_at : latest
            , discussions[0].created_at);

            const bid = bids.find((b) => b.job_id === jobId);
            threads.push({
              job_id: jobId,
              job_title: bid?.job_title || `Job ${jobId.slice(0, 8)}`,
              last_question: topLevel[topLevel.length - 1]?.content || discussions[0].content,
              last_activity: lastActivity,
              total_questions: topLevel.length,
              my_questions: myQuestions.length,
            });
          } catch {
            /* ignore individual job fetch errors */
          }
        })
      );

      threads.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      setQaThreads(threads);
    } catch (err) {
      if (__DEV__) console.error("[QA threads]", err);
    }
    setQaLoading(false);
  }, []);

  useEffect(() => {
    fetchConvos();
    fetchQAThreads();
  }, [fetchConvos, fetchQAThreads]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchConvos(), fetchQAThreads()]);
    setRefreshing(false);
  };

  const filteredConvos = convos.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.other_user_name?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.last_message?.toLowerCase().includes(q)
    );
  });

  const filteredQA = qaThreads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.job_title?.toLowerCase().includes(q) ||
      t.last_question?.toLowerCase().includes(q)
    );
  });

  const totalUnread = convos.reduce((sum, c) => sum + (c.unread_count > 0 ? 1 : 0), 0);

  const renderConvo = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push(`/(contractor)/chat/${item.job_id}`)}
      >
        <View style={[styles.avatar, hasUnread && styles.avatarUnread]}>
          <Text style={styles.avatarText}>
            {item.other_user_name?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {item.other_user_name}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {timeAgo(item.last_message_at)}
            </Text>
          </View>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {item.job_title}
          </Text>
          <View style={styles.previewRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewBold]}
              numberOfLines={1}
            >
              {item.last_message}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#8A8F98" />
      </TouchableOpacity>
    );
  };

  const renderQAThread = ({ item }: { item: QAThread }) => {
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => router.push(`/(contractor)/job/${item.job_id}`)}
      >
        <View style={styles.qaAvatar}>
          <Ionicons name="chatbubbles-outline" size={22} color="#93C5FD" />
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.job_title}
            </Text>
            <Text style={styles.time}>{timeAgo(item.last_activity)}</Text>
          </View>
          <View style={styles.qaMetaRow}>
            <View style={styles.qaBadge}>
              <Text style={styles.qaBadgeText}>
                {item.total_questions} {item.total_questions === 1 ? "question" : "questions"}
              </Text>
            </View>
            {item.my_questions > 0 && (
              <View style={[styles.qaBadge, styles.qaBadgeMine]}>
                <Text style={[styles.qaBadgeText, styles.qaBadgeTextMine]}>
                  {item.my_questions} by you
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {item.last_question}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#8A8F98" />
      </TouchableOpacity>
    );
  };

  if (error && tab === "direct") {
    return (
      <Animated.View style={[styles.screen, { justifyContent: "center", alignItems: "center", opacity: screenOpacity }]}>
        <Text style={{ color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 24 }}>{error}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <View style={styles.segmentControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === "direct" && styles.segmentBtnActive]}
            onPress={() => setTab("direct")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === "direct" ? "chatbubble" : "chatbubble-outline"}
              size={16}
              color={tab === "direct" ? "#fff" : COLORS.muted}
            />
            <Text style={[styles.segmentText, tab === "direct" && styles.segmentTextActive]}>
              Messages
            </Text>
            {totalUnread > 0 && (
              <View style={[styles.segmentBadge, tab === "direct" && styles.segmentBadgeActive]}>
                <Text style={[styles.segmentBadgeText, tab === "direct" && styles.segmentBadgeTextActive]}>
                  {totalUnread}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, tab === "qa" && styles.segmentBtnActiveQA]}
            onPress={() => setTab("qa")}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab === "qa" ? "chatbubbles" : "chatbubbles-outline"}
              size={16}
              color={tab === "qa" ? "#fff" : COLORS.muted}
            />
            <Text style={[styles.segmentText, tab === "qa" && styles.segmentTextActive]}>
              Job Q&A
            </Text>
            {qaThreads.length > 0 && (
              <View style={[styles.segmentBadge, tab === "qa" && styles.segmentBadgeActiveQA]}>
                <Text style={[styles.segmentBadgeText, tab === "qa" && styles.segmentBadgeTextActive]}>
                  {qaThreads.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8A8F98" />
          <TextInput
            style={styles.searchInput}
            placeholder={tab === "direct" ? "Search conversations..." : "Search Q&A threads..."}
            placeholderTextColor="#8A8F98"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#8A8F98" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {tab === "direct" ? (
        /* Direct Messages Tab */
        loading ? (
          <View>
            <SkeletonRow delay={0} />
            <SkeletonRow delay={150} />
            <SkeletonRow delay={300} />
            <SkeletonRow delay={450} />
          </View>
        ) : (
          <FlatList
            data={filteredConvos}
            keyExtractor={(c) => c.job_id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
            renderItem={renderConvo}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>{"\uD83D\uDCAC"}</Text>
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>
                  {search
                    ? "No conversations match your search"
                    : "Direct messages from clients will appear here after your bid is accepted"}
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )
      ) : (
        /* Job Q&A Tab */
        qaLoading ? (
          <View>
            <SkeletonRow delay={0} />
            <SkeletonRow delay={150} />
            <SkeletonRow delay={300} />
          </View>
        ) : (
          <FlatList
            data={filteredQA}
            keyExtractor={(t) => t.job_id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
            renderItem={renderQAThread}
            ListHeaderComponent={
              <View style={styles.qaInfo}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.muted} />
                <Text style={styles.qaInfoText}>
                  Public Q&A threads from jobs you've bid on. Tap to view the job and join the discussion.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>{"\u2753"}</Text>
                <Text style={styles.emptyTitle}>No Q&A threads</Text>
                <Text style={styles.emptySubtitle}>
                  {search
                    ? "No threads match your search"
                    : "Questions about jobs you've bid on will show up here"}
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },

  // Segment Control
  segmentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
  },
  segmentBtnActiveQA: {
    backgroundColor: "#93C5FD",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
  },
  segmentTextActive: {
    color: "#fff",
  },
  segmentBadge: {
    backgroundColor: "#1A1B1F",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: "center",
  },
  segmentBadgeActive: {
    backgroundColor: "#18191B",
  },
  segmentBadgeActiveQA: {
    backgroundColor: "#18191B",
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
  },
  segmentBadgeTextActive: {
    color: "#fff",
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.secondary,
  },

  // Conversation rows
  row: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#23252A",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(59,130,246,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarUnread: {
    backgroundColor: "rgba(59,130,246,0.14)",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.secondary,
    flex: 1,
    marginRight: 8,
  },
  nameBold: { fontWeight: "700" },
  time: { fontSize: 12, color: "#8A8F98" },
  timeUnread: { color: COLORS.primary, fontWeight: "600" },
  jobTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  preview: {
    fontSize: 13,
    color: "#8A8F98",
    flex: 1,
  },
  previewBold: { color: COLORS.secondary, fontWeight: "500" },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Q&A specific
  qaAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#16181C",
    justifyContent: "center",
    alignItems: "center",
  },
  qaMetaRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  qaBadge: {
    backgroundColor: "#16181C",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qaBadgeMine: {
    backgroundColor: "rgba(52,211,153,0.14)",
  },
  qaBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#93C5FD",
  },
  qaBadgeTextMine: {
    color: "#6EE7B7",
  },
  qaInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#08090A",
    borderBottomWidth: 1,
    borderColor: "#23252A",
  },
  qaInfoText: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    flex: 1,
  },

  // Empty states
  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.secondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: "#8A8F98", textAlign: "center", paddingHorizontal: 40 },
});

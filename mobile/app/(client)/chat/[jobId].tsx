import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Message } from "@/lib/types";
import { colors, shadows, radius } from "../../../lib/theme";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREEN_WIDTH = Dimensions.get("window").width;
const BUBBLE_MAX_WIDTH = SCREEN_WIDTH * 0.78;
const AVATAR_SIZE = 32;
const CLUSTER_GAP_MS = 2 * 60 * 1000; // 2 minutes
const POLL_INTERVAL = 5000;

const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#059669",
  "#D97706", "#DC2626", "#4F46E5", "#0891B2",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  if (isSameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatClusterTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Types for grouped / decorated messages
// ---------------------------------------------------------------------------

type ListItem =
  | { type: "date-separator"; key: string; label: string }
  | {
      type: "message";
      key: string;
      msg: Message;
      isMine: boolean;
      isFirstInCluster: boolean;
      isLastInCluster: boolean;
      showTimestamp: boolean;
      showAvatar: boolean;
    };

// ---------------------------------------------------------------------------
// Build display list with date separators and cluster metadata
// ---------------------------------------------------------------------------

function buildDisplayList(messages: Message[], userId?: string): ListItem[] {
  if (messages.length === 0) return [];

  const items: ListItem[] = [];
  let prevDate: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at);
    const dateKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;

    // Insert date separator when day changes
    if (dateKey !== prevDate) {
      items.push({
        type: "date-separator",
        key: `sep-${dateKey}`,
        label: formatDateSeparator(msgDate),
      });
      prevDate = dateKey;
    }

    const isMine = msg.sender_id === userId;
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const sameSenderAsPrev =
      prev &&
      prev.sender_id === msg.sender_id &&
      Math.abs(new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < CLUSTER_GAP_MS;

    const sameSenderAsNext =
      next &&
      next.sender_id === msg.sender_id &&
      Math.abs(new Date(next.created_at).getTime() - new Date(msg.created_at).getTime()) < CLUSTER_GAP_MS;

    const isFirstInCluster = !sameSenderAsPrev;
    const isLastInCluster = !sameSenderAsNext;

    items.push({
      type: "message",
      key: msg.id,
      msg,
      isMine,
      isFirstInCluster,
      isLastInCluster,
      showTimestamp: isLastInCluster,
      showAvatar: isLastInCluster && !isMine,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// AnimatedBubble wrapper
// ---------------------------------------------------------------------------

function AnimatedBubble({ children, isNew }: { children: React.ReactNode; isNew: boolean }) {
  const scale = useRef(new Animated.Value(isNew ? 0.85 : 1)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          tension: 120,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNew, scale, opacity]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Avatar component
// ---------------------------------------------------------------------------

function Avatar({ name }: { name?: string }) {
  const bgColor = getAvatarColor(name || "?");
  return (
    <View style={[styles.avatar, { backgroundColor: bgColor }]}>
      <Text style={styles.avatarText}>{getInitial(name)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Read receipt checkmarks
// ---------------------------------------------------------------------------

function ReadReceipt() {
  return (
    <View style={styles.readReceipt}>
      <Ionicons name="checkmark-done" size={14} color={colors.primary} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyChat() {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="chatbubbles" size={40} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>Start the Conversation</Text>
      <Text style={styles.emptySub}>
        Send a message to your contractor to discuss the details of your job.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ChatThread() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [jobTitle, setJobTitle] = useState("Chat");
  const [otherName, setOtherName] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const prevCountRef = useRef(0);

  // -----------------------------------------------------------------------
  // Fetch messages
  // -----------------------------------------------------------------------

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await api<Message[]>(`/api/jobs/${jobId}/messages`);
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
    } catch (err) {
      if (__DEV__) console.error("[Chat] fetch error:", err);
    }
    setLoading(false);
  }, [jobId]);

  // -----------------------------------------------------------------------
  // Fetch job info for header
  // -----------------------------------------------------------------------

  useEffect(() => {
    const fetchJobInfo = async () => {
      try {
        const { data } = await api<{
          title: string;
          consumer_name?: string;
          contractor_name?: string;
        }>(`/api/jobs/${jobId}`);
        setJobTitle(data.title || "Chat");
        // Client sees the contractor's name
        setOtherName(data.contractor_name || "Contractor");
      } catch {
        // keep defaults
      }
    };
    fetchJobInfo();
  }, [jobId]);

  // -----------------------------------------------------------------------
  // Polling
  // -----------------------------------------------------------------------

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // -----------------------------------------------------------------------
  // Derive display list
  // -----------------------------------------------------------------------

  const displayList = useMemo(() => {
    const list = buildDisplayList(messages, user?.id);
    prevCountRef.current = messages.length;
    return list;
  }, [messages, user?.id]);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------

  const sendMessage = async () => {
    const content = inputText.trim();
    if (!content || sending) return;

    setSending(true);
    setInputText("");

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      job_id: jobId!,
      sender_id: user?.id || "",
      content,
      created_at: new Date().toISOString(),
      sender_name: user?.name,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await api(`/api/jobs/${jobId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      await fetchMessages();
    } catch (err) {
      if (__DEV__) console.error("[Chat] send error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInputText(content);
    }
    setSending(false);
  };

  // -----------------------------------------------------------------------
  // Render items
  // -----------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item, index }: { item: ListItem; index: number }) => {
      if (item.type === "date-separator") {
        return (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateLabel}>{item.label}</Text>
            <View style={styles.dateLine} />
          </View>
        );
      }

      const {
        msg,
        isMine,
        isFirstInCluster,
        isLastInCluster,
        showTimestamp,
        showAvatar,
      } = item;

      const isOptimistic = msg.id.startsWith("temp-");
      const isNew = index === displayList.length - 1 && isOptimistic;

      // Bubble border radius: rounded top when first, rounded bottom when last
      // "Tail" on last message via smaller radius on the tail corner
      const bubbleRadius = {
        borderTopLeftRadius: isMine ? 20 : isFirstInCluster ? 20 : 6,
        borderTopRightRadius: isMine ? (isFirstInCluster ? 20 : 6) : 20,
        borderBottomLeftRadius: isMine ? 20 : isLastInCluster ? 4 : 6,
        borderBottomRightRadius: isMine ? (isLastInCluster ? 4 : 6) : 20,
      };

      return (
        <AnimatedBubble isNew={isNew}>
          <View
            style={[
              styles.messageRow,
              isMine ? styles.messageRowRight : styles.messageRowLeft,
              !isLastInCluster && { marginBottom: 2 },
              isLastInCluster && { marginBottom: 2 },
            ]}
          >
            {/* Avatar spacer or actual avatar */}
            {!isMine && (
              <View style={styles.avatarColumn}>
                {showAvatar ? (
                  <Avatar name={msg.sender_name} />
                ) : (
                  <View style={{ width: AVATAR_SIZE }} />
                )}
              </View>
            )}

            {/* Bubble */}
            <View style={styles.bubbleColumn}>
              {isMine ? (
                <LinearGradient
                  colors={["#2563EB", "#1D4ED8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, bubbleRadius]}
                >
                  <Text style={styles.bubbleTextMine}>{msg.content}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.bubble, styles.bubbleTheirs, bubbleRadius]}>
                  <Text style={styles.bubbleTextTheirs}>{msg.content}</Text>
                </View>
              )}

              {/* Timestamp + read receipt row */}
              {showTimestamp && (
                <View
                  style={[
                    styles.metaRow,
                    isMine ? styles.metaRowRight : styles.metaRowLeft,
                  ]}
                >
                  <Text style={styles.timestamp}>
                    {formatClusterTime(msg.created_at)}
                  </Text>
                  {isMine && !isOptimistic && <ReadReceipt />}
                  {isMine && isOptimistic && (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={colors.muted}
                      style={{ marginLeft: 3 }}
                    />
                  )}
                </View>
              )}
            </View>

            {/* Right-side spacer for alignment on their messages */}
            {isMine && <View style={{ width: AVATAR_SIZE + 8 }} />}
          </View>
        </AnimatedBubble>
      );
    },
    [displayList.length],
  );

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const hasText = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ---- Custom Header ---- */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {otherName ? (
            <View style={styles.headerAvatarRow}>
              <View
                style={[
                  styles.headerAvatar,
                  { backgroundColor: getAvatarColor(otherName) },
                ]}
              >
                <Text style={styles.headerAvatarText}>
                  {getInitial(otherName)}
                </Text>
              </View>
              <View style={styles.headerTextColumn}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {otherName}
                </Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {jobTitle}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.headerName} numberOfLines={1}>
              {jobTitle}
            </Text>
          )}
        </View>

        {/* Spacer to balance back button */}
        <View style={{ width: 40 }} />
      </View>

      {/* ---- Messages ---- */}
      <FlatList
        ref={flatListRef}
        data={displayList}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.messagesList,
          displayList.length === 0 && styles.center,
        ]}
        onContentSizeChange={() => {
          if (displayList.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        onLayout={() => {
          if (displayList.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
        ListEmptyComponent={<EmptyChat />}
        showsVerticalScrollIndicator={false}
      />

      {/* ---- Input Bar ---- */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !hasText && styles.sendBtnHidden]}
            onPress={sendMessage}
            disabled={!hasText || sending}
            activeOpacity={0.7}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // -- Header --
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  headerBack: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.white,
  },
  headerTextColumn: {
    flexShrink: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.secondary,
  },
  headerSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },

  // -- Messages list --
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    flexGrow: 1,
  },

  // -- Date separator --
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginHorizontal: 12,
  },

  // -- Message row --
  messageRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },

  // -- Avatar --
  avatarColumn: {
    width: AVATAR_SIZE,
    marginRight: 8,
    justifyContent: "flex-end",
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },

  // -- Bubble --
  bubbleColumn: {
    maxWidth: BUBBLE_MAX_WIDTH,
    flexShrink: 1,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleTheirs: {
    backgroundColor: "#F1F5F9",
  },
  bubbleTextMine: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.white,
  },
  bubbleTextTheirs: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },

  // -- Meta (timestamp + receipt) --
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  metaRowLeft: {
    justifyContent: "flex-start",
  },
  metaRowRight: {
    justifyContent: "flex-end",
  },
  timestamp: {
    fontSize: 11,
    color: colors.muted,
  },
  readReceipt: {
    marginLeft: 3,
  },

  // -- Empty state --
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.secondary,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },

  // -- Input bar --
  inputBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    minHeight: 44,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendBtnHidden: {
    opacity: 0,
    width: 0,
    overflow: "hidden",
  },
});

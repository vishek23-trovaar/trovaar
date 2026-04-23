import { useState, useEffect, useCallback, useRef } from "react";
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
  Easing,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Message } from "@/lib/types";
import Skeleton from "@/components/ui/Skeleton";
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  statusColors,
} from "../../../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobInfo {
  title: string;
  status: string;
  consumer_name?: string;
  contractor_name?: string;
}

interface DisplayItem {
  type: "date-separator" | "message" | "typing";
  key: string;
  label?: string;
  message?: Message;
  isMine?: boolean;
  showAvatar?: boolean;
  showTimestamp?: boolean;
  timestamp?: string;
  isLastInCluster?: boolean;
  isFirstInCluster?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function withinTwoMinutes(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 120000;
}

function getInitial(name?: string): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Build display list: messages grouped into clusters with date separators
// ---------------------------------------------------------------------------

function buildDisplayItems(
  messages: Message[],
  myId: string,
  showTyping: boolean
): DisplayItem[] {
  if (messages.length === 0) return [];

  const items: DisplayItem[] = [];
  let lastDateStr = "";

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at);
    const dateKey = `${msgDate.getFullYear()}-${msgDate.getMonth()}-${msgDate.getDate()}`;

    // Date separator
    if (dateKey !== lastDateStr) {
      items.push({
        type: "date-separator",
        key: `sep-${dateKey}`,
        label: formatDateSeparator(msgDate),
      });
      lastDateStr = dateKey;
    }

    const isMine = msg.sender_id === myId;
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const sameSenderAsPrev =
      prev &&
      prev.sender_id === msg.sender_id &&
      withinTwoMinutes(prev.created_at, msg.created_at);
    const sameSenderAsNext =
      next &&
      next.sender_id === msg.sender_id &&
      withinTwoMinutes(msg.created_at, next.created_at);

    const isFirstInCluster = !sameSenderAsPrev;
    const isLastInCluster = !sameSenderAsNext;

    // Show avatar only for first message in a cluster from the other person
    const showAvatar = !isMine && isFirstInCluster;

    // Show timestamp only for last message in a cluster
    const showTimestamp = isLastInCluster;

    items.push({
      type: "message",
      key: msg.id,
      message: msg,
      isMine,
      showAvatar,
      showTimestamp,
      timestamp: formatClusterTime(msg.created_at),
      isLastInCluster,
      isFirstInCluster,
    });
  }

  if (showTyping) {
    items.push({ type: "typing", key: "typing-indicator" });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Animated message wrapper
// ---------------------------------------------------------------------------

function AnimatedMessage({
  children,
  isMine,
}: {
  children: React.ReactNode;
  isMine: boolean;
}) {
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(isMine ? 0.92 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    >
      {children}
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator dots
// ---------------------------------------------------------------------------

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );
    };
    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 200);
    const a3 = animateDot(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.muted,
    marginHorizontal: 2,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 1],
    }),
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.avatarPlaceholder} />
      <View style={styles.typingBubble}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Read receipt checkmarks
// ---------------------------------------------------------------------------

function ReadReceipt({ isTemp }: { isTemp: boolean }) {
  return (
    <View style={styles.readReceipt}>
      {isTemp ? (
        <Ionicons name="checkmark" size={13} color={colors.muted} />
      ) : (
        <View style={styles.doubleCheck}>
          <Ionicons
            name="checkmark"
            size={13}
            color={colors.primaryLight}
            style={{ marginRight: -6 }}
          />
          <Ionicons name="checkmark" size={13} color={colors.primaryLight} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Avatar circle
// ---------------------------------------------------------------------------

function AvatarCircle({ name }: { name?: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitial(name)}</Text>
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
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCount = useRef(0);

  // Determine the other person's name from job info
  const otherPersonName =
    user?.role === "contractor"
      ? jobInfo?.consumer_name
      : jobInfo?.contractor_name;

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
        const { data } = await api<JobInfo>(`/api/jobs/${jobId}`);
        setJobInfo(data);
      } catch {
        // keep defaults
      }
    };
    fetchJobInfo();
  }, [jobId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to end when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCount.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // -----------------------------------------------------------------------
  // Send message
  // -----------------------------------------------------------------------

  const sendMessage = async () => {
    const content = inputText.trim();
    if (!content || sending) return;

    setSending(true);
    setInputText("");

    // Optimistic update
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
  // Build display items
  // -----------------------------------------------------------------------

  const displayItems = buildDisplayItems(
    messages,
    user?.id || "",
    isTyping
  );

  // -----------------------------------------------------------------------
  // Render items
  // -----------------------------------------------------------------------

  const renderItem = ({ item }: { item: DisplayItem }) => {
    if (item.type === "date-separator") {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    if (item.type === "typing") {
      return <TypingDots />;
    }

    const msg = item.message!;
    const isMine = item.isMine!;
    const isTemp = msg.id.startsWith("temp-");

    return (
      <AnimatedMessage isMine={isMine}>
        <View
          style={[
            styles.messageRow,
            isMine ? styles.messageRowRight : styles.messageRowLeft,
            !item.isLastInCluster && { marginBottom: 2 },
            item.isLastInCluster && { marginBottom: 10 },
          ]}
        >
          {/* Avatar column for other person */}
          {!isMine && (
            <View style={styles.avatarColumn}>
              {item.showAvatar ? (
                <AvatarCircle name={msg.sender_name || otherPersonName} />
              ) : (
                <View style={styles.avatarPlaceholder} />
              )}
            </View>
          )}

          {/* Bubble */}
          <View
            style={[
              styles.bubbleWrapper,
              isMine ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
            ]}
          >
            {isMine ? (
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.bubble,
                  styles.bubbleMine,
                  item.isLastInCluster && styles.bubbleMineTail,
                  item.isFirstInCluster && styles.bubbleMineFirst,
                ]}
              >
                <Text style={[styles.bubbleText, styles.bubbleTextMine]}>
                  {msg.content}
                </Text>
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.bubble,
                  styles.bubbleTheirs,
                  item.isLastInCluster && styles.bubbleTheirsTail,
                  item.isFirstInCluster && styles.bubbleTheirsFirst,
                ]}
              >
                <Text style={[styles.bubbleText, styles.bubbleTextTheirs]}>
                  {msg.content}
                </Text>
              </View>
            )}

            {/* Timestamp + read receipt under last bubble in cluster */}
            {item.showTimestamp && (
              <View
                style={[
                  styles.metaRow,
                  isMine ? styles.metaRowRight : styles.metaRowLeft,
                ]}
              >
                <Text style={styles.timestampText}>{item.timestamp}</Text>
                {isMine && <ReadReceipt isTemp={isTemp} />}
              </View>
            )}
          </View>
        </View>
      </AnimatedMessage>
    );
  };

  // -----------------------------------------------------------------------
  // Status badge color
  // -----------------------------------------------------------------------

  const statusBadge = jobInfo?.status
    ? statusColors[jobInfo.status] || {
        bg: colors.surfaceDark,
        text: colors.muted,
      }
    : null;

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={{ padding: 16 }}>
          {[
            { side: "left", w: 180 },
            { side: "right", w: 240 },
            { side: "left", w: 140 },
            { side: "right", w: 200 },
            { side: "left", w: 220 },
          ].map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.side === "right" ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <Skeleton width={m.w} height={40} borderRadius={18} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  const hasText = inputText.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* --------------------------------------------------------------- */}
      {/* Chat header                                                      */}
      {/* --------------------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </TouchableOpacity>

        {otherPersonName && (
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {getInitial(otherPersonName)}
            </Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherPersonName || "Chat"}
          </Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerJobTitle} numberOfLines={1}>
              {jobInfo?.title || ""}
            </Text>
            {statusBadge && jobInfo?.status && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBadge.bg },
                ]}
              >
                <Text
                  style={[styles.statusBadgeText, { color: statusBadge.text }]}
                >
                  {statusLabel(jobInfo.status)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* --------------------------------------------------------------- */}
      {/* Message list                                                     */}
      {/* --------------------------------------------------------------- */}
      <View style={styles.listContainer}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconOuter}>
              <View style={styles.emptyIconInner}>
                <Ionicons
                  name="chatbubbles"
                  size={40}
                  color={colors.primary}
                />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Start a Conversation</Text>
            <Text style={styles.emptySubtitle}>
              Send a message to discuss the details of this job. Messages are
              private between you and the other party.
            </Text>
            <View style={styles.emptyHintRow}>
              <Ionicons
                name="lock-closed-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={styles.emptyHintText}>
                Your messages are secure
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayItems}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}
      </View>

      {/* --------------------------------------------------------------- */}
      {/* Input bar                                                        */}
      {/* --------------------------------------------------------------- */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.attachButton} activeOpacity={0.6}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.inputWrapper}>
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
        </View>

        <TouchableOpacity
          style={[
            styles.sendBtn,
            hasText && !sending ? styles.sendBtnActive : styles.sendBtnInactive,
          ]}
          onPress={sendMessage}
          disabled={!hasText || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={hasText ? colors.white : colors.muted}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  // Header
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
  backButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  headerAvatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
    gap: 6,
  },
  headerJobTitle: {
    fontSize: 12,
    color: colors.muted,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // List container
  listContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },

  // Date separators
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginHorizontal: 12,
  },

  // Message rows
  messageRow: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },

  // Avatar
  avatarColumn: {
    width: AVATAR_SIZE + 6,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 20,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },

  // Bubble wrapper
  bubbleWrapper: {
    maxWidth: "78%",
  },
  bubbleWrapperRight: {
    alignItems: "flex-end",
  },
  bubbleWrapperLeft: {
    alignItems: "flex-start",
  },

  // Bubbles
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMine: {
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleMineFirst: {
    borderTopRightRadius: 20,
  },
  bubbleMineTail: {
    borderBottomRightRadius: 5,
  },
  bubbleTheirs: {
    backgroundColor: colors.white,
    borderTopRightRadius: 20,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...shadows.sm,
  },
  bubbleTheirsFirst: {
    borderTopLeftRadius: 20,
  },
  bubbleTheirsTail: {
    borderBottomLeftRadius: 5,
  },

  // Bubble text
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  bubbleTextTheirs: {
    color: colors.text,
  },

  // Meta row (timestamp + read receipt)
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  metaRowRight: {
    justifyContent: "flex-end",
  },
  metaRowLeft: {
    justifyContent: "flex-start",
  },
  timestampText: {
    fontSize: 11,
    color: colors.muted,
  },

  // Read receipts
  readReceipt: {
    flexDirection: "row",
    alignItems: "center",
  },
  doubleCheck: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    marginLeft: AVATAR_SIZE + 6,
    ...shadows.sm,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emptyHintText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    justifyContent: "center",
    minHeight: 40,
    maxHeight: 120,
  },
  textInput: {
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
    lineHeight: 20,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
  sendBtnInactive: {
    backgroundColor: "transparent",
  },
});

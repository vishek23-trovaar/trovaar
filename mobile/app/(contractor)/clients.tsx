import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";
import { colors, typography, spacing, radius, shadows, getStatusColor, getCategoryIcon } from "../../lib/theme";

const COLORS = {
  primary: colors.primary,
  primaryLight: "#DBEAFE",
  background: colors.white,
  surface: colors.surface,
  text: colors.text,
  muted: colors.muted,
  border: colors.border,
  success: colors.success,
  danger: colors.danger,
  warning: colors.warning,
  star: "#f59e0b",
};

const AVATAR_COLORS = [
  "#2563eb", "#7c3aed", "#db2777", "#059669",
  "#d97706", "#dc2626", "#0891b2", "#65a30d",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

interface ClientJob {
  id: string;
  title: string;
  date?: string;
  status?: string;
  amount?: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  last_job_date?: string;
  total_jobs: number;
  total_earned: number; // cents
  jobs?: ClientJob[];
  notes?: string;
  starred?: boolean;
}

// Raw job shape when we fall back to /api/jobs?status=completed
interface RawJob {
  id: string;
  title?: string;
  consumer_id?: string;
  consumer_name?: string;
  consumer_email?: string;
  completed_at?: string;
  created_at?: string;
  amount?: number;
  status?: string;
}

function groupJobsByConsumer(rawJobs: RawJob[]): Client[] {
  const map: Record<string, Client> = {};
  for (const job of rawJobs) {
    const cid = job.consumer_id || "unknown";
    if (!map[cid]) {
      map[cid] = {
        id: cid,
        name: job.consumer_name || "Unknown Client",
        email: job.consumer_email,
        last_job_date: job.completed_at || job.created_at,
        total_jobs: 0,
        total_earned: 0,
        jobs: [],
        starred: false,
      };
    }
    const client = map[cid];
    client.total_jobs += 1;
    client.total_earned += job.amount || 0;
    const jobDate = job.completed_at || job.created_at || "";
    if (
      !client.last_job_date ||
      (jobDate && jobDate > client.last_job_date)
    ) {
      client.last_job_date = jobDate;
    }
    client.jobs?.push({
      id: job.id,
      title: job.title || "Job",
      date: job.completed_at || job.created_at,
      status: job.status,
      amount: job.amount,
    });
  }
  return Object.values(map);
}

type FilterMode = "all" | "favorites";

export default function Clients() {
  const screenOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [screenOpacity]);

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [clientNote, setClientNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api<{ clients: Client[] }>("/api/contractor/clients");
      setClients(data?.clients || []);
    } catch (err) {
      const is404 = err instanceof ApiError && err.status === 404;
      if (is404 || err instanceof Error) {
        // Fallback: group completed jobs by consumer
        try {
          const { data } = await api<{ jobs: RawJob[] }>(
            "/api/jobs?status=completed"
          );
          const rawJobs = data?.jobs || [];
          setClients(groupJobsByConsumer(rawJobs));
        } catch {
          setClients([]);
        }
      } else {
        setClients([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const handleToggleStar = (clientId: string) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const openDetail = (client: Client) => {
    setDetailClient(client);
    setClientNote(client.notes || "");
  };

  const handleSaveNote = async () => {
    if (!detailClient) return;
    setSavingNote(true);
    try {
      await api(`/api/contractor/clients/${detailClient.id}/notes`, {
        method: "PUT",
        body: JSON.stringify({ notes: clientNote }),
      });
      setClients((prev) =>
        prev.map((c) =>
          c.id === detailClient.id ? { ...c, notes: clientNote } : c
        )
      );
      setDetailClient((prev) => (prev ? { ...prev, notes: clientNote } : prev));
    } catch {
      // Best effort: store locally on state only
      setClients((prev) =>
        prev.map((c) =>
          c.id === detailClient.id ? { ...c, notes: clientNote } : c
        )
      );
    } finally {
      setSavingNote(false);
    }
  };

  const filtered = useMemo(() => {
    let list = clients.map((c) => ({
      ...c,
      starred: starred.has(c.id),
    }));
    if (filterMode === "favorites") {
      list = list.filter((c) => c.starred);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    // Sort: starred first, then by last_job_date desc
    list.sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      const da = a.last_job_date || "";
      const db = b.last_job_date || "";
      return db.localeCompare(da);
    });
    return list;
  }, [clients, starred, filterMode, search]);

  const renderClientCard = ({ item }: { item: Client & { starred: boolean } }) => {
    const initials = getInitials(item.name);
    const avatarBg = getAvatarColor(item.name);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => openDetail(item)}
      >
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleStar(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.starred ? "star" : "star-outline"}
                size={20}
                color={item.starred ? COLORS.star : COLORS.muted}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="briefcase-outline" size={12} color={COLORS.muted} />
              <Text style={styles.metaText}>{item.total_jobs} job{item.total_jobs !== 1 ? "s" : ""}</Text>
            </View>
            {item.last_job_date ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
                <Text style={styles.metaText}>{formatDate(item.last_job_date)}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.clientEarned}>
            {formatCurrency(item.total_earned)} earned
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!detailClient) return null;
    const initials = getInitials(detailClient.name);
    const avatarBg = getAvatarColor(detailClient.name);
    const jobs = detailClient.jobs || [];
    const isStarred = starred.has(detailClient.id);

    return (
      <Modal
        visible={!!detailClient}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailClient(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Client Profile</Text>
              <TouchableOpacity
                onPress={() => setDetailClient(null)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* Client hero */}
              <View style={styles.clientHero}>
                <View style={[styles.avatarLarge, { backgroundColor: avatarBg }]}>
                  <Text style={styles.avatarLargeText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroName}>{detailClient.name}</Text>
                  {detailClient.email ? (
                    <Text style={styles.heroEmail}>{detailClient.email}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleToggleStar(detailClient.id)}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={isStarred ? "star" : "star-outline"}
                    size={24}
                    color={isStarred ? COLORS.star : COLORS.muted}
                  />
                </TouchableOpacity>
              </View>

              {/* Stats row */}
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatValue}>{detailClient.total_jobs}</Text>
                  <Text style={styles.detailStatLabel}>Jobs</Text>
                </View>
                <View style={[styles.detailStat, styles.detailStatBorder]}>
                  <Text style={[styles.detailStatValue, { color: COLORS.success }]}>
                    {formatCurrency(detailClient.total_earned)}
                  </Text>
                  <Text style={styles.detailStatLabel}>Earned</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={styles.detailStatValue}>
                    {detailClient.last_job_date ? formatDate(detailClient.last_job_date) : "—"}
                  </Text>
                  <Text style={styles.detailStatLabel}>Last Job</Text>
                </View>
              </View>

              {/* Jobs together */}
              {jobs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Jobs Together</Text>
                  {jobs.map((job) => (
                    <View key={job.id} style={styles.jobRow}>
                      <View style={styles.jobRowDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.jobRowTitle} numberOfLines={1}>
                          {job.title}
                        </Text>
                        {job.date ? (
                          <Text style={styles.jobRowDate}>{formatDate(job.date)}</Text>
                        ) : null}
                      </View>
                      {job.amount ? (
                        <Text style={styles.jobRowAmount}>
                          {formatCurrency(job.amount)}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={clientNote}
                  onChangeText={setClientNote}
                  placeholder="Add notes about this client..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.muted}
                />
                <TouchableOpacity
                  style={[styles.saveNoteBtn, savingNote && { opacity: 0.6 }]}
                  onPress={handleSaveNote}
                  disabled={savingNote}
                  activeOpacity={0.8}
                >
                  {savingNote ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveNoteBtnText}>Save Note</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search clients..."
            placeholderTextColor={COLORS.muted}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["all", "favorites"] as FilterMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.filterTab, filterMode === mode && styles.filterTabActive]}
            onPress={() => setFilterMode(mode)}
            activeOpacity={0.7}
          >
            {mode === "favorites" && (
              <Ionicons
                name="star"
                size={13}
                color={filterMode === mode ? "#fff" : COLORS.muted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.filterTabText,
                filterMode === mode && styles.filterTabTextActive,
              ]}
            >
              {mode === "all" ? "All Clients" : "Favorites"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderClientCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              {search ? (
                <>
                  <Text style={styles.emptyIcon}>🔍</Text>
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptySubtitle}>
                    No clients match "{search}"
                  </Text>
                </>
              ) : filterMode === "favorites" ? (
                <>
                  <Text style={styles.emptyIcon}>⭐</Text>
                  <Text style={styles.emptyTitle}>No favorites yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Star clients to add them here
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyTitle}>No clients yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Clients will appear here after you complete jobs
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}

      {renderDetailModal()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    padding: 0,
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: COLORS.background,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  filterTabTextActive: { color: "#fff" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  cardContent: { flex: 1 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: { fontSize: 12, color: COLORS.muted },
  clientEarned: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.success,
  },

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { padding: 20, paddingBottom: 40 },

  clientHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },
  heroEmail: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  starBtn: {
    padding: 6,
  },

  detailStatsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  detailStatBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  detailStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  jobRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  jobRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  jobRowDate: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 1,
  },
  jobRowAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.success,
  },

  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveNoteBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  saveNoteBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});

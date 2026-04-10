import { useState, useEffect, useCallback } from "react";
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
  Alert,
  KeyboardAvoidingView,
  Platform,
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
};

const PLATFORM_FEE_RATE = 0.1;

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  status: InvoiceStatus;
  due_date?: string;
  created_at: string;
  job_id?: string;
  job_title?: string;
  labor_amount?: number;
  materials_amount?: number;
  notes?: string;
}

interface ActiveJob {
  id: string;
  title: string;
  consumer_name?: string;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "#f1f5f9", text: COLORS.muted, label: "Draft" },
  sent: { bg: "#eff6ff", text: COLORS.primary, label: "Sent" },
  paid: { bg: "#f0fdf4", text: COLORS.success, label: "Paid" },
  overdue: { bg: "#fef2f2", text: COLORS.danger, label: "Overdue" },
};

const FILTER_TABS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
];

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface CreateInvoiceForm {
  job_id: string;
  labor: string;
  materials: string;
  due_date: string;
  notes: string;
}

const EMPTY_FORM: CreateInvoiceForm = {
  job_id: "",
  labor: "",
  materials: "",
  due_date: "",
  notes: "",
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [form, setForm] = useState<CreateInvoiceForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [markingSent, setMarkingSent] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api<{ invoices: Invoice[] }>("/api/contractor/invoices");
      setInvoices(data?.invoices || []);
    } catch (err) {
      if (__DEV__) console.warn("[Invoices] fetch error:", err);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveJobs = useCallback(async () => {
    try {
      const { data } = await api<{ jobs: ActiveJob[] }>("/api/contractor/jobs?status=active");
      setActiveJobs(data?.jobs || []);
    } catch {
      setActiveJobs([]);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    fetchActiveJobs();
    setShowCreate(true);
  };

  const laborCents = Math.round(parseFloat(form.labor || "0") * 100) || 0;
  const materialsCents = Math.round(parseFloat(form.materials || "0") * 100) || 0;
  const subtotal = laborCents + materialsCents;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const payout = subtotal - platformFee;

  const handleSubmitInvoice = async () => {
    if (!form.job_id) {
      Alert.alert("Missing field", "Please select a job.");
      return;
    }
    if (subtotal <= 0) {
      Alert.alert("Missing amount", "Enter labor or materials amount.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/contractor/invoices", {
        method: "POST",
        body: JSON.stringify({
          job_id: form.job_id,
          labor_amount: laborCents,
          materials_amount: materialsCents,
          due_date: form.due_date || undefined,
          notes: form.notes || undefined,
        }),
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchInvoices();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to create invoice";
      Alert.alert("Error", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSent = async (invoice: Invoice) => {
    setMarkingSent(true);
    try {
      await api(`/api/contractor/invoices/${invoice.id}/send`, { method: "POST" });
      setDetailInvoice((prev) =>
        prev ? { ...prev, status: "sent" } : prev
      );
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoice.id ? { ...inv, status: "sent" } : inv
        )
      );
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to mark as sent";
      Alert.alert("Error", msg);
    } finally {
      setMarkingSent(false);
    }
  };

  const filtered =
    activeTab === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === activeTab);

  // Stats
  const totalInvoiced = invoices.reduce((s, inv) => s + inv.amount, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((s, inv) => s + inv.amount, 0);
  const totalOutstanding = invoices
    .filter((inv) => inv.status === "sent" || inv.status === "overdue")
    .reduce((s, inv) => s + inv.amount, 0);

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCell}>
        <Text style={styles.statLabel}>Total Invoiced</Text>
        <Text style={styles.statValue}>{formatCurrency(totalInvoiced)}</Text>
      </View>
      <View style={[styles.statCell, styles.statCellBorder]}>
        <Text style={styles.statLabel}>Paid</Text>
        <Text style={[styles.statValue, { color: COLORS.success }]}>
          {formatCurrency(totalPaid)}
        </Text>
      </View>
      <View style={styles.statCell}>
        <Text style={styles.statLabel}>Outstanding</Text>
        <Text style={[styles.statValue, { color: COLORS.warning }]}>
          {formatCurrency(totalOutstanding)}
        </Text>
      </View>
    </View>
  );

  const renderFilterTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScroll}
      contentContainerStyle={styles.tabContainer}
    >
      {FILTER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderInvoiceCard = ({ item }: { item: Invoice }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => setDetailInvoice(item)}
      >
        <View style={styles.cardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
            <Text style={styles.clientName} numberOfLines={1}>
              {item.client_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.cardBottomRow}>
          <Text style={styles.invoiceAmount}>{formatCurrency(item.amount)}</Text>
          {item.due_date ? (
            <View style={styles.dueDateRow}>
              <Ionicons name="calendar-outline" size={13} color={COLORS.muted} />
              <Text style={styles.dueDateText}>Due {formatDate(item.due_date)}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreate}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCreate(false)}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Invoice</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            {/* Job selector */}
            <Text style={styles.fieldLabel}>Job *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {activeJobs.length === 0 ? (
                <View style={styles.noJobsNote}>
                  <Text style={styles.noJobsText}>No active jobs available</Text>
                </View>
              ) : (
                activeJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={[
                      styles.jobChip,
                      form.job_id === job.id && styles.jobChipActive,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, job_id: job.id }))}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.jobChipText,
                        form.job_id === job.id && styles.jobChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {job.title}
                    </Text>
                    {job.consumer_name ? (
                      <Text
                        style={[
                          styles.jobChipSub,
                          form.job_id === job.id && { color: "#93c5fd" },
                        ]}
                      >
                        {job.consumer_name}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Labor */}
            <Text style={styles.fieldLabel}>Labor Amount ($)</Text>
            <TextInput
              style={styles.textInput}
              value={form.labor}
              onChangeText={(v) => setForm((f) => ({ ...f, labor: v }))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.muted}
            />

            {/* Materials */}
            <Text style={styles.fieldLabel}>Materials Amount ($)</Text>
            <TextInput
              style={styles.textInput}
              value={form.materials}
              onChangeText={(v) => setForm((f) => ({ ...f, materials: v }))}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={COLORS.muted}
            />

            {/* Due date */}
            <Text style={styles.fieldLabel}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={form.due_date}
              onChangeText={(v) => setForm((f) => ({ ...f, due_date: v }))}
              placeholder="2026-05-01"
              placeholderTextColor={COLORS.muted}
            />

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholder="Optional notes..."
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.muted}
            />

            {/* Preview */}
            {subtotal > 0 && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Invoice Preview</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Subtotal</Text>
                  <Text style={styles.previewValue}>{formatCurrency(subtotal)}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Platform Fee (10%)</Text>
                  <Text style={[styles.previewValue, { color: COLORS.danger }]}>
                    -{formatCurrency(platformFee)}
                  </Text>
                </View>
                <View style={[styles.previewRow, styles.previewPayoutRow]}>
                  <Text style={styles.previewPayoutLabel}>Your Payout</Text>
                  <Text style={styles.previewPayoutValue}>{formatCurrency(payout)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitInvoice}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Create Invoice</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!detailInvoice) return null;
    const cfg = STATUS_CONFIG[detailInvoice.status] || STATUS_CONFIG.draft;
    const laborAmt = detailInvoice.labor_amount ?? 0;
    const materialsAmt = detailInvoice.materials_amount ?? 0;
    const total = detailInvoice.amount;
    const fee = Math.round(total * PLATFORM_FEE_RATE);
    const net = total - fee;

    return (
      <Modal
        visible={!!detailInvoice}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailInvoice(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{detailInvoice.invoice_number}</Text>
            <TouchableOpacity
              onPress={() => setDetailInvoice(null)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={[styles.detailStatusBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.detailStatusText, { color: cfg.text }]}>
                {cfg.label}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Client</Text>
              <Text style={styles.detailValue}>{detailInvoice.client_name}</Text>
            </View>

            {detailInvoice.job_title ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Job</Text>
                <Text style={styles.detailValue}>{detailInvoice.job_title}</Text>
              </View>
            ) : null}

            <View style={styles.detailBreakdown}>
              <Text style={styles.detailSectionTitle}>Breakdown</Text>
              {laborAmt > 0 ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Labor</Text>
                  <Text style={styles.previewValue}>{formatCurrency(laborAmt)}</Text>
                </View>
              ) : null}
              {materialsAmt > 0 ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Materials</Text>
                  <Text style={styles.previewValue}>{formatCurrency(materialsAmt)}</Text>
                </View>
              ) : null}
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Total</Text>
                <Text style={styles.previewValue}>{formatCurrency(total)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Platform Fee (10%)</Text>
                <Text style={[styles.previewValue, { color: COLORS.danger }]}>
                  -{formatCurrency(fee)}
                </Text>
              </View>
              <View style={[styles.previewRow, styles.previewPayoutRow]}>
                <Text style={styles.previewPayoutLabel}>Your Payout</Text>
                <Text style={styles.previewPayoutValue}>{formatCurrency(net)}</Text>
              </View>
            </View>

            {detailInvoice.due_date ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDate(detailInvoice.due_date)}</Text>
              </View>
            ) : null}

            {detailInvoice.notes ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Notes</Text>
                <Text style={styles.detailValue}>{detailInvoice.notes}</Text>
              </View>
            ) : null}

            {detailInvoice.status === "draft" ? (
              <TouchableOpacity
                style={[styles.submitBtn, markingSent && { opacity: 0.6 }]}
                onPress={() => handleMarkSent(detailInvoice)}
                disabled={markingSent}
                activeOpacity={0.8}
              >
                {markingSent ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#fff" />
                    <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>
                      Mark as Sent
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Stats */}
      {renderStatsRow()}

      {/* Filter tabs */}
      {renderFilterTabs()}

      {/* Invoice list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(inv) => inv.id}
          renderItem={renderInvoiceCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create your first invoice
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderCreateModal()}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  statCellBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  tabScroll: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 52,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: { fontSize: 13, fontWeight: "600", color: COLORS.muted },
  tabTextActive: { color: "#fff" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  empty: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.md,
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
  modalBody: {
    padding: 20,
    paddingBottom: 40,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  noJobsNote: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  noJobsText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  jobChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    minWidth: 120,
    maxWidth: 180,
  },
  jobChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  jobChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  jobChipTextActive: { color: "#fff" },
  jobChipSub: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },

  previewBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  previewLabel: { fontSize: 13, color: COLORS.muted },
  previewValue: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  previewPayoutRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 2,
  },
  previewPayoutLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  previewPayoutValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.success,
  },

  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...shadows.md,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Detail modal
  detailStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailStatusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
  },
  detailBreakdown: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

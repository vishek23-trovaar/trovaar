import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiError } from "@/lib/api";

const COLORS = {
  primary: "#2563eb",
  primaryLight: "#eff6ff",
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const W9_THRESHOLD_CENTS = 60000; // $600.00

interface MonthlyRow {
  month: number; // 1-12
  jobs: number;
  earned: number;  // cents
  fees: number;    // cents
}

interface TaxSummary {
  total_earned: number;   // cents
  platform_fees: number;  // cents
  net_earnings: number;   // cents
  monthly: MonthlyRow[];
}

function formatCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Fallback: derive tax summary from /api/contractor/earnings?period=year
interface EarningItem {
  amount: number;
  date: string;
  platform_fee?: number;
  job_title?: string;
}

function buildTaxFromEarnings(items: EarningItem[], year: number): TaxSummary {
  const monthlyMap: Record<number, MonthlyRow> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyMap[m] = { month: m, jobs: 0, earned: 0, fees: 0 };
  }

  let totalEarned = 0;
  let totalFees = 0;

  for (const item of items) {
    const d = new Date(item.date);
    if (isNaN(d.getTime())) continue;
    if (d.getFullYear() !== year) continue;
    const month = d.getMonth() + 1;
    const earned = item.amount || 0;
    const fee = item.platform_fee ?? Math.round(earned * 0.1);
    monthlyMap[month].jobs += 1;
    monthlyMap[month].earned += earned;
    monthlyMap[month].fees += fee;
    totalEarned += earned;
    totalFees += fee;
  }

  return {
    total_earned: totalEarned,
    platform_fees: totalFees,
    net_earnings: totalEarned - totalFees,
    monthly: Object.values(monthlyMap),
  };
}

export default function Tax() {
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTax = useCallback(async (year: number) => {
    setLoading(true);
    try {
      const { data } = await api<TaxSummary>(`/api/contractor/tax?year=${year}`);
      setSummary(data);
    } catch (primaryErr) {
      // If 404 or any error, fall back to earnings endpoint
      const is404 =
        primaryErr instanceof ApiError && primaryErr.status === 404;
      if (is404 || primaryErr instanceof Error) {
        try {
          const { data } = await api<{
            items?: EarningItem[];
            earnings?: EarningItem[];
          }>(`/api/contractor/earnings?period=year`);
          const items = data?.items || data?.earnings || [];
          setSummary(buildTaxFromEarnings(items, year));
        } catch {
          setSummary({
            total_earned: 0,
            platform_fees: 0,
            net_earnings: 0,
            monthly: Array.from({ length: 12 }, (_, i) => ({
              month: i + 1,
              jobs: 0,
              earned: 0,
              fees: 0,
            })),
          });
        }
      } else {
        setSummary(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTax(selectedYear);
  }, [fetchTax, selectedYear]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTax(selectedYear);
    setRefreshing(false);
  };

  const handleDownload = () => {
    Alert.alert(
      "Coming Soon",
      "PDF export is not yet available. Check back soon!"
    );
  };

  const on1099Track =
    summary !== null && summary.total_earned >= W9_THRESHOLD_CENTS;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Year picker */}
        <View style={styles.yearPickerRow}>
          {YEAR_OPTIONS.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[
                styles.yearChip,
                selectedYear === yr && styles.yearChipActive,
              ]}
              onPress={() => setSelectedYear(yr)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.yearChipText,
                  selectedYear === yr && styles.yearChipTextActive,
                ]}
              >
                {yr}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : summary === null ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
            <Text style={styles.errorText}>Failed to load tax data.</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchTax(selectedYear)}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
                <View style={styles.summaryCardIcon}>
                  <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.summaryCardLabel}>Total Earned</Text>
                <Text style={[styles.summaryCardValue, { color: COLORS.text }]}>
                  {formatCurrency(summary.total_earned)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.summaryCardIcon, { backgroundColor: "#fef2f2" }]}>
                  <Ionicons name="remove-circle-outline" size={20} color={COLORS.danger} />
                </View>
                <Text style={styles.summaryCardLabel}>Platform Fees</Text>
                <Text style={[styles.summaryCardValue, { color: COLORS.danger }]}>
                  {formatCurrency(summary.platform_fees)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.summaryCardIcon, { backgroundColor: "#f0fdf4" }]}>
                  <Ionicons name="wallet-outline" size={20} color={COLORS.success} />
                </View>
                <Text style={styles.summaryCardLabel}>Net Earnings</Text>
                <Text style={[styles.summaryCardValue, { color: COLORS.success }]}>
                  {formatCurrency(summary.net_earnings)}
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryCardIcon,
                    { backgroundColor: on1099Track ? "#fffbeb" : "#f0fdf4" },
                  ]}
                >
                  <Ionicons
                    name={on1099Track ? "document-text-outline" : "checkmark-circle-outline"}
                    size={20}
                    color={on1099Track ? COLORS.warning : COLORS.success}
                  />
                </View>
                <Text style={styles.summaryCardLabel}>1099 Status</Text>
                <Text
                  style={[
                    styles.summaryCardValue,
                    {
                      color: on1099Track ? COLORS.warning : COLORS.success,
                      fontSize: 13,
                    },
                  ]}
                >
                  {on1099Track
                    ? "On track for 1099"
                    : summary.total_earned === 0
                    ? "No earnings yet"
                    : "Below $600 threshold"}
                </Text>
              </View>
            </View>

            {/* 1099 info note */}
            {on1099Track && (
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.infoNoteText}>
                  You have earned {formatCurrency(summary.total_earned)} in {selectedYear}.
                  You may receive a 1099-NEC form for this tax year.
                </Text>
              </View>
            )}

            {/* Monthly breakdown */}
            <View style={styles.tableSection}>
              <Text style={styles.tableSectionTitle}>Monthly Breakdown</Text>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Month</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.7 }]}>Jobs</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Earned</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: "right" }]}>Fees</Text>
              </View>
              {summary.monthly.map((row) => {
                const hasData = row.earned > 0 || row.jobs > 0;
                return (
                  <View
                    key={row.month}
                    style={[styles.tableRow, hasData && styles.tableRowActive]}
                  >
                    <Text style={[styles.tableCell, { flex: 1.2, fontWeight: "600" }]}>
                      {MONTH_LABELS[(row.month - 1) % 12]}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.7 }]}>
                      {row.jobs > 0 ? row.jobs : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1.5, textAlign: "right" },
                        hasData && { color: COLORS.success, fontWeight: "600" },
                      ]}
                    >
                      {row.earned > 0 ? formatCurrency(row.earned) : "—"}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { flex: 1.5, textAlign: "right" },
                        hasData && { color: COLORS.danger },
                      ]}
                    >
                      {row.fees > 0 ? formatCurrency(row.fees) : "—"}
                    </Text>
                  </View>
                );
              })}
              {/* Totals row */}
              <View style={styles.tableTotalsRow}>
                <Text style={[styles.tableTotalCell, { flex: 1.2 }]}>Total</Text>
                <Text style={[styles.tableTotalCell, { flex: 0.7 }]}>
                  {summary.monthly.reduce((s, r) => s + r.jobs, 0)}
                </Text>
                <Text style={[styles.tableTotalCell, { flex: 1.5, textAlign: "right", color: COLORS.success }]}>
                  {formatCurrency(summary.total_earned)}
                </Text>
                <Text style={[styles.tableTotalCell, { flex: 1.5, textAlign: "right", color: COLORS.danger }]}>
                  {formatCurrency(summary.platform_fees)}
                </Text>
              </View>
            </View>

            {/* Download button */}
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color={COLORS.primary} />
              <Text style={styles.downloadBtnText}>Download Summary</Text>
            </TouchableOpacity>

            {/* Tax info section */}
            <View style={styles.taxInfoSection}>
              <View style={styles.taxInfoHeader}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.muted} />
                <Text style={styles.taxInfoTitle}>Tax Information</Text>
              </View>
              <Text style={styles.taxInfoBody}>
                To update your EIN, SSN, or W-9 information, please visit your
                contractor tax settings on the web portal.
              </Text>
              <View style={styles.taxInfoLink}>
                <Ionicons name="globe-outline" size={14} color={COLORS.primary} />
                <Text style={styles.taxInfoLinkText}>trovaar.com/contractor/tax</Text>
              </View>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { paddingBottom: 20 },

  yearPickerRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  yearChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  yearChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  yearChipText: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  yearChipTextActive: { color: "#fff" },

  loadingContainer: {
    paddingTop: 80,
    alignItems: "center",
  },
  errorContainer: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    color: COLORS.danger,
    fontWeight: "500",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 4,
  },
  summaryCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  summaryCardPrimary: {
    borderColor: COLORS.border,
  },
  summaryCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 15,
    fontWeight: "800",
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },

  tableSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  tableSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowActive: {
    backgroundColor: "#fafcff",
  },
  tableCell: {
    fontSize: 13,
    color: COLORS.muted,
  },
  tableTotalsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  tableTotalCell: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },

  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  downloadBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },

  taxInfoSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taxInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  taxInfoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  taxInfoBody: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 10,
  },
  taxInfoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  taxInfoLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
});

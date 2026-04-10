import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
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
  today: colors.primary,
  dimmed: "#cbd5e1",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarJob {
  id: string;
  title: string;
  time?: string;
  client_name?: string;
  date: string;
}

interface WeeklySlot {
  day_of_week: number; // 0=Mon, 6=Sun
  enabled: boolean;
}

interface SpecificSlot {
  date: string;
  available: boolean;
}

interface CalendarData {
  jobs?: CalendarJob[];
  weeklySlots?: WeeklySlot[];
  specificSlots?: SpecificSlot[];
}

function formatMonthKey(year: number, month: number): string {
  const m = String(month + 1).padStart(2, "0");
  return `${year}-${m}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(timeStr?: string): string {
  if (!timeStr) return "";
  return timeStr;
}

export default function ContractorCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [weeklyToggles, setWeeklyToggles] = useState<boolean[]>([
    true, true, true, true, true, false, false,
  ]);

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const monthKey = formatMonthKey(year, month);
      const { data } = await api<CalendarData>(
        `/api/contractor/calendar?month=${monthKey}`
      );
      setCalendarData(data || {});

      // Init weekly toggles from returned slots
      const slots: WeeklySlot[] = data?.weeklySlots || [];
      if (slots.length > 0) {
        const toggles = [false, false, false, false, false, false, false];
        slots.forEach((s) => {
          if (s.day_of_week >= 0 && s.day_of_week <= 6) {
            toggles[s.day_of_week] = s.enabled;
          }
        });
        setWeeklyToggles(toggles);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCalendarData({});
      } else {
        if (__DEV__) console.warn("[Calendar] fetch error:", err);
        setCalendarData({});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(viewYear, viewMonth);
  }, [fetchCalendar, viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const handleToggleWeekday = async (index: number, value: boolean) => {
    const next = [...weeklyToggles];
    next[index] = value;
    setWeeklyToggles(next);
    setSavingAvailability(true);
    try {
      const slots = next.map((enabled, i) => ({ day_of_week: i, enabled }));
      await api("/api/contractor/availability", {
        method: "PUT",
        body: JSON.stringify({ weeklySlots: slots }),
      });
    } catch (err) {
      if (__DEV__) console.warn("[Calendar] availability save error (best effort):", err);
    } finally {
      setSavingAvailability(false);
    }
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Build 6-week grid (42 cells)
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    const day = daysInPrevMonth - firstDayOfWeek + i + 1;
    cells.push({ date: new Date(viewYear, viewMonth - 1, day), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewYear, viewMonth, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const extra = cells.length - daysInMonth - firstDayOfWeek + 1;
    cells.push({ date: new Date(viewYear, viewMonth + 1, extra), inMonth: false });
  }

  const jobs: CalendarJob[] = calendarData.jobs || [];

  const jobsByDate = jobs.reduce<Record<string, CalendarJob[]>>((acc, job) => {
    const key = job.date?.slice(0, 10);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(job);
    return acc;
  }, {});

  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedJobs = selectedKey ? (jobsByDate[selectedKey] || []) : [];

  const renderDayCell = (cell: { date: Date; inMonth: boolean }, idx: number) => {
    const key = formatDateKey(cell.date);
    const hasJobs = !!jobsByDate[key]?.length;
    const isToday = isSameDay(cell.date, today);
    const isPast = cell.date < today && !isToday;
    const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;

    return (
      <TouchableOpacity
        key={idx}
        style={[
          styles.dayCell,
          isSelected && styles.dayCellSelected,
          isToday && !isSelected && styles.dayCellToday,
        ]}
        onPress={() => {
          if (cell.inMonth) {
            setSelectedDate(isSelected ? null : cell.date);
          }
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayNumber,
            !cell.inMonth && styles.dayNumberOtherMonth,
            isPast && cell.inMonth && styles.dayNumberPast,
            isToday && styles.dayNumberToday,
            isSelected && styles.dayNumberSelected,
          ]}
        >
          {cell.date.getDate()}
        </Text>
        {hasJobs && (
          <View
            style={[
              styles.jobDot,
              isSelected && { backgroundColor: "#fff" },
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDate) return null;
    const dateLabel = selectedDate.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    return (
      <View style={styles.dayDetailPanel}>
        <Text style={styles.dayDetailTitle}>{dateLabel}</Text>
        {selectedJobs.length === 0 ? (
          <View style={styles.dayDetailEmpty}>
            <Ionicons name="calendar-outline" size={28} color={COLORS.muted} />
            <Text style={styles.dayDetailEmptyText}>No jobs scheduled</Text>
          </View>
        ) : (
          selectedJobs.map((job) => (
            <View key={job.id} style={styles.jobRow}>
              <View style={styles.jobRowIcon}>
                <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jobRowTitle} numberOfLines={1}>
                  {job.title}
                </Text>
                <View style={styles.jobRowMeta}>
                  {job.time ? (
                    <View style={styles.jobMetaItem}>
                      <Ionicons name="time-outline" size={12} color={COLORS.muted} />
                      <Text style={styles.jobMetaText}>{formatTime(job.time)}</Text>
                    </View>
                  ) : null}
                  {job.client_name ? (
                    <View style={styles.jobMetaItem}>
                      <Ionicons name="person-outline" size={12} color={COLORS.muted} />
                      <Text style={styles.jobMetaText}>{job.client_name}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>
        <TouchableOpacity style={styles.navBtn} onPress={goToNextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.dayHeaders}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={styles.dayHeaderCell}>
            <Text style={styles.dayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {loading ? (
        <View style={styles.calendarLoading}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.calendarGrid}>
          {cells.map((cell, idx) => renderDayCell(cell, idx))}
        </View>
      )}

      {/* Day detail panel */}
      {renderDayDetail()}

      {/* Set Availability section */}
      <View style={styles.availabilitySection}>
        <View style={styles.availabilityHeader}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} />
          <Text style={styles.availabilityTitle}>Weekly Availability</Text>
          {savingAvailability && (
            <ActivityIndicator size="small" color={COLORS.muted} style={{ marginLeft: 8 }} />
          )}
        </View>
        <Text style={styles.availabilitySubtitle}>
          Toggle which days you are generally available
        </Text>
        {WEEKDAYS.map((day, idx) => (
          <View key={day} style={styles.toggleRow}>
            <Text style={styles.toggleDayLabel}>
              {WEEKDAY_SHORT[idx]}
              {"  "}
              <Text style={styles.toggleDayFull}>{day}</Text>
            </Text>
            <View style={styles.toggleRight}>
              <Text
                style={[
                  styles.toggleStatus,
                  weeklyToggles[idx] ? styles.toggleOn : styles.toggleOff,
                ]}
              >
                {weeklyToggles[idx] ? "ON" : "OFF"}
              </Text>
              <Switch
                value={weeklyToggles[idx]}
                onValueChange={(v) => handleToggleWeekday(idx, v)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        ))}
      </View>

      {/* Bottom spacer */}
      <View style={{ height: 40 }} />
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {renderHeader()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  },

  dayHeaders: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },

  calendarLoading: {
    height: 200,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  dayCell: {
    width: "14.285714%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  dayCellToday: {
    backgroundColor: COLORS.primaryLight,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },
  dayNumberOtherMonth: {
    color: COLORS.dimmed,
  },
  dayNumberPast: {
    color: COLORS.dimmed,
  },
  dayNumberToday: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  dayNumberSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  jobDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },

  dayDetailPanel: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  dayDetailTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  dayDetailEmpty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  dayDetailEmptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  jobRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  jobRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  jobRowMeta: {
    flexDirection: "row",
    gap: 12,
  },
  jobMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  jobMetaText: {
    fontSize: 12,
    color: COLORS.muted,
  },

  availabilitySection: {
    margin: 16,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  availabilitySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleDayLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  toggleDayFull: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.muted,
  },
  toggleRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleStatus: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "right",
  },
  toggleOn: { color: COLORS.primary },
  toggleOff: { color: COLORS.muted },
});

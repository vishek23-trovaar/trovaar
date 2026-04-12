"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ui/ScrollReveal";

interface CalendarJob {
  id: string;
  title: string;
  category: string;
  status: string;
  location: string;
  availability_date: string;
  price: number;
  completed_at: string | null;
  consumer_name: string;
}

interface AvailSlot {
  id: number;
  contractor_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_blocked: number;
  note: string | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ContractorCalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [jobs, setJobs] = useState<CalendarJob[]>([]);
  const [weeklySlots, setWeeklySlots] = useState<AvailSlot[]>([]);
  const [dateSlots, setDateSlots] = useState<AvailSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Availability form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formType, setFormType] = useState<"weekly" | "specific" | "block">("specific");
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const fetchCalendar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contractor/calendar?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setWeeklySlots(data.weeklySlots || []);
        setDateSlots(data.dateSlots || []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [user, monthStr]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  // Map jobs to dates
  const jobsByDate = new Map<string, CalendarJob[]>();
  for (const job of jobs) {
    const d = job.availability_date?.split("T")[0];
    if (d) {
      if (!jobsByDate.has(d)) jobsByDate.set(d, []);
      jobsByDate.get(d)!.push(job);
    }
  }

  // Map date-specific slots
  const slotsByDate = new Map<string, AvailSlot[]>();
  for (const slot of dateSlots) {
    const d = slot.specific_date!;
    if (!slotsByDate.has(d)) slotsByDate.set(d, []);
    slotsByDate.get(d)!.push(slot);
  }

  function getDateInfo(day: number) {
    const dk = dateKey(new Date(year, month, day));
    const dayOfWeek = new Date(year, month, day).getDay();
    const dayJobs = jobsByDate.get(dk) || [];
    const daySpecificSlots = slotsByDate.get(dk) || [];
    const dayWeeklySlots = weeklySlots.filter((s) => s.day_of_week === dayOfWeek);
    const hasAvailability = daySpecificSlots.some((s) => !s.is_blocked) || dayWeeklySlots.some((s) => !s.is_blocked);
    const hasBlocked = daySpecificSlots.some((s) => s.is_blocked);
    return { dk, dayJobs, daySpecificSlots, dayWeeklySlots, hasAvailability, hasBlocked };
  }

  const todayKey = dateKey(new Date());

  // Selected date details
  const selectedInfo = selectedDate
    ? (() => {
        const d = new Date(selectedDate + "T00:00:00");
        const dayOfWeek = d.getDay();
        return {
          dayJobs: jobsByDate.get(selectedDate) || [],
          specificSlots: slotsByDate.get(selectedDate) || [],
          weeklySlots: weeklySlots.filter((s) => s.day_of_week === dayOfWeek),
          dayName: FULL_DAY_NAMES[dayOfWeek],
          formatted: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        };
      })()
    : null;

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        start_time: formStartTime,
        end_time: formEndTime,
        note: formNote || undefined,
      };
      if (formType === "weekly") {
        body.day_of_week = formDayOfWeek;
        body.is_blocked = false;
      } else if (formType === "block") {
        body.specific_date = selectedDate;
        body.is_blocked = true;
      } else {
        body.specific_date = selectedDate;
        body.is_blocked = false;
      }

      const res = await fetch("/api/contractor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowAddForm(false);
        setFormNote("");
        fetchCalendar();
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleDeleteSlot(slotId: number) {
    try {
      const res = await fetch(`/api/contractor/availability?id=${slotId}`, { method: "DELETE" });
      if (res.ok) fetchCalendar();
    } catch { /* silent */ }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contractor/dashboard" className="text-sm text-blue-600 hover:underline mb-1 inline-block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h2>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Job</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Blocked</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-24 border-b border-r border-gray-100 bg-gray-50/50" />;
                  }
                  const { dk, dayJobs, hasAvailability, hasBlocked } = getDateInfo(day);
                  const isToday = dk === todayKey;
                  const isSelected = dk === selectedDate;

                  return (
                    <div
                      key={dk}
                      onClick={() => setSelectedDate(dk)}
                      className={`h-24 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors hover:bg-blue-50/50 ${
                        isSelected ? "bg-blue-50 ring-2 ring-blue-500 ring-inset" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          isToday
                            ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                            : "text-gray-700"
                        }`}>
                          {day}
                        </span>
                        <div className="flex gap-0.5">
                          {hasAvailability && <span className="w-2 h-2 rounded-full bg-green-500" />}
                          {hasBlocked && <span className="w-2 h-2 rounded-full bg-red-500" />}
                        </div>
                      </div>
                      {dayJobs.slice(0, 2).map((j) => (
                        <div key={j.id} className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 py-0.5 truncate mb-0.5">
                          {j.title}
                        </div>
                      ))}
                      {dayJobs.length > 2 && (
                        <div className="text-[10px] text-gray-400">+{dayJobs.length - 2} more</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekly recurring availability */}
          <ScrollReveal delay={100}>
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Weekly Recurring Availability</h3>
            {weeklySlots.length === 0 ? (
              <p className="text-sm text-gray-500">No recurring schedule set.</p>
            ) : (
              <div className="space-y-2">
                {weeklySlots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{FULL_DAY_NAMES[slot.day_of_week!]}</span>
                      <span className="text-gray-500 ml-2">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                      {slot.note && <span className="text-gray-400 ml-2">({slot.note})</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-red-400 hover:text-red-600 text-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { setShowAddForm(true); setFormType("weekly"); }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              + Add Weekly Schedule
            </button>
          </div>
          </ScrollReveal>
        </div>

        {/* Day Detail Panel */}
        <div className="w-full lg:w-80 shrink-0">
          {selectedDate && selectedInfo ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900">{selectedInfo.dayName}</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedInfo.formatted}</p>

              {/* Jobs */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Jobs ({selectedInfo.dayJobs.length})</h4>
                {selectedInfo.dayJobs.length === 0 ? (
                  <p className="text-sm text-gray-400">No jobs scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {selectedInfo.dayJobs.map((j) => (
                      <Link key={j.id} href={`/jobs/${j.id}`} className="block bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100 transition-colors">
                        <p className="text-sm font-medium text-gray-900 truncate">{j.title}</p>
                        <p className="text-xs text-gray-500">{j.consumer_name} &middot; ${(j.price / 100).toFixed(2)}</p>
                        <span className={`inline-flex text-[10px] mt-1 px-1.5 py-0.5 rounded-full font-medium ${
                          j.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {j.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Availability</h4>
                {selectedInfo.specificSlots.length === 0 && selectedInfo.weeklySlots.length === 0 ? (
                  <p className="text-sm text-gray-400">No availability set</p>
                ) : (
                  <div className="space-y-1">
                    {selectedInfo.weeklySlots.filter((s) => !s.is_blocked).map((s) => (
                      <div key={s.id} className="text-sm text-green-700 bg-green-50 rounded px-2 py-1 flex justify-between items-center">
                        <span>{formatTime(s.start_time)} - {formatTime(s.end_time)} <span className="text-xs text-gray-400">(weekly)</span></span>
                      </div>
                    ))}
                    {selectedInfo.specificSlots.filter((s) => !s.is_blocked).map((s) => (
                      <div key={s.id} className="text-sm text-green-700 bg-green-50 rounded px-2 py-1 flex justify-between items-center">
                        <span>{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                        <button onClick={() => handleDeleteSlot(s.id)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">x</button>
                      </div>
                    ))}
                    {selectedInfo.specificSlots.filter((s) => s.is_blocked).map((s) => (
                      <div key={s.id} className="text-sm text-red-700 bg-red-50 rounded px-2 py-1 flex justify-between items-center">
                        <span>Blocked: {formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                        <button onClick={() => handleDeleteSlot(s.id)} className="text-red-400 hover:text-red-600 text-xs cursor-pointer">x</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddForm(true); setFormType("specific"); }}
                  className="flex-1 text-sm bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700 cursor-pointer"
                >
                  + Available
                </button>
                <button
                  onClick={() => { setShowAddForm(true); setFormType("block"); }}
                  className="flex-1 text-sm bg-red-600 text-white rounded-lg px-3 py-2 hover:bg-red-700 cursor-pointer"
                >
                  Block Time
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-sm text-gray-500">Click a day to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Slot Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {formType === "weekly" ? "Add Weekly Schedule" : formType === "block" ? "Block Time" : "Add Availability"}
            </h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              {formType === "weekly" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FULL_DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
              {formType !== "weekly" && selectedDate && (
                <p className="text-sm text-gray-600">
                  Date: <span className="font-medium">{new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g. Plumbing jobs only"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm text-white cursor-pointer ${
                    formType === "block" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                  } disabled:opacity-50`}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

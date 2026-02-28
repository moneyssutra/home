import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Check, Clock, FastForward, Receipt } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const DK = {
  bg: "#0B1120",
  card: "#111827",
  cardBorder: "rgba(59,130,246,0.08)",
  blue: "#3B82F6",
  orange: "#F97316",
  green: "#22C55E",
  amber: "#F59E0B",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  barTrack: "#1E293B",
  divider: "rgba(148,163,184,0.08)",
};

function getMonthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function getCalendarDays(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function getDueDay(expense) {
  if (expense.selectedDate) {
    const d = parseInt(expense.selectedDate);
    return isNaN(d) ? null : d;
  }
  if (expense.oneTimeDate) {
    const parts = expense.oneTimeDate.split("-");
    if (parts.length >= 3) return parseInt(parts[2]);
  }
  return null;
}

const formatAmount = (amount) => {
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};

// Heatmap color interpolation: blue → teal → orange → red
function getHeatColor(value, maxValue) {
  if (!value || !maxValue) return "transparent";
  const ratio = Math.min(1, value / maxValue);
  if (ratio < 0.33) {
    // Blue range
    const t = ratio / 0.33;
    const r = Math.round(20 + t * 10);
    const g = Math.round(40 + t * 50);
    const b = Math.round(80 + t * 50);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  } else if (ratio < 0.66) {
    // Teal to orange range
    const t = (ratio - 0.33) / 0.33;
    const r = Math.round(30 + t * 180);
    const g = Math.round(90 + t * 30);
    const b = Math.round(130 - t * 80);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;
  } else {
    // Orange to red range
    const t = (ratio - 0.66) / 0.34;
    const r = Math.round(210 + t * 35);
    const g = Math.round(120 - t * 60);
    const b = Math.round(50 - t * 30);
    return `rgba(${r}, ${g}, ${b}, 0.9)`;
  }
}

const ExpenseCalendar = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentMonthKey = getMonthKey(monthOffset);
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = currentMonthKey === todayMonthKey;

  useEffect(() => {
    setIsLoading(true);
    setMonthExpenses([]);
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/expenses/by-month?month=${currentMonthKey}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setMonthExpenses(d); setIsLoading(false); })
      .catch(e => { console.error("Calendar fetch failed:", e); setIsLoading(false); });
  }, [currentMonthKey]); // eslint-disable-line
  const calendarDays = useMemo(() => getCalendarDays(currentMonthKey), [currentMonthKey]);

  const dayExpenseMap = useMemo(() => {
    const map = {};
    monthExpenses.forEach((exp) => {
      const day = getDueDay(exp);
      if (day) {
        if (!map[day]) map[day] = [];
        map[day].push(exp);
      }
    });
    return map;
  }, [monthExpenses]);

  const unscheduledExpenses = useMemo(() => {
    return monthExpenses.filter((exp) => !getDueDay(exp));
  }, [monthExpenses]);

  const selectedExpenses = selectedDay ? (dayExpenseMap[selectedDay] || []) : [];

  const totalForMonth = monthExpenses.reduce((s, e) => s + (e.expectedAmount || 0), 0);
  const paidForMonth = monthExpenses.filter(e => e._displayStatus === "paid" || e._displayStatus === "prepaid").reduce((s, e) => s + (e.expectedAmount || 0), 0);

  // Max daily spend for heatmap scaling
  const maxDailySpend = useMemo(() => {
    let max = 0;
    Object.values(dayExpenseMap).forEach(exps => {
      const t = exps.reduce((s, e) => s + (e.expectedAmount || 0), 0);
      if (t > max) max = t;
    });
    return max;
  }, [dayExpenseMap]);

  // Week stats for selected day's week
  const weekStats = useMemo(() => {
    if (!selectedDay) return null;
    const [year, month] = currentMonthKey.split("-").map(Number);
    const dayDate = new Date(year, month - 1, selectedDay);
    const dayOfWeek = dayDate.getDay();
    const weekStart = selectedDay - dayOfWeek;
    let total = 0;
    let count = 0;
    for (let d = weekStart; d <= weekStart + 6; d++) {
      if (dayExpenseMap[d]) {
        total += dayExpenseMap[d].reduce((s, e) => s + (e.expectedAmount || 0), 0);
        count += dayExpenseMap[d].length;
      }
    }
    return { total, count, avgDaily: count > 0 ? Math.round(total / 7) : 0 };
  }, [selectedDay, dayExpenseMap, currentMonthKey]);

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid": return <Check className="h-3 w-3" style={{ color: DK.green }} />;
      case "prepaid": return <FastForward className="h-3 w-3" style={{ color: DK.blue }} />;
      default: return <Clock className="h-3 w-3" style={{ color: DK.amber }} />;
    }
  };

  const STATUS_COLORS = {
    paid: { dot: DK.green, bg: "rgba(34,197,94,0.12)" },
    prepaid: { dot: DK.blue, bg: "rgba(59,130,246,0.12)" },
    pending: { dot: DK.amber, bg: "rgba(245,158,11,0.12)" },
  };

  return (
    <div className={embedded ? "" : "min-h-screen pb-32"} style={{ backgroundColor: DK.bg }} data-testid="expense-calendar-page">
      {/* Header - standalone mode */}
      {!embedded && (
        <header className="px-5 pt-6 pb-4" style={{ backgroundColor: DK.bg }}>
          <div className="flex items-center gap-3 mb-4">
            <BackButton fallbackPath="/my-expenses" forceNavigate={true} className="text-white" />
            <h1 className="text-xl font-bold" style={{ color: DK.textPrimary }}>Expense Calendar</h1>
          </div>
        </header>
      )}

      {/* Month Selector */}
      <div className={embedded ? "px-5 pt-4 pb-2" : "px-5 pb-3"}>
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
          <button onClick={() => { setMonthOffset(p => Math.max(-2, p - 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg transition-colors" style={{ color: DK.textMuted }} data-testid="cal-month-prev">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: DK.textPrimary }} data-testid="cal-month-label">{getMonthLabel(currentMonthKey)}</p>
          </div>
          <button onClick={() => { setMonthOffset(p => Math.min(3, p + 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg transition-colors" style={{ color: DK.textMuted }} data-testid="cal-month-next">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: DK.textMuted }}>Total</p>
            <p className="text-sm font-bold" style={{ color: DK.textPrimary }}>₹{formatAmount(totalForMonth)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: DK.textMuted }}>Settled</p>
            <p className="text-sm font-bold" style={{ color: DK.green }}>₹{formatAmount(paidForMonth)}</p>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 mt-2">
        <div className="rounded-2xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="calendar-grid">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d, i) => (
              <div key={`${d}-${i}`} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: DK.textMuted }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells with heatmap */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12" style={{ color: DK.textMuted }}>Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const expenses = dayExpenseMap[day] || [];
                const hasExpenses = expenses.length > 0;
                const isToday = isCurrentMonth && day === todayDay;
                const isSelected = day === selectedDay;
                const dayTotal = expenses.reduce((s, e) => s + (e.expectedAmount || 0), 0);
                const heatBg = hasExpenses ? getHeatColor(dayTotal, maxDailySpend) : "transparent";

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="relative flex flex-col items-center justify-center rounded-lg min-h-[52px] transition-all"
                    style={{
                      backgroundColor: isSelected ? DK.blue : heatBg,
                      border: isToday && !isSelected ? `1.5px solid ${DK.blue}` : "1.5px solid transparent",
                      boxShadow: isSelected ? `0 0 12px rgba(59,130,246,0.3)` : "none",
                    }}
                    data-testid={`cal-day-${day}`}
                  >
                    <span className="text-[11px] font-semibold" style={{ color: isSelected ? "#fff" : isToday ? DK.blue : hasExpenses ? "#E2E8F0" : DK.textMuted }}>
                      {day}
                    </span>
                    {hasExpenses && (
                      <span className="text-[8px] font-bold mt-0.5" style={{ color: isSelected ? "rgba(255,255,255,0.9)" : "#E2E8F0" }}>
                        ₹{formatAmount(dayTotal)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Heatmap Legend */}
          <div className="mt-3 pt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${DK.divider}` }}>
            <span className="text-[9px]" style={{ color: DK.textMuted }}>₹0</span>
            <div className="flex-1 mx-2 h-2 rounded-full overflow-hidden flex">
              <div className="flex-1" style={{ background: "linear-gradient(90deg, rgba(20,40,80,0.7), rgba(30,90,130,0.8), rgba(210,120,50,0.8), rgba(245,60,20,0.9))" }} />
            </div>
            <span className="text-[9px]" style={{ color: DK.textMuted }}>₹{formatAmount(maxDailySpend)}</span>
          </div>
        </div>
      </div>

      {/* Week Stats */}
      {weekStats && selectedDay && (
        <div className="px-4 mt-3">
          <div className="flex items-center justify-center gap-4 py-2 rounded-xl" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-xs" style={{ color: DK.textSecondary }}>
              Week Total: <span className="font-bold" style={{ color: DK.textPrimary }}>₹{formatAmount(weekStats.total)}</span>
            </p>
            <div className="w-px h-4" style={{ backgroundColor: DK.divider }} />
            <p className="text-xs" style={{ color: DK.textSecondary }}>
              Avg Daily: <span className="font-bold" style={{ color: DK.textPrimary }}>₹{formatAmount(weekStats.avgDaily)}</span>
            </p>
          </div>
        </div>
      )}

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="px-4 mt-3" data-testid="selected-day-detail">
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${DK.divider}` }}>
              <h3 className="text-sm font-bold" style={{ color: DK.textPrimary }}>
                {getMonthLabel(currentMonthKey).split(" ")[0]} {selectedDay}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-md" style={{ backgroundColor: DK.barTrack, color: DK.textMuted }}>
                {selectedExpenses.length} expense{selectedExpenses.length !== 1 ? "s" : ""}
              </span>
            </div>

            {selectedExpenses.length === 0 ? (
              <div className="p-6 text-center">
                <CalendarDays className="h-7 w-7 mx-auto mb-2" style={{ color: DK.textMuted }} />
                <p className="text-xs" style={{ color: DK.textMuted }}>No expenses due</p>
              </div>
            ) : (
              <div>
                {selectedExpenses.map((exp, i) => {
                  const status = exp._displayStatus || "pending";
                  const sc = STATUS_COLORS[status] || STATUS_COLORS.pending;
                  const catColors = { "Housing": DK.blue, "Utilities": DK.amber, "Food": DK.green, "Travel": "#8B5CF6", "Shopping": DK.orange, "Medical": "#EF4444", "EMI": "#F97316", "Investments": "#22C55E", "Insurance": "#06B6D4" };
                  const catColor = catColors[exp.category] || DK.blue;
                  const expTotal = selectedExpenses.reduce((s, e) => s + (e.expectedAmount || 0), 0);
                  const pct = expTotal > 0 ? Math.round(exp.expectedAmount / expTotal * 100) : 0;

                  return (
                    <button
                      key={exp.id}
                      onClick={() => navigate(`/expense/${exp.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/5"
                      style={{ borderTop: i > 0 ? `1px solid ${DK.divider}` : "none" }}
                      data-testid={`cal-expense-${exp.id}`}
                    >
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: catColor }} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: DK.textPrimary }}>{exp.expenseName}</p>
                        <p className="text-[10px]" style={{ color: DK.textMuted }}>{exp.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${catColor}, ${catColor}dd)` }} />
                        </div>
                        <p className="text-sm font-bold w-16 text-right" style={{ color: DK.textPrimary }}>₹{formatAmount(exp.expectedAmount)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unscheduled */}
      {unscheduledExpenses.length > 0 && !selectedDay && (
        <div className="px-4 mt-3" data-testid="unscheduled-expenses">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: DK.textMuted }}>No Specific Date</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            {unscheduledExpenses.map((exp, i) => {
              const status = exp._displayStatus || "pending";
              const sc = STATUS_COLORS[status] || STATUS_COLORS.pending;
              return (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: i > 0 ? `1px solid ${DK.divider}` : "none" }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                  <p className="flex-1 text-xs truncate" style={{ color: DK.textSecondary }}>{exp.expenseName}</p>
                  <p className="text-xs font-semibold" style={{ color: DK.textPrimary }}>₹{formatAmount(exp.expectedAmount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!embedded && <BottomNav onAddClick={() => setShowAddSheet(true)} />}
      {!embedded && <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />}
    </div>
  );
};

export default ExpenseCalendar;

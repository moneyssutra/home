import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Receipt, Wallet, CreditCard } from "lucide-react";
import axios from "axios";
import ExpenseLayout, { THEME, fmt, fmtFull } from "./ExpenseLayout";

const API = process.env.REACT_APP_BACKEND_URL;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function getMonthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

const CATEGORY_ICONS = {
  Housing: "Home", Utilities: "Zap", Food: "Coffee", Medical: "Heart",
  Education: "GraduationCap", Insurance: "Shield", EMI: "CreditCard",
  Travel: "Plane", Shopping: "ShoppingBag", Subscriptions: "Tv",
};

const INTENSITY_COLORS = [
  "rgba(59, 130, 246, 0.15)",  // light blue - low
  "rgba(59, 130, 246, 0.35)",  // medium blue
  "rgba(251, 191, 36, 0.4)",   // amber
  "rgba(251, 191, 36, 0.6)",   // dark amber
  "rgba(239, 68, 68, 0.5)",    // red - high
];

function getIntensityColor(amount, maxAmount) {
  if (!amount || amount <= 0) return "transparent";
  if (maxAmount <= 0) return INTENSITY_COLORS[0];
  const ratio = amount / maxAmount;
  if (ratio < 0.2) return INTENSITY_COLORS[0];
  if (ratio < 0.4) return INTENSITY_COLORS[1];
  if (ratio < 0.6) return INTENSITY_COLORS[2];
  if (ratio < 0.8) return INTENSITY_COLORS[3];
  return INTENSITY_COLORS[4];
}

const SUB_TABS = [
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "income", label: "Income", icon: Wallet },
  { key: "emis", label: "EMIs", icon: CreditCard },
];

export default function ExpenseDaily() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [activeSubTab, setActiveSubTab] = useState("expenses");
  const breakdownRef = useRef(null);

  const currentMonthKey = getMonthKey(monthOffset);
  const [y, m] = currentMonthKey.split("-").map(Number);
  const monthLabel = `${MONTH_NAMES[m - 1]} ${y}`;
  const calendarDays = getCalendarDays(currentMonthKey);
  const today = new Date();
  const isCurrentMonth = monthOffset === 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/expenses/by-month`, {
          params: { month: currentMonthKey },
          withCredentials: true,
        });
        setExpenses(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentMonthKey]);

  // Build day totals for heatmap
  const { dayTotals, maxDayAmount, dayExpenses } = useMemo(() => {
    const totals = {};
    const byDay = {};
    let maxAmt = 0;

    for (const exp of expenses) {
      const dueDay = getDueDay(exp);
      if (!dueDay) continue;

      const amt = exp.expectedAmount || 0;
      const freq = exp.frequency || "Monthly";

      if (freq === "Daily") {
        const daysInMonth = new Date(y, m, 0).getDate();
        const dailyAmt = amt;
        for (let d = 1; d <= daysInMonth; d++) {
          totals[d] = (totals[d] || 0) + dailyAmt;
          if (!byDay[d]) byDay[d] = [];
          byDay[d].push(exp);
        }
      } else {
        totals[dueDay] = (totals[dueDay] || 0) + amt;
        if (!byDay[dueDay]) byDay[dueDay] = [];
        byDay[dueDay].push(exp);
      }
    }

    for (const v of Object.values(totals)) {
      if (v > maxAmt) maxAmt = v;
    }

    return { dayTotals: totals, maxDayAmount: maxAmt, dayExpenses: byDay };
  }, [expenses, y, m]);

  const selectedExpenses = useMemo(() => {
    const exps = dayExpenses[selectedDay] || [];
    if (activeSubTab === "emis") return exps.filter((e) => e.category === "EMI");
    return exps;
  }, [dayExpenses, selectedDay, activeSubTab]);

  const handleDayClick = (day) => {
    if (!day) return;
    setSelectedDay(day);
    setTimeout(() => {
      breakdownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (loading) {
    return (
      <ExpenseLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: THEME.barTrack, borderTopColor: THEME.accent }} />
        </div>
      </ExpenseLayout>
    );
  }

  return (
    <ExpenseLayout>
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex gap-2" data-testid="daily-sub-tabs">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.12)" : "rgba(255,255,255,0.03)",
                  color: isActive ? "#818CF8" : THEME.textMuted,
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.2)" : `1px solid ${THEME.cardBorder}`,
                }}
                data-testid={`subtab-${tab.key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            data-testid="daily-month-prev"
          >
            <ChevronLeft className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
          <span className="text-sm font-bold" style={{ color: THEME.textPrimary }}>{monthLabel}</span>
          <button
            onClick={() => setMonthOffset((o) => Math.min(o + 1, 0))}
            disabled={monthOffset >= 0}
            className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
            data-testid="daily-month-next"
          >
            <ChevronRight className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div
          className="rounded-2xl p-3"
          style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.cardBorder}`, backdropFilter: "blur(12px)" }}
          data-testid="expense-calendar-grid"
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold py-1" style={{ color: THEME.textMuted }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={i} />;
              const isToday = isCurrentMonth && day === today.getDate();
              const isSelected = day === selectedDay;
              const amount = dayTotals[day] || 0;
              const intensity = getIntensityColor(amount, maxDayAmount);

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  className="relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all"
                  style={{
                    backgroundColor: isSelected ? "rgba(99, 102, 241, 0.2)" : intensity,
                    border: isSelected ? "1.5px solid #818CF8" : isToday ? "1.5px solid rgba(99, 102, 241, 0.4)" : "1.5px solid transparent",
                  }}
                  data-testid={`cal-day-${day}`}
                >
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isSelected ? "#818CF8" : amount > 0 ? THEME.textPrimary : THEME.textMuted }}
                  >
                    {day}
                  </span>
                  {amount > 0 && (
                    <span className="text-[7px] font-bold" style={{ color: THEME.textMuted }}>
                      {fmt(amount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2 mt-3 pt-2" style={{ borderTop: `1px solid ${THEME.divider}` }}>
            <span className="text-[9px]" style={{ color: THEME.textMuted }}>Low</span>
            {INTENSITY_COLORS.map((c, i) => (
              <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
            ))}
            <span className="text-[9px]" style={{ color: THEME.textMuted }}>High</span>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div ref={breakdownRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.textMuted }}>
              {selectedDay ? `${MONTH_NAMES[m - 1]} ${selectedDay}` : "Select a Date"}
            </h3>
            {dayTotals[selectedDay] > 0 && (
              <span className="text-xs font-bold" style={{ color: THEME.accent }}>
                {fmtFull(dayTotals[selectedDay])}
              </span>
            )}
          </div>

          {selectedExpenses.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.cardBorder}` }}
              data-testid="no-expenses-day"
            >
              <Receipt className="h-8 w-8 mx-auto mb-2" style={{ color: THEME.textMuted }} />
              <p className="text-xs" style={{ color: THEME.textMuted }}>
                {activeSubTab === "income" ? "No income on this date" : activeSubTab === "emis" ? "No EMIs on this date" : "No expenses on this date"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => navigate(`/expense/${exp.id}`)}
                  className="rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer active:scale-[0.98]"
                  style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.cardBorder}` }}
                  data-testid={`daily-expense-${exp.id}`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: exp._displayStatus === "paid" || exp._displayStatus === "prepaid" ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)",
                    }}
                  >
                    <Receipt
                      className="h-4 w-4"
                      style={{ color: exp._displayStatus === "paid" || exp._displayStatus === "prepaid" ? "#10B981" : THEME.essential }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: THEME.textPrimary }}>
                      {exp.expenseName}
                    </p>
                    <p className="text-[10px]" style={{ color: THEME.textMuted }}>
                      {exp.category} · {exp.frequency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: THEME.textPrimary }}>
                      {fmtFull(exp.expectedAmount || 0)}
                    </p>
                    <p
                      className="text-[9px] font-semibold"
                      style={{
                        color: exp._displayStatus === "paid" ? "#10B981" : exp._displayStatus === "prepaid" ? "#8B5CF6" : "#F59E0B",
                      }}
                    >
                      {exp._displayStatus === "paid" ? "Paid" : exp._displayStatus === "prepaid" ? "Prepaid" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ExpenseLayout>
  );
}

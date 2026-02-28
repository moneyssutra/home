import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Check, Clock, FastForward, Receipt } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useExpensesByMonth } from "@/hooks/useApi";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const STATUS_COLORS = {
  paid: { dot: "#10B981", bg: "#D1FAE5" },
  prepaid: { dot: "#2563EB", bg: "#DBEAFE" },
  pending: { dot: "#F59E0B", bg: "#FEF3C7" },
};

const ExpenseCalendar = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const currentMonthKey = getMonthKey(monthOffset);
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = currentMonthKey === todayMonthKey;

  const { data: monthExpenses = [], isLoading } = useExpensesByMonth(currentMonthKey);
  const calendarDays = useMemo(() => getCalendarDays(currentMonthKey), [currentMonthKey]);

  // Map expenses to their due days
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

  // Expenses without a specific due day
  const unscheduledExpenses = useMemo(() => {
    return monthExpenses.filter((exp) => !getDueDay(exp));
  }, [monthExpenses]);

  // Selected day's expenses
  const selectedExpenses = selectedDay ? (dayExpenseMap[selectedDay] || []) : [];

  // Stats
  const totalForMonth = monthExpenses.reduce((s, e) => s + (e.expectedAmount || 0), 0);
  const paidForMonth = monthExpenses.filter(e => e._displayStatus === "paid" || e._displayStatus === "prepaid").reduce((s, e) => s + (e.expectedAmount || 0), 0);

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid": return <Check className="h-3 w-3" style={{ color: "#10B981" }} />;
      case "prepaid": return <FastForward className="h-3 w-3" style={{ color: "#2563EB" }} />;
      default: return <Clock className="h-3 w-3" style={{ color: "#F59E0B" }} />;
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen pb-32"} style={{ backgroundColor: "var(--bg-app)" }} data-testid="expense-calendar-page">
      {/* Header - only show when standalone */}
      {!embedded && (
      <header className="px-6 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 50%, #C4B5FD 100%)" }}>
        <div className="flex items-center gap-4 mb-5">
          <BackButton fallbackPath="/my-expenses" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Expense Calendar
          </h1>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20" data-testid="calendar-month-selector">
          <button onClick={() => { setMonthOffset(p => Math.max(-2, p - 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" data-testid="cal-month-prev">
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-base" data-testid="cal-month-label">{getMonthLabel(currentMonthKey)}</p>
            <p className="text-white/60 text-xs">{isCurrentMonth ? "Current Month" : monthOffset > 0 ? `+${monthOffset} months` : `${monthOffset} months`}</p>
          </div>
          <button onClick={() => { setMonthOffset(p => Math.min(3, p + 1)); setSelectedDay(null); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" data-testid="cal-month-next">
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <div>
            <p className="text-white/60 text-xs">Total Expenses</p>
            <p className="text-white font-bold text-lg">₹{formatAmount(totalForMonth)}</p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-xs">Settled</p>
            <p className="font-bold text-lg" style={{ color: "#A7F3D0" }}>₹{formatAmount(paidForMonth)}</p>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="px-4 -mt-3">
        <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="calendar-grid">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: "var(--text-muted)" }}>{d}</div>
            ))}
          </div>

          {/* Calendar cells */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12" style={{ color: "var(--text-muted)" }}>Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} />;
                const expenses = dayExpenseMap[day] || [];
                const hasExpenses = expenses.length > 0;
                const isToday = isCurrentMonth && day === todayDay;
                const isSelected = day === selectedDay;
                const dayTotal = expenses.reduce((s, e) => s + (e.expectedAmount || 0), 0);
                const allPaid = expenses.length > 0 && expenses.every(e => e._displayStatus === "paid" || e._displayStatus === "prepaid");
                const hasPending = expenses.some(e => e._displayStatus === "pending");

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className="relative flex flex-col items-center rounded-xl p-1 min-h-[56px] transition-all"
                    style={{
                      backgroundColor: isSelected ? "var(--brand-primary)" : isToday ? "var(--brand-primary-soft)" : hasExpenses ? "var(--bg-subtle)" : "transparent",
                      border: isToday && !isSelected ? "2px solid var(--brand-primary)" : "2px solid transparent",
                    }}
                    data-testid={`cal-day-${day}`}
                  >
                    <span className="text-xs font-semibold" style={{ color: isSelected ? "white" : isToday ? "var(--brand-primary)" : "var(--text-primary)" }}>
                      {day}
                    </span>
                    {hasExpenses && (
                      <>
                        <div className="flex gap-0.5 mt-0.5">
                          {allPaid && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10B981" }} />}
                          {hasPending && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />}
                          {!allPaid && !hasPending && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#2563EB" }} />}
                        </div>
                        <span className="text-[8px] font-bold mt-0.5" style={{ color: isSelected ? "white" : "var(--text-muted)" }}>
                          ₹{dayTotal >= 1000 ? `${(dayTotal / 1000).toFixed(0)}K` : dayTotal}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t" style={{ borderColor: "var(--border-light)" }}>
            {[
              { label: "Paid", color: "#10B981" },
              { label: "Pending", color: "#F59E0B" },
              { label: "Prepaid", color: "#2563EB" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="px-4 mt-4" data-testid="selected-day-detail">
          <h3 className="text-sm font-bold mb-2 px-1" style={{ color: "var(--text-primary)" }}>
            {getMonthLabel(currentMonthKey).split(" ")[0]} {selectedDay}
            <span className="font-normal ml-2" style={{ color: "var(--text-muted)" }}>
              {selectedExpenses.length} expense{selectedExpenses.length !== 1 ? "s" : ""}
            </span>
          </h3>

          {selectedExpenses.length === 0 ? (
            <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <CalendarDays className="h-8 w-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No expenses due on this date</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedExpenses.map(exp => {
                const status = exp._displayStatus || "pending";
                const sc = STATUS_COLORS[status] || STATUS_COLORS.pending;
                return (
                  <button
                    key={exp.id}
                    onClick={() => navigate(`/expense/${exp.id}`)}
                    className="w-full flex items-center gap-3 rounded-xl p-3 transition-all"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    data-testid={`cal-expense-${exp.id}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: sc.bg }}>
                      {getStatusIcon(status)}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{exp.expenseName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{exp.category} · {exp.frequency}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: status === "pending" ? "var(--text-primary)" : sc.dot }}>
                        ₹{formatAmount(exp.expectedAmount)}
                      </p>
                      <p className="text-[10px] capitalize" style={{ color: sc.dot }}>{status === "prepaid" ? "Paid Early" : status}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unscheduled Expenses */}
      {unscheduledExpenses.length > 0 && (
        <div className="px-4 mt-4" data-testid="unscheduled-expenses">
          <h3 className="text-sm font-bold mb-2 px-1" style={{ color: "var(--text-primary)" }}>
            No Specific Date
            <span className="font-normal ml-2" style={{ color: "var(--text-muted)" }}>{unscheduledExpenses.length} expenses</span>
          </h3>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            {unscheduledExpenses.map((exp, i) => {
              const status = exp._displayStatus || "pending";
              const sc = STATUS_COLORS[status] || STATUS_COLORS.pending;
              return (
                <div
                  key={exp.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--border-light)" : "none" }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot }} />
                  <p className="flex-1 text-sm truncate" style={{ color: "var(--text-primary)" }}>{exp.expenseName}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(exp.expectedAmount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link back */}
      <div className="px-4 mt-6">
        <button
          onClick={() => navigate("/my-expenses")}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all"
          style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}
          data-testid="back-to-list-btn"
        >
          <Receipt className="h-4 w-4" />
          View as List
        </button>
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default ExpenseCalendar;

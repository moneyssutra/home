import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, ChevronLeft, Plus, Receipt, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal, TrendingUp, PiggyBank, Check, Clock, CalendarDays, FastForward, Undo2, List, Calendar, BarChart3, LineChart } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useExpenseList } from "@/hooks/useApi";
import { mutate } from "swr";
import { normalizeToMonthly } from "@/lib/formatters";
import ExpenseWeekly from "@/ExpenseWeekly";
import ExpenseMonthly from "@/ExpenseMonthly";
import ExpenseCalendar from "@/ExpenseCalendar";

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getMonthKey(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const MyExpenses = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [activeView, setActiveView] = useState(searchParams.get("tab") || "list");

  const handleViewChange = (view) => {
    setActiveView(view);
    setSearchParams({ tab: view }, { replace: true });
  };

  const currentMonthKey = getMonthKey(monthOffset);
  const isCurrentMonth = monthOffset === 0;
  const isNextMonth = monthOffset === 1;

  // Fetch summary for totals (all expenses)
  const { data: allExpenses = [] } = useExpenseList();
  // Fetch month-specific data with direct axios (avoid SWR caching issues)
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMonthExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/expenses/by-month`, {
        params: { month: currentMonthKey },
        withCredentials: true,
      });
      setMonthExpenses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setMonthExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonthKey]);

  useEffect(() => { fetchMonthExpenses(); }, [fetchMonthExpenses]);

  const mutateMonth = fetchMonthExpenses;

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const totalMonthly = useMemo(() =>
    allExpenses.reduce((sum, exp) => sum + normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || "Monthly"), 0),
    [allExpenses]
  );

  // Month expense stats
  const monthStats = useMemo(() => {
    const paid = monthExpenses.filter(e => e._displayStatus === "paid" || e._displayStatus === "prepaid");
    const pending = monthExpenses.filter(e => e._displayStatus === "pending");
    return {
      total: monthExpenses.reduce((s, e) => s + (e.expectedAmount || 0), 0),
      paidTotal: paid.reduce((s, e) => s + (e.expectedAmount || 0), 0),
      pendingTotal: pending.reduce((s, e) => s + (e.expectedAmount || 0), 0),
      paidCount: paid.length,
      pendingCount: pending.length,
    };
  }, [monthExpenses]);

  // Sort: pending first, then paid/prepaid
  const sortedExpenses = useMemo(() => {
    const order = { pending: 0, paid: 1, prepaid: 2 };
    return [...monthExpenses].sort((a, b) => (order[a._displayStatus] ?? 0) - (order[b._displayStatus] ?? 0));
  }, [monthExpenses]);

  const handleMarkPaid = useCallback(async (expenseId, expenseName) => {
    setActionLoading(expenseId);
    try {
      await axios.post(`${API}/api/expenses/${expenseId}/mark-paid`, {}, { withCredentials: true });
      toast.success(`${expenseName} marked as paid`);
      mutateMonth();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark as paid");
    } finally {
      setActionLoading(null);
    }
  }, [mutateMonth]);

  const handlePrepay = useCallback(async (expenseId, expenseName) => {
    setActionLoading(expenseId);
    try {
      const res = await axios.post(`${API}/api/expenses/${expenseId}/prepay`, {}, { withCredentials: true });
      toast.success(`${expenseName} prepaid for ${getMonthLabel(res.data.expenseMonth)}`);
      mutateMonth();
      // Also invalidate next month's cache
      mutate(`${API}/api/expenses/by-month?month=${getMonthKey(1)}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to prepay");
    } finally {
      setActionLoading(null);
    }
  }, [mutateMonth]);

  const handleUnmarkPaid = useCallback(async (expenseId, expenseName) => {
    setActionLoading(expenseId);
    try {
      await axios.post(`${API}/api/expenses/${expenseId}/unmark-paid`, {}, { withCredentials: true });
      toast.success(`${expenseName} unmarked as paid`);
      mutateMonth();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to undo");
    } finally {
      setActionLoading(null);
    }
  }, [mutateMonth]);

  const handleUndoPrepay = useCallback(async (expenseId, expenseName) => {
    setActionLoading(expenseId);
    try {
      await axios.post(`${API}/api/expenses/${expenseId}/undo-prepay`, {}, { withCredentials: true });
      toast.success(`Prepayment undone for ${expenseName}`);
      mutateMonth();
      mutate(`${API}/api/expenses/by-month?month=${getMonthKey(1)}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to undo prepay");
    } finally {
      setActionLoading(null);
    }
  }, [mutateMonth]);

  const getCategoryIcon = (category) => {
    const icons = {
      "Housing": Home, "Utilities": Zap, "Food": ShoppingBag, "Travel": Car,
      "Shopping": ShoppingBag, "Medical": Stethoscope, "Education": GraduationCap,
      "Insurance": Shield, "Subscriptions": Tv, "EMI": CreditCard,
      "Business Expense": Briefcase, "Salary Paid": Wallet,
      "Investments": TrendingUp, "Savings": PiggyBank,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Housing": { bg: "var(--status-info-soft)", text: "var(--status-info)" },
      "Utilities": { bg: "var(--status-warning-soft)", text: "var(--status-warning)" },
      "Food": { bg: "var(--brand-primary-soft)", text: "var(--brand-primary)" },
      "Travel": { bg: "#F3E8FF", text: "var(--chart-accent2)" },
      "Shopping": { bg: "#FCE7F3", text: "#DB2777" },
      "Medical": { bg: "var(--status-error-soft)", text: "var(--status-error)" },
      "Education": { bg: "#CFFAFE", text: "#0891B2" },
      "Insurance": { bg: "#E0E7FF", text: "#4F46E5" },
      "Subscriptions": { bg: "var(--brand-secondary-soft)", text: "var(--brand-secondary)" },
      "EMI": { bg: "#FFEDD5", text: "#EA580C" },
      "Business Expense": { bg: "#ECFCCB", text: "#65A30D" },
      "Salary Paid": { bg: "var(--status-success-soft)", text: "var(--status-success)" },
      "Investments": { bg: "#EDE9FE", text: "#8B5CF6" },
      "Savings": { bg: "#E0F2FE", text: "#0EA5E9" },
    };
    return colors[category] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid": return { label: "Paid", bg: "var(--status-success-soft)", text: "var(--status-success)", border: "var(--status-success)", icon: Check };
      case "prepaid": return { label: "Paid Early", bg: "#DBEAFE", text: "#2563EB", border: "#2563EB", icon: FastForward };
      case "pending": return { label: "Pending", bg: "var(--status-warning-soft)", text: "var(--status-warning)", border: "var(--status-warning)", icon: Clock };
      default: return { label: "Upcoming", bg: "var(--status-info-soft)", text: "var(--status-info)", border: "var(--status-info)", icon: CalendarDays };
    }
  };

  const expenseByCategory = useMemo(() => {
    const acc = {};
    allExpenses.forEach((exp) => {
      const cat = exp.category || "Other";
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      acc[cat].total += normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || "Monthly");
      acc[cat].count += 1;
    });
    return Object.entries(acc).sort(([, a], [, b]) => b.total - a.total);
  }, [allExpenses]);

  const chartColors = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#06B6D4", "#EC4899"];

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-expenses-page">
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0D9488 0%, #14B8A6 40%, #06B6D4 100%)" }}>
      <header className="px-4 sm:px-6 pt-6 sm:pt-8 pb-3 sm:pb-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors bg-white/20 border border-white/30 text-white hover:bg-white/30"
            onClick={() => activeView !== "list" ? handleViewChange("list") : navigate("/wealth")}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Expenses
          </h1>
        </div>

        {/* View Toggle */}
        <div className="flex bg-white/15 rounded-xl p-1 backdrop-blur-sm" data-testid="expense-view-toggle">
          {[
            { id: "list", label: "List", icon: List },
            { id: "daily", label: "Daily", icon: Calendar },
            { id: "weekly", label: "Weekly", icon: BarChart3 },
            { id: "monthly", label: "Monthly", icon: LineChart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleViewChange(id)}
              className="flex-1 flex items-center justify-center gap-1 py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all"
              style={{
                backgroundColor: activeView === id ? "rgba(255,255,255,0.95)" : "transparent",
                color: activeView === id ? "#0D9488" : "rgba(255,255,255,0.8)",
                boxShadow: activeView === id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              }}
              data-testid={`view-toggle-${id}`}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Month Selector — inside same gradient so no gap (List view only) */}
      {activeView === "list" && (
      <div className="px-6 pb-5">
        <div className="flex items-center justify-between mb-5 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-white/20" data-testid="month-selector">
          <button
            onClick={() => setMonthOffset(Math.max(-2, monthOffset - 1))}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            disabled={monthOffset <= -2}
            data-testid="month-prev-btn"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-white font-semibold text-base" data-testid="month-label">{getMonthLabel(currentMonthKey)}</p>
            <p className="text-white/60 text-xs">
              {isCurrentMonth ? "Current Month" : isNextMonth ? "Next Month" : monthOffset > 0 ? `+${monthOffset} months` : `${monthOffset} months`}
            </p>
          </div>
          <button
            onClick={() => setMonthOffset(Math.min(3, monthOffset + 1))}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30"
            disabled={monthOffset >= 3}
            data-testid="month-next-btn"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Month Summary */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="month-summary-card">
          <p className="text-white/70 text-sm font-medium mb-1">
            {getMonthLabel(currentMonthKey)} Expenses
          </p>
          <h2 className="text-3xl font-bold text-white">
            {loading ? "..." : `₹ ${formatAmount(monthStats.total)}`}
          </h2>
          <p className="text-white/50 text-xs mt-1">{monthExpenses.length} expenses this month</p>

          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Paid / Prepaid</p>
              <p className="font-semibold" style={{ color: "#A7F3D0" }}>
                ₹{formatAmount(monthStats.paidTotal)}
              </p>
              <p className="text-white/50 text-xs">{monthStats.paidCount} expenses</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Pending</p>
              <p className="font-semibold" style={{ color: "#FDE68A" }}>
                ₹{formatAmount(monthStats.pendingTotal)}
              </p>
              <p className="text-white/50 text-xs">{monthStats.pendingCount} expenses</p>
            </div>
          </div>

          {/* Progress bar */}
          {monthStats.total > 0 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (monthStats.paidTotal / monthStats.total) * 100)}%`,
                    background: "linear-gradient(90deg, #34D399, #6EE7B7)",
                  }}
                />
              </div>
              <p className="text-white/50 text-xs mt-1 text-right">
                {Math.round((monthStats.paidTotal / monthStats.total) * 100)}% settled
              </p>
            </div>
          )}
        </div>
      </div>
      )}
      </div>

      {/* Conditional Views */}
      {activeView === "daily" && <ExpenseCalendar embedded expenses={monthExpenses} monthKey={currentMonthKey} monthOffset={monthOffset} setMonthOffset={setMonthOffset} dataLoading={loading} />}
      {activeView === "weekly" && <ExpenseWeekly />}
      {activeView === "monthly" && <ExpenseMonthly />}
      {activeView === "list" && (
      <>

      {/* Expense Allocation (only on current month view) */}
      {isCurrentMonth && expenseByCategory.length > 0 && (
        <div className="px-6 mt-4">
          <div
            className="w-full rounded-2xl p-5 shadow-card text-left transition-all hover:shadow-lg"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            data-testid="expense-allocation"
          >
            <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => navigate("/expense-breakdown")}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Expense Breakdown</h3>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                View All
              </span>
            </div>
            <div className="space-y-3">
              {expenseByCategory.slice(0, 5).map(([category, data], idx) => {
                const percentage = totalMonthly > 0 ? (data.total / totalMonthly) * 100 : 0;
                const Icon = getCategoryIcon(category);
                const catColor = getCategoryColor(category);
                const categorySlug = category.toLowerCase().replace(/\s+/g, "-");
                return (
                  <div
                    key={category}
                    className="flex items-center gap-3 cursor-pointer rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); navigate(`/expenses/${categorySlug}`); }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: catColor.bg }}>
                      <Icon className="h-5 w-5" style={{ color: catColor.text }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{category}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }} />
                        </div>
                        <span className="text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed vs Variable Split (only on current month) */}
      {isCurrentMonth && allExpenses.length > 0 && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-2 gap-3" style={{ alignItems: "stretch" }}>
            {[
              { label: "Fixed", type: "Fixed", Icon: Shield, path: "/expenses/fixed", color: "var(--text-secondary)", bgColor: "var(--bg-subtle)" },
              { label: "Variable", type: "Variable", Icon: Zap, path: "/expenses/variable", color: "var(--status-warning)", bgColor: "var(--status-warning-soft)" },
            ].map(({ label, type, Icon, path, color, bgColor }) => {
              const items = allExpenses.filter(e => e.expenseType === type);
              const total = items.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || "Monthly"), 0);
              return (
                <button
                  key={type}
                  onClick={() => navigate(path)}
                  className="rounded-2xl p-4 shadow-card text-left hover:shadow-md transition-all flex flex-col"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", minHeight: "160px" }}
                  data-testid={`${label.toLowerCase()}-expenses-card`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</span>
                    <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(total)}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{items.length} expenses</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Month Expense List */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {getMonthLabel(currentMonthKey)} - All Expenses
          </h3>
          <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>
            {monthExpenses.length} items
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : monthExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--status-error-soft)" }}>
              <Receipt className="h-10 w-10" style={{ color: "var(--status-error)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Expenses for {getMonthLabel(currentMonthKey)}</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {isCurrentMonth ? "Start tracking your expenses" : "No expenses scheduled for this month"}
            </p>
            {isCurrentMonth && (
              <button
                onClick={() => navigate("/expense")}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <Plus className="h-5 w-5" />
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedExpenses.map((expense) => {
              const status = expense._displayStatus || "pending";
              const Icon = getCategoryIcon(expense.category);
              const catColor = getCategoryColor(expense.category);
              const badge = getStatusBadge(status);
              const BadgeIcon = badge.icon;
              const isPrepaidChild = !!expense.linkedPaymentId;
              const isLoading = actionLoading === expense.id;

              return (
                <div
                  key={expense.id}
                  className="rounded-xl shadow-card overflow-hidden"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`expense-card-${expense.id}`}
                >
                  <button
                    onClick={() => {
                      if (isPrepaidChild) return;
                      const currentPath = "/my-expenses";
                      if (expense.linkedLoanId) navigate(`/wealth/loans/${expense.linkedLoanId}`, { state: { fromExpenses: currentPath } });
                      else if (expense.linkedInsuranceId) navigate(`/wealth/insurance/${expense.linkedInsuranceId}`, { state: { fromExpenses: currentPath } });
                      else if (expense.linkedInvestmentId) navigate(`/wealth/investments/${expense.linkedInvestmentId}`, { state: { fromExpenses: currentPath } });
                      else navigate(`/wealth/expenses/${expense.id}`);
                    }}
                    className="w-full flex items-center gap-3 p-4 transition-all"
                    style={{ opacity: status === "paid" || status === "prepaid" ? 0.7 : 1 }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor.bg }}>
                      <Icon className="h-6 w-6" style={{ color: catColor.text }} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{expense.expenseName}</h3>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                          style={{ backgroundColor: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                        <span className="truncate max-w-[80px]">{expense.category}</span>
                        <span>·</span>
                        <span className="whitespace-nowrap">{expense.frequency}</span>
                        {expense.selectedDate && (
                          <>
                            <span>·</span>
                            <span className="whitespace-nowrap">Due: {expense.selectedDate}th</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold" style={{ color: status === "paid" || status === "prepaid" ? "var(--status-success)" : "var(--text-primary)" }}>
                        ₹ {formatAmount(expense.expectedAmount)}
                      </p>
                    </div>
                    {!isPrepaidChild && <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />}
                  </button>

                  {/* Action buttons for pending expenses */}
                  {status === "pending" && !isPrepaidChild && (
                    <div className="flex border-t" style={{ borderColor: "var(--border-light)" }}>
                      {isCurrentMonth && (
                        <button
                          onClick={() => handleMarkPaid(expense.id, expense.expenseName)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors hover:bg-green-50 disabled:opacity-50"
                          style={{ color: "var(--status-success)" }}
                          data-testid={`mark-paid-btn-${expense.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          {isLoading ? "Marking..." : "Mark Paid"}
                        </button>
                      )}
                      {isCurrentMonth && expense.frequency !== "One-Time" && (
                        <div className="w-px" style={{ backgroundColor: "var(--border-light)" }} />
                      )}
                      {isCurrentMonth && expense.frequency !== "One-Time" && (
                        <button
                          onClick={() => handlePrepay(expense.id, expense.expenseName)}
                          disabled={isLoading}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors hover:bg-blue-50 disabled:opacity-50"
                          style={{ color: "#2563EB" }}
                          data-testid={`prepay-btn-${expense.id}`}
                        >
                          <FastForward className="h-3.5 w-3.5" />
                          {isLoading ? "Processing..." : "Prepay Next Month"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Undo button for paid expenses */}
                  {status === "paid" && !isPrepaidChild && isCurrentMonth && (
                    <div className="flex border-t" style={{ borderColor: "var(--border-light)" }}>
                      <button
                        onClick={() => handleUnmarkPaid(expense.id, expense.expenseName)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors hover:bg-orange-50 disabled:opacity-50"
                        style={{ color: "#EA580C" }}
                        data-testid={`undo-paid-btn-${expense.id}`}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {isLoading ? "Undoing..." : "Undo Payment"}
                      </button>
                    </div>
                  )}

                  {/* Undo button for prepaid expenses */}
                  {status === "prepaid" && !isPrepaidChild && isCurrentMonth && (
                    <div className="flex border-t" style={{ borderColor: "var(--border-light)" }}>
                      <button
                        onClick={() => handleUndoPrepay(expense.id, expense.expenseName)}
                        disabled={isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors hover:bg-orange-50 disabled:opacity-50"
                        style={{ color: "#EA580C" }}
                        data-testid={`undo-prepay-btn-${expense.id}`}
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                        {isLoading ? "Undoing..." : "Undo Prepayment"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {allExpenses.length > 0 && isCurrentMonth && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/expense")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium transition-all"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
            data-testid="add-expense-btn"
          >
            <Plus className="h-5 w-5" />
            Add New Expense
          </button>
        </div>
      )}
      </>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyExpenses;

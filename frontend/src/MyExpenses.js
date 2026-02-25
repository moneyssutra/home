import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Receipt, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal, TrendingUp, PiggyBank } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useExpenseList } from "@/hooks/useApi";
import { normalizeToMonthly } from "@/lib/formatters";

const MyExpenses = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Use SWR for data fetching with caching
  const { data: expenses = [], isLoading: loading, error } = useExpenseList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Memoize calculations to avoid unnecessary re-computation
  const { totalExpenses, fixedExpenses, variableExpenses, fixedTotal, variableTotal } = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || 'Monthly'), 0);
    const fixed = expenses.filter(e => e.expenseType === "Fixed");
    const variable = expenses.filter(e => e.expenseType === "Variable");
    return {
      totalExpenses: total,
      fixedExpenses: fixed,
      variableExpenses: variable,
      fixedTotal: fixed.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0),
      variableTotal: variable.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0)
    };
  }, [expenses]);

  const getPaymentStatus = (expense) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!expense.selectedDate) return 'upcoming';
    const dueDate = new Date();
    dueDate.setDate(parseInt(expense.selectedDate));
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) return 'paid';
    if (dueDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'paid': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  const expenseByCategory = expenses.reduce((acc, exp) => {
    const cat = exp.category || "Other";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || 'Monthly');
    acc[cat].count += 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(expenseByCategory).sort(([, a], [, b]) => b.total - a.total);

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return { bg: "var(--status-success-soft)", text: "var(--status-success)", border: "var(--status-success)" };
      case 'due-today': return { bg: "var(--status-warning-soft)", text: "var(--status-warning)", border: "var(--status-warning)" };
      case 'upcoming': return { bg: "var(--status-info-soft)", text: "var(--status-info)", border: "var(--status-info)" };
      default: return { bg: "var(--bg-subtle)", text: "var(--text-secondary)", border: "var(--border-light)" };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Upcoming';
      default: return '';
    }
  };

  const chartColors = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#06B6D4", "#EC4899"];

  const fixedPaidList = fixedExpenses.filter(e => getPaymentStatus(e) === 'paid');
  const fixedPendingList = fixedExpenses.filter(e => getPaymentStatus(e) !== 'paid');
  const variablePaidList = variableExpenses.filter(e => getPaymentStatus(e) === 'paid');
  const variablePendingList = variableExpenses.filter(e => getPaymentStatus(e) !== 'paid');
  
  const fixedPaidTotal = fixedPaidList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const fixedPendingTotal = fixedPendingList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const variablePaidTotal = variablePaidList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const variablePendingTotal = variablePendingList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-expenses-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #F87171 0%, #FB923C 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Expenses
          </h1>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-expenses-card">
          <p className="text-white/70 text-sm font-medium mb-1">Total Monthly Expenses</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalExpenses)}</h2>
          <p className="text-white/50 text-xs mt-1">{expenses.length} expense sources (normalized to monthly)</p>
          
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Fixed Expenses</p>
              <p className="text-white font-medium">
                <span style={{ color: "#A7F3D0" }}>₹{formatAmount(fixedPaidTotal)} Paid</span>
              </p>
              <p className="text-white font-medium">
                <span style={{ color: "#FDE68A" }}>₹{formatAmount(fixedPendingTotal)} Pending</span>
              </p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Variable Expenses</p>
              <p className="text-white font-medium">
                <span style={{ color: "#A7F3D0" }}>₹{formatAmount(variablePaidTotal)} Paid</span>
              </p>
              <p className="text-white font-medium">
                <span style={{ color: "#FDE68A" }}>₹{formatAmount(variablePendingTotal)} Pending</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Expense Allocation */}
      {sortedCategories.length > 0 && (
        <div className="px-6 -mt-4">
          <div 
            className="w-full rounded-2xl p-5 shadow-card text-left transition-all hover:shadow-lg" 
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} 
            data-testid="expense-allocation"
          >
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => navigate("/expense-breakdown")}
            >
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Expense Breakdown</h3>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                View All →
              </span>
            </div>
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([category, data], idx) => {
                const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
                const Icon = getCategoryIcon(category);
                const catColor = getCategoryColor(category);
                // Map category name to route slug
                const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
                return (
                  <div 
                    key={category} 
                    className="flex items-center gap-3 cursor-pointer rounded-lg p-1 -m-1 hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/expenses/${categorySlug}`);
                    }}
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

      {/* Fixed vs Variable Split */}
      {expenses.length > 0 && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-2 gap-3" style={{ alignItems: "stretch" }}>
            <button
              onClick={() => navigate('/expenses/fixed')}
              className="rounded-2xl p-4 shadow-card text-left hover:shadow-md transition-all flex flex-col"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", minHeight: "180px" }}
              data-testid="fixed-expenses-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <Shield className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fixed</span>
                <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(fixedTotal)}</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{fixedExpenses.length} expenses</p>
              <div className="mt-auto space-y-1">
                {fixedExpenses.slice(0, 2).map(exp => (
                  <div key={exp.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{exp.expenseName}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(exp.expectedAmount)}</span>
                  </div>
                ))}
                {fixedExpenses.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--brand-primary)" }}>+{fixedExpenses.length - 2} more</p>
                )}
              </div>
            </button>

            <button
              onClick={() => navigate('/expenses/variable')}
              className="rounded-2xl p-4 shadow-card text-left hover:shadow-md transition-all flex flex-col"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", minHeight: "180px" }}
              data-testid="variable-expenses-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--status-warning-soft)" }}>
                  <Zap className="h-4 w-4" style={{ color: "var(--status-warning)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Variable</span>
                <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(variableTotal)}</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{variableExpenses.length} expenses</p>
              <div className="mt-auto space-y-1">
                {variableExpenses.slice(0, 2).map(exp => (
                  <div key={exp.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{exp.expenseName}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(exp.expectedAmount)}</span>
                  </div>
                ))}
                {variableExpenses.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--status-warning)" }}>+{variableExpenses.length - 2} more</p>
                )}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>All Expenses</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--status-error-soft)" }}>
              <Receipt className="h-10 w-10" style={{ color: "var(--status-error)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Expenses Added Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Start tracking your expenses</p>
            <button
              onClick={() => navigate("/expense")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              <Plus className="h-5 w-5" />
              Add Expense
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedExpenses.map((expense) => {
              const status = getPaymentStatus(expense);
              const Icon = getCategoryIcon(expense.category);
              const catColor = getCategoryColor(expense.category);
              const statusColor = getStatusColor(status);
              const nextDate = expense.nextDeductionDate ? new Date(expense.nextDeductionDate) : null;
              const formattedNextDate = nextDate ? nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;
              
              return (
                <button
                  key={expense.id}
                  onClick={() => {
                    // Navigate to parent entity for linked expenses, otherwise to expense edit
                    // Pass fromExpenses state so back button returns here
                    const currentPath = "/my-expenses";
                    if (expense.linkedLoanId) {
                      navigate(`/loan/${expense.linkedLoanId}`, { state: { fromExpenses: currentPath } });
                    } else if (expense.linkedInsuranceId) {
                      navigate(`/insurance/${expense.linkedInsuranceId}`, { state: { fromExpenses: currentPath } });
                    } else if (expense.linkedInvestmentId) {
                      navigate(`/investment/${expense.linkedInvestmentId}`, { state: { fromExpenses: currentPath } });
                    } else {
                      navigate(`/expense/${expense.id}`);
                    }
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md shadow-card"
                  style={{ 
                    backgroundColor: "var(--bg-card)", 
                    border: "1px solid var(--border-light)",
                    opacity: status === 'paid' ? 0.7 : 1
                  }}
                  data-testid={`expense-card-${expense.id}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor.bg }}>
                    <Icon className="h-6 w-6" style={{ color: catColor.text }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{expense.expenseName}</h3>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span className="truncate max-w-[80px]">{expense.category}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{expense.expenseType}</span>
                      {formattedNextDate && expense.expenseType === "Fixed" && (
                        <>
                          <span>•</span>
                          <span className="font-medium whitespace-nowrap" style={{ color: "var(--status-warning)" }}>Next: {formattedNextDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold" style={{ color: status === 'paid' ? "var(--status-success)" : "var(--text-primary)" }}>
                      ₹ {formatAmount(expense.expectedAmount)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{expense.frequency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {expenses.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/expense")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium transition-all"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
          >
            <Plus className="h-5 w-5" />
            Add New Expense
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyExpenses;

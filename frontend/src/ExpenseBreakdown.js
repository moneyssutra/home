import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Receipt, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal, TrendingUp, PiggyBank, Building2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useExpenseList } from "@/hooks/useApi";
import { normalizeToMonthly } from "@/lib/formatters";

const ExpenseBreakdown = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  const { data: expenses = [], isLoading: loading, error } = useExpenseList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Calculate totals and categorize expenses — filtered for current month
  const { totalExpenses, expenseByCategory, fixedTotal, variableTotal } = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthNum = now.getMonth() + 1;

    // Filter expenses applicable to the current month
    const filtered = expenses.filter(exp => {
      // Exclude skipped expenses for current month
      if (exp.skippedMonths?.includes(currentMonth)) return false;
      // Exclude linked payment duplicates
      if (exp.linkedPaymentId) return false;

      const freq = exp.frequency || 'Monthly';
      const normalize = (s) => (s || '').replace(/\u2013/g, '-').replace(/\u2014/g, '-');

      if (freq === 'One-Time') {
        return exp.oneTimeDate?.startsWith(currentMonth);
      }
      if (freq === 'Quarterly') {
        const qMap = { 'Q1 (Jan-Mar)': 1, 'Q2 (Apr-Jun)': 4, 'Q3 (Jul-Sep)': 7, 'Q4 (Oct-Dec)': 10 };
        const start = qMap[normalize(exp.selectedQuarter)];
        if (!start) return false;
        return (currentMonthNum - start) % 3 === 0;
      }
      if (freq === 'Half-Yearly') {
        const hMap = { 'H1 (Jan-Jun)': 1, 'H2 (Jul-Dec)': 7 };
        const start = hMap[normalize(exp.selectedHalf)];
        if (!start) return false;
        return (currentMonthNum - start) % 6 === 0;
      }
      if (freq === 'Yearly') {
        const mMap = { 'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6, 'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12 };
        return mMap[exp.selectedMonth] === currentMonthNum;
      }
      return true; // Monthly, Daily, Weekly, Bi-Weekly always apply
    });

    const total = filtered.reduce((sum, exp) => sum + normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || 'Monthly'), 0);
    const fixed = filtered.filter(e => e.expenseType === "Fixed");
    const variable = filtered.filter(e => e.expenseType === "Variable");
    
    const byCategory = filtered.reduce((acc, exp) => {
      const cat = exp.category || "Other";
      if (!acc[cat]) acc[cat] = { total: 0, count: 0, expenses: [] };
      acc[cat].total += normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || 'Monthly');
      acc[cat].count += 1;
      acc[cat].expenses.push(exp);
      return acc;
    }, {});
    
    return {
      totalExpenses: total,
      expenseByCategory: byCategory,
      fixedTotal: fixed.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0),
      variableTotal: variable.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0)
    };
  }, [expenses]);

  // Define all expense categories with their properties
  const expenseCategories = [
    { name: "EMI", icon: CreditCard, color: "#EF4444", bgColor: "#FEE2E2", route: "/expenses/emi", addRoute: "/loan" },
    { name: "Housing", icon: Home, color: "#3B82F6", bgColor: "#DBEAFE", route: "/expenses/housing", addRoute: "/expense?category=Housing" },
    { name: "Insurance", icon: Shield, color: "#10B981", bgColor: "#D1FAE5", route: "/expenses/insurance", addRoute: "/insurance" },
    { name: "Investments", icon: TrendingUp, color: "#8B5CF6", bgColor: "#EDE9FE", route: "/expenses/investments", addRoute: "/investment" },
    { name: "Utilities", icon: Zap, color: "#F59E0B", bgColor: "#FEF3C7", route: "/expenses/utilities", addRoute: "/expense?category=Utilities" },
    { name: "Food", icon: ShoppingBag, color: "#00D09C", bgColor: "#D1FAE5", route: "/expenses/food", addRoute: "/expense?category=Food" },
    { name: "Travel", icon: Car, color: "#8B5CF6", bgColor: "#F3E8FF", route: "/expenses/travel", addRoute: "/expense?category=Travel" },
    { name: "Shopping", icon: ShoppingBag, color: "#DB2777", bgColor: "#FCE7F3", route: "/expenses/shopping", addRoute: "/expense?category=Shopping" },
    { name: "Medical", icon: Stethoscope, color: "#EF4444", bgColor: "#FEE2E2", route: "/expenses/medical", addRoute: "/expense?category=Medical" },
    { name: "Education", icon: GraduationCap, color: "#6366F1", bgColor: "#E0E7FF", route: "/expenses/education", addRoute: "/expense?category=Education" },
    { name: "Subscriptions", icon: Tv, color: "#EC4899", bgColor: "#FCE7F3", route: "/expenses/subscriptions", addRoute: "/expense?category=Subscriptions" },
    { name: "Business Expense", icon: Briefcase, color: "#1E293B", bgColor: "#F1F5F9", route: "/expenses/business", addRoute: "/expense?category=Business%20Expense" },
    { name: "Salary Paid", icon: Wallet, color: "#059669", bgColor: "#D1FAE5", route: "/expenses/salary", addRoute: "/expense?category=Salary%20Paid" },
    { name: "Savings", icon: PiggyBank, color: "#0EA5E9", bgColor: "#E0F2FE", route: "/expenses/savings", addRoute: "/expense?category=Savings" },
    { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6", route: "/expenses/other", addRoute: "/expense?category=Other" },
  ];

  // Sort categories by total amount (highest first)
  const sortedCategories = expenseCategories
    .map(cat => ({
      ...cat,
      data: expenseByCategory[cat.name] || { total: 0, count: 0, expenses: [] }
    }))
    .sort((a, b) => b.data.total - a.data.total);

  // Split into categories with data and empty categories
  const categoriesWithData = sortedCategories.filter(c => c.data.count > 0);
  const emptyCategories = sortedCategories.filter(c => c.data.count === 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#00D09C] border-t-transparent mx-auto mb-4"></div>
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/my-expenses")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ 
              backgroundColor: "var(--bg-card)", 
              border: "1px solid var(--border-light)" 
            }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Expense Breakdown
          </h1>
        </div>

        {/* Total Summary Card */}
        <div 
          className="rounded-xl p-5 mb-4"
          style={{ 
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-light)"
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
                <Receipt className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Total Monthly Expenses</p>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(totalExpenses)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Fixed</p>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(fixedTotal)}</p>
            </div>
            <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Variable</p>
              <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(variableTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories with Expenses */}
      {categoriesWithData.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            YOUR EXPENSE CATEGORIES
          </h2>
          <div className="space-y-3">
            {categoriesWithData.map((category) => {
              const IconComponent = category.icon;
              const percentage = totalExpenses > 0 
                ? Math.round((category.data.total / totalExpenses) * 100) 
                : 0;
              
              return (
                <button
                  key={category.name}
                  onClick={() => navigate(category.route)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-light)"
                  }}
                  data-testid={`category-card-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: category.bgColor }}
                  >
                    <IconComponent className="h-6 w-6" style={{ color: category.color }} />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {category.name}
                      </h3>
                      <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: category.bgColor, color: category.color }}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold" style={{ color: category.color }}>
                        ₹{formatAmount(category.data.total)}
                      </p>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        • {category.data.count} expense{category.data.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full mt-2" style={{ backgroundColor: "var(--bg-subtle)" }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: category.color
                        }}
                      />
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty Categories (collapsed) */}
      {emptyCategories.length > 0 && (
        <div className="px-6 mb-6">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            ADD NEW EXPENSE CATEGORIES
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {emptyCategories.map((category) => {
              const IconComponent = category.icon;
              
              return (
                <button
                  key={category.name}
                  onClick={() => navigate(category.addRoute)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all hover:shadow-md border-2 border-dashed"
                  style={{ 
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border-light)"
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.bgColor }}
                  >
                    <IconComponent className="h-5 w-5" style={{ color: category.color }} />
                  </div>
                  <span className="text-xs font-medium text-center" style={{ color: "var(--text-secondary)" }}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Expense Button */}
      <div className="px-6">
        <button
          onClick={() => navigate("/expense")}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium"
          style={{ 
            backgroundColor: "var(--brand-primary)",
            color: "white"
          }}
        >
          <Plus className="h-5 w-5" />
          Add New Expense
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default ExpenseBreakdown;

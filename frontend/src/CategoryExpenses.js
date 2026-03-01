import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Receipt, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal, TrendingUp, PiggyBank, Clock, CheckCircle, CalendarClock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useExpenseList } from "@/hooks/useApi";
import { normalizeToMonthly } from "@/lib/formatters";

// Category configurations
const categoryConfig = {
  emi: { 
    name: "EMI", 
    icon: CreditCard, 
    color: "#EF4444", 
    bgColor: "#FEE2E2", 
    addRoute: "/loan",
    addLabel: "Add Loan",
    description: "Your loan EMI payments"
  },
  housing: { 
    name: "Housing", 
    icon: Home, 
    color: "#3B82F6", 
    bgColor: "#DBEAFE", 
    addRoute: "/expense?category=Housing",
    addLabel: "Add Housing Expense",
    description: "Rent, maintenance, and housing costs"
  },
  insurance: { 
    name: "Insurance", 
    icon: Shield, 
    color: "#10B981", 
    bgColor: "#D1FAE5", 
    addRoute: "/insurance",
    addLabel: "Add Insurance",
    description: "Insurance premium payments"
  },
  investments: { 
    name: "Investments", 
    icon: TrendingUp, 
    color: "#8B5CF6", 
    bgColor: "#EDE9FE", 
    addRoute: "/investment",
    addLabel: "Add Investment (SIP)",
    description: "SIP and recurring investment expenses"
  },
  utilities: { 
    name: "Utilities", 
    icon: Zap, 
    color: "#F59E0B", 
    bgColor: "#FEF3C7", 
    addRoute: "/expense?category=Utilities",
    addLabel: "Add Utility Expense",
    description: "Electricity, water, gas bills"
  },
  food: { 
    name: "Food", 
    icon: ShoppingBag, 
    color: "#00D09C", 
    bgColor: "#D1FAE5", 
    addRoute: "/expense?category=Food",
    addLabel: "Add Food Expense",
    description: "Groceries and dining expenses"
  },
  travel: { 
    name: "Travel", 
    icon: Car, 
    color: "#8B5CF6", 
    bgColor: "#F3E8FF", 
    addRoute: "/expense?category=Travel",
    addLabel: "Add Travel Expense",
    description: "Transportation and travel costs"
  },
  shopping: { 
    name: "Shopping", 
    icon: ShoppingBag, 
    color: "#DB2777", 
    bgColor: "#FCE7F3", 
    addRoute: "/expense?category=Shopping",
    addLabel: "Add Shopping Expense",
    description: "Shopping and retail expenses"
  },
  medical: { 
    name: "Medical", 
    icon: Stethoscope, 
    color: "#EF4444", 
    bgColor: "#FEE2E2", 
    addRoute: "/expense?category=Medical",
    addLabel: "Add Medical Expense",
    description: "Healthcare and medical costs"
  },
  education: { 
    name: "Education", 
    icon: GraduationCap, 
    color: "#6366F1", 
    bgColor: "#E0E7FF", 
    addRoute: "/expense?category=Education",
    addLabel: "Add Education Expense",
    description: "Tuition, courses, and learning"
  },
  subscriptions: { 
    name: "Subscriptions", 
    icon: Tv, 
    color: "#EC4899", 
    bgColor: "#FCE7F3", 
    addRoute: "/expense?category=Subscriptions",
    addLabel: "Add Subscription",
    description: "Streaming, software, memberships"
  },
  business: { 
    name: "Business Expense", 
    icon: Briefcase, 
    color: "#1E293B", 
    bgColor: "#F1F5F9", 
    addRoute: "/expense?category=Business%20Expense",
    addLabel: "Add Business Expense",
    description: "Work and business-related costs"
  },
  salary: { 
    name: "Salary Paid", 
    icon: Wallet, 
    color: "#059669", 
    bgColor: "#D1FAE5", 
    addRoute: "/expense?category=Salary%20Paid",
    addLabel: "Add Salary Expense",
    description: "Employee salaries and wages"
  },
  savings: { 
    name: "Savings", 
    icon: PiggyBank, 
    color: "#0EA5E9", 
    bgColor: "#E0F2FE", 
    addRoute: "/expense?category=Savings",
    addLabel: "Add Savings",
    description: "Savings and deposits"
  },
  other: { 
    name: "Other", 
    icon: MoreHorizontal, 
    color: "#6B7280", 
    bgColor: "#F3F4F6", 
    addRoute: "/expense?category=Other",
    addLabel: "Add Other Expense",
    description: "Miscellaneous expenses"
  },
};

const CategoryExpenses = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "fixed", "variable"

  const config = categoryConfig[category] || categoryConfig.other;
  const { data: allExpenses = [], isLoading: loading, error } = useExpenseList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Filter expenses for this category
  const { categoryExpenses, fixedExpenses, variableExpenses, totalAmount, fixedTotal, variableTotal } = useMemo(() => {
    const filtered = allExpenses.filter(exp => {
      const expCategory = (exp.category || "Other").toLowerCase().replace(/\s+/g, '-');
      return expCategory === category || 
             (category === 'other' && !Object.keys(categoryConfig).includes(expCategory)) ||
             exp.category === config.name;
    });
    
    const fixed = filtered.filter(e => e.expenseType === "Fixed");
    const variable = filtered.filter(e => e.expenseType === "Variable");
    
    return {
      categoryExpenses: filtered,
      fixedExpenses: fixed,
      variableExpenses: variable,
      totalAmount: filtered.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0),
      fixedTotal: fixed.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0),
      variableTotal: variable.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0)
    };
  }, [allExpenses, category, config.name]);

  // Filter based on active filter
  const filteredExpenses = useMemo(() => {
    if (activeFilter === "fixed") return fixedExpenses;
    if (activeFilter === "variable") return variableExpenses;
    return categoryExpenses;
  }, [categoryExpenses, fixedExpenses, variableExpenses, activeFilter]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-3 w-3" /> Paid
          </span>
        );
      case 'due-today':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3" /> Due Today
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
            <CalendarClock className="h-3 w-3" /> Upcoming
          </span>
        );
    }
  };

  const IconComponent = config.icon;

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
            onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/my-expenses")}
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
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: config.bgColor }}
            >
              <IconComponent className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {config.name}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{config.description}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {categoryExpenses.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div 
              className="rounded-xl p-4 flex flex-col justify-between min-h-[100px]" 
              style={{ 
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)"
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Fixed</span>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(fixedTotal)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fixedExpenses.length} expense{fixedExpenses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div 
              className="rounded-xl p-4 flex flex-col justify-between min-h-[100px]" 
              style={{ 
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)"
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" style={{ color: "#F59E0B" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Variable</span>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(variableTotal)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {variableExpenses.length} expense{variableExpenses.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        {categoryExpenses.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("all")}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeFilter === "all" ? config.color : "var(--bg-subtle)",
                color: activeFilter === "all" ? "white" : "var(--text-secondary)"
              }}
            >
              All ({categoryExpenses.length})
            </button>
            <button
              onClick={() => setActiveFilter("fixed")}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeFilter === "fixed" ? "var(--brand-primary)" : "var(--bg-subtle)",
                color: activeFilter === "fixed" ? "white" : "var(--text-secondary)"
              }}
            >
              Fixed ({fixedExpenses.length})
            </button>
            <button
              onClick={() => setActiveFilter("variable")}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: activeFilter === "variable" ? "#F59E0B" : "var(--bg-subtle)",
                color: activeFilter === "variable" ? "white" : "var(--text-secondary)"
              }}
            >
              Variable ({variableExpenses.length})
            </button>
          </div>
        )}
      </div>

      {/* Expense List */}
      {categoryExpenses.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: config.bgColor }}
          >
            <IconComponent className="h-10 w-10" style={{ color: config.color }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No {config.name} Expenses Yet
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            {config.description}
          </p>
          <button
            onClick={() => navigate(config.addRoute)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium"
            style={{ backgroundColor: config.color }}
          >
            <Plus className="h-5 w-5" />
            {config.addLabel}
          </button>
        </div>
      ) : (
        <div className="px-6 space-y-3">
          {filteredExpenses.map((expense) => {
            const status = getPaymentStatus(expense);
            const isVariable = expense.expenseType === "Variable";
            
            return (
              <button
                key={expense.id}
                onClick={() => {
                  // Navigate to parent entity for linked expenses, otherwise to expense edit
                  // Pass fromExpenses state so back button returns here
                  const currentPath = `/expenses/${category}`;
                  if (expense.linkedLoanId) {
                    navigate(`/wealth/loans/${expense.linkedLoanId}`, { state: { fromExpenses: currentPath } });
                  } else if (expense.linkedInsuranceId) {
                    navigate(`/insurance/${expense.linkedInsuranceId}`, { state: { fromExpenses: currentPath } });
                  } else if (expense.linkedInvestmentId) {
                    navigate(`/wealth/investments/${expense.linkedInvestmentId}`, { state: { fromExpenses: currentPath } });
                  } else {
                    navigate(`/expense/${expense.id}`);
                  }
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-light)",
                  opacity: status === 'paid' ? 0.7 : 1
                }}
                data-testid={`expense-card-${expense.id}`}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ 
                    backgroundColor: isVariable ? "#FEF3C7" : config.bgColor
                  }}
                >
                  {isVariable ? (
                    <Zap className="h-6 w-6 text-amber-500" />
                  ) : (
                    <IconComponent className="h-6 w-6" style={{ color: config.color }} />
                  )}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {expense.expenseName}
                    </h3>
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{expense.frequency}</span>
                    {expense.selectedDate && (
                      <>
                        <span>•</span>
                        <span>Day {expense.selectedDate}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: config.color }}>
                    ₹{formatAmount(expense.expectedAmount)}
                  </p>
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Button (when list exists) */}
      {categoryExpenses.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate(config.addRoute)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium"
            style={{ 
              borderColor: config.color,
              color: config.color
            }}
          >
            <Plus className="h-5 w-5" />
            {config.addLabel}
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default CategoryExpenses;

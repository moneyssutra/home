import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Wallet, ShoppingBag, PiggyBank, HelpCircle, Receipt, Home, Zap, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, TrendingUp, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useExpenseList } from "@/hooks/useApi";
import { normalizeToMonthly } from "@/lib/formatters";

const GROUP_CONFIG = {
  essential: {
    name: "Essential",
    icon: Wallet,
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    categories: ["Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"],
    description: "Non-negotiable expenses you need to survive and maintain your lifestyle",
  },
  lifestyle: {
    name: "Lifestyle",
    icon: ShoppingBag,
    color: "#F97316",
    bgColor: "#FFEDD5",
    categories: ["Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"],
    description: "Discretionary spending that enhances your quality of life",
  },
  "wealth-building": {
    name: "Wealth Building",
    icon: PiggyBank,
    color: "#22C55E",
    bgColor: "#DCFCE7",
    categories: ["Investments", "Savings"],
    description: "Money working for your future — investments and savings",
  },
  uncategorized: {
    name: "Uncategorized",
    icon: HelpCircle,
    color: "#6B7280",
    bgColor: "#F3F4F6",
    categories: [],
    description: "Expenses that don't fit into the standard groups yet",
  },
};

const ALL_KNOWN = new Set([
  ...GROUP_CONFIG.essential.categories,
  ...GROUP_CONFIG.lifestyle.categories,
  ...GROUP_CONFIG["wealth-building"].categories,
]);

const CATEGORY_ICONS = {
  Housing: Home, Utilities: Zap, Food: ShoppingBag, Medical: Stethoscope,
  Education: GraduationCap, Insurance: Shield, EMI: CreditCard,
  Travel: Car, Shopping: ShoppingBag, Subscriptions: Tv,
  "Business Expense": Briefcase, "Salary Paid": Wallet,
  Investments: TrendingUp, Savings: PiggyBank,
};

const formatAmount = (amount) => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(Math.round(amount));
};

const ExpenseGroup = () => {
  const { group } = useParams();
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [expandedCats, setExpandedCats] = useState({});
  const config = GROUP_CONFIG[group] || GROUP_CONFIG.uncategorized;
  const Icon = config.icon;

  const { data: allExpenses = [], isLoading: loading } = useExpenseList();

  const groupExpenses = useMemo(() => {
    if (group === "uncategorized") {
      return allExpenses.filter((e) => !ALL_KNOWN.has(e.category));
    }
    return allExpenses.filter((e) => config.categories.includes(e.category));
  }, [allExpenses, config.categories, group]);

  const totalMonthly = useMemo(
    () => groupExpenses.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || "Monthly"), 0),
    [groupExpenses]
  );

  const byCategory = useMemo(() => {
    const acc = {};
    for (const e of groupExpenses) {
      const cat = e.category || "Other";
      if (!acc[cat]) acc[cat] = { total: 0, count: 0, expenses: [] };
      acc[cat].total += normalizeToMonthly(e.expectedAmount || 0, e.frequency || "Monthly");
      acc[cat].count += 1;
      acc[cat].expenses.push(e);
    }
    return Object.entries(acc).sort(([, a], [, b]) => b.total - a.total);
  }, [groupExpenses]);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid={`expense-group-${group}`}>
      {/* Header */}
      <header className="px-4 sm:px-6 pt-6 sm:pt-8 pb-5" style={{ background: `linear-gradient(135deg, ${config.color}DD, ${config.color})` }}>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => window.history.length > 2 ? navigate(-1) : navigate("/my-expenses")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white hover:bg-white/30 transition-colors"
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {config.name}
          </h1>
        </div>
        <p className="text-white/70 text-sm ml-12">{config.description}</p>

        {/* Summary */}
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Monthly Total</p>
              <p className="text-2xl font-bold text-white">{formatAmount(totalMonthly)}</p>
            </div>
          </div>
          <p className="text-white/50 text-xs">{groupExpenses.length} expenses across {byCategory.length} categories</p>
        </div>
      </header>

      {/* Category Sections */}
      <div className="px-4 sm:px-6 mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : byCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No expenses in this group</p>
          </div>
        ) : (
          byCategory.map(([category, data]) => {
            const CatIcon = CATEGORY_ICONS[category] || MoreHorizontal;
            const pct = totalMonthly > 0 ? ((data.total / totalMonthly) * 100).toFixed(1) : 0;
            return (
              <div key={category} className="rounded-2xl overflow-hidden shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                {/* Category Header */}
                <button
                  onClick={() => navigate(`/expenses/${category.toLowerCase().replace(/\s+/g, "-")}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  data-testid={`group-cat-${category}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
                    <CatIcon className="h-5 w-5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{category}</span>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{formatAmount(data.total)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.count} expenses</span>
                      <span className="text-xs" style={{ color: config.color }}>{pct}%</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>

                {/* Expense list under category */}
                {data.expenses.slice(0, 3).map((exp, i) => (
                  <button
                    key={exp.id}
                    onClick={() => navigate(`/expense/${exp.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    style={{ borderTop: "1px solid var(--border-light)" }}
                    data-testid={`group-exp-${exp.id}`}
                  >
                    <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: config.color + "40" }} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{exp.expenseName}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{exp.frequency}</p>
                    </div>
                    <p className="text-xs font-bold flex-shrink-0" style={{ color: "var(--text-primary)" }}>{formatAmount(exp.expectedAmount || 0)}</p>
                  </button>
                ))}
                {data.expenses.length > 3 && (
                  <button
                    onClick={() => navigate(`/expenses/${category.toLowerCase().replace(/\s+/g, "-")}`)}
                    className="w-full py-2 text-center text-xs font-semibold transition-colors hover:bg-gray-50"
                    style={{ borderTop: "1px solid var(--border-light)", color: config.color }}
                  >
                    View all {data.count} expenses
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default ExpenseGroup;

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  Briefcase, Store, Home, ArrowRight, ArrowLeft, Check, X,
  Wallet, Sparkles, ChevronDown, SkipForward,
  Loader2, Shield, Landmark, ChevronRight, Receipt, Info,
  Zap, BookOpen, ShoppingBag, Car, Lightbulb, Dumbbell,
  PiggyBank, Utensils, Wifi, TrendingUp, CreditCard,
  Building2, CircleDollarSign, BarChart3, Plus, Calendar, Percent
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Category Config ─── */
const CATEGORIES = [
  { key: "income", label: "Income", icon: Wallet, color: "#10B981", bg: "#10B98112", dataKey: "incomeAdded", countKey: "income", step: 1 },
  { key: "expenses", label: "Expenses", icon: Receipt, color: "#EF4444", bg: "#EF444412", dataKey: "expensesAdded", countKey: "expenses", step: 2 },
  { key: "assets", label: "Assets", icon: Building2, color: "#3B82F6", bg: "#3B82F612", dataKey: "assetsAdded", countKeys: ["accounts", "assets"], step: 3 },
  { key: "liabilities", label: "Liabilities", icon: CreditCard, color: "#F59E0B", bg: "#F59E0B12", dataKey: "liabilitiesAdded", countKeys: ["loans", "creditCards"], step: 4 },
  { key: "investments", label: "Investments", icon: TrendingUp, color: "#8B5CF6", bg: "#8B5CF612", dataKey: "investmentsAdded", countKey: "investments", step: 5 },
];

const MODULE_STEPS = {
  income: ["income-type", "income-amount", "income-date"],
  expenses: ["expenses"],
  assets: ["asset-type", "asset-details", "asset-deep"],
  liabilities: ["liability-type", "liability-details", "liability-deep"],
  investments: ["invest-type", "invest-details", "invest-deep"],
};

const ALL_WIZARD_STEPS = ["income-type", "income-amount", "income-date", "expenses", "asset-type", "asset-details", "asset-deep", "liability-type", "liability-details", "liability-deep", "invest-type", "invest-details", "invest-deep", "review", "complete"];

const INCOME_SOURCES = [
  { id: "job", label: "Job / Salary", icon: Briefcase, color: "#3B82F6", defaults: { type: "Salary", category: "salary", frequency: "Monthly" } },
  { id: "business", label: "Business", icon: Store, color: "#8B5CF6", defaults: { type: "Business", category: "business", frequency: "Monthly" } },
  { id: "rental", label: "Rental Income", icon: Home, color: "#F59E0B", defaults: { type: "Rental", category: "rental", frequency: "Monthly" } },
];

const EXPENSE_BUCKETS = [
  { id: "essentials", label: "Essentials", subtitle: "Can't skip these", color: "#EF4444", icon: Zap,
    items: [
      { name: "Rent / Housing", category: "Housing", icon: Home, isNeed: true },
      { name: "EMI Payments", category: "EMI", icon: Receipt, isNeed: true },
      { name: "Utilities", category: "Utilities", icon: Lightbulb, isNeed: true },
      { name: "Transport / Fuel", category: "Transport", icon: Car, isNeed: true },
      { name: "Phone / Internet", category: "Utilities", icon: Wifi, isNeed: true },
    ]
  },
  { id: "growth", label: "Growth", subtitle: "Investing in yourself", color: "#10B981", icon: BookOpen,
    items: [
      { name: "Learning / Education", category: "Education", icon: BookOpen, isNeed: false },
      { name: "Fitness / Health", category: "Health", icon: Dumbbell, isNeed: false },
      { name: "Savings / SIP", category: "Savings", icon: PiggyBank, isNeed: false },
    ]
  },
  { id: "lifestyle", label: "Lifestyle", subtitle: "The nice-to-haves", color: "#F59E0B", icon: ShoppingBag,
    items: [
      { name: "Dining Out", category: "Food", icon: Utensils, isNeed: false },
      { name: "Shopping", category: "Shopping", icon: ShoppingBag, isNeed: false },
      { name: "Entertainment", category: "Entertainment", icon: Sparkles, isNeed: false },
    ]
  },
];

const ASSET_TYPES = [
  { id: "bank", label: "Bank Balance", icon: Landmark, category: "bank_balance", color: "#10B981" },
  { id: "property", label: "Property / Land", icon: Building2, category: "property", color: "#3B82F6" },
  { id: "gold", label: "Gold / Jewellery", icon: CircleDollarSign, category: "gold", color: "#EAB308" },
  { id: "vehicle", label: "Vehicle", icon: Car, category: "vehicle", color: "#F59E0B" },
  { id: "equipment", label: "Equipment", icon: Briefcase, category: "equipment", color: "#8B5CF6" },
  { id: "other", label: "Other Asset", icon: Shield, category: "other", color: "#6B7280" },
];

const LOAN_TYPES = [
  { id: "home", label: "Home Loan", icon: Home, color: "#3B82F6" },
  { id: "car", label: "Car Loan", icon: Car, color: "#F59E0B" },
  { id: "personal", label: "Personal Loan", icon: Wallet, color: "#8B5CF6" },
  { id: "education", label: "Education Loan", icon: BookOpen, color: "#10B981" },
  { id: "credit-card", label: "Credit Card Debt", icon: CreditCard, color: "#EF4444" },
  { id: "other", label: "Other Loan", icon: Receipt, color: "#6B7280" },
];

const INVESTMENT_TYPES = [
  { id: "mutual-fund", label: "Mutual Funds / SIP", icon: BarChart3, category: "Mutual Fund", color: "#8B5CF6" },
  { id: "stocks", label: "Stocks", icon: TrendingUp, category: "Stocks", color: "#3B82F6" },
  { id: "fd", label: "Fixed Deposit", icon: Shield, category: "Fixed Deposit", color: "#10B981" },
  { id: "ppf", label: "PPF / NPS", icon: PiggyBank, category: "PPF", color: "#F59E0B" },
  { id: "gold-sgb", label: "Gold / SGB", icon: CircleDollarSign, category: "Digital Gold", color: "#EAB308" },
  { id: "crypto", label: "Crypto", icon: Zap, category: "Crypto", color: "#EF4444" },
];

const getProjectedGrade = (income, expenses) => {
  if (!income || income <= 0) return { grade: "?", color: "#94A3B8", label: "Add income to see grade", savingsRate: 0 };
  const rate = ((income - expenses) / income) * 100;
  if (rate >= 40) return { grade: "A+", color: "#059669", label: "Exceptional saver", savingsRate: rate };
  if (rate >= 30) return { grade: "A", color: "#10B981", label: "Strong financial health", savingsRate: rate };
  if (rate >= 20) return { grade: "B+", color: "#3B82F6", label: "Good savings discipline", savingsRate: rate };
  if (rate >= 10) return { grade: "B", color: "#6366F1", label: "Room to grow", savingsRate: rate };
  if (rate >= 0) return { grade: "C+", color: "#F59E0B", label: "Expenses are high", savingsRate: rate };
  return { grade: "C", color: "#EF4444", label: "Spending exceeds income", savingsRate: rate };
};

/* ─── Contextual Hint ─── */
const FieldHint = ({ text }) => (
  <span className="inline-flex items-center gap-1 ml-1">
    <Info className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-muted)", opacity: 0.5 }} />
    <span className="text-[10px] italic" style={{ color: "var(--text-muted)", opacity: 0.6 }}>{text}</span>
  </span>
);

export default function ProfileSetup({ onComplete, onDismiss }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetModule = searchParams.get("module");

  const [screen, setScreen] = useState("grid");
  const [saving, setSaving] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [loadingGrid, setLoadingGrid] = useState(true);

  // Income state
  const [selectedSource, setSelectedSource] = useState(null);
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeName, setIncomeName] = useState("");
  const [incomeDate, setIncomeDate] = useState("1");
  const [showIncomeDeep, setShowIncomeDeep] = useState(false);
  const [incomeFrequency, setIncomeFrequency] = useState("Monthly");
  const [incomeAccount, setIncomeAccount] = useState("");
  const amountRef = useRef(null);

  // Expense state
  const [expenseData, setExpenseData] = useState({});
  const [expenseDueDates, setExpenseDueDates] = useState({});
  const [expenseNeedWant, setExpenseNeedWant] = useState({});
  const [activeBucket, setActiveBucket] = useState(0);
  const [showExpenseDeep, setShowExpenseDeep] = useState(false);

  // Asset state
  const [assetItems, setAssetItems] = useState([{ name: "", amount: "", type: "bank_balance", purchaseDate: "", growthRate: "" }]);
  const [showAssetDeep, setShowAssetDeep] = useState(false);
  const [hasNoAssets, setHasNoAssets] = useState(false);

  // Liability state
  const [hasNoLiabilities, setHasNoLiabilities] = useState(false);
  const [loanItems, setLoanItems] = useState([{ name: "", amount: "", emi: "", type: "Personal Loan", rate: "", tenure: "", nextDue: "" }]);
  const [showLiabilityDeep, setShowLiabilityDeep] = useState(false);

  // Investment state
  const [hasNoInvestments, setHasNoInvestments] = useState(false);
  const [investItems, setInvestItems] = useState([{ name: "", amount: "", type: "mutual-fund", frequency: "Monthly", startDate: "", growthRate: "", linkedAccount: "" }]);
  const [showInvestDeep, setShowInvestDeep] = useState(false);

  const [accounts, setAccounts] = useState([]);

  // Reset form state for a specific module to prevent stale data
  const resetModuleState = useCallback((mod) => {
    if (mod === "income") {
      setSelectedSource(null); setIncomeAmount(""); setIncomeName("");
      setIncomeDate("1"); setIncomeFrequency("Monthly"); setIncomeAccount("");
    } else if (mod === "expenses") {
      setExpenseData({}); setExpenseDueDates({}); setExpenseNeedWant({}); setActiveBucket(0);
    } else if (mod === "assets") {
      setAssetItems([{ name: "", amount: "", type: "bank_balance", purchaseDate: "", growthRate: "" }]);
      setHasNoAssets(false);
    } else if (mod === "liabilities") {
      setLoanItems([{ name: "", amount: "", emi: "", type: "Personal Loan", rate: "", tenure: "", nextDue: "" }]);
      setHasNoLiabilities(false);
    } else if (mod === "investments") {
      setInvestItems([{ name: "", amount: "", type: "mutual-fund", frequency: "Monthly", startDate: "", growthRate: "", linkedAccount: "" }]);
      setHasNoInvestments(false);
    }
  }, []);

  const fetchCompletionData = useCallback(async () => {
    try {
      const [compRes, accRes] = await Promise.all([
        axios.get(`${API}/api/onboarding/profile-completion`, { withCredentials: true }),
        axios.get(`${API}/api/accounts`, { withCredentials: true }).catch(() => ({ data: [] })),
      ]);
      setCompletionData(compRes.data);
      setAccounts(accRes.data || []);
    } catch {}
    setLoadingGrid(false);
  }, []);

  useEffect(() => { fetchCompletionData(); }, [fetchCompletionData]);

  // Auto-start module wizard when ?module= param is present
  useEffect(() => {
    if (targetModule && !loadingGrid) {
      const steps = MODULE_STEPS[targetModule];
      if (steps) {
        // Reset state for this module to ensure clean form
        resetModuleState(targetModule);
        // In module mode, auto-expand deep details
        if (targetModule === "income") setShowIncomeDeep(true);
        if (targetModule === "expenses") setShowExpenseDeep(true);
        if (targetModule === "assets") setShowAssetDeep(true);
        if (targetModule === "liabilities") setShowLiabilityDeep(true);
        if (targetModule === "investments") setShowInvestDeep(true);
        setScreen(steps[0]);
      }
    }
  }, [targetModule, loadingGrid, resetModuleState]);

  useEffect(() => {
    if (screen === "income-amount" && amountRef.current) {
      setTimeout(() => amountRef.current?.focus(), 300);
    }
  }, [screen]);

  const totalExpenses = Object.values(expenseData).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const projectedGrade = getProjectedGrade(parseFloat(incomeAmount) || 0, totalExpenses);

  const getCount = (cat) => {
    if (!completionData?.counts) return 0;
    if (cat.countKeys) return cat.countKeys.reduce((s, k) => s + (completionData.counts[k] || 0), 0);
    return completionData.counts[cat.countKey] || 0;
  };

  const completedCount = completionData ? CATEGORIES.filter(c => completionData[c.dataKey]).length : 0;
  const overallPct = completionData?.profileCompletion || 0;

  // Progress for current wizard mode
  const activeSteps = targetModule ? MODULE_STEPS[targetModule] : ALL_WIZARD_STEPS;
  const wizardIdx = activeSteps?.indexOf(screen) ?? -1;
  const wizardProgress = wizardIdx >= 0 ? Math.round(((wizardIdx + 1) / activeSteps.length) * 100) : 0;

  /* ─── Handlers ─── */
  const handleSourceSelect = (source) => {
    setSelectedSource(source);
    setIncomeName(source.defaults.type === "Salary" ? "Monthly Salary" : source.defaults.type === "Business" ? "Business Income" : "Rental Income");
    setTimeout(() => setScreen("income-amount"), 300);
  };

  const saveStep = async (step, data, skipped = false) => {
    try {
      await axios.post(`${API}/api/onboarding/save-step`, { step, data, skipped }, { withCredentials: true });
    } catch {}
  };

  const handleSaveIncome = async () => {
    setSaving(true);
    const src = selectedSource?.defaults || { type: "Salary", category: "salary", frequency: "Monthly" };
    await saveStep(1, {
      items: [{
        name: incomeName || src.type,
        amount: incomeAmount,
        type: src.type,
        category: src.category,
        frequency: incomeFrequency || src.frequency,
        selectedDate: incomeDate,
        accountId: incomeAccount || undefined,
      }]
    });
    setSaving(false);
  };

  const handleSaveExpenses = async () => {
    setSaving(true);
    const items = [];
    EXPENSE_BUCKETS.forEach(b => b.items.forEach(item => {
      const amt = expenseData[item.name];
      if (amt && parseFloat(amt) > 0) {
        items.push({
          name: item.name,
          amount: amt,
          category: item.category,
          frequency: "Monthly",
          dueDate: expenseDueDates[item.name] || undefined,
          needOrWant: expenseNeedWant[item.name] || (item.isNeed ? "need" : "want"),
        });
      }
    }));
    await saveStep(2, items.length > 0 ? { items } : {}, items.length === 0);
    setSaving(false);
  };

  const handleSaveAssets = async () => {
    setSaving(true);
    if (hasNoAssets) {
      await saveStep(3, {}, true);
    } else {
      const items = assetItems.filter(a => a.name && parseFloat(a.amount) > 0).map(a => ({
        name: a.name, amount: a.amount, assetType: a.type,
        purchaseDate: a.purchaseDate || undefined,
        growthRate: a.growthRate || undefined,
        linkedAccountId: a.linkedAccountId || undefined,
      }));
      await saveStep(3, items.length > 0 ? { items } : {}, items.length === 0);
    }
    setSaving(false);
  };

  const handleSaveLiabilities = async () => {
    setSaving(true);
    if (hasNoLiabilities) {
      await saveStep(4, {}, true);
    } else {
      const items = loanItems
        .filter(l => l.name && parseFloat(l.amount) > 0)
        .map(l => ({
          name: l.name, amount: l.amount, loanType: l.type,
          emi: l.emi, rate: l.rate,
          tenure: l.tenure || undefined,
          nextDueDate: l.nextDue || undefined,
        }));
      await saveStep(4, items.length > 0 ? { items } : {}, items.length === 0);
    }
    setSaving(false);
  };

  const handleSaveInvestments = async () => {
    setSaving(true);
    if (hasNoInvestments) {
      await saveStep(5, {}, true);
    } else {
      const items = investItems
        .filter(inv => inv.name && parseFloat(inv.amount) > 0)
        .map(inv => ({
          name: inv.name, amount: inv.amount,
          investmentType: inv.type,
          category: INVESTMENT_TYPES.find(t => t.id === inv.type)?.category || "Mutual Fund",
          frequency: inv.frequency,
          startDate: inv.startDate || undefined,
          growthRate: inv.growthRate || undefined,
          linkedAccountId: inv.linkedAccount || undefined,
        }));
      await saveStep(5, items.length > 0 ? { items } : {}, items.length === 0);
    }
    setSaving(false);
  };

  // Module-specific save: save the module data and return to grid
  const handleModuleComplete = async (saveFn) => {
    await saveFn();
    // Refresh completion data and return to grid
    await fetchCompletionData();
    setSearchParams({});
    setScreen("grid");
  };

  const handleFullComplete = async () => {
    setSaving(true);
    try { await axios.post(`${API}/api/onboarding/complete`, {}, { withCredentials: true }); } catch {}
    setSaving(false);
    setScreen("complete");
    setTimeout(() => {
      if (onComplete) onComplete();
      else navigate("/home");
    }, 3000);
  };

  const handleDismiss = async () => {
    try { await axios.post(`${API}/api/onboarding/dismiss`, {}, { withCredentials: true }); } catch {}
    if (targetModule) {
      setSearchParams({});
      setScreen("grid");
    } else if (onDismiss) {
      onDismiss();
    }
  };

  const goNext = (nextScreen) => setScreen(nextScreen);
  const goBack = () => {
    const steps = targetModule ? MODULE_STEPS[targetModule] : ALL_WIZARD_STEPS;
    const idx = steps.indexOf(screen);
    if (idx > 0) setScreen(steps[idx - 1]);
    else {
      setSearchParams({});
      setScreen("grid");
    }
  };

  // For module mode: what's the next step after current, or "done"?
  const getModuleNextStep = () => {
    if (!targetModule) return null;
    const steps = MODULE_STEPS[targetModule];
    const idx = steps.indexOf(screen);
    if (idx >= 0 && idx < steps.length - 1) return steps[idx + 1];
    return "done"; // last step
  };

  const isModuleMode = !!targetModule;
  const isDeepExpanded = isModuleMode; // Auto-expand details in module mode

  /* ─── Shared Components ─── */
  const WizardHeader = ({ title, subtitle }) => (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="p-2.5 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: "var(--bg-card)" }} data-testid="wizard-back-btn">
          <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
        </button>
        <div className="flex-1">
          <div className="h-1 rounded-full" style={{ backgroundColor: "var(--border-light)" }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${wizardProgress}%`, backgroundColor: "#10B981" }} />
          </div>
        </div>
        {isModuleMode && (
          <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: CATEGORIES.find(c => c.key === targetModule)?.bg, color: CATEGORIES.find(c => c.key === targetModule)?.color }}>
            {targetModule}
          </span>
        )}
      </div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
  );

  const DeepToggle = ({ show, onToggle }) => (
    <button onClick={onToggle}
      className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-xs font-medium transition-all mx-auto"
      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
      data-testid="deep-details-toggle"
    >
      {show ? "- Hide Details" : "+ Add Deep Details"} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${show ? "rotate-180" : ""}`} />
    </button>
  );

  const CTAButton = ({ onClick, disabled, children, secondary, className = "" }) => (
    <button onClick={onClick} disabled={disabled || saving}
      className={`py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 ${secondary ? "" : "text-white"} ${className}`}
      style={secondary
        ? { backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }
        : { background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }
      }
      data-testid={secondary ? "skip-btn" : "next-btn"}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );

  const FieldLabel = ({ children, hint }) => (
    <label className="text-xs font-medium mb-1 flex items-center flex-wrap" style={{ color: "var(--text-muted)" }}>
      {children}
      {hint && <FieldHint text={hint} />}
    </label>
  );

  const FieldInput = ({ value, onChange, placeholder, type = "text", inputMode, testId, readOnly }) => (
    <input type={type} inputMode={inputMode} placeholder={placeholder} value={value}
      onChange={onChange} readOnly={readOnly}
      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)", opacity: readOnly ? 0.7 : 1 }}
      data-testid={testId}
    />
  );

  /* ════════════════════════════════════════════
     SCREEN: Profile Health Grid
     ════════════════════════════════════════════ */
  if (screen === "grid") {
    if (loadingGrid) {
      return (
        <div className="h-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      );
    }

    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="profile-health-grid">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/home")} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="grid-back-btn">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 ml-2">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Profile Health</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your financial profile at a glance</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-2xl mb-6" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="overall-progress">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border-light)" strokeWidth="4" />
              <circle cx="32" cy="32" r="28" fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(overallPct / 100) * 175.9} 175.9`} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-black" style={{ color: "var(--text-primary)" }}>{overallPct}%</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{completedCount}/5 categories set up</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              {overallPct >= 100 ? "All done! Your profile is complete." : "Tap any card to add detailed data"}
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const isComplete = completionData?.[cat.dataKey];
            const count = getCount(cat);
            return (
              <button
                key={cat.key}
                onClick={() => { setSearchParams({ module: cat.key }); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--bg-card)", border: `1px solid ${isComplete ? cat.color + "40" : "var(--border-light)"}` }}
                data-testid={`category-card-${cat.key}`}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.bg }}>
                  <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {isComplete ? `${count} item${count !== 1 ? "s" : ""} added` : "Tap to set up"}
                  </p>
                </div>
                {isComplete ? (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color }}>
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                ) : (
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                )}
              </button>
            );
          })}
        </div>

        {overallPct < 100 && (
          <div className="mt-6 space-y-3">
            <button className="w-full p-4 rounded-2xl text-left opacity-50 cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)" }}
              disabled data-testid="finvu-connect-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Landmark className="h-5 w-5 text-white/70" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-xs">Auto-fetch via Account Aggregator</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Shield className="h-3 w-3 text-white/30" />
                    <span className="text-[10px] text-white/30">RBI regulated</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white/60 font-medium">Soon</span>
              </div>
            </button>
            <button
              onClick={() => setScreen("income-type")}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
              data-testid="quick-setup-btn"
            >
              <Sparkles className="h-4 w-4" /> Quick Setup — All Categories
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Complete Animation
     ════════════════════════════════════════════ */
  if (screen === "complete") {
    return (
      <div className="h-full min-h-screen flex flex-col items-center justify-center px-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="setup-complete">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 0 60px #10B98130" }}>
            <Check className="h-14 w-14 text-white animate-[bounceIn_0.5s_ease-out]" />
          </div>
          <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/20 animate-ping" />
        </div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Profile Complete</h1>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>Your financial profile is now active.</p>
        <span className="text-5xl font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
        <p className="text-sm font-medium mt-2" style={{ color: projectedGrade.color }}>{projectedGrade.label}</p>
        <div className="mt-8 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting...</span>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Income Type Selection
     ════════════════════════════════════════════ */
  if (screen === "income-type") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-income-type">
        <WizardHeader title="What's your primary income?" subtitle="Select your main source of earnings" />
        <div className="flex-1 flex flex-col justify-center gap-3">
          {INCOME_SOURCES.map((source) => (
            <button key={source.id} onClick={() => handleSourceSelect(source)}
              className="relative w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                backgroundColor: selectedSource?.id === source.id ? source.color + "12" : "var(--bg-card)",
                border: `2px solid ${selectedSource?.id === source.id ? source.color : "var(--border-light)"}`,
              }}
              data-testid={`source-${source.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${source.color}15` }}>
                  <source.icon className="h-6 w-6" style={{ color: source.color }} />
                </div>
                <p className="text-base font-bold flex-1" style={{ color: "var(--text-primary)" }}>{source.label}</p>
                {selectedSource?.id === source.id && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: source.color }}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Income Amount + Deep Details
     ════════════════════════════════════════════ */
  if (screen === "income-amount") {
    const deepVisible = showIncomeDeep || isDeepExpanded;
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-income-amount">
        <WizardHeader title="How much do you earn monthly?" subtitle={`${selectedSource?.label || "Income"} — after taxes`} />
        <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-light" style={{ color: "var(--text-muted)" }}>₹</span>
            <input ref={amountRef} type="text" inputMode="numeric"
              value={incomeAmount ? Number(incomeAmount).toLocaleString("en-IN") : ""}
              onChange={(e) => setIncomeAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="text-5xl font-black text-center bg-transparent outline-none w-full"
              style={{ color: "var(--text-primary)", caretColor: "#10B981" }}
              data-testid="income-amount-input"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>per month</p>

          {incomeAmount && parseFloat(incomeAmount) > 0 && !isDeepExpanded && (
            <DeepToggle show={showIncomeDeep} onToggle={() => setShowIncomeDeep(!showIncomeDeep)} />
          )}

          {deepVisible && incomeAmount && parseFloat(incomeAmount) > 0 && (
            <div className="w-full mt-4 p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div>
                <FieldLabel>Income Name</FieldLabel>
                <FieldInput value={incomeName} onChange={() => {}} testId="income-name-input" readOnly />
              </div>
              <div>
                <FieldLabel hint="We use this to project your annual income">Frequency</FieldLabel>
                <select value={incomeFrequency} onChange={(e) => setIncomeFrequency(e.target.value)}
                  className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  data-testid="income-frequency-select"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              {accounts.length > 0 && (
                <div>
                  <FieldLabel hint="Link to track income vs. bank balance">Linked Account</FieldLabel>
                  <select value={incomeAccount} onChange={(e) => setIncomeAccount(e.target.value)}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid="income-account-select"
                  >
                    <option value="">None</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        <CTAButton className="w-full"
          onClick={async () => {
            await handleSaveIncome();
            const next = getModuleNextStep();
            if (next === "done") { await handleModuleComplete(async () => {}); }
            else goNext(isModuleMode ? (MODULE_STEPS.income[MODULE_STEPS.income.indexOf(screen) + 1] || "income-date") : "income-date");
          }}
          disabled={!incomeAmount || parseFloat(incomeAmount) <= 0 || saving}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Income Date
     ════════════════════════════════════════════ */
  if (screen === "income-date") {
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    const isLastModuleStep = isModuleMode && getModuleNextStep() === "done";
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-income-date">
        <WizardHeader title="When does it arrive?" subtitle="Select the day your income usually hits your account" />
        <p className="text-[10px] mb-3 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <Info className="h-3 w-3" /> We use this to notify you if your salary is delayed
        </p>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => (
              <button key={d} onClick={() => setIncomeDate(String(d))}
                className="aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90"
                style={{
                  backgroundColor: incomeDate === String(d) ? "#10B981" : "var(--bg-card)",
                  color: incomeDate === String(d) ? "white" : "var(--text-primary)",
                  border: `1px solid ${incomeDate === String(d) ? "#10B981" : "var(--border-light)"}`,
                }}
                data-testid={`day-${d}`}
              >{d}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          {!isModuleMode && (
            <CTAButton className="flex-1" secondary onClick={() => goNext("expenses")}>
              <SkipForward className="h-4 w-4" /> Set later
            </CTAButton>
          )}
          <CTAButton className="flex-1"
            onClick={async () => {
              await handleSaveIncome();
              if (isLastModuleStep || isModuleMode) { await handleModuleComplete(async () => {}); }
              else goNext("expenses");
            }}
          >
            {isModuleMode ? "Save & Done" : "Continue"} <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Expenses
     ════════════════════════════════════════════ */
  if (screen === "expenses") {
    const bucket = EXPENSE_BUCKETS[activeBucket];
    const deepVisible = showExpenseDeep || isDeepExpanded;
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-expenses">
        <WizardHeader title="Monthly Expenses" subtitle="Enter approximate amounts — refine later" />
        <div className="flex gap-2 mb-4">
          {EXPENSE_BUCKETS.map((b, idx) => (
            <button key={b.id} onClick={() => setActiveBucket(idx)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center transition-all"
              style={{
                backgroundColor: activeBucket === idx ? b.color : "var(--bg-card)",
                color: activeBucket === idx ? "white" : "var(--text-muted)",
                border: `1px solid ${activeBucket === idx ? b.color : "var(--border-light)"}`,
              }}
              data-testid={`bucket-tab-${b.id}`}
            >{b.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
          <p className="text-xs font-medium mb-1" style={{ color: bucket.color }}>{bucket.subtitle}</p>
          {bucket.items.map((item) => (
            <div key={item.name} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${bucket.color}12` }}>
                  <item.icon className="h-4 w-4" style={{ color: bucket.color }} />
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                <div className="flex items-center gap-1 w-28">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" inputMode="numeric"
                    value={expenseData[item.name] || ""}
                    onChange={(e) => setExpenseData(p => ({ ...p, [item.name]: e.target.value.replace(/[^0-9]/g, "") }))}
                    placeholder="0"
                    className="w-full bg-transparent text-sm font-bold text-right outline-none"
                    style={{ color: "var(--text-primary)" }}
                    data-testid={`expense-${item.name.replace(/\s/g, '-').toLowerCase()}`}
                  />
                </div>
              </div>
              {/* Deep fields per expense */}
              {deepVisible && expenseData[item.name] && parseFloat(expenseData[item.name]) > 0 && (
                <div className="mt-2 pt-2 flex gap-2" style={{ borderTop: "1px solid var(--border-light)" }}>
                  <div className="flex-1">
                    <span className="text-[10px] block mb-0.5" style={{ color: "var(--text-muted)" }}>Due date</span>
                    <select value={expenseDueDates[item.name] || ""}
                      onChange={(e) => setExpenseDueDates(p => ({ ...p, [item.name]: e.target.value }))}
                      className="w-full bg-transparent rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`expense-due-${item.name.replace(/\s/g, '-').toLowerCase()}`}
                    >
                      <option value="">-</option>
                      {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] block mb-0.5" style={{ color: "var(--text-muted)" }}>Type</span>
                    <select value={expenseNeedWant[item.name] || (item.isNeed ? "need" : "want")}
                      onChange={(e) => setExpenseNeedWant(p => ({ ...p, [item.name]: e.target.value }))}
                      className="w-full bg-transparent rounded-lg px-2 py-1.5 text-xs outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`expense-type-${item.name.replace(/\s/g, '-').toLowerCase()}`}
                    >
                      <option value="need">Need</option>
                      <option value="want">Want</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!isDeepExpanded && <DeepToggle show={showExpenseDeep} onToggle={() => setShowExpenseDeep(!showExpenseDeep)} />}
        </div>
        {parseFloat(incomeAmount) > 0 && (
          <div className="flex items-center justify-center gap-2 mb-3 py-2 px-4 rounded-full mx-auto" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="grade-pill">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Grade</span>
            <span className="text-sm font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
          </div>
        )}
        <div className="flex gap-3">
          {!isModuleMode && (
            <CTAButton className="flex-1" secondary onClick={async () => { await handleSaveExpenses(); goNext("asset-type"); }}>
              <SkipForward className="h-4 w-4" /> Skip
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => {
            if (isModuleMode) { await handleModuleComplete(handleSaveExpenses); }
            else { await handleSaveExpenses(); goNext("asset-type"); }
          }}>
            {isModuleMode ? "Save & Done" : "Continue"} <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Asset Type Selection (Step 1 of 3)
     ════════════════════════════════════════════ */
  if (screen === "asset-type") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-asset-type">
        <WizardHeader title="What do you own?" subtitle="Select the type of asset to add" />
        <div className="flex-1 flex flex-col justify-center gap-3">
          {ASSET_TYPES.map((type) => (
            <button key={type.id} onClick={() => {
              const u = [...assetItems];
              u[0] = { ...u[0], type: type.category, name: type.label };
              setAssetItems(u);
              setHasNoAssets(false);
              setTimeout(() => setScreen("asset-details"), 300);
            }}
              className="relative w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                backgroundColor: assetItems[0]?.type === type.category ? type.color + "12" : "var(--bg-card)",
                border: `2px solid ${assetItems[0]?.type === type.category ? type.color : "var(--border-light)"}`,
              }}
              data-testid={`asset-type-card-${type.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <type.icon className="h-6 w-6" style={{ color: type.color }} />
                </div>
                <p className="text-base font-bold flex-1" style={{ color: "var(--text-primary)" }}>{type.label}</p>
                {assetItems[0]?.type === type.category && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: type.color }}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        <CTAButton className="w-full mt-4" secondary onClick={async () => {
          setHasNoAssets(true);
          if (isModuleMode) { await handleModuleComplete(handleSaveAssets); }
          else goNext("liability-type");
        }}>
          I don't have any assets
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Asset Details (Step 2 of 3)
     ════════════════════════════════════════════ */
  if (screen === "asset-details") {
    const currentType = ASSET_TYPES.find(t => t.category === assetItems[0]?.type);
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-asset-details">
        <WizardHeader title={`Add ${currentType?.label || "Asset"}`} subtitle="Enter the name and current value" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {assetItems.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              {idx > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap flex-1">
                    {ASSET_TYPES.map(t => (
                      <button key={t.id} onClick={() => {
                        const u = [...assetItems]; u[idx] = { ...u[idx], type: t.category, name: t.label }; setAssetItems(u);
                      }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                        style={{
                          backgroundColor: item.type === t.category ? `${t.color}15` : "transparent",
                          color: item.type === t.category ? t.color : "var(--text-muted)",
                          border: `1px solid ${item.type === t.category ? t.color : "var(--border-light)"}`,
                        }}
                        data-testid={`asset-type-pill-${t.id}-${idx}`}
                      >{t.label}</button>
                    ))}
                  </div>
                  <button onClick={() => setAssetItems(p => p.filter((_, i) => i !== idx))} className="text-xs underline ml-2 flex-shrink-0" style={{ color: "#EF4444" }} data-testid={`remove-asset-${idx}`}>Remove</button>
                </div>
              )}
              <div>
                <FieldLabel>Asset Name</FieldLabel>
                <FieldInput value={item.name} placeholder="e.g., HDFC Savings, Green Villa" testId={`asset-name-${idx}`} readOnly
                  onChange={() => {}}
                />
              </div>
              <div>
                <FieldLabel>Current Value (₹)</FieldLabel>
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" inputMode="numeric" placeholder="Current Value"
                    value={item.amount}
                    onChange={(e) => { const u = [...assetItems]; u[idx] = { ...u[idx], amount: e.target.value.replace(/[^0-9]/g, "") }; setAssetItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`asset-amount-${idx}`}
                  />
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setAssetItems(p => [...p, { name: "Bank Balance", amount: "", type: "bank_balance", purchaseDate: "", growthRate: "" }])}
            className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ color: "#3B82F6", border: "1px dashed var(--border-light)" }}
            data-testid="add-asset-btn"
          ><Plus className="h-3.5 w-3.5" /> Add another asset</button>
        </div>
        <CTAButton className="w-full"
          onClick={() => setScreen("asset-deep")}
          disabled={!assetItems.some(a => a.name && parseFloat(a.amount) > 0)}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Asset Deep Details (Step 3 of 3)
     ════════════════════════════════════════════ */
  if (screen === "asset-deep") {
    const validAssets = assetItems.filter(a => a.name && parseFloat(a.amount) > 0);
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-asset-deep">
        <WizardHeader title="Asset Deep Details" subtitle="Optional — helps with accurate Net Worth projections" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {validAssets.map((item) => {
            const origIdx = assetItems.indexOf(item);
            const typeInfo = ASSET_TYPES.find(t => t.category === item.type);
            return (
              <div key={origIdx} className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-2">
                  {typeInfo && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${typeInfo.color}15` }}>
                    <typeInfo.icon className="h-4 w-4" style={{ color: typeInfo.color }} />
                  </div>}
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>₹{parseFloat(item.amount).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <FieldLabel hint="For calculating appreciation over time">Purchase Date</FieldLabel>
                  <input type="date" value={item.purchaseDate || ""}
                    onChange={(e) => { const u = [...assetItems]; u[origIdx] = { ...u[origIdx], purchaseDate: e.target.value }; setAssetItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`asset-date-${origIdx}`}
                  />
                </div>
                {item.type !== "bank_balance" && (
                  <div>
                    <FieldLabel hint="12% recommended for Indian Mutual Funds">Expected Growth Rate (%)</FieldLabel>
                    <input type="text" inputMode="decimal" placeholder="e.g., 8" value={item.growthRate || ""}
                      onChange={(e) => { const u = [...assetItems]; u[origIdx] = { ...u[origIdx], growthRate: e.target.value.replace(/[^0-9.]/g, "") }; setAssetItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`asset-growth-${origIdx}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-4">
          {!isModuleMode && (
            <CTAButton className="flex-1" secondary onClick={async () => { await handleSaveAssets(); goNext("liability-type"); }}>
              <SkipForward className="h-4 w-4" /> Skip details
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => {
            if (isModuleMode) { await handleModuleComplete(handleSaveAssets); }
            else { await handleSaveAssets(); goNext("liability-type"); }
          }}>
            {isModuleMode ? "Save & Done" : "Continue"} <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Liability Type Selection (Step 1 of 3)
     ════════════════════════════════════════════ */
  if (screen === "liability-type") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-liability-type">
        <WizardHeader title="Any Loans or Debt?" subtitle="Select the type of liability" />
        <div className="flex-1 flex flex-col justify-center gap-3">
          {LOAN_TYPES.map((type) => (
            <button key={type.id} onClick={() => {
              const u = [...loanItems];
              u[0] = { ...u[0], type: type.label, name: type.label };
              setLoanItems(u);
              setHasNoLiabilities(false);
              setTimeout(() => setScreen("liability-details"), 300);
            }}
              className="relative w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                backgroundColor: loanItems[0]?.type === type.label ? type.color + "12" : "var(--bg-card)",
                border: `2px solid ${loanItems[0]?.type === type.label ? type.color : "var(--border-light)"}`,
              }}
              data-testid={`loan-type-card-${type.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <type.icon className="h-6 w-6" style={{ color: type.color }} />
                </div>
                <p className="text-base font-bold flex-1" style={{ color: "var(--text-primary)" }}>{type.label}</p>
                {loanItems[0]?.type === type.label && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: type.color }}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        <CTAButton className="w-full mt-4" secondary onClick={async () => {
          setHasNoLiabilities(true);
          if (isModuleMode) { await handleModuleComplete(handleSaveLiabilities); }
          else goNext("invest-type");
        }}>
          <Check className="h-4 w-4" /> I'm debt free!
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Liability Details (Step 2 of 3)
     ════════════════════════════════════════════ */
  if (screen === "liability-details") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-liability-details">
        <WizardHeader title="Loan Details" subtitle="Enter the key details of your loans" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {loanItems.map((item, idx) => {
            const currentLoanType = LOAN_TYPES.find(t => t.label === item.type);
            return (
              <div key={idx} className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                {idx > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap flex-1">
                      {LOAN_TYPES.map(t => (
                        <button key={t.id} onClick={() => {
                          const u = [...loanItems]; u[idx] = { ...u[idx], type: t.label, name: t.label }; setLoanItems(u);
                        }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          style={{
                            backgroundColor: item.type === t.label ? `${t.color}15` : "transparent",
                            color: item.type === t.label ? t.color : "var(--text-muted)",
                            border: `1px solid ${item.type === t.label ? t.color : "var(--border-light)"}`,
                          }}
                          data-testid={`loan-type-pill-${t.id}-${idx}`}
                        >{t.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setLoanItems(p => p.filter((_, i) => i !== idx))} className="text-xs underline ml-2 flex-shrink-0" style={{ color: "#EF4444" }} data-testid={`remove-loan-${idx}`}>Remove</button>
                  </div>
                )}
                {idx === 0 && currentLoanType && (
                  <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentLoanType.color}15` }}>
                      <currentLoanType.icon className="h-4 w-4" style={{ color: currentLoanType.color }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: currentLoanType.color }}>{currentLoanType.label}</span>
                  </div>
                )}
                <div>
                  <FieldLabel>Loan Name</FieldLabel>
                  <FieldInput value={item.name} onChange={() => {}} placeholder="e.g., HDFC Home Loan" testId={`loan-name-${idx}`} readOnly />
                </div>
                <div>
                  <FieldLabel hint="Total amount you still owe">Outstanding Principal (₹)</FieldLabel>
                  <div className="flex items-center gap-1">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                    <input type="text" inputMode="numeric" placeholder="Outstanding amount"
                      value={item.amount} onChange={(e) => { const u = [...loanItems]; u[idx] = { ...u[idx], amount: e.target.value.replace(/[^0-9]/g, "") }; setLoanItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`loan-amount-${idx}`}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel hint="We'll track this against your income">Monthly EMI (₹)</FieldLabel>
                  <div className="flex items-center gap-1">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                    <input type="text" inputMode="numeric" placeholder="Monthly EMI"
                      value={item.emi} onChange={(e) => { const u = [...loanItems]; u[idx] = { ...u[idx], emi: e.target.value.replace(/[^0-9]/g, "") }; setLoanItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`loan-emi-${idx}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => setLoanItems(p => [...p, { name: "Personal Loan", amount: "", emi: "", type: "Personal Loan", rate: "", tenure: "", nextDue: "" }])}
            className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ color: "#F59E0B", border: "1px dashed var(--border-light)" }}
            data-testid="add-loan-btn"
          ><Plus className="h-3.5 w-3.5" /> Add another loan</button>
        </div>
        <CTAButton className="w-full"
          onClick={() => setScreen("liability-deep")}
          disabled={!loanItems.some(l => l.name && parseFloat(l.amount) > 0)}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Liability Deep Details (Step 3 of 3)
     ════════════════════════════════════════════ */
  if (screen === "liability-deep") {
    const validLoans = loanItems.filter(l => l.name && parseFloat(l.amount) > 0);
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-liability-deep">
        <WizardHeader title="Loan Deep Details" subtitle="Helps calculate your real cost of borrowing" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {validLoans.map((item) => {
            const origIdx = loanItems.indexOf(item);
            const typeInfo = LOAN_TYPES.find(t => t.label === item.type);
            return (
              <div key={origIdx} className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-2">
                  {typeInfo && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${typeInfo.color}15` }}>
                    <typeInfo.icon className="h-4 w-4" style={{ color: typeInfo.color }} />
                  </div>}
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>₹{parseFloat(item.amount).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <FieldLabel hint="Helps calculate your real cost of borrowing">Interest Rate (%)</FieldLabel>
                  <input type="text" inputMode="decimal" placeholder="e.g., 8.5" value={item.rate}
                    onChange={(e) => { const u = [...loanItems]; u[origIdx] = { ...u[origIdx], rate: e.target.value.replace(/[^0-9.]/g, "") }; setLoanItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`loan-rate-${origIdx}`}
                  />
                </div>
                <div>
                  <FieldLabel hint="How many months left on this loan?">Tenure Remaining (months)</FieldLabel>
                  <input type="text" inputMode="numeric" placeholder="e.g., 120" value={item.tenure}
                    onChange={(e) => { const u = [...loanItems]; u[origIdx] = { ...u[origIdx], tenure: e.target.value.replace(/[^0-9]/g, "") }; setLoanItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`loan-tenure-${origIdx}`}
                  />
                </div>
                <div>
                  <FieldLabel hint="We'll remind you before it's due">Next EMI Due Date (day of month)</FieldLabel>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <button key={d} onClick={() => { const u = [...loanItems]; u[origIdx] = { ...u[origIdx], nextDue: String(d) }; setLoanItems(u); }}
                        className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                        style={{
                          backgroundColor: item.nextDue === String(d) ? "#F59E0B" : "var(--bg-app)",
                          color: item.nextDue === String(d) ? "white" : "var(--text-muted)",
                          border: `1px solid ${item.nextDue === String(d) ? "#F59E0B" : "var(--border-light)"}`,
                        }}
                        data-testid={`loan-due-day-${d}-${origIdx}`}
                      >{d}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-4">
          {!isModuleMode && (
            <CTAButton className="flex-1" secondary onClick={async () => { await handleSaveLiabilities(); goNext("invest-type"); }}>
              <SkipForward className="h-4 w-4" /> Skip details
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => {
            if (isModuleMode) { await handleModuleComplete(handleSaveLiabilities); }
            else { await handleSaveLiabilities(); goNext("invest-type"); }
          }}>
            {isModuleMode ? "Save & Done" : "Continue"} <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Investment Type Selection (Step 1 of 3)
     ════════════════════════════════════════════ */
  if (screen === "invest-type") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-invest-type">
        <WizardHeader title="Do you invest?" subtitle="Select your investment type" />
        <div className="flex-1 flex flex-col justify-center gap-3">
          {INVESTMENT_TYPES.map((type) => (
            <button key={type.id} onClick={() => {
              const u = [...investItems];
              u[0] = { ...u[0], type: type.id, name: type.label };
              setInvestItems(u);
              setHasNoInvestments(false);
              setTimeout(() => setScreen("invest-details"), 300);
            }}
              className="relative w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                backgroundColor: investItems[0]?.type === type.id ? type.color + "12" : "var(--bg-card)",
                border: `2px solid ${investItems[0]?.type === type.id ? type.color : "var(--border-light)"}`,
              }}
              data-testid={`invest-type-card-${type.id}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${type.color}15` }}>
                  <type.icon className="h-6 w-6" style={{ color: type.color }} />
                </div>
                <p className="text-base font-bold flex-1" style={{ color: "var(--text-primary)" }}>{type.label}</p>
                {investItems[0]?.type === type.id && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: type.color }}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        <CTAButton className="w-full mt-4" secondary onClick={async () => {
          setHasNoInvestments(true);
          if (isModuleMode) { await handleModuleComplete(handleSaveInvestments); }
          else goNext("review");
        }}>
          Not yet — I'll start soon
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Investment Details (Step 2 of 3)
     ════════════════════════════════════════════ */
  if (screen === "invest-details") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-invest-details">
        <WizardHeader title="Investment Details" subtitle="Name and amount of your investments" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {investItems.map((item, idx) => {
            const currentType = INVESTMENT_TYPES.find(t => t.id === item.type);
            return (
              <div key={idx} className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                {idx > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 flex-wrap flex-1">
                      {INVESTMENT_TYPES.map(t => (
                        <button key={t.id} onClick={() => {
                          const u = [...investItems]; u[idx] = { ...u[idx], type: t.id, name: t.label }; setInvestItems(u);
                        }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                          style={{
                            backgroundColor: item.type === t.id ? `${t.color}15` : "transparent",
                            color: item.type === t.id ? t.color : "var(--text-muted)",
                            border: `1px solid ${item.type === t.id ? t.color : "var(--border-light)"}`,
                          }}
                          data-testid={`invest-type-pill-${t.id}-${idx}`}
                        >{t.label}</button>
                      ))}
                    </div>
                    <button onClick={() => setInvestItems(p => p.filter((_, i) => i !== idx))} className="text-xs underline ml-2 flex-shrink-0" style={{ color: "#EF4444" }} data-testid={`remove-invest-${idx}`}>Remove</button>
                  </div>
                )}
                {idx === 0 && currentType && (
                  <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${currentType.color}15` }}>
                      <currentType.icon className="h-4 w-4" style={{ color: currentType.color }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: currentType.color }}>{currentType.label}</span>
                  </div>
                )}
                <div>
                  <FieldLabel>Investment Name</FieldLabel>
                  <FieldInput value={item.name} onChange={() => {}} placeholder="e.g., HDFC Flexi Cap, SBI FD" testId={`invest-name-${idx}`} readOnly />
                </div>
                <div>
                  <FieldLabel>Monthly Amount / Current Value (₹)</FieldLabel>
                  <div className="flex items-center gap-1">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                    <input type="text" inputMode="numeric" placeholder="Amount"
                      value={item.amount} onChange={(e) => { const u = [...investItems]; u[idx] = { ...u[idx], amount: e.target.value.replace(/[^0-9]/g, "") }; setInvestItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`invest-amount-${idx}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={() => setInvestItems(p => [...p, { name: "Mutual Funds / SIP", amount: "", type: "mutual-fund", frequency: "Monthly", startDate: "", growthRate: "", linkedAccount: "" }])}
            className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ color: "#8B5CF6", border: "1px dashed var(--border-light)" }}
            data-testid="add-invest-btn"
          ><Plus className="h-3.5 w-3.5" /> Add another investment</button>
        </div>
        <CTAButton className="w-full"
          onClick={() => setScreen("invest-deep")}
          disabled={!investItems.some(inv => inv.name && parseFloat(inv.amount) > 0)}
        >
          Continue <ArrowRight className="h-4 w-4" />
        </CTAButton>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Investment Deep Details (Step 3 of 3)
     ════════════════════════════════════════════ */
  if (screen === "invest-deep") {
    const validInvests = investItems.filter(inv => inv.name && parseFloat(inv.amount) > 0);
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-invest-deep">
        <WizardHeader title="Investment Deep Details" subtitle="Optional — improves return projections" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {validInvests.map((item) => {
            const origIdx = investItems.indexOf(item);
            const typeInfo = INVESTMENT_TYPES.find(t => t.id === item.type);
            return (
              <div key={origIdx} className="p-4 rounded-2xl space-y-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <div className="flex items-center gap-2">
                  {typeInfo && <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${typeInfo.color}15` }}>
                    <typeInfo.icon className="h-4 w-4" style={{ color: typeInfo.color }} />
                  </div>}
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>₹{parseFloat(item.amount).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <FieldLabel hint="SIP or lumpsum — affects projections">Frequency</FieldLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {["Monthly", "Quarterly", "One-time"].map(f => (
                      <button key={f} onClick={() => { const u = [...investItems]; u[origIdx] = { ...u[origIdx], frequency: f }; setInvestItems(u); }}
                        className="px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all"
                        style={{
                          backgroundColor: item.frequency === f ? "#8B5CF615" : "var(--bg-app)",
                          color: item.frequency === f ? "#8B5CF6" : "var(--text-muted)",
                          border: `1px solid ${item.frequency === f ? "#8B5CF6" : "var(--border-light)"}`,
                        }}
                        data-testid={`invest-freq-${f.toLowerCase().replace(/\s/g, '-')}-${origIdx}`}
                      >{f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel hint="When did you start this SIP / buy this investment?">Start / Purchase Date</FieldLabel>
                  <input type="date" value={item.startDate}
                    onChange={(e) => { const u = [...investItems]; u[origIdx] = { ...u[origIdx], startDate: e.target.value }; setInvestItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`invest-start-date-${origIdx}`}
                  />
                </div>
                <div>
                  <FieldLabel hint="12% is a conservative estimate for Indian Mutual Funds">Expected Returns (%)</FieldLabel>
                  <input type="text" inputMode="decimal" placeholder="e.g., 12" value={item.growthRate}
                    onChange={(e) => { const u = [...investItems]; u[origIdx] = { ...u[origIdx], growthRate: e.target.value.replace(/[^0-9.]/g, "") }; setInvestItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`invest-growth-rate-${origIdx}`}
                  />
                </div>
                {accounts.length > 0 && (
                  <div>
                    <FieldLabel hint="Track deductions from this account">Linked Account</FieldLabel>
                    <select value={item.linkedAccount} onChange={(e) => { const u = [...investItems]; u[origIdx] = { ...u[origIdx], linkedAccount: e.target.value }; setInvestItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`invest-linked-account-${origIdx}`}
                    >
                      <option value="">None</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-4">
          {!isModuleMode && (
            <CTAButton className="flex-1" secondary onClick={async () => { await handleSaveInvestments(); goNext("review"); }}>
              <SkipForward className="h-4 w-4" /> Skip details
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => {
            if (isModuleMode) { await handleModuleComplete(handleSaveInvestments); }
            else { await handleSaveInvestments(); goNext("review"); }
          }}>
            {isModuleMode ? "Save & Done" : "Review"} <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Review (full wizard only)
     ════════════════════════════════════════════ */
  if (screen === "review") {
    const income = parseFloat(incomeAmount) || 0;
    const expenseItems = Object.entries(expenseData).filter(([, v]) => parseFloat(v) > 0);
    const validAssets = assetItems.filter(a => a.name && parseFloat(a.amount) > 0);
    const totalAssetValue = validAssets.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const validLoans = loanItems.filter(l => l.name && parseFloat(l.amount) > 0);
    const totalLoanValue = validLoans.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const validInvests = investItems.filter(inv => inv.name && parseFloat(inv.amount) > 0);
    const totalInvestValue = validInvests.reduce((s, inv) => s + (parseFloat(inv.amount) || 0), 0);

    const sections = [
      { show: income > 0, color: "#10B981", icon: Wallet, label: "Income", value: `₹${income.toLocaleString("en-IN")}/mo`, detail: `${incomeName || "Monthly"} · ${selectedSource?.label || "Salary"}` },
      { show: expenseItems.length > 0, color: "#EF4444", icon: Receipt, label: "Expenses", value: `₹${totalExpenses.toLocaleString("en-IN")}/mo`, detail: `${expenseItems.length} items` },
      { show: !hasNoAssets && validAssets.length > 0, color: "#3B82F6", icon: Building2, label: "Assets", value: `₹${totalAssetValue.toLocaleString("en-IN")}`, detail: `${validAssets.length} item${validAssets.length > 1 ? "s" : ""}` },
      { show: hasNoAssets, color: "#3B82F6", icon: Building2, label: "Assets", value: "None", detail: "No assets added" },
      { show: !hasNoLiabilities && validLoans.length > 0, color: "#F59E0B", icon: CreditCard, label: "Liabilities", value: `₹${totalLoanValue.toLocaleString("en-IN")}`, detail: `${validLoans.length} loan${validLoans.length > 1 ? "s" : ""}` },
      { show: hasNoLiabilities, color: "#F59E0B", icon: CreditCard, label: "Liabilities", value: "Debt free", detail: "No outstanding debt" },
      { show: !hasNoInvestments && validInvests.length > 0, color: "#8B5CF6", icon: TrendingUp, label: "Investments", value: `₹${totalInvestValue.toLocaleString("en-IN")}`, detail: `${validInvests.length} investment${validInvests.length > 1 ? "s" : ""}` },
      { show: hasNoInvestments, color: "#8B5CF6", icon: TrendingUp, label: "Investments", value: "None yet", detail: "No investments added" },
    ].filter(s => s.show);

    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-review">
        <WizardHeader title="Your Financial Profile" subtitle="Review what we've captured" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          <div className="p-5 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${projectedGrade.color}15 0%, ${projectedGrade.color}05 100%)`, border: `1px solid ${projectedGrade.color}30` }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Projected Wealth Grade</p>
            <span className="text-5xl font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
            <p className="text-sm font-medium mt-2" style={{ color: projectedGrade.color }}>{projectedGrade.label}</p>
          </div>
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}12` }}>
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</p>
              </div>
              <p className="text-xs text-right" style={{ color: "var(--text-muted)" }}>{s.detail}</p>
            </div>
          ))}
          {income > 0 && (
            <div className="p-4 rounded-2xl flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Monthly Surplus</span>
              <span className="text-base font-black" style={{ color: income - totalExpenses >= 0 ? "#10B981" : "#EF4444" }}>
                {income - totalExpenses >= 0 ? "+" : ""}₹{Math.abs(income - totalExpenses).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
        <CTAButton className="w-full" onClick={handleFullComplete} disabled={saving}>
          <Sparkles className="h-4 w-4" /> Complete Profile Setup
        </CTAButton>
      </div>
    );
  }

  return null;
}

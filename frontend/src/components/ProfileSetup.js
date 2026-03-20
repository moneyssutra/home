import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Briefcase, Store, Home, ArrowRight, ArrowLeft, Check, X,
  Wallet, Sparkles, ChevronDown, SkipForward,
  Loader2, Shield, Landmark, ChevronRight, Receipt,
  Zap, BookOpen, ShoppingBag, Car, Lightbulb, Dumbbell,
  PiggyBank, Utensils, Wifi, TrendingUp, CreditCard,
  Building2, CircleDollarSign, BarChart3, Plus
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Category Config ─── */
const CATEGORIES = [
  { key: "income", label: "Income", icon: Wallet, color: "#10B981", bg: "#10B98112", route: "/my-income", dataKey: "incomeAdded", countKey: "income" },
  { key: "expenses", label: "Expenses", icon: Receipt, color: "#EF4444", bg: "#EF444412", route: "/my-expenses", dataKey: "expensesAdded", countKey: "expenses" },
  { key: "assets", label: "Assets", icon: Building2, color: "#3B82F6", bg: "#3B82F612", route: "/my-accounts", dataKey: "assetsAdded", countKeys: ["accounts", "assets"] },
  { key: "liabilities", label: "Liabilities", icon: CreditCard, color: "#F59E0B", bg: "#F59E0B12", route: "/my-liabilities", dataKey: "liabilitiesAdded", countKeys: ["loans", "creditCards"] },
  { key: "investments", label: "Investments", icon: TrendingUp, color: "#8B5CF6", bg: "#8B5CF612", route: "/my-investments", dataKey: "investmentsAdded", countKey: "investments" },
];

const INCOME_SOURCES = [
  { id: "job", label: "Job / Salary", icon: Briefcase, color: "#3B82F6", defaults: { type: "Salary", category: "salary", frequency: "Monthly" } },
  { id: "business", label: "Business", icon: Store, color: "#8B5CF6", defaults: { type: "Business", category: "business", frequency: "Monthly" } },
  { id: "rental", label: "Rental Income", icon: Home, color: "#F59E0B", defaults: { type: "Rental", category: "rental", frequency: "Monthly" } },
];

const EXPENSE_BUCKETS = [
  {
    id: "essentials", label: "Essentials", subtitle: "Can't skip these", color: "#EF4444",
    icon: Zap,
    items: [
      { name: "Rent / Housing", category: "Housing", icon: Home },
      { name: "EMI Payments", category: "EMI", icon: Receipt },
      { name: "Utilities", category: "Utilities", icon: Lightbulb },
      { name: "Transport / Fuel", category: "Transport", icon: Car },
      { name: "Phone / Internet", category: "Utilities", icon: Wifi },
    ]
  },
  {
    id: "growth", label: "Growth", subtitle: "Investing in yourself", color: "#10B981",
    icon: BookOpen,
    items: [
      { name: "Learning / Education", category: "Education", icon: BookOpen },
      { name: "Fitness / Health", category: "Health", icon: Dumbbell },
      { name: "Savings / SIP", category: "Savings", icon: PiggyBank },
    ]
  },
  {
    id: "lifestyle", label: "Lifestyle", subtitle: "The nice-to-haves", color: "#F59E0B",
    icon: ShoppingBag,
    items: [
      { name: "Dining Out", category: "Food", icon: Utensils },
      { name: "Shopping", category: "Shopping", icon: ShoppingBag },
      { name: "Entertainment", category: "Entertainment", icon: Sparkles },
    ]
  },
];

const ASSET_TYPES = [
  { id: "bank", label: "Bank Balance", icon: Landmark, category: "bank_balance" },
  { id: "property", label: "Property / Land", icon: Building2, category: "property" },
  { id: "gold", label: "Gold / Jewellery", icon: CircleDollarSign, category: "gold" },
  { id: "vehicle", label: "Vehicle", icon: Car, category: "vehicle" },
];

const INVESTMENT_TYPES = [
  { id: "mutual-fund", label: "Mutual Funds / SIP", icon: BarChart3, category: "Mutual Fund" },
  { id: "stocks", label: "Stocks", icon: TrendingUp, category: "Stocks" },
  { id: "fd", label: "Fixed Deposit", icon: Shield, category: "Fixed Deposit" },
  { id: "ppf", label: "PPF / NPS", icon: PiggyBank, category: "PPF" },
];

/* ─── Projected Grade ─── */
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

export default function ProfileSetup({ onComplete, onDismiss }) {
  const navigate = useNavigate();
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
  const [activeBucket, setActiveBucket] = useState(0);

  // Asset state
  const [assetItems, setAssetItems] = useState([{ name: "", amount: "", type: "bank_balance" }]);
  const [showAssetDeep, setShowAssetDeep] = useState(false);
  const [hasNoAssets, setHasNoAssets] = useState(false);

  // Liability state
  const [hasNoLiabilities, setHasNoLiabilities] = useState(false);
  const [loanName, setLoanName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanEmi, setLoanEmi] = useState("");
  const [showLiabilityDeep, setShowLiabilityDeep] = useState(false);
  const [loanType, setLoanType] = useState("Personal");
  const [loanRate, setLoanRate] = useState("");

  // Investment state
  const [hasNoInvestments, setHasNoInvestments] = useState(false);
  const [investName, setInvestName] = useState("");
  const [investAmount, setInvestAmount] = useState("");
  const [investType, setInvestType] = useState("mutual-fund");
  const [showInvestDeep, setShowInvestDeep] = useState(false);
  const [investFrequency, setInvestFrequency] = useState("Monthly");

  const [accounts, setAccounts] = useState([]);

  // Fetch completion data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [compRes, accRes] = await Promise.all([
          axios.get(`${API}/api/onboarding/profile-completion`, { withCredentials: true }),
          axios.get(`${API}/api/accounts`, { withCredentials: true }).catch(() => ({ data: [] })),
        ]);
        setCompletionData(compRes.data);
        setAccounts(accRes.data || []);
      } catch {}
      setLoadingGrid(false);
    };
    fetchData();
  }, []);

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

  /* ─── Wizard Step Mapping ─── */
  const WIZARD_STEPS = ["income-type", "income-amount", "income-date", "expenses", "assets", "liabilities", "investments", "review", "complete"];
  const wizardIdx = WIZARD_STEPS.indexOf(screen);
  const wizardProgress = wizardIdx >= 0 ? Math.round(((wizardIdx + 1) / WIZARD_STEPS.length) * 100) : 0;

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
      if (amt && parseFloat(amt) > 0) items.push({ name: item.name, amount: amt, category: item.category, frequency: "Monthly" });
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
      const items = [];
      if (loanName && parseFloat(loanAmount) > 0) {
        items.push({ name: loanName, amount: loanAmount, loanType, emi: loanEmi, rate: loanRate });
      }
      await saveStep(4, items.length > 0 ? { items } : {}, items.length === 0);
    }
    setSaving(false);
  };

  const handleSaveInvestments = async () => {
    setSaving(true);
    if (hasNoInvestments) {
      await saveStep(5, {}, true);
    } else {
      const items = [];
      if (investName && parseFloat(investAmount) > 0) {
        items.push({ name: investName, amount: investAmount, investmentType: investType, category: INVESTMENT_TYPES.find(t => t.id === investType)?.category || "Mutual Fund", frequency: investFrequency });
      }
      await saveStep(5, items.length > 0 ? { items } : {}, items.length === 0);
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/onboarding/complete`, {}, { withCredentials: true });
    } catch {}
    setSaving(false);
    setScreen("complete");
    setTimeout(() => {
      if (onComplete) onComplete();
      else navigate("/home");
    }, 3000);
  };

  const handleDismiss = async () => {
    try { await axios.post(`${API}/api/onboarding/dismiss`, {}, { withCredentials: true }); } catch {}
    if (onDismiss) onDismiss();
  };

  const goNext = (nextScreen) => setScreen(nextScreen);
  const goBack = () => {
    const idx = WIZARD_STEPS.indexOf(screen);
    if (idx > 0) setScreen(WIZARD_STEPS[idx - 1]);
    else setScreen("grid");
  };

  /* ─── Shared Header ─── */
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
        <button onClick={handleDismiss} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="wizard-dismiss-btn">
          <X className="h-4 w-4" />
        </button>
      </div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
  );

  /* ─── Deep Details Toggle ─── */
  const DeepToggle = ({ show, onToggle }) => (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-xs font-medium transition-all mx-auto"
      style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
      data-testid="deep-details-toggle"
    >
      {show ? "- Hide Details" : "+ Add Deep Details"} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${show ? "rotate-180" : ""}`} />
    </button>
  );

  /* ─── CTA Button ─── */
  const CTAButton = ({ onClick, disabled, children, secondary, className = "" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Profile Health</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Your financial profile at a glance</p>
          </div>
          <button onClick={handleDismiss} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="grid-dismiss-btn">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Overall Progress Ring */}
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
              {overallPct >= 100 ? "All done! Your profile is complete." : "Complete all categories for full insights"}
            </p>
          </div>
        </div>

        {/* Category Cards */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const isComplete = completionData?.[cat.dataKey];
            const count = getCount(cat);
            return (
              <button
                key={cat.key}
                onClick={() => navigate(cat.route)}
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
                    {isComplete ? `${count} item${count !== 1 ? "s" : ""} added` : "Not set up yet"}
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

        {/* Quick Setup CTA */}
        {overallPct < 100 && (
          <div className="mt-6 space-y-3">
            {/* Finvu (coming soon) */}
            <button
              className="w-full p-4 rounded-2xl text-left opacity-50 cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)" }}
              disabled
              data-testid="finvu-connect-btn"
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
              <Sparkles className="h-4 w-4" /> Quick Setup Wizard
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
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>Your financial profile is now active. Calculating your insights...</p>
        <span className="text-5xl font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
        <p className="text-sm font-medium mt-2" style={{ color: projectedGrade.color }}>{projectedGrade.label}</p>
        <div className="mt-8 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting to dashboard...</span>
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
            <button
              key={source.id}
              onClick={() => handleSourceSelect(source)}
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
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-income-amount">
        <WizardHeader title="How much do you earn monthly?" subtitle={`${selectedSource?.label || "Income"} — after taxes`} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-light" style={{ color: "var(--text-muted)" }}>₹</span>
            <input
              ref={amountRef}
              type="text"
              inputMode="numeric"
              value={incomeAmount ? Number(incomeAmount).toLocaleString("en-IN") : ""}
              onChange={(e) => setIncomeAmount(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="0"
              className="text-5xl font-black text-center bg-transparent outline-none w-full"
              style={{ color: "var(--text-primary)", caretColor: "#10B981" }}
              data-testid="income-amount-input"
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>per month</p>

          {incomeAmount && parseFloat(incomeAmount) > 0 && (
            <DeepToggle show={showIncomeDeep} onToggle={() => setShowIncomeDeep(!showIncomeDeep)} />
          )}

          {showIncomeDeep && (
            <div className="w-full mt-4 p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Income Name</label>
                <input value={incomeName} onChange={(e) => setIncomeName(e.target.value)}
                  className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  data-testid="income-name-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Frequency</label>
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
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Linked Account</label>
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
          onClick={async () => { await handleSaveIncome(); goNext("income-date"); }}
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
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-income-date">
        <WizardHeader title="When does it arrive?" subtitle="Select the day your income usually hits your account" />
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
          <CTAButton className="flex-1" secondary onClick={() => goNext("expenses")}>
            <SkipForward className="h-4 w-4" /> Set later
          </CTAButton>
          <CTAButton className="flex-1" onClick={() => goNext("expenses")}>
            Continue <ArrowRight className="h-4 w-4" />
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
            <div key={item.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
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
          ))}
        </div>
        {/* Floating grade pill */}
        {parseFloat(incomeAmount) > 0 && (
          <div className="flex items-center justify-center gap-2 mb-3 py-2 px-4 rounded-full mx-auto" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="grade-pill">
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Grade</span>
            <span className="text-sm font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
            {projectedGrade.savingsRate > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${projectedGrade.color}15`, color: projectedGrade.color }}>{projectedGrade.savingsRate.toFixed(0)}%</span>}
          </div>
        )}
        <div className="flex gap-3">
          <CTAButton className="flex-1" secondary onClick={async () => { await handleSaveExpenses(); goNext("assets"); }}>
            <SkipForward className="h-4 w-4" /> Skip
          </CTAButton>
          <CTAButton className="flex-1" onClick={async () => { await handleSaveExpenses(); goNext("assets"); }}>
            Continue <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Assets
     ════════════════════════════════════════════ */
  if (screen === "assets") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-assets">
        <WizardHeader title="Your Assets" subtitle="Bank balances, property, gold — anything you own" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {hasNoAssets ? (
            <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No assets to add right now</p>
              <button onClick={() => setHasNoAssets(false)} className="text-xs mt-2 underline" style={{ color: "#3B82F6" }}>Actually, I do have some</button>
            </div>
          ) : (
            <>
              {assetItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                  <div className="flex gap-2 flex-wrap">
                    {ASSET_TYPES.map(t => (
                      <button key={t.id} onClick={() => {
                        const updated = [...assetItems];
                        updated[idx] = { ...updated[idx], type: t.category, name: updated[idx].name || t.label };
                        setAssetItems(updated);
                      }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          backgroundColor: item.type === t.category ? "#3B82F615" : "transparent",
                          color: item.type === t.category ? "#3B82F6" : "var(--text-muted)",
                          border: `1px solid ${item.type === t.category ? "#3B82F6" : "var(--border-light)"}`,
                        }}
                        data-testid={`asset-type-${t.id}`}
                      >{t.label}</button>
                    ))}
                  </div>
                  <input placeholder="Name (e.g., HDFC Savings)" value={item.name}
                    onChange={(e) => { const u = [...assetItems]; u[idx] = { ...u[idx], name: e.target.value }; setAssetItems(u); }}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid={`asset-name-${idx}`}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                    <input type="text" inputMode="numeric" placeholder="Amount / Value"
                      value={item.amount}
                      onChange={(e) => { const u = [...assetItems]; u[idx] = { ...u[idx], amount: e.target.value.replace(/[^0-9]/g, "") }; setAssetItems(u); }}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid={`asset-amount-${idx}`}
                    />
                  </div>
                </div>
              ))}
              <button onClick={() => setAssetItems(p => [...p, { name: "", amount: "", type: "bank_balance" }])}
                className="w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ color: "#3B82F6", border: "1px dashed var(--border-light)" }}
                data-testid="add-asset-btn"
              >
                <Plus className="h-3.5 w-3.5" /> Add another asset
              </button>

              {showAssetDeep && (
                <div className="p-4 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                    You can add more details for each asset later from the Assets page.
                  </p>
                </div>
              )}
              <DeepToggle show={showAssetDeep} onToggle={() => setShowAssetDeep(!showAssetDeep)} />
            </>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          {!hasNoAssets && (
            <CTAButton className="flex-1" secondary onClick={() => { setHasNoAssets(true); }}>
              I don't have any
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => { await handleSaveAssets(); goNext("liabilities"); }}>
            Continue <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Liabilities
     ════════════════════════════════════════════ */
  if (screen === "liabilities") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-liabilities">
        <WizardHeader title="Any Loans or Debt?" subtitle="Home loan, car loan, credit card — any outstanding debt" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {hasNoLiabilities ? (
            <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: "#10B98115" }}>
                <Check className="h-7 w-7" style={{ color: "#10B981" }} />
              </div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Debt free!</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>That's a great position to be in</p>
              <button onClick={() => setHasNoLiabilities(false)} className="text-xs mt-3 underline" style={{ color: "#F59E0B" }}>Actually, I do have some</button>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <input placeholder="Loan name (e.g., Home Loan)" value={loanName}
                  onChange={(e) => setLoanName(e.target.value)}
                  className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  data-testid="loan-name-input"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" inputMode="numeric" placeholder="Outstanding amount"
                    value={loanAmount} onChange={(e) => setLoanAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid="loan-amount-input"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" inputMode="numeric" placeholder="Monthly EMI (optional)"
                    value={loanEmi} onChange={(e) => setLoanEmi(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid="loan-emi-input"
                  />
                </div>
              </div>

              <DeepToggle show={showLiabilityDeep} onToggle={() => setShowLiabilityDeep(!showLiabilityDeep)} />
              {showLiabilityDeep && (
                <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Loan Type</label>
                    <select value={loanType} onChange={(e) => setLoanType(e.target.value)}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid="loan-type-select"
                    >
                      <option value="Personal">Personal</option>
                      <option value="Home">Home Loan</option>
                      <option value="Car">Car Loan</option>
                      <option value="Education">Education</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Interest Rate (%)</label>
                    <input type="text" inputMode="decimal" placeholder="e.g., 8.5" value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid="loan-rate-input"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          {!hasNoLiabilities && (
            <CTAButton className="flex-1" secondary onClick={() => setHasNoLiabilities(true)}>
              No debt
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => { await handleSaveLiabilities(); goNext("investments"); }}>
            Continue <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Investments
     ════════════════════════════════════════════ */
  if (screen === "investments") {
    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-investments">
        <WizardHeader title="Do you invest?" subtitle="SIPs, stocks, FDs, PPF — any active investments" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {hasNoInvestments ? (
            <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>No investments yet — that's okay!</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>We'll help you get started with insights</p>
              <button onClick={() => setHasNoInvestments(false)} className="text-xs mt-3 underline" style={{ color: "#8B5CF6" }}>I do have some</button>
            </div>
          ) : (
            <>
              <div className="flex gap-2 flex-wrap mb-2">
                {INVESTMENT_TYPES.map(t => (
                  <button key={t.id} onClick={() => { setInvestType(t.id); if (!investName) setInvestName(t.label); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      backgroundColor: investType === t.id ? "#8B5CF615" : "transparent",
                      color: investType === t.id ? "#8B5CF6" : "var(--text-muted)",
                      border: `1px solid ${investType === t.id ? "#8B5CF6" : "var(--border-light)"}`,
                    }}
                    data-testid={`invest-type-${t.id}`}
                  >{t.label}</button>
                ))}
              </div>
              <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <input placeholder="Investment name (e.g., HDFC Flexi Cap)" value={investName}
                  onChange={(e) => setInvestName(e.target.value)}
                  className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  data-testid="invest-name-input"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>₹</span>
                  <input type="text" inputMode="numeric" placeholder="Monthly amount / Current value"
                    value={investAmount} onChange={(e) => setInvestAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
                    style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                    data-testid="invest-amount-input"
                  />
                </div>
              </div>

              <DeepToggle show={showInvestDeep} onToggle={() => setShowInvestDeep(!showInvestDeep)} />
              {showInvestDeep && (
                <div className="p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Frequency</label>
                    <select value={investFrequency} onChange={(e) => setInvestFrequency(e.target.value)}
                      className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                      data-testid="invest-frequency-select"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="One-time">One-time</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          {!hasNoInvestments && (
            <CTAButton className="flex-1" secondary onClick={() => setHasNoInvestments(true)}>
              Not yet
            </CTAButton>
          )}
          <CTAButton className="flex-1" onClick={async () => { await handleSaveInvestments(); goNext("review"); }}>
            Review <ArrowRight className="h-4 w-4" />
          </CTAButton>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     SCREEN: Review
     ════════════════════════════════════════════ */
  if (screen === "review") {
    const income = parseFloat(incomeAmount) || 0;
    const expenseItems = Object.entries(expenseData).filter(([, v]) => parseFloat(v) > 0);
    const validAssets = assetItems.filter(a => a.name && parseFloat(a.amount) > 0);
    const totalAssetValue = validAssets.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const hasLoan = loanName && parseFloat(loanAmount) > 0;
    const hasInvest = investName && parseFloat(investAmount) > 0;

    const sections = [
      { show: income > 0, color: "#10B981", icon: Wallet, label: "Income", value: `₹${income.toLocaleString("en-IN")}/mo`, detail: `${incomeName || "Monthly"} · ${selectedSource?.label || "Salary"}` },
      { show: expenseItems.length > 0, color: "#EF4444", icon: Receipt, label: "Expenses", value: `₹${totalExpenses.toLocaleString("en-IN")}/mo`, detail: `${expenseItems.length} items` },
      { show: !hasNoAssets && validAssets.length > 0, color: "#3B82F6", icon: Building2, label: "Assets", value: `₹${totalAssetValue.toLocaleString("en-IN")}`, detail: `${validAssets.length} item${validAssets.length > 1 ? "s" : ""}` },
      { show: hasNoAssets, color: "#3B82F6", icon: Building2, label: "Assets", value: "None", detail: "No assets added" },
      { show: !hasNoLiabilities && hasLoan, color: "#F59E0B", icon: CreditCard, label: "Liabilities", value: `₹${parseFloat(loanAmount).toLocaleString("en-IN")}`, detail: loanName },
      { show: hasNoLiabilities, color: "#F59E0B", icon: CreditCard, label: "Liabilities", value: "Debt free", detail: "No outstanding debt" },
      { show: !hasNoInvestments && hasInvest, color: "#8B5CF6", icon: TrendingUp, label: "Investments", value: `₹${parseFloat(investAmount).toLocaleString("en-IN")}`, detail: investName },
      { show: hasNoInvestments, color: "#8B5CF6", icon: TrendingUp, label: "Investments", value: "None yet", detail: "No investments added" },
    ].filter(s => s.show);

    return (
      <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wizard-review">
        <WizardHeader title="Your Financial Profile" subtitle="Review what we've captured" />
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {/* Grade Card */}
          <div className="p-5 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${projectedGrade.color}15 0%, ${projectedGrade.color}05 100%)`, border: `1px solid ${projectedGrade.color}30` }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Projected Wealth Grade</p>
            <span className="text-5xl font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
            <p className="text-sm font-medium mt-2" style={{ color: projectedGrade.color }}>{projectedGrade.label}</p>
          </div>

          {/* Summary Cards */}
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

          {/* Surplus */}
          {income > 0 && (
            <div className="p-4 rounded-2xl flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Monthly Surplus</span>
              <span className="text-base font-black" style={{ color: income - totalExpenses >= 0 ? "#10B981" : "#EF4444" }}>
                {income - totalExpenses >= 0 ? "+" : ""}₹{Math.abs(income - totalExpenses).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
        <CTAButton className="w-full" onClick={handleComplete} disabled={saving}>
          <Sparkles className="h-4 w-4" /> Complete Profile Setup
        </CTAButton>
      </div>
    );
  }

  return null;
}

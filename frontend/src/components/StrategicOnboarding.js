import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
import API_BASE from '../utils/apiConfig';
  Briefcase, Store, Home, ArrowRight, ArrowLeft, Check, X,
  CalendarDays, Wallet, Sparkles, ChevronDown, SkipForward,
  Loader2, Shield, Landmark, ChevronRight, Receipt,
  Zap, BookOpen, ShoppingBag, Car, Lightbulb, Dumbbell,
  PiggyBank, Utensils, Wifi
} from "lucide-react";

const API = API_BASE;

/* ─── Projected Grade Logic ─── */
const getProjectedGrade = (income, expenses) => {
  if (!income || income <= 0) return { grade: "?", color: "#94A3B8", label: "Add income to see grade", savingsRate: 0 };
  const savings = income - expenses;
  const rate = (savings / income) * 100;
  if (rate >= 40) return { grade: "A+", color: "#059669", label: "Exceptional saver", savingsRate: rate };
  if (rate >= 30) return { grade: "A", color: "#10B981", label: "Strong financial health", savingsRate: rate };
  if (rate >= 20) return { grade: "B+", color: "#3B82F6", label: "Good savings discipline", savingsRate: rate };
  if (rate >= 10) return { grade: "B", color: "#6366F1", label: "Room to grow", savingsRate: rate };
  if (rate >= 0) return { grade: "C+", color: "#F59E0B", label: "Expenses are high", savingsRate: rate };
  return { grade: "C", color: "#EF4444", label: "Spending exceeds income", savingsRate: rate };
};

/* ─── Micro-animation: Pulse Ring ─── */
const PulseRing = ({ color, active }) => (
  <div className="absolute inset-0 rounded-2xl pointer-events-none">
    {active && (
      <>
        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ borderColor: color, border: `2px solid ${color}` }} />
        <div className="absolute inset-0 rounded-2xl" style={{ border: `2px solid ${color}`, boxShadow: `0 0 20px ${color}30` }} />
      </>
    )}
  </div>
);

/* ─── Animated Number ─── */
const AnimatedGrade = ({ grade, color }) => (
  <div className="relative">
    <span className="text-7xl font-black tracking-tight" style={{ color, textShadow: `0 0 40px ${color}20` }}>
      {grade}
    </span>
  </div>
);

/* ─── Phase 1: Financial Identity ─── */
const INCOME_SOURCES = [
  { id: "job", label: "Job / Salary", icon: Briefcase, color: "#3B82F6", bg: "#EFF6FF", defaults: { type: "Salary", category: "salary", frequency: "Monthly" } },
  { id: "business", label: "Business", icon: Store, color: "#8B5CF6", bg: "#F5F3FF", defaults: { type: "Business", category: "business", frequency: "Monthly" } },
  { id: "rental", label: "Rental Income", icon: Home, color: "#F59E0B", bg: "#FFFBEB", defaults: { type: "Rental", category: "rental", frequency: "Monthly" } },
];

/* ─── Phase 3: Expense Buckets ─── */
const EXPENSE_BUCKETS = [
  {
    id: "essentials", label: "Essentials", subtitle: "Can't skip these", color: "#EF4444", bg: "#FEF2F2",
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
    id: "growth", label: "Growth", subtitle: "Investing in yourself", color: "#10B981", bg: "#ECFDF5",
    icon: BookOpen,
    items: [
      { name: "Learning / Education", category: "Education", icon: BookOpen },
      { name: "Fitness / Health", category: "Health", icon: Dumbbell },
      { name: "Savings / SIP", category: "Savings", icon: PiggyBank },
    ]
  },
  {
    id: "lifestyle", label: "Lifestyle", subtitle: "The nice-to-haves", color: "#F59E0B", bg: "#FFFBEB",
    icon: ShoppingBag,
    items: [
      { name: "Dining Out", category: "Food", icon: Utensils },
      { name: "Shopping", category: "Shopping", icon: ShoppingBag },
      { name: "Entertainment", category: "Entertainment", icon: Sparkles },
    ]
  },
];

export default function StrategicOnboarding({ onComplete, onDismiss, isModal = false }) {
  const navigate = useNavigate();
  /*
    Screens:
    0  = Welcome/Entry
    1  = Phase 1 — Select income type
    2  = Phase 2a — Income amount
    3  = Phase 2b — Income date
    4  = Phase 2c — Income account (skippable)
    5  = Phase 3 — Expense bucketing
    6  = Review + Projected Grade
    7  = System Calibrated animation
  */
  const [screen, setScreen] = useState(0);
  const [saving, setSaving] = useState(false);

  // Phase 1 data
  const [selectedSource, setSelectedSource] = useState(null);

  // Phase 2 data
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeName, setIncomeName] = useState("");
  const [incomeDate, setIncomeDate] = useState("1");
  const [incomeAccount, setIncomeAccount] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Phase 3 data
  const [expenseData, setExpenseData] = useState({});

  // Accounts for Phase 2c
  const [accounts, setAccounts] = useState([]);

  // Animations
  const [showCalibrated, setShowCalibrated] = useState(false);
  const [activeBucket, setActiveBucket] = useState(0);
  const amountInputRef = useRef(null);

  // Load accounts for dropdown
  useEffect(() => {
    axios.get(`${API}/api/accounts`, { withCredentials: true }).then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  // Focus amount input when entering Phase 2a
  useEffect(() => {
    if (screen === 2 && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 300);
    }
  }, [screen]);

  const totalExpenses = Object.values(expenseData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  const projectedGrade = getProjectedGrade(parseFloat(incomeAmount) || 0, totalExpenses);

  const totalScreens = 7;
  const progress = screen > 0 ? Math.min((screen / totalScreens) * 100, 100) : 0;

  /* ─── Handlers ─── */
  const handleSourceSelect = (source) => {
    setSelectedSource(source);
    setIncomeName(source.defaults.type === "Salary" ? "Monthly Salary" : source.defaults.type === "Business" ? "Business Income" : "Rental Income");
    setTimeout(() => setScreen(2), 400);
  };

  const saveIncomeData = async () => {
    setSaving(true);
    try {
      const sourceDefaults = selectedSource?.defaults || { type: "Salary", category: "salary", frequency: "Monthly" };
      await axios.post(`${API}/api/onboarding/save-step`, {
        step: 1,
        data: {
          items: [{
            name: incomeName || sourceDefaults.type,
            amount: incomeAmount,
            type: sourceDefaults.type,
            category: sourceDefaults.category,
            frequency: sourceDefaults.frequency,
            selectedDate: incomeDate,
            accountId: incomeAccount || undefined,
          }]
        },
        skipped: false,
      }, { withCredentials: true });
    } catch {}
    setSaving(false);
  };

  const saveExpenseData = async () => {
    setSaving(true);
    try {
      const items = [];
      EXPENSE_BUCKETS.forEach(bucket => {
        bucket.items.forEach(item => {
          const amount = expenseData[item.name];
          if (amount && parseFloat(amount) > 0) {
            items.push({ name: item.name, amount, category: item.category, frequency: "Monthly" });
          }
        });
      });
      if (items.length > 0) {
        await axios.post(`${API}/api/onboarding/save-step`, {
          step: 2, data: { items }, skipped: false,
        }, { withCredentials: true });
      } else {
        await axios.post(`${API}/api/onboarding/save-step`, {
          step: 2, data: {}, skipped: true,
        }, { withCredentials: true });
      }
    } catch {}
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Skip steps 3-5
      for (let s = 3; s <= 5; s++) {
        await axios.post(`${API}/api/onboarding/save-step`, { step: s, data: {}, skipped: true }, { withCredentials: true });
      }
      await axios.post(`${API}/api/onboarding/complete`, {}, { withCredentials: true });
    } catch {}
    setSaving(false);
    setScreen(7);
    setShowCalibrated(true);
    setTimeout(() => {
      if (onComplete) onComplete();
      else navigate("/home");
    }, 3000);
  };

  const handleDismiss = async () => {
    try { await axios.post(`${API}/api/onboarding/dismiss`, {}, { withCredentials: true }); } catch {}
    if (onDismiss) onDismiss();
  };

  /* ─── Screen 0: Welcome ─── */
  if (screen === 0) {
    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-entry">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              Financial Blueprint
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Let's calibrate your wealth engine
            </p>
          </div>
          {!isModal && (
            <button onClick={handleDismiss} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="onboarding-dismiss-btn">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4">
          {/* Finvu (coming soon) */}
          <button
            className="w-full p-5 rounded-2xl text-left opacity-50 cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #1E293B 0%, #334155 100%)" }}
            disabled
            data-testid="finvu-connect-btn"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-white/70" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">Connect Bank Account</p>
                <p className="text-white/50 text-xs mt-0.5">Auto-fetch via Account Aggregator</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 text-white/60 font-medium">Soon</span>
            </div>
            <div className="flex items-center gap-1.5 mt-3 ml-16">
              <Shield className="h-3 w-3 text-white/30" />
              <span className="text-[10px] text-white/30">RBI regulated, end-to-end encrypted</span>
            </div>
          </button>

          {/* Profile Setup */}
          <button
            onClick={() => setScreen(1)}
            className="w-full p-5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            data-testid="manual-onboarding-btn"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#10B98115" }}>
                <Sparkles className="h-6 w-6" style={{ color: "#10B981" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Profile Setup</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>3 quick steps, smart defaults</p>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </div>
          </button>
        </div>

        <p className="text-center text-[10px] mt-6" style={{ color: "var(--text-muted)" }}>
          Takes about 2 minutes
        </p>
      </div>
    );
  }

  /* ─── Screen 7: System Calibrated ─── */
  if (screen === 7) {
    return (
      <div className="h-full min-h-screen flex flex-col items-center justify-center px-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-calibrated">
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", boxShadow: "0 0 60px #10B98130" }}>
            <Check className="h-14 w-14 text-white animate-[bounceIn_0.5s_ease-out]" />
          </div>
          <div className="absolute -inset-3 rounded-full border-2 border-emerald-400/20 animate-ping" />
          <div className="absolute -inset-6 rounded-full border border-emerald-400/10 animate-ping" style={{ animationDelay: "0.3s" }} />
        </div>

        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>
          System Calibrated
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
          Your financial profile is now active. We're computing your Wealth Grade...
        </p>

        <AnimatedGrade grade={projectedGrade.grade} color={projectedGrade.color} />
        <p className="text-sm font-medium mt-3" style={{ color: projectedGrade.color }}>
          {projectedGrade.label}
        </p>

        <div className="mt-8 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  /* ─── Shared progress bar + back button ─── */
  const renderHeader = (title, subtitle) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setScreen(prev => Math.max(prev - 1, 0))}
          className="p-2.5 rounded-xl transition-all active:scale-95"
          style={{ backgroundColor: "var(--bg-card)" }}
          data-testid="onboarding-back-btn"
        >
          <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
        </button>
        <div className="flex-1">
          <div className="h-1 rounded-full" style={{ backgroundColor: "var(--border-light)" }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: "#10B981" }} />
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 rounded-xl"
          style={{ color: "var(--text-muted)" }}
          data-testid="onboarding-dismiss-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
  );

  /* ─── Floating Projected Grade Pill ─── */
  const renderGradePill = () => {
    const income = parseFloat(incomeAmount) || 0;
    if (income <= 0) return null;
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="projected-grade-pill">
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Projected Grade</span>
        <span className="text-sm font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
        {projectedGrade.savingsRate > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${projectedGrade.color}15`, color: projectedGrade.color }}>
            {projectedGrade.savingsRate.toFixed(0)}% savings
          </span>
        )}
      </div>
    );
  };

  /* ─── Screen 1: Phase 1 — Financial Identity ─── */
  if (screen === 1) {
    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-phase1">
        {renderHeader("What's your primary income?", "Select your main source of earnings")}

        <div className="flex-1 flex flex-col justify-center gap-4">
          {INCOME_SOURCES.map((source) => (
            <button
              key={source.id}
              onClick={() => handleSourceSelect(source)}
              className="relative w-full p-5 rounded-2xl text-left transition-all active:scale-[0.97]"
              style={{
                backgroundColor: selectedSource?.id === source.id ? source.bg : "var(--bg-card)",
                border: `2px solid ${selectedSource?.id === source.id ? source.color : "var(--border-light)"}`,
              }}
              data-testid={`source-${source.id}`}
            >
              <PulseRing color={source.color} active={selectedSource?.id === source.id} />
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${source.color}15` }}>
                  <source.icon className="h-7 w-7" style={{ color: source.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{source.label}</p>
                </div>
                {selectedSource?.id === source.id && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: source.color }}>
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

  /* ─── Screen 2: Phase 2a — Income Amount ─── */
  if (screen === 2) {
    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-phase2a">
        {renderHeader("How much do you earn monthly?", `${selectedSource?.label || "Income"} — after taxes`)}

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-3xl font-light" style={{ color: "var(--text-muted)" }}>₹</span>
            <input
              ref={amountInputRef}
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

          {/* Quick Details Toggle */}
          {incomeAmount && parseFloat(incomeAmount) > 0 && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 mt-6 px-4 py-2 rounded-full text-xs font-medium transition-all"
              style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
              data-testid="quick-details-toggle"
            >
              Quick Details <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
          )}

          {showAdvanced && (
            <div className="w-full mt-4 p-4 rounded-2xl space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-muted)" }}>Income Name</label>
                <input
                  value={incomeName}
                  onChange={(e) => setIncomeName(e.target.value)}
                  className="w-full bg-transparent rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
                  data-testid="income-name-input"
                />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={async () => { await saveIncomeData(); setScreen(3); }}
          disabled={!incomeAmount || parseFloat(incomeAmount) <= 0 || saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
          data-testid="income-next-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
    );
  }

  /* ─── Screen 3: Phase 2b — Income Date ─── */
  if (screen === 3) {
    const days = Array.from({ length: 28 }, (_, i) => i + 1);
    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-phase2b">
        {renderHeader("When does it hit your account?", "Select the day your income usually arrives")}

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setIncomeDate(String(day))}
                className="aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-90"
                style={{
                  backgroundColor: incomeDate === String(day) ? "#10B981" : "var(--bg-card)",
                  color: incomeDate === String(day) ? "white" : "var(--text-primary)",
                  border: `1px solid ${incomeDate === String(day) ? "#10B981" : "var(--border-light)"}`,
                }}
                data-testid={`day-${day}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setScreen(5)}
            className="flex-1 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
            data-testid="skip-date-btn"
          >
            <SkipForward className="h-4 w-4" /> Set later
          </button>
          <button
            onClick={() => setScreen(5)}
            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
            data-testid="date-next-btn"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ─── Screen 5: Phase 3 — Expense Bucketing ─── */
  if (screen === 5) {
    const bucket = EXPENSE_BUCKETS[activeBucket];

    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-phase3">
        {renderHeader("Monthly Expenses", "Enter approximate amounts — you can refine later")}

        {/* Bucket Tabs */}
        <div className="flex gap-2 mb-5">
          {EXPENSE_BUCKETS.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setActiveBucket(idx)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-center transition-all"
              style={{
                backgroundColor: activeBucket === idx ? b.color : "var(--bg-card)",
                color: activeBucket === idx ? "white" : "var(--text-muted)",
                border: `1px solid ${activeBucket === idx ? b.color : "var(--border-light)"}`,
              }}
              data-testid={`bucket-tab-${b.id}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Bucket Items */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          <p className="text-xs font-medium mb-1" style={{ color: bucket.color }}>{bucket.subtitle}</p>
          {bucket.items.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${bucket.color}12` }}>
                <item.icon className="h-4 w-4" style={{ color: bucket.color }} />
              </div>
              <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{item.name}</span>
              <div className="flex items-center gap-1 w-28">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expenseData[item.name] || ""}
                  onChange={(e) => setExpenseData(prev => ({ ...prev, [item.name]: e.target.value.replace(/[^0-9]/g, "") }))}
                  placeholder="0"
                  className="w-full bg-transparent text-sm font-bold text-right outline-none"
                  style={{ color: "var(--text-primary)" }}
                  data-testid={`expense-${item.name.replace(/\s/g, '-').toLowerCase()}`}
                />
              </div>
            </div>
          ))}
        </div>

        {renderGradePill()}

        <div className="flex gap-3 mt-4 relative z-50">
          <button
            onClick={async () => { await saveExpenseData(); setScreen(6); }}
            disabled={saving}
            className="flex-1 py-3.5 rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
            data-testid="skip-expenses-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><SkipForward className="h-4 w-4" /> Set later</>}
          </button>
          <button
            onClick={async () => { await saveExpenseData(); setScreen(6); }}
            disabled={saving}
            className="flex-1 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
            data-testid="expenses-next-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Review <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>
      </div>
    );
  }

  /* ─── Screen 6: Review + Projected Grade ─── */
  if (screen === 6) {
    const income = parseFloat(incomeAmount) || 0;
    const expenseItems = Object.entries(expenseData).filter(([, v]) => parseFloat(v) > 0);

    return (
      <div className="h-full min-h-screen flex flex-col px-6 pt-14 pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="onboarding-review">
        {renderHeader("Your Financial Blueprint", "Here's what we've captured")}

        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Projected Grade Card */}
          <div className="p-5 rounded-2xl text-center" style={{ background: `linear-gradient(135deg, ${projectedGrade.color}15 0%, ${projectedGrade.color}05 100%)`, border: `1px solid ${projectedGrade.color}30` }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Projected Wealth Grade</p>
            <span className="text-5xl font-black" style={{ color: projectedGrade.color }}>{projectedGrade.grade}</span>
            <p className="text-sm font-medium mt-2" style={{ color: projectedGrade.color }}>{projectedGrade.label}</p>
            {projectedGrade.savingsRate > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Savings rate: {projectedGrade.savingsRate.toFixed(0)}%
              </p>
            )}
          </div>

          {/* Income Summary */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#10B98110" }}>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4" style={{ color: "#10B981" }} />
                <span className="text-sm font-bold" style={{ color: "#10B981" }}>Income</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#10B981" }}>
                ₹{income.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="px-4 py-2.5 text-xs flex justify-between" style={{ borderTop: "1px solid var(--border-light)" }}>
              <span style={{ color: "var(--text-primary)" }}>{incomeName || "Monthly Income"}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {selectedSource?.label || "Salary"} · Day {incomeDate}
              </span>
            </div>
          </div>

          {/* Expenses Summary */}
          {expenseItems.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: "#EF444410" }}>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" style={{ color: "#EF4444" }} />
                  <span className="text-sm font-bold" style={{ color: "#EF4444" }}>Expenses</span>
                </div>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>
                  ₹{totalExpenses.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border-light)" }}>
                {expenseItems.map(([name, amount]) => (
                  <div key={name} className="flex justify-between px-4 py-2 text-xs">
                    <span style={{ color: "var(--text-primary)" }}>{name}</span>
                    <span style={{ color: "var(--text-muted)" }}>₹{parseFloat(amount).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Surplus/Deficit */}
          {income > 0 && (
            <div className="p-4 rounded-2xl flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Monthly Surplus</span>
              <span className="text-base font-black" style={{ color: income - totalExpenses >= 0 ? "#10B981" : "#EF4444" }}>
                {income - totalExpenses >= 0 ? "+" : ""}₹{Math.abs(income - totalExpenses).toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleComplete}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}
          data-testid="confirm-onboarding-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Calibrate My Finances</>}
        </button>
      </div>
    );
  }

  return null;
}

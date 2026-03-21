import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Check, Loader2, Shield, Landmark, ChevronRight,
  Wallet, Receipt, TrendingUp, CreditCard, Building2
} from "lucide-react";
import BottomNav from "./BottomNav";
import AddActionSheet from "./AddActionSheet";

const API = process.env.REACT_APP_BACKEND_URL;

/* ─── Category Config ─── */
const CATEGORIES = [
  { key: "income", label: "Income", icon: Wallet, color: "#10B981", bg: "#10B98112", dataKey: "incomeAdded", countKey: "income", route: "/add-income" },
  { key: "expenses", label: "Expenses", icon: Receipt, color: "#EF4444", bg: "#EF444412", dataKey: "expensesAdded", countKey: "expenses", route: "/add-expense" },
  { key: "assets", label: "Assets", icon: Building2, color: "#3B82F6", bg: "#3B82F612", dataKey: "assetsAdded", countKeys: ["accounts", "assets"], route: "/add-asset" },
  { key: "liabilities", label: "Liabilities", icon: CreditCard, color: "#F59E0B", bg: "#F59E0B12", dataKey: "liabilitiesAdded", countKeys: ["loans", "creditCards"], route: "/add-loan" },
  { key: "investments", label: "Investments", icon: TrendingUp, color: "#8B5CF6", bg: "#8B5CF612", dataKey: "investmentsAdded", countKey: "investments", route: "/add-investment" },
];

export default function ProfileSetup({ onComplete, onDismiss }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isStandalonePage = location.pathname === "/onboarding";

  const [completionData, setCompletionData] = useState(null);
  const [loadingGrid, setLoadingGrid] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const fetchCompletionData = useCallback(async () => {
    try {
      const compRes = await axios.get(`${API}/api/onboarding/profile-completion`, { withCredentials: true });
      setCompletionData(compRes.data);
    } catch {}
    setLoadingGrid(false);
  }, []);

  useEffect(() => { fetchCompletionData(); }, [fetchCompletionData]);

  const getCount = (cat) => {
    if (!completionData?.counts) return 0;
    if (cat.countKeys) return cat.countKeys.reduce((s, k) => s + (completionData.counts[k] || 0), 0);
    return completionData.counts[cat.countKey] || 0;
  };

  const completedCount = completionData ? CATEGORIES.filter(c => completionData[c.dataKey]).length : 0;
  const overallPct = completionData?.profileCompletion || 0;

  if (loadingGrid) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-screen flex flex-col px-5 pt-14 pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="profile-health-grid">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => {
          if (onDismiss && !isStandalonePage) onDismiss();
          else if (window.history.length > 2) navigate(-1);
          else navigate("/home");
        }} className="p-2 rounded-xl" style={{ color: "var(--text-muted)" }} data-testid="grid-back-btn">
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
          <button className="w-full p-4 rounded-2xl text-left opacity-75 cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%)" }}
            disabled data-testid="finvu-connect-btn"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Landmark className="h-5 w-5 text-sky-300" />
              </div>
              <div className="flex-1">
                <p className="text-white/90 font-bold text-xs">Auto-fetch via Account Aggregator</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="h-3 w-3 text-sky-300/60" />
                  <span className="text-[10px] text-white/50">RBI regulated</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full bg-sky-400/20 text-sky-200 font-medium">Soon</span>
            </div>
          </button>
        </div>
      )}
      {isStandalonePage ? (
        <>
          <BottomNav onAddClick={() => setShowAddSheet(true)} />
          <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
        </>
      ) : onDismiss ? (
        <div onClickCapture={() => onDismiss()}>
          <BottomNav onAddClick={() => setShowAddSheet(true)} />
          <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
        </div>
      ) : null}
    </div>
  );
}

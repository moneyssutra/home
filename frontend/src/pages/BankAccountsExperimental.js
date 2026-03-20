import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Send,
  ArrowLeftRight,
  Plus,
  ChevronRight,
  Building2,
  Clock,
  TrendingUp,
  TrendingDown,
  Repeat,
  BarChart3,
  Banknote,
  Loader2,
  Wallet,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  Wifi,
} from "lucide-react";

import BottomNav from "@/components/BottomNav";

const API = process.env.REACT_APP_BACKEND_URL;

const fmt = (n) => {
  const abs = Math.abs(n);
  if (abs >= 100000) return (n / 100000).toFixed(1) + "L";
  if (abs >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
};

const fmtFull = (n) => Math.abs(n).toLocaleString("en-IN");

const formatOrdinal = (day) => {
  if (!day) return "";
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  return day + (s[(v - 20) % 10] || s[v] || s[0]);
};

// ---------- SYNC NOTIFICATION ----------
const SyncNotification = ({ message, visible }) => (
  <div
    className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
    style={{ transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease", transform: visible ? "translateY(0)" : "translateY(-100%)", opacity: visible ? 1 : 0 }}
  >
    <div className="mt-3 mx-4 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-lg max-w-sm w-full" style={{ background: "linear-gradient(135deg, #065F46, #047857)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <CheckCircle2 size={18} className="text-emerald-300 flex-shrink-0" />
      <p className="text-sm font-semibold text-white flex-1">{message}</p>
    </div>
  </div>
);

// ---------- ACCOUNT CARD (Real Bank Card Design) ----------
const AccountCard = ({ account, isActive, onRefresh, refreshingId }) => {
  const isRefreshing = refreshingId === account.id;
  return (
    <div
      data-testid={`bank-card-${account.id}`}
      className="flex-shrink-0 w-[300px] snap-center rounded-2xl transition-all duration-300 text-left relative overflow-hidden"
      style={{
        background: `linear-gradient(145deg, ${account.gradient[0]}, ${account.gradient[1]})`,
        transform: isActive ? "scale(1)" : "scale(0.93)",
        opacity: isActive ? 1 : 0.7,
        boxShadow: isActive
          ? `0 20px 40px -12px ${account.color}50, 0 8px 16px -4px rgba(0,0,0,0.15)`
          : "0 4px 12px rgba(0,0,0,0.08)",
        aspectRatio: "1.7/1",
      }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%)" }} />
      <div className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
      <div className="absolute top-4 right-4 w-20 h-20 rounded-full" style={{ background: "rgba(255,255,255,0.03)" }} />

      <div className="relative z-10 h-full flex flex-col justify-between p-5">
        {/* Top: Bank name + Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-black tracking-wider" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", backdropFilter: "blur(4px)" }}>
              {account.logo}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white leading-tight">{account.bank}</p>
              <p className="text-[10px] text-white/50 font-medium">{account.type}</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRefresh(account); }}
            data-testid={`card-refresh-${account.id}`}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <RefreshCw size={14} className={`text-white/70 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Middle: Chip + Contactless + Account Number */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-7 rounded-md" style={{ background: "linear-gradient(135deg, #D4A026, #C49B1D, #E8C84A)", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)" }}>
            <div className="w-full h-full grid grid-cols-3 gap-px p-[3px] rounded-md overflow-hidden">
              {[...Array(6)].map((_, i) => <div key={i} className="rounded-[1px]" style={{ background: "rgba(180,140,20,0.5)" }} />)}
            </div>
          </div>
          <Wifi size={16} className="text-white/30 rotate-90" />
          {account.accountNumber && (
            <p className="text-xs font-mono text-white/40 tracking-[3px]">{account.accountNumber}</p>
          )}
        </div>

        {/* Bottom: Balance + Last Updated */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-0.5">Balance</p>
            <p className="text-xl font-black text-white tracking-tight">₹{fmtFull(account.balance)}</p>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={10} className="text-white/30" />
            <p className="text-[9px] text-white/35 font-medium">{account.lastUpdated}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- EMPTY STATE ----------
const EmptyState = ({ icon: Icon, title, subtitle, action, onAction }) => (
  <div className="px-5 flex flex-col items-center justify-center py-16 animate-fadeIn">
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
      <Icon size={32} style={{ color: "var(--text-muted)" }} />
    </div>
    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
    <p className="text-sm mt-2 text-center max-w-[260px]" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
    {action && <button onClick={onAction} className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold active:scale-95 transition-transform" style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}>{action}</button>}
  </div>
);

// ---------- ACCOUNTS TAB ----------
const AccountsTab = ({ accounts, refreshing, onRefreshAll, onRefreshOne, refreshingId, navigate }) => {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / 316);
    setActiveIdx(Math.min(idx, accounts.length - 1));
  }, [accounts.length]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No bank accounts yet"
        subtitle="Add your bank accounts to track balances and transactions in one place."
        action="Add Account"
        onAction={() => navigate("/account")}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="px-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Total Balance</p>
          <p className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--text-primary)" }}>₹{fmtFull(totalBalance)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>across {accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={onRefreshAll} data-testid="refresh-accounts-btn" className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <RefreshCw size={18} style={{ color: "var(--brand-primary)" }} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }} data-testid="accounts-card-scroll">
        {accounts.map((acc, i) => (
          <AccountCard key={acc.id} account={acc} isActive={i === activeIdx} onRefresh={onRefreshOne} refreshingId={refreshingId} />
        ))}
      </div>

      {accounts.length > 1 && (
        <div className="flex items-center justify-center gap-2" data-testid="card-dots">
          {accounts.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300" style={{ width: i === activeIdx ? 20 : 6, height: 6, backgroundColor: i === activeIdx ? "var(--brand-primary)" : "var(--border-light)" }} />
          ))}
        </div>
      )}

      <div className="px-5">
        <div className="rounded-2xl p-4 flex items-center justify-around" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="quick-actions">
          {[
            { icon: Send, label: "Send Money", color: "#3B82F6" },
            { icon: ArrowLeftRight, label: "Self Transfer", color: "#8B5CF6" },
            { icon: Plus, label: "Add Account", color: "#10B981", route: "/account" },
          ].map((action) => (
            <button key={action.label} onClick={() => action.route && navigate(action.route)} className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-active:scale-90" style={{ backgroundColor: `${action.color}10` }}>
                <action.icon size={20} style={{ color: action.color }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>All Accounts</p>
        {accounts.map((acc) => (
          <div key={acc.id} className="rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`account-row-${acc.id}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-black tracking-wider text-white" style={{ background: `linear-gradient(135deg, ${acc.gradient[0]}, ${acc.gradient[1]})` }}>{acc.logo}</div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{acc.bank}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{acc.type} {acc.accountNumber && `· ${acc.accountNumber}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{fmtFull(acc.balance)}</p>
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{acc.lastUpdated}</p>
              </div>
              <button
                onClick={() => onRefreshOne(acc)}
                data-testid={`row-refresh-${acc.id}`}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
              >
                <RefreshCw size={13} className={refreshingId === acc.id ? "animate-spin" : ""} style={{ color: "var(--brand-primary)" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- TRANSACTIONS TAB ----------
const TransactionsTab = ({ transactions }) => {
  if (transactions.length === 0) {
    return <EmptyState icon={ArrowLeftRight} title="No transactions yet" subtitle="Transactions will appear here as you record income and expenses." />;
  }
  let lastDate = "";
  return (
    <div className="px-5 space-y-3 animate-fadeIn" data-testid="transactions-tab">
      {transactions.map((tx) => {
        const showDate = tx.date !== lastDate;
        lastDate = tx.date;
        return (
          <div key={tx.id}>
            {showDate && (
              <p className="text-[10px] font-bold uppercase tracking-widest mt-3 mb-2" style={{ color: "var(--text-muted)" }}>{tx.date}</p>
            )}
            <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`tx-${tx.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: tx.type === "credit" ? "#10B98115" : "#EF444415" }}>
                  {tx.type === "credit" ? <TrendingUp size={18} style={{ color: "#10B981" }} /> : <TrendingDown size={18} style={{ color: "#EF4444" }} />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{tx.desc}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{tx.category}{tx.notes ? ` · ${tx.notes}` : ""}</p>
                </div>
              </div>
              <p className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: tx.type === "credit" ? "#10B981" : "#EF4444" }}>
                {tx.type === "credit" ? "+" : "-"}₹{fmtFull(Math.abs(tx.amount))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- RECURRING TAB ----------
const RecurringTab = ({ recurring }) => {
  if (recurring.length === 0) {
    return <EmptyState icon={Repeat} title="No recurring payments" subtitle="Recurring expenses like EMIs, SIPs, and subscriptions will appear here." action="Coming Soon" />;
  }
  return (
    <div className="px-5 space-y-3 animate-fadeIn" data-testid="recurring-tab">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        {recurring.length} Recurring Payment{recurring.length !== 1 ? "s" : ""}
      </p>
      {recurring.map((r) => (
        <div key={r.id} className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`recurring-${r.id}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#8B5CF615" }}>
              <Repeat size={18} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.name}</p>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {r.category} · {r.frequency}{r.dueDay ? ` · Due: ${formatOrdinal(r.dueDay)}` : ""}
              </p>
            </div>
          </div>
          <p className="text-sm font-bold flex-shrink-0 ml-2" style={{ color: "var(--text-primary)" }}>₹{fmtFull(r.amount)}</p>
        </div>
      ))}
    </div>
  );
};

// ---------- CASHFLOW TAB ----------
const CashflowTab = ({ cashflow }) => {
  const income = cashflow.income || 0;
  const expenses = cashflow.expenses || 0;
  const net = income - expenses;
  const pct = income > 0 ? Math.round((expenses / income) * 100) : 0;
  const savingsRate = Math.max(0, 100 - pct);

  return (
    <div className="px-5 space-y-4 animate-fadeIn" data-testid="cashflow-tab">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{cashflow.month || "This Month"}</p>
        {cashflow.incomeSource === "expected" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>Estimated</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ backgroundColor: "#10B98110", border: "1px solid #10B98125" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: "#10B981" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#10B981" }}>Income</p>
          </div>
          <p className="text-xl font-black" style={{ color: "#10B981" }}>₹{fmt(income)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: "#EF444410", border: "1px solid #EF444425" }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} style={{ color: "#EF4444" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#EF4444" }}>Expenses</p>
          </div>
          <p className="text-xl font-black" style={{ color: "#EF4444" }}>₹{fmt(expenses)}</p>
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Net Cashflow</p>
          <p className="text-lg font-black" style={{ color: net >= 0 ? "#10B981" : "#EF4444" }}>
            {net >= 0 ? "+" : "-"}₹{fmtFull(Math.abs(net))}
          </p>
        </div>
        {income > 0 && (
          <>
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: pct > 80 ? "linear-gradient(90deg, #EF4444, #DC2626)" : "linear-gradient(90deg, #10B981, #059669)" }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>{pct}% spent</p>
              <p className="text-[10px] font-bold" style={{ color: "#10B981" }}>{savingsRate}% saved</p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <BarChart3 size={20} style={{ color: "var(--brand-primary)" }} />
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Detailed Breakdown</p>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Category-wise analysis coming soon</p>
        </div>
        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
      </div>
    </div>
  );
};

// ---------- MAIN PAGE ----------
const TABS = ["Accounts", "Transactions", "Recurring", "Cashflow"];

const BankAccountsExperimental = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingId, setRefreshingId] = useState(null);
  const [syncNotif, setSyncNotif] = useState({ visible: false, message: "" });
  const [data, setData] = useState({ accounts: [], transactions: [], recurring: [], cashflow: {} });
  const tabBarRef = useRef(null);
  const notifTimer = useRef(null);

  const showSyncNotif = useCallback((msg) => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setSyncNotif({ visible: true, message: msg });
    notifTimer.current = setTimeout(() => setSyncNotif((p) => ({ ...p, visible: false })), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/bank-overview`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) {
      console.error("Bank overview fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefreshAll = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => {
      setTimeout(() => {
        setRefreshing(false);
        showSyncNotif("All accounts refreshed · Data Synced");
      }, 800);
    });
  }, [fetchData, showSyncNotif]);

  const handleRefreshOne = useCallback((account) => {
    setRefreshingId(account.id);
    // Simulate per-account refresh (future: Finvu per-account fetch)
    fetchData().finally(() => {
      setTimeout(() => {
        setRefreshingId(null);
        const label = account.bank + (account.accountNumber ? ` ${account.accountNumber}` : "");
        showSyncNotif(`${label} refreshed · Data Synced`);
      }, 1200);
    });
  }, [fetchData, showSyncNotif]);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const tab = el.children[activeTab];
    if (tab) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="bank-accounts-experimental">
      {/* Sync Notification */}
      <SyncNotification message={syncNotif.message} visible={syncNotif.visible} />
      {/* Header */}
      <div className="sticky top-0 z-30 px-5 pt-3 pb-2" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/home"); }} className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: "var(--bg-subtle)" }} data-testid="bank-accounts-back-btn">
            <ArrowLeft size={18} style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: "var(--brand-primary)" }} />
            <h1 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Bank Accounts</h1>
          </div>
          <div className="w-9" />
        </div>

        <div ref={tabBarRef} className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1" style={{ scrollbarWidth: "none" }} data-testid="bank-tab-bar">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} data-testid={`tab-${tab.toLowerCase()}`} className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all" style={{ backgroundColor: activeTab === i ? "var(--brand-primary)" : "transparent", color: activeTab === i ? "#fff" : "var(--text-muted)" }}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pt-5 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand-primary)" }} />
          </div>
        ) : (
          <>
            {activeTab === 0 && <AccountsTab accounts={data.accounts} refreshing={refreshing} onRefreshAll={handleRefreshAll} onRefreshOne={handleRefreshOne} refreshingId={refreshingId} navigate={navigate} />}
            {activeTab === 1 && <TransactionsTab transactions={data.transactions} />}
            {activeTab === 2 && <RecurringTab recurring={data.recurring} />}
            {activeTab === 3 && <CashflowTab cashflow={data.cashflow} />}
          </>
        )}
      </div>

      {/* Finvu Banner */}
      <div className="px-5 pb-6">
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1E293B, #0F172A)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="finvu-banner">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={16} style={{ color: "#38BDF8" }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#38BDF8" }}>Coming Soon</p>
            </div>
            <p className="text-sm font-bold text-white mb-1">Link Real Bank Accounts</p>
            <p className="text-xs text-white/50 leading-relaxed">Connect via Finvu Account Aggregator for real-time balances, auto-categorized transactions, and cashflow insights.</p>
          </div>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: "rgba(56,189,248,0.06)" }} />
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-center { scroll-snap-align: center; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out; }
      `}</style>

      <BottomNav />
    </div>
  );
};

export default BankAccountsExperimental;

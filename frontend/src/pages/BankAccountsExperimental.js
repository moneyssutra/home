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
} from "lucide-react";

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

// ---------- ACCOUNT CARD ----------
const AccountCard = ({ account, isActive }) => (
  <div
    data-testid={`bank-card-${account.id}`}
    className="flex-shrink-0 w-[280px] snap-center rounded-2xl p-5 transition-all duration-300 text-left relative overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${account.gradient[0]}, ${account.gradient[1]})`,
      transform: isActive ? "scale(1)" : "scale(0.93)",
      opacity: isActive ? 1 : 0.7,
      boxShadow: isActive
        ? `0 20px 40px -12px ${account.color}40, 0 8px 16px -4px rgba(0,0,0,0.12)`
        : "0 4px 12px rgba(0,0,0,0.08)",
    }}
  >
    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />

    <div className="relative z-10">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black tracking-wider" style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>
          {account.logo}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{account.bank}</p>
          <p className="text-[11px] text-white/60">{account.type} {account.accountNumber}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-1">Available Balance</p>
        <p className="text-2xl font-black text-white tracking-tight">₹{fmtFull(account.balance)}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock size={11} className="text-white/40" />
          <p className="text-[10px] text-white/50">Updated {account.lastUpdated}</p>
        </div>
      </div>
    </div>
  </div>
);

// ---------- EMPTY STATE ----------
const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="px-5 flex flex-col items-center justify-center py-16 animate-fadeIn">
    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
      <Icon size={32} style={{ color: "var(--text-muted)" }} />
    </div>
    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
    <p className="text-sm mt-2 text-center max-w-[260px]" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
    {action && <div className="mt-5 px-5 py-2.5 rounded-full text-sm font-bold" style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}>{action}</div>}
  </div>
);

// ---------- ACCOUNTS TAB ----------
const AccountsTab = ({ accounts, refreshing, onRefresh, navigate }) => {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / 296);
    setActiveIdx(Math.min(idx, accounts.length - 1));
  }, [accounts.length]);

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No bank accounts yet"
        subtitle="Add your bank accounts to track balances and transactions in one place."
        action="Add Account"
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
        <button onClick={onRefresh} data-testid="refresh-accounts-btn" className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <RefreshCw size={18} style={{ color: "var(--brand-primary)" }} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }} data-testid="accounts-card-scroll">
        {accounts.map((acc, i) => (
          <AccountCard key={acc.id} account={acc} isActive={i === activeIdx} />
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
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{fmtFull(acc.balance)}</p>
              <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
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
  const [data, setData] = useState({ accounts: [], transactions: [], recurring: [], cashflow: {} });
  const tabBarRef = useRef(null);

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

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setTimeout(() => setRefreshing(false), 800));
  }, [fetchData]);

  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const tab = el.children[activeTab];
    if (tab) tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="bank-accounts-experimental">
      {/* Header */}
      <div className="sticky top-0 z-30 px-5 pt-3 pb-2" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-transform" style={{ backgroundColor: "var(--bg-subtle)" }} data-testid="bank-accounts-back-btn">
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
            {activeTab === 0 && <AccountsTab accounts={data.accounts} refreshing={refreshing} onRefresh={handleRefresh} navigate={navigate} />}
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
    </div>
  );
};

export default BankAccountsExperimental;

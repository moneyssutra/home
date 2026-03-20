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
  CalendarDays,
  Repeat,
  BarChart3,
  Banknote,
} from "lucide-react";

// ---------- MOCK DATA ----------
const MOCK_ACCOUNTS = [
  {
    id: "acc1",
    bank: "ICICI Bank",
    type: "Savings",
    accountNumber: "****4521",
    balance: 125000,
    lastUpdated: "2 min ago",
    color: "#F97316",
    gradient: ["#FD7014", "#E85D04"],
    logo: "ICICI",
  },
  {
    id: "acc2",
    bank: "HDFC Bank",
    type: "Savings",
    accountNumber: "****7832",
    balance: 54000,
    lastUpdated: "5 min ago",
    color: "#2563EB",
    gradient: ["#1D4ED8", "#1E40AF"],
    logo: "HDFC",
  },
  {
    id: "acc3",
    bank: "State Bank of India",
    type: "Current",
    accountNumber: "****9103",
    balance: 312500,
    lastUpdated: "10 min ago",
    color: "#059669",
    gradient: ["#047857", "#065F46"],
    logo: "SBI",
  },
  {
    id: "acc4",
    bank: "Kotak Mahindra",
    type: "Savings",
    accountNumber: "****6248",
    balance: 88200,
    lastUpdated: "1 hr ago",
    color: "#DC2626",
    gradient: ["#B91C1C", "#991B1B"],
    logo: "KOTAK",
  },
];

const MOCK_TRANSACTIONS = [
  { id: "t1", date: "Today", desc: "Swiggy Food Order", amount: -459, type: "debit" },
  { id: "t2", date: "Today", desc: "Salary Credit - TCS", amount: 95000, type: "credit" },
  { id: "t3", date: "Yesterday", desc: "Amazon Shopping", amount: -2399, type: "debit" },
  { id: "t4", date: "Yesterday", desc: "Google Pay - Transfer", amount: -5000, type: "debit" },
  { id: "t5", date: "Mar 18", desc: "Mutual Fund SIP", amount: -10000, type: "debit" },
  { id: "t6", date: "Mar 17", desc: "Freelance Payment", amount: 15000, type: "credit" },
  { id: "t7", date: "Mar 16", desc: "Electricity Bill", amount: -1850, type: "debit" },
  { id: "t8", date: "Mar 15", desc: "Rent Received", amount: 25000, type: "credit" },
];

const CASHFLOW_DATA = {
  income: 135000,
  expenses: 82400,
  get net() { return this.income - this.expenses; },
};

const TABS = ["Accounts", "Transactions", "Recurring", "Cashflow"];

const fmt = (n) => {
  if (Math.abs(n) >= 100000) return (n / 100000).toFixed(1) + "L";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString("en-IN");
};

const fmtFull = (n) => n.toLocaleString("en-IN");

// ---------- ACCOUNT CARD ----------
const AccountCard = ({ account, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      data-testid={`bank-card-${account.id}`}
      className="flex-shrink-0 w-[280px] rounded-2xl p-5 transition-all duration-300 text-left relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${account.gradient[0]}, ${account.gradient[1]})`,
        transform: isActive ? "scale(1)" : "scale(0.93)",
        opacity: isActive ? 1 : 0.7,
        boxShadow: isActive
          ? `0 20px 40px -12px ${account.color}40, 0 8px 16px -4px rgba(0,0,0,0.12)`
          : "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
      <div
        className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full"
        style={{ background: "rgba(255,255,255,0.04)" }}
      />

      <div className="relative z-10">
        {/* Bank Logo + Name */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black tracking-wider"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              {account.logo}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{account.bank}</p>
              <p className="text-[11px] text-white/60">{account.type} {account.accountNumber}</p>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50 mb-1">
            Available Balance
          </p>
          <p className="text-2xl font-black text-white tracking-tight">
            ₹{fmtFull(account.balance)}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock size={11} className="text-white/40" />
            <p className="text-[10px] text-white/50">Updated {account.lastUpdated}</p>
          </div>
          <div
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            Check Balance
          </div>
        </div>
      </div>
    </button>
  );
};

// ---------- ACCOUNTS TAB ----------
const AccountsTab = ({ accounts, refreshing, onRefresh }) => {
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardW = 280 + 16; // card width + gap
    const idx = Math.round(el.scrollLeft / cardW);
    setActiveIdx(Math.min(idx, accounts.length - 1));
  }, [accounts.length]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Total Balance + Refresh */}
      <div className="px-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Total Balance
          </p>
          <p className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--text-primary)" }}>
            ₹{fmtFull(totalBalance)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            across {accounts.length} accounts
          </p>
        </div>
        <button
          onClick={onRefresh}
          data-testid="refresh-accounts-btn"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90"
          style={{
            backgroundColor: "var(--bg-subtle)",
            border: "1px solid var(--border-light)",
          }}
        >
          <RefreshCw
            size={18}
            style={{ color: "var(--brand-primary)" }}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Horizontal Scrolling Cards */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        data-testid="accounts-card-scroll"
      >
        {accounts.map((acc, i) => (
          <AccountCard key={acc.id} account={acc} isActive={i === activeIdx} onClick={() => {}} />
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2" data-testid="card-dots">
        {accounts.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIdx ? 20 : 6,
              height: 6,
              backgroundColor: i === activeIdx ? "var(--brand-primary)" : "var(--border-light)",
            }}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="px-5">
        <div
          className="rounded-2xl p-4 flex items-center justify-around"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="quick-actions"
        >
          {[
            { icon: Send, label: "Send Money", color: "#3B82F6" },
            { icon: ArrowLeftRight, label: "Self Transfer", color: "#8B5CF6" },
            { icon: Plus, label: "Add Account", color: "#10B981" },
          ].map((action) => (
            <button key={action.label} className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-active:scale-90"
                style={{ backgroundColor: `${action.color}10` }}
              >
                <action.icon size={20} style={{ color: action.color }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Account List */}
      <div className="px-5 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          All Accounts
        </p>
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="rounded-xl p-4 flex items-center justify-between transition-all active:scale-[0.98]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            data-testid={`account-row-${acc.id}`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-[9px] font-black tracking-wider text-white"
                style={{ background: `linear-gradient(135deg, ${acc.gradient[0]}, ${acc.gradient[1]})` }}
              >
                {acc.logo}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{acc.bank}</p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {acc.type} · {acc.accountNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{fmtFull(acc.balance)}
              </p>
              <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- TRANSACTIONS TAB ----------
const TransactionsTab = () => {
  let lastDate = "";
  return (
    <div className="px-5 space-y-3 animate-fadeIn" data-testid="transactions-tab">
      {MOCK_TRANSACTIONS.map((tx) => {
        const showDate = tx.date !== lastDate;
        lastDate = tx.date;
        return (
          <div key={tx.id}>
            {showDate && (
              <p className="text-[10px] font-bold uppercase tracking-widest mt-3 mb-2" style={{ color: "var(--text-muted)" }}>
                {tx.date}
              </p>
            )}
            <div
              className="rounded-xl p-4 flex items-center justify-between"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`tx-${tx.id}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor: tx.type === "credit" ? "#10B98115" : "#EF444415",
                  }}
                >
                  {tx.type === "credit" ? (
                    <TrendingUp size={18} style={{ color: "#10B981" }} />
                  ) : (
                    <TrendingDown size={18} style={{ color: "#EF4444" }} />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{tx.desc}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{tx.date}</p>
                </div>
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: tx.type === "credit" ? "#10B981" : "#EF4444" }}
              >
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
const RecurringTab = () => (
  <div className="px-5 flex flex-col items-center justify-center py-16 animate-fadeIn" data-testid="recurring-tab">
    <div
      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
      style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
    >
      <Repeat size={32} style={{ color: "var(--text-muted)" }} />
    </div>
    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>No recurring payments</p>
    <p className="text-sm mt-2 text-center max-w-[260px]" style={{ color: "var(--text-muted)" }}>
      Recurring payments will be detected automatically once bank accounts are linked via Finvu.
    </p>
    <div
      className="mt-6 px-5 py-2.5 rounded-full text-sm font-bold"
      style={{ backgroundColor: "var(--brand-primary)", color: "#fff" }}
    >
      Coming Soon
    </div>
  </div>
);

// ---------- CASHFLOW TAB ----------
const CashflowTab = () => {
  const pct = Math.round((CASHFLOW_DATA.expenses / CASHFLOW_DATA.income) * 100);
  const savingsRate = 100 - pct;
  return (
    <div className="px-5 space-y-4 animate-fadeIn" data-testid="cashflow-tab">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
        This Month
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#10B98110", border: "1px solid #10B98125" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: "#10B981" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#10B981" }}>Income</p>
          </div>
          <p className="text-xl font-black" style={{ color: "#10B981" }}>₹{fmt(CASHFLOW_DATA.income)}</p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: "#EF444410", border: "1px solid #EF444425" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} style={{ color: "#EF4444" }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#EF4444" }}>Expenses</p>
          </div>
          <p className="text-xl font-black" style={{ color: "#EF4444" }}>₹{fmt(CASHFLOW_DATA.expenses)}</p>
        </div>
      </div>

      {/* Net Cashflow */}
      <div
        className="rounded-2xl p-5"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Net Cashflow</p>
          <p
            className="text-lg font-black"
            style={{ color: CASHFLOW_DATA.net >= 0 ? "#10B981" : "#EF4444" }}
          >
            {CASHFLOW_DATA.net >= 0 ? "+" : "-"}₹{fmtFull(Math.abs(CASHFLOW_DATA.net))}
          </p>
        </div>

        {/* Bar */}
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct > 80 ? "linear-gradient(90deg, #EF4444, #DC2626)" : "linear-gradient(90deg, #10B981, #059669)",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
            {pct}% spent
          </p>
          <p className="text-[10px] font-bold" style={{ color: "#10B981" }}>
            {savingsRate}% saved
          </p>
        </div>
      </div>

      {/* Breakdown Placeholder */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
      >
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
const BankAccountsExperimental = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const tabBarRef = useRef(null);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate delay (future: Finvu fetch)
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((a) => ({ ...a, lastUpdated: "just now" }))
      );
      setRefreshing(false);
    }, 1500);
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const tab = el.children[activeTab];
    if (tab) {
      tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--bg-app)" }}
      data-testid="bank-accounts-experimental"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-5 pt-3 pb-2"
        style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
            style={{ backgroundColor: "var(--bg-subtle)" }}
            data-testid="bank-accounts-back-btn"
          >
            <ArrowLeft size={18} style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: "var(--brand-primary)" }} />
            <h1 className="text-base font-black" style={{ color: "var(--text-primary)" }}>
              Bank Accounts
            </h1>
          </div>
          <div className="w-9" /> {/* spacer */}
        </div>

        {/* Tab Bar */}
        <div
          ref={tabBarRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          data-testid="bank-tab-bar"
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              data-testid={`tab-${tab.toLowerCase()}`}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all relative"
              style={{
                backgroundColor: activeTab === i ? "var(--brand-primary)" : "transparent",
                color: activeTab === i ? "#fff" : "var(--text-muted)",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-5 pb-4">
        {activeTab === 0 && (
          <AccountsTab accounts={accounts} refreshing={refreshing} onRefresh={handleRefresh} />
        )}
        {activeTab === 1 && <TransactionsTab />}
        {activeTab === 2 && <RecurringTab />}
        {activeTab === 3 && <CashflowTab />}
      </div>

      {/* Finvu Banner */}
      <div className="px-5 pb-6">
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1E293B, #0F172A)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
          data-testid="finvu-banner"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Banknote size={16} style={{ color: "#38BDF8" }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#38BDF8" }}>
                Coming Soon
              </p>
            </div>
            <p className="text-sm font-bold text-white mb-1">Link Real Bank Accounts</p>
            <p className="text-xs text-white/50 leading-relaxed">
              Connect your bank accounts via Finvu Account Aggregator for real-time balances, auto-categorized transactions, and cashflow insights.
            </p>
          </div>
          <div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
            style={{ background: "rgba(56,189,248,0.06)" }}
          />
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .snap-x { scroll-snap-type: x mandatory; }
        .snap-mandatory > * { scroll-snap-align: center; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.35s ease-out; }
      `}</style>
    </div>
  );
};

export default BankAccountsExperimental;

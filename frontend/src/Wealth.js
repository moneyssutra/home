import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Building2, LineChart, CreditCard, Shield, Wallet, Landmark,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign,
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const API = process.env.REACT_APP_BACKEND_URL;

const formatAmount = (amount) => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};
const formatFull = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;

const Wealth = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [networth, setNetworth] = useState(null);
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [nwRes, assetsRes, investRes, loansRes, insRes, accRes, ccRes] = await Promise.all([
        axios.get(`${API}/api/dashboard/networth`, { withCredentials: true }),
        axios.get(`${API}/api/assets`, { withCredentials: true }),
        axios.get(`${API}/api/investments`, { withCredentials: true }),
        axios.get(`${API}/api/loans`, { withCredentials: true }),
        axios.get(`${API}/api/insurances`, { withCredentials: true }),
        axios.get(`${API}/api/accounts`, { withCredentials: true }),
        axios.get(`${API}/api/credit-cards`, { withCredentials: true }),
      ]);
      setNetworth(nwRes.data);
      setPortfolio({
        assets: assetsRes.data, investments: investRes.data, loans: loansRes.data,
        insurances: insRes.data, accounts: accRes.data, creditCards: ccRes.data,
      });
    } catch (e) {
      console.error("Error fetching wealth data:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
      </div>
    );
  }

  const d = networth || {};
  const p = portfolio || {};
  const totalAssets = (p.assets || []).reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalInvestments = (p.investments || []).reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalLoans = (p.loans || []).reduce((s, l) => s + (l.outstandingAmount || 0), 0);
  const totalCCOutstanding = (p.creditCards || []).reduce((s, c) => s + (c.outstandingAmount || 0), 0);
  const totalCoverage = (p.insurances || []).reduce((s, i) => s + (i.coverageAmount || 0), 0);
  const totalBalance = (p.accounts || []).filter(a => a.accountType !== "Credit Card").reduce((s, a) => s + (a.currentBalance || 0), 0);
  const netWorth = d.netWorth || (totalAssets + totalInvestments + totalBalance - totalLoans - totalCCOutstanding);
  const totalLiabilities = totalLoans + totalCCOutstanding;
  const totalWealth = totalAssets + totalInvestments + totalBalance;
  const monthlySavings = d.monthlySavings || 0;
  const incomeStability = d.incomeReceived > 0 ? Math.round((d.incomeReceived / (d.incomeReceived + d.expectedIncome || 1)) * 100) : 0;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "income", label: "Income" },
    { id: "expenses", label: "Expenses" },
    { id: "portfolio", label: "Portfolio" },
  ];

  const portfolioSections = [
    { title: "Assets", icon: Building2, color: "from-blue-500 to-indigo-600", bgColor: "var(--status-info-soft)", textColor: "var(--status-info)", value: totalAssets, count: (p.assets || []).length, path: "/my-assets" },
    { title: "Investments", icon: LineChart, color: "from-violet-500 to-purple-600", bgColor: "#F3E8FF", textColor: "var(--chart-accent2)", value: totalInvestments, count: (p.investments || []).length, path: "/my-investments" },
    { title: "Loans", icon: Landmark, color: "from-amber-500 to-orange-600", bgColor: "var(--status-warning-soft)", textColor: "var(--status-warning)", value: totalLoans, count: (p.loans || []).length, path: "/my-loans", isLiability: true },
    { title: "Credit Cards", icon: CreditCard, color: "from-fuchsia-500 to-pink-600", bgColor: "#FCE7F3", textColor: "#DB2777", value: totalCCOutstanding, count: (p.creditCards || []).length, path: "/my-credit-cards", isLiability: true },
    { title: "Insurance", icon: Shield, color: "from-cyan-500 to-blue-600", bgColor: "#CFFAFE", textColor: "#0891B2", value: totalCoverage, count: (p.insurances || []).length, path: "/my-insurance", label: "Coverage" },
    { title: "Accounts", icon: Wallet, color: "from-emerald-500 to-teal-600", bgColor: "var(--brand-primary-soft)", textColor: "var(--brand-primary)", value: totalBalance, count: (p.accounts || []).length, path: "/my-accounts" },
  ];

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wealth-page">
      {/* Header */}
      <header className="px-5 pt-6 pb-4" style={{ background: "linear-gradient(135deg, #0D9488 0%, #047857 100%)" }}>
        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>Wealth</h1>
        <p className="text-white/70 text-sm mb-4">Your financial structure</p>

        {/* Net Worth Hero */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20" data-testid="networth-hero">
          <p className="text-white/70 text-xs font-semibold mb-1">Net Worth</p>
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>{formatFull(netWorth)}</h2>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: monthlySavings >= 0 ? "linear-gradient(135deg,#10B981,#34D399)" : "linear-gradient(135deg,#EF4444,#F87171)" }}>
              {monthlySavings >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {monthlySavings >= 0 ? "Growing" : "Declining"}
            </div>
          </div>
          {/* Net Worth breakdown bar */}
          <div className="mt-4 mb-2">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-white/10">
              {totalWealth > 0 && (
                <>
                  <div className="h-full" style={{ width: `${totalAssets / totalWealth * 100}%`, backgroundColor: "#3B82F6" }} />
                  <div className="h-full" style={{ width: `${totalInvestments / totalWealth * 100}%`, backgroundColor: "#8B5CF6" }} />
                  <div className="h-full" style={{ width: `${totalBalance / totalWealth * 100}%`, backgroundColor: "#34D399" }} />
                </>
              )}
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-bold text-white/80">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3B82F6" }} />Assets</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#8B5CF6" }} />Investments</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#34D399" }} />Cash</span>
            </div>
          </div>
          {/* Quick stats row */}
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
            <div className="flex-1 text-center">
              <p className="text-[10px] text-white/60 font-medium">Safety Days</p>
              <p className="text-sm font-bold text-white">{d.expensesDone > 0 ? Math.round(totalBalance / (d.expensesDone / 30)) : "—"}</p>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-white/60 font-medium">Income Stability</p>
              <p className="text-sm font-bold text-white">{incomeStability}%</p>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="flex-1 text-center">
              <p className="text-[10px] text-white/60 font-medium">Savings Rate</p>
              <p className="text-sm font-bold text-white">{d.incomeReceived > 0 ? Math.round((monthlySavings / d.incomeReceived) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="px-5 -mt-2 mb-4">
        <div className="flex bg-white rounded-xl p-1 shadow-card" style={{ border: "1px solid var(--border-light)" }} data-testid="wealth-tabs">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all" style={{ backgroundColor: tab === t.id ? "var(--brand-primary)" : "transparent", color: tab === t.id ? "#fff" : "var(--text-muted)" }} data-testid={`wealth-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5">
        {tab === "overview" && (
          <div className="space-y-3" data-testid="wealth-overview">
            {/* Income vs Expense */}
            <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Monthly Cash Flow</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={() => navigate("/my-income")} className="rounded-xl p-3 text-left transition-all active:scale-[0.98]" style={{ backgroundColor: "#ECFDF5", border: "1px solid #D1FAE5" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "#059669" }} />
                    <span className="text-[10px] font-bold" style={{ color: "#065F46" }}>INCOME</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: "#065F46" }}>₹{formatAmount((d.incomeReceived || 0) + (d.expectedIncome || 0))}</p>
                </button>
                <button onClick={() => navigate("/my-expenses")} className="rounded-xl p-3 text-left transition-all active:scale-[0.98]" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownRight className="h-3.5 w-3.5" style={{ color: "#DC2626" }} />
                    <span className="text-[10px] font-bold" style={{ color: "#991B1B" }}>EXPENSES</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: "#991B1B" }}>₹{formatAmount((d.expensesDone || 0) + (d.upcomingExpenses || 0))}</p>
                </button>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Net Savings</span>
                  <p className="text-base font-bold" style={{ color: monthlySavings >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                    {monthlySavings >= 0 ? "+" : ""}₹{formatAmount(Math.abs(monthlySavings))}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="font-semibold text-sm mb-3" style={{ color: "var(--text-primary)" }}>Wealth Allocation</h3>
              {[
                { label: "Assets", value: totalAssets, color: "#3B82F6" },
                { label: "Investments", value: totalInvestments, color: "#8B5CF6" },
                { label: "Cash", value: totalBalance, color: "#10B981" },
                { label: "Liabilities", value: totalLiabilities, color: "#EF4444", isNeg: true },
              ].map(({ label, value, color, isNeg }) => {
                const pct = totalWealth > 0 ? Math.round(value / totalWealth * 100) : 0;
                return (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                      <span className="text-xs font-bold" style={{ color: isNeg ? "#EF4444" : "var(--text-primary)" }}>{isNeg ? "-" : ""}₹{formatAmount(value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "income" && (
          <div className="space-y-3" data-testid="wealth-income">
            <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Income Sources</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "#ECFDF5", border: "1px solid #D1FAE5" }}>
                  <p className="text-[10px] font-bold" style={{ color: "#065F46" }}>RECEIVED</p>
                  <p className="text-lg font-bold" style={{ color: "#065F46" }}>₹{formatAmount(d.incomeReceived || 0)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#F0FDF4", border: "1px solid #D1FAE5" }}>
                  <p className="text-[10px] font-bold" style={{ color: "#065F46" }}>EXPECTED</p>
                  <p className="text-lg font-bold" style={{ color: "#065F46" }}>₹{formatAmount(d.expectedIncome || 0)}</p>
                </div>
              </div>
              <button onClick={() => navigate("/my-income")} className="w-full rounded-xl p-3 flex items-center justify-between transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }} data-testid="view-all-income">
                <span className="text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>View All Income Sources</span>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
              </button>
            </div>
          </div>
        )}

        {tab === "expenses" && (
          <div className="space-y-3" data-testid="wealth-expenses">
            <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Monthly Expenses</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="rounded-xl p-3" style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <p className="text-[10px] font-bold" style={{ color: "#991B1B" }}>SPENT</p>
                  <p className="text-lg font-bold" style={{ color: "#991B1B" }}>₹{formatAmount(d.expensesDone || 0)}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}>
                  <p className="text-[10px] font-bold" style={{ color: "#9A3412" }}>UPCOMING</p>
                  <p className="text-lg font-bold" style={{ color: "#9A3412" }}>₹{formatAmount(d.upcomingExpenses || 0)}</p>
                </div>
              </div>
              <button onClick={() => navigate("/my-expenses")} className="w-full rounded-xl p-3 flex items-center justify-between transition-all active:scale-[0.98]" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }} data-testid="view-all-expenses">
                <span className="text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>View All Expenses</span>
                <ChevronRight className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
              </button>
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div className="space-y-3" data-testid="wealth-portfolio">
            {portfolioSections.map((section) => {
              const Icon = section.icon;
              return (
                <button key={section.title} onClick={() => navigate(section.path)} className="w-full rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-md transition-all active:scale-[0.99]" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`portfolio-${section.title.toLowerCase().replace(/\s/g, "-")}`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: section.bgColor, color: section.textColor }}>{section.count}</span>
                    </div>
                    <p className="text-base font-bold mt-0.5" style={{ color: section.isLiability ? "var(--finance-loss)" : "var(--text-primary)" }}>
                      {section.isLiability && "-"}₹ {formatAmount(section.value)}
                    </p>
                    {section.label && <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{section.label}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
            {/* Net Position */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
              <p className="text-white/70 text-xs mb-1">Net Position</p>
              <h2 className="text-2xl font-bold text-white">{formatFull(netWorth)}</h2>
              <p className="text-white/50 text-[10px] mt-1">Assets + Investments + Cash - Liabilities</p>
            </div>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default Wealth;

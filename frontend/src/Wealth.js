import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Building2, LineChart, CreditCard, Shield, Wallet, Landmark,
  ArrowUpRight, ArrowDownRight, DollarSign,
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/context/AuthContext";
import { useFamilyContext } from "@/context/FamilyContext";

const API = process.env.REACT_APP_BACKEND_URL;

const formatAmount = (amount) => {
  if (amount >= 10000000) return `${parseFloat((amount / 10000000).toFixed(2))} Cr`;
  if (amount >= 100000) return `${parseFloat((amount / 100000).toFixed(2))} L`;
  if (amount >= 1000) return `${parseFloat((amount / 1000).toFixed(1))} K`;
  return new Intl.NumberFormat("en-IN").format(amount);
};

const Wealth = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { activeViewId, activeViewLabel, isPersonalView, isFamilyView } = useFamilyContext();
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [data, setData] = useState({});

  const getUserName = () => {
    if (user?.name) return user.name.split(" ")[0];
    if (profile?.fullName) return profile.fullName.split(" ")[0];
    return null;
  };

  useEffect(() => {
    if (isFamilyView) {
      fetchFamilyWealth();
    } else if (!isPersonalView && activeViewId) {
      fetchMemberWealth();
    } else {
      fetchAll();
    }
  }, [activeViewId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [nwRes, assetsRes, investRes, loansRes, insRes, accRes, ccRes, incomeRes, expenseRes] = await Promise.all([
        axios.get(`${API}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true }),
        axios.get(`${API}/api/assets`, { withCredentials: true }),
        axios.get(`${API}/api/investments`, { withCredentials: true }),
        axios.get(`${API}/api/loans`, { withCredentials: true }),
        axios.get(`${API}/api/insurances`, { withCredentials: true }),
        axios.get(`${API}/api/accounts`, { withCredentials: true }),
        axios.get(`${API}/api/credit-cards`, { withCredentials: true }),
        axios.get(`${API}/api/income`, { withCredentials: true }),
        axios.get(`${API}/api/expenses/by-month?month=${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`, { withCredentials: true }),
      ]);
      const nw = nwRes.data;
      const expenses = Array.isArray(expenseRes.data) ? expenseRes.data : [];
      const incomes = Array.isArray(incomeRes.data) ? incomeRes.data : [];
      setData({
        nw,
        assets: assetsRes.data || [],
        investments: investRes.data || [],
        loans: loansRes.data || [],
        insurances: insRes.data || [],
        accounts: accRes.data || [],
        creditCards: ccRes.data || [],
        incomes,
        expenses,
        totalIncome: (nw.incomeReceived || 0) + (nw.expectedIncome || 0),
        totalExpenses: (nw.expensesDone || 0) + (nw.upcomingExpenses || 0),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberWealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/family/member/${activeViewId}/summary`, { withCredentials: true });
      const s = res.data.summary || {};
      setData({
        nw: { netWorth: s.netWorth || 0 },
        assets: [], investments: [], loans: [], insurances: [], accounts: [], creditCards: [], incomes: [], expenses: [],
        totalIncome: s.monthlyIncome || 0,
        totalExpenses: s.monthlyExpenses || 0,
        overrideAssets: s.totalAssets || 0,
        overrideInvestments: s.totalInvestments || 0,
        overrideLoans: s.totalLoans || 0,
        overrideBalance: s.liquidBalance || 0,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchFamilyWealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/family/combined-summary`, { withCredentials: true });
      const cs = res.data.combinedSummary || {};
      setData({
        nw: { netWorth: cs.netWorth || 0 },
        assets: [], investments: [], loans: [], insurances: [], accounts: [], creditCards: [], incomes: [], expenses: [],
        totalIncome: cs.monthlyIncome || 0,
        totalExpenses: cs.monthlyExpenses || 0,
        overrideAssets: cs.totalAssets || 0,
        overrideInvestments: cs.totalInvestments || 0,
        overrideLoans: cs.totalLoans || 0,
        overrideBalance: cs.liquidBalance || 0,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
      </div>
    );
  }

  const totalAssets = data.overrideAssets ?? (data.assets || []).reduce((s, a) => s + (a.currentValue || 0), 0);
  const totalInvestments = data.overrideInvestments ?? (data.investments || []).reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalLoans = data.overrideLoans ?? (data.loans || []).reduce((s, l) => s + (l.outstandingAmount || 0), 0);
  const totalCC = (data.creditCards || []).reduce((s, c) => s + (c.outstandingAmount || 0), 0);
  const totalCoverage = (data.insurances || []).reduce((s, i) => s + (i.coverageAmount || 0), 0);
  const totalBalance = data.overrideBalance ?? (data.accounts || []).filter(a => a.accountType !== "Credit Card").reduce((s, a) => s + (a.currentBalance || 0), 0);

  const sections = [
    { title: "Income", icon: ArrowUpRight, gradient: "from-emerald-500 to-green-600", bgColor: "#ECFDF5", textColor: "#059669", value: data.totalIncome || 0, count: (data.incomes || []).length, path: "/my-income", label: "sources" },
    { title: "Expenses", icon: ArrowDownRight, gradient: "from-red-500 to-rose-600", bgColor: "#FEF2F2", textColor: "#DC2626", value: data.totalExpenses || 0, count: (data.expenses || []).length, path: "/my-expenses", label: "this month", isExpense: true },
    { title: "Assets", icon: Building2, gradient: "from-blue-500 to-indigo-600", bgColor: "var(--status-info-soft)", textColor: "var(--status-info)", value: totalAssets, count: (data.assets || []).length, path: "/my-assets", label: "items" },
    { title: "Investments", icon: LineChart, gradient: "from-violet-500 to-purple-600", bgColor: "#F3E8FF", textColor: "#7C3AED", value: totalInvestments, count: (data.investments || []).length, path: "/my-investments", label: "items" },
    { title: "Loans", icon: Landmark, gradient: "from-amber-500 to-orange-600", bgColor: "var(--status-warning-soft)", textColor: "var(--status-warning)", value: totalLoans, count: (data.loans || []).length, path: "/my-loans", label: "loans", isLiability: true },
    { title: "Credit Cards", icon: CreditCard, gradient: "from-fuchsia-500 to-pink-600", bgColor: "#FCE7F3", textColor: "#DB2777", value: totalCC, count: (data.creditCards || []).length, path: "/my-credit-cards", label: "cards", isLiability: true },
    { title: "Insurance", icon: Shield, gradient: "from-cyan-500 to-blue-600", bgColor: "#CFFAFE", textColor: "#0891B2", value: totalCoverage, count: (data.insurances || []).length, path: "/my-insurance", label: "coverage" },
    { title: "Accounts", icon: Wallet, gradient: "from-emerald-500 to-teal-600", bgColor: "var(--brand-primary-soft)", textColor: "var(--brand-primary)", value: totalBalance, count: (data.accounts || []).length, path: "/my-accounts", label: "accounts" },
  ];

  return (
    <div className="min-h-screen pb-28 overflow-y-auto no-scrollbar" style={{ backgroundColor: "var(--bg-app)" }} data-testid="wealth-page">
      {/* Header — same as Dashboard */}
      <header className="relative" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ProfileMenu userName={getUserName()} userPicture={user?.picture} />
            </div>
            <NotificationBell />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Wealth</h1>
          <p className="text-white/70 text-sm">Your complete financial picture</p>
        </div>
      </header>

      {/* Sections Grid */}
      <div className="px-5 mt-4 space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button key={section.title} onClick={() => navigate(section.path)} className="w-full rounded-2xl p-4 shadow-card flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99]" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`wealth-${section.title.toLowerCase().replace(/\s/g, "-")}`}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{section.title}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: section.bgColor, color: section.textColor }}>
                    {section.count} {section.label || ""}
                  </span>
                </div>
                <p className="text-base font-bold mt-0.5" style={{ color: section.isLiability ? "var(--finance-loss)" : section.isExpense ? "var(--finance-loss)" : "var(--text-primary)" }}>
                  {section.isLiability ? "-" : ""}₹ {formatAmount(section.value)}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            </button>
          );
        })}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default Wealth;

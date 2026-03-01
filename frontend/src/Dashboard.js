import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  LineChart,
  Target,
  ChevronRight,
  AlertTriangle,
  Lightbulb,
  TrendingUp as TrendIcon,
  CheckCircle2,
  Clock,
  CircleDollarSign,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import FamilyToggle from "@/components/FamilyToggle";
import FinancialHealth from "@/components/FinancialHealth";
import { OpportunityCard } from "@/components/OpportunityCard";
import { useAuth } from "@/context/AuthContext";
import { useFamilyContext } from "@/context/FamilyContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { activeViewId, activeViewLabel, isPersonalView, isFamilyView } = useFamilyContext();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [goalsSummary, setGoalsSummary] = useState(null);
  const [familyData, setFamilyData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [isPremium, setIsPremium] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (isFamilyView) {
      fetchFamilyDashboard();
    } else if (isPersonalView) {
      fetchDashboardData();
    } else {
      fetchMemberDashboard();
    }
  }, [activeViewId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setFamilyData(null);
      const [networthRes, profileRes, goalsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/profile/basic`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/goals/summary/dashboard`, { withCredentials: true }).catch(() => ({ data: null })),
      ]);
      setData(networthRes.data);
      setProfile(profileRes.data);
      setGoalsSummary(goalsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      // Lazy-load opportunities and premium status after main content
      Promise.all([
        axios.get(`${backendUrl}/api/opportunities/eligible?limit=20&skip_shown_filter=true&skip_dismiss_filter=true`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/settings/preferences`, { withCredentials: true }),
      ]).then(([oppRes, prefRes]) => {
        setOpportunities(oppRes.data.opportunities || []);
        setIsPremium(prefRes.data?.is_premium || false);
      }).catch(() => {});
    }
  };

  const fetchMemberDashboard = async () => {
    try {
      setLoading(true);
      setFamilyData(null);
      const res = await axios.get(`${backendUrl}/api/family/member/${activeViewId}/summary`, { withCredentials: true });
      const s = res.data.summary || {};
      // Transform member data to match personal dashboard format
      setData({
        netWorth: s.netWorth || 0,
        totalAssets: s.totalAssets || 0,
        totalInvestments: s.totalInvestments || 0,
        totalLoans: s.totalLoans || 0,
        liquidBalance: s.liquidBalance || 0,
        monthlyIncome: s.monthlyIncome || 0,
        monthlyExpenses: s.monthlyExpenses || 0,
        monthlySavings: (s.monthlyIncome || 0) - (s.monthlyExpenses || 0),
        incomeReceived: 0,
        expectedIncome: s.monthlyIncome || 0,
        expensesDone: 0,
        upcomingExpenses: s.monthlyExpenses || 0,
        memberName: res.data.member?.name,
        memberRelationship: res.data.member?.relationship,
        counts: s.counts || {},
      });
      setProfile(null);
      setGoalsSummary(null);
    } catch (error) {
      console.error("Error fetching member summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyDashboard = async () => {
    try {
      setLoading(true);
      const [combinedRes, membersRes] = await Promise.all([
        axios.get(`${backendUrl}/api/family/combined-summary`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/family`, { withCredentials: true }),
      ]);
      const cs = combinedRes.data.combinedSummary || {};
      setData({
        netWorth: cs.netWorth || 0,
        totalAssets: cs.totalAssets || 0,
        totalInvestments: cs.totalInvestments || 0,
        totalLoans: cs.totalLoans || 0,
        totalLiabilities: (cs.totalLoans || 0) + (cs.totalCCOutstanding || 0),
        liquidBalance: cs.liquidBalance || 0,
        monthlyIncome: cs.monthlyIncome || 0,
        monthlyExpenses: cs.monthlyExpenses || 0,
        monthlySavings: (cs.incomeReceived || 0) - (cs.expensesDone || 0),
        incomeReceived: cs.incomeReceived || 0,
        expectedIncome: cs.expectedIncome || 0,
        expensesDone: cs.expensesDone || 0,
        upcomingExpenses: cs.upcomingExpenses || 0,
      });
      const family = membersRes.data.family || membersRes.data;
      setFamilyData({
        familyName: combinedRes.data.familyName,
        memberCount: combinedRes.data.memberCount,
        members: family?.members || [],
      });
      setProfile(null);
      setGoalsSummary(null);
    } catch (error) {
      console.error("Error fetching family summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 10000000) {
      const crValue = amount / 10000000;
      // Show 2 decimal places, but remove trailing zeros
      return `${parseFloat(crValue.toFixed(2))} Cr`;
    }
    if (amount >= 100000) {
      const lakhValue = amount / 100000;
      return `${parseFloat(lakhValue.toFixed(2))} L`;
    }
    if (amount >= 1000) {
      const kValue = amount / 1000;
      return `${parseFloat(kValue.toFixed(1))} K`;
    }
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const formatFullAmount = (amount) => {
    return new Intl.NumberFormat("en-IN").format(Math.round(amount));
  };

  const getNetWorthTrend = () => {
    if (!data) return "positive";
    const savings = data.monthlySavings || 0;
    return savings >= 0 ? "positive" : "negative";
  };

  const getUserName = () => {
    if (user?.name) return user.name.split(" ")[0];
    if (profile?.fullName) return profile.fullName.split(" ")[0];
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }} data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>Loading your finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="dashboard-page">
      {/* Minimal Header */}
      <header className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="relative px-5 pt-4 pb-6">
          {/* Header Row - Profile left, Notification right */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ProfileMenu 
                userName={getUserName()} 
                userPicture={user?.picture}
              />
              <FamilyToggle />
            </div>
            <NotificationBell />
          </div>

          {/* Net Worth Card - Hero */}
          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20" data-testid="networth-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white text-sm font-semibold mb-1" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                    {isFamilyView ? `${activeViewLabel} Net Worth` : !isPersonalView ? `${activeViewLabel}'s Net Worth` : "Total Net Worth"}
                  </p>
                  <h2 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Manrope', sans-serif", textShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
                    ₹ {formatFullAmount(data?.netWorth || 0)}
                  </h2>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                  getNetWorthTrend() === "positive" 
                    ? "text-white" 
                    : "text-white"
                }`} style={{ 
                  background: getNetWorthTrend() === "positive" 
                    ? "linear-gradient(135deg, #10B981, #34D399)" 
                    : "linear-gradient(135deg, #EF4444, #F87171)",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  boxShadow: getNetWorthTrend() === "positive"
                    ? "0 2px 8px rgba(16,185,129,0.4)"
                    : "0 2px 8px rgba(239,68,68,0.4)"
                }}>
                  {getNetWorthTrend() === "positive" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{getNetWorthTrend() === "positive" ? "Growing" : "Declining"}</span>
                </div>
              </div>
              
              {/* Net Worth Breakdown Bar */}
              <div className="mt-6 mb-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-white/10">
                  {data && (data.totalAssets + data.totalInvestments + data.liquidBalance) > 0 && (
                    <>
                      <div 
                        className="transition-all duration-500"
                        style={{ width: `${(data.totalAssets / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%`, backgroundColor: "var(--chart-accent1)" }}
                        title={`Assets: ₹${formatFullAmount(data.totalAssets)}`}
                      />
                      <div 
                        className="transition-all duration-500"
                        style={{ width: `${(data.totalInvestments / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%`, backgroundColor: "var(--chart-accent2)" }}
                        title={`Investments: ₹${formatFullAmount(data.totalInvestments)}`}
                      />
                      <div 
                        className="transition-all duration-500"
                        style={{ width: `${(data.liquidBalance / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%`, backgroundColor: "#34D399" }}
                        title={`Cash: ₹${formatFullAmount(data.liquidBalance)}`}
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs font-bold text-white" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: "#3B82F6", boxShadow: "0 0 4px rgba(59,130,246,0.5)" }} /> Assets</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: "#8B5CF6", boxShadow: "0 0 4px rgba(139,92,246,0.5)" }} /> Investments</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: "#34D399", boxShadow: "0 0 4px rgba(52,211,153,0.5)" }} /> Cash</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {/* Family Combined View - member breakdown */}
      {isFamilyView && familyData && (
        <div className="px-6 mt-4 mb-4" data-testid="family-breakdown">
          <div className="rounded-2xl p-4 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Family Members</h3>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DBEAFE", color: "#2563EB" }}>
                {familyData.memberCount} members
              </span>
            </div>
            <div className="space-y-2">
              {familyData.members.map((m, i) => (
                <div key={m.id || i} className="flex items-center gap-3 rounded-xl p-2.5" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: m.role === "owner" ? "#DBEAFE" : "#F3E8FF", color: m.role === "owner" ? "#2563EB" : "#7C3AED" }}>
                    {m.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.relationship || m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Member Context Label */}
      {!isPersonalView && !isFamilyView && data?.memberName && (
        <div className="px-6 mt-4 mb-2" data-testid="member-context-label">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: "#F3E8FF", border: "1px solid #E9D5FF" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "#7C3AED", color: "white" }}>
              {data.memberName.charAt(0)}
            </div>
            <span className="text-xs font-semibold" style={{ color: "#7C3AED" }}>Viewing as {data.memberName}</span>
            {data.memberRelationship && <span className="text-[10px]" style={{ color: "#A78BFA" }}>({data.memberRelationship})</span>}
          </div>
        </div>
      )}

      <div className="px-6 pb-8 space-y-6 mt-4">
        {/* Monthly Cash Flow Card - Enhanced */}
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="income-expense-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Monthly Cash Flow</h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>
              {new Date().toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
          </div>

          {/* Income Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--finance-gain)" }}>Income</p>
              <button 
                onClick={() => navigate("/my-income")}
                className="flex items-center gap-1 text-[10px] font-semibold transition-all hover:opacity-80"
                style={{ color: "var(--finance-gain)" }}
                data-testid="cashflow-view-my-income"
              >
                My Income <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div 
                className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: "#ECFDF5", border: "1px solid #D1FAE5" }}
                onClick={() => navigate("/income-received")}
                data-testid="cashflow-income-received"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "#059669" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#065F46" }}>Received</span>
                </div>
                <p className="text-base font-bold" style={{ color: "#065F46" }}>₹{formatAmount(data?.incomeReceived || 0)}</p>
              </div>
              <div 
                className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: "#F0FDF4", border: "1px solid #D1FAE5" }}
                onClick={() => navigate("/expected-income")}
                data-testid="cashflow-income-expected"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5" style={{ color: "#10B981" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#065F46" }}>Expected</span>
                </div>
                <p className="text-base font-bold" style={{ color: "#065F46" }}>₹{formatAmount(data?.expectedIncome || 0)}</p>
              </div>
            </div>
            {/* Income progress */}
            {(data?.incomeReceived + data?.expectedIncome || 0) > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#D1FAE5" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ 
                    width: `${Math.min(((data?.incomeReceived || 0) / ((data?.incomeReceived || 0) + (data?.expectedIncome || 1))) * 100, 100)}%`,
                    background: "linear-gradient(90deg, #059669, #10B981)"
                  }} />
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: "#6B7280" }}>
                  {Math.round(((data?.incomeReceived || 0) / ((data?.incomeReceived || 0) + (data?.expectedIncome || 1))) * 100)}% received
                </p>
              </div>
            )}
          </div>

          {/* Expense Section */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--finance-loss)" }}>Expenses</p>
              <button 
                onClick={() => navigate("/my-expenses")}
                className="flex items-center gap-1 text-[10px] font-semibold transition-all hover:opacity-80"
                style={{ color: "var(--finance-loss)" }}
                data-testid="cashflow-view-my-expenses"
              >
                My Expenses <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div 
                className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: "#FEF2F2", border: "1px solid #FECACA" }}
                onClick={() => navigate("/expenses-done")}
                data-testid="cashflow-expenses-done"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CircleDollarSign className="h-3.5 w-3.5" style={{ color: "#DC2626" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#991B1B" }}>Spent</span>
                </div>
                <p className="text-base font-bold" style={{ color: "#991B1B" }}>₹{formatAmount(data?.expensesDone || 0)}</p>
              </div>
              <div 
                className="rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}
                onClick={() => navigate("/upcoming-expenses")}
                data-testid="cashflow-expenses-upcoming"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarClock className="h-3.5 w-3.5" style={{ color: "#EA580C" }} />
                  <span className="text-[10px] font-medium" style={{ color: "#9A3412" }}>Upcoming</span>
                </div>
                <p className="text-base font-bold" style={{ color: "#9A3412" }}>₹{formatAmount(data?.upcomingExpenses || 0)}</p>
              </div>
            </div>
            {/* Expense progress */}
            {(data?.expensesDone + data?.upcomingExpenses || 0) > 0 && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#FECACA" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ 
                    width: `${Math.min(((data?.expensesDone || 0) / ((data?.expensesDone || 0) + (data?.upcomingExpenses || 1))) * 100, 100)}%`,
                    background: "linear-gradient(90deg, #DC2626, #F87171)"
                  }} />
                </div>
                <p className="text-[10px] mt-1 text-right" style={{ color: "#6B7280" }}>
                  {Math.round(((data?.expensesDone || 0) / ((data?.expensesDone || 0) + (data?.upcomingExpenses || 1))) * 100)}% spent
                </p>
              </div>
            )}
          </div>

          {/* Net Balance */}
          <div className="rounded-xl p-3 mt-1" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Net Balance</span>
              </div>
              <p className="text-lg font-bold" style={{ color: (data?.monthlySavings || 0) >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                {(data?.monthlySavings || 0) >= 0 ? "+" : "-"}₹{formatAmount(Math.abs(data?.monthlySavings || 0))}
              </p>
            </div>
            {data?.incomeReceived > 0 && (
              <div className="flex justify-end mt-1">
                <span className="text-[10px]" style={{ color: (data?.monthlySavings || 0) >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                  {Math.round(((data.incomeReceived - (data.expensesDone || 0)) / data.incomeReceived) * 100)}% savings rate
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Smart Opportunities - Non-premium: after cashflow */}
      {!isPremium && opportunities.length > 0 && (
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="dashboard-opportunities">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4" style={{ color: "#F59E0B" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Smart Opportunities</h3>
          </div>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opportunity={opp} isPremium={isPremium} onDismiss={(id) => setOpportunities(prev => prev.filter(o => o.id !== id))} />
            ))}
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Assets */}
          <div 
            className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] shadow-card"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            onClick={() => navigate("/my-assets")}
            data-testid="assets-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--status-info-soft)" }}>
                <Building2 className="h-4 w-4" style={{ color: "var(--status-info)" }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Assets</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data?.totalAssets || 0)}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{data?.assetCount || 0} items</p>
          </div>

          {/* Investments */}
          <div 
            className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] shadow-card"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            onClick={() => navigate("/my-investments")}
            data-testid="investments-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F3E8FF" }}>
                <LineChart className="h-4 w-4" style={{ color: "var(--chart-accent2)" }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Investments</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data?.totalInvestments || 0)}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{data?.investmentCount || 0} items</p>
          </div>

          {/* Liquid Fund */}
          <div 
            className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] shadow-card"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            onClick={() => navigate("/my-accounts")}
            data-testid="cash-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
                <Wallet className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Liquid Fund</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data?.liquidBalance || 0)}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{data?.accountCount || 0} accounts</p>
          </div>

          {/* Liabilities */}
          <div 
            className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] shadow-card"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            onClick={() => navigate("/my-liabilities")}
            data-testid="liabilities-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--status-error-soft)" }}>
                <CreditCard className="h-4 w-4" style={{ color: "var(--status-error)" }} />
              </div>
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Liabilities</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--finance-loss)" }}>₹ {formatAmount(data?.totalLiabilities || 0)}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{data?.loanCount || 0} loans, {data?.creditCardCount || 0} cards</p>
          </div>
        </div>

        {/* Goals Widget */}
        <div 
          className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md shadow-card"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          onClick={() => navigate("/my-goals")}
          data-testid="goals-widget"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
                <Target className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
              </div>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Financial Goals</h3>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {goalsSummary?.totalActiveGoals || 0} active goals
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
          </div>
          
          {goalsSummary?.goals && goalsSummary.goals.length > 0 ? (
            <div className="space-y-3">
              {goalsSummary.goals.slice(0, 2).map((goal) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate max-w-[150px]" style={{ color: "var(--text-secondary)" }}>
                        {goal.goalName}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {goal.progressPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(goal.progressPercent, 100)}%`,
                          backgroundColor: goal.progressPercent >= 75 ? "var(--brand-primary)" : 
                                          goal.progressPercent >= 50 ? "var(--status-warning)" : "var(--brand-primary)"
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {goalsSummary.totalActiveGoals > 2 && (
                <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
                  +{goalsSummary.totalActiveGoals - 2} more goals
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>No active goals yet</p>
              <p className="text-xs mt-1" style={{ color: "var(--brand-primary)" }}>Tap to create your first goal</p>
            </div>
          )}
        </div>

        {/* Financial Health */}
        <FinancialHealth />

        {/* Empty State - When no data */}
        {data && data.assetCount === 0 && data.investmentCount === 0 && data.accountCount === 0 && (
          <div className="rounded-2xl p-8 text-center shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="empty-state">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)" }}>
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Start Your Financial Journey</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Add your assets, investments, and accounts to see your complete financial picture.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate("/asset")}
                className="px-4 py-2 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Add Asset
              </button>
              <button
                onClick={() => navigate("/investment")}
                className="px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
                style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Add Investment
              </button>
              <button
                onClick={() => navigate("/account")}
                className="px-4 py-2 rounded-xl font-medium text-sm transition-all active:scale-95"
                style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Add Account
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default Dashboard;

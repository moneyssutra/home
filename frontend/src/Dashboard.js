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
  Sparkles,
  AlertTriangle,
  Lightbulb,
  TrendingUp as TrendIcon,
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [goalsSummary, setGoalsSummary] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [networthRes, profileRes, goalsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/dashboard/networth`, { withCredentials: true }),
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
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/ai/insights`, { withCredentials: true });
      setInsights(response.data.insights || []);
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (data && !insightsLoading && insights.length === 0) {
      fetchInsights();
    }
  }, [data]);

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
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="dashboard-page">
      {/* Minimal Header */}
      <header className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="relative px-5 pt-4 pb-6">
          {/* Header Row - Just icons */}
          <div className="flex items-center justify-end gap-3 mb-4">
            <NotificationBell />
            <ProfileMenu 
              userName={getUserName()} 
              userPicture={user?.picture}
            />
          </div>

          {/* Net Worth Card - Hero */}
          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20" data-testid="networth-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white/70 text-sm font-medium mb-1">Total Net Worth</p>
                  <h2 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    ₹ {formatFullAmount(data?.netWorth || 0)}
                  </h2>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                  getNetWorthTrend() === "positive" 
                    ? "bg-emerald-500/20 text-emerald-100" 
                    : "bg-rose-500/20 text-rose-100"
                }`}>
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
                        style={{ width: `${(data.liquidBalance / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%`, backgroundColor: "var(--brand-primary-light)" }}
                        title={`Cash: ₹${formatFullAmount(data.liquidBalance)}`}
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/60">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--chart-accent1)" }} /> Assets</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--chart-accent2)" }} /> Investments</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--brand-primary-light)" }} /> Cash</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-8 space-y-6 mt-4">
        {/* Monthly Cash Flow Card - MOVED TO TOP */}
        <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="income-expense-card">
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Monthly Cash Flow</h3>
          <div className="grid grid-cols-3 gap-3">
            <div 
              className="text-center cursor-pointer rounded-xl p-2 transition-all hover:bg-green-50 active:scale-[0.98]"
              onClick={() => navigate("/my-income")}
              data-testid="cashflow-income-link"
            >
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "var(--finance-gain)" }}>
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-medium">Received</span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data?.monthlyIncome || 0)}</p>
            </div>
            <div 
              className="text-center cursor-pointer rounded-xl p-2 transition-all hover:bg-red-50 active:scale-[0.98]"
              onClick={() => navigate("/my-expenses")}
              data-testid="cashflow-expense-link"
            >
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "var(--finance-loss)" }}>
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-xs font-medium">Expense</span>
              </div>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data?.monthlyExpenses || 0)}</p>
            </div>
            <div className="text-center p-2">
              <div className="flex items-center justify-center gap-1 mb-1" style={{ color: "var(--status-warning)" }}>
                <PiggyBank className="h-4 w-4" />
                <span className="text-xs font-medium">Balance</span>
              </div>
              <p className="text-lg font-bold" style={{ color: (data?.monthlySavings || 0) >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                ₹ {formatAmount(Math.abs(data?.monthlySavings || 0))}
              </p>
            </div>
          </div>
          
          {/* Savings Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              <span>Balance Rate</span>
              <span>
                {data?.monthlyIncome > 0 
                  ? `${Math.round((data.monthlySavings / data.monthlyIncome) * 100)}%` 
                  : "0%"}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(Math.abs(data?.monthlyIncome > 0 ? (data.monthlySavings / data.monthlyIncome) * 100 : 0), 100)}%`,
                  background: (data?.monthlySavings || 0) >= 0 
                    ? "linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)"
                    : "linear-gradient(90deg, var(--status-error) 0%, #F87171 100%)"
                }}
              />
            </div>
          </div>
        </div>

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

        {/* AI Smart Insights */}
        <div 
          className="rounded-2xl p-5 shadow-card"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
          data-testid="ai-insights-card"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)" }}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-black">Smart Insights</h3>
                <p className="text-xs text-black/60">AI-powered financial tips</p>
              </div>
            </div>
            <button 
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="p-2 rounded-lg transition-all hover:bg-gray-100 active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 text-black/50 ${insightsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {insightsLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-black/60">Analyzing your finances...</p>
              </div>
            </div>
          ) : insights.length > 0 ? (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-xl transition-all ${insight.actionable ? 'cursor-pointer hover:shadow-sm active:scale-[0.99]' : ''}`}
                  style={{ 
                    backgroundColor: insight.priority === 'high' 
                      ? '#FEE2E2' 
                      : insight.priority === 'medium'
                        ? '#FEF3C7'
                        : '#F8FAFC'
                  }}
                  onClick={() => insight.actionable && insight.action_link && navigate(insight.action_link)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0 w-7 h-7 flex items-center justify-center">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight text-black">
                        {insight.title}
                      </p>
                      <p className="text-xs mt-1 leading-relaxed text-black/70">
                        {insight.description}
                      </p>
                      {insight.actionable && insight.action_text && (
                        <span 
                          className="inline-flex items-center gap-1 text-xs font-medium mt-2"
                          style={{ color: "#059669" }}
                        >
                          {insight.action_text}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-black/60">
                Add more financial data for personalized insights
              </p>
            </div>
          )}
        </div>

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

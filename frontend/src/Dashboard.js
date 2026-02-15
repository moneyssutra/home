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
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
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
        axios.get(`${backendUrl}/api/dashboard/networth`),
        axios.get(`${backendUrl}/api/profile/basic`),
        axios.get(`${backendUrl}/api/goals/summary/dashboard`).catch(() => ({ data: null })),
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
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
    if (profile?.fullName) {
      return profile.fullName.split(" ")[0];
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0B3D2E] via-[#134E3E] to-[#0B3D2E] flex items-center justify-center" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-[#00D09C]/30 border-t-[#00D09C] rounded-full animate-spin" />
          <p className="text-white/80 font-medium">Loading your finances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3D2E] via-[#134E3E] to-[#0B3D2E] pb-24" data-testid="dashboard-page">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgMHYyaC0ydi0yaDJ6bTIgMGgydjJoLTJ2LTJ6bS0yLTR2MmgtMnYtMmgyek0zNCAyNnYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative px-6 pt-8 pb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-white/60 text-sm font-medium">
                Welcome back{getUserName() ? `, ${getUserName()}` : ""}
              </p>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Moneyssutra
              </h1>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
              data-testid="refresh-button"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Net Worth Card */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#00D09C] via-[#10B981] to-[#00D09C] rounded-3xl blur-lg opacity-30 animate-pulse" />
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10" data-testid="networth-card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white/60 text-sm font-medium mb-1">Total Net Worth</p>
                  <h2 className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Manrope', sans-serif" }}>
                    ₹ {formatFullAmount(data?.netWorth || 0)}
                  </h2>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                  getNetWorthTrend() === "positive" 
                    ? "bg-emerald-500/20 text-emerald-300" 
                    : "bg-rose-500/20 text-rose-300"
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
                        className="bg-blue-500 transition-all duration-500"
                        style={{ width: `${(data.totalAssets / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%` }}
                        title={`Assets: ₹${formatFullAmount(data.totalAssets)}`}
                      />
                      <div 
                        className="bg-violet-500 transition-all duration-500"
                        style={{ width: `${(data.totalInvestments / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%` }}
                        title={`Investments: ₹${formatFullAmount(data.totalInvestments)}`}
                      />
                      <div 
                        className="bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(data.liquidBalance / (data.totalAssets + data.totalInvestments + data.liquidBalance)) * 100}%` }}
                        title={`Cash: ₹${formatFullAmount(data.liquidBalance)}`}
                      />
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/50">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Assets</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Investments</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cash</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 pb-8 space-y-6">
        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Assets */}
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 cursor-pointer transition-all hover:bg-white/15 active:scale-[0.98]"
            onClick={() => navigate("/my-assets")}
            data-testid="assets-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-white/60 text-xs font-medium">Assets</span>
            </div>
            <p className="text-xl font-bold text-white">₹ {formatAmount(data?.totalAssets || 0)}</p>
            <p className="text-white/40 text-xs mt-1">{data?.assetCount || 0} items</p>
          </div>

          {/* Investments */}
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 cursor-pointer transition-all hover:bg-white/15 active:scale-[0.98]"
            onClick={() => navigate("/my-investments")}
            data-testid="investments-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <LineChart className="h-4 w-4 text-violet-400" />
              </div>
              <span className="text-white/60 text-xs font-medium">Investments</span>
            </div>
            <p className="text-xl font-bold text-white">₹ {formatAmount(data?.totalInvestments || 0)}</p>
            <p className="text-white/40 text-xs mt-1">{data?.investmentCount || 0} items</p>
          </div>

          {/* Liquid Fund */}
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 cursor-pointer transition-all hover:bg-white/15 active:scale-[0.98]"
            onClick={() => navigate("/my-accounts")}
            data-testid="cash-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-white/60 text-xs font-medium">Liquid Fund</span>
            </div>
            <p className="text-xl font-bold text-white">₹ {formatAmount(data?.liquidBalance || 0)}</p>
            <p className="text-white/40 text-xs mt-1">{data?.accountCount || 0} accounts</p>
          </div>

          {/* Liabilities */}
          <div 
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 cursor-pointer transition-all hover:bg-white/15 active:scale-[0.98]"
            onClick={() => navigate("/my-loans")}
            data-testid="liabilities-summary-card"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-rose-400" />
              </div>
              <span className="text-white/60 text-xs font-medium">Liabilities</span>
            </div>
            <p className="text-xl font-bold text-rose-300">₹ {formatAmount(data?.totalLiabilities || 0)}</p>
            <p className="text-white/40 text-xs mt-1">{data?.loanCount || 0} loans</p>
          </div>
        </div>

        {/* Income vs Expense Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="income-expense-card">
          <h3 className="text-white font-semibold mb-4">Monthly Cash Flow</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-xs font-medium">Income</span>
              </div>
              <p className="text-lg font-bold text-white">₹ {formatAmount(data?.monthlyIncome || 0)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-rose-400 mb-1">
                <ArrowDownRight className="h-4 w-4" />
                <span className="text-xs font-medium">Expense</span>
              </div>
              <p className="text-lg font-bold text-white">₹ {formatAmount(data?.monthlyExpenses || 0)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                <PiggyBank className="h-4 w-4" />
                <span className="text-xs font-medium">Savings</span>
              </div>
              <p className={`text-lg font-bold ${(data?.monthlySavings || 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                ₹ {formatAmount(Math.abs(data?.monthlySavings || 0))}
              </p>
            </div>
          </div>
          
          {/* Savings Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Savings Rate</span>
              <span>
                {data?.monthlyIncome > 0 
                  ? `${Math.round((data.monthlySavings / data.monthlyIncome) * 100)}%` 
                  : "0%"}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  (data?.monthlySavings || 0) >= 0 ? "bg-gradient-to-r from-emerald-500 to-teal-400" : "bg-gradient-to-r from-rose-500 to-pink-400"
                }`}
                style={{ 
                  width: `${Math.min(Math.abs(data?.monthlyIncome > 0 ? (data.monthlySavings / data.monthlyIncome) * 100 : 0), 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Goals Widget */}
        <div 
          className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 backdrop-blur-sm rounded-2xl p-5 border border-violet-500/20 cursor-pointer transition-all hover:from-violet-600/30 hover:to-purple-600/30"
          onClick={() => navigate("/my-goals")}
          data-testid="goals-widget"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Financial Goals</h3>
                <p className="text-white/50 text-xs">
                  {goalsSummary?.totalActiveGoals || 0} active goals
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/50" />
          </div>
          
          {goalsSummary?.goals && goalsSummary.goals.length > 0 ? (
            <div className="space-y-3">
              {goalsSummary.goals.slice(0, 2).map((goal) => (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/80 text-sm font-medium truncate max-w-[150px]">
                        {goal.goalName}
                      </span>
                      <span className="text-white text-sm font-bold">
                        {goal.progressPercent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          goal.progressPercent >= 75 ? "bg-emerald-400" :
                          goal.progressPercent >= 50 ? "bg-amber-400" : "bg-violet-400"
                        }`}
                        style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {goalsSummary.totalActiveGoals > 2 && (
                <p className="text-white/40 text-xs text-center pt-1">
                  +{goalsSummary.totalActiveGoals - 2} more goals
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-white/60 text-sm">No active goals yet</p>
              <p className="text-violet-300 text-xs mt-1">Tap to create your first goal</p>
            </div>
          )}
        </div>

        {/* Empty State - When no data */}
        {data && data.assetCount === 0 && data.investmentCount === 0 && data.accountCount === 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center" data-testid="empty-state">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00D09C] to-[#10B981] flex items-center justify-center">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">Start Your Financial Journey</h3>
            <p className="text-white/60 text-sm mb-6">
              Add your assets, investments, and accounts to see your complete financial picture.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => navigate("/asset")}
                className="px-4 py-2 rounded-xl bg-[#00D09C] text-white font-medium text-sm transition-all hover:bg-[#00BA89] active:scale-95"
              >
                Add Asset
              </button>
              <button
                onClick={() => navigate("/investment")}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-sm transition-all hover:bg-white/20 active:scale-95"
              >
                Add Investment
              </button>
              <button
                onClick={() => navigate("/account")}
                className="px-4 py-2 rounded-xl bg-white/10 text-white font-medium text-sm transition-all hover:bg-white/20 active:scale-95"
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

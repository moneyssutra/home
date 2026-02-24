import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, TrendingUp, TrendingDown, PieChart, BarChart3, 
  Wallet, CreditCard, Building2, PiggyBank, RefreshCw,
  DollarSign, Home, Briefcase, Target
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Analytics = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("6M");
  const [data, setData] = useState({
    netWorth: 0,
    netWorthChange: 0,
    totalAssets: 0,
    totalInvestments: 0,
    totalLoans: 0,
    totalCreditCards: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    savingsRate: 0,
    liquidBalance: 0
  });
  const [investmentPerf, setInvestmentPerf] = useState({
    totalInvested: 0,
    currentValue: 0,
    totalGains: 0,
    gainPercent: 0,
    byCategory: {}
  });
  const [snapshots, setSnapshots] = useState([]);

  const timeFilters = ["1M", "3M", "6M", "1Y", "All"];
  const monthsMap = { "1M": 1, "3M": 3, "6M": 6, "1Y": 12, "All": 24 };

  useEffect(() => {
    fetchAllData();
  }, [timeFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Add timeout to prevent hanging
      const timeout = 10000; // 10 seconds
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const [networthRes, investmentRes, snapshotsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/dashboard/networth`, { withCredentials: true, signal: controller.signal }),
        axios.get(`${backendUrl}/api/analytics/investment-performance`, { withCredentials: true, signal: controller.signal }),
        axios.get(`${backendUrl}/api/analytics/snapshots?months=${monthsMap[timeFilter]}`, { withCredentials: true, signal: controller.signal })
      ]);
      
      clearTimeout(timeoutId);
      
      const monthlyIncome = networthRes.data.monthlyIncome || 0;
      const monthlyExpense = networthRes.data.monthlyExpense || 0;
      const surplus = monthlyIncome - monthlyExpense;
      const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
      
      let netWorthChange = 0;
      const snapshotData = snapshotsRes.data || [];
      if (snapshotData.length >= 2) {
        const latest = snapshotData[0]?.netWorth || 0;
        const previous = snapshotData[snapshotData.length - 1]?.netWorth || 0;
        if (previous > 0) {
          netWorthChange = ((latest - previous) / previous * 100).toFixed(1);
        }
      }
      
      setData({
        netWorth: networthRes.data.netWorth || 0,
        netWorthChange: parseFloat(netWorthChange) || 0,
        totalAssets: networthRes.data.totalAssets || 0,
        totalInvestments: networthRes.data.totalInvestments || 0,
        totalLoans: networthRes.data.totalLiabilities || 0,
        totalCreditCards: networthRes.data.creditCardDue || 0,
        liquidBalance: networthRes.data.liquidBalance || 0,
        monthlyIncome,
        monthlyExpense,
        savingsRate
      });
      
      setInvestmentPerf(investmentRes.data || {
        totalInvested: 0,
        currentValue: 0,
        totalGains: 0,
        gainPercent: 0,
        byCategory: {}
      });
      
      setSnapshots(snapshotData.reverse());
      
      // Create snapshot silently in background
      axios.post(`${backendUrl}/api/analytics/snapshot`, {}, { withCredentials: true }).catch(() => {});
      
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      // Show page with default values even if API fails
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "0";
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return amount.toFixed(0);
  };

  // Generate sample bar data (12 bars representing months)
  const generateBars = (currentValue, trend = "up") => {
    const bars = [];
    const baseValue = currentValue * 0.7;
    for (let i = 0; i < 12; i++) {
      const variance = Math.random() * 0.3;
      const trendFactor = trend === "up" ? (i / 12) * 0.3 : (1 - i / 12) * 0.3;
      bars.push(baseValue * (1 + variance + trendFactor));
    }
    return bars;
  };

  const renderBarsChart = (bars, color, height = 80) => {
    const maxBar = Math.max(...bars, 1);
    return (
      <div className="flex items-end gap-1 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", height: `${height}px` }}>
        {bars.map((value, i) => (
          <div 
            key={i}
            className="flex-1 rounded-t transition-all"
            style={{ 
              height: `${Math.max((value / maxBar) * 100, 5)}%`,
              backgroundColor: i === bars.length - 1 ? color : `${color}40`
            }}
          />
        ))}
      </div>
    );
  };

  // Metric cards with bars
  const metricCards = [
    { 
      title: "Net Worth", 
      value: data.netWorth, 
      change: data.netWorthChange,
      color: "#10B981", 
      icon: Wallet,
      trend: "up"
    },
    { 
      title: "Total Assets", 
      value: data.totalAssets, 
      change: 5.2,
      color: "#3B82F6", 
      icon: Home,
      trend: "up"
    },
    { 
      title: "Investments", 
      value: data.totalInvestments, 
      change: investmentPerf.gainPercent,
      color: "#8B5CF6", 
      icon: PiggyBank,
      trend: investmentPerf.gainPercent >= 0 ? "up" : "down"
    },
    { 
      title: "Monthly Income", 
      value: data.monthlyIncome, 
      change: 3.5,
      color: "#059669", 
      icon: TrendingUp,
      trend: "up"
    },
    { 
      title: "Monthly Expense", 
      value: data.monthlyExpense, 
      change: -2.1,
      color: "#EF4444", 
      icon: TrendingDown,
      trend: "down"
    },
    { 
      title: "Total Loans", 
      value: data.totalLoans + data.totalCreditCards, 
      change: -4.5,
      color: "#F59E0B", 
      icon: CreditCard,
      trend: "down"
    },
    { 
      title: "Cash Flow", 
      value: data.monthlyIncome - data.monthlyExpense, 
      change: parseFloat(data.savingsRate) || 0,
      color: "#06B6D4", 
      icon: BarChart3,
      trend: (data.monthlyIncome - data.monthlyExpense) >= 0 ? "up" : "down"
    },
    { 
      title: "Liquid Balance", 
      value: data.liquidBalance, 
      change: 1.2,
      color: "#EC4899", 
      icon: DollarSign,
      trend: "up"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate wealth breakdown percentages
  const totalWealth = data.totalAssets + data.totalInvestments + data.liquidBalance;
  const assetPercent = totalWealth > 0 ? ((data.totalAssets / totalWealth) * 100).toFixed(0) : 33;
  const investmentPercent = totalWealth > 0 ? ((data.totalInvestments / totalWealth) * 100).toFixed(0) : 33;
  const liquidPercent = totalWealth > 0 ? ((data.liquidBalance / totalWealth) * 100).toFixed(0) : 34;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="analytics-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/insights", { replace: true })}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics</h1>
        </div>
        <button
          onClick={fetchAllData}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
        >
          <RefreshCw className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </button>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-4">
        {/* Time Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                timeFilter === filter ? "text-white" : ""
              }`}
              style={{
                backgroundColor: timeFilter === filter ? "var(--brand-primary)" : "var(--bg-card)",
                color: timeFilter === filter ? "white" : "var(--text-secondary)",
                border: timeFilter === filter ? "none" : "1px solid var(--border-light)"
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Metric Cards Grid - All with bars */}
        <div className="grid grid-cols-2 gap-3">
          {metricCards.map((metric) => {
            const Icon = metric.icon;
            const bars = generateBars(metric.value, metric.trend);
            const isPositive = metric.change >= 0;
            
            return (
              <div 
                key={metric.title}
                className="rounded-2xl p-4"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: metric.color }} />
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{metric.title}</span>
                  </div>
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {isPositive ? "+" : ""}{metric.change}%
                  </div>
                </div>
                <p className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(metric.value)}
                </p>
                {renderBarsChart(bars, metric.color, 50)}
              </div>
            );
          })}
        </div>

        {/* Wealth Breakdown */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Wealth Breakdown</h3>
          
          {/* Stacked Bar */}
          <div className="h-8 rounded-full overflow-hidden flex mb-4" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="h-full transition-all" style={{ width: `${assetPercent}%`, backgroundColor: "#3B82F6" }} />
            <div className="h-full transition-all" style={{ width: `${investmentPercent}%`, backgroundColor: "#8B5CF6" }} />
            <div className="h-full transition-all" style={{ width: `${liquidPercent}%`, backgroundColor: "#EC4899" }} />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3B82F6" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Assets</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalAssets)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#8B5CF6" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Investments</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalInvestments)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: "#EC4899" }} />
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Liquid</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.liquidBalance)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Investment Performance */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
              <PiggyBank className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Investment Performance</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Invested</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(investmentPerf.totalInvested)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Current Value</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(investmentPerf.currentValue)}</p>
            </div>
          </div>
          
          {/* Gain/Loss indicator */}
          <div className="p-3 rounded-xl" style={{ backgroundColor: investmentPerf.totalGains >= 0 ? "rgba(5, 150, 105, 0.1)" : "rgba(239, 68, 68, 0.1)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Returns</p>
                <p className="text-xl font-bold" style={{ color: investmentPerf.totalGains >= 0 ? "#059669" : "#EF4444" }}>
                  {investmentPerf.totalGains >= 0 ? "+" : ""}₹{formatAmount(Math.abs(investmentPerf.totalGains))}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${investmentPerf.gainPercent >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                {investmentPerf.gainPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {investmentPerf.gainPercent >= 0 ? "+" : ""}{investmentPerf.gainPercent}%
              </div>
            </div>
          </div>
          
          {/* Category breakdown as pie chart simulation */}
          {Object.keys(investmentPerf.byCategory || {}).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>By Category</p>
              <div className="space-y-2">
                {Object.entries(investmentPerf.byCategory).slice(0, 6).map(([cat, vals], idx) => {
                  const colors = ["#8B5CF6", "#3B82F6", "#059669", "#F59E0B", "#EF4444", "#EC4899"];
                  const total = Object.values(investmentPerf.byCategory).reduce((sum, v) => sum + v.current, 0);
                  const percent = total > 0 ? ((vals.current / total) * 100).toFixed(0) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx % colors.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "var(--text-secondary)" }}>{cat}</span>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{percent}%</span>
                        </div>
                        <div className="h-1.5 rounded-full mt-1" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: colors[idx % colors.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expense Breakdown Donut Chart */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <PieChart className="h-5 w-5" style={{ color: "#EF4444" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Expense Analysis</h3>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EF4444" strokeWidth="12" strokeDasharray="80 170" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="50 200" strokeDashoffset="-80" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="40 210" strokeDashoffset="-130" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="30 220" strokeDashoffset="-170" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.monthlyExpense)}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total</p>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex-1 space-y-2">
              {[
                { name: "Bills & EMIs", percent: 32, color: "#EF4444" },
                { name: "Food & Dining", percent: 20, color: "#F59E0B" },
                { name: "Shopping", percent: 16, color: "#3B82F6" },
                { name: "Others", percent: 32, color: "#8B5CF6" }
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Savings Rate Gauge */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <Target className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Savings Rate</h3>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Semi-circular gauge */}
            <div className="relative w-32 h-16 overflow-hidden">
              <div className="absolute w-32 h-32 rounded-full border-8" style={{ borderColor: "var(--bg-subtle)", borderBottomColor: "transparent", borderLeftColor: "transparent", transform: "rotate(45deg)" }} />
              <div 
                className="absolute w-32 h-32 rounded-full border-8 transition-all"
                style={{ 
                  borderColor: parseFloat(data.savingsRate) >= 20 ? "#059669" : "#F59E0B",
                  borderBottomColor: "transparent",
                  borderLeftColor: "transparent",
                  transform: `rotate(${45 + (Math.min(parseFloat(data.savingsRate) || 0, 100) * 1.8)}deg)`
                }}
              />
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <p className="text-2xl font-bold" style={{ color: parseFloat(data.savingsRate) >= 20 ? "#059669" : "#F59E0B" }}>
                  {data.savingsRate}%
                </p>
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {parseFloat(data.savingsRate) >= 30 ? "Excellent!" : parseFloat(data.savingsRate) >= 20 ? "Good" : parseFloat(data.savingsRate) >= 10 ? "Fair" : "Needs Improvement"}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                Monthly surplus: ₹{formatAmount(data.monthlyIncome - data.monthlyExpense)}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Target: 20-30% savings rate
              </p>
            </div>
          </div>
        </div>
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Analytics;

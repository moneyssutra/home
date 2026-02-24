import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, PieChart, BarChart3, Wallet, CreditCard, Building2, PiggyBank, RefreshCw } from "lucide-react";
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
    savingsRate: 0
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
      // Fetch all data in parallel
      const [networthRes, investmentRes, snapshotsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/dashboard/networth`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/analytics/investment-performance`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/analytics/snapshots?months=${monthsMap[timeFilter]}`, { withCredentials: true })
      ]);
      
      const monthlyIncome = networthRes.data.monthlyIncome || 0;
      const monthlyExpense = networthRes.data.monthlyExpense || 0;
      const surplus = monthlyIncome - monthlyExpense;
      const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
      
      // Calculate net worth change from snapshots
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
      
      setSnapshots(snapshotData.reverse()); // Oldest first for chart
      
      // Create snapshot for current month
      await axios.post(`${backendUrl}/api/analytics/snapshot`, {}, { withCredentials: true });
      
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
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

  // Calculate wealth breakdown percentages
  const totalWealth = data.totalAssets + data.totalInvestments;
  const assetPercent = totalWealth > 0 ? ((data.totalAssets / totalWealth) * 100).toFixed(0) : 50;
  const investmentPercent = totalWealth > 0 ? ((data.totalInvestments / totalWealth) * 100).toFixed(0) : 50;

  // Generate chart bars from snapshots or placeholder data
  const chartBars = snapshots.length > 0 
    ? snapshots.map(s => s.netWorth)
    : [40, 55, 45, 60, 50, 70, 65, 80, 75, 85, 90, 100].map(h => h * 100000);
  
  const maxBar = Math.max(...chartBars, 1);
  const normalizedBars = chartBars.map(b => (b / maxBar) * 100);

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
      <div className="px-4 py-2 space-y-6">
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

        {/* Section 1: Net Worth Growth */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Net Worth Growth</h3>
            <div className={`flex items-center gap-1 text-sm font-medium ${data.netWorthChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              {data.netWorthChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {data.netWorthChange >= 0 ? "+" : ""}{data.netWorthChange}%
            </div>
          </div>
          
          <p className="text-3xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            ₹{formatAmount(data.netWorth)}
          </p>
          
          {/* Chart */}
          <div className="h-32 rounded-xl flex items-end gap-1 p-4" style={{ backgroundColor: "var(--bg-subtle)" }}>
            {normalizedBars.map((height, i) => (
              <div 
                key={i}
                className="flex-1 rounded-t transition-all"
                style={{ 
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: i === normalizedBars.length - 1 ? "var(--brand-primary)" : "var(--brand-primary-soft)"
                }}
              />
            ))}
          </div>
          
          {snapshots.length > 0 && (
            <div className="flex justify-between text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              <span>{snapshots[0]?.month}/{snapshots[0]?.year}</span>
              <span>{snapshots[snapshots.length-1]?.month}/{snapshots[snapshots.length-1]?.year}</span>
            </div>
          )}
          
          {data.netWorth === 0 && (
            <p className="text-center text-sm mt-4" style={{ color: "var(--text-muted)" }}>
              Add assets and investments to see your net worth grow
            </p>
          )}
        </div>

        {/* Section 2: Wealth Breakdown */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Wealth Breakdown</h3>
          
          {/* Stacked Bar */}
          <div className="h-8 rounded-full overflow-hidden flex mb-4" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div 
              className="h-full transition-all" 
              style={{ width: `${assetPercent}%`, backgroundColor: "#3B82F6" }}
            />
            <div 
              className="h-full transition-all" 
              style={{ width: `${investmentPercent}%`, backgroundColor: "#8B5CF6" }}
            />
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#3B82F6" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Assets</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalAssets)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "#8B5CF6" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Investments</p>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalInvestments)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Investment Performance */}
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
          
          {/* Category breakdown */}
          {Object.keys(investmentPerf.byCategory || {}).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>By Category</p>
              {Object.entries(investmentPerf.byCategory).slice(0, 5).map(([cat, vals]) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>{cat}</span>
                  <span className={`font-medium ${vals.current - vals.invested >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {vals.current - vals.invested >= 0 ? "+" : ""}₹{formatAmount(vals.current - vals.invested)}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {investmentPerf.totalInvested === 0 && (
            <p className="text-center text-sm mt-4" style={{ color: "var(--text-muted)" }}>
              Add investments to track performance
            </p>
          )}
        </div>

        {/* Section 4: Loan Reduction */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <CreditCard className="h-5 w-5" style={{ color: "#EF4444" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Loan Tracker</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Outstanding Loans</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalLoans)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Credit Card Due</span>
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.totalCreditCards)}</span>
            </div>
            
            {data.totalLoans === 0 && data.totalCreditCards === 0 ? (
              <p className="text-center text-sm pt-2" style={{ color: "var(--text-muted)" }}>
                No active loans or credit card dues
              </p>
            ) : (
              <div className="pt-2">
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Total Liabilities</p>
                <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>
                  ₹{formatAmount(data.totalLoans + data.totalCreditCards)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Cash Flow Intelligence */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <Wallet className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Cash Flow Intelligence</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <p className="text-xs" style={{ color: "#059669" }}>Monthly Income</p>
              <p className="text-lg font-bold" style={{ color: "#059669" }}>₹{formatAmount(data.monthlyIncome)}</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <p className="text-xs" style={{ color: "#EF4444" }}>Monthly Expense</p>
              <p className="text-lg font-bold" style={{ color: "#EF4444" }}>₹{formatAmount(data.monthlyExpense)}</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Savings Rate</p>
                <p className="text-2xl font-bold" style={{ color: data.savingsRate >= 20 ? "#059669" : "#F59E0B" }}>
                  {data.savingsRate}%
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Monthly Surplus: ₹{formatAmount(data.monthlyIncome - data.monthlyExpense)}
                </p>
              </div>
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ 
                background: `conic-gradient(${data.savingsRate >= 20 ? "#059669" : "#F59E0B"} ${Math.min(data.savingsRate, 100) * 3.6}deg, var(--bg-card) 0deg)`
              }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <TrendingUp className="h-5 w-5" style={{ color: data.savingsRate >= 20 ? "#059669" : "#F59E0B" }} />
                </div>
              </div>
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

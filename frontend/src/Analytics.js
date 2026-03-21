import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, TrendingUp, TrendingDown, PieChart, 
  Wallet, CreditCard, PiggyBank, RefreshCw,
  DollarSign, Home, Target, BarChart3
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useFamilyContext } from "@/context/FamilyContext";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Analytics = () => {
  const navigate = useNavigate();
  const { isPersonalView, isFamilyView, activeViewId, activeViewLabel } = useFamilyContext();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("6M");
  const [data, setData] = useState({
    netWorth: 0,
    totalAssets: 0,
    totalInvestments: 0,
    totalLoans: 0,
    totalCreditCards: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    savingsRate: 0,
    liquidBalance: 0
  });
  const [snapshots, setSnapshots] = useState([]);
  const [investmentPerf, setInvestmentPerf] = useState({
    totalInvested: 0,
    currentValue: 0,
    totalGains: 0,
    gainPercent: 0,
    byCategory: {}
  });

  const timeFilters = ["1M", "3M", "6M", "1Y", "All"];

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [timeFilter, activeViewId]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const timeout = 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      if (isFamilyView) {
        // Family combined view: use combined-summary
        const [combinedRes, snapshotsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/family/combined-summary`, { withCredentials: true, signal: controller.signal }),
          axios.get(`${backendUrl}/api/analytics/snapshots?period=${timeFilter}`, { withCredentials: true, signal: controller.signal }).catch(() => ({ data: [] }))
        ]);
        clearTimeout(timeoutId);
        const cs = combinedRes.data.combinedSummary || {};
        const monthlyIncome = cs.monthlyIncome || 0;
        const monthlyExpense = cs.monthlyExpenses || 0;
        const surplus = monthlyIncome - monthlyExpense;
        const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
        setData({
          netWorth: cs.netWorth || 0,
          totalAssets: cs.totalAssets || 0,
          totalInvestments: cs.totalInvestments || 0,
          totalLoans: cs.totalLoans || 0,
          totalCreditCards: cs.totalCCOutstanding || 0,
          liquidBalance: cs.liquidBalance || 0,
          monthlyIncome,
          monthlyExpense,
          savingsRate
        });
        const snapshotData = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];
        setSnapshots(snapshotData.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
        setInvestmentPerf({ totalInvested: 0, currentValue: cs.totalInvestments || 0, totalGains: 0, gainPercent: 0, byCategory: {} });
      } else if (!isPersonalView) {
        // Individual member view: fetch data using networth endpoint with memberId
        const [networthRes, snapshotsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}&memberId=${activeViewId}`, { withCredentials: true, signal: controller.signal }),
          axios.get(`${backendUrl}/api/analytics/snapshots?period=${timeFilter}&memberId=${activeViewId}`, { withCredentials: true, signal: controller.signal }).catch(() => ({ data: [] }))
        ]);
        clearTimeout(timeoutId);
        const nw = networthRes.data;
        const monthlyIncome = nw.monthlyIncome || 0;
        const monthlyExpense = nw.monthlyExpenses || nw.monthlyExpense || 0;
        const surplus = monthlyIncome - monthlyExpense;
        const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
        setData({
          netWorth: nw.netWorth || 0,
          totalAssets: nw.totalAssets || 0,
          totalInvestments: nw.totalInvestments || 0,
          totalLoans: nw.totalLiabilities || 0,
          totalCreditCards: nw.creditCardOutstanding || 0,
          liquidBalance: nw.liquidBalance || 0,
          monthlyIncome,
          monthlyExpense,
          savingsRate
        });
        const snapshotData = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];
        setSnapshots(snapshotData.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
        setInvestmentPerf({ totalInvested: 0, currentValue: nw.totalInvestments || 0, totalGains: 0, gainPercent: 0, byCategory: {} });
      } else {
        // Personal view: original logic
        const [networthRes, investmentRes, snapshotsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true, signal: controller.signal }),
          axios.get(`${backendUrl}/api/analytics/investment-performance`, { withCredentials: true, signal: controller.signal }),
          axios.get(`${backendUrl}/api/analytics/snapshots?period=${timeFilter}`, { withCredentials: true, signal: controller.signal })
        ]);
        clearTimeout(timeoutId);
        const monthlyIncome = networthRes.data.monthlyIncome || 0;
        const monthlyExpense = networthRes.data.monthlyExpenses || networthRes.data.monthlyExpense || 0;
        const surplus = monthlyIncome - monthlyExpense;
        const savingsRate = monthlyIncome > 0 ? ((surplus / monthlyIncome) * 100).toFixed(1) : 0;
        setData({
          netWorth: networthRes.data.netWorth || 0,
          totalAssets: networthRes.data.totalAssets || 0,
          totalInvestments: networthRes.data.totalInvestments || 0,
          totalLoans: networthRes.data.totalLiabilities || 0,
          totalCreditCards: networthRes.data.creditCardOutstanding || 0,
          liquidBalance: networthRes.data.liquidBalance || 0,
          monthlyIncome,
          monthlyExpense,
          savingsRate
        });
        const snapshotData = Array.isArray(snapshotsRes.data) ? snapshotsRes.data : [];
        setSnapshots(snapshotData.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
        setInvestmentPerf(investmentRes.data || { totalInvested: 0, currentValue: 0, totalGains: 0, gainPercent: 0, byCategory: {} });
        axios.post(`${backendUrl}/api/analytics/snapshot`, {}, { withCredentials: true }).catch(() => {});
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, short = false) => {
    if (!amount && amount !== 0) return "0";
    const absAmount = Math.abs(amount);
    if (short) {
      if (absAmount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
      if (absAmount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
      if (absAmount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
      return amount.toFixed(0);
    }
    if (absAmount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (absAmount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (absAmount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return amount.toFixed(0);
  };

  // Get historical data from snapshots for a specific metric
  const getHistoricalData = (metricKey, currentValue) => {
    const today = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Determine number of points based on time filter
    let numMonths;
    if (timeFilter === "1M") numMonths = 1;
    else if (timeFilter === "3M") numMonths = 3;
    else if (timeFilter === "6M") numMonths = 6;
    else if (timeFilter === "1Y") numMonths = 12;
    else numMonths = 24; // All - show up to 2 years
    
    const dataPoints = [];
    
    // Generate labels for each month in the range
    for (let i = numMonths - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      // Find snapshot for this month/year
      const snapshot = snapshots.find(s => s.month === month && s.year === year);
      
      let value = 0;
      if (snapshot) {
        // Map metric keys to snapshot fields
        const fieldMap = {
          netWorth: 'netWorth',
          totalAssets: 'totalAssets',
          totalInvestments: 'totalInvestments',
          totalLoans: 'totalLiabilities',
          monthlyIncome: 'monthlyIncome',
          monthlyExpense: 'monthlyExpense',
          liquidBalance: 'liquidBalance',
          cashFlow: null // Special case - calculate from income - expense
        };
        
        if (metricKey === 'cashFlow') {
          value = (snapshot.monthlyIncome || 0) - (snapshot.monthlyExpense || 0);
        } else if (fieldMap[metricKey]) {
          value = snapshot[fieldMap[metricKey]] || 0;
        }
      }
      
      // For current month, use live data
      const isCurrentMonth = i === 0;
      if (isCurrentMonth) {
        if (metricKey === 'cashFlow') {
          value = data.monthlyIncome - data.monthlyExpense;
        } else {
          value = currentValue;
        }
      }
      
      let label;
      if (timeFilter === "1M") {
        // For 1M, show week labels
        label = `Week ${numMonths - i}`;
      } else if (timeFilter === "All" && numMonths > 12) {
        // For All, show quarter labels
        const q = Math.floor(date.getMonth() / 3) + 1;
        label = `Q${q}'${year.toString().slice(-2)}`;
      } else {
        label = monthNames[date.getMonth()];
      }
      
      dataPoints.push({
        label,
        value,
        month,
        year,
        isCurrent: isCurrentMonth
      });
    }
    
    return dataPoints;
  };

  // Enhanced bar chart with real historical data
  const MetricCard = ({ title, value, color, icon: Icon, metricKey }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const historicalData = getHistoricalData(metricKey, value);
    const maxValue = Math.max(...historicalData.map(d => d.value), 1);
    const minValue = Math.min(...historicalData.filter(d => d.value > 0).map(d => d.value), 0);
    
    // Calculate change from first non-zero to last
    const firstNonZero = historicalData.find(d => d.value > 0);
    const firstValue = firstNonZero?.value || 0;
    const changePercent = firstValue > 0 
      ? (((value - firstValue) / firstValue) * 100).toFixed(1) 
      : 0;
    const isPositive = changePercent >= 0;
    
    // Check if we have any historical data
    const hasHistoricalData = historicalData.some(d => d.value > 0 && !d.isCurrent);
    
    return (
      <div 
        className="rounded-2xl p-4" 
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
        data-testid={`metric-card-${metricKey}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{title}</span>
          </div>
          {hasHistoricalData && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? "+" : ""}{changePercent}%
            </div>
          )}
        </div>
        
        {/* Current Value */}
        <p className="text-2xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          ₹{formatAmount(value)}
        </p>
        
        {/* Chart with hover values */}
        <div className="relative">
          {/* Hovered value tooltip */}
          {hoveredIndex !== null && historicalData[hoveredIndex] && (
            <div 
              className="absolute -top-8 px-2 py-1 rounded-lg text-xs font-medium z-10 whitespace-nowrap"
              style={{ 
                backgroundColor: color, 
                color: "white",
                left: `${(hoveredIndex / Math.max(historicalData.length - 1, 1)) * 100}%`,
                transform: "translateX(-50%)"
              }}
            >
              ₹{formatAmount(historicalData[hoveredIndex]?.value, true)}
            </div>
          )}
          
          {/* Bars */}
          <div className="flex items-end gap-1 h-16 mb-1">
            {historicalData.map((point, i) => {
              const height = maxValue > 0 
                ? (point.value / maxValue) * 100 
                : 0;
              
              return (
                <div 
                  key={i}
                  className="flex-1 rounded-t cursor-pointer transition-all hover:opacity-80"
                  style={{ 
                    height: `${Math.max(height, point.value > 0 ? 10 : 2)}%`,
                    backgroundColor: point.value === 0 ? "var(--border-light)" : (point.isCurrent ? color : `${color}40`),
                    transform: hoveredIndex === i ? 'scaleY(1.05)' : 'scaleY(1)'
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  onClick={() => setHoveredIndex(hoveredIndex === i ? null : i)}
                  data-testid={`bar-${metricKey}-${i}`}
                />
              );
            })}
          </div>
          
          {/* Labels - only show unique, evenly spaced labels */}
          <div className="flex justify-between">
            {(() => {
              // Calculate which indices should show labels
              const total = historicalData.length;
              const maxLabels = timeFilter === "All" ? 6 : timeFilter === "1Y" ? 6 : total;
              const step = Math.max(1, Math.ceil(total / maxLabels));
              // Track shown labels to avoid duplicates
              const shown = new Set();
              
              return historicalData.map((point, i) => {
                const showLabel = (i % step === 0 || i === total - 1) && !shown.has(point.label);
                if (showLabel) shown.add(point.label);
                
                return (
                  <span 
                    key={i} 
                    className="text-[9px] text-center flex-1"
                    style={{ 
                      color: hoveredIndex === i ? color : "var(--text-muted)",
                      fontWeight: hoveredIndex === i || point.isCurrent ? "600" : "400",
                      visibility: showLabel ? "visible" : "hidden"
                    }}
                  >
                    {point.label}
                  </span>
                );
              });
            })()}
          </div>
          
          {/* Data status indicator */}
          <div className="flex justify-between mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            {hasHistoricalData ? (
              <>
                <span>First: ₹{formatAmount(firstValue, true)}</span>
                <span>Now: ₹{formatAmount(value, true)}</span>
              </>
            ) : (
              <span className="w-full text-center italic">No historical data yet</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Metric definitions with keys matching snapshot fields
  const metrics = [
    { title: "Net Worth", value: data.netWorth, color: "#10B981", icon: Wallet, metricKey: "netWorth" },
    { title: "Total Assets", value: data.totalAssets, color: "#3B82F6", icon: Home, metricKey: "totalAssets" },
    { title: "Investments", value: data.totalInvestments, color: "#8B5CF6", icon: PiggyBank, metricKey: "totalInvestments" },
    { title: "Monthly Income", value: data.monthlyIncome, color: "#059669", icon: TrendingUp, metricKey: "monthlyIncome" },
    { title: "Monthly Expense", value: data.monthlyExpense, color: "#EF4444", icon: TrendingDown, metricKey: "monthlyExpense" },
    { title: "Total Loans", value: data.totalLoans + data.totalCreditCards, color: "#F59E0B", icon: CreditCard, metricKey: "totalLoans" },
    { title: "Cash Flow", value: data.monthlyIncome - data.monthlyExpense, color: "#06B6D4", icon: BarChart3, metricKey: "cashFlow" },
    { title: "Liquid Balance", value: data.liquidBalance, color: "#EC4899", icon: DollarSign, metricKey: "liquidBalance" }
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

  // Wealth breakdown percentages
  const totalWealth = data.totalAssets + data.totalInvestments + data.liquidBalance;
  const assetPercent = totalWealth > 0 ? ((data.totalAssets / totalWealth) * 100).toFixed(0) : 33;
  const investmentPercent = totalWealth > 0 ? ((data.totalInvestments / totalWealth) * 100).toFixed(0) : 33;
  const liquidPercent = totalWealth > 0 ? ((data.liquidBalance / totalWealth) * 100).toFixed(0) : 34;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="analytics-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center justify-between" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/insights", { replace: true })} className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100" data-testid="back-button">
            <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{isFamilyView ? `${activeViewLabel} Analytics` : !isPersonalView ? `${activeViewLabel}'s Analytics` : "Analytics"}</h1>
        </div>
        <button onClick={fetchAllData} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100" data-testid="refresh-button">
          <RefreshCw className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </button>
      </header>

      <div className="px-4 py-2 space-y-4">
        {/* Time Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: timeFilter === filter ? "var(--brand-primary)" : "var(--bg-card)",
                color: timeFilter === filter ? "white" : "var(--text-secondary)",
                border: timeFilter === filter ? "none" : "1px solid var(--border-light)"
              }}
              data-testid={`filter-${filter}`}
            >
              {filter}
            </button>
          ))}
        </div>
        
        {/* Info Banner */}
        <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
          Tap on any bar to see the value for that period. Data is based on monthly snapshots.
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        {/* Wealth Breakdown */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Wealth Breakdown</h3>
          <div className="h-10 rounded-full overflow-hidden flex mb-4" style={{ backgroundColor: "var(--bg-subtle)" }}>
            {Number(assetPercent) > 0 && (
              <div className="h-full transition-all flex items-center justify-center text-xs font-medium text-white" style={{ width: `${assetPercent}%`, backgroundColor: "#3B82F6", minWidth: Number(assetPercent) > 0 ? "40px" : "0" }}>
                {assetPercent}%
              </div>
            )}
            {Number(investmentPercent) > 0 && (
              <div className="h-full transition-all flex items-center justify-center text-xs font-medium text-white" style={{ width: `${investmentPercent}%`, backgroundColor: "#8B5CF6", minWidth: Number(investmentPercent) > 0 ? "40px" : "0" }}>
                {investmentPercent}%
              </div>
            )}
            {Number(liquidPercent) > 0 && (
              <div className="h-full transition-all flex items-center justify-center text-xs font-medium text-white" style={{ width: `${liquidPercent}%`, backgroundColor: "#EC4899", minWidth: Number(liquidPercent) > 0 ? "40px" : "0" }}>
                {liquidPercent}%
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Assets", value: data.totalAssets, color: "#3B82F6" },
              { label: "Investments", value: data.totalInvestments, color: "#8B5CF6" },
              { label: "Liquid", value: data.liquidBalance, color: "#EC4899" }
            ].map((item) => (
              <div key={item.label} className="text-center p-3 rounded-xl" style={{ backgroundColor: `${item.color}10` }}>
                <div className="w-3 h-3 rounded mx-auto mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
                <p className="text-sm font-bold mt-1" style={{ color: "var(--text-primary)" }}>₹{formatAmount(item.value)}</p>
              </div>
            ))}
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
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Invested</p>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(investmentPerf.totalInvested)}</p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Current Value</p>
              <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(investmentPerf.currentValue)}</p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl" style={{ backgroundColor: investmentPerf.totalGains >= 0 ? "rgba(5, 150, 105, 0.1)" : "rgba(239, 68, 68, 0.1)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total Returns</p>
                <p className="text-2xl font-bold" style={{ color: investmentPerf.totalGains >= 0 ? "#059669" : "#EF4444" }}>
                  {investmentPerf.totalGains >= 0 ? "+" : ""}₹{formatAmount(Math.abs(investmentPerf.totalGains))}
                </p>
              </div>
              <div className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold ${investmentPerf.gainPercent >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                {investmentPerf.gainPercent >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {investmentPerf.gainPercent >= 0 ? "+" : ""}{investmentPerf.gainPercent}%
              </div>
            </div>
          </div>
          
          {Object.keys(investmentPerf.byCategory || {}).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>By Category</p>
              <div className="space-y-3">
                {Object.entries(investmentPerf.byCategory).slice(0, 6).map(([cat, vals], idx) => {
                  const colors = ["#8B5CF6", "#3B82F6", "#059669", "#F59E0B", "#EF4444", "#EC4899"];
                  const total = Object.values(investmentPerf.byCategory).reduce((sum, v) => sum + v.current, 0);
                  const percent = total > 0 ? ((vals.current / total) * 100).toFixed(0) : 0;
                  const gain = vals.current - vals.invested;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[idx % colors.length] }} />
                      <div className="flex-1">
                        <div className="flex justify-between text-sm">
                          <span style={{ color: "var(--text-secondary)" }}>{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: "var(--text-primary)" }}>₹{formatAmount(vals.current, true)}</span>
                            <span className={`text-xs ${gain >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {gain >= 0 ? "+" : ""}{formatAmount(gain, true)}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full mt-1" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: colors[idx % colors.length] }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expense Donut */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <PieChart className="h-5 w-5" style={{ color: "#EF4444" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Expense Analysis</h3>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#EF4444" strokeWidth="12" strokeDasharray="80 170" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="50 200" strokeDashoffset="-80" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="40 210" strokeDashoffset="-130" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="12" strokeDasharray="30 220" strokeDashoffset="-170" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.monthlyExpense, true)}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Total</p>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {[
                { name: "Bills & EMIs", percent: 32, color: "#EF4444", amount: data.monthlyExpense * 0.32 },
                { name: "Food & Dining", percent: 20, color: "#F59E0B", amount: data.monthlyExpense * 0.20 },
                { name: "Shopping", percent: 16, color: "#3B82F6", amount: data.monthlyExpense * 0.16 },
                { name: "Others", percent: 32, color: "#8B5CF6", amount: data.monthlyExpense * 0.32 }
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>₹{formatAmount(item.amount, true)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Savings Summary */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <Target className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>Savings Summary</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <p className="text-2xl font-bold" style={{ color: "#059669" }}>{data.savingsRate}%</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Savings Rate</p>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-lg font-bold" style={{ color: (data.monthlyIncome - data.monthlyExpense) >= 0 ? "#059669" : "#EF4444" }}>
                ₹{formatAmount(data.monthlyIncome - data.monthlyExpense, true)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Monthly Surplus</p>
            </div>
            <div className="text-center p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                ₹{formatAmount((data.monthlyIncome - data.monthlyExpense) * 12, true)}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Yearly Potential</p>
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

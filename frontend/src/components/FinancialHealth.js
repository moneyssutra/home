import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Heart,
  PiggyBank,
  CreditCard,
  Home,
  TrendingUp,
  TrendingDown,
  Target,
  Wallet,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Activity,
  HelpCircle
} from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

// Status colors
const STATUS_COLORS = {
  Excellent: { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  Good: { bg: "#D1FAE5", text: "#047857", border: "#6EE7B7" },
  Healthy: { bg: "#D1FAE5", text: "#047857", border: "#6EE7B7" },
  Adequate: { bg: "#D1FAE5", text: "#047857", border: "#6EE7B7" },
  Balanced: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  Moderate: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  Average: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "Needs Improvement": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "Low Coverage": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  Underinsured: { bg: "#FED7AA", text: "#C2410C", border: "#FDBA74" },
  Underexposed: { bg: "#FED7AA", text: "#C2410C", border: "#FDBA74" },
  Overexposed: { bg: "#FED7AA", text: "#C2410C", border: "#FDBA74" },
  High: { bg: "#FED7AA", text: "#C2410C", border: "#FDBA74" },
  "High Risk": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "High Leverage": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  Critical: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  Dangerous: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  Weak: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "At Risk": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "Not Covered": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "N/A": { bg: "#F3F4F6", text: "#6B7280", border: "#D1D5DB" },
  Stable: { bg: "#D1FAE5", text: "#047857", border: "#6EE7B7" }
};

const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS["N/A"];
};

const getStatusIcon = (status) => {
  if (["Excellent", "Good", "Healthy", "Adequate", "Balanced", "Stable"].includes(status)) {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  if (["Critical", "Dangerous", "High Risk", "High Leverage", "At Risk", "Not Covered", "Weak"].includes(status)) {
    return <AlertTriangle className="h-4 w-4" />;
  }
  return <AlertCircle className="h-4 w-4" />;
};

// Calculation explanations for each metric
const METRIC_EXPLANATIONS = {
  emergencyFund: {
    current: "Sum of all your liquid funds (bank accounts + liquid mutual funds + FDs)",
    benchmark: "6 months of essential expenses (fixed bills + EMIs + insurance premiums)",
    gap: "Benchmark minus Current. If negative, you have excess emergency fund"
  },
  lifeInsurance: {
    current: "Total sum assured from all your term life insurance policies",
    benchmark: "12x your annual income (conservative multiplier for family protection)",
    gap: "Benchmark minus Current coverage. Indicates additional cover needed"
  },
  healthInsurance: {
    current: "Total sum insured from all your health/mediclaim policies",
    benchmark: "₹10 Lakh recommended per adult (metro city standard)",
    gap: "Benchmark minus Current coverage"
  },
  investmentAllocation: {
    current: "Percentage of equity investments (stocks, equity MF, ELSS) in your total portfolio",
    benchmark: "(100 - Your Age)% is recommended equity allocation. Minimum 30%",
    gap: "Difference between recommended and actual equity percentage"
  },
  creditUtilization: {
    current: "(Credit Card Outstanding ÷ Total Credit Limit) × 100",
    benchmark: "Below 30% is ideal for maintaining a good credit score",
    gap: "How much above the 30% threshold you are"
  },
  loanBurden: {
    current: "(Total Monthly EMIs ÷ Monthly Income) × 100",
    benchmark: "Below 20% is healthy. Banks may not lend if above 50%",
    gap: "How much above the 20% healthy limit"
  },
  debtToAsset: {
    current: "(Total Loans + CC Outstanding) ÷ (Assets + Investments + Cash) × 100",
    benchmark: "Below 40% indicates stable financial position",
    gap: "How much above the 40% stable limit"
  },
  savingsRate: {
    current: "(Monthly Income - Monthly Expenses) ÷ Monthly Income × 100",
    benchmark: "Above 35% is excellent for wealth building",
    gap: "How much below the 35% excellent threshold"
  },
  retirementReadiness: {
    current: "Sum of retirement-tagged investments (NPS, EPF, PPF) or 30% of total investments",
    benchmark: "25x Annual Expenses (based on 4% safe withdrawal rule)",
    gap: "Remaining corpus needed to achieve retirement goal"
  },
  netWorthTrend: {
    current: "Total Assets + Investments + Cash - All Liabilities",
    benchmark: "Previous month's net worth for comparison",
    gap: "Month-over-month percentage change"
  }
};

const FinancialHealth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [overallScore, setOverallScore] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/financial-health`, { withCredentials: true });
      setHealthData(response.data);
      setOverallScore(response.data.overallScore || 0);
    } catch (error) {
      console.error("Error fetching financial health:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (key) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
    setActiveTooltip(null);
  };

  const toggleAllCards = (moduleKeys) => {
    if (allExpanded) {
      setExpandedCards({});
      setAllExpanded(false);
      setActiveTooltip(null);
    } else {
      const expanded = {};
      moduleKeys.forEach(k => expanded[k] = true);
      setExpandedCards(expanded);
      setAllExpanded(true);
    }
  };

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return "0";
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (absAmount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (absAmount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(Math.round(amount));
  };

  const getScoreRating = (score) => {
    if (score >= 80) return { label: "Excellent", color: "#166534" };
    if (score >= 60) return { label: "Good", color: "#047857" };
    if (score >= 40) return { label: "Needs Attention", color: "#92400E" };
    return { label: "At Risk", color: "#991B1B" };
  };

  // Tooltip Component - uses fixed positioning to avoid overflow clipping
  const Tooltip = ({ explanation, onClose }) => (
    <div 
      className="absolute left-0 right-0 mt-1 p-3 rounded-lg shadow-lg text-xs leading-relaxed"
      style={{ backgroundColor: "#1F2937", color: "#F9FAFB", zIndex: 60, top: "100%" }}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-1 right-2 text-gray-400 hover:text-white"
      >
        &times;
      </button>
      <p>{explanation}</p>
    </div>
  );

  // Value Box with Tooltip
  const ValueBox = ({ label, value, explanation, metricKey, boxType }) => {
    const tooltipKey = `${metricKey}-${boxType}`;
    const isActive = activeTooltip === tooltipKey;
    
    return (
      <div className="relative p-2 rounded-lg bg-white/50">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "inherit", opacity: 0.8 }}>
            {label}
          </p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setActiveTooltip(isActive ? null : tooltipKey);
            }}
            className="p-0.5 rounded hover:bg-white/30 transition-colors"
          >
            <HelpCircle className="h-3 w-3" style={{ opacity: 0.6 }} />
          </button>
        </div>
        <p className="text-sm font-bold" style={{ color: "inherit" }}>
          {value}
        </p>
        {isActive && (
          <Tooltip 
            explanation={explanation} 
            onClose={() => setActiveTooltip(null)} 
          />
        )}
      </div>
    );
  };

  const healthModules = healthData ? [
    {
      key: "emergencyFund",
      title: "Emergency Fund",
      icon: Shield,
      iconColor: "#059669",
      current: healthData.emergencyFund?.current || 0,
      target: healthData.emergencyFund?.target || 0,
      gap: healthData.emergencyFund?.gap || 0,
      status: healthData.emergencyFund?.status || "N/A",
      action: healthData.emergencyFund?.action || "",
      format: "amount"
    },
    {
      key: "lifeInsurance",
      title: "Life Insurance",
      icon: Shield,
      iconColor: "#8B5CF6",
      current: healthData.lifeInsurance?.current || 0,
      target: healthData.lifeInsurance?.target || 0,
      gap: healthData.lifeInsurance?.gap || 0,
      status: healthData.lifeInsurance?.status || "N/A",
      action: healthData.lifeInsurance?.action || "",
      format: "amount"
    },
    {
      key: "healthInsurance",
      title: "Health Insurance",
      icon: Heart,
      iconColor: "#EF4444",
      current: healthData.healthInsurance?.current || 0,
      target: healthData.healthInsurance?.target || 0,
      gap: healthData.healthInsurance?.gap || 0,
      status: healthData.healthInsurance?.status || "N/A",
      action: healthData.healthInsurance?.action || "",
      format: "amount"
    },
    {
      key: "investmentAllocation",
      title: "Investment Allocation",
      icon: PiggyBank,
      iconColor: "#3B82F6",
      current: healthData.investmentAllocation?.actualEquity || 0,
      target: healthData.investmentAllocation?.recommendedEquity || 0,
      gap: healthData.investmentAllocation?.gap || 0,
      status: healthData.investmentAllocation?.status || "N/A",
      action: healthData.investmentAllocation?.action || "",
      format: "percent"
    },
    {
      key: "creditUtilization",
      title: "Credit Card Utilization",
      icon: CreditCard,
      iconColor: "#F59E0B",
      current: healthData.creditUtilization?.utilization || 0,
      target: 30,
      gap: Math.max(0, (healthData.creditUtilization?.utilization || 0) - 30),
      status: healthData.creditUtilization?.status || "N/A",
      action: healthData.creditUtilization?.action || "",
      format: "percent"
    },
    {
      key: "loanBurden",
      title: "Loan Burden (EMI Ratio)",
      icon: Home,
      iconColor: "#EC4899",
      current: healthData.loanBurden?.emiRatio || 0,
      target: 20,
      gap: Math.max(0, (healthData.loanBurden?.emiRatio || 0) - 20),
      status: healthData.loanBurden?.status || "N/A",
      action: healthData.loanBurden?.action || "",
      format: "percent",
      extraInfo: healthData.loanBurden ? `Total EMI: ₹${formatAmount(healthData.loanBurden.totalEmi)}/month` : null
    },
    {
      key: "debtToAsset",
      title: "Debt to Asset Ratio",
      icon: Wallet,
      iconColor: "#06B6D4",
      current: healthData.debtToAsset?.ratio || 0,
      target: 40,
      gap: Math.max(0, (healthData.debtToAsset?.ratio || 0) - 40),
      status: healthData.debtToAsset?.status || "N/A",
      action: healthData.debtToAsset?.action || "",
      format: "percent",
      extraInfo: healthData.debtToAsset ? `Debt: ₹${formatAmount(healthData.debtToAsset.totalDebt)} | Worth: ₹${formatAmount(healthData.debtToAsset.totalWorth)}` : null
    },
    {
      key: "savingsRate",
      title: "Savings Rate",
      icon: TrendingUp,
      iconColor: "#10B981",
      current: healthData.savingsRate?.rate || 0,
      target: 35,
      gap: Math.max(0, 35 - (healthData.savingsRate?.rate || 0)),
      status: healthData.savingsRate?.status || "N/A",
      action: healthData.savingsRate?.action || "",
      format: "percent",
      extraInfo: healthData.savingsRate ? `Surplus: ₹${formatAmount(healthData.savingsRate.surplus)}/month` : null
    },
    {
      key: "retirementReadiness",
      title: "Retirement Readiness",
      icon: Target,
      iconColor: "#8B5CF6",
      current: healthData.retirementReadiness?.currentCorpus || 0,
      target: healthData.retirementReadiness?.requiredCorpus || 0,
      progress: healthData.retirementReadiness?.progress || 0,
      status: healthData.retirementReadiness?.status || "N/A",
      action: healthData.retirementReadiness?.action || "",
      format: "amount"
    },
    {
      key: "netWorthTrend",
      title: "Net Worth Trend",
      icon: Activity,
      iconColor: "#14B8A6",
      current: healthData.netWorthTrend?.currentNetWorth || 0,
      previous: healthData.netWorthTrend?.previousNetWorth || 0,
      growth: healthData.netWorthTrend?.growthPercent || 0,
      status: healthData.netWorthTrend?.status || "N/A",
      action: healthData.netWorthTrend?.action || "",
      format: "amount"
    }
  ] : [];

  if (loading) {
    return (
      <div 
        className="rounded-2xl p-5 shadow-card"
        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-black">Financial Health</h3>
            <p className="text-xs text-black/60">Analyzing your finances...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const scoreRating = getScoreRating(overallScore);

  return (
    <div 
      className="rounded-2xl p-5 shadow-card"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
      data-testid="financial-health-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-black">Financial Health</h3>
            <p className="text-xs text-black/60">Rule-based financial assessment</p>
          </div>
        </div>
        {healthModules.length > 0 && (
          <button
            onClick={toggleAllCards}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ 
              backgroundColor: allExpanded ? "#F3F4F6" : "#ECFDF5", 
              color: allExpanded ? "#6B7280" : "#059669"
            }}
            data-testid="toggle-all-health-cards"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        )}
      </div>

      {/* Overall Score */}
      <div className="mb-5 p-4 rounded-xl" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-black/70">Overall Health Score</span>
          <span 
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: getStatusColor(scoreRating.label).bg, color: scoreRating.color }}
          >
            {scoreRating.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold" style={{ color: scoreRating.color }}>
            {overallScore}
          </div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${overallScore}%`,
                  background: overallScore >= 80 ? "#10B981" : overallScore >= 60 ? "#059669" : overallScore >= 40 ? "#F59E0B" : "#EF4444"
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-gray-500">
              <span>0</span>
              <span>40</span>
              <span>60</span>
              <span>80</span>
              <span>100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Health Modules */}
      <div className="space-y-3">
        {healthModules.map((module) => {
          const Icon = module.icon;
          const statusColors = getStatusColor(module.status);
          const isExpanded = expandedCards[module.key];
          const explanations = METRIC_EXPLANATIONS[module.key];
          
          return (
            <div 
              key={module.key}
              className="rounded-xl transition-all relative"
              style={{ 
                backgroundColor: statusColors.bg, 
                border: `1px solid ${statusColors.border}`,
                zIndex: activeTooltip && activeTooltip.startsWith(module.key) ? 20 : 1,
                overflow: activeTooltip && activeTooltip.startsWith(module.key) ? 'visible' : 'hidden'
              }}
            >
              {/* Collapsed Header */}
              <button
                onClick={() => toggleCard(module.key)}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${module.iconColor}20` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: module.iconColor }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: statusColors.text }}>{module.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getStatusIcon(module.status)}
                      <span className="text-xs font-medium" style={{ color: statusColors.text }}>
                        {module.status}
                      </span>
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" style={{ color: statusColors.text }} />
                ) : (
                  <ChevronDown className="h-5 w-5" style={{ color: statusColors.text }} />
                )}
              </button>
              
              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: statusColors.border, color: statusColors.text }}>
                  {/* Value Boxes with Tooltips */}
                  {module.key === "netWorthTrend" ? (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <ValueBox 
                        label="Current" 
                        value={`₹${formatAmount(module.current)}`}
                        explanation={explanations?.current}
                        metricKey={module.key}
                        boxType="current"
                      />
                      <ValueBox 
                        label="Growth" 
                        value={`${module.growth >= 0 ? "+" : ""}${module.growth?.toFixed(1)}%`}
                        explanation={explanations?.gap}
                        metricKey={module.key}
                        boxType="growth"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <ValueBox 
                        label="Current" 
                        value={module.format === "percent" 
                          ? `${module.current?.toFixed(1)}%`
                          : `₹${formatAmount(module.current)}`
                        }
                        explanation={explanations?.current}
                        metricKey={module.key}
                        boxType="current"
                      />
                      <ValueBox 
                        label="Benchmark" 
                        value={module.format === "percent" 
                          ? `${module.target}%`
                          : `₹${formatAmount(module.target)}`
                        }
                        explanation={explanations?.benchmark}
                        metricKey={module.key}
                        boxType="benchmark"
                      />
                    </div>
                  )}
                  
                  {module.gap > 0 && module.key !== "netWorthTrend" && (
                    <div className="mb-3">
                      <ValueBox 
                        label="Gap" 
                        value={module.format === "percent" 
                          ? `${module.gap?.toFixed(1)}%`
                          : `₹${formatAmount(module.gap)}`
                        }
                        explanation={explanations?.gap}
                        metricKey={module.key}
                        boxType="gap"
                      />
                    </div>
                  )}
                  
                  {/* Extra Info (for loan burden, debt ratio, etc.) */}
                  {module.extraInfo && (
                    <div className="p-2 rounded-lg bg-white/30 mb-3">
                      <p className="text-[10px]" style={{ color: statusColors.text }}>
                        {module.extraInfo}
                      </p>
                    </div>
                  )}
                  
                  {module.action && (
                    <div className="p-2 rounded-lg bg-white/70">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: statusColors.text }} />
                        <p className="text-xs leading-relaxed" style={{ color: statusColors.text }}>
                          {module.action}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Compliance Disclaimer */}
      <div className="mt-4 p-3 rounded-xl" style={{ backgroundColor: "#F8FAFC" }}>
        <p className="text-[10px] text-center leading-relaxed" style={{ color: "#6B7280" }}>
          This assessment is based on standard financial planning benchmarks and is for informational purposes only. It does not constitute investment advice.
        </p>
      </div>
    </div>
  );
};

export default FinancialHealth;

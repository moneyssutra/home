import { useState, useEffect, useCallback } from "react";
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
  HelpCircle,
  GripVertical,
  ArrowUpDown,
  ArrowDownUp,
  Check,
  X
} from "lucide-react";
import axios from "axios";
import { useFamilyContext } from "@/context/FamilyContext";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// Sort score for smart ordering: higher rawScore = better performance
const getStatusSortScore = (status) => {
  const scores = {
    "Excellent": 100, "Good": 85, "Healthy": 85, "Adequate": 80, "Balanced": 75,
    "Stable": 75, "Moderate": 50, "Average": 50, "Needs Improvement": 40,
    "Low Coverage": 35, "Underinsured": 30, "Underexposed": 30, "Overexposed": 30,
    "High": 25, "High Risk": 15, "High Leverage": 15, "Critical": 10,
    "Dangerous": 5, "Weak": 5, "At Risk": 5, "Not Covered": 0, "N/A": -1,
  };
  return scores[status] ?? 50;
};

const STORAGE_KEY = "fh_custom_order";

// Sortable wrapper for DnD
const SortableHealthCard = ({ id, children, isReorderMode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  if (!isReorderMode) return children;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-stretch">
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center px-2 rounded-l-xl cursor-grab active:cursor-grabbing touch-none"
          style={{ backgroundColor: "#8B5CF615", borderRight: "1px solid #8B5CF620" }}
          data-testid={`drag-handle-${id}`}
        >
          <GripVertical className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
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

// Extracted card content for reuse in both normal and DnD modes
const HealthCardContent = ({ module, Icon, statusColors, isExpanded, explanations, toggleCard, healthData, formatAmount, ValueBox, activeTooltip, setActiveTooltip }) => (
  <div
    className="rounded-xl overflow-hidden transition-all"
    style={{ backgroundColor: statusColors.bg, border: `1px solid ${statusColors.border}` }}
    data-testid={`health-card-${module.key}`}
  >
    <button onClick={() => toggleCard(module.key)} className="w-full p-3 flex items-center justify-between text-left">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${module.iconColor}20` }}>
          <Icon className="h-4 w-4" style={{ color: module.iconColor }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: statusColors.text }}>{module.title}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {getStatusIcon(module.status)}
            <span className="text-xs font-medium" style={{ color: statusColors.text }}>{module.status}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {healthData?.contributions?.[module.key] && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${module.iconColor}15`, color: module.iconColor }}>
            {healthData.contributions[module.key].contribution}/{healthData.contributions[module.key].maxContribution}
          </span>
        )}
        {isExpanded ? <ChevronUp className="h-5 w-5" style={{ color: statusColors.text }} /> : <ChevronDown className="h-5 w-5" style={{ color: statusColors.text }} />}
      </div>
    </button>
    {isExpanded && (
      <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: statusColors.border, color: statusColors.text }}>
        {module.key === "netWorthTrend" ? (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ValueBox label="Current" value={`₹${formatAmount(module.current)}`} explanation={explanations?.current} metricKey={module.key} boxType="current" />
            <ValueBox label="Growth" value={`${module.growth >= 0 ? "+" : ""}${module.growth?.toFixed(1)}%`} explanation={explanations?.gap} metricKey={module.key} boxType="growth" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <ValueBox label="Current" value={module.format === "percent" ? `${module.current?.toFixed(1)}%` : `₹${formatAmount(module.current)}`} explanation={explanations?.current} metricKey={module.key} boxType="current" />
            <ValueBox label="Benchmark" value={module.format === "percent" ? `${module.target}%` : `₹${formatAmount(module.target)}`} explanation={explanations?.benchmark} metricKey={module.key} boxType="benchmark" />
          </div>
        )}
        {module.gap > 0 && module.key !== "netWorthTrend" && (
          <div className="mb-3">
            <ValueBox label="Gap" value={module.format === "percent" ? `${module.gap?.toFixed(1)}%` : `₹${formatAmount(module.gap)}`} explanation={explanations?.gap} metricKey={module.key} boxType="gap" />
          </div>
        )}
        {module.extraInfo && (
          <div className="p-2 rounded-lg bg-white/30 mb-3"><p className="text-[10px]" style={{ color: statusColors.text }}>{module.extraInfo}</p></div>
        )}
        {module.action && (
          <div className="p-2 rounded-lg bg-white/70">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: statusColors.text }} />
              <p className="text-xs leading-relaxed" style={{ color: statusColors.text }}>{module.action}</p>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

const FinancialHealth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [overallScore, setOverallScore] = useState(0);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [sortMode, setSortMode] = useState("smart"); // "smart" | "custom"
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [customOrder, setCustomOrder] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { isPersonalView } = useFamilyContext();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomOrder(parsed);
          setSortMode("custom");
        }
      } catch {}
    }
    fetchHealthData();
  }, [isPersonalView]);

  const fetchHealthData = async () => {
    if (!isPersonalView) {
      // For member/family views, show 0 score with empty data
      setHealthData(null);
      setOverallScore(0);
      setLoading(false);
      return;
    }
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

  // Tooltip Component - inline display to avoid overlap with other cards
  const Tooltip = ({ explanation, onClose }) => (
    <div 
      className="mt-2 p-3 rounded-lg text-xs leading-relaxed"
      style={{ backgroundColor: "#1F2937", color: "#F9FAFB" }}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="flex-1">{explanation}</p>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-gray-400 hover:text-white flex-shrink-0 ml-2"
        >
          &times;
        </button>
      </div>
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

  // Apply sorting
  const sortedModules = (() => {
    if (healthModules.length === 0) return [];
    if (sortMode === "custom" && customOrder) {
      const orderMap = {};
      customOrder.forEach((key, i) => { orderMap[key] = i; });
      return [...healthModules].sort((a, b) => {
        const ai = orderMap[a.key] ?? 999;
        const bi = orderMap[b.key] ?? 999;
        return ai - bi;
      });
    }
    // Smart sort: by rawScore descending (highest achievement first)
    return [...healthModules].sort((a, b) => {
      const aScore = healthData?.contributions?.[a.key]?.rawScore ?? getStatusSortScore(a.status);
      const bScore = healthData?.contributions?.[b.key]?.rawScore ?? getStatusSortScore(b.status);
      return bScore - aScore;
    });
  })();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedModules.findIndex(m => m.key === active.id);
    const newIndex = sortedModules.findIndex(m => m.key === over.id);
    const reordered = arrayMove(sortedModules, oldIndex, newIndex);
    const newOrder = reordered.map(m => m.key);
    setCustomOrder(newOrder);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    setSortMode("custom");
  };

  const switchToSmart = () => {
    setSortMode("smart");
    setCustomOrder(null);
    localStorage.removeItem(STORAGE_KEY);
    setIsReorderMode(false);
  };

  const enterReorder = () => {
    // Capture current displayed order as starting point
    if (!customOrder) {
      setCustomOrder(sortedModules.map(m => m.key));
    }
    setIsReorderMode(true);
    setSortMode("custom");
  };

  const doneReorder = () => {
    setIsReorderMode(false);
  };

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
        <div className="flex items-center gap-1.5">
          {healthModules.length > 0 && !isReorderMode && (
            <>
              <button
                onClick={sortMode === "smart" ? enterReorder : switchToSmart}
                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: sortMode === "smart" ? "#ECFDF5" : "#F3E8FF",
                  color: sortMode === "smart" ? "#059669" : "#7C3AED"
                }}
                data-testid="sort-mode-btn"
              >
                {sortMode === "smart" ? (
                  <><ArrowDownUp className="h-3.5 w-3.5" />Best First</>
                ) : (
                  <><ArrowDownUp className="h-3.5 w-3.5" />Smart Sort</>
                )}
              </button>
              {sortMode === "custom" && (
                <button
                  onClick={enterReorder}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: "#F3E8FF", color: "#7C3AED" }}
                  data-testid="reorder-health-btn"
                >
                  <GripVertical className="h-3.5 w-3.5" />Reorder
                </button>
              )}
            </>
          )}
          {isReorderMode && (
            <button
              onClick={doneReorder}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-colors"
              style={{ backgroundColor: "#059669" }}
              data-testid="done-reorder-btn"
            >
              <Check className="h-3.5 w-3.5" />Done
            </button>
          )}
          {healthModules.length > 0 && !isReorderMode && (
            <button
              onClick={() => toggleAllCards(healthModules.map(m => m.key))}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ 
                backgroundColor: allExpanded ? "#F3F4F6" : "#ECFDF5", 
                color: allExpanded ? "#6B7280" : "#059669"
              }}
              data-testid="toggle-all-health-cards"
            >
              {allExpanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>

      {/* Reorder mode banner */}
      {isReorderMode && (
        <div className="mb-4 rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: "#F3E8FF", border: "1px solid #DDD6FE" }} data-testid="reorder-mode-banner">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4" style={{ color: "#7C3AED" }} />
            <span className="text-xs font-medium" style={{ color: "#6D28D9" }}>Drag to reorder metrics</span>
          </div>
          <button
            onClick={switchToSmart}
            className="text-xs font-medium px-2 py-1 rounded-lg"
            style={{ color: "#7C3AED", backgroundColor: "#EDE9FE" }}
            data-testid="reset-order-btn"
          >
            Reset to Smart
          </button>
        </div>
      )}

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
        {isReorderMode ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedModules.map(m => m.key)} strategy={verticalListSortingStrategy}>
              {sortedModules.map((module) => {
                const Icon = module.icon;
                const statusColors = getStatusColor(module.status);
                const isExpanded = expandedCards[module.key];
                const explanations = METRIC_EXPLANATIONS[module.key];
                return (
                  <SortableHealthCard key={module.key} id={module.key} isReorderMode={isReorderMode}>
                    <HealthCardContent
                      module={module} Icon={Icon} statusColors={statusColors}
                      isExpanded={isExpanded} explanations={explanations}
                      toggleCard={toggleCard} healthData={healthData}
                      formatAmount={formatAmount} ValueBox={ValueBox}
                      activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip}
                    />
                  </SortableHealthCard>
                );
              })}
            </SortableContext>
          </DndContext>
        ) : (
          sortedModules.map((module) => {
            const Icon = module.icon;
            const statusColors = getStatusColor(module.status);
            const isExpanded = expandedCards[module.key];
            const explanations = METRIC_EXPLANATIONS[module.key];
            return (
              <HealthCardContent
                key={module.key}
                module={module} Icon={Icon} statusColors={statusColors}
                isExpanded={isExpanded} explanations={explanations}
                toggleCard={toggleCard} healthData={healthData}
                formatAmount={formatAmount} ValueBox={ValueBox}
                activeTooltip={activeTooltip} setActiveTooltip={setActiveTooltip}
              />
            );
          })
        )}
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

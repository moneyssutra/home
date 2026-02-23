import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, TrendingUp, Landmark, BarChart3, PiggyBank, Coins, Bitcoin, CircleDollarSign, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useInvestmentList } from "@/hooks/useApi";

// Investment category configurations
const investmentTypeConfig = {
  "fixed-deposit-(fd)": { name: "Fixed Deposit (FD)", icon: Landmark, color: "#3B82F6", bgColor: "#DBEAFE", description: "Bank fixed deposits" },
  "recurring-deposit-(rd)": { name: "Recurring Deposit (RD)", icon: PiggyBank, color: "#6366F1", bgColor: "#E0E7FF", description: "Recurring deposits" },
  "stocks": { name: "Stocks", icon: TrendingUp, color: "#16A34A", bgColor: "#DCFCE7", description: "Equity stocks" },
  "mutual-fund": { name: "Mutual Fund", icon: BarChart3, color: "#8B5CF6", bgColor: "#F3E8FF", description: "Mutual fund investments" },
  "etf": { name: "ETF", icon: BarChart3, color: "#14B8A6", bgColor: "#CCFBF1", description: "Exchange traded funds" },
  "bonds": { name: "Bonds", icon: Landmark, color: "#F59E0B", bgColor: "#FEF3C7", description: "Government and corporate bonds" },
  "sovereign-gold-bond-(sgb)": { name: "Sovereign Gold Bond (SGB)", icon: Coins, color: "#CA8A04", bgColor: "#FEF9C3", description: "Gold bonds" },
  "digital-gold": { name: "Digital Gold", icon: Coins, color: "#EA580C", bgColor: "#FFEDD5", description: "Digital gold investments" },
  "digital-silver": { name: "Digital Silver", icon: Coins, color: "#64748B", bgColor: "#F1F5F9", description: "Digital silver investments" },
  "p2p-lending": { name: "P2P Lending", icon: CircleDollarSign, color: "#DB2777", bgColor: "#FCE7F3", description: "Peer to peer lending" },
  "swp": { name: "SWP", icon: TrendingUp, color: "#0891B2", bgColor: "#CFFAFE", description: "Systematic withdrawal plans" },
  "ulip": { name: "ULIP", icon: BarChart3, color: "#9333EA", bgColor: "#F3E8FF", description: "Unit linked insurance plans" },
  "crypto": { name: "Crypto", icon: Bitcoin, color: "#DC2626", bgColor: "#FEE2E2", description: "Cryptocurrency investments" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6", description: "Other investments" },
};

const InvestmentBreakdown = () => {
  const navigate = useNavigate();
  const { data: investments = [], isLoading: loading } = useInvestmentList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Calculate stats by investment category
  const { totalValue, totalInvested, typeBreakdown } = useMemo(() => {
    const breakdown = {};
    let value = 0;
    let invested = 0;

    investments.forEach(inv => {
      const category = inv.investmentCategory || "Other";
      const typeSlug = category.toLowerCase().replace(/\s+/g, '-');
      
      if (!breakdown[typeSlug]) {
        breakdown[typeSlug] = {
          category,
          typeSlug,
          value: 0,
          invested: 0,
          count: 0,
          investments: []
        };
      }
      
      breakdown[typeSlug].value += inv.currentValue || 0;
      breakdown[typeSlug].invested += inv.principal || 0;
      breakdown[typeSlug].count += 1;
      breakdown[typeSlug].investments.push(inv);
      
      value += inv.currentValue || 0;
      invested += inv.principal || 0;
    });

    return {
      totalValue: value,
      totalInvested: invested,
      typeBreakdown: Object.values(breakdown).sort((a, b) => b.value - a.value)
    };
  }, [investments]);

  const totalGain = totalValue - totalInvested;
  const gainPercentage = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;
  const chartColors = ["#16A34A", "#3B82F6", "#8B5CF6", "#F59E0B", "#14B8A6", "#EC4899", "#DC2626", "#6366F1"];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/my-investments")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Investment Breakdown</h1>
        </div>

        {/* Total Summary Card */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)" }}>
          <p className="text-white/80 text-sm mb-1">Total Portfolio Value</p>
          <h2 className="text-3xl font-bold text-white mb-3">₹ {formatAmount(totalValue)}</h2>
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div>
              <span className="text-white/70">Invested: </span>
              <span className="text-white font-semibold">₹{formatAmount(totalInvested)}</span>
            </div>
            <div>
              <span className="text-white/70">Gain: </span>
              <span className={`font-semibold ${totalGain >= 0 ? 'text-white' : 'text-red-200'}`}>
                {totalGain >= 0 ? '+' : ''}₹{formatAmount(totalGain)} ({gainPercentage}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Categories */}
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>By Investment Type</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : typeBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "#DCFCE7" }}>
              <TrendingUp className="h-10 w-10" style={{ color: "#16A34A" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Investments Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Start your investment journey</p>
          </div>
        ) : (
          <div className="space-y-3">
            {typeBreakdown.map((item, idx) => {
              const config = investmentTypeConfig[item.typeSlug] || investmentTypeConfig.other;
              const Icon = config.icon;
              const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
              const itemGain = item.value - item.invested;
              
              return (
                <button
                  key={item.typeSlug}
                  onClick={() => navigate(`/investments/${item.typeSlug}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`investment-type-${item.typeSlug}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.category}</h4>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(item.value)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.count} {item.count === 1 ? 'investment' : 'investments'}
                      </span>
                      <span className="text-xs" style={{ color: itemGain >= 0 ? "var(--status-success)" : "var(--status-error)" }}>
                        {itemGain >= 0 ? '+' : ''}₹{formatAmount(itemGain)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }} />
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default InvestmentBreakdown;

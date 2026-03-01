import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, TrendingUp, Landmark, BarChart3, PiggyBank, Coins, Bitcoin, CircleDollarSign, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
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

const CategoryInvestment = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const config = investmentTypeConfig[category] || investmentTypeConfig.other;
  const Icon = config.icon;
  
  const { data: allInvestments = [], isLoading: loading } = useInvestmentList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Filter investments for this category
  const { categoryInvestments, totalValue, totalInvested } = useMemo(() => {
    const filtered = allInvestments.filter(inv => {
      const invCategory = (inv.investmentCategory || "Other");
      const invCategorySlug = invCategory.toLowerCase().replace(/\s+/g, '-');
      return invCategorySlug === category || invCategory === config.name;
    });
    
    return {
      categoryInvestments: filtered,
      totalValue: filtered.reduce((sum, inv) => sum + (inv.currentValue || 0), 0),
      totalInvested: filtered.reduce((sum, inv) => sum + (inv.principal || 0), 0)
    };
  }, [allInvestments, category, config.name]);

  const totalGain = totalValue - totalInvested;
  const gainPercentage = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;

  const sortedInvestments = [...categoryInvestments].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-base)" }}>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{config.name}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{config.description}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: config.bgColor }}>
            <p className="text-xs mb-1" style={{ color: config.color }}>Current Value</p>
            <p className="text-xl font-bold" style={{ color: config.color }}>₹{formatAmount(totalValue)}</p>
            <p className="text-xs mt-1" style={{ color: config.color, opacity: 0.7 }}>{categoryInvestments.length} {categoryInvestments.length === 1 ? 'investment' : 'investments'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Gain</p>
            <p className="text-xl font-bold" style={{ color: totalGain >= 0 ? "#16A34A" : "#DC2626" }}>
              {totalGain >= 0 ? '+' : ''}₹{formatAmount(totalGain)}
            </p>
            <p className="text-xs mt-1" style={{ color: totalGain >= 0 ? "#16A34A" : "#DC2626" }}>
              {gainPercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Investment List */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Investments</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : categoryInvestments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: config.bgColor }}>
              <Icon className="h-10 w-10" style={{ color: config.color }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No {config.name} Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{config.description}</p>
            <button
              onClick={() => navigate(`/investment?category=${encodeURIComponent(config.name)}`)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: config.color }}
              data-testid="add-investment-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add {config.name}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInvestments.map((investment) => {
              const gain = (investment.currentValue || 0) - (investment.principal || 0);
              const invGainPercentage = investment.principal > 0 ? ((gain / investment.principal) * 100).toFixed(1) : 0;
              
              return (
                <button
                  key={investment.id}
                  onClick={() => navigate(`/wealth/investments/${investment.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`investment-card-${investment.id}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold truncate mb-1" style={{ color: "var(--text-primary)" }}>{investment.investmentName}</h4>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span>Invested: ₹{formatAmount(investment.principal)}</span>
                      {investment.investmentMode && <span>• {investment.investmentMode}</span>}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: config.color }}>₹{formatAmount(investment.currentValue)}</p>
                    <p className="text-xs" style={{ color: gain >= 0 ? "#16A34A" : "#DC2626" }}>
                      {gain >= 0 ? '+' : ''}{invGainPercentage}%
                    </p>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        {categoryInvestments.length > 0 && (
          <button
            onClick={() => navigate(`/investment?category=${encodeURIComponent(config.name)}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 mt-4 font-medium transition-all"
            style={{ borderColor: config.color, color: config.color }}
            data-testid="add-investment-button"
          >
            <Plus className="h-5 w-5" />
            Add {config.name}
          </button>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default CategoryInvestment;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, TrendingUp } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyInvestments = () => {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/investments`);
      const sortedInvestments = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInvestments(sortedInvestments);
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Fixed Deposit (FD)": "bg-[#3B82F6]/10 text-[#3B82F6]",
      "Recurring Deposit (RD)": "bg-[#6366F1]/10 text-[#6366F1]",
      "Stocks": "bg-[#10B981]/10 text-[#10B981]",
      "Mutual Fund": "bg-[#8B5CF6]/10 text-[#8B5CF6]",
      "ETF": "bg-[#14B8A6]/10 text-[#14B8A6]",
      "Bonds": "bg-[#F59E0B]/10 text-[#F59E0B]",
      "Sovereign Gold Bond (SGB)": "bg-[#EAB308]/10 text-[#EAB308]",
      "Digital Gold": "bg-[#F97316]/10 text-[#F97316]",
      "Digital Silver": "bg-[#94A3B8]/10 text-[#64748B]",
      "P2P Lending": "bg-[#EC4899]/10 text-[#EC4899]",
      "SWP": "bg-[#06B6D4]/10 text-[#06B6D4]",
      "ULIP": "bg-[#A855F7]/10 text-[#A855F7]",
      "Crypto": "bg-[#F43F5E]/10 text-[#F43F5E]",
    };
    return colors[category] || "bg-[#6B7280]/10 text-[#6B7280]";
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case "Income Generating": return "bg-[#10B981]/10 text-[#10B981]";
      case "Growth Only": return "bg-[#3B82F6]/10 text-[#3B82F6]";
      case "Growth with Maturity": return "bg-[#8B5CF6]/10 text-[#8B5CF6]";
      default: return "bg-[#6B7280]/10 text-[#6B7280]";
    }
  };

  const getTotalValue = () => {
    return investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  };

  const getTotalInvested = () => {
    return investments.reduce((sum, inv) => sum + (inv.principal || 0), 0);
  };

  const getInvestmentAllocation = () => {
    const totalValue = getTotalValue();
    const allocation = {};
    investments.forEach(inv => {
      const category = inv.investmentCategory || "Other";
      allocation[category] = (allocation[category] || 0) + (inv.currentValue || 0);
    });
    return Object.entries(allocation)
      .map(([category, value]) => ({
        category,
        value,
        percentage: totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-investments-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Investments
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Summary Cards */}
      {!loading && investments.length > 0 && (
        <div className="px-6 mb-4">
          <div className="mx-auto max-w-[620px]">
            {/* Main Summary Card */}
            <div className="rounded-2xl bg-gradient-to-r from-[#8B5CF6] to-[#6366F1] p-5 text-white mb-3">
              <p className="text-white/80 text-xs mb-1">Total Investment Value</p>
              <div className="flex items-baseline gap-3">
                <p className="text-2xl font-bold">₹ {formatAmount(getTotalValue())}</p>
                {getTotalInvested() > 0 && (
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    getTotalValue() >= getTotalInvested() ? "bg-emerald-500/30" : "bg-rose-500/30"
                  }`}>
                    {getTotalValue() >= getTotalInvested() ? "+" : ""}
                    {(((getTotalValue() - getTotalInvested()) / getTotalInvested()) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-white/70">
                <span>Invested: ₹ {formatAmount(getTotalInvested())}</span>
                <span>Gain: ₹ {formatAmount(getTotalValue() - getTotalInvested())}</span>
              </div>
            </div>
            
            {/* Investment Allocation */}
            <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
              <p className="text-sm font-medium text-[#334155] mb-3">Portfolio Allocation</p>
              <div className="space-y-2">
                {getInvestmentAllocation().map(({ category, value, percentage }) => (
                  <div key={category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#334155]/70">{category}</span>
                        <span className="font-medium text-[#334155]">{percentage}%</span>
                      </div>
                      <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#8B5CF6] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#334155]/60">Loading...</div>
            </div>
          ) : investments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#DCFCE7] mb-6">
                <TrendingUp className="h-12 w-12 text-[#10B981]" />
              </div>
              <h2 className="text-xl font-semibold text-[#334155] mb-2">
                No Investments Added Yet
              </h2>
              <p className="text-[#334155]/60 text-center mb-8">
                Start tracking your investment portfolio
              </p>
              <button
                type="button"
                onClick={() => navigate("/investment")}
                className="flex items-center gap-2 rounded-xl bg-[#14B8A6] px-6 py-3 text-white font-medium transition-all hover:bg-[#0D9488] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-investment-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Investment
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {investments.map((investment) => (
                  <div
                    key={investment.id}
                    className="flex items-center justify-between rounded-2xl border border-[#334155] bg-[#1E293B] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/investment/${investment.id}`)}
                    data-testid={`investment-card-${investment.id}`}
                  >
                    <div className="flex-1">
                      {/* Investment Name */}
                      <h3 className="text-lg font-semibold text-[#334155] mb-2">
                        {investment.name}
                      </h3>

                      {/* Category and Mode Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(investment.investmentCategory)}`}>
                          {investment.investmentCategory}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getModeColor(investment.investmentMode)}`}>
                          {investment.investmentMode}
                        </span>
                      </div>

                      {/* Current Value */}
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-sm text-[#334155]/60">Current Value</span>
                          <p className="text-lg font-semibold text-[#334155]">
                            ₹ {formatAmount(investment.currentValue || 0)}
                          </p>
                        </div>
                        {investment.principal && (
                          <div>
                            <span className="text-sm text-[#334155]/60">Invested</span>
                            <p className="text-sm font-medium text-[#334155]">
                              ₹ {formatAmount(investment.principal)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-6 w-6 text-[#334155]/40" />
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/investment")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#14B8A6] bg-[#E8F8F4] px-6 py-4 text-[#14B8A6] font-semibold transition-all hover:bg-[#14B8A6] hover:text-white active:scale-[0.98]"
                  data-testid="add-investment-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Investment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyInvestments;

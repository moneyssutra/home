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

  const getCategoryStyle = (category) => {
    const styles = {
      "Fixed Deposit (FD)": { bg: "#DBEAFE", text: "#3B82F6" },
      "Recurring Deposit (RD)": { bg: "#E0E7FF", text: "#6366F1" },
      "Stocks": { bg: "#DCFCE7", text: "#16A34A" },
      "Mutual Fund": { bg: "#F3E8FF", text: "#8B5CF6" },
      "ETF": { bg: "#CCFBF1", text: "#14B8A6" },
      "Bonds": { bg: "#FEF3C7", text: "#F59E0B" },
      "Sovereign Gold Bond (SGB)": { bg: "#FEF9C3", text: "#CA8A04" },
      "Digital Gold": { bg: "#FFEDD5", text: "#EA580C" },
      "Digital Silver": { bg: "#F1F5F9", text: "#64748B" },
      "P2P Lending": { bg: "#FCE7F3", text: "#DB2777" },
      "SWP": { bg: "#CFFAFE", text: "#0891B2" },
      "ULIP": { bg: "#F3E8FF", text: "#9333EA" },
      "Crypto": { bg: "#FEE2E2", text: "#DC2626" },
    };
    return styles[category] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const getModeStyle = (mode) => {
    switch (mode) {
      case "Income Generating": return { bg: "#DCFCE7", text: "#16A34A" };
      case "Growth Only": return { bg: "#DBEAFE", text: "#3B82F6" };
      case "Growth with Maturity": return { bg: "#F3E8FF", text: "#8B5CF6" };
      default: return { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
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

  const totalGain = getTotalValue() - getTotalInvested();
  const gainPercent = getTotalInvested() > 0 ? (totalGain / getTotalInvested()) * 100 : 0;

  return (
    <div className="min-h-screen pb-24 honeycomb-bg" data-testid="my-investments-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/")}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Investments
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-sm font-medium mb-1">Total Investment Value</p>
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-bold text-white">₹ {formatAmount(getTotalValue())}</h2>
            {getTotalInvested() > 0 && (
              <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                totalGain >= 0 ? "bg-emerald-500/30 text-emerald-100" : "bg-rose-500/30 text-rose-100"
              }`}>
                {totalGain >= 0 ? "+" : ""}{gainPercent.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-white/70">
            <span>Invested: ₹ {formatAmount(getTotalInvested())}</span>
            <span style={{ color: totalGain >= 0 ? "#A7F3D0" : "#FCA5A5" }}>
              {totalGain >= 0 ? "Gain" : "Loss"}: ₹ {formatAmount(Math.abs(totalGain))}
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {/* Investment Allocation */}
        {!loading && investments.length > 0 && (
          <div 
            className="bg-white rounded-2xl p-5 shadow-card mb-4" 
            data-testid="investment-allocation"
          >
            <div 
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => navigate("/investment-breakdown")}
            >
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Portfolio Allocation
              </h3>
              <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                View All →
              </span>
            </div>
            
            {/* Allocation by Category */}
            <div className="space-y-3">
              {getInvestmentAllocation().map(({ category, value, percentage }) => {
                const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
                
                return (
                  <div 
                    key={category} 
                    className="space-y-1 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/investments/${categorySlug}`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: "#8B5CF6" }}
                        />
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          ₹{formatAmount(value)}
                        </span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: "#8B5CF6"
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : investments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: "#F3E8FF" }}>
              <TrendingUp className="h-12 w-12" style={{ color: "#8B5CF6" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Investments Added Yet
            </h2>
            <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
              Start tracking your investment portfolio
            </p>
            <button
              type="button"
              onClick={() => navigate("/investment")}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#8B5CF6", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)" }}
              data-testid="add-investment-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add New Investment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {investments.map((investment) => {
                const catStyle = getCategoryStyle(investment.investmentCategory);
                const modeStyle = getModeStyle(investment.investmentMode);
                const invGain = (investment.currentValue || 0) - (investment.principal || 0);
                
                return (
                  <div
                    key={investment.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    onClick={() => navigate(`/investment/${investment.id}`)}
                    data-testid={`investment-card-${investment.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                          {investment.name}
                        </h3>

                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: catStyle.bg, color: catStyle.text }}>
                            {investment.investmentCategory}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: modeStyle.bg, color: modeStyle.text }}>
                            {investment.investmentMode}
                          </span>
                          {investment.investmentFrequency && investment.investmentFrequency !== "" && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "#DCFCE7", color: "#059669" }}>
                              {investment.investmentFrequency} SIP
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Current Value</span>
                            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                              ₹ {formatAmount(investment.currentValue || 0)}
                            </p>
                          </div>
                          {investment.principal && (
                            <div>
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Invested</span>
                              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                                ₹ {formatAmount(investment.principal)}
                              </p>
                            </div>
                          )}
                          {investment.principal && (
                            <div>
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Gain/Loss</span>
                              <p className="text-sm font-semibold" style={{ color: invGain >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                                {invGain >= 0 ? "+" : ""}₹ {formatAmount(Math.abs(invGain))}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/investment")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-semibold transition-all active:scale-[0.98]"
                style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}
                data-testid="add-investment-button"
              >
                <Plus className="h-5 w-5" />
                Add New Investment
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

export default MyInvestments;

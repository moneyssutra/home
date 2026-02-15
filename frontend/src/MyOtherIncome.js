import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Gift, Award, TrendingUp, RefreshCw, Wallet, ReceiptText, Banknote, Sparkles, ArrowLeftRight, CheckCircle, Clock } from "lucide-react";
import axios from "axios";
import BackButton from "@/components/BackButton";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { formatAmount, formatDate } from "@/lib/formatters";

const MyOtherIncome = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/other-income`);
      setIncomes(response.data);
    } catch (error) {
      console.error("Error fetching other incomes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totalAmount = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const receivedAmount = incomes.filter(inc => inc.isReceived).reduce((sum, inc) => sum + (inc.amount || 0), 0);
  const pendingAmount = incomes.filter(inc => !inc.isReceived).reduce((sum, inc) => sum + (inc.amount || 0), 0);

  // Group by category
  const byCategory = incomes.reduce((acc, inc) => {
    const cat = inc.category || "Other";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += inc.amount || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(byCategory).sort(([, a], [, b]) => b.total - a.total);

  const getCategoryIcon = (category) => {
    const icons = {
      "Gift": Gift,
      "Bonus": Award,
      "Incentive": Sparkles,
      "Capital Gain": TrendingUp,
      "Asset Sale": Banknote,
      "Tax Refund": RefreshCw,
      "Cashback / Reward": Wallet,
      "Reimbursement": ArrowLeftRight,
      "Freelance / Side Work": ReceiptText,
      "Windfall": Sparkles,
      "Refund": RefreshCw,
      "Miscellaneous": Wallet,
      "Other": Wallet,
    };
    return icons[category] || Wallet;
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Gift": "bg-pink-500/20 text-pink-500",
      "Bonus": "bg-amber-500/20 text-amber-500",
      "Incentive": "bg-purple-500/20 text-purple-500",
      "Capital Gain": "bg-emerald-500/20 text-emerald-500",
      "Asset Sale": "bg-blue-500/20 text-blue-500",
      "Tax Refund": "bg-cyan-500/20 text-cyan-500",
      "Cashback / Reward": "bg-orange-500/20 text-orange-500",
      "Reimbursement": "bg-indigo-500/20 text-indigo-500",
      "Freelance / Side Work": "bg-teal-500/20 text-teal-500",
      "Windfall": "bg-yellow-500/20 text-yellow-500",
      "Refund": "bg-green-500/20 text-green-500",
      "Miscellaneous": "bg-slate-500/20 text-slate-500",
      "Other": "bg-gray-500/20 text-gray-500",
    };
    return colors[category] || "bg-gray-500/20 text-gray-500";
  };

  const chartColors = ["#EC4899", "#F59E0B", "#8B5CF6", "#10B981", "#3B82F6", "#06B6D4", "#F97316", "#6366F1", "#14B8A6", "#EAB308", "#22C55E", "#64748B", "#6B7280"];

  return (
    <div className="min-h-screen bg-[#0F172A] pb-24" data-testid="my-other-income-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#6D28D9] px-6 pt-8 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <BackButton className="text-white" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Other Income
          </h1>
        </div>

        {/* Total Card */}
        <div className="bg-[#1E293B]/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="total-other-income-card">
          <p className="text-white/60 text-sm font-medium mb-1">Total Other Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalAmount)}</h2>
          <p className="text-white/40 text-xs mt-1">{incomes.length} entries</p>
          
          {/* Received vs Pending */}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-300" />
              <div>
                <p className="text-white/60 text-xs">Received</p>
                <p className="text-emerald-300 font-semibold">₹ {formatAmount(receivedAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-300" />
              <div>
                <p className="text-white/60 text-xs">Pending</p>
                <p className="text-amber-300 font-semibold">₹ {formatAmount(pendingAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Category Breakdown */}
      {sortedCategories.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-gray-100" data-testid="category-breakdown">
            <h3 className="text-sm font-semibold text-[#E2E8F0] mb-4">Income by Category</h3>
            <div className="space-y-3">
              {sortedCategories.map(([category, data], idx) => {
                const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
                const Icon = getCategoryIcon(category);
                return (
                  <div key={category} className="flex items-center gap-3 p-2">
                    <div className={`w-10 h-10 rounded-xl ${getCategoryColor(category)} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[#E2E8F0]">{category}</span>
                        <span className="text-sm font-semibold text-[#E2E8F0]">₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                        </div>
                        <span className="text-xs text-[#E2E8F0]/50 w-12 text-right">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income List */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#E2E8F0]">All Entries</h3>
          <button
            onClick={() => navigate("/other-income")}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#7C3AED] text-white text-xs font-medium hover:bg-[#6D28D9] transition-colors"
            data-testid="add-other-income-btn"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-[#7C3AED]/30 border-t-[#7C3AED] rounded-full animate-spin" />
          </div>
        ) : incomes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <Gift className="h-10 w-10 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-[#E2E8F0] mb-2">No Other Income Yet</h3>
            <p className="text-[#E2E8F0]/60 text-sm mb-4">Track gifts, bonuses, refunds, and more</p>
            <button
              onClick={() => navigate("/other-income")}
              className="px-6 py-2.5 rounded-xl bg-[#7C3AED] text-white font-medium text-sm hover:bg-[#6D28D9] transition-colors"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {incomes
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((income) => {
                const Icon = getCategoryIcon(income.category);
                return (
                  <div
                    key={income.id}
                    onClick={() => navigate(`/other-income/${income.id}`)}
                    className="bg-[#1E293B] rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                    data-testid={`other-income-card-${income.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl ${getCategoryColor(income.category)} flex items-center justify-center shrink-0`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-[#E2E8F0] truncate">{income.incomeName}</h4>
                            <p className="text-xs text-[#E2E8F0]/50 mt-0.5">
                              {income.category === "Other" && income.customCategory ? income.customCategory : income.category}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-[#E2E8F0]">₹ {formatAmount(income.amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${income.isReceived ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {income.isReceived ? 'Received' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-[#E2E8F0]/50">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100">{income.frequency}</span>
                          {income.dateReceived && (
                            <span>{formatDate(income.dateReceived)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyOtherIncome;

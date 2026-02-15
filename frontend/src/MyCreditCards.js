import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, CreditCard, AlertCircle } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const MyCreditCards = () => {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const fetchCreditCards = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/credit-cards`);
      setCards(response.data);
    } catch (error) {
      console.error("Error fetching credit cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const totalOutstanding = cards.reduce((sum, card) => sum + (card.outstandingAmount || 0), 0);
  const totalLimit = cards.reduce((sum, card) => sum + (card.creditLimit || 0), 0);
  const overallUtilization = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0;

  const getUtilizationColor = (utilization) => {
    if (utilization < 30) return "text-emerald-500 bg-emerald-500";
    if (utilization < 50) return "text-amber-500 bg-amber-500";
    return "text-rose-500 bg-rose-500";
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date();
    due.setDate(parseInt(dueDate));
    due.setHours(0, 0, 0, 0);
    
    // If due date already passed this month, it's for next month
    if (due < today) {
      due.setMonth(due.getMonth() + 1);
    }
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="my-credit-cards-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#7C3AED] px-6 pt-8 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Credit Cards
          </h1>
        </div>

        {/* Total Outstanding Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="total-outstanding-card">
          <p className="text-white/60 text-sm font-medium mb-1">Total Outstanding</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalOutstanding)}</h2>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <p className="text-white/50 text-xs">Credit Limit</p>
              <p className="text-white font-medium">₹ {formatAmount(totalLimit)}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-white/50 text-xs">Utilization</p>
              <p className={`font-semibold ${overallUtilization < 30 ? 'text-emerald-300' : overallUtilization < 50 ? 'text-amber-300' : 'text-rose-300'}`}>
                {overallUtilization.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Utilization Bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getUtilizationColor(overallUtilization).split(' ')[1]}`}
                style={{ width: `${Math.min(overallUtilization, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/40">
              <span>0%</span>
              <span className="text-emerald-300">30%</span>
              <span className="text-amber-300">50%</span>
              <span className="text-rose-300">100%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Credit Card List */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#0B3D2E]/60">Loading...</div>
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-100 mx-auto mb-4">
              <CreditCard className="h-10 w-10 text-violet-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#0B3D2E] mb-2">No Credit Cards Added</h2>
            <p className="text-[#0B3D2E]/60 text-sm mb-6">Add your credit cards to track outstanding and utilization</p>
            <button
              onClick={() => navigate("/credit-card")}
              className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-5 py-2.5 text-white font-medium mx-auto transition-all hover:bg-[#00BA89] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Add Credit Card
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const utilization = card.creditLimit > 0 ? (card.outstandingAmount / card.creditLimit) * 100 : 0;
              const daysUntilDue = getDaysUntilDue(card.dueDate);
              
              return (
                <button
                  key={card.id}
                  onClick={() => navigate(`/credit-card/${card.id}`)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left transition-all hover:shadow-md"
                  data-testid={`credit-card-${card.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0B3D2E]">{card.cardName}</h3>
                      <p className="text-sm text-[#0B3D2E]/50">{card.bankName}</p>
                    </div>
                    {daysUntilDue !== null && daysUntilDue <= 5 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Due in {daysUntilDue} days
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-[#0B3D2E]/50 mb-0.5">Outstanding</p>
                      <p className="text-xl font-bold text-[#0B3D2E]">₹ {formatAmount(card.outstandingAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#0B3D2E]/50 mb-0.5">Limit: ₹{formatAmount(card.creditLimit)}</p>
                      <p className={`text-sm font-semibold ${getUtilizationColor(utilization).split(' ')[0]}`}>
                        {utilization.toFixed(0)}% used
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#0B3D2E]/30 ml-2" />
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${getUtilizationColor(utilization).split(' ')[1]}`}
                      style={{ width: `${Math.min(utilization, 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {cards.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/credit-card")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#8B5CF6] py-3 text-[#8B5CF6] font-medium transition-all hover:bg-[#8B5CF6]/5"
          >
            <Plus className="h-5 w-5" />
            Add New Credit Card
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyCreditCards;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, CreditCard, AlertCircle } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

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
    if (utilization < 30) return { text: "#16A34A", bg: "#16A34A" };
    if (utilization < 50) return { text: "#F59E0B", bg: "#F59E0B" };
    return { text: "#EF4444", bg: "#EF4444" };
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date();
    due.setDate(parseInt(dueDate));
    due.setHours(0, 0, 0, 0);
    
    if (due < today) {
      due.setMonth(due.getMonth() + 1);
    }
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen pb-24 honeycomb-bg" data-testid="my-credit-cards-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/my-liabilities")}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Credit Cards
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-outstanding-card">
          <p className="text-white/70 text-sm font-medium mb-1">Total Outstanding</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalOutstanding)}</h2>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <p className="text-white/50 text-xs">Credit Limit</p>
              <p className="text-white font-medium">₹ {formatAmount(totalLimit)}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-white/50 text-xs">Utilization</p>
              <p className="font-semibold" style={{ color: overallUtilization < 30 ? '#A7F3D0' : overallUtilization < 50 ? '#FDE68A' : '#FCA5A5' }}>
                {overallUtilization.toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Utilization Bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(overallUtilization, 100)}%`, backgroundColor: getUtilizationColor(overallUtilization).bg }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-white/40">
              <span>0%</span>
              <span style={{ color: "#A7F3D0" }}>30%</span>
              <span style={{ color: "#FDE68A" }}>50%</span>
              <span style={{ color: "#FCA5A5" }}>100%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl p-8 text-center shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex h-20 w-20 items-center justify-center rounded-full mx-auto mb-4" style={{ backgroundColor: "#F3E8FF" }}>
              <CreditCard className="h-10 w-10" style={{ color: "#8B5CF6" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Credit Cards Added</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Add your credit cards to track outstanding and utilization</p>
            <button
              onClick={() => navigate("/credit-card")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium mx-auto transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#8B5CF6", boxShadow: "0 4px 12px rgba(139, 92, 246, 0.3)" }}
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
              const utilColor = getUtilizationColor(utilization);
              
              return (
                <button
                  key={card.id}
                  onClick={() => navigate(`/credit-card/${card.id}`)}
                  className="w-full rounded-2xl p-4 text-left transition-all hover:shadow-md shadow-card"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`credit-card-${card.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>{card.cardName}</h3>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{card.bankName}</p>
                    </div>
                    {daysUntilDue !== null && daysUntilDue <= 5 && (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--status-error-soft)", color: "var(--status-error)" }}>
                        <AlertCircle className="h-3 w-3" />
                        Due in {daysUntilDue} days
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Outstanding</p>
                      <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(card.outstandingAmount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Limit: ₹{formatAmount(card.creditLimit)}</p>
                      <p className="text-sm font-semibold" style={{ color: utilColor.text }}>
                        {utilization.toFixed(0)}% used
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 ml-2" style={{ color: "var(--text-muted)" }} />
                  </div>
                  
                  {/* Mini Progress Bar */}
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(utilization, 100)}%`, backgroundColor: utilColor.bg }}
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
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium transition-all"
            style={{ borderColor: "#8B5CF6", color: "#8B5CF6" }}
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  CreditCard, 
  Landmark, 
  Plus,
  AlertCircle,
  TrendingDown
} from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyLiabilities = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "loans", "cards"

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, cardsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/loans`),
        axios.get(`${backendUrl}/api/credit-cards`)
      ]);
      setLoans(loansRes.data || []);
      setCreditCards(cardsRes.data || []);
    } catch (error) {
      console.error("Error fetching liabilities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const formatFullAmount = (amount) => {
    return new Intl.NumberFormat("en-IN").format(Math.round(amount));
  };

  // Calculate totals
  const totalLoansOutstanding = loans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
  const totalCardsOutstanding = creditCards.reduce((sum, c) => sum + (c.outstandingAmount || 0), 0);
  const totalLiabilities = totalLoansOutstanding + totalCardsOutstanding;
  
  const totalCreditLimit = creditCards.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
  const creditUtilization = totalCreditLimit > 0 ? (totalCardsOutstanding / totalCreditLimit) * 100 : 0;

  const getUtilizationColor = (utilization) => {
    if (utilization < 30) return "#16A34A";
    if (utilization < 50) return "#F59E0B";
    return "#EF4444";
  };

  // Loan type icons
  const getLoanIcon = (type) => {
    if (type?.includes("Home")) return "🏠";
    if (type?.includes("Vehicle") || type?.includes("Car")) return "🚗";
    if (type?.includes("Personal")) return "👤";
    if (type?.includes("Education")) return "🎓";
    if (type?.includes("Business")) return "💼";
    if (type?.includes("Gold")) return "🥇";
    return "💰";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: "var(--status-error-soft)", borderTopColor: "var(--status-error)" }} />
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>Loading liabilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 honeycomb-bg" data-testid="my-liabilities-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/home")}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Liabilities
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-liabilities-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/70 text-sm font-medium">Total Liabilities</p>
            <TrendingDown className="h-6 w-6 text-white/60" />
          </div>
          <h2 className="text-3xl font-bold text-white">₹ {formatFullAmount(totalLiabilities)}</h2>
          
          {/* Breakdown */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Landmark className="h-4 w-4 text-white/70" />
                <p className="text-white/50 text-xs">Loans</p>
              </div>
              <p className="text-white font-semibold">₹ {formatAmount(totalLoansOutstanding)}</p>
              <p className="text-white/40 text-xs">{loans.length} active</p>
            </div>
            <div className="h-12 w-px bg-white/20" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-white/70" />
                <p className="text-white/50 text-xs">Credit Cards</p>
              </div>
              <p className="text-white font-semibold">₹ {formatAmount(totalCardsOutstanding)}</p>
              <p className="text-white/40 text-xs">{creditCards.length} cards</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 -mt-4 space-y-5">
        {/* Tab Navigation */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "all" 
                ? "text-white" 
                : ""
            }`}
            style={{ 
              backgroundColor: activeTab === "all" ? "var(--status-error)" : "transparent",
              color: activeTab === "all" ? "white" : "var(--text-secondary)"
            }}
            data-testid="tab-all"
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("loans")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all`}
            style={{ 
              backgroundColor: activeTab === "loans" ? "var(--status-warning)" : "transparent",
              color: activeTab === "loans" ? "white" : "var(--text-secondary)"
            }}
            data-testid="tab-loans"
          >
            Loans ({loans.length})
          </button>
          <button
            onClick={() => setActiveTab("cards")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all`}
            style={{ 
              backgroundColor: activeTab === "cards" ? "#8B5CF6" : "transparent",
              color: activeTab === "cards" ? "white" : "var(--text-secondary)"
            }}
            data-testid="tab-cards"
          >
            Cards ({creditCards.length})
          </button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/my-loans")}
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            data-testid="view-all-loans"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
              <Landmark className="h-5 w-5" style={{ color: "#D97706" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>View Loans</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage all loans</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto" style={{ color: "var(--text-muted)" }} />
          </button>
          
          <button
            onClick={() => navigate("/my-credit-cards")}
            className="flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md active:scale-[0.98]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            data-testid="view-all-cards"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EDE9FE" }}>
              <CreditCard className="h-5 w-5" style={{ color: "#7C3AED" }} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>View Cards</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage credit cards</p>
            </div>
            <ChevronRight className="h-5 w-5 ml-auto" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Credit Card Utilization Alert */}
        {creditUtilization > 30 && (
          <div 
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ 
              backgroundColor: creditUtilization > 50 ? "var(--status-error-soft)" : "var(--status-warning-soft)",
              border: `1px solid ${creditUtilization > 50 ? "#FECACA" : "#FDE68A"}`
            }}
          >
            <AlertCircle className="h-5 w-5 mt-0.5" style={{ color: getUtilizationColor(creditUtilization) }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Credit Utilization: {creditUtilization.toFixed(1)}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {creditUtilization > 50 
                  ? "High utilization can impact your credit score. Consider paying down balances."
                  : "Moderate utilization. Try to keep it below 30% for better credit health."}
              </p>
            </div>
          </div>
        )}

        {/* Loans Section */}
        {(activeTab === "all" || activeTab === "loans") && loans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {activeTab === "all" ? "Loans" : `All Loans (${loans.length})`}
              </h3>
              {activeTab === "all" && loans.length > 2 && (
                <button 
                  onClick={() => navigate("/my-loans")}
                  className="text-xs font-medium"
                  style={{ color: "var(--brand-primary)" }}
                >
                  View all
                </button>
              )}
            </div>
            
            {(activeTab === "all" ? loans.slice(0, 3) : loans).map((loan) => (
              <div
                key={loan.id}
                className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                onClick={() => navigate(`/loan/${loan.id}`)}
                data-testid={`loan-item-${loan.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: "#FEF3C7" }}>
                    {getLoanIcon(loan.loanType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {loan.loanName || loan.loanType}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {loan.lenderName || loan.loanType}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Outstanding</p>
                        <p className="font-semibold" style={{ color: "var(--finance-loss)" }}>
                          ₹ {formatAmount(loan.outstandingAmount || 0)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>EMI</p>
                        <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                          ₹ {formatAmount(loan.emiAmount || 0)}
                        </p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${Math.min(((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100, 100)}%`,
                            backgroundColor: "var(--brand-primary)"
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        {((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount * 100).toFixed(0)}% paid
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Credit Cards Section */}
        {(activeTab === "all" || activeTab === "cards") && creditCards.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {activeTab === "all" ? "Credit Cards" : `All Credit Cards (${creditCards.length})`}
              </h3>
              {activeTab === "all" && creditCards.length > 2 && (
                <button 
                  onClick={() => navigate("/my-credit-cards")}
                  className="text-xs font-medium"
                  style={{ color: "var(--brand-primary)" }}
                >
                  View all
                </button>
              )}
            </div>
            
            {(activeTab === "all" ? creditCards.slice(0, 3) : creditCards).map((card) => {
              const utilization = card.creditLimit > 0 ? (card.outstandingAmount / card.creditLimit) * 100 : 0;
              return (
                <div
                  key={card.id}
                  className="p-4 rounded-xl cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  onClick={() => navigate(`/credit-card/${card.id}`)}
                  data-testid={`card-item-${card.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EDE9FE" }}>
                      <CreditCard className="h-5 w-5" style={{ color: "#7C3AED" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                            {card.cardName || "Credit Card"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {card.bankName} •••• {card.lastFourDigits || "****"}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Outstanding</p>
                          <p className="font-semibold" style={{ color: "var(--finance-loss)" }}>
                            ₹ {formatAmount(card.outstandingAmount || 0)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Limit</p>
                          <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                            ₹ {formatAmount(card.creditLimit || 0)}
                          </p>
                        </div>
                      </div>
                      {/* Utilization bar */}
                      <div className="mt-2">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: `${Math.min(utilization, 100)}%`,
                              backgroundColor: getUtilizationColor(utilization)
                            }}
                          />
                        </div>
                        <p className="text-xs mt-1" style={{ color: getUtilizationColor(utilization) }}>
                          {utilization.toFixed(0)}% utilized
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty States */}
        {loans.length === 0 && creditCards.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
              <TrendingDown className="h-8 w-8" style={{ color: "var(--status-success)" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Liabilities!</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              You're debt-free! Add loans or credit cards if you have any.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate("/loan")}
                className="px-4 py-2 rounded-xl text-white font-medium text-sm"
                style={{ backgroundColor: "#D97706" }}
              >
                Add Loan
              </button>
              <button
                onClick={() => navigate("/credit-card")}
                className="px-4 py-2 rounded-xl text-white font-medium text-sm"
                style={{ backgroundColor: "#7C3AED" }}
              >
                Add Card
              </button>
            </div>
          </div>
        )}

        {activeTab === "loans" && loans.length === 0 && creditCards.length > 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <Landmark className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>No loans added yet</p>
            <button
              onClick={() => navigate("/loan")}
              className="px-4 py-2 rounded-xl text-white font-medium text-sm"
              style={{ backgroundColor: "#D97706" }}
            >
              Add Loan
            </button>
          </div>
        )}

        {activeTab === "cards" && creditCards.length === 0 && loans.length > 0 && (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <CreditCard className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>No credit cards added yet</p>
            <button
              onClick={() => navigate("/credit-card")}
              className="px-4 py-2 rounded-xl text-white font-medium text-sm"
              style={{ backgroundColor: "#7C3AED" }}
            >
              Add Credit Card
            </button>
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddSheet(true)}
        className="fixed right-6 bottom-24 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{ backgroundColor: "var(--status-error)" }}
        data-testid="add-liability-button"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyLiabilities;

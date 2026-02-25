import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Shield, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { normalizeToMonthly } from "@/lib/formatters";

const FixedExpenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/expenses/with-next-date`);
      // Filter only fixed expenses
      const fixedExpenses = response.data.filter(e => e.expenseType === "Fixed");
      setExpenses(fixedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      try {
        const fallbackResponse = await axios.get(`${backendUrl}/api/expenses`);
        const fixedExpenses = fallbackResponse.data.filter(e => e.expenseType === "Fixed");
        setExpenses(fixedExpenses);
      } catch (fallbackError) {
        console.error("Error fetching expenses (fallback):", fallbackError);
      }
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

  const getPaymentStatus = (expense) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!expense.selectedDate) return 'upcoming';
    
    const dueDate = new Date();
    dueDate.setDate(parseInt(expense.selectedDate));
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'paid';
    if (dueDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  // Calculate totals (normalized to monthly)
  const totalExpenses = expenses.reduce((sum, exp) => sum + normalizeToMonthly(exp.expectedAmount || 0, exp.frequency || 'Monthly'), 0);
  const paidExpenses = expenses.filter(e => getPaymentStatus(e) === 'paid');
  const pendingExpenses = expenses.filter(e => getPaymentStatus(e) !== 'paid');
  const paidTotal = paidExpenses.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0);
  const pendingTotal = pendingExpenses.reduce((sum, e) => sum + normalizeToMonthly(e.expectedAmount || 0, e.frequency || 'Monthly'), 0);

  const getCategoryIcon = (category) => {
    const icons = {
      "Housing": Home,
      "Utilities": Zap,
      "Food": ShoppingBag,
      "Travel": Car,
      "Shopping": ShoppingBag,
      "Medical": Stethoscope,
      "Education": GraduationCap,
      "Insurance": Shield,
      "Subscriptions": Tv,
      "EMI": CreditCard,
      "Business Expense": Briefcase,
      "Salary Paid": Wallet,
    };
    return icons[category] || MoreHorizontal;
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Housing": "bg-blue-500/20 text-blue-500",
      "Utilities": "bg-amber-500/20 text-amber-500",
      "Food": "bg-emerald-500/20 text-emerald-500",
      "Travel": "bg-purple-500/20 text-purple-500",
      "Shopping": "bg-pink-500/20 text-pink-500",
      "Medical": "bg-red-500/20 text-red-500",
      "Education": "bg-cyan-500/20 text-cyan-500",
      "Insurance": "bg-indigo-500/20 text-indigo-500",
      "Subscriptions": "bg-teal-500/20 text-teal-500",
      "EMI": "bg-orange-500/20 text-orange-500",
      "Business Expense": "bg-lime-500/20 text-lime-500",
      "Salary Paid": "bg-green-500/20 text-green-500",
    };
    return colors[category] || "bg-[#1E293B]0/20 text-slate-400";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'due-today': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-[#1E293B] text-slate-300 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Upcoming';
      default: return '';
    }
  };

  // Sort expenses: upcoming first, due today, then paid
  const sortedExpenses = [...expenses].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'paid': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  return (
    <div className="min-h-screen honeycomb-bg pb-24" data-testid="fixed-expenses-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-slate-600 via-slate-500 to-slate-600 px-6 pt-8 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/my-expenses" className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Fixed Expenses
          </h1>
        </div>

        {/* Total Card */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="fixed-expenses-total">
          <p className="text-white/80 text-sm font-medium mb-1">Total Fixed Expenses</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalExpenses)}</h2>
          <p className="text-white/60 text-xs mt-1">{expenses.length} recurring expenses</p>
          
          {/* Status Summary */}
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/80 mb-1">Paid</p>
              <p className="text-emerald-200 font-semibold">₹ {formatAmount(paidTotal)}</p>
              <p className="text-white/60 text-xs">{paidExpenses.length} expenses</p>
            </div>
            <div>
              <p className="text-white/80 mb-1">Pending</p>
              <p className="text-amber-200 font-semibold">₹ {formatAmount(pendingTotal)}</p>
              <p className="text-white/60 text-xs">{pendingExpenses.length} expenses</p>
            </div>
          </div>
        </div>
      </header>

      {/* Expense List */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold text-[#334155] mb-3">All Fixed Expenses</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#334155]/60">Loading...</div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-4">
              <Shield className="h-10 w-10 text-slate-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#334155] mb-2">No Fixed Expenses</h2>
            <p className="text-[#334155]/60 text-center text-sm mb-6">Add your recurring expenses like rent, EMIs, subscriptions</p>
            <button
              onClick={() => navigate("/expense?type=Fixed")}
              className="flex items-center gap-2 rounded-xl bg-[#14B8A6] px-5 py-2.5 text-white font-medium transition-all hover:bg-[#0D9488] active:scale-[0.98]"
              data-testid="add-fixed-expense-empty-btn"
            >
              <Plus className="h-5 w-5" />
              Add Fixed Expense
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedExpenses.map((expense) => {
              const status = getPaymentStatus(expense);
              const Icon = getCategoryIcon(expense.category);
              const nextDate = expense.nextDeductionDate ? new Date(expense.nextDeductionDate) : null;
              const formattedNextDate = nextDate ? nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : null;
              
              return (
                <button
                  key={expense.id}
                  onClick={() => navigate(`/expense/${expense.id}`)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-md ${
                    status === 'paid' ? 'bg-[#1E293B] border-gray-200 opacity-70' : 'bg-[#1E293B] border-gray-100'
                  }`}
                  data-testid={`expense-card-${expense.id}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${getCategoryColor(expense.category)} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold text-[#334155] truncate">{expense.expenseName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap flex-shrink-0 ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#334155]/50 flex-wrap">
                      <span className="truncate max-w-[80px]">{expense.category}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{expense.frequency}</span>
                      {formattedNextDate && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium whitespace-nowrap">Next: {formattedNextDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className={`font-bold ${status === 'paid' ? 'text-emerald-600' : 'text-[#334155]'}`}>
                      ₹ {formatAmount(expense.expectedAmount)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#334155]/30 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {expenses.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/expense?type=Fixed")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#14B8A6] py-3 text-[#14B8A6] font-medium transition-all hover:bg-[#14B8A6]/5"
            data-testid="add-fixed-expense-btn"
          >
            <Plus className="h-5 w-5" />
            Add Fixed Expense
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default FixedExpenses;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Receipt, Home, Zap, ShoppingBag, Car, Stethoscope, GraduationCap, Shield, Tv, CreditCard, Briefcase, Wallet, MoreHorizontal } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const MyExpenses = () => {
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
      // Use the new endpoint that includes next deduction dates
      const response = await axios.get(`${backendUrl}/api/expenses/with-next-date`);
      setExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      // Fallback to regular endpoint
      try {
        const fallbackResponse = await axios.get(`${backendUrl}/api/expenses`);
        setExpenses(fallbackResponse.data);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.expectedAmount || 0), 0);
  const fixedExpenses = expenses.filter(e => e.expenseType === "Fixed");
  const variableExpenses = expenses.filter(e => e.expenseType === "Variable");
  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const variableTotal = variableExpenses.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);

  // Determine payment status based on date
  const getPaymentStatus = (expense) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!expense.selectedDate) return 'upcoming';
    
    const dueDate = new Date();
    dueDate.setDate(parseInt(expense.selectedDate));
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) return 'paid'; // Past date assumed paid
    if (dueDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  // Sort expenses: upcoming first, due today, then paid
  const sortedExpenses = [...expenses].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'paid': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  // Group by category for allocation
  const expenseByCategory = expenses.reduce((acc, exp) => {
    const cat = exp.category || "Other";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += exp.expectedAmount || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b.total - a.total);

  const getCategoryIcon = (category) => {
    const icons = {
      "Housing": Home,
      "Utilities": Zap,
      "Food": ShoppingBag,
      "Transport": Car,
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
      "Transport": "bg-purple-500/20 text-purple-500",
      "Shopping": "bg-pink-500/20 text-pink-500",
      "Medical": "bg-red-500/20 text-red-500",
      "Education": "bg-cyan-500/20 text-cyan-500",
      "Insurance": "bg-indigo-500/20 text-indigo-500",
      "Subscriptions": "bg-teal-500/20 text-teal-500",
      "EMI": "bg-orange-500/20 text-orange-500",
      "Business Expense": "bg-lime-500/20 text-lime-500",
      "Salary Paid": "bg-green-500/20 text-green-500",
    };
    return colors[category] || "bg-gray-500/20 text-gray-500";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'due-today': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const chartColors = ["#EF4444", "#F59E0B", "#3B82F6", "#8B5CF6", "#06B6D4", "#EC4899"];

  // Count paid/pending for Fixed and Variable with totals
  const fixedPaidList = fixedExpenses.filter(e => getPaymentStatus(e) === 'paid');
  const fixedPendingList = fixedExpenses.filter(e => getPaymentStatus(e) !== 'paid');
  const variablePaidList = variableExpenses.filter(e => getPaymentStatus(e) === 'paid');
  const variablePendingList = variableExpenses.filter(e => getPaymentStatus(e) !== 'paid');
  
  const fixedPaidTotal = fixedPaidList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const fixedPendingTotal = fixedPendingList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const variablePaidTotal = variablePaidList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);
  const variablePendingTotal = variablePendingList.reduce((sum, e) => sum + (e.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="my-expenses-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#DC2626] via-[#EF4444] to-[#DC2626] px-6 pt-8 pb-8">
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Expenses
          </h1>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="total-expenses-card">
          <p className="text-white/60 text-sm font-medium mb-1">Total Expenses</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalExpenses)}</h2>
          <p className="text-white/40 text-xs mt-1">{expenses.length} expense sources</p>
          
          {/* Status Summary */}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60 mb-1">Fixed Expenses</p>
              <p className="text-white font-medium">
                <span className="text-emerald-300">{fixedPaid} Paid</span> / <span className="text-amber-300">{fixedPending} Pending</span>
              </p>
            </div>
            <div>
              <p className="text-white/60 mb-1">Variable Expenses</p>
              <p className="text-white font-medium">
                <span className="text-emerald-300">{variablePaid} Paid</span> / <span className="text-amber-300">{variablePending} Pending</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Expense Allocation */}
      {sortedCategories.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100" data-testid="expense-allocation">
            <h3 className="text-sm font-semibold text-[#0B3D2E] mb-4">Expense Breakdown</h3>
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([category, data], idx) => {
                const percentage = totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0;
                const Icon = getCategoryIcon(category);
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${getCategoryColor(category)} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[#0B3D2E]">{category}</span>
                        <span className="text-sm font-semibold text-[#0B3D2E]">₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                        </div>
                        <span className="text-xs text-[#0B3D2E]/50 w-12 text-right">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Fixed vs Variable Split */}
      {expenses.length > 0 && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Fixed Expenses */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-[#0B3D2E]">Fixed</span>
              </div>
              <p className="text-xl font-bold text-[#0B3D2E] mb-1">₹ {formatAmount(fixedTotal)}</p>
              <p className="text-xs text-[#0B3D2E]/50">{fixedExpenses.length} expenses</p>
              <div className="mt-2 space-y-1">
                {fixedExpenses.slice(0, 3).map(exp => (
                  <div key={exp.id} className="flex justify-between text-xs">
                    <span className="text-[#0B3D2E]/60 truncate flex-1">{exp.expenseName}</span>
                    <span className="text-[#0B3D2E] font-medium ml-2">₹{formatAmount(exp.expectedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Variable Expenses */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-[#0B3D2E]">Variable</span>
              </div>
              <p className="text-xl font-bold text-[#0B3D2E] mb-1">₹ {formatAmount(variableTotal)}</p>
              <p className="text-xs text-[#0B3D2E]/50">{variableExpenses.length} expenses</p>
              <div className="mt-2 space-y-1">
                {variableExpenses.slice(0, 3).map(exp => (
                  <div key={exp.id} className="flex justify-between text-xs">
                    <span className="text-[#0B3D2E]/60 truncate flex-1">{exp.expenseName}</span>
                    <span className="text-[#0B3D2E] font-medium ml-2">₹{formatAmount(exp.expectedAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense List */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold text-[#0B3D2E] mb-3">All Expenses</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#0B3D2E]/60">Loading...</div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 mb-4">
              <Receipt className="h-10 w-10 text-rose-500" />
            </div>
            <h2 className="text-lg font-semibold text-[#0B3D2E] mb-2">No Expenses Added Yet</h2>
            <p className="text-[#0B3D2E]/60 text-center text-sm mb-6">Start tracking your expenses</p>
            <button
              onClick={() => navigate("/expense")}
              className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-5 py-2.5 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98]"
            >
              <Plus className="h-5 w-5" />
              Add Expense
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
                    status === 'paid' ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-100'
                  }`}
                  data-testid={`expense-card-${expense.id}`}
                >
                  <div className={`w-12 h-12 rounded-xl ${getCategoryColor(expense.category)} flex items-center justify-center`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-[#0B3D2E]">{expense.expenseName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(status)}`}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#0B3D2E]/50">
                      <span>{expense.category}</span>
                      <span>•</span>
                      <span>{expense.expenseType}</span>
                      {formattedNextDate && expense.expenseType === "Fixed" && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-medium">Next: {formattedNextDate}</span>
                        </>
                      )}
                      {expense.linkedLoanName && (
                        <>
                          <span>•</span>
                          <span className="text-blue-500">Linked: {expense.linkedLoanName}</span>
                        </>
                      )}
                      {expense.linkedInsuranceName && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-500">Linked: {expense.linkedInsuranceName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${status === 'paid' ? 'text-emerald-600' : 'text-[#0B3D2E]'}`}>
                      ₹ {formatAmount(expense.expectedAmount)}
                    </p>
                    <p className="text-xs text-[#0B3D2E]/40">{expense.frequency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#0B3D2E]/30" />
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
            onClick={() => navigate("/expense")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] py-3 text-[#00D09C] font-medium transition-all hover:bg-[#00D09C]/5"
          >
            <Plus className="h-5 w-5" />
            Add New Expense
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyExpenses;

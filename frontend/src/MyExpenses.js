import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Receipt } from "lucide-react";
import axios from "axios";

const MyExpenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/expenses`);
      const sortedExpenses = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setExpenses(sortedExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Housing": "bg-[#3B82F6]/10 text-[#3B82F6]",
      "Utilities": "bg-[#F59E0B]/10 text-[#F59E0B]",
      "Food": "bg-[#10B981]/10 text-[#10B981]",
      "Transport": "bg-[#8B5CF6]/10 text-[#8B5CF6]",
      "Shopping": "bg-[#EC4899]/10 text-[#EC4899]",
      "Medical": "bg-[#EF4444]/10 text-[#EF4444]",
      "Education": "bg-[#06B6D4]/10 text-[#06B6D4]",
      "Insurance": "bg-[#6366F1]/10 text-[#6366F1]",
      "Subscriptions": "bg-[#14B8A6]/10 text-[#14B8A6]",
      "EMI": "bg-[#F97316]/10 text-[#F97316]",
      "Business Expense": "bg-[#84CC16]/10 text-[#84CC16]",
      "Salary Paid": "bg-[#22C55E]/10 text-[#22C55E]",
    };
    return colors[category] || "bg-[#6B7280]/10 text-[#6B7280]";
  };

  const getScheduleText = (expense) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth } = expense;
    
    switch (frequency) {
      case "Daily":
        return "Daily";
      case "Weekly":
        return selectedDay ? `Every ${selectedDay}` : "Weekly";
      case "Monthly":
        return selectedDate ? `${selectedDate}${getOrdinal(selectedDate)} of month` : "Monthly";
      case "Quarterly":
        return selectedQuarter ? `${selectedQuarter}` : "Quarterly";
      case "Half-Yearly":
        return selectedHalf ? `${selectedHalf}` : "Half-Yearly";
      case "Yearly":
        return selectedMonth ? `${selectedMonth}` : "Yearly";
      case "One-Time":
        return "One-Time";
      default:
        return frequency || "Not set";
    }
  };

  const getOrdinal = (n) => {
    const num = parseInt(n);
    if (num > 3 && num < 21) return 'th';
    switch (num % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-expenses-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Expenses
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#0B3D2E]/60">Loading...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FEF3C7] mb-6">
                <Receipt className="h-12 w-12 text-[#F59E0B]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Expense Sources Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your recurring expenses
              </p>
              <button
                type="button"
                onClick={() => navigate("/expense")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-expense-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Expense
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/expense/${expense.id}`)}
                    data-testid={`expense-card-${expense.id}`}
                  >
                    <div className="flex-1">
                      {/* Name and Type Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-[#0B3D2E]">
                          {expense.expenseName}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          expense.expenseType === "Fixed" 
                            ? "bg-[#0B3D2E]/10 text-[#0B3D2E]" 
                            : "bg-[#F59E0B]/10 text-[#F59E0B]"
                        }`}>
                          {expense.expenseType}
                        </span>
                      </div>

                      {/* Category Badge */}
                      <div className="mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </div>

                      {/* Amount and Schedule */}
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-[#0B3D2E]">
                          ₹ {formatAmount(expense.expectedAmount)}
                        </span>
                        <span className="text-sm text-[#0B3D2E]/60">
                          – {getScheduleText(expense)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/expense")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-expense-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Expense
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyExpenses;

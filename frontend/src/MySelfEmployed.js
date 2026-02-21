import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, UserCheck } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MySelfEmployed = () => {
  const navigate = useNavigate();
  const [selfEmployedIncomes, setSelfEmployedIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchSelfEmployedIncomes();
  }, []);

  const fetchSelfEmployedIncomes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      // Filter only Self-Employed type and sort by createdAt DESC
      const data = response.data
        .filter(item => item.type === "Self-Employed")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSelfEmployedIncomes(data);
    } catch (error) {
      console.error("Error fetching self-employed incomes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextPaymentDate = (income) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth } = income;
    const today = new Date();
    
    switch (frequency) {
      case "Daily":
        return formatDate(today);
        
      case "Weekly":
        if (!selectedDay) return "Not set";
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const targetDay = daysOfWeek.indexOf(selectedDay);
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilTarget);
        return formatDate(nextDate);
        
      case "Monthly":
        if (!selectedDate) return "Not set";
        const day = new Date(selectedDate).getDate();
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) {
          nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        }
        return formatDate(nextMonthlyDate);
        
      case "Quarterly":
        if (!selectedMonth || !selectedDate) return "Not set";
        return calculateQuarterlyNextDate(selectedMonth, selectedDate);
        
      case "Half-Yearly":
        if (!selectedMonth || !selectedDate) return "Not set";
        return calculateHalfYearlyNextDate(selectedMonth, selectedDate);
        
      case "Yearly":
        if (!selectedMonth || !selectedDate) return "Not set";
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = new Date(selectedDate).getDate();
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) {
          nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        }
        return formatDate(nextYearlyDate);
        
      case "Others":
        if (income.customDate) {
          return formatDate(new Date(income.customDate));
        }
        return "Custom";
        
      default:
        return "Not set";
    }
  };

  const calculateQuarterlyNextDate = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        return formatDate(nextDate);
      }
    }
    
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    return formatDate(nextYearDate);
  };

  const calculateHalfYearlyNextDate = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const currentYearDate = new Date(today.getFullYear(), monthIndex, day);
    if (currentYearDate > today) {
      return formatDate(currentYearDate);
    }
    
    const nextHalfDate = new Date(today.getFullYear(), monthIndex + 6, day);
    if (nextHalfDate > today) {
      return formatDate(nextHalfDate);
    }
    
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    return formatDate(nextYearDate);
  };

  const formatDate = (date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getFrequencyLabel = (income) => {
    const { frequency, selectedDay, selectedDate, customFrequency } = income;
    
    switch (frequency) {
      case "Daily":
        return "Daily";
      case "Weekly":
        return selectedDay ? `Weekly — ${selectedDay}` : "Weekly";
      case "Monthly":
        if (selectedDate) {
          const day = new Date(selectedDate).getDate();
          const suffix = day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th';
          return `Monthly — ${day}${suffix}`;
        }
        return "Monthly";
      case "Quarterly":
        return "Quarterly";
      case "Half-Yearly":
        return "Half-Yearly";
      case "Yearly":
        return income.selectedMonth ? `Yearly — ${income.selectedMonth}` : "Yearly";
      case "Others":
        return customFrequency || "Custom";
      default:
        return frequency || "Not set";
    }
  };

  const totalIncome = selfEmployedIncomes.reduce((sum, income) => {
    const amount = income.expectedAmount || 0;
    const freq = income.frequency || 'Monthly';
    
    switch (freq) {
      case 'Daily': return sum + (amount * 30);
      case 'Weekly': return sum + (amount * 4);
      case 'Monthly': return sum + amount;
      case 'Quarterly': return sum + (amount / 3);
      case 'Half-Yearly': return sum + (amount / 6);
      case 'Yearly': return sum + (amount / 12);
      default: return sum + amount;
    }
  }, 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--bg-app)" }}
      data-testid="my-self-employed-page"
    >
      {/* Header */}
      <header className="px-6 pt-8 pb-6" style={{ background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)" }}>
        <div className="flex items-center gap-4 mb-4">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 border border-white/30 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/my-income")}
            aria-label="Back to my income"
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Self-Employed
          </h1>
        </div>
        
        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-sm font-medium mb-1">Monthly Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(Math.round(totalIncome))}</h2>
          <p className="text-white/50 text-xs mt-1">{selfEmployedIncomes.length} income source{selfEmployedIncomes.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      {/* Income List */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
          </div>
        ) : selfEmployedIncomes.length === 0 ? (
          <div className="rounded-2xl p-8 text-center shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FEF3C7" }}>
              <UserCheck className="h-8 w-8" style={{ color: "#D97706" }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Self-Employed Income
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Add your freelance, consulting, or professional income
            </p>
            <button
              onClick={() => navigate("/self-employed-income")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all active:scale-95"
              style={{ backgroundColor: "#D97706" }}
              data-testid="add-first-income-button"
            >
              <Plus className="h-5 w-5" />
              Add Self-Employed Income
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {selfEmployedIncomes.map((income) => (
              <button
                key={income.id}
                onClick={() => navigate(`/self-employed-income/${income.id}`)}
                className="w-full rounded-2xl p-4 shadow-card text-left transition-all hover:shadow-md active:scale-[0.99]"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                data-testid={`income-card-${income.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#FEF3C7" }}>
                    <UserCheck className="h-6 w-6" style={{ color: "#D97706" }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {income.name || income.profession}
                        </h3>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          Self-Employed — {income.profession}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-lg font-bold" style={{ color: "#D97706" }}>
                          ₹ {formatAmount(income.expectedAmount || 0)}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {getFrequencyLabel(income)}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next Payment</p>
                        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                          {getNextPaymentDate(income)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
            
            {/* Add More Button */}
            <button
              onClick={() => navigate("/self-employed-income")}
              className="w-full rounded-2xl p-4 border-2 border-dashed flex items-center justify-center gap-2 transition-all hover:border-solid"
              style={{ borderColor: "var(--border-light)", color: "var(--text-secondary)" }}
              data-testid="add-more-income-button"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Add Self-Employed Income</span>
            </button>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MySelfEmployed;

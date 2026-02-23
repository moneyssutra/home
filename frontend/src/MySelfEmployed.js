import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, TrendingUp, Clock, CheckCircle, CalendarClock, Shield, Zap, Filter } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useIncomeList } from "@/hooks/useApi";

const MySelfEmployed = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "fixed", "variable"
  
  // Use SWR for data fetching with caching
  const { data: selfEmployedIncomes = [], isLoading: loading, error } = useIncomeList("Self-Employed");

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Memoize calculations
  const { totalIncome, fixedIncomes, variableIncomes, fixedTotal, variableTotal } = useMemo(() => {
    const total = selfEmployedIncomes.reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);
    const fixed = selfEmployedIncomes.filter(i => i.incomeType === "fixed" || !i.incomeType);
    const variable = selfEmployedIncomes.filter(i => i.incomeType === "variable");
    return {
      totalIncome: total,
      fixedIncomes: fixed,
      variableIncomes: variable,
      fixedTotal: fixed.reduce((sum, i) => sum + (i.expectedAmount || 0), 0),
      variableTotal: variable.reduce((sum, i) => sum + (i.expectedAmount || 0), 0)
    };
  }, [selfEmployedIncomes]);

  // Filter incomes based on active filter
  const filteredIncomes = useMemo(() => {
    if (activeFilter === "fixed") return fixedIncomes;
    if (activeFilter === "variable") return variableIncomes;
    return selfEmployedIncomes;
  }, [selfEmployedIncomes, fixedIncomes, variableIncomes, activeFilter]);

  const getPaymentStatus = (income) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextDate = getNextPaymentDateObj(income);
    if (!nextDate) return 'upcoming';
    
    nextDate.setHours(0, 0, 0, 0);
    
    if (nextDate < today) return 'received';
    if (nextDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  const getNextPaymentDateObj = (income) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth, customDate } = income;
    const today = new Date();
    
    switch (frequency) {
      case "Daily":
        return new Date(today);
        
      case "Weekly":
        if (!selectedDay) return null;
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const targetDay = daysOfWeek.indexOf(selectedDay);
        const currentDay = today.getDay();
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget <= 0) daysUntilTarget += 7;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilTarget);
        return nextDate;
        
      case "Monthly":
        if (!selectedDate) return null;
        const day = new Date(selectedDate).getDate();
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) {
          nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        }
        return nextMonthlyDate;
        
      case "Quarterly":
        if (!selectedMonth || !selectedDate) return null;
        return calculateQuarterlyNextDateObj(selectedMonth, selectedDate);
        
      case "Half-Yearly":
        if (!selectedMonth || !selectedDate) return null;
        return calculateHalfYearlyNextDateObj(selectedMonth, selectedDate);
        
      case "Yearly":
        if (!selectedMonth || !selectedDate) return null;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = new Date(selectedDate).getDate();
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) {
          nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        }
        return nextYearlyDate;
        
      case "Others":
        if (customDate) return new Date(customDate);
        return null;
        
      default:
        return null;
    }
  };

  const calculateQuarterlyNextDateObj = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let i = 0; i < 4; i++) {
      const targetMonth = quarterMonths[i];
      let targetYear = today.getFullYear();
      if (targetMonth < today.getMonth() || (targetMonth === today.getMonth() && day <= today.getDate())) {
        if (i === 3) targetYear++;
        continue;
      }
      return new Date(targetYear, targetMonth, day);
    }
    return new Date(today.getFullYear() + 1, quarterMonths[0], day);
  };

  const calculateHalfYearlyNextDateObj = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const halfYearMonths = [monthIndex, (monthIndex + 6) % 12];
    
    for (const targetMonth of halfYearMonths) {
      let targetYear = today.getFullYear();
      if (targetMonth < today.getMonth() || (targetMonth === today.getMonth() && day <= today.getDate())) {
        continue;
      }
      return new Date(targetYear, targetMonth, day);
    }
    return new Date(today.getFullYear() + 1, halfYearMonths[0], day);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getNextPaymentDate = (income) => {
    const dateObj = getNextPaymentDateObj(income);
    return formatDate(dateObj);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-3 w-3" /> Received
          </span>
        );
      case 'due-today':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3" /> Due Today
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
            <CalendarClock className="h-3 w-3" /> Upcoming
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#00D09C] border-t-transparent mx-auto mb-4"></div>
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <BackButton to="/my-income" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Self-Employed Income
          </h1>
        </div>

        {/* Summary Cards */}
        {selfEmployedIncomes.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Fixed Income Card */}
            <div 
              className="rounded-xl p-4 flex flex-col justify-between min-h-[100px]" 
              style={{ 
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)"
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Fixed</span>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(fixedTotal)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {fixedIncomes.length} income{fixedIncomes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Variable Income Card */}
            <div 
              className="rounded-xl p-4 flex flex-col justify-between min-h-[100px]" 
              style={{ 
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-light)"
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" style={{ color: "#F59E0B" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Variable</span>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  ₹{formatAmount(variableTotal)}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {variableIncomes.length} income{variableIncomes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        {selfEmployedIncomes.length > 0 && (
          <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeFilter === "all" 
                  ? "text-white" 
                  : ""
              }`}
              style={{
                backgroundColor: activeFilter === "all" ? "var(--brand-primary)" : "var(--bg-subtle)",
                color: activeFilter === "all" ? "white" : "var(--text-secondary)"
              }}
            >
              <Filter className="h-3 w-3" />
              All ({selfEmployedIncomes.length})
            </button>
            <button
              onClick={() => setActiveFilter("fixed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all`}
              style={{
                backgroundColor: activeFilter === "fixed" ? "var(--brand-primary)" : "var(--bg-subtle)",
                color: activeFilter === "fixed" ? "white" : "var(--text-secondary)"
              }}
            >
              <Shield className="h-3 w-3" />
              Fixed ({fixedIncomes.length})
            </button>
            <button
              onClick={() => setActiveFilter("variable")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all`}
              style={{
                backgroundColor: activeFilter === "variable" ? "#F59E0B" : "var(--bg-subtle)",
                color: activeFilter === "variable" ? "white" : "var(--text-secondary)"
              }}
            >
              <Zap className="h-3 w-3" />
              Variable ({variableIncomes.length})
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {selfEmployedIncomes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
            <Briefcase className="h-10 w-10" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            No Self-Employed Income Yet
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            Track your freelance, consulting, or professional income here
          </p>
          <button
            onClick={() => navigate("/self-employed-income")}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Plus className="h-5 w-5" />
            Add Self-Employed Income
          </button>
        </div>
      ) : (
        <div className="px-6 space-y-3">
          {filteredIncomes.map((income) => {
            const status = getPaymentStatus(income);
            const isVariable = income.incomeType === "variable";
            
            return (
              <button
                key={income.id}
                onClick={() => navigate(`/self-employed-income/${income.id}`)}
                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md shadow-card"
                style={{ 
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-light)",
                  opacity: status === 'received' ? 0.7 : 1
                }}
                data-testid={`self-employed-card-${income.id}`}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ 
                    backgroundColor: isVariable ? "#FEF3C7" : "var(--brand-primary-soft)"
                  }}
                >
                  {isVariable ? (
                    <Zap className="h-6 w-6 text-amber-500" />
                  ) : (
                    <Briefcase className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
                  )}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {income.name || income.profession}
                    </h3>
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>{income.frequency}</span>
                    <span>•</span>
                    <span>Next: {getNextPaymentDate(income)}</span>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <p className="font-bold" style={{ color: "var(--brand-primary)" }}>
                    ₹{formatAmount(income.expectedAmount)}
                  </p>
                  <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Add Button (when list exists) */}
      {selfEmployedIncomes.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/self-employed-income")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium"
            style={{ 
              borderColor: "var(--brand-primary)",
              color: "var(--brand-primary)"
            }}
          >
            <Plus className="h-5 w-5" />
            Add Self-Employed Income
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MySelfEmployed;

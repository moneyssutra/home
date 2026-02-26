import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, TrendingUp, Clock, CheckCircle, CalendarClock, Shield, Zap, User } from "lucide-react";
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
    const fixed = selfEmployedIncomes.filter(i => i.incomeType !== "variable");
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
        const day = parseInt(selectedDate) || 1;
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
        const yearlyDay = parseInt(selectedDate) || 1;
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
    const day = parseInt(dateStr) || 1;
    const today = new Date();
    
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        return nextDate;
      }
    }
    
    return new Date(today.getFullYear() + 1, monthIndex, day);
  };

  const calculateHalfYearlyNextDateObj = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = parseInt(dateStr) || 1;
    const today = new Date();
    
    const currentYearDate = new Date(today.getFullYear(), monthIndex, day);
    if (currentYearDate > today) {
      return currentYearDate;
    }
    
    const nextHalfDate = new Date(today.getFullYear(), monthIndex + 6, day);
    if (nextHalfDate > today) {
      return nextHalfDate;
    }
    
    return new Date(today.getFullYear() + 1, monthIndex, day);
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const sortedIncomes = [...filteredIncomes].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'received': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  // Group by frequency
  const incomeByFrequency = selfEmployedIncomes.reduce((acc, inc) => {
    const freq = inc.frequency || "Other";
    if (!acc[freq]) acc[freq] = { total: 0, count: 0 };
    acc[freq].total += inc.expectedAmount || 0;
    acc[freq].count += 1;
    return acc;
  }, {});

  const sortedFrequencies = Object.entries(incomeByFrequency).sort(([, a], [, b]) => b.total - a.total);

  const getFrequencyIcon = (frequency) => {
    const icons = {
      "Daily": Clock, "Weekly": CalendarClock, "Monthly": TrendingUp,
      "Quarterly": TrendingUp, "Half-Yearly": TrendingUp, "Yearly": TrendingUp,
    };
    return icons[frequency] || Briefcase;
  };

  const getFrequencyColor = (frequency) => {
    const colors = {
      "Daily": { bg: "var(--status-success-soft)", text: "var(--status-success)" },
      "Weekly": { bg: "var(--status-info-soft)", text: "var(--status-info)" },
      "Monthly": { bg: "var(--brand-primary-soft)", text: "var(--brand-primary)" },
      "Quarterly": { bg: "#F3E8FF", text: "var(--chart-accent2)" },
      "Half-Yearly": { bg: "#FCE7F3", text: "#DB2777" },
      "Yearly": { bg: "var(--status-warning-soft)", text: "var(--status-warning)" },
    };
    return colors[frequency] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return { bg: "var(--status-success-soft)", text: "var(--status-success)", border: "var(--status-success)" };
      case 'due-today': return { bg: "var(--status-warning-soft)", text: "var(--status-warning)", border: "var(--status-warning)" };
      case 'upcoming': return { bg: "var(--status-info-soft)", text: "var(--status-info)", border: "var(--status-info)" };
      default: return { bg: "var(--bg-subtle)", text: "var(--text-secondary)", border: "var(--border-light)" };
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'received': return 'Received';
      case 'due-today': return 'Due Today';
      case 'upcoming': return 'Upcoming';
      default: return '';
    }
  };

  const chartColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

  // Calculate received vs pending
  const fixedReceivedList = fixedIncomes.filter(i => getPaymentStatus(i) === 'received');
  const fixedPendingList = fixedIncomes.filter(i => getPaymentStatus(i) !== 'received');
  const variableReceivedList = variableIncomes.filter(i => getPaymentStatus(i) === 'received');
  const variablePendingList = variableIncomes.filter(i => getPaymentStatus(i) !== 'received');
  
  const fixedReceivedTotal = fixedReceivedList.reduce((sum, i) => sum + (i.expectedAmount || 0), 0);
  const fixedPendingTotal = fixedPendingList.reduce((sum, i) => sum + (i.expectedAmount || 0), 0);
  const variableReceivedTotal = variableReceivedList.reduce((sum, i) => sum + (i.expectedAmount || 0), 0);
  const variablePendingTotal = variablePendingList.reduce((sum, i) => sum + (i.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-self-employed-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/my-income" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Self-Employed Income
          </h1>
        </div>

        {/* Total Income Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-income-card">
          <p className="text-white/70 text-sm font-medium mb-1">Total Expected Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/50 text-xs mt-1">{selfEmployedIncomes.length} income sources</p>
          
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Fixed Income</p>
              <p className="text-white font-medium">
                <span style={{ color: "#A7F3D0" }}>₹{formatAmount(fixedReceivedTotal)} Received</span>
              </p>
              <p className="text-white font-medium">
                <span style={{ color: "#FDE68A" }}>₹{formatAmount(fixedPendingTotal)} Pending</span>
              </p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Variable Income</p>
              <p className="text-white font-medium">
                <span style={{ color: "#A7F3D0" }}>₹{formatAmount(variableReceivedTotal)} Received</span>
              </p>
              <p className="text-white font-medium">
                <span style={{ color: "#FDE68A" }}>₹{formatAmount(variablePendingTotal)} Pending</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Income Breakdown by Frequency */}
      {sortedFrequencies.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="income-breakdown">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Income by Frequency</h3>
            <div className="space-y-3">
              {sortedFrequencies.slice(0, 5).map(([frequency, data], idx) => {
                const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
                const Icon = getFrequencyIcon(frequency);
                const freqColor = getFrequencyColor(frequency);
                return (
                  <div key={frequency} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: freqColor.bg }}>
                      <Icon className="h-5 w-5" style={{ color: freqColor.text }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{frequency}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }} />
                        </div>
                        <span className="text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(0)}%</span>
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
      {selfEmployedIncomes.length > 0 && (
        <div className="px-6 mt-4">
          <div className="grid grid-cols-2 gap-3" style={{ alignItems: "stretch" }}>
            <div
              className="rounded-2xl p-4 shadow-card text-left flex flex-col"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", minHeight: "160px" }}
              data-testid="fixed-income-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <Shield className="h-4 w-4" style={{ color: "var(--text-secondary)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Fixed</span>
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(fixedTotal)}</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{fixedIncomes.length} income{fixedIncomes.length !== 1 ? 's' : ''}</p>
              <div className="mt-auto space-y-1">
                {fixedIncomes.slice(0, 2).map(inc => (
                  <div key={inc.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{inc.name || inc.profession}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(inc.expectedAmount)}</span>
                  </div>
                ))}
                {fixedIncomes.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--brand-primary)" }}>+{fixedIncomes.length - 2} more</p>
                )}
              </div>
            </div>

            <div
              className="rounded-2xl p-4 shadow-card text-left flex flex-col"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", minHeight: "160px" }}
              data-testid="variable-income-card"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--status-warning-soft)" }}>
                  <Zap className="h-4 w-4" style={{ color: "var(--status-warning)" }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Variable</span>
              </div>
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(variableTotal)}</p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{variableIncomes.length} income{variableIncomes.length !== 1 ? 's' : ''}</p>
              <div className="mt-auto space-y-1">
                {variableIncomes.slice(0, 2).map(inc => (
                  <div key={inc.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{inc.name || inc.profession}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(inc.expectedAmount)}</span>
                  </div>
                ))}
                {variableIncomes.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--status-warning)" }}>+{variableIncomes.length - 2} more</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Income List */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Incomes</h3>
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "all" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "all" ? "var(--brand-primary)" : "var(--text-muted)" }}
              data-testid="filter-all"
            >
              All ({selfEmployedIncomes.length})
            </button>
            <button
              onClick={() => setActiveFilter("fixed")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "fixed" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "fixed" ? "var(--brand-primary)" : "var(--text-muted)" }}
              data-testid="filter-fixed"
            >
              Fixed ({fixedIncomes.length})
            </button>
            <button
              onClick={() => setActiveFilter("variable")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "variable" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "variable" ? "var(--status-warning)" : "var(--text-muted)" }}
              data-testid="filter-variable"
            >
              Variable ({variableIncomes.length})
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : selfEmployedIncomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
              <User className="h-10 w-10" style={{ color: "var(--brand-primary)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Self-Employed Income Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Track your freelance, consulting, or professional income</p>
            <button
              onClick={() => navigate("/self-employed-income")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--brand-primary)" }}
              data-testid="add-self-employed-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add Self-Employed Income
            </button>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No {activeFilter} incomes found
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--brand-primary)" }}
            >
              Show all incomes
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedIncomes.map((income) => {
              const status = getPaymentStatus(income);
              const Icon = getFrequencyIcon(income.frequency);
              const freqColor = getFrequencyColor(income.frequency);
              const statusColor = getStatusColor(status);
              const nextDate = getNextPaymentDateObj(income);
              const formattedNextDate = formatDate(nextDate);
              
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: freqColor.bg }}>
                    <Icon className="h-6 w-6" style={{ color: freqColor.text }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{income.name || income.profession}</h3>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span className="truncate max-w-[80px]">{income.frequency}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{income.incomeType === "variable" ? "Variable" : "Fixed"}</span>
                      {formattedNextDate && income.incomeType !== "variable" && (
                        <>
                          <span>•</span>
                          <span className="font-medium whitespace-nowrap" style={{ color: "var(--status-warning)" }}>Next: {formattedNextDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold" style={{ color: status === 'received' ? "var(--status-success)" : "var(--text-primary)" }}>
                      ₹ {formatAmount(income.expectedAmount)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{income.frequency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {selfEmployedIncomes.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/self-employed-income")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium transition-all"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
            data-testid="add-self-employed-button"
          >
            <Plus className="h-5 w-5" />
            Add Self-Employed Income
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MySelfEmployed;

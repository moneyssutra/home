import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, TrendingUp, Clock, CheckCircle, CalendarClock, Shield, Zap, Filter } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useIncomeList } from "@/hooks/useApi";

const MyBusiness = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "fixed", "variable"
  
  // Use SWR for data fetching with caching
  const { data: businesses = [], isLoading: loading, error } = useIncomeList("Business");

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Memoize calculations
  const { totalIncome, fixedBusinesses, variableBusinesses, fixedTotal, variableTotal, rawTotal } = useMemo(() => {
    const total = businesses.reduce((sum, biz) => sum + (biz.monthlyTotal || biz.expectedAmount || 0), 0);
    const raw = businesses.reduce((sum, biz) => sum + (biz.expectedAmount || 0), 0);
    const fixed = businesses.filter(b => b.incomeType !== "variable");
    const variable = businesses.filter(b => b.incomeType === "variable");
    return {
      totalIncome: total,
      rawTotal: raw,
      fixedBusinesses: fixed,
      variableBusinesses: variable,
      fixedTotal: fixed.reduce((sum, b) => sum + (b.monthlyTotal || b.expectedAmount || 0), 0),
      variableTotal: variable.reduce((sum, b) => sum + (b.monthlyTotal || b.expectedAmount || 0), 0)
    };
  }, [businesses]);

  // Filter businesses based on active filter
  const filteredBusinesses = useMemo(() => {
    if (activeFilter === "fixed") return fixedBusinesses;
    if (activeFilter === "variable") return variableBusinesses;
    return businesses;
  }, [businesses, fixedBusinesses, variableBusinesses, activeFilter]);

  const getPaymentStatus = (business) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextDate = getNextPaymentDateObj(business);
    if (!nextDate) return 'upcoming';
    
    nextDate.setHours(0, 0, 0, 0);
    
    if (nextDate < today) return 'received';
    if (nextDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  const getNextPaymentDateObj = (business) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth, customDate } = business;
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
        // Handle selectedDate as full date string (e.g., "2026-06-01") or day number
        if (typeof selectedDate === 'string' && selectedDate.includes('-')) {
          const startDate = new Date(selectedDate + 'T00:00:00');
          if (startDate > today) return startDate;
          // Find next monthly occurrence from start date
          const nextFromStart = new Date(today.getFullYear(), today.getMonth(), startDate.getDate());
          if (nextFromStart <= today) {
            nextFromStart.setMonth(nextFromStart.getMonth() + 1);
          }
          return nextFromStart;
        }
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
        if (customDate) {
          return new Date(customDate);
        }
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

  const sortedBusinesses = [...filteredBusinesses].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'received': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  // Group by frequency
  const businessByFrequency = businesses.reduce((acc, biz) => {
    const freq = biz.frequency || "Other";
    if (!acc[freq]) acc[freq] = { total: 0, count: 0 };
    acc[freq].total += biz.expectedAmount || 0;
    acc[freq].count += 1;
    return acc;
  }, {});

  const sortedFrequencies = Object.entries(businessByFrequency).sort(([, a], [, b]) => b.total - a.total);

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

  // Calculate received vs pending using schedule-based monthly amounts from API
  const fixedReceivedTotal = fixedBusinesses.reduce((sum, b) => sum + (b.monthlyReceived || 0), 0);
  const fixedPendingTotal = fixedBusinesses.reduce((sum, b) => sum + (b.monthlyPending || 0), 0);
  const variableReceivedTotal = variableBusinesses.reduce((sum, b) => sum + (b.monthlyReceived || 0), 0);
  const variablePendingTotal = variableBusinesses.reduce((sum, b) => sum + (b.monthlyPending || 0), 0);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-business-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/my-income" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Business
          </h1>
        </div>

        {/* Total Income Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-income-card">
          <p className="text-white/70 text-sm font-medium mb-1">Expected Monthly Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/50 text-xs mt-1">{businesses.length} business source{businesses.length !== 1 ? "s" : ""} · adjusted to monthly</p>
          
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Fixed (this month)</p>
              <p className="text-white font-medium">
                <span style={{ color: "#A7F3D0" }}>₹{formatAmount(fixedReceivedTotal)} Received</span>
              </p>
              <p className="text-white font-medium">
                <span style={{ color: "#FDE68A" }}>₹{formatAmount(fixedPendingTotal)} Pending</span>
              </p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Variable (this month)</p>
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
      {businesses.length > 0 && (
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
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(fixedTotal)}<span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/mo</span></p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{fixedBusinesses.length} businesses</p>
              <div className="mt-auto space-y-1">
                {fixedBusinesses.slice(0, 2).map(biz => (
                  <div key={biz.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{biz.name}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(biz.expectedAmount)}</span>
                  </div>
                ))}
                {fixedBusinesses.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--brand-primary)" }}>+{fixedBusinesses.length - 2} more</p>
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
              <p className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(variableTotal)}<span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>/mo</span></p>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{variableBusinesses.length} businesses</p>
              <div className="mt-auto space-y-1">
                {variableBusinesses.slice(0, 2).map(biz => (
                  <div key={biz.id} className="flex justify-between text-xs">
                    <span className="truncate flex-1" style={{ color: "var(--text-muted)" }}>{biz.name}</span>
                    <span className="font-medium ml-2" style={{ color: "var(--text-primary)" }}>₹{formatAmount(biz.expectedAmount)}</span>
                  </div>
                ))}
                {variableBusinesses.length > 2 && (
                  <p className="text-xs font-medium" style={{ color: "var(--status-warning)" }}>+{variableBusinesses.length - 2} more</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business List */}
      <div className="px-6 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Businesses</h3>
          
          {/* Quick Filters */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "all" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "all" ? "var(--brand-primary)" : "var(--text-muted)" }}
              data-testid="filter-all"
            >
              All ({businesses.length})
            </button>
            <button
              onClick={() => setActiveFilter("fixed")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "fixed" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "fixed" ? "var(--brand-primary)" : "var(--text-muted)" }}
              data-testid="filter-fixed"
            >
              Fixed ({fixedBusinesses.length})
            </button>
            <button
              onClick={() => setActiveFilter("variable")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeFilter === "variable" ? "bg-white shadow-sm" : ""}`}
              style={{ color: activeFilter === "variable" ? "var(--status-warning)" : "var(--text-muted)" }}
              data-testid="filter-variable"
            >
              Variable ({variableBusinesses.length})
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
              <Briefcase className="h-10 w-10" style={{ color: "var(--brand-primary)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Businesses Added Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Start by adding your first business income source</p>
            <button
              onClick={() => navigate("/business-income")}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--brand-primary)" }}
              data-testid="add-business-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add Business
            </button>
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-6">
            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No {activeFilter} businesses found
            </p>
            <button
              onClick={() => setActiveFilter("all")}
              className="mt-2 text-sm font-medium"
              style={{ color: "var(--brand-primary)" }}
            >
              Show all businesses
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedBusinesses.map((business) => {
              const status = getPaymentStatus(business);
              const Icon = getFrequencyIcon(business.frequency);
              const freqColor = getFrequencyColor(business.frequency);
              const statusColor = getStatusColor(status);
              const nextDate = getNextPaymentDateObj(business);
              const formattedNextDate = formatDate(nextDate);
              
              return (
                <button
                  key={business.id}
                  onClick={() => navigate(`/wealth/income/${business.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md shadow-card"
                  style={{ 
                    backgroundColor: "var(--bg-card)", 
                    border: "1px solid var(--border-light)",
                    opacity: status === 'received' ? 0.7 : 1
                  }}
                  data-testid={`business-card-${business.id}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: freqColor.bg }}>
                    <Icon className="h-6 w-6" style={{ color: freqColor.text }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{business.name}</h3>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}
                      >
                        {getStatusLabel(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span className="truncate max-w-[80px]">{business.frequency}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">{business.incomeType === "variable" ? "Variable" : "Fixed"}</span>
                      {formattedNextDate && business.incomeType !== "variable" && (
                        <>
                          <span>•</span>
                          <span className="font-medium whitespace-nowrap" style={{ color: "var(--status-warning)" }}>Next: {formattedNextDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold" style={{ color: status === 'received' ? "var(--status-success)" : "var(--text-primary)" }}>
                      ₹ {formatAmount(business.expectedAmount)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>/{business.frequency?.toLowerCase()?.replace("monthly","mo")?.replace("weekly","wk")?.replace("daily","day")?.replace("quarterly","qtr")?.replace("yearly","yr")}</p>
                    {business.frequency !== "Monthly" && business.monthlyTotal > 0 && (
                      <p className="text-[10px] font-medium" style={{ color: "var(--brand-primary)" }}>≈ ₹{formatAmount(business.monthlyTotal)}/mo</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Button */}
      {businesses.length > 0 && (
        <div className="px-6 mt-6">
          <button
            onClick={() => navigate("/business-income")}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium transition-all"
            style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
            data-testid="add-business-button"
          >
            <Plus className="h-5 w-5" />
            Add New Business
          </button>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyBusiness;

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Wallet, Gift, Award, TrendingUp, RefreshCw, Sparkles, Clock, CalendarClock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";
import { useOtherIncomeList } from "@/hooks/useApi";

const MyOtherIncome = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const { data: otherIncomes = [], isLoading: loading, error } = useOtherIncomeList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const totalIncome = useMemo(() => {
    return otherIncomes.reduce((sum, o) => sum + (o.expectedAmount || 0), 0);
  }, [otherIncomes]);

  const getPaymentStatus = (income) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (income.isReceived) return 'received';
    const nextDate = getNextPaymentDateObj(income);
    if (!nextDate) return 'upcoming';
    nextDate.setHours(0, 0, 0, 0);
    if (nextDate < today) return 'received';
    if (nextDate.getTime() === today.getTime()) return 'due-today';
    return 'upcoming';
  };

  const getNextPaymentDateObj = (income) => {
    const { frequency, dateReceived, selectedDate, selectedMonth, customDate } = income;
    const today = new Date();
    if (frequency === "One-Time") return dateReceived ? new Date(dateReceived) : null;
    switch (frequency) {
      case "Monthly":
        if (!selectedDate) return null;
        const day = parseInt(selectedDate);
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        return nextMonthlyDate;
      case "Yearly":
        if (!selectedMonth || !selectedDate) return null;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = parseInt(selectedDate);
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        return nextYearlyDate;
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not set";
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const sortedOtherIncomes = [...otherIncomes].sort((a, b) => {
    const statusOrder = { 'upcoming': 0, 'due-today': 1, 'received': 2 };
    return statusOrder[getPaymentStatus(a)] - statusOrder[getPaymentStatus(b)];
  });

  const incomeByCategory = otherIncomes.reduce((acc, o) => {
    const cat = o.category || "Miscellaneous";
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += o.expectedAmount || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(incomeByCategory).sort(([, a], [, b]) => b.total - a.total);

  const getCategoryIcon = (category) => {
    const icons = { "Gift": Gift, "Bonus": Award, "Incentive": Sparkles, "Capital Gain": TrendingUp, "Tax Refund": RefreshCw, "Cashback / Reward": Wallet, "Refund": RefreshCw, "Windfall": Sparkles };
    return icons[category] || Wallet;
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Gift": { bg: "#FCE7F3", text: "#DB2777" },
      "Bonus": { bg: "var(--status-warning-soft)", text: "var(--status-warning)" },
      "Incentive": { bg: "#F3E8FF", text: "var(--chart-accent2)" },
      "Capital Gain": { bg: "var(--status-success-soft)", text: "var(--status-success)" },
      "Tax Refund": { bg: "var(--status-info-soft)", text: "var(--status-info)" },
      "Cashback / Reward": { bg: "var(--brand-primary-soft)", text: "var(--brand-primary)" },
      "Refund": { bg: "#CFFAFE", text: "#0891B2" },
      "Windfall": { bg: "#FEF3C7", text: "#D97706" },
    };
    return colors[category] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
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
    switch (status) { case 'received': return 'Received'; case 'due-today': return 'Due Today'; case 'upcoming': return 'Upcoming'; default: return ''; }
  };

  const chartColors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4"];

  const receivedTotal = otherIncomes.filter(o => getPaymentStatus(o) === 'received').reduce((sum, o) => sum + (o.expectedAmount || 0), 0);
  const pendingTotal = otherIncomes.filter(o => getPaymentStatus(o) !== 'received').reduce((sum, o) => sum + (o.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-other-income-page">
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/my-income" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>Other Income</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-income-card">
          <p className="text-white/70 text-sm font-medium mb-1">Total Other Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/50 text-xs mt-1">{otherIncomes.length} income sources</p>
          
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Received</p>
              <p className="text-white font-semibold" style={{ color: "#A7F3D0" }}>₹{formatAmount(receivedTotal)}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Pending</p>
              <p className="text-white font-semibold" style={{ color: "#FDE68A" }}>₹{formatAmount(pendingTotal)}</p>
            </div>
          </div>
        </div>
      </header>

      {sortedCategories.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Income by Category</h3>
            <div className="space-y-3">
              {sortedCategories.slice(0, 5).map(([category, data], idx) => {
                const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
                const Icon = getCategoryIcon(category);
                const catColor = getCategoryColor(category);
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: catColor.bg }}><Icon className="h-5 w-5" style={{ color: catColor.text }} /></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{category}</span>
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

      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>All Other Income</h3>
        {loading ? (<div className="flex items-center justify-center py-12"><div style={{ color: "var(--text-muted)" }}>Loading...</div></div>
        ) : otherIncomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "var(--status-warning-soft)" }}><Wallet className="h-10 w-10" style={{ color: "var(--status-warning)" }} /></div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Other Income Added Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Track gifts, bonuses, refunds and other income sources</p>
            <button onClick={() => navigate("/other-income")} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium" style={{ backgroundColor: "var(--brand-primary)" }}><Plus className="h-5 w-5" />Add Other Income</button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOtherIncomes.map((income) => {
              const status = getPaymentStatus(income);
              const Icon = getCategoryIcon(income.category);
              const catColor = getCategoryColor(income.category);
              const statusColor = getStatusColor(status);
              const nextDate = getNextPaymentDateObj(income);
              const formattedNextDate = formatDate(nextDate);
              return (
                <button key={income.id} onClick={() => navigate(`/other-income/${income.id}`)} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", opacity: status === 'received' ? 0.7 : 1 }} data-testid={`other-income-card-${income.id}`}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: catColor.bg }}><Icon className="h-6 w-6" style={{ color: catColor.text }} /></div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{income.incomeName || income.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap" style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>{getStatusLabel(status)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span>{income.category || "Other"}</span><span>•</span><span>{income.frequency}</span>
                      {formattedNextDate && status !== 'received' && (<><span>•</span><span className="font-medium" style={{ color: "var(--status-warning)" }}>Expected: {formattedNextDate}</span></>)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-bold" style={{ color: status === 'received' ? "var(--status-success)" : "var(--text-primary)" }}>₹ {formatAmount(income.expectedAmount || income.amount)}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{income.frequency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {otherIncomes.length > 0 && (<div className="px-6 mt-6"><button onClick={() => navigate("/other-income")} className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 font-medium" style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}><Plus className="h-5 w-5" />Add Other Income</button></div>)}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyOtherIncome;

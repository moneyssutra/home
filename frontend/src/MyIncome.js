import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, Banknote, Home, Percent, TrendingUp, PieChart, MoreHorizontal, Gift, UserCheck } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import BackButton from "@/components/BackButton";

const MyIncome = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchAllIncomes();
  }, []);

  const fetchAllIncomes = async () => {
    try {
      setLoading(true);
      const [regularRes, otherRes] = await Promise.all([
        axios.get(`${backendUrl}/api/income`),
        axios.get(`${backendUrl}/api/other-income`).catch(() => ({ data: [] })),
      ]);
      setIncomes(regularRes.data);
      setOtherIncomes(otherRes.data);
    } catch (error) {
      console.error("Error fetching incomes:", error);
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

  const calculateMonthlyAmount = (income) => {
    const amount = income.expectedAmount || 0;
    const freq = income.frequency || 'Monthly';
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    switch (freq) {
      case 'Daily': return amount * 30;
      case 'Weekly': return amount * 4;
      case 'Monthly': return amount;
      case 'Quarterly':
        const quarterMonths = [1, 4, 7, 10];
        return quarterMonths.includes(currentMonth) ? amount : 0;
      case 'Half-Yearly':
        return [1, 7].includes(currentMonth) ? amount : 0;
      case 'Yearly':
        const monthMapping = {
          "January": 1, "February": 2, "March": 3, "April": 4,
          "May": 5, "June": 6, "July": 7, "August": 8,
          "September": 9, "October": 10, "November": 11, "December": 12
        };
        const selectedMonth = income.selectedMonth || '';
        return monthMapping[selectedMonth] === currentMonth ? amount : 0;
      case 'Irregular':
      case 'Others':
        if (income.customDate) {
          try {
            const dateObj = new Date(income.customDate);
            if (dateObj.getMonth() + 1 === currentMonth && dateObj.getFullYear() === currentYear) {
              return amount;
            }
          } catch (e) {}
        }
        return 0;
      default: return amount;
    }
  };

  const calculateOtherIncomeMonthly = (otherInc) => {
    const amount = otherInc.amount || 0;
    const freq = otherInc.frequency || 'One-Time';
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    switch (freq) {
      case 'One-Time':
        if (otherInc.dateReceived) {
          try {
            const dateObj = new Date(otherInc.dateReceived);
            if (dateObj.getMonth() + 1 === currentMonth && dateObj.getFullYear() === currentYear) {
              return amount;
            }
          } catch (e) {}
        }
        return 0;
      case 'Monthly': return amount;
      case 'Quarterly':
        return [1, 4, 7, 10].includes(currentMonth) ? amount : 0;
      case 'Yearly':
        const monthMapping = {
          "January": 1, "February": 2, "March": 3, "April": 4,
          "May": 5, "June": 6, "July": 7, "August": 8,
          "September": 9, "October": 10, "November": 11, "December": 12
        };
        return monthMapping[otherInc.selectedMonth] === currentMonth ? amount : 0;
      case 'Irregular':
        if (otherInc.dateReceived) {
          try {
            const dateObj = new Date(otherInc.dateReceived);
            if (dateObj.getMonth() + 1 === currentMonth && dateObj.getFullYear() === currentYear) {
              return amount;
            }
          } catch (e) {}
        }
        return 0;
      default: return amount;
    }
  };

  const totalRegularIncome = incomes.reduce((sum, inc) => sum + calculateMonthlyAmount(inc), 0);
  const totalOtherIncome = otherIncomes.reduce((sum, inc) => sum + calculateOtherIncomeMonthly(inc), 0);
  const totalIncome = totalRegularIncome + totalOtherIncome;

  const incomeByType = incomes.reduce((acc, inc) => {
    const type = inc.type || "Other";
    if (!acc[type]) acc[type] = { total: 0, count: 0 };
    acc[type].total += calculateMonthlyAmount(inc);
    acc[type].count += 1;
    return acc;
  }, {});

  if (otherIncomes.length > 0) {
    incomeByType["Other Income"] = { total: totalOtherIncome, count: otherIncomes.length };
  }

  const sortedTypes = Object.entries(incomeByType).sort(([, a], [, b]) => b.total - a.total);

  const getTypeIcon = (type) => {
    const icons = {
      Business: Briefcase,
      Job: Banknote,
      "Self-Employed": UserCheck,
      Rental: Home,
      Commission: Percent,
      Interest: TrendingUp,
      Dividend: PieChart,
      "Other Income": Gift,
    };
    return icons[type] || MoreHorizontal;
  };

  const getTypeColor = (type) => {
    const colors = {
      Business: { bg: "var(--brand-primary-soft)", text: "var(--brand-primary)" },
      Job: { bg: "var(--status-info-soft)", text: "var(--status-info)" },
      "Self-Employed": { bg: "#FEF3C7", text: "#D97706" },
      Rental: { bg: "var(--status-warning-soft)", text: "var(--status-warning)" },
      Commission: { bg: "#F3E8FF", text: "var(--chart-accent2)" },
      Interest: { bg: "#CFFAFE", text: "#0891B2" },
      Dividend: { bg: "#FCE7F3", text: "#DB2777" },
      "Other Income": { bg: "#F3E8FF", text: "var(--chart-accent2)" },
    };
    return colors[type] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const getTypePath = (type) => {
    const paths = {
      Business: "/my-business",
      Job: "/my-job",
      "Self-Employed": "/my-self-employed",
      Rental: "/my-rental",
      Commission: "/my-commission",
      Interest: "/my-interest",
      Dividend: "/my-dividend",
      "Other Income": "/my-other-income",
    };
    return paths[type] || "/";
  };

  const chartColors = ["#059669", "#3B82F6", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  
  const getReceivedAndPending = (income) => {
    const freq = income.frequency || 'Monthly';
    const monthlyAmount = calculateMonthlyAmount(income);
    
    if (freq === 'Daily') {
      const receivedDays = currentDay;
      const totalDays = 30;
      const received = (monthlyAmount * receivedDays) / totalDays;
      const pending = monthlyAmount - received;
      return { received, pending };
    }
    
    if (freq === 'Weekly') {
      const weeksElapsed = Math.floor(currentDay / 7);
      const totalWeeks = 4;
      const received = (monthlyAmount * weeksElapsed) / totalWeeks;
      const pending = monthlyAmount - received;
      return { received, pending };
    }
    
    if (!income.selectedDate) {
      return { received: monthlyAmount, pending: 0 };
    }
    
    const selectedDate = income.selectedDate;
    
    if (freq === 'Monthly') {
      let dueDay;
      if (selectedDate.includes('-')) {
        const dateObj = new Date(selectedDate);
        dueDay = dateObj.getDate();
      } else {
        dueDay = parseInt(selectedDate);
      }
      if (dueDay <= currentDay) {
        return { received: monthlyAmount, pending: 0 };
      } else {
        return { received: 0, pending: monthlyAmount };
      }
    }
    
    if (freq === 'Quarterly' || freq === 'Half-Yearly' || freq === 'Yearly') {
      try {
        let dueDate;
        if (selectedDate.includes('-')) {
          dueDate = new Date(selectedDate);
        } else {
          dueDate = new Date(currentYear, currentMonth - 1, parseInt(selectedDate));
        }
        if (dueDate <= today) {
          return { received: monthlyAmount, pending: 0 };
        } else {
          return { received: 0, pending: monthlyAmount };
        }
      } catch (e) {
        return { received: monthlyAmount, pending: 0 };
      }
    }
    
    return { received: monthlyAmount, pending: 0 };
  };

  const { receivedIncome, pendingIncome } = incomes.reduce(
    (acc, inc) => {
      const { received, pending } = getReceivedAndPending(inc);
      return {
        receivedIncome: acc.receivedIncome + received,
        pendingIncome: acc.pendingIncome + pending
      };
    },
    { receivedIncome: 0, pendingIncome: 0 }
  );

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="my-income-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <BackButton fallbackPath="/" forceNavigate={true} className="bg-white/20 border-white/30 text-white hover:bg-white/30" />
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Income
          </h1>
        </div>

        {/* Total Income Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20" data-testid="total-income-card">
          <p className="text-white/70 text-sm font-medium mb-1">Current Month Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/50 text-xs mt-1">{incomes.length} sources</p>
          
          {/* Received vs Yet to Receive */}
          <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/70 mb-1">Received</p>
              <p className="font-semibold" style={{ color: "var(--brand-primary-soft)" }}>₹ {formatAmount(receivedIncome)}</p>
            </div>
            <div>
              <p className="text-white/70 mb-1">Yet to Receive</p>
              <p className="font-semibold" style={{ color: "#FDE68A" }}>₹ {formatAmount(pendingIncome)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Income Allocation */}
      {sortedTypes.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="income-allocation">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Income Sources</h3>
            <div className="space-y-3">
              {sortedTypes.map(([type, data], idx) => {
                const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
                const Icon = getTypeIcon(type);
                const typeColor = getTypeColor(type);
                return (
                  <button
                    key={type}
                    onClick={() => navigate(getTypePath(type))}
                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ backgroundColor: "transparent" }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: typeColor.bg }}>
                      <Icon className="h-5 w-5" style={{ color: typeColor.text }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{type}</span>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                        </div>
                        <span className="text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income Types Grid */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Add Income</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { type: "Business", path: "/business-income" },
            { type: "Job", path: "/job-income" },
            { type: "Rental", path: "/rental-income" },
            { type: "Commission", path: "/commission-income" },
            { type: "Interest", path: "/interest-income" },
            { type: "Dividend", path: "/dividend-income" },
            { type: "Other Income", path: "/other-income", label: "Other" },
          ].map((item) => {
            const Icon = getTypeIcon(item.type);
            const typeColor = getTypeColor(item.type);
            return (
              <button
                key={item.type}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl shadow-card hover:shadow-md transition-all active:scale-95"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                data-testid={`add-${item.type.toLowerCase().replace(' ', '-')}`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: typeColor.bg }}>
                  <Icon className="h-6 w-6" style={{ color: typeColor.text }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{item.label || item.type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {!loading && incomes.length === 0 && otherIncomes.length === 0 && (
        <div className="px-6 mt-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
            <TrendingUp className="h-10 w-10" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Income Added Yet</h3>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Start tracking your income sources</p>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyIncome;

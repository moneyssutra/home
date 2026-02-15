import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, Banknote, Home, Percent, TrendingUp, PieChart, MoreHorizontal, Gift } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

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

  // Calculate monthly income based on frequency (same logic as backend dashboard)
  const calculateMonthlyAmount = (income) => {
    const amount = income.expectedAmount || 0;
    const freq = income.frequency || 'Monthly';
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();
    
    switch (freq) {
      case 'Daily':
        return amount * 30;
      case 'Weekly':
        return amount * 4;
      case 'Monthly':
        return amount;
      case 'Quarterly':
        // Only count if current month is first month of quarter
        const quarterMonths = [1, 4, 7, 10];
        return quarterMonths.includes(currentMonth) ? amount : 0;
      case 'Half-Yearly':
        // Only count if current month is Jan or Jul
        return [1, 7].includes(currentMonth) ? amount : 0;
      case 'Yearly':
        // Check if selected month matches current month
        const monthMapping = {
          "January": 1, "February": 2, "March": 3, "April": 4,
          "May": 5, "June": 6, "July": 7, "August": 8,
          "September": 9, "October": 10, "November": 11, "December": 12
        };
        const selectedMonth = income.selectedMonth || '';
        return monthMapping[selectedMonth] === currentMonth ? amount : 0;
      case 'Irregular':
      case 'Others':
        // Check if custom date falls in current month
        if (income.customDate) {
          try {
            const dateObj = new Date(income.customDate);
            if (dateObj.getMonth() + 1 === currentMonth && dateObj.getFullYear() === currentYear) {
              return amount;
            }
          } catch (e) {}
        }
        return 0;
      default:
        return amount;
    }
  };

  // Calculate other income monthly amount
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
      case 'Monthly':
        return amount;
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
      default:
        return amount;
    }
  };

  // Calculate total income (frequency-aware, same as dashboard)
  const totalRegularIncome = incomes.reduce((sum, inc) => sum + calculateMonthlyAmount(inc), 0);
  const totalOtherIncome = otherIncomes.reduce((sum, inc) => sum + calculateOtherIncomeMonthly(inc), 0);
  const totalIncome = totalRegularIncome + totalOtherIncome;

  // Group incomes by type (using monthly amounts)
  const incomeByType = incomes.reduce((acc, inc) => {
    const type = inc.type || "Other";
    if (!acc[type]) acc[type] = { total: 0, count: 0 };
    acc[type].total += calculateMonthlyAmount(inc);
    acc[type].count += 1;
    return acc;
  }, {});

  // Add Other Income as a separate type if exists
  if (otherIncomes.length > 0) {
    incomeByType["Other Income"] = { total: totalOtherIncome, count: otherIncomes.length };
  }

  // Sort by total descending
  const sortedTypes = Object.entries(incomeByType)
    .sort(([, a], [, b]) => b.total - a.total);

  const getTypeIcon = (type) => {
    const icons = {
      Business: Briefcase,
      Job: Banknote,
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
      Business: "bg-emerald-500/20 text-emerald-500",
      Job: "bg-blue-500/20 text-blue-500",
      Rental: "bg-amber-500/20 text-amber-500",
      Commission: "bg-purple-500/20 text-purple-500",
      Interest: "bg-cyan-500/20 text-cyan-500",
      Dividend: "bg-pink-500/20 text-pink-500",
      "Other Income": "bg-violet-500/20 text-violet-500",
    };
    return colors[type] || "bg-gray-500/20 text-gray-500";
  };

  const getTypePath = (type) => {
    const paths = {
      Business: "/my-business",
      Job: "/my-job",
      Rental: "/my-rental",
      Commission: "/my-commission",
      Interest: "/my-interest",
      Dividend: "/my-dividend",
      "Other Income": "/my-other-income",
    };
    return paths[type] || "/";
  };

  const chartColors = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];

  // Calculate received vs yet to receive based on date and frequency
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  // Calculate received and pending amounts for an income (handles partial for Daily/Weekly)
  const getReceivedAndPending = (income) => {
    const freq = income.frequency || 'Monthly';
    const monthlyAmount = calculateMonthlyAmount(income);
    
    // Daily income: Proportional based on days passed
    if (freq === 'Daily') {
      const receivedDays = currentDay;
      const totalDays = 30; // Using 30 as standard month
      const received = (monthlyAmount * receivedDays) / totalDays;
      const pending = monthlyAmount - received;
      return { received, pending };
    }
    
    // Weekly income: Proportional based on weeks passed
    if (freq === 'Weekly') {
      const weeksElapsed = Math.floor(currentDay / 7);
      const totalWeeks = 4;
      const received = (monthlyAmount * weeksElapsed) / totalWeeks;
      const pending = monthlyAmount - received;
      return { received, pending };
    }
    
    // No date specified: assume fully received
    if (!income.selectedDate) {
      return { received: monthlyAmount, pending: 0 };
    }
    
    const selectedDate = income.selectedDate;
    
    // For Monthly income: Compare day of month
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
    
    // For Quarterly/Half-Yearly/Yearly: Compare full date
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
    
    // Default: assume fully received
    return { received: monthlyAmount, pending: 0 };
  };

  // Calculate totals by summing received/pending for each income
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
    <div className="min-h-screen bg-[#0F172A] pb-24" data-testid="my-income-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#E2E8F0] via-[#134E3E] to-[#E2E8F0] px-6 pt-8 pb-8">
        <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Income
        </h1>

        {/* Total Income Card */}
        <div className="bg-[#1E293B]/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="total-income-card">
          <p className="text-white/60 text-sm font-medium mb-1">Current Month Income</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalIncome)}</h2>
          <p className="text-white/40 text-xs mt-1">{incomes.length} sources</p>
          
          {/* Received vs Yet to Receive */}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-white/60 mb-1">Received</p>
              <p className="text-emerald-300 font-semibold">₹ {formatAmount(receivedIncome)}</p>
            </div>
            <div>
              <p className="text-white/60 mb-1">Yet to Receive</p>
              <p className="text-amber-300 font-semibold">₹ {formatAmount(pendingIncome)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Income Allocation */}
      {sortedTypes.length > 0 && (
        <div className="px-6 -mt-4">
          <div className="bg-[#1E293B] rounded-2xl p-5 shadow-sm border border-gray-100" data-testid="income-allocation">
            <h3 className="text-sm font-semibold text-[#E2E8F0] mb-4">Income Sources</h3>
            <div className="space-y-3">
              {sortedTypes.map(([type, data], idx) => {
                const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
                const Icon = getTypeIcon(type);
                return (
                  <button
                    key={type}
                    onClick={() => navigate(getTypePath(type))}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-xl ${getTypeColor(type)} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[#E2E8F0]">{type}</span>
                        <span className="text-sm font-semibold text-[#E2E8F0]">₹ {formatAmount(data.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }}
                          />
                        </div>
                        <span className="text-xs text-[#E2E8F0]/50 w-12 text-right">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#E2E8F0]/30" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income Types Grid */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold text-[#E2E8F0] mb-3">Add Income</h3>
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
            return (
              <button
                key={item.type}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#1E293B] border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95"
                data-testid={`add-${item.type.toLowerCase().replace(' ', '-')}`}
              >
                <div className={`w-12 h-12 rounded-xl ${getTypeColor(item.type)} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-[#E2E8F0]/80">{item.label || item.type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {!loading && incomes.length === 0 && otherIncomes.length === 0 && (
        <div className="px-6 mt-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#E2E8F0] mb-2">No Income Added Yet</h3>
          <p className="text-[#E2E8F0]/60 text-sm">Start tracking your income sources</p>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyIncome;

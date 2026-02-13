import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Plus, Briefcase, Banknote, Home, Percent, TrendingUp, PieChart, MoreHorizontal } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyIncome = () => {
  const navigate = useNavigate();
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      setIncomes(response.data);
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

  // Calculate total income
  const totalIncome = incomes.reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);

  // Group incomes by type
  const incomeByType = incomes.reduce((acc, inc) => {
    const type = inc.type || "Other";
    if (!acc[type]) acc[type] = { total: 0, count: 0 };
    acc[type].total += inc.expectedAmount || 0;
    acc[type].count += 1;
    return acc;
  }, {});

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
    };
    return paths[type] || "/";
  };

  const chartColors = ["#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#06B6D4", "#EC4899"];

  // Calculate received vs yet to receive based on date
  const today = new Date();
  const currentDay = today.getDate();
  
  const getIncomeStatus = (income) => {
    if (!income.selectedDate) return 'received'; // No date = assume received
    const dueDay = parseInt(income.selectedDate);
    return dueDay <= currentDay ? 'received' : 'pending';
  };

  const receivedIncome = incomes.filter(inc => getIncomeStatus(inc) === 'received')
    .reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);
  const pendingIncome = incomes.filter(inc => getIncomeStatus(inc) === 'pending')
    .reduce((sum, inc) => sum + (inc.expectedAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-24" data-testid="my-income-page">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#0B3D2E] via-[#134E3E] to-[#0B3D2E] px-6 pt-8 pb-8">
        <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Income
        </h1>

        {/* Total Income Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10" data-testid="total-income-card">
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
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100" data-testid="income-allocation">
            <h3 className="text-sm font-semibold text-[#0B3D2E] mb-4">Income Sources</h3>
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
                        <span className="text-sm font-medium text-[#0B3D2E]">{type}</span>
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
                    <ChevronRight className="h-5 w-5 text-[#0B3D2E]/30" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income Types Grid */}
      <div className="px-6 mt-6">
        <h3 className="text-sm font-semibold text-[#0B3D2E] mb-3">Add Income</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { type: "Business", path: "/business-income" },
            { type: "Job", path: "/job-income" },
            { type: "Rental", path: "/rental-income" },
            { type: "Commission", path: "/commission-income" },
            { type: "Interest", path: "/interest-income" },
            { type: "Dividend", path: "/dividend-income" },
          ].map((item) => {
            const Icon = getTypeIcon(item.type);
            return (
              <button
                key={item.type}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-95"
                data-testid={`add-${item.type.toLowerCase()}`}
              >
                <div className={`w-12 h-12 rounded-xl ${getTypeColor(item.type)} flex items-center justify-center`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-xs font-medium text-[#0B3D2E]/80">{item.type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {!loading && incomes.length === 0 && (
        <div className="px-6 mt-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="h-10 w-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-[#0B3D2E] mb-2">No Income Added Yet</h3>
          <p className="text-[#0B3D2E]/60 text-sm">Start tracking your income sources</p>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyIncome;

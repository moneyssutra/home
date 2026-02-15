import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Percent } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyCommission = () => {
  const navigate = useNavigate();
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      // Filter only Commission type and sort by createdAt DESC
      const commissionData = response.data
        .filter(item => item.type === "Commission")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setCommissions(commissionData);
    } catch (error) {
      console.error("Error fetching commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextPaymentDate = (commission) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth, customDate } = commission;
    const today = new Date();
    
    switch (frequency) {
      case "Daily":
        // Daily has no specific date
        return "Daily";
        
      case "Weekly":
        if (!selectedDay) return "Not set";
        // Find next occurrence of selected day
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
        const day = parseInt(selectedDate);
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) {
          nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        }
        return formatDate(nextMonthlyDate);
        
      case "Quarterly":
        if (!selectedQuarter || !selectedDate) return "Not set";
        return calculateQuarterlyNextDate(selectedQuarter, selectedDate);
        
      case "Half-Yearly":
        if (!selectedHalf || !selectedDate) return "Not set";
        return calculateHalfYearlyNextDate(selectedHalf, selectedDate);
        
      case "Yearly":
        if (!selectedMonth || !selectedDate) return "Not set";
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = parseInt(selectedDate);
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) {
          nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        }
        return formatDate(nextYearlyDate);
        
      case "Irregular":
        if (customDate) {
          return formatDate(new Date(customDate));
        }
        return "Irregular";
        
      default:
        return "Not set";
    }
  };

  const calculateQuarterlyNextDate = (quarter, dateStr) => {
    const quarterMonthsMap = {
      "Q1 (Jan–Mar)": [0, 3, 6, 9],
      "Q2 (Apr–Jun)": [1, 4, 7, 10],
      "Q3 (Jul–Sep)": [2, 5, 8, 11],
      "Q4 (Oct–Dec)": [3, 6, 9, 0]
    };
    
    const day = parseInt(dateStr);
    const today = new Date();
    const quarterMonths = quarterMonthsMap[quarter] || [0, 3, 6, 9];
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        return formatDate(nextDate);
      }
    }
    
    // If all dates in current year have passed, return first quarter date next year
    const nextYearDate = new Date(today.getFullYear() + 1, quarterMonths[0], day);
    return formatDate(nextYearDate);
  };

  const calculateHalfYearlyNextDate = (half, dateStr) => {
    const halfMonthsMap = {
      "Jan–Jun": [0, 6],
      "Jul–Dec": [6, 0]
    };
    
    const day = parseInt(dateStr);
    const today = new Date();
    const halfMonths = halfMonthsMap[half] || [0, 6];
    
    for (let hMonth of halfMonths) {
      const nextDate = new Date(today.getFullYear(), hMonth, day);
      if (nextDate > today) {
        return formatDate(nextDate);
      }
    }
    
    // Next year
    const nextYearDate = new Date(today.getFullYear() + 1, halfMonths[0], day);
    return formatDate(nextYearDate);
  };

  const formatDate = (date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  return (
    <div
      className="min-h-screen honeycomb-bg flex flex-col"
      data-testid="my-commission-page"
    >
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D09C]"
          onClick={() => navigate("/")}
          aria-label="Back to income source"
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1
          className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="page-title"
        >
          My Commission
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#0B3D2E]/60">Loading...</div>
            </div>
          ) : commissions.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F4] mb-6">
                <Percent className="h-12 w-12 text-[#00D09C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Commission Income Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first commission income source
              </p>
              <button
                type="button"
                onClick={() => navigate("/commission-income")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-commission-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Commission
              </button>
            </div>
          ) : (
            /* Commission List */
            <div className="space-y-4">
              {/* Commission Cards */}
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/commission-income/${commission.id}`)}
                    data-testid={`commission-card-${commission.id}`}
                  >
                    <div className="flex-1">
                      {/* Source Name and Type Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-semibold text-[#0B3D2E]">
                          {commission.name}
                        </h3>
                        {/* Fixed/Variable Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          commission.isVariable === false 
                            ? "bg-[#0B3D2E]/10 text-[#0B3D2E]" 
                            : "bg-[#F59E0B]/10 text-[#F59E0B]"
                        }`}>
                          {commission.isVariable === false ? "Fixed" : "Variable"}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-2">
                        {/* Expected Amount */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Expected Amount:</span>
                          <span className="text-base font-semibold text-[#0B3D2E]">
                            ₹ {formatAmount(commission.expectedAmount)}
                          </span>
                        </div>

                        {/* Frequency */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Frequency:</span>
                          <span className="text-sm font-medium text-[#0B3D2E]">
                            {commission.frequency}
                          </span>
                        </div>

                        {/* Next Payment Date */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Date:</span>
                          <span className="text-sm font-medium text-[#00D09C]">
                            {getNextPaymentDate(commission)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chevron */}
                    <div className="ml-4">
                      <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Commission Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/commission-income")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-commission-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Commission
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyCommission;

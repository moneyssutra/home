import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, TrendingUp, Calendar } from "lucide-react";
import axios from "axios";

const MyInterest = () => {
  const navigate = useNavigate();
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchInterests();
  }, []);

  const fetchInterests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      const interestData = response.data
        .filter(item => item.type === "Interest")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInterests(interestData);
    } catch (error) {
      console.error("Error fetching interests:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current amount for an interest entry
  const calculateCurrentAmount = (interest) => {
    const p = parseFloat(interest.principal) || 0;
    const r = parseFloat(interest.rate) || 0;
    const startDate = interest.startDate ? new Date(interest.startDate) : null;
    const endDate = interest.endDate ? new Date(interest.endDate) : null;
    
    if (p <= 0 || r <= 0 || !startDate) return p;
    
    const today = new Date();
    
    // If start date is in future, no interest accrued yet
    if (startDate > today) return p;
    
    // Calculate up to today or end date (whichever is earlier)
    const calcEndDate = endDate && endDate < today ? endDate : today;
    
    // Calculate days/years between dates
    const diffTime = calcEndDate - startDate;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const years = diffDays / 365;
    
    let totalInterest = 0;
    
    if (interest.interestType === "Simple Interest") {
      totalInterest = (p * r * years) / 100;
    } else {
      // Compound Interest
      const n = getCompoundingPeriods(interest.compoundingFrequency);
      const periods = years * n;
      const amount = p * Math.pow(1 + r / (100 * n), periods);
      totalInterest = amount - p;
    }
    
    return p + totalInterest;
  };

  const getCompoundingPeriods = (compoundingFrequency) => {
    switch (compoundingFrequency) {
      case "Monthly": return 12;
      case "Quarterly": return 4;
      case "Half-Yearly": return 2;
      case "Yearly": return 1;
      default: return 1;
    }
  };

  const getNextPaymentDate = (interest) => {
    const { frequency, selectedDate, selectedQuarter, selectedHalf, selectedMonth, endDate } = interest;
    const today = new Date();
    const maturityDate = endDate ? new Date(endDate) : null;
    
    // If already matured, show "Matured"
    if (maturityDate && maturityDate < today) {
      return "Matured";
    }
    
    switch (frequency) {
      case "Monthly":
        if (!selectedDate) return "Not set";
        const day = new Date(selectedDate).getDate();
        const nextMonthlyDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (nextMonthlyDate <= today) {
          nextMonthlyDate.setMonth(nextMonthlyDate.getMonth() + 1);
        }
        // Check if next payment is after maturity
        if (maturityDate && nextMonthlyDate > maturityDate) return "Matured";
        return formatDate(nextMonthlyDate);
        
      case "Quarterly":
        if (!selectedMonth || !selectedDate) return "Not set";
        return calculateQuarterlyNextDate(selectedMonth, selectedDate, maturityDate);
        
      case "Half-Yearly":
        if (!selectedMonth || !selectedDate) return "Not set";
        return calculateHalfYearlyNextDate(selectedMonth, selectedDate, maturityDate);
        
      case "Yearly":
        if (!selectedMonth || !selectedDate) return "Not set";
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = months.indexOf(selectedMonth);
        const yearlyDay = new Date(selectedDate).getDate();
        const nextYearlyDate = new Date(today.getFullYear(), monthIndex, yearlyDay);
        if (nextYearlyDate <= today) {
          nextYearlyDate.setFullYear(nextYearlyDate.getFullYear() + 1);
        }
        if (maturityDate && nextYearlyDate > maturityDate) return "Matured";
        return formatDate(nextYearlyDate);
        
      case "Others":
        if (interest.customDate) {
          const customDateObj = new Date(interest.customDate);
          if (maturityDate && customDateObj > maturityDate) return "Matured";
          return formatDate(customDateObj);
        }
        return "Custom";
        
      default:
        return "Not set";
    }
  };

  const calculateQuarterlyNextDate = (month, dateStr, maturityDate) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        if (maturityDate && nextDate > maturityDate) return "Matured";
        return formatDate(nextDate);
      }
    }
    
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    if (maturityDate && nextYearDate > maturityDate) return "Matured";
    return formatDate(nextYearDate);
  };

  const calculateHalfYearlyNextDate = (month, dateStr, maturityDate) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const currentYearDate = new Date(today.getFullYear(), monthIndex, day);
    if (currentYearDate > today) {
      if (maturityDate && currentYearDate > maturityDate) return "Matured";
      return formatDate(currentYearDate);
    }
    
    const nextHalfDate = new Date(today.getFullYear(), monthIndex + 6, day);
    if (nextHalfDate > today) {
      if (maturityDate && nextHalfDate > maturityDate) return "Matured";
      return formatDate(nextHalfDate);
    }
    
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    if (maturityDate && nextYearDate > maturityDate) return "Matured";
    return formatDate(nextYearDate);
  };

  const formatDate = (date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const isMatured = (interest) => {
    if (!interest.endDate) return false;
    return new Date(interest.endDate) < new Date();
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-interest-page">
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
          className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#0B3D2E]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="page-title"
        >
          My Interest Income
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
          ) : interests.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F4] mb-6">
                <TrendingUp className="h-12 w-12 text-[#00D09C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Interest Income Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first interest income source
              </p>
              <button
                type="button"
                onClick={() => navigate("/interest-income")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-interest-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Interest Income
              </button>
            </div>
          ) : (
            /* Interest List */
            <div className="space-y-4">
              <div className="space-y-3">
                {interests.map((interest) => {
                  const currentAmt = calculateCurrentAmount(interest);
                  const matured = isMatured(interest);
                  
                  return (
                    <div
                      key={interest.id}
                      className={`rounded-2xl border bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer ${
                        matured ? "border-yellow-300" : "border-[#E2E8F0]"
                      }`}
                      onClick={() => navigate(`/interest-income/${interest.id}`)}
                      data-testid={`interest-card-${interest.id}`}
                    >
                      {/* Matured Badge */}
                      {matured && (
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                            <Calendar className="h-3 w-3" />
                            Matured
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Interest Source Name */}
                          <h3 className="text-lg font-semibold text-[#0B3D2E] mb-3">
                            {interest.name}
                          </h3>

                          {/* Details Grid */}
                          <div className="space-y-2">
                            {/* Principal & Rate Row */}
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm text-[#0B3D2E]/60">Principal:</span>
                                <span className="text-sm font-semibold text-[#0B3D2E]">
                                  ₹{formatAmount(interest.principal || 0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#0B3D2E]/60">Rate:</span>
                                <span className="text-sm font-medium text-[#0B3D2E]">
                                  {interest.rate}%
                                </span>
                                <span className="text-xs text-[#0B3D2E]/50">
                                  ({interest.interestType === "Simple Interest" ? "SI" : "CI"})
                                </span>
                              </div>
                            </div>

                            {/* Current Amount - Highlighted */}
                            <div className="rounded-lg bg-gradient-to-r from-[#E8F8F4] to-[#F0FDF9] p-3 mt-2">
                              <div className="flex items-baseline justify-between">
                                <span className="text-sm text-[#0B3D2E]/70">Current Amount:</span>
                                <span className="text-lg font-bold text-[#00D09C]">
                                  ₹{formatAmount(currentAmt)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-[#0B3D2E]/50">Interest earned:</span>
                                <span className="text-xs font-medium text-[#00D09C]">
                                  +₹{formatAmount(currentAmt - (interest.principal || 0))}
                                </span>
                              </div>
                            </div>

                            {/* Dates Row */}
                            <div className="flex items-center gap-4 flex-wrap mt-2">
                              {interest.startDate && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-[#0B3D2E]/60">Start:</span>
                                  <span className="text-xs font-medium text-[#0B3D2E]">
                                    {formatDate(new Date(interest.startDate))}
                                  </span>
                                </div>
                              )}
                              {interest.endDate && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-[#0B3D2E]/60">End:</span>
                                  <span className={`text-xs font-medium ${matured ? "text-yellow-600" : "text-[#0B3D2E]"}`}>
                                    {formatDate(new Date(interest.endDate))}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Frequency & Next Payment */}
                            <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-[#E2E8F0]/50 mt-2">
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#0B3D2E]/60">Frequency:</span>
                                <span className="text-sm font-medium text-[#0B3D2E]">
                                  {interest.frequency}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#0B3D2E]/60">Next:</span>
                                <span className={`text-sm font-medium ${
                                  getNextPaymentDate(interest) === "Matured" ? "text-yellow-600" : "text-[#00D09C]"
                                }`}>
                                  {getNextPaymentDate(interest)}
                                </span>
                              </div>
                            </div>

                            {/* Expected Income */}
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm text-[#0B3D2E]/60">Expected ({interest.frequency}):</span>
                              <span className="text-sm font-semibold text-[#0B3D2E]">
                                ₹{formatAmount(interest.expectedAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Chevron */}
                        <div className="ml-4 mt-2">
                          <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Interest Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/interest-income")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-interest-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Interest Income
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyInterest;

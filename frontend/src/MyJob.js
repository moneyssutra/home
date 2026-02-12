import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Briefcase } from "lucide-react";
import axios from "axios";

const MyJob = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      // Filter only Job type and sort by createdAt DESC
      const jobData = response.data
        .filter(item => item.type === "Job")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setJobs(jobData);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNextPaymentDate = (job) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth } = job;
    const today = new Date();
    
    switch (frequency) {
      case "Daily":
        // Return today's date
        return formatDate(today);
        
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
        if (job.customDate) {
          return formatDate(new Date(job.customDate));
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
    
    // Find next occurrence in the quarterly cycle
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        return formatDate(nextDate);
      }
    }
    
    // If all dates in current year have passed, return first quarter date next year
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    return formatDate(nextYearDate);
  };

  const calculateHalfYearlyNextDate = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    // Check current half-year date
    const currentYearDate = new Date(today.getFullYear(), monthIndex, day);
    if (currentYearDate > today) {
      return formatDate(currentYearDate);
    }
    
    // Check next half-year date (6 months later)
    const nextHalfDate = new Date(today.getFullYear(), monthIndex + 6, day);
    if (nextHalfDate > today) {
      return formatDate(nextHalfDate);
    }
    
    // Next year
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

  return (
    <div
      className="min-h-screen honeycomb-bg flex flex-col"
      data-testid="my-business-page"
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
          My Business
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
          ) : businesses.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F4] mb-6">
                <Briefcase className="h-12 w-12 text-[#00D09C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Businesses Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first business income source
              </p>
              <button
                type="button"
                onClick={() => navigate("/business-income")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-business-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Business
              </button>
            </div>
          ) : (
            /* Business List */
            <div className="space-y-4">
              {/* Business Cards */}
              <div className="space-y-3">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/business-income/${business.id}`)}
                    data-testid={`business-card-${business.id}`}
                  >
                    <div className="flex-1">
                      {/* Business Name */}
                      <h3 className="text-lg font-semibold text-[#0B3D2E] mb-3">
                        {business.name}
                      </h3>

                      {/* Details Grid */}
                      <div className="space-y-2">
                        {/* Expected Amount */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Expected Amount:</span>
                          <span className="text-base font-semibold text-[#0B3D2E]">
                            ₹ {formatAmount(business.expectedAmount)}
                          </span>
                        </div>

                        {/* Frequency */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Frequency:</span>
                          <span className="text-sm font-medium text-[#0B3D2E]">
                            {business.frequency}
                          </span>
                        </div>

                        {/* Next Payment Date */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Date:</span>
                          <span className="text-sm font-medium text-[#00D09C]">
                            {getNextPaymentDate(business)}
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

              {/* Add New Business Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/business-income")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-business-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Business
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyBusiness;

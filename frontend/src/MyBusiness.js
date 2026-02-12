import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Briefcase } from "lucide-react";
import axios from "axios";

const MyBusiness = () => {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income`);
      // Filter only Business type and sort by createdAt DESC
      const businessData = response.data
        .filter(item => item.type === "Business")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBusinesses(businessData);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleInfo = (business) => {
    const { frequency, selectedDay, selectedDate, selectedQuarter, selectedHalf, selectedMonth, customFrequency } = business;
    
    switch (frequency) {
      case "Daily":
        return "Every Day";
      case "Weekly":
        return selectedDay || "Weekly";
      case "Monthly":
        return selectedDate ? `${new Date(selectedDate).getDate()}${getOrdinalSuffix(new Date(selectedDate).getDate())}` : "Monthly";
      case "Quarterly":
        if (selectedQuarter && selectedDate) {
          const day = new Date(selectedDate).getDate();
          return `${selectedQuarter} – ${day}${getOrdinalSuffix(day)}`;
        }
        return "Quarterly";
      case "Half-Yearly":
        if (selectedHalf && selectedDate) {
          const day = new Date(selectedDate).getDate();
          return `${selectedHalf} – ${day}${getOrdinalSuffix(day)}`;
        }
        return "Half-Yearly";
      case "Yearly":
        if (selectedMonth && selectedDate) {
          const day = new Date(selectedDate).getDate();
          return `${selectedMonth} ${day}${getOrdinalSuffix(day)}`;
        }
        return "Yearly";
      case "Others":
        return customFrequency || "Custom";
      default:
        return frequency;
    }
  };

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
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
              {/* Section Label */}
              <h2 className="text-sm font-medium text-[#0B3D2E]/70 mb-4">
                Your Businesses
              </h2>

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

                        {/* Schedule Info */}
                        {business.frequency !== "Daily" && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#0B3D2E]/60">Schedule:</span>
                            <span className="text-sm font-medium text-[#00D09C]">
                              {getScheduleInfo(business)}
                            </span>
                          </div>
                        )}
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

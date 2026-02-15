import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Home, TrendingUp } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyRental = () => {
  const navigate = useNavigate();
  const [rentals, setRentals] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [incomeRes, assetsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/income`),
        axios.get(`${backendUrl}/api/assets`)
      ]);
      const rentalData = incomeRes.data
        .filter(item => item.type === "Rental")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRentals(rentalData);
      setAssets(assetsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate rental yield for a rental
  const getRentalYield = (rental) => {
    if (!rental.assetId) return null;
    const asset = assets.find(a => a.id === rental.assetId);
    if (!asset || !asset.currentValue) return null;
    
    const annualRent = rental.expectedAmount * (
      rental.frequency === "Monthly" ? 12 :
      rental.frequency === "Quarterly" ? 4 :
      rental.frequency === "Half-Yearly" ? 2 :
      rental.frequency === "Yearly" ? 1 : 12
    );
    
    return (annualRent / asset.currentValue) * 100;
  };

  // Get linked asset info
  const getLinkedAsset = (assetId) => {
    return assets.find(a => a.id === assetId);
  };

  const getNextPaymentDate = (rental) => {
    const { frequency, selectedDate, selectedQuarter, selectedHalf, selectedMonth } = rental;
    const today = new Date();
    
    switch (frequency) {
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
        if (rental.customDate) {
          return formatDate(new Date(rental.customDate));
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
    
    const quarterMonths = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let qMonth of quarterMonths) {
      const nextDate = new Date(today.getFullYear(), qMonth, day);
      if (nextDate > today) {
        return formatDate(nextDate);
      }
    }
    
    const nextYearDate = new Date(today.getFullYear() + 1, monthIndex, day);
    return formatDate(nextYearDate);
  };

  const calculateHalfYearlyNextDate = (month, dateStr) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = months.indexOf(month);
    const day = new Date(dateStr).getDate();
    const today = new Date();
    
    const currentYearDate = new Date(today.getFullYear(), monthIndex, day);
    if (currentYearDate > today) {
      return formatDate(currentYearDate);
    }
    
    const nextHalfDate = new Date(today.getFullYear(), monthIndex + 6, day);
    if (nextHalfDate > today) {
      return formatDate(nextHalfDate);
    }
    
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

  const getDueDisplay = (rental) => {
    const { frequency, selectedDate, selectedQuarter, selectedMonth } = rental;
    
    if (frequency === "Monthly" && selectedDate) {
      const day = new Date(selectedDate).getDate();
      return `${day}${getOrdinalSuffix(day)}`;
    }
    
    if (frequency === "Quarterly" && selectedQuarter && selectedDate) {
      const day = new Date(selectedDate).getDate();
      const quarterShort = selectedQuarter.split(" ")[0];
      return `${quarterShort} – ${day}${getOrdinalSuffix(day)}`;
    }
    
    if (frequency === "Half-Yearly" && selectedMonth && selectedDate) {
      const day = new Date(selectedDate).getDate();
      const monthShort = selectedMonth.substring(0, 3);
      return `${monthShort} – ${day}${getOrdinalSuffix(day)}`;
    }
    
    if (frequency === "Yearly" && selectedMonth && selectedDate) {
      const day = new Date(selectedDate).getDate();
      const monthShort = selectedMonth.substring(0, 3);
      return `${monthShort} ${day}${getOrdinalSuffix(day)}`;
    }
    
    if (frequency === "Others" && rental.customFrequency) {
      return rental.customFrequency;
    }
    
    return "";
  };

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-rental-page">
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
          My Rental
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
          ) : rentals.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F4] mb-6">
                <Home className="h-12 w-12 text-[#00D09C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Rental Income Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first rental property
              </p>
              <button
                type="button"
                onClick={() => navigate("/rental-income")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-rental-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Rental
              </button>
            </div>
          ) : (
            /* Rental List */
            <div className="space-y-4">
              <div className="space-y-3">
                {rentals.map((rental) => {
                  const rentalYield = getRentalYield(rental);
                  const linkedAsset = rental.assetId ? getLinkedAsset(rental.assetId) : null;
                  
                  return (
                    <div
                      key={rental.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                      onClick={() => navigate(`/rental-income/${rental.id}`)}
                      data-testid={`rental-card-${rental.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Property Name */}
                          <h3 className="text-lg font-semibold text-[#0B3D2E] mb-1">
                            {rental.name}
                          </h3>

                          {/* Tenant Name if exists */}
                          {rental.tenantName && (
                            <p className="text-sm text-[#0B3D2E]/60 mb-2">
                              Tenant: {rental.tenantName}
                            </p>
                          )}

                          {/* Amount Row */}
                          <div className="flex items-center gap-4 mb-2 flex-wrap">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-[#00D09C]">
                                ₹ {formatAmount(rental.expectedAmount)}
                              </span>
                              <span className="text-sm text-[#0B3D2E]/60">/{rental.frequency?.toLowerCase()}</span>
                            </div>
                            
                            {/* Rental Yield Badge */}
                            {rentalYield !== null && (
                              <div className="flex items-center gap-1 bg-gradient-to-r from-[#0B3D2E] to-[#145A3E] px-3 py-1 rounded-full">
                                <TrendingUp className="h-3 w-3 text-[#00D09C]" />
                                <span className="text-xs font-bold text-white">{rentalYield.toFixed(1)}% Yield</span>
                              </div>
                            )}
                          </div>

                          {/* Linked Asset Info */}
                          {linkedAsset && (
                            <div className="flex items-center gap-2 text-xs text-[#0B3D2E]/60 mb-2">
                              <span>Asset: {linkedAsset.assetName}</span>
                              <span>•</span>
                              <span>₹{formatAmount(linkedAsset.currentValue)}</span>
                            </div>
                          )}

                          {/* Frequency and Due Date */}
                          <div className="flex items-center gap-2 text-sm text-[#0B3D2E]/70">
                            <span className="font-medium">{rental.frequency}</span>
                            {getDueDisplay(rental) && (
                              <>
                                <span>–</span>
                                <span>{getDueDisplay(rental)}</span>
                              </>
                            )}
                          </div>

                          {/* Next Due Date & Security Deposit */}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-[#0B3D2E]/60">Next Due:</span>
                              <span className="text-sm font-medium text-[#00D09C]">
                                {getNextPaymentDate(rental)}
                              </span>
                            </div>
                            {rental.securityDeposit && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-[#0B3D2E]/60">Deposit:</span>
                                <span className="text-sm font-medium text-[#0B3D2E]">
                                  ₹{formatAmount(rental.securityDeposit)}
                                </span>
                              </div>
                            )}
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

              {/* Add New Rental Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/rental-income")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-rental-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Rental
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRental;

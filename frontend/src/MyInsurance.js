import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Shield, Calendar } from "lucide-react";
import axios from "axios";
import { addMonths, addQuarters, addYears, format, isAfter, isBefore } from "date-fns";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useFamilyContext } from "@/context/FamilyContext";
import API_BASE from './utils/apiConfig';

const MyInsurance = () => {
  const navigate = useNavigate();
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { activeViewId, isPersonalView, isFamilyView } = useFamilyContext();
  
  const backendUrl = API_BASE;

  useEffect(() => {
    fetchInsurances();
  }, [activeViewId]);

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const params = isFamilyView ? "?family=true" : (!isPersonalView && activeViewId) ? `?memberId=${activeViewId}` : "";
      const response = await axios.get(`${backendUrl}/api/insurances${params}`);
      const sortedInsurances = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInsurances(sortedInsurances);
    } catch (error) {
      console.error("Error fetching insurances:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getInsuranceTypeStyle = (type) => {
    const styles = {
      "Life Insurance": { bg: "#DCFCE7", text: "#16A34A" },
      "Health Insurance": { bg: "#DBEAFE", text: "#3B82F6" },
      "Vehicle Insurance": { bg: "#FEF3C7", text: "#F59E0B" },
      "Property Insurance": { bg: "#F3E8FF", text: "#8B5CF6" },
      "Business Insurance": { bg: "#FCE7F3", text: "#EC4899" },
      "Asset Insurance": { bg: "#E0E7FF", text: "#6366F1" },
      "Travel Insurance": { bg: "#CCFBF1", text: "#14B8A6" },
    };
    return styles[type] || { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Calculate next premium date based on premium payment date and frequency
  const getNextPremiumDate = (insurance) => {
    if (!insurance.premiumPaymentDate || insurance.premiumFrequency === "One-Time") {
      return null;
    }
    
    const baseDate = new Date(insurance.premiumPaymentDate);
    if (isNaN(baseDate.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextDate = new Date(baseDate);
    
    // Find the next future premium date
    while (isBefore(nextDate, today) || nextDate <= today) {
      switch (insurance.premiumFrequency) {
        case "Monthly":
          nextDate = addMonths(nextDate, 1);
          break;
        case "Quarterly":
          nextDate = addQuarters(nextDate, 1);
          break;
        case "Half-Yearly":
          nextDate = addMonths(nextDate, 6);
          break;
        case "Yearly":
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return null;
      }
      
      // Stop if we've gone past the end date
      if (insurance.endDate && isAfter(nextDate, new Date(insurance.endDate))) {
        return null;
      }
    }
    
    return format(nextDate, "d MMM yyyy");
  };

  const getTotalCoverage = () => {
    return insurances.reduce((sum, ins) => sum + (ins.coverageAmount || 0), 0);
  };

  const getTotalPremium = () => {
    return insurances.reduce((sum, ins) => sum + (ins.premiumAmount || 0), 0);
  };

  return (
    <div className="min-h-screen pb-32 honeycomb-bg" data-testid="my-insurance-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate(-1)}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Insurance
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/70 text-sm font-medium">Total Coverage</p>
            <Shield className="h-6 w-6 text-white/60" />
          </div>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(getTotalCoverage())}</h2>
          <p className="text-white/50 text-xs mt-1">{insurances.length} polic{insurances.length !== 1 ? 'ies' : 'y'}</p>
          
          {insurances.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Total Premium</span>
                <span className="font-semibold text-white">₹ {formatAmount(getTotalPremium())}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : insurances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: "#CFFAFE" }}>
              <Shield className="h-12 w-12" style={{ color: "#06B6D4" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Insurance Added Yet
            </h2>
            <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
              Add your insurance policies for better tracking
            </p>
            <button
              type="button"
              onClick={() => navigate("/add-insurance")}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#06B6D4", boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)" }}
              data-testid="add-insurance-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add New Insurance
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Insurance Allocation Section */}
            <div 
              className="bg-white rounded-2xl p-5 shadow-card" 
              data-testid="insurance-allocation"
            >
              <div 
                className="flex items-center justify-between mb-4 cursor-pointer"
                onClick={() => navigate("/insurance-breakdown")}
              >
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Insurance Allocation
                </h3>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                  View All →
                </span>
              </div>
              
              {/* Allocation by Type */}
              <div className="space-y-3">
                {(() => {
                  // Calculate coverage by type
                  const coverageByType = insurances.reduce((acc, ins) => {
                    const type = ins.insuranceType || 'Other';
                    acc[type] = (acc[type] || 0) + (ins.coverageAmount || 0);
                    return acc;
                  }, {});
                  
                  const totalCoverage = getTotalCoverage();
                  const sortedTypes = Object.entries(coverageByType)
                    .sort((a, b) => b[1] - a[1]);
                  
                  return sortedTypes.map(([type, amount]) => {
                    const percentage = totalCoverage > 0 ? (amount / totalCoverage * 100) : 0;
                    const typeStyle = getInsuranceTypeStyle(type);
                    const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
                    
                    return (
                      <div 
                        key={type} 
                        className="space-y-1 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/insurances/${typeSlug}`);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: typeStyle.text }}
                            />
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {type}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              ₹{formatAmount(amount)}
                            </span>
                            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                              ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: typeStyle.text
                            }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Premium Breakdown */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                  Premium Breakdown (per frequency)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {(() => {
                    const premiumByFreq = insurances.reduce((acc, ins) => {
                      const freq = ins.premiumFrequency || 'Other';
                      acc[freq] = (acc[freq] || 0) + (ins.premiumAmount || 0);
                      return acc;
                    }, {});
                    
                    return Object.entries(premiumByFreq).map(([freq, amount]) => (
                      <div key={freq} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{freq}</p>
                        <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                          ₹{formatAmount(amount)}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Insurance List */}
            <div className="space-y-3">
              {insurances.map((insurance) => {
                const typeStyle = getInsuranceTypeStyle(insurance.insuranceType);
                const nextPremiumDate = getNextPremiumDate(insurance);
                
                return (
                  <div
                    key={insurance.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    onClick={() => navigate(`/wealth/insurance/${insurance.id}`)}
                    data-testid={`insurance-card-${insurance.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                          {insurance.policyName}
                        </h3>

                        <div className="mb-3">
                          <span 
                            className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: typeStyle.bg, color: typeStyle.text }}
                          >
                            {insurance.insuranceType}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Coverage:</span>
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              ₹ {formatAmount(insurance.coverageAmount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm" style={{ color: "var(--text-muted)" }}>Premium:</span>
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              ₹ {formatAmount(insurance.premiumAmount)} – {insurance.premiumFrequency}
                            </span>
                          </div>
                          {/* Next Premium Date */}
                          {nextPremiumDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Next Premium:</span>
                              <span className="text-sm font-medium flex items-center gap-1" style={{ color: "#64748B" }}>
                                <Calendar className="h-3.5 w-3.5" />
                                {nextPremiumDate}
                              </span>
                            </div>
                          )}
                          {insurance.endDate && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: "var(--text-muted)" }}>Expires:</span>
                              <span className="text-sm font-medium" style={{ color: "var(--status-warning)" }}>
                                {formatDate(insurance.endDate)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/add-insurance")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-semibold transition-all active:scale-[0.98]"
                style={{ borderColor: "#06B6D4", color: "#06B6D4" }}
                data-testid="add-insurance-button"
              >
                <Plus className="h-5 w-5" />
                Add New Insurance
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyInsurance;

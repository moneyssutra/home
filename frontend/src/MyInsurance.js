import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Shield } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyInsurance = () => {
  const navigate = useNavigate();
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchInsurances();
  }, []);

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/insurances`);
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

  const getInsuranceTypeColor = (type) => {
    const colors = {
      "Life Insurance": "bg-[#10B981]/10 text-[#10B981]",
      "Health Insurance": "bg-[#3B82F6]/10 text-[#3B82F6]",
      "Vehicle Insurance": "bg-[#F59E0B]/10 text-[#F59E0B]",
      "Property Insurance": "bg-[#8B5CF6]/10 text-[#8B5CF6]",
      "Business Insurance": "bg-[#EC4899]/10 text-[#EC4899]",
      "Asset Insurance": "bg-[#6366F1]/10 text-[#6366F1]",
      "Travel Insurance": "bg-[#14B8A6]/10 text-[#14B8A6]",
    };
    return colors[type] || "bg-[#6B7280]/10 text-[#6B7280]";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getTotalCoverage = () => {
    return insurances.reduce((sum, ins) => sum + (ins.coverageAmount || 0), 0);
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-insurance-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Insurance
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Total Coverage Summary */}
      {!loading && insurances.length > 0 && (
        <div className="px-6 mb-6">
          <div className="mx-auto max-w-[620px]">
            <div className="rounded-xl bg-[#6366F1]/10 p-4 border border-[#6366F1]/20">
              <p className="text-xs text-[#6366F1] font-medium mb-1">Total Coverage</p>
              <p className="text-xl font-bold text-[#0B3D2E]">₹ {formatAmount(getTotalCoverage())}</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#0B3D2E]/60">Loading...</div>
            </div>
          ) : insurances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EEF2FF] mb-6">
                <Shield className="h-12 w-12 text-[#6366F1]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Insurance Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Add your insurance policies for better tracking
              </p>
              <button
                type="button"
                onClick={() => navigate("/insurance")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-insurance-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Insurance
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {insurances.map((insurance) => (
                  <div
                    key={insurance.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/insurance/${insurance.id}`)}
                    data-testid={`insurance-card-${insurance.id}`}
                  >
                    <div className="flex-1">
                      {/* Policy Name */}
                      <h3 className="text-lg font-semibold text-[#0B3D2E] mb-2">
                        {insurance.policyName}
                      </h3>

                      {/* Insurance Type Badge */}
                      <div className="mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getInsuranceTypeColor(insurance.insuranceType)}`}>
                          {insurance.insuranceType}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Coverage:</span>
                          <span className="text-sm font-semibold text-[#0B3D2E]">
                            ₹ {formatAmount(insurance.coverageAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0B3D2E]/60">Premium:</span>
                          <span className="text-sm font-medium text-[#0B3D2E]">
                            ₹ {formatAmount(insurance.premiumAmount)} – {insurance.premiumFrequency}
                          </span>
                        </div>
                        {insurance.endDate && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#0B3D2E]/60">Expires:</span>
                            <span className="text-sm font-medium text-[#F59E0B]">
                              {formatDate(insurance.endDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/insurance")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-insurance-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Insurance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyInsurance;

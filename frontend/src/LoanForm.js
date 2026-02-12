import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2, Building2 } from "lucide-react";
import axios from "axios";

const LoanIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Form fields
  const [loanName, setLoanName] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  // Fetch data if editing
  useEffect(() => {
    if (id) {
      fetchLoanData();
    }
  }, [id]);

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/loans/${id}`);
      const data = response.data;
      
      setLoanName(data.loanName || "");
      setLenderName(data.lenderName || "");
      setPrincipalAmount(data.principalAmount?.toString() || "");
      setInterestRate(data.interestRate?.toString() || "");
      setTenureMonths(data.tenureMonths?.toString() || "");
      setEmiAmount(data.emiAmount?.toString() || "");
      setStartDate(data.startDate || "");
      setOutstandingAmount(data.outstandingAmount?.toString() || "");
    } catch (error) {
      console.error("Error fetching loan data:", error);
      setErrors({ submit: "Failed to load loan data" });
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate EMI when principal, rate, tenure change
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = (parseFloat(interestRate) || 0) / 12 / 100; // Monthly rate
    const n = parseInt(tenureMonths) || 0;
    
    if (p > 0 && r > 0 && n > 0) {
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      setEmiAmount(emi.toFixed(2));
    }
  }, [principalAmount, interestRate, tenureMonths]);

  // Auto-calculate Outstanding Amount based on EMIs paid since start date
  useEffect(() => {
    if (!principalAmount || !startDate || !emiAmount || !interestRate) return;
    
    const p = parseFloat(principalAmount) || 0;
    const emi = parseFloat(emiAmount) || 0;
    const monthlyRate = (parseFloat(interestRate) || 0) / 12 / 100;
    
    if (p <= 0 || emi <= 0) return;
    
    // Calculate months elapsed since start date
    const start = new Date(startDate);
    const today = new Date();
    
    // If start date is in future, outstanding = principal
    if (start > today) {
      setOutstandingAmount(principalAmount);
      return;
    }
    
    const monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    const emisPaid = Math.max(0, monthsElapsed);
    
    if (emisPaid === 0) {
      setOutstandingAmount(principalAmount);
      return;
    }
    
    // Calculate outstanding using amortization formula
    // Outstanding = P * [(1+r)^n - (1+r)^p] / [(1+r)^n - 1]
    // Where p = payments made, n = total tenure
    const n = parseInt(tenureMonths) || 0;
    const r = monthlyRate;
    
    if (n > 0 && r > 0) {
      const paidMonths = Math.min(emisPaid, n);
      const outstanding = p * (Math.pow(1 + r, n) - Math.pow(1 + r, paidMonths)) / (Math.pow(1 + r, n) - 1);
      setOutstandingAmount(Math.max(0, outstanding).toFixed(2));
    } else {
      // Simple calculation if no rate/tenure
      const outstanding = p - (emi * emisPaid);
      setOutstandingAmount(Math.max(0, outstanding).toFixed(2));
    }
  }, [principalAmount, startDate, emiAmount, interestRate, tenureMonths]);

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setter(value);
  };

  const handleRateChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setInterestRate(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!loanName.trim()) {
      newErrors.loanName = "Loan name is required";
    }

    if (!principalAmount || parseFloat(principalAmount) <= 0) {
      newErrors.principalAmount = "Principal amount must be greater than 0";
    }

    if (!interestRate || parseFloat(interestRate) <= 0) {
      newErrors.interestRate = "Interest rate must be greater than 0";
    }

    if (!tenureMonths || parseInt(tenureMonths) <= 0) {
      newErrors.tenureMonths = "Tenure must be greater than 0";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!outstandingAmount || parseFloat(outstandingAmount) < 0) {
      newErrors.outstandingAmount = "Outstanding amount is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    if (id) {
      setShowUpdateConfirm(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    
    try {
      const payload = {
        loanName,
        lenderName: lenderName || null,
        principalAmount: parseFloat(principalAmount),
        interestRate: parseFloat(interestRate),
        tenureMonths: parseInt(tenureMonths),
        emiAmount: parseFloat(emiAmount),
        startDate,
        outstandingAmount: parseFloat(outstandingAmount),
      };

      if (id) {
        await axios.put(`${backendUrl}/api/loans/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/loans`, payload);
      }
      
      navigate("/my-loans");
    } catch (error) {
      console.error("Error saving loan:", error);
      setErrors({ submit: "Failed to save. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setIsSubmitting(true);
    setShowDeleteConfirm(false);
    
    try {
      await axios.delete(`${backendUrl}/api/loans/${id}`);
      navigate("/my-loans");
    } catch (error) {
      console.error("Error deleting loan:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="loan-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-loans")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Loan" : "Add Loan"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Loan Name */}
            <div className="w-full">
              <label htmlFor="loanName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan Name
              </label>
              <input
                id="loanName"
                type="text"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g., Home Loan – HDFC, Car Loan – SBI"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="loan-name-input"
              />
              {errors.loanName && <p className="text-sm text-red-500 mt-1">{errors.loanName}</p>}
            </div>

            {/* Lender Name */}
            <div className="w-full">
              <label htmlFor="lenderName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Lender Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="lenderName"
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g., HDFC Bank, SBI, ICICI"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="lender-name-input"
              />
            </div>

            {/* Principal Amount */}
            <div className="w-full">
              <label htmlFor="principalAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Principal Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="principalAmount"
                  type="text"
                  value={principalAmount}
                  onChange={handleAmountChange(setPrincipalAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="principal-input"
                />
              </div>
              {errors.principalAmount && <p className="text-sm text-red-500 mt-1">{errors.principalAmount}</p>}
            </div>

            {/* Interest Rate & Tenure Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Interest Rate */}
              <div className="w-full">
                <label htmlFor="interestRate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    id="interestRate"
                    type="text"
                    value={interestRate}
                    onChange={handleRateChange}
                    placeholder="e.g., 8.5"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 pr-10 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="interest-rate-input"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B3D2E]/60">%</span>
                </div>
                {errors.interestRate && <p className="text-sm text-red-500 mt-1">{errors.interestRate}</p>}
              </div>

              {/* Tenure */}
              <div className="w-full">
                <label htmlFor="tenureMonths" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Tenure (Months)
                </label>
                <input
                  id="tenureMonths"
                  type="text"
                  value={tenureMonths}
                  onChange={handleAmountChange(setTenureMonths)}
                  placeholder="e.g., 240"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="tenure-input"
                />
                {errors.tenureMonths && <p className="text-sm text-red-500 mt-1">{errors.tenureMonths}</p>}
              </div>
            </div>

            {/* EMI Display */}
            {emiAmount && parseFloat(emiAmount) > 0 && (
              <div className="w-full rounded-xl bg-gradient-to-r from-[#0B3D2E] to-[#145A3E] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">Calculated EMI</p>
                    <p className="text-white text-2xl font-bold">₹ {formatAmount(parseFloat(emiAmount))}</p>
                  </div>
                  <div className="text-right text-white/70 text-xs">
                    Per Month
                  </div>
                </div>
              </div>
            )}

            {/* Start Date */}
            <div className="w-full">
              <label htmlFor="startDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Loan Start Date
              </label>
              <label htmlFor="startDate" className="relative block cursor-pointer">
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                  data-testid="start-date-input"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
              </label>
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* Outstanding Amount - Auto Calculated */}
            <div className="w-full">
              <label htmlFor="outstandingAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Outstanding Amount <span className="text-[#00D09C] font-normal">(Auto-calculated)</span>
              </label>
              
              {/* EMIs Paid Info */}
              {startDate && emiAmount && parseFloat(emiAmount) > 0 && (
                <div className="mb-2 p-3 rounded-lg bg-[#E8F8F4] border border-[#00D09C]/30">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#0B3D2E]/70">EMIs Paid:</span>
                    <span className="font-medium text-[#0B3D2E]">
                      {(() => {
                        const start = new Date(startDate);
                        const today = new Date();
                        if (start > today) return "0 (starts in future)";
                        const monthsElapsed = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
                        const tenure = parseInt(tenureMonths) || 0;
                        const paid = Math.min(Math.max(0, monthsElapsed), tenure);
                        return `${paid} of ${tenure} months`;
                      })()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="outstandingAmount"
                  type="text"
                  value={outstandingAmount}
                  onChange={handleAmountChange(setOutstandingAmount)}
                  placeholder="0"
                  readOnly={!!startDate && !!emiAmount}
                  className={`w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${
                    startDate && emiAmount ? "bg-[#F8FAF9] cursor-not-allowed" : ""
                  }`}
                  data-testid="outstanding-input"
                />
              </div>
              <p className="text-xs text-[#0B3D2E]/50 mt-1">
                Calculated based on EMIs paid since start date
              </p>
              {errors.outstandingAmount && <p className="text-sm text-red-500 mt-1">{errors.outstandingAmount}</p>}
            </div>

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-white px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Loan"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Loan"}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#0B3D2E] mb-3">Confirm Changes</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to update this loan? This will replace the existing information.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Loan?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{loanName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanIncome;

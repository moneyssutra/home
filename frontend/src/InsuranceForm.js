import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2 } from "lucide-react";
import axios from "axios";

const InsuranceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Form fields
  const [insuranceType, setInsuranceType] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumFrequency, setPremiumFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [coveredPerson, setCoveredPerson] = useState("");
  const [maturityType, setMaturityType] = useState("");
  const [expectedMaturityAmount, setExpectedMaturityAmount] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(false);
  const [premiumEndDate, setPremiumEndDate] = useState("");
  const [notes, setNotes] = useState("");
  
  // Available assets for linking
  const [assets, setAssets] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const insuranceTypeOptions = [
    "Life Insurance",
    "Term Insurance",
    "Health Insurance",
    "Vehicle Insurance",
    "Property Insurance",
    "Business Insurance",
    "Asset Insurance",
    "Travel Insurance",
    "Other"
  ];

  const premiumFrequencyOptions = ["One-Time", "Monthly", "Quarterly", "Half-Yearly", "Yearly"];

  const coveredPersonOptions = ["Self", "Spouse", "Child", "Parent", "Other"];

  const maturityTypeOptions = [
    { value: "Pure Protection", label: "Pure Protection (No Returns)" },
    { value: "Returns on Maturity", label: "Returns on Maturity" },
    { value: "Market Linked", label: "Market Linked (ULIP)" }
  ];

  // Fetch assets and insurance data
  useEffect(() => {
    fetchAssets();
    if (id) {
      fetchInsuranceData();
    }
  }, [id]);

  const fetchAssets = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/assets`);
      setAssets(response.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const fetchInsuranceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/insurances/${id}`);
      const data = response.data;
      
      setInsuranceType(data.insuranceType || "");
      setPolicyName(data.policyName || "");
      setCoverageAmount(data.coverageAmount?.toString() || "");
      setPremiumAmount(data.premiumAmount?.toString() || "");
      setPremiumFrequency(data.premiumFrequency || "");
      setStartDate(data.startDate || "");
      setEndDate(data.endDate || "");
      setLinkedAssetId(data.linkedAssetId || "");
      setCoveredPerson(data.coveredPerson || "");
      setMaturityType(data.maturityType || "");
      setExpectedMaturityAmount(data.expectedMaturityAmount?.toString() || "");
      setAutoCreateExpense(data.autoCreateExpense === true);
      setPremiumEndDate(data.premiumEndDate || "");
      setNotes(data.notes || "");
    } catch (error) {
      console.error("Error fetching insurance data:", error);
      setErrors({ submit: "Failed to load insurance data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!insuranceType) {
      newErrors.insuranceType = "Please select insurance type";
    }

    if (!policyName.trim()) {
      newErrors.policyName = "Policy name is required";
    }

    if (!coverageAmount || parseFloat(coverageAmount) <= 0) {
      newErrors.coverageAmount = "Coverage amount is required";
    }

    if (!premiumAmount || parseFloat(premiumAmount) <= 0) {
      newErrors.premiumAmount = "Premium amount is required";
    }

    if (!premiumFrequency) {
      newErrors.premiumFrequency = "Please select premium frequency";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
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
        insuranceType,
        policyName,
        coverageAmount: parseFloat(coverageAmount),
        premiumAmount: parseFloat(premiumAmount),
        premiumFrequency,
        startDate,
        endDate: endDate || null,
        linkedAssetId: linkedAssetId || null,
        coveredPerson: coveredPerson || null,
        maturityType: maturityType || null,
        expectedMaturityAmount: expectedMaturityAmount ? parseFloat(expectedMaturityAmount) : null,
        autoCreateExpense,
        premiumEndDate: premiumEndDate || null,
        notes: notes || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/insurances/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/insurances`, payload);
      }
      
      navigate("/my-insurance");
    } catch (error) {
      console.error("Error saving insurance:", error);
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
      await axios.delete(`${backendUrl}/api/insurances/${id}`);
      navigate("/my-insurance");
    } catch (error) {
      console.error("Error deleting insurance:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter assets based on insurance type
  const getFilteredAssets = () => {
    if (insuranceType === "Vehicle Insurance") {
      return assets.filter(a => a.assetType === "Vehicle");
    } else if (insuranceType === "Property Insurance") {
      return assets.filter(a => a.assetType.includes("Property") || a.assetType === "Land");
    }
    return assets;
  };

  const showAssetSelector = ["Vehicle Insurance", "Property Insurance", "Asset Insurance", "Business Insurance"].includes(insuranceType);
  const showPersonSelector = ["Life Insurance", "Health Insurance"].includes(insuranceType);

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="insurance-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-insurance")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Insurance" : "Add Insurance"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Insurance Type */}
            <div className="w-full">
              <label htmlFor="insuranceType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Insurance Type
              </label>
              <select
                id="insuranceType"
                value={insuranceType}
                onChange={(e) => { setInsuranceType(e.target.value); setLinkedAssetId(""); setCoveredPerson(""); }}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="insurance-type-select"
              >
                <option value="">Select Insurance Type</option>
                {insuranceTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.insuranceType && <p className="text-sm text-red-500 mt-1">{errors.insuranceType}</p>}
            </div>

            {/* Policy Name */}
            <div className="w-full">
              <label htmlFor="policyName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Policy Name
              </label>
              <input
                id="policyName"
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="e.g., HDFC Life Term Plan, ICICI Car Insurance"
                maxLength={100}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="policy-name-input"
              />
              {errors.policyName && <p className="text-sm text-red-500 mt-1">{errors.policyName}</p>}
            </div>

            {/* Coverage Amount */}
            <div className="w-full">
              <label htmlFor="coverageAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Coverage Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="coverageAmount"
                  type="text"
                  value={coverageAmount}
                  onChange={handleAmountChange(setCoverageAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="coverage-amount-input"
                />
              </div>
              {errors.coverageAmount && <p className="text-sm text-red-500 mt-1">{errors.coverageAmount}</p>}
            </div>

            {/* Premium Amount */}
            <div className="w-full">
              <label htmlFor="premiumAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Premium Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="premiumAmount"
                  type="text"
                  value={premiumAmount}
                  onChange={handleAmountChange(setPremiumAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="premium-amount-input"
                />
              </div>
              {errors.premiumAmount && <p className="text-sm text-red-500 mt-1">{errors.premiumAmount}</p>}
            </div>

            {/* Premium Frequency */}
            <div className="w-full">
              <label htmlFor="premiumFrequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Premium Frequency
              </label>
              <select
                id="premiumFrequency"
                value={premiumFrequency}
                onChange={(e) => setPremiumFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="premium-frequency-select"
              >
                <option value="">Select Frequency</option>
                {premiumFrequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.premiumFrequency && <p className="text-sm text-red-500 mt-1">{errors.premiumFrequency}</p>}
            </div>

            {/* Start Date */}
            <div className="w-full">
              <label htmlFor="startDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Policy Start Date
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

            {/* End Date */}
            <div className="w-full">
              <label htmlFor="endDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Policy End Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <label htmlFor="endDate" className="relative block cursor-pointer">
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                  data-testid="end-date-input"
                />
                <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
              </label>
            </div>

            {/* Linked Asset (for Vehicle, Property, Asset, Business Insurance) */}
            {showAssetSelector && (
              <div className="w-full">
                <label htmlFor="linkedAsset" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Linked Asset <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAsset"
                  value={linkedAssetId}
                  onChange={(e) => setLinkedAssetId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="linked-asset-select"
                >
                  <option value="">Select Asset</option>
                  {getFilteredAssets().map((asset) => (
                    <option key={asset.id} value={asset.id}>{asset.assetName} - {asset.assetType}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Covered Person (for Life, Health Insurance) */}
            {showPersonSelector && (
              <div className="w-full">
                <label htmlFor="coveredPerson" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Covered Person <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="coveredPerson"
                  value={coveredPerson}
                  onChange={(e) => setCoveredPerson(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="covered-person-select"
                >
                  <option value="">Select Person</option>
                  {coveredPersonOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Maturity Type (for Life Insurance) */}
            {insuranceType === "Life Insurance" && (
              <div className="w-full">
                <label htmlFor="maturityType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Maturity Type <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="maturityType"
                  value={maturityType}
                  onChange={(e) => setMaturityType(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="maturity-type-select"
                >
                  <option value="">Select Maturity Type</option>
                  {maturityTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Expected Maturity Amount (if maturity type has returns) */}
            {maturityType && maturityType !== "Pure Protection" && (
              <div className="w-full">
                <label htmlFor="expectedMaturityAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Expected Maturity Amount <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                  <input
                    id="expectedMaturityAmount"
                    type="text"
                    value={expectedMaturityAmount}
                    onChange={handleAmountChange(setExpectedMaturityAmount)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="expected-maturity-input"
                  />
                </div>
              </div>
            )}

            {/* Auto Add to Expense */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Auto Add to Expense
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Automatically add premium to your expense list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateExpense(!autoCreateExpense)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCreateExpense ? "bg-[#00D09C]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="auto-expense-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoCreateExpense ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {/* Premium End Date - only visible when toggle is ON */}
              {autoCreateExpense && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <label htmlFor="premiumEndDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Premium End Date
                  </label>
                  <input
                    id="premiumEndDate"
                    type="date"
                    value={premiumEndDate}
                    onChange={(e) => setPremiumEndDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="premium-end-date-input"
                  />
                  <p className="text-xs text-[#0B3D2E]/50 mt-1">After this date, premium won't show in expenses</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="w-full">
              <label htmlFor="notes" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 resize-none"
                data-testid="notes-input"
              />
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
                {isSubmitting ? "Updating..." : "Update Insurance"}
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
              {isSubmitting ? "Saving..." : "Save Insurance"}
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
              Are you sure you want to update this insurance?
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Insurance?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{policyName}"? This action cannot be undone.
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

export default InsuranceForm;

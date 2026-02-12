import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2, Plus } from "lucide-react";
import axios from "axios";

const AssetForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  // Form fields
  const [assetType, setAssetType] = useState("");
  const [assetName, setAssetName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [isFinanced, setIsFinanced] = useState(false);
  const [linkedLoanId, setLinkedLoanId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  
  // Available loans for linking
  const [availableLoans, setAvailableLoans] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const assetTypes = [
    "Residential Property",
    "Commercial Property",
    "Land",
    "Vehicle",
    "Equipment",
    "Other"
  ];

  // Restore form state if returning from loan creation
  useEffect(() => {
    if (location.state?.assetFormData) {
      const data = location.state.assetFormData;
      setAssetType(data.assetType || "");
      setAssetName(data.assetName || "");
      setCurrentValue(data.currentValue || "");
      setIsFinanced(data.isFinanced || false);
      setPurchaseDate(data.purchaseDate || "");
      setPurchaseValue(data.purchaseValue || "");
      // If a new loan was just created, set it as linked
      if (location.state?.newLoanId) {
        setLinkedLoanId(location.state.newLoanId);
      }
    }
  }, [location.state]);

  // Fetch loans for linking
  useEffect(() => {
    fetchLoans();
  }, []);

  // Fetch asset data if editing
  useEffect(() => {
    if (id) {
      fetchAssetData();
    }
  }, [id]);

  const fetchLoans = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/loans`);
      setAvailableLoans(response.data);
    } catch (error) {
      console.error("Error fetching loans:", error);
    }
  };

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/assets/${id}`);
      const data = response.data;
      
      setAssetType(data.assetType || "");
      setAssetName(data.assetName || "");
      setCurrentValue(data.currentValue?.toString() || "");
      setIsFinanced(data.isFinanced || false);
      setLinkedLoanId(data.linkedLoanId || "");
      setPurchaseDate(data.purchaseDate || "");
      setPurchaseValue(data.purchaseValue?.toString() || "");
    } catch (error) {
      console.error("Error fetching asset data:", error);
      setErrors({ submit: "Failed to load asset data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset linked loan when isFinanced is toggled off
  useEffect(() => {
    if (!isFinanced) {
      setLinkedLoanId("");
    }
  }, [isFinanced]);

  const handleAmountChange = (setter) => (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!assetType) {
      newErrors.assetType = "Please select an asset type";
    }

    if (!assetName.trim()) {
      newErrors.assetName = "Asset name is required";
    }

    if (!currentValue || parseFloat(currentValue) <= 0) {
      newErrors.currentValue = "Current value must be greater than 0";
    }

    // Linked loan is optional - user can add it later
    // Removed: if (isFinanced && !linkedLoanId) validation

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
        assetType,
        assetName,
        currentValue: parseFloat(currentValue),
        isFinanced,
        linkedLoanId: isFinanced ? linkedLoanId : null,
        purchaseDate: purchaseDate || null,
        purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/assets/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/assets`, payload);
      }
      
      navigate("/my-assets");
    } catch (error) {
      console.error("Error saving asset:", error);
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
      await axios.delete(`${backendUrl}/api/assets/${id}`);
      navigate("/my-assets");
    } catch (error) {
      console.error("Error deleting asset:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  // Calculate appreciation if purchase info available
  const appreciation = purchaseValue && currentValue 
    ? ((parseFloat(currentValue) - parseFloat(purchaseValue)) / parseFloat(purchaseValue)) * 100
    : null;

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="asset-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-assets")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Asset" : "Add Asset"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Asset Type */}
            <div className="w-full">
              <label htmlFor="assetType" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Asset Type
              </label>
              <select
                id="assetType"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="asset-type-select"
              >
                <option value="">Select Asset Type</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.assetType && <p className="text-sm text-red-500 mt-1">{errors.assetType}</p>}
            </div>

            {/* Asset Name */}
            <div className="w-full">
              <label htmlFor="assetName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Asset Name
              </label>
              <input
                id="assetName"
                type="text"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="e.g., Green Villa – Flat 302, Shop No 4 – MG Road"
                maxLength={100}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="asset-name-input"
              />
              {errors.assetName && <p className="text-sm text-red-500 mt-1">{errors.assetName}</p>}
            </div>

            {/* Current Value */}
            <div className="w-full">
              <label htmlFor="currentValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Current Market Value
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                <input
                  id="currentValue"
                  type="text"
                  value={currentValue}
                  onChange={handleAmountChange(setCurrentValue)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="current-value-input"
                />
              </div>
              {errors.currentValue && <p className="text-sm text-red-500 mt-1">{errors.currentValue}</p>}
            </div>

            {/* Purchase Info (Optional Section) */}
            <div className="rounded-xl border border-[#E2E8F0] p-4 space-y-4">
              <p className="text-sm font-medium text-[#0B3D2E]/70">Purchase Information (Optional)</p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Purchase Date */}
                <div className="w-full">
                  <label htmlFor="purchaseDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Purchase Date
                  </label>
                  <label htmlFor="purchaseDate" className="relative block cursor-pointer">
                    <input
                      id="purchaseDate"
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                      data-testid="purchase-date-input"
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                  </label>
                </div>

                {/* Purchase Value */}
                <div className="w-full">
                  <label htmlFor="purchaseValue" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Purchase Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
                    <input
                      id="purchaseValue"
                      type="text"
                      value={purchaseValue}
                      onChange={handleAmountChange(setPurchaseValue)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="purchase-value-input"
                    />
                  </div>
                </div>
              </div>

              {/* Appreciation Display */}
              {appreciation !== null && (
                <div className={`rounded-lg p-3 ${appreciation >= 0 ? 'bg-[#E8F8F4]' : 'bg-red-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#0B3D2E]/70">Appreciation</span>
                    <span className={`text-lg font-bold ${appreciation >= 0 ? 'text-[#00D09C]' : 'text-red-500'}`}>
                      {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-[#0B3D2E]/50 mt-1">
                    {appreciation >= 0 ? 'Gained' : 'Lost'} ₹{formatAmount(Math.abs(parseFloat(currentValue) - parseFloat(purchaseValue)))}
                  </p>
                </div>
              )}
            </div>

            {/* Is Financed Toggle */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="isFinanced" className="text-sm font-medium text-[#0B3D2E]">
                    Is This Asset Financed?
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Link to a loan for net worth calculation</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isFinanced}
                  onClick={() => setIsFinanced(!isFinanced)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isFinanced ? "bg-[#F59E0B]" : "bg-[#E2E8F0]"
                  }`}
                  data-testid="is-financed-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isFinanced ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Linked Loan Section */}
              {isFinanced && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0] animate-in fade-in slide-in-from-top-2 duration-300">
                  <label htmlFor="linkedLoan" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Linked Loan
                  </label>
                  
                  {availableLoans.length > 0 ? (
                    <select
                      id="linkedLoan"
                      value={linkedLoanId}
                      onChange={(e) => setLinkedLoanId(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="linked-loan-select"
                    >
                      <option value="">Select a Loan</option>
                      {availableLoans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.loanName} - ₹{formatAmount(loan.outstandingAmount)} outstanding
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-[#0B3D2E]/60 mb-2">No loans available</p>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => navigate("/loan", { 
                      state: { 
                        returnTo: id ? `/asset/${id}` : '/asset',
                        assetFormData: {
                          assetType,
                          assetName,
                          currentValue,
                          isFinanced,
                          purchaseDate,
                          purchaseValue
                        }
                      } 
                    })}
                    className="mt-3 flex items-center gap-2 text-sm text-[#F59E0B] font-medium hover:text-[#D97706]"
                    data-testid="add-loan-link"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Loan
                  </button>
                  
                  {errors.linkedLoanId && <p className="text-sm text-red-500 mt-1">{errors.linkedLoanId}</p>}
                </div>
              )}
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
                {isSubmitting ? "Updating..." : "Update Asset"}
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
              {isSubmitting ? "Saving..." : "Save Asset"}
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
              Are you sure you want to update this asset?
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Asset?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{assetName}"? This action cannot be undone.
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

export default AssetForm;

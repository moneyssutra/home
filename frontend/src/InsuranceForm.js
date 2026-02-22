import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Check, Loader2 } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateDateRange,
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const InsuranceForm = () => {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
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
  
  // Calendar popover states
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [premiumEndCalendarOpen, setPremiumEndCalendarOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  // Entity uniqueness check for policy name
  const {
    checkUniqueness: checkPolicyNameUnique,
    isChecking: isCheckingPolicyName,
    isUnique: isPolicyNameUnique,
    error: policyNameUniqueError,
    reset: resetPolicyNameCheck
  } = useEntityUniqueness({
    collection: "insurances",
    field: "policyName",
    excludeId: id || null
  });

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
    const value = formatAmountInput(e.target.value);
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    // Insurance Type validation
    if (!insuranceType) {
      newErrors.insuranceType = "Please select insurance type.";
    }

    // Policy Name validation
    const nameError = validateTextField(policyName, "Policy name", 100);
    if (nameError) newErrors.policyName = nameError;

    // Coverage Amount validation
    const coverageError = validatePositiveAmount(coverageAmount, "Coverage amount");
    if (coverageError) newErrors.coverageAmount = coverageError;

    // Premium Amount validation
    const premiumError = validatePositiveAmount(premiumAmount, "Premium amount");
    if (premiumError) newErrors.premiumAmount = premiumError;

    // Premium Frequency validation
    if (!premiumFrequency) {
      newErrors.premiumFrequency = "Please select premium frequency.";
    }

    // Start Date validation
    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    // End Date validation (if provided, must be after start date)
    if (endDate && startDate) {
      const dateError = validateDateRange(startDate, endDate, "Policy Start Date", "Policy End Date");
      if (dateError) newErrors.endDate = dateError;
    }

    // Premium End Date validation (if provided and autoCreateExpense)
    if (autoCreateExpense && premiumEndDate && startDate) {
      const premiumDateError = validateDateRange(startDate, premiumEndDate, "Policy Start Date", "Premium End Date");
      if (premiumDateError) newErrors.premiumEndDate = premiumDateError;
    }

    // Expected Maturity Amount validation (only for non-Pure Protection)
    if (maturityType && maturityType !== "Pure Protection" && expectedMaturityAmount) {
      const maturityError = validatePositiveAmount(expectedMaturityAmount, "Expected maturity amount");
      if (maturityError) newErrors.expectedMaturityAmount = maturityError;
    }

    setErrors(newErrors);
    
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
    }
    
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

      let newInsuranceId = null;
      
      if (id) {
        await axios.put(`${backendUrl}/api/insurances/${id}`, payload);
      } else {
        const response = await axios.post(`${backendUrl}/api/insurances`, payload);
        newInsuranceId = response.data?.id;
      }
      
      // Check if we need to return to asset form
      if (location.state?.returnTo === '/asset' && location.state?.assetFormData) {
        navigate('/asset', {
          state: {
            assetFormData: location.state.assetFormData,
            newInsuranceId: newInsuranceId
          }
        });
      } else {
        navigate("/my-insurance");
      }
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
  
  // Handle back navigation - returns to asset form if came from there
  const handleBackNavigation = () => {
    if (location.state?.returnTo === '/asset' && location.state?.assetFormData) {
      navigate('/asset', {
        state: {
          assetFormData: location.state.assetFormData
        }
      });
    } else {
      navigate("/my-insurance");
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="insurance-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={handleBackNavigation}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Insurance" : "Add Insurance"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Insurance Type */}
            <div className="w-full">
              <label htmlFor="insuranceType" className="block text-sm font-medium text-[#334155] mb-2">
                Insurance Type
              </label>
              <select
                id="insuranceType"
                value={insuranceType}
                onChange={(e) => { setInsuranceType(e.target.value); setLinkedAssetId(""); setCoveredPerson(""); }}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
              <label htmlFor="policyName" className="block text-sm font-medium text-[#334155] mb-2">
                Policy Name
              </label>
              <input
                id="policyName"
                type="text"
                value={policyName}
                onChange={(e) => setPolicyName(e.target.value)}
                placeholder="e.g., HDFC Life Term Plan, ICICI Car Insurance"
                maxLength={100}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="policy-name-input"
              />
              {errors.policyName && <p className="text-sm text-red-500 mt-1">{errors.policyName}</p>}
            </div>

            {/* Coverage Amount */}
            <div className="w-full">
              <label htmlFor="coverageAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Coverage Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="coverageAmount"
                  type="text"
                  value={coverageAmount}
                  onChange={handleAmountChange(setCoverageAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="coverage-amount-input"
                />
              </div>
              {parseFloat(coverageAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="coverage-amount-words">
                  {numberToWords(parseFloat(coverageAmount))}
                </p>
              )}
              {errors.coverageAmount && <p className="text-sm text-red-500 mt-1">{errors.coverageAmount}</p>}
            </div>

            {/* Premium Amount */}
            <div className="w-full">
              <label htmlFor="premiumAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Premium Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="premiumAmount"
                  type="text"
                  value={premiumAmount}
                  onChange={handleAmountChange(setPremiumAmount)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="premium-amount-input"
                />
              </div>
              {parseFloat(premiumAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="premium-amount-words">
                  {numberToWords(parseFloat(premiumAmount))}
                </p>
              )}
              {errors.premiumAmount && <p className="text-sm text-red-500 mt-1">{errors.premiumAmount}</p>}
            </div>

            {/* Premium Frequency */}
            <div className="w-full">
              <label htmlFor="premiumFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                Premium Frequency
              </label>
              <select
                id="premiumFrequency"
                value={premiumFrequency}
                onChange={(e) => setPremiumFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Policy Start Date
              </label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="date-picker-trigger"
                    data-testid="start-date-input"
                  >
                    <span className={startDate ? "value" : "placeholder"}>
                      {startDate ? format(new Date(startDate), "PPP") : "Select start date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, "yyyy-MM-dd"));
                      }
                      setStartCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* End Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Policy End Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="date-picker-trigger"
                    data-testid="end-date-input"
                  >
                    <span className={endDate ? "value" : "placeholder"}>
                      {endDate ? format(new Date(endDate), "PPP") : "Select end date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEndDate(format(date, "yyyy-MM-dd"));
                      }
                      setEndCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Linked Asset (for Vehicle, Property, Asset, Business Insurance) */}
            {showAssetSelector && (
              <div className="w-full">
                <label htmlFor="linkedAsset" className="block text-sm font-medium text-[#334155] mb-2">
                  Linked Asset <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAsset"
                  value={linkedAssetId}
                  onChange={(e) => setLinkedAssetId(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                <label htmlFor="coveredPerson" className="block text-sm font-medium text-[#334155] mb-2">
                  Covered Person <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="coveredPerson"
                  value={coveredPerson}
                  onChange={(e) => setCoveredPerson(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                <label htmlFor="maturityType" className="block text-sm font-medium text-[#334155] mb-2">
                  Maturity Type <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="maturityType"
                  value={maturityType}
                  onChange={(e) => setMaturityType(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                <label htmlFor="expectedMaturityAmount" className="block text-sm font-medium text-[#334155] mb-2">
                  Expected Maturity Amount <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                  <input
                    id="expectedMaturityAmount"
                    type="text"
                    value={expectedMaturityAmount}
                    onChange={handleAmountChange(setExpectedMaturityAmount)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="expected-maturity-input"
                  />
                </div>
                {parseFloat(expectedMaturityAmount) > 0 && (
                  <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="expected-maturity-words">
                    {numberToWords(parseFloat(expectedMaturityAmount))}
                  </p>
                )}
              </div>
            )}

            {/* Auto Add to Expense */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Auto Add to Expense
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">Automatically add premium to your expense list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateExpense(!autoCreateExpense)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCreateExpense ? "bg-[#14B8A6]" : "bg-[#334155]"
                  }`}
                  data-testid="auto-expense-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                      autoCreateExpense ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {/* Premium End Date - only visible when toggle is ON */}
              {autoCreateExpense && (
                <div className="mt-4 pt-4 border-t border-[#334155]">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Premium End Date
                  </label>
                  <Popover open={premiumEndCalendarOpen} onOpenChange={setPremiumEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="date-picker-trigger"
                        data-testid="premium-end-date-input"
                      >
                        <span className={premiumEndDate ? "value" : "placeholder"}>
                          {premiumEndDate ? format(new Date(premiumEndDate), "PPP") : "Select premium end date"}
                        </span>
                        <CalendarIcon className="h-5 w-5 icon" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                      <Calendar
                        mode="single"
                        selected={premiumEndDate ? new Date(premiumEndDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setPremiumEndDate(format(date, "yyyy-MM-dd"));
                          }
                          setPremiumEndCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-[#334155]/50 mt-1">After this date, premium won't show in expenses</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="w-full">
              <label htmlFor="notes" className="block text-sm font-medium text-[#334155] mb-2">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 resize-none"
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
      <div className="fixed bottom-16 left-0 right-0 border-t border-[#334155] bg-[#1E293B]/95 backdrop-blur-sm px-6 py-4 z-40">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-[#1E293B] px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
              className="w-full rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Confirm Changes</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to update this insurance?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Insurance?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{policyName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default InsuranceForm;

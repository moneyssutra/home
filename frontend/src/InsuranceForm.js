import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
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
  const [searchParams] = useSearchParams();
  
  // Get pre-filled insurance type from URL params
  const prefilledType = searchParams.get('type') || '';
  
  // Field refs for auto-focus
  const fieldRefs = {
    insuranceType: useRef(null),
    policyName: useRef(null),
    coverageAmount: useRef(null),
    premiumAmount: useRef(null),
    premiumFrequency: useRef(null),
    startDate: useRef(null),
    endDate: useRef(null),
    premiumPaymentDate: useRef(null),
  };
  
  // Form fields
  const [insuranceType, setInsuranceType] = useState(prefilledType);
  const [policyName, setPolicyName] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumFrequency, setPremiumFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [premiumPaymentDate, setPremiumPaymentDate] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [coveredPerson, setCoveredPerson] = useState("");
  const [maturityType, setMaturityType] = useState("");
  const [expectedMaturityAmount, setExpectedMaturityAmount] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(false);
  const [premiumEndDate, setPremiumEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [premiumPaymentTerm, setPremiumPaymentTerm] = useState("");
  
  // Premium frequency conditional fields (like Business Income)
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  
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

  const premiumPaymentTermOptions = [
    "1 Year",
    "2 Years",
    "3 Years",
    "5 Years",
    "10 Years",
    "15 Years",
    "20 Years",
    "25 Years",
    "30 Years",
    "Till Maturity"
  ];

  // Premium frequency helper data (like Business Income)
  const quarters = [
    { id: "Q1", label: "Q1 (Jan–Mar)", months: ["January", "February", "March"] },
    { id: "Q2", label: "Q2 (Apr–Jun)", months: ["April", "May", "June"] },
    { id: "Q3", label: "Q3 (Jul–Sep)", months: ["July", "August", "September"] },
    { id: "Q4", label: "Q4 (Oct–Dec)", months: ["October", "November", "December"] },
  ];

  const halves = [
    { id: "H1", label: "Jan–Jun", months: ["January", "February", "March", "April", "May", "June"] },
    { id: "H2", label: "Jul–Dec", months: ["July", "August", "September", "October", "November", "December"] },
  ];

  const allMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Helper to get month index (0-11) from month name
  const getMonthIndex = (monthName) => {
    return allMonths.indexOf(monthName);
  };

  // Get months based on selected quarter
  const quarterMonths = useMemo(() => {
    const quarter = quarters.find(q => q.label === selectedQuarter);
    return quarter ? quarter.months : [];
  }, [selectedQuarter]);

  // Get months based on selected half
  const halfMonths = useMemo(() => {
    const half = halves.find(h => h.label === selectedHalf);
    return half ? half.months : [];
  }, [selectedHalf]);

  // Reset premium date fields when frequency changes
  useEffect(() => {
    setSelectedDay("");
    setSelectedQuarter("");
    setSelectedHalf("");
    setSelectedMonth("");
    setPremiumPaymentDate("");
  }, [premiumFrequency]);

  // Today's date for calendar constraints
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate next premium dates based on frequency
  const calculateNextPremiumDates = useMemo(() => {
    if (!premiumPaymentDate || !premiumFrequency || premiumFrequency === "One-Time") return [];
    
    const baseDate = new Date(premiumPaymentDate);
    const dates = [];
    
    for (let i = 1; i <= 3; i++) {
      let nextDate;
      switch (premiumFrequency) {
        case "Monthly":
          nextDate = addMonths(baseDate, i);
          break;
        case "Quarterly":
          nextDate = addQuarters(baseDate, i);
          break;
        case "Half-Yearly":
          nextDate = addMonths(baseDate, i * 6);
          break;
        case "Yearly":
          nextDate = addYears(baseDate, i);
          break;
        default:
          continue;
      }
      
      // Stop if next date is after end date
      if (endDate && nextDate > new Date(endDate)) break;
      dates.push(format(nextDate, "MMM d, yyyy"));
    }
    
    return dates;
  }, [premiumPaymentDate, premiumFrequency, endDate]);

  // Fetch assets and insurance data
  useEffect(() => {
    fetchAssets();
    if (id) {
      fetchInsuranceData();
    }
  }, [id]);

  // Auto-clear end date if start date changes to after it
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setEndDate("");
        toast.info("Policy End Date cleared because it was before the new Start Date");
      }
    }
  }, [startDate]);

  // Auto-clear premium payment date if it's outside the policy dates
  useEffect(() => {
    if (premiumPaymentDate && startDate) {
      const paymentDate = new Date(premiumPaymentDate);
      const start = new Date(startDate);
      
      if (paymentDate < start) {
        setPremiumPaymentDate("");
        toast.info("Premium Payment Date cleared because it was before Policy Start Date");
      }
      
      if (endDate) {
        const end = new Date(endDate);
        if (paymentDate > end) {
          setPremiumPaymentDate("");
          toast.info("Premium Payment Date cleared because it was after Policy End Date");
        }
      }
    }
  }, [startDate, endDate]);

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
      setPremiumPaymentDate(data.premiumPaymentDate || "");
      setLinkedAssetId(data.linkedAssetId || "");
      setCoveredPerson(data.coveredPerson || "");
      setMaturityType(data.maturityType || "");
      setExpectedMaturityAmount(data.expectedMaturityAmount?.toString() || "");
      setAutoCreateExpense(data.autoCreateExpense === true);
      setPremiumEndDate(data.premiumEndDate || "");
      setPremiumPaymentTerm(data.premiumPaymentTerm || "");
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

  // Auto-scroll to first error field
  const scrollToFirstErrorField = (errorFields) => {
    const fieldOrder = ['insuranceType', 'policyName', 'coverageAmount', 'premiumAmount', 'premiumFrequency', 'startDate', 'endDate', 'premiumPaymentDate'];
    
    for (const field of fieldOrder) {
      if (errorFields[field] && fieldRefs[field]?.current) {
        fieldRefs[field].current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        fieldRefs[field].current.focus?.();
        break;
      }
    }
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
    
    // Check uniqueness
    if (isPolicyNameUnique === false) {
      newErrors.policyName = policyNameUniqueError || "An entry with this name already exists.";
    }

    // Coverage Amount validation
    const coverageError = validatePositiveAmount(coverageAmount, "Coverage amount");
    if (coverageError) newErrors.coverageAmount = coverageError;

    // Premium Amount validation
    const premiumError = validatePositiveAmount(premiumAmount, "Premium amount");
    if (premiumError) {
      newErrors.premiumAmount = premiumError;
    } else if (parseFloat(premiumAmount) >= parseFloat(coverageAmount)) {
      // Premium amount must be less than coverage amount
      newErrors.premiumAmount = "Premium amount must be less than coverage amount.";
    }

    // Premium Frequency validation
    if (!premiumFrequency) {
      newErrors.premiumFrequency = "Please select premium frequency.";
    }

    // Start Date validation
    if (!startDate) {
      newErrors.startDate = "Policy start date is required.";
    } else {
      // Start date cannot be in the future
      const startDateObj = new Date(startDate);
      if (startDateObj > today) {
        newErrors.startDate = "Policy start date cannot be in the future.";
      }
    }

    // End Date validation (if provided, must be after start date)
    if (endDate && startDate) {
      const dateError = validateDateRange(startDate, endDate, "Policy Start Date", "Policy End Date");
      if (dateError) newErrors.endDate = dateError;
    }

    // Premium Payment Date validation
    if (premiumFrequency && premiumFrequency !== "One-Time" && premiumPaymentDate) {
      const paymentDateObj = new Date(premiumPaymentDate);
      const startDateObj = new Date(startDate);
      
      // Must be >= start date
      if (startDate && paymentDateObj < startDateObj) {
        newErrors.premiumPaymentDate = "Premium payment date must be on or after policy start date.";
      }
      
      // Must be <= end date if end date exists
      if (endDate) {
        const endDateObj = new Date(endDate);
        if (paymentDateObj > endDateObj) {
          newErrors.premiumPaymentDate = "Premium payment date must be on or before policy end date.";
        }
      }
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
      scrollToFirstErrorField(newErrors);
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
        premiumPaymentDate: premiumPaymentDate || null,
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
        toast.success("Insurance updated successfully!");
      } else {
        const response = await axios.post(`${backendUrl}/api/insurances`, payload);
        newInsuranceId = response.data?.id;
        toast.success("Insurance saved successfully!");
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
      toast.error("Failed to save insurance");
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
      toast.success("Insurance deleted successfully!");
      navigate("/my-insurance");
    } catch (error) {
      console.error("Error deleting insurance:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
      toast.error("Failed to delete insurance");
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
  const showPersonSelector = ["Life Insurance", "Health Insurance", "Term Insurance"].includes(insuranceType);
  
  // Handle back navigation - returns to asset form if came from there
  const handleBackNavigation = () => {
    if (location.state?.returnTo === '/asset' && location.state?.assetFormData) {
      navigate('/asset', {
        state: {
          assetFormData: location.state.assetFormData
        }
      });
    } else if (location.state?.fromExpenses) {
      // If came from expenses page, go back to that page
      navigate(location.state.fromExpenses);
    } else if (window.history.length > 2) {
      // Use browser history to go back if available
      navigate(-1);
    } else {
      navigate("/my-insurance");
    }
  };

  // Get input class based on error state
  const getInputClass = (fieldName, baseClass = "") => {
    const hasError = errors[fieldName];
    return `${baseClass} ${hasError ? 'border-[#FF4D4D] bg-red-50/30' : 'border-[#CBD5E1]'}`;
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
            <div className="w-full" ref={fieldRefs.insuranceType}>
              <label htmlFor="insuranceType" className="block text-sm font-medium text-[#334155] mb-2">
                Insurance Type <span className="text-[#FF4D4D]">*</span>
              </label>
              <select
                id="insuranceType"
                value={insuranceType}
                onChange={(e) => { setInsuranceType(e.target.value); setLinkedAssetId(""); setCoveredPerson(""); }}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${getInputClass('insuranceType')}`}
                data-testid="insurance-type-select"
              >
                <option value="">Select Insurance Type</option>
                {insuranceTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.insuranceType && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.insuranceType}
                </p>
              )}
            </div>

            {/* Policy Name */}
            <div className="w-full" ref={fieldRefs.policyName}>
              <label htmlFor="policyName" className="block text-sm font-medium text-[#334155] mb-2">
                Policy Name <span className="text-[#FF4D4D]">*</span>
              </label>
              <div className="relative">
                <input
                  id="policyName"
                  type="text"
                  value={policyName}
                  onChange={(e) => {
                    setPolicyName(e.target.value);
                    if (errors.policyName) {
                      setErrors(prev => ({ ...prev, policyName: null }));
                    }
                  }}
                  onBlur={() => checkPolicyNameUnique(policyName)}
                  placeholder="e.g., HDFC Life Term Plan, ICICI Car Insurance"
                  maxLength={100}
                  className={`w-full rounded-xl border px-4 py-3 pr-10 text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 bg-white ${
                    errors.policyName || policyNameUniqueError 
                      ? "border-[#FF4D4D] bg-red-50/30" 
                      : isPolicyNameUnique === true && policyName.trim() 
                        ? "border-[#00D09C]" 
                        : "border-[#CBD5E1]"
                  }`}
                  data-testid="policy-name-input"
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingPolicyName && (
                    <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
                  )}
                  {!isCheckingPolicyName && isPolicyNameUnique === true && policyName.trim() && (
                    <Check className="h-5 w-5 text-[#00D09C]" />
                  )}
                </div>
              </div>
              {errors.policyName && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.policyName}
                </p>
              )}
              {!errors.policyName && policyNameUniqueError && (
                <p className="text-sm text-[#FF4D4D] mt-1">{policyNameUniqueError}</p>
              )}
              {!errors.policyName && !policyNameUniqueError && isPolicyNameUnique === true && policyName.trim() && (
                <p className="text-sm text-[#00D09C] mt-1">Name is available</p>
              )}
            </div>

            {/* Coverage Amount */}
            <div className="w-full" ref={fieldRefs.coverageAmount}>
              <label htmlFor="coverageAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Coverage Amount (Sum Insured) <span className="text-[#FF4D4D]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="coverageAmount"
                  type="text"
                  value={coverageAmount}
                  onChange={handleAmountChange(setCoverageAmount)}
                  placeholder="0"
                  className={`w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${getInputClass('coverageAmount')}`}
                  data-testid="coverage-amount-input"
                />
              </div>
              {parseFloat(coverageAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#64748B] italic" data-testid="coverage-amount-words">
                  {numberToWords(parseFloat(coverageAmount))}
                </p>
              )}
              {errors.coverageAmount && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.coverageAmount}
                </p>
              )}
            </div>

            {/* Premium Amount */}
            <div className="w-full" ref={fieldRefs.premiumAmount}>
              <label htmlFor="premiumAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Premium Amount <span className="text-[#FF4D4D]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="premiumAmount"
                  type="text"
                  value={premiumAmount}
                  onChange={handleAmountChange(setPremiumAmount)}
                  placeholder="0"
                  className={`w-full rounded-xl border bg-white pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${getInputClass('premiumAmount')}`}
                  data-testid="premium-amount-input"
                />
              </div>
              {parseFloat(premiumAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#64748B] italic" data-testid="premium-amount-words">
                  {numberToWords(parseFloat(premiumAmount))}
                </p>
              )}
              {errors.premiumAmount && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.premiumAmount}
                </p>
              )}
            </div>

            {/* Premium Frequency */}
            <div className="w-full" ref={fieldRefs.premiumFrequency}>
              <label htmlFor="premiumFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                Premium Frequency <span className="text-[#FF4D4D]">*</span>
              </label>
              <select
                id="premiumFrequency"
                value={premiumFrequency}
                onChange={(e) => {
                  setPremiumFrequency(e.target.value);
                  // Clear premium payment date when frequency changes
                  if (e.target.value === "One-Time") {
                    setPremiumPaymentDate("");
                  }
                }}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${getInputClass('premiumFrequency')}`}
                data-testid="premium-frequency-select"
              >
                <option value="">Select Frequency</option>
                {premiumFrequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.premiumFrequency && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.premiumFrequency}
                </p>
              )}
            </div>

            {/* Conditional Premium Date Fields - Monthly */}
            {premiumFrequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" ref={fieldRefs.premiumPaymentDate}>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Payment Date
                </label>
                <RestrictedDatePicker
                  value={premiumPaymentDate}
                  onChange={(date) => setPremiumPaymentDate(date)}
                  placeholder="Select premium payment date"
                  error={!!errors.premiumPaymentDate}
                  testId="premium-date-select"
                />
                {errors.premiumPaymentDate && (
                  <p className="text-sm text-[#FF4D4D] mt-1">{errors.premiumPaymentDate}</p>
                )}
                {/* Next Premium Dates Preview */}
                {calculateNextPremiumDates.length > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-[#00D09C]/5 border border-[#00D09C]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-[#00D09C]" />
                      <span className="text-sm font-medium text-[#334155]">Upcoming Premium Dates:</span>
                    </div>
                    <ul className="space-y-1">
                      {calculateNextPremiumDates.map((date, idx) => (
                        <li key={idx} className="text-sm text-[#64748B] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />
                          {date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Premium Date Fields - Quarterly */}
            {premiumFrequency === "Quarterly" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" ref={fieldRefs.premiumPaymentDate}>
                {/* Quarter Selection */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Quarter
                  </label>
                  <select
                    value={selectedQuarter}
                    onChange={(e) => {
                      setSelectedQuarter(e.target.value);
                      setSelectedMonth("");
                      setPremiumPaymentDate("");
                    }}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="premium-quarter-select"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => (
                      <option key={q.id} value={q.label}>{q.label}</option>
                    ))}
                  </select>
                  {errors.selectedQuarter && (
                    <p className="text-sm text-[#FF4D4D] mt-1">{errors.selectedQuarter}</p>
                  )}
                </div>

                {/* Month Selection (based on quarter) */}
                {selectedQuarter && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setPremiumPaymentDate("");
                      }}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="premium-month-select"
                    >
                      <option value="">Select Month</option>
                      {quarterMonths.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    {errors.selectedMonth && (
                      <p className="text-sm text-[#FF4D4D] mt-1">{errors.selectedMonth}</p>
                    )}
                  </div>
                )}

                {/* Date Selection */}
                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={premiumPaymentDate}
                      onChange={(date) => setPremiumPaymentDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.premiumPaymentDate}
                      testId="premium-date-select"
                    />
                    {errors.premiumPaymentDate && (
                      <p className="text-sm text-[#FF4D4D] mt-1">{errors.premiumPaymentDate}</p>
                    )}
                  </div>
                )}

                {/* Next Premium Dates Preview */}
                {calculateNextPremiumDates.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#00D09C]/5 border border-[#00D09C]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-[#00D09C]" />
                      <span className="text-sm font-medium text-[#334155]">Upcoming Premium Dates:</span>
                    </div>
                    <ul className="space-y-1">
                      {calculateNextPremiumDates.map((date, idx) => (
                        <li key={idx} className="text-sm text-[#64748B] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />
                          {date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Premium Date Fields - Half-Yearly */}
            {premiumFrequency === "Half-Yearly" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" ref={fieldRefs.premiumPaymentDate}>
                {/* Half Selection */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Half
                  </label>
                  <select
                    value={selectedHalf}
                    onChange={(e) => {
                      setSelectedHalf(e.target.value);
                      setSelectedMonth("");
                      setPremiumPaymentDate("");
                    }}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="premium-half-select"
                  >
                    <option value="">Select Half</option>
                    {halves.map((h) => (
                      <option key={h.id} value={h.label}>{h.label}</option>
                    ))}
                  </select>
                  {errors.selectedHalf && (
                    <p className="text-sm text-[#FF4D4D] mt-1">{errors.selectedHalf}</p>
                  )}
                </div>

                {/* Month Selection (based on half) */}
                {selectedHalf && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setPremiumPaymentDate("");
                      }}
                      className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="premium-month-select"
                    >
                      <option value="">Select Month</option>
                      {halfMonths.map((month) => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    {errors.selectedMonth && (
                      <p className="text-sm text-[#FF4D4D] mt-1">{errors.selectedMonth}</p>
                    )}
                  </div>
                )}

                {/* Date Selection */}
                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={premiumPaymentDate}
                      onChange={(date) => setPremiumPaymentDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.premiumPaymentDate}
                      testId="premium-date-select"
                    />
                    {errors.premiumPaymentDate && (
                      <p className="text-sm text-[#FF4D4D] mt-1">{errors.premiumPaymentDate}</p>
                    )}
                  </div>
                )}

                {/* Next Premium Date Preview */}
                {calculateNextPremiumDates.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#00D09C]/5 border border-[#00D09C]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-[#00D09C]" />
                      <span className="text-sm font-medium text-[#334155]">Upcoming Premium Dates:</span>
                    </div>
                    <ul className="space-y-1">
                      {calculateNextPremiumDates.map((date, idx) => (
                        <li key={idx} className="text-sm text-[#64748B] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />
                          {date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Premium Date Fields - Yearly */}
            {premiumFrequency === "Yearly" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" ref={fieldRefs.premiumPaymentDate}>
                {/* Month Selection */}
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setPremiumPaymentDate("");
                    }}
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="premium-month-select"
                  >
                    <option value="">Select Month</option>
                    {allMonths.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  {errors.selectedMonth && (
                    <p className="text-sm text-[#FF4D4D] mt-1">{errors.selectedMonth}</p>
                  )}
                </div>

                {/* Date Selection */}
                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={premiumPaymentDate}
                      onChange={(date) => setPremiumPaymentDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.premiumPaymentDate}
                      testId="premium-date-select"
                    />
                    {errors.premiumPaymentDate && (
                      <p className="text-sm text-[#FF4D4D] mt-1">{errors.premiumPaymentDate}</p>
                    )}
                  </div>
                )}

                {/* Next Premium Date Preview */}
                {calculateNextPremiumDates.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#00D09C]/5 border border-[#00D09C]/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon className="h-4 w-4 text-[#00D09C]" />
                      <span className="text-sm font-medium text-[#334155]">Upcoming Premium Dates:</span>
                    </div>
                    <ul className="space-y-1">
                      {calculateNextPremiumDates.map((date, idx) => (
                        <li key={idx} className="text-sm text-[#64748B] flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />
                          {date}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Policy Start Date */}
            <div className="w-full" ref={fieldRefs.startDate}>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Policy Start Date <span className="text-[#FF4D4D]">*</span>
              </label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${errors.startDate ? 'border-[#FF4D4D] bg-red-50/30' : 'border-[#CBD5E1]'}`}
                    data-testid="start-date-input"
                  >
                    <span className={startDate ? "text-[#334155]" : "text-[#94A3B8]"}>
                      {startDate ? format(new Date(startDate), "PPP") : "Select start date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 text-[#64748B]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, "yyyy-MM-dd"));
                        if (errors.startDate) {
                          setErrors(prev => ({ ...prev, startDate: null }));
                        }
                      }
                      setStartCalendarOpen(false);
                    }}
                    disabled={(date) => date > today}
                    initialFocus
                    className="rounded-xl"
                    classNames={{
                      day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]",
                      day_today: "bg-[#00D09C]/10 text-[#00D09C]",
                    }}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-[#64748B] mt-1">Cannot be a future date</p>
              {errors.startDate && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* Policy End Date */}
            <div className="w-full" ref={fieldRefs.endDate}>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Policy End Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 ${errors.endDate ? 'border-[#FF4D4D] bg-red-50/30' : 'border-[#CBD5E1]'}`}
                    data-testid="end-date-input"
                  >
                    <span className={endDate ? "text-[#334155]" : "text-[#94A3B8]"}>
                      {endDate ? format(new Date(endDate), "PPP") : "Select end date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 text-[#64748B]" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ? new Date(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const selectedDate = new Date(date);
                        const startDateObj = startDate ? new Date(startDate) : null;
                        
                        if (startDateObj && selectedDate < startDateObj) {
                          toast.error("Policy End Date must be after the Policy Start Date");
                          return;
                        }
                        
                        setEndDate(format(date, "yyyy-MM-dd"));
                        if (errors.endDate) {
                          setErrors(prev => ({ ...prev, endDate: null }));
                        }
                      }
                      setEndCalendarOpen(false);
                    }}
                    disabled={(date) => {
                      if (startDate) {
                        return date < new Date(startDate);
                      }
                      return false;
                    }}
                    initialFocus
                    className="rounded-xl"
                    classNames={{
                      day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]",
                      day_today: "bg-[#00D09C]/10 text-[#00D09C]",
                      day_disabled: "text-gray-300 cursor-not-allowed",
                    }}
                  />
                </PopoverContent>
              </Popover>
              {startDate && <p className="text-xs text-[#64748B] mt-1">Must be after {format(new Date(startDate), "PPP")}</p>}
              {errors.endDate && (
                <p className="text-sm text-[#FF4D4D] mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errors.endDate}
                </p>
              )}
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
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="covered-person-select"
                >
                  <option value="">Select Person</option>
                  {coveredPersonOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Maturity Type (for Life Insurance and Term Insurance) */}
            {(insuranceType === "Life Insurance" || insuranceType === "Term Insurance") && (
              <div className="w-full">
                <label htmlFor="maturityType" className="block text-sm font-medium text-[#334155] mb-2">
                  Maturity Type <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="maturityType"
                  value={maturityType}
                  onChange={(e) => setMaturityType(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                    className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="expected-maturity-input"
                  />
                </div>
                {parseFloat(expectedMaturityAmount) > 0 && (
                  <p className="mt-1.5 text-xs text-[#64748B] italic" data-testid="expected-maturity-words">
                    {numberToWords(parseFloat(expectedMaturityAmount))}
                  </p>
                )}
              </div>
            )}

            {/* Auto Add to Expense */}
            <div className="w-full rounded-xl border border-[#CBD5E1] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Auto Add to Expense
                  </label>
                  <p className="text-xs text-[#64748B] mt-0.5">Automatically add premium to your expense list</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCreateExpense(!autoCreateExpense)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoCreateExpense ? "bg-[#00D09C]" : "bg-[#CBD5E1]"
                  }`}
                  data-testid="auto-expense-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      autoCreateExpense ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              
              {/* Premium End Date - only visible when toggle is ON */}
              {autoCreateExpense && (
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Premium End Date
                  </label>
                  <Popover open={premiumEndCalendarOpen} onOpenChange={setPremiumEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="premium-end-date-input"
                      >
                        <span className={premiumEndDate ? "text-[#334155]" : "text-[#94A3B8]"}>
                          {premiumEndDate ? format(new Date(premiumEndDate), "PPP") : "Select premium end date"}
                        </span>
                        <CalendarIcon className="h-5 w-5 text-[#64748B]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={premiumEndDate ? new Date(premiumEndDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setPremiumEndDate(format(date, "yyyy-MM-dd"));
                          }
                          setPremiumEndCalendarOpen(false);
                        }}
                        disabled={(date) => startDate && date < new Date(startDate)}
                        initialFocus
                        className="rounded-xl"
                        classNames={{
                          day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]",
                          day_today: "bg-[#00D09C]/10 text-[#00D09C]",
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-[#64748B] mt-1">After this date, premium won't show in expenses</p>
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
                className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 resize-none"
                data-testid="notes-input"
              />
            </div>

            {errors.submit && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {errors.submit}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons - Mobile Optimized */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-[#FF4D4D] bg-transparent text-[#FF4D4D] text-sm font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
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
              className="w-full h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
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
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Confirm Changes</h3>
            <p className="text-[#64748B] mb-6">
              Are you sure you want to update this insurance?
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowUpdateConfirm(false)} 
                className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={performSave} 
                className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium hover:bg-[#00B88A]"
              >
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
            <p className="text-[#64748B] mb-6">
              Are you sure you want to delete "{policyName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleDelete} 
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium hover:bg-red-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default InsuranceForm;

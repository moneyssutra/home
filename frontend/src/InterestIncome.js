import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Calculator, Info, Check, Loader2, PlusCircle } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import IncomeTypeToggle from "@/components/IncomeTypeToggle";
import ReminderTimePicker from "@/components/ReminderTimePicker";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateTextField,
  validateDateRange,
  scrollToFirstError
} from "@/lib/validations";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import RecordTransactionModal from "@/components/RecordTransactionModal";
import { 
  recordIncomeTransaction, 
  getIncomeTransactionHistory,
  deleteIncomeTransaction 
} from "@/utils/transactionApi";
import { toast } from "sonner";

const InterestIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Form fields
  const [sourceName, setSourceName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [interestType, setInterestType] = useState("Simple Interest");
  const [compoundingFrequency, setCompoundingFrequency] = useState("");
  const [frequency, setFrequency] = useState("");
  
  // New date fields for loan period
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Payment schedule date fields (when interest is received)
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customFrequency, setCustomFrequency] = useState("");
  const [customDate, setCustomDate] = useState("");
  
  // Expected amount
  const [expectedAmount, setExpectedAmount] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  
  // Variable income fields
  const [incomeType, setIncomeType] = useState("fixed");
  const [reminderTime, setReminderTime] = useState("19:00");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingInterest, setExistingInterest] = useState(null);
  
  // Transaction recording
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  // Entity uniqueness check for source name
  const {
    checkUniqueness: checkSourceNameUnique,
    isChecking: isCheckingSourceName,
    isUnique: isSourceNameUnique,
    error: sourceNameUniqueError,
    reset: resetSourceNameCheck
  } = useEntityUniqueness({
    collection: "income_sources",
    field: "name",
    excludeId: id || null,
    typeFilter: "Interest"
  });

  // Fetch data if editing
  useEffect(() => {
    if (id) {
      fetchInterestData();
    }
  }, [id]);

  const fetchInterestData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      setSourceName(data.name || "");
      setPrincipal(data.principal?.toString() || "");
      setRate(data.rate?.toString() || "");
      setInterestType(data.interestType || "Simple Interest");
      setCompoundingFrequency(data.compoundingFrequency || "");
      setFrequency(data.frequency || "");
      setStartDate(data.startDate || "");
      setEndDate(data.endDate || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setCustomFrequency(data.customFrequency || "");
      setCustomDate(data.customDate || "");
      setExpectedAmount(data.expectedAmount?.toString() || "");
      setManualOverride(data.manualOverride || false);
    } catch (error) {
      console.error("Error fetching interest data:", error);
      setErrors({ submit: "Failed to load interest data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset payment schedule fields when frequency changes
  useEffect(() => {
    if (!id) {
      setSelectedDate("");
      setSelectedQuarter("");
      setSelectedHalf("");
      setSelectedMonth("");
      setCustomFrequency("");
      setCustomDate("");
    }
  }, [frequency]);

  // Reset compounding frequency when interest type changes
  useEffect(() => {
    if (interestType === "Simple Interest") {
      setCompoundingFrequency("");
    }
  }, [interestType]);

  // Helper function to get compounding periods per year
  const getCompoundingPeriodsPerYear = () => {
    switch (compoundingFrequency) {
      case "Monthly": return 12;
      case "Quarterly": return 4;
      case "Half-Yearly": return 2;
      case "Yearly": return 1;
      default: return 1;
    }
  };

  // Calculate Current Amount (Principal + Accrued Interest)
  const currentAmount = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    
    if (p <= 0 || r <= 0 || !startDate) return 0;
    
    const start = new Date(startDate);
    const todayDate = new Date();
    const end = endDate ? new Date(endDate) : null;
    
    // Calculate up to today or end date (whichever is earlier)
    const calcEndDate = end && end < todayDate ? end : todayDate;
    
    // If start date is in future, no interest accrued yet
    if (start > todayDate) return p;
    
    // Calculate days/years between dates
    const diffTime = calcEndDate - start;
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const years = diffDays / 365;
    
    let totalInterest = 0;
    
    if (interestType === "Simple Interest") {
      totalInterest = (p * r * years) / 100;
    } else {
      // Compound Interest
      const n = getCompoundingPeriodsPerYear();
      const periods = years * n;
      const amount = p * Math.pow(1 + r / (100 * n), periods);
      totalInterest = amount - p;
    }
    
    return p + totalInterest;
  }, [principal, rate, startDate, endDate, interestType, compoundingFrequency]);

  // Auto-calculate expected amount per frequency
  const calculatedAmount = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const r = parseFloat(rate) || 0;
    
    if (p <= 0 || r <= 0) return 0;
    
    let yearlyInterest = 0;
    
    if (interestType === "Simple Interest") {
      yearlyInterest = (p * r) / 100;
    } else {
      // Compound Interest calculation for one year
      const n = getCompoundingPeriodsPerYear();
      if (n > 0) {
        const amount = p * Math.pow(1 + r / (100 * n), n);
        yearlyInterest = amount - p;
      } else {
        yearlyInterest = (p * r) / 100;
      }
    }
    
    // Divide by frequency
    switch (frequency) {
      case "Monthly":
        return yearlyInterest / 12;
      case "Quarterly":
        return yearlyInterest / 4;
      case "Half-Yearly":
        return yearlyInterest / 2;
      case "Yearly":
        return yearlyInterest;
      default:
        return yearlyInterest;
    }
  }, [principal, rate, interestType, compoundingFrequency, frequency]);

  // Update expected amount when auto-calculate changes
  useEffect(() => {
    if (!manualOverride && calculatedAmount > 0) {
      setExpectedAmount(calculatedAmount.toFixed(2));
    }
  }, [calculatedAmount, manualOverride]);

  const frequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Others"];
  const compoundingOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

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

  const quarterMonths = useMemo(() => {
    const quarter = quarters.find(q => q.label === selectedQuarter);
    return quarter ? quarter.months : [];
  }, [selectedQuarter]);

  const halfMonths = useMemo(() => {
    const half = halves.find(h => h.label === selectedHalf);
    return half ? half.months : [];
  }, [selectedHalf]);

  const getDateRangeForMonth = (monthName) => {
    if (!monthName) return { min: "", max: "" };
    const monthIndex = allMonths.indexOf(monthName);
    const year = 2026;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const min = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const max = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    return { min, max };
  };

  const quarterlyDateRange = useMemo(() => getDateRangeForMonth(selectedMonth), [selectedMonth]);
  const halfYearlyDateRange = useMemo(() => getDateRangeForMonth(selectedMonth), [selectedMonth]);

  const handlePrincipalChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPrincipal(value);
  };

  const handleRateChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setRate(value);
  };

  const handleExpectedAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setExpectedAmount(value);
  };

  const validate = () => {
    const newErrors = {};

    // Source Name validation
    const nameError = validateTextField(sourceName, "Interest source name", 50);
    if (nameError) newErrors.sourceName = nameError;
    
    // Check uniqueness
    if (isSourceNameUnique === false) {
      newErrors.sourceName = sourceNameUniqueError || "An entry with this name already exists.";
    }

    // Principal Amount validation
    const principalError = validatePositiveAmount(principal, "Principal amount");
    if (principalError) newErrors.principal = principalError;

    // Rate of Interest validation
    if (!rate || parseFloat(rate) <= 0) {
      newErrors.rate = "Rate of interest must be greater than 0.";
    } else if (parseFloat(rate) > 100) {
      newErrors.rate = "Rate cannot exceed 100%.";
    }

    // Start Date validation
    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    // End Date validation
    if (!endDate) {
      newErrors.endDate = "End date is required.";
    } else if (startDate) {
      const dateError = validateDateRange(startDate, endDate, "Start date", "End date");
      if (dateError) newErrors.endDate = dateError;
    }

    // Compounding Frequency validation (for Compound Interest)
    if (interestType === "Compound Interest" && !compoundingFrequency) {
      newErrors.compoundingFrequency = "Please select compounding frequency.";
    }

    // Income Frequency validation
    if (!frequency) {
      newErrors.frequency = "Please select income frequency.";
    }

    // Payment schedule date validation based on frequency
    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a payment date.";
    }

    if (frequency === "Quarterly") {
      if (!selectedQuarter) newErrors.selectedQuarter = "Please select a quarter.";
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Half-Yearly") {
      if (!selectedHalf) newErrors.selectedHalf = "Please select a half.";
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Yearly") {
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Others") {
      if (!customFrequency.trim()) newErrors.customFrequency = "Please enter custom frequency.";
      if (!customDate) newErrors.customDate = "Please select a date.";
    }

    // Expected Amount validation
    const expectedError = validatePositiveAmount(expectedAmount, "Expected income");
    if (expectedError) newErrors.expectedAmount = expectedError;

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

    // Check for duplicate
    try {
      const response = await axios.get(`${backendUrl}/api/income`);
      const interests = response.data.filter(item => item.type === "Interest");
      const duplicate = interests.find(i => i.name.toLowerCase() === sourceName.trim().toLowerCase());
      
      if (duplicate) {
        setExistingInterest(duplicate);
        setShowDuplicateDialog(true);
        return;
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    
    try {
      const payload = {
        type: "Interest",
        name: sourceName,
        principal: parseFloat(principal),
        rate: parseFloat(rate),
        interestType,
        compoundingFrequency: interestType === "Compound Interest" ? compoundingFrequency : null,
        startDate,
        endDate,
        currentAmount: currentAmount,
        expectedAmount: parseFloat(expectedAmount),
        frequency,
        selectedDay: null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
        customFrequency: customFrequency || null,
        customDate: customDate || null,
        manualOverride,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      navigate("/my-income");
    } catch (error) {
      console.error("Error saving interest income:", error);
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
      await axios.delete(`${backendUrl}/api/income/${id}`);
      navigate("/my-income");
    } catch (error) {
      console.error("Error deleting interest:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="interest-income-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
          onClick={() => navigate("/my-income")}
          aria-label="Back to my interest"
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1
          className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="page-title"
        >
          Interest Income
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Interest Source Name */}
            <div className="w-full">
              <label htmlFor="sourceName" className="block text-sm font-medium text-[#334155] mb-2">
                Interest Source Name
              </label>
              <div className="relative">
                <input
                  id="sourceName"
                  type="text"
                  value={sourceName}
                  onChange={(e) => {
                    setSourceName(e.target.value);
                    if (errors.sourceName) {
                      setErrors(prev => ({ ...prev, sourceName: null }));
                    }
                  }}
                  onBlur={() => checkSourceNameUnique(sourceName)}
                  placeholder="e.g., Hand Loan to Rahul, FD – HDFC Bank"
                  maxLength={50}
                  className="w-full rounded-xl border px-4 py-3 pr-10 text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: errors.sourceName || sourceNameUniqueError 
                      ? "var(--status-error)" 
                      : isSourceNameUnique === true && sourceName.trim() 
                        ? "var(--status-success)" 
                        : "var(--border-light)"
                  }}
                  data-testid="source-name-input"
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingSourceName && (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
                  )}
                  {!isCheckingSourceName && isSourceNameUnique === true && sourceName.trim() && (
                    <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />
                  )}
                </div>
              </div>
              {errors.sourceName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.sourceName}</p>}
              {!errors.sourceName && sourceNameUniqueError && (
                <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{sourceNameUniqueError}</p>
              )}
              {!errors.sourceName && !sourceNameUniqueError && isSourceNameUnique === true && sourceName.trim() && (
                <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>
              )}
            </div>

            {/* Principal Amount */}
            <div className="w-full">
              <label htmlFor="principal" className="block text-sm font-medium text-[#334155] mb-2">
                Principal Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="principal"
                  type="text"
                  value={principal}
                  onChange={handlePrincipalChange}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="principal-input"
                />
              </div>
              {parseFloat(principal) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="principal-words">
                  {numberToWords(parseFloat(principal))}
                </p>
              )}
              {errors.principal && <p className="text-sm text-red-500 mt-1">{errors.principal}</p>}
            </div>

            {/* Rate of Interest */}
            <div className="w-full">
              <label htmlFor="rate" className="block text-sm font-medium text-[#334155] mb-2">
                Rate of Interest (%)
              </label>
              <div className="relative">
                <input
                  id="rate"
                  type="text"
                  value={rate}
                  onChange={handleRateChange}
                  placeholder="e.g., 8.5"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 pr-10 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="rate-input"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#334155]/60">%</span>
              </div>
              {errors.rate && <p className="text-sm text-red-500 mt-1">{errors.rate}</p>}
            </div>

            {/* Start Date & End Date Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="w-full">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Start Date
                </label>
                <RestrictedDatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  placeholder="Select start date"
                  error={!!errors.startDate}
                  testId="start-date-input"
                />
                {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
              </div>

              {/* End Date */}
              <div className="w-full">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  End Date (Maturity)
                </label>
                <RestrictedDatePicker
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  placeholder="Select end date"
                  error={!!errors.endDate}
                  testId="end-date-input"
                />
                {errors.endDate && <p className="text-sm text-red-500 mt-1">{errors.endDate}</p>}
              </div>
            </div>

            {/* Interest Type */}
            <div className="w-full">
              <label htmlFor="interestType" className="block text-sm font-medium text-[#334155] mb-2">
                Interest Type
              </label>
              <select
                id="interestType"
                value={interestType}
                onChange={(e) => setInterestType(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="interest-type-select"
              >
                <option value="Simple Interest">Simple Interest</option>
                <option value="Compound Interest">Compound Interest</option>
              </select>
            </div>

            {/* Compounding Frequency (only for Compound) */}
            {interestType === "Compound Interest" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="compounding-section">
                <label htmlFor="compoundingFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                  Compounding Frequency
                </label>
                <select
                  id="compoundingFrequency"
                  value={compoundingFrequency}
                  onChange={(e) => setCompoundingFrequency(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="compounding-frequency-select"
                >
                  <option value="">Select Compounding Frequency</option>
                  {compoundingOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {errors.compoundingFrequency && <p className="text-sm text-red-500 mt-1">{errors.compoundingFrequency}</p>}
              </div>
            )}

            {/* Current Amount Display (Auto-calculated) */}
            {startDate && principal && rate && (
              <div className="w-full rounded-xl bg-gradient-to-r from-[#334155] to-[#145A3E] p-5 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="current-amount-section">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">Current Amount (Principal + Interest)</p>
                    <p className="text-white text-2xl font-bold">₹ {formatAmount(currentAmount)}</p>
                    <p className="text-[#14B8A6] text-sm mt-1">
                      +₹ {formatAmount(currentAmount - parseFloat(principal || 0))} interest accrued
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-white/70 text-xs">
                      <Info className="h-3 w-3" />
                      <span>As of today</span>
                    </div>
                    {endDate && new Date(endDate) < new Date() && (
                      <p className="text-yellow-300 text-xs mt-1">Matured on {formatDateDisplay(endDate)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Income Frequency */}
            <div className="w-full">
              <label htmlFor="frequency" className="block text-sm font-medium text-[#334155] mb-2">
                Interest Payment Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="frequency-select"
              >
                <option value="">Select Payment Frequency</option>
                {frequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.frequency && <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>}
            </div>

            {/* Monthly Date Selection */}
            {frequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Payment Date (Day of Month)
                </label>
                <RestrictedDatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  placeholder="Select payment date"
                  error={!!errors.selectedDate}
                  testId="date-select"
                />
                {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
              </div>
            )}

            {/* Quarterly Fields */}
            {frequency === "Quarterly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="quarterly-fields">
                <div className="w-full">
                  <label htmlFor="quarter" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Quarter
                  </label>
                  <select
                    id="quarter"
                    value={selectedQuarter}
                    onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedMonth(""); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="quarter-select"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => <option key={q.id} value={q.label}>{q.label}</option>)}
                  </select>
                  {errors.selectedQuarter && <p className="text-sm text-red-500 mt-1">{errors.selectedQuarter}</p>}
                </div>

                {selectedQuarter && (
                  <div className="w-full">
                    <label htmlFor="quarterMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="quarterMonth"
                      value={selectedMonth}
                      onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {quarterMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                  </div>
                )}

                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Half-Yearly Fields */}
            {frequency === "Half-Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="half-yearly-fields">
                <div className="w-full">
                  <label htmlFor="half" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Half
                  </label>
                  <select
                    id="half"
                    value={selectedHalf}
                    onChange={(e) => { setSelectedHalf(e.target.value); setSelectedMonth(""); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="half-select"
                  >
                    <option value="">Select Half</option>
                    {halves.map((h) => <option key={h.id} value={h.label}>{h.label}</option>)}
                  </select>
                  {errors.selectedHalf && <p className="text-sm text-red-500 mt-1">{errors.selectedHalf}</p>}
                </div>

                {selectedHalf && (
                  <div className="w-full">
                    <label htmlFor="halfMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="halfMonth"
                      value={selectedMonth}
                      onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {halfMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                  </div>
                )}

                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Yearly Fields */}
            {frequency === "Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="yearly-fields">
                <div className="w-full">
                  <label htmlFor="yearlyMonth" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Month
                  </label>
                  <select
                    id="yearlyMonth"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="month-select"
                  >
                    <option value="">Select Month</option>
                    {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                </div>
                {selectedMonth && (
                  <div className="w-full">
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <RestrictedDatePicker
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Others Fields */}
            {frequency === "Others" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="others-fields">
                <div className="w-full">
                  <label htmlFor="customFreq" className="block text-sm font-medium text-[#334155] mb-2">
                    Enter Custom Frequency
                  </label>
                  <input
                    id="customFreq"
                    type="text"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    placeholder="e.g., Every 2 months"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="custom-frequency-input"
                  />
                  {errors.customFrequency && <p className="text-sm text-red-500 mt-1">{errors.customFrequency}</p>}
                </div>
                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Date
                  </label>
                  <RestrictedDatePicker
                    value={customDate}
                    onChange={(date) => setCustomDate(date)}
                    placeholder="Select next expected date"
                    error={!!errors.customDate}
                    testId="custom-date-input"
                  />
                  {errors.customDate && <p className="text-sm text-red-500 mt-1">{errors.customDate}</p>}
                </div>
              </div>
            )}

            {/* Expected Income Section */}
            {frequency && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300 space-y-4" data-testid="expected-income-section">
                {/* Auto-calculation info */}
                {!manualOverride && calculatedAmount > 0 && (
                  <div className="rounded-xl bg-[#E8F8F4] border border-[#14B8A6]/30 p-4">
                    <div className="flex items-start gap-2">
                      <Calculator className="h-5 w-5 text-[#14B8A6] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#334155] mb-1">Auto-Calculated ({frequency})</p>
                        <p className="text-xs text-[#334155]/70">
                          {interestType === "Simple Interest" 
                            ? `₹${formatAmount(parseFloat(principal) || 0)} × ${rate}% ÷ ${frequency === "Monthly" ? 12 : frequency === "Quarterly" ? 4 : frequency === "Half-Yearly" ? 2 : 1}`
                            : `Compound: ${compoundingFrequency} compounding`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual Override Toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="manualOverride" className="text-sm font-medium text-[#334155]">
                    Manual Override
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={manualOverride}
                    onClick={() => setManualOverride(!manualOverride)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      manualOverride ? "bg-[#14B8A6]" : "bg-[#334155]"
                    }`}
                    data-testid="manual-override-toggle"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                        manualOverride ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Expected Income Field */}
                <div className="w-full">
                  <label htmlFor="expectedAmount" className="block text-sm font-medium text-[#334155] mb-2">
                    Expected Interest Income ({frequency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="expectedAmount"
                      type="text"
                      value={expectedAmount}
                      onChange={handleExpectedAmountChange}
                      readOnly={!manualOverride}
                      placeholder="0"
                      className={`w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 ${
                        !manualOverride ? "bg-[#0F172A] cursor-not-allowed" : ""
                      }`}
                      data-testid="expected-amount-input"
                    />
                  </div>
                  {parseFloat(expectedAmount) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="expected-amount-words">
                      {numberToWords(parseFloat(expectedAmount))}
                    </p>
                  )}
                  {errors.expectedAmount && <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>}
                </div>
              </div>
            )}

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>
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
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-[#FF4D4D] bg-transparent text-[#FF4D4D] text-sm font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="delete-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Interest Income"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Interest Income"}
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
              Are you sure you want to update this interest income? This will replace the existing information.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateConfirm(false)}
                className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium transition-colors hover:bg-[#0F172A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performSave}
                className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium transition-colors hover:bg-[#0D9488]"
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
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Interest Income?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{sourceName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium transition-colors hover:bg-[#0F172A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium transition-colors hover:bg-red-600"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Interest Dialog */}
      {showDuplicateDialog && existingInterest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Interest Source Already Exists</h3>
            <p className="text-[#334155]/70 mb-6">
              An interest source with the name "{sourceName}" already exists. Would you like to edit the existing one or create a new one anyway?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setShowDuplicateDialog(false); navigate(`/interest-income/${existingInterest.id}`); }}
                className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium transition-colors hover:bg-[#0D9488]"
              >
                Edit Existing Interest
              </button>
              <button
                type="button"
                onClick={() => { setShowDuplicateDialog(false); performSave(); }}
                className="w-full rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium transition-colors hover:bg-[#0F172A]"
              >
                Create New Anyway
              </button>
              <button
                type="button"
                onClick={() => setShowDuplicateDialog(false)}
                className="w-full rounded-xl bg-[#1E293B] px-4 py-3 text-[#334155]/60 font-medium transition-colors hover:text-[#334155]"
              >
                Cancel
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

export default InterestIncome;

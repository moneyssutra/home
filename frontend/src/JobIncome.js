import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trash2, Check, Loader2, Calendar, PlusCircle, X } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import IncomeTypeToggle from "@/components/IncomeTypeToggle";
import { fireConfetti } from "@/lib/confetti";
import ReminderTimePicker from "@/components/ReminderTimePicker";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateTextField,
  scrollToFirstError
} from "@/lib/validations";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import IncomeAmountModal from "@/components/IncomeAmountModal";
import { 
  recordIncomeTransaction, 
  getIncomeTransactionHistory,
  deleteIncomeTransaction,
  updateIncomeTransaction,
  dismissRelatedNotifications
} from "@/utils/transactionApi";
import { toast } from "sonner";

const JobIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL if editing
  const [companyName, setCompanyName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  
  // Conditional fields
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customFrequency, setCustomFrequency] = useState("");
  const [customDate, setCustomDate] = useState("");
  
  // Variable income fields
  const [incomeType, setIncomeType] = useState("fixed");
  const [reminderTime, setReminderTime] = useState("19:00");
  
  // Start date for received/pending logic
  const [startDate, setStartDate] = useState("");
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingJob, setExistingJob] = useState(null);
  
  // Income Amount Modal (for Variable income)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Entity uniqueness check for company name
  const {
    checkUniqueness: checkCompanyNameUnique,
    isChecking: isCheckingCompanyName,
    isUnique: isCompanyNameUnique,
    error: companyNameUniqueError,
    reset: resetCompanyNameCheck
  } = useEntityUniqueness({
    collection: "income_sources",
    field: "name",
    excludeId: id || null,
    typeFilter: "Job"
  });
  
  // Get today's date for minimum date restriction
  const today = new Date().toISOString().split('T')[0];

  // Fetch business data if editing
  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      fetchJobData();
    }
  }, [id]);

  // Track initial load for editing
  const [isInitialLoad, setIsInitialLoad] = useState(!!id);

  const fetchJobData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      // Pre-fill all fields
      setCompanyName(data.name || "");
      setExpectedAmount(data.expectedAmount?.toString() || "");
      setFrequency(data.frequency || "");
      setSelectedDay(data.selectedDay || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setCustomFrequency(data.customFrequency || "");
      setCustomDate(data.customDate || "");
      // Variable income fields
      setIncomeType(data.incomeType || "fixed");
      setReminderTime(data.reminderTime || "19:00");
      setStartDate(data.startDate || "");
      
      // Mark initial load complete after data is loaded
      setTimeout(() => setIsInitialLoad(false), 100);
    } catch (error) {
      console.error("Error fetching job data:", error);
      setErrors({ submit: "Failed to load job data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset conditional fields when frequency changes (only when creating new, not editing)
  useEffect(() => {
    // Skip resetting on initial load (when editing)
    if (isInitialLoad) return;
    
    setSelectedDay("");
    setSelectedDate("");
    setSelectedQuarter("");
    setSelectedHalf("");
    setSelectedMonth("");
    setCustomFrequency("");
    setCustomDate("");
  }, [frequency]);

  const frequencyOptions = [
    "Daily",
    "Weekly",
    "Monthly",
    "Quarterly",
    "Half-Yearly",
    "Yearly",
    "Others",
  ];

  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

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

  // Calculate next recurring dates for Quarterly
  const calculateQuarterlyDates = useMemo(() => {
    if (!selectedMonth || !selectedDate) return [];
    
    const monthIndex = allMonths.indexOf(selectedMonth);
    const day = new Date(selectedDate).getDate();
    const dates = [];
    
    // Add 3 months for each quarter
    for (let i = 1; i <= 3; i++) {
      const nextMonthIndex = (monthIndex + (i * 3)) % 12;
      const nextMonth = allMonths[nextMonthIndex];
      dates.push(`${nextMonth} ${day}`);
    }
    
    return dates;
  }, [selectedMonth, selectedDate]);

  // Calculate next recurring date for Half-Yearly
  const calculateHalfYearlyDate = useMemo(() => {
    if (!selectedMonth || !selectedDate) return null;
    
    const monthIndex = allMonths.indexOf(selectedMonth);
    const day = new Date(selectedDate).getDate();
    
    // Add 6 months
    const nextMonthIndex = (monthIndex + 6) % 12;
    const nextMonth = allMonths[nextMonthIndex];
    
    return `${nextMonth} ${day}`;
  }, [selectedMonth, selectedDate]);

  // Get date range for selected month (for Quarterly)
  const getDateRangeForMonth = (monthName) => {
    if (!monthName) return { min: "", max: "" };
    
    const monthIndex = allMonths.indexOf(monthName);
    const year = 2026; // Using 2026 as base year
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    
    const min = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const max = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    
    return { min, max };
  };

  // Get date range for Quarterly
  const quarterlyDateRange = useMemo(() => {
    return getDateRangeForMonth(selectedMonth);
  }, [selectedMonth]);

  // Get date range for Half-Yearly
  const halfYearlyDateRange = useMemo(() => {
    return getDateRangeForMonth(selectedMonth);
  }, [selectedMonth]);

  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      const nameError = validateTextField(companyName, "Company name", 50);
      if (nameError) newErrors.companyName = nameError;
      if (isCompanyNameUnique === false) newErrors.companyName = companyNameUniqueError || "An entry with this name already exists.";
    }
    if (s === 2) {
      const amountError = validatePositiveAmount(expectedAmount, "Expected amount");
      if (amountError) newErrors.expectedAmount = amountError;
      if (!frequency) newErrors.frequency = "Please select a frequency.";
    }
    if (s === 3) {
      if (frequency === "Weekly" && !selectedDay) newErrors.selectedDay = "Please select a day.";
      if (frequency === "Monthly" && !selectedDate) newErrors.selectedDate = "Please select a date.";
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
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS));
  };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const stepLabels = ["Source", "Amount", "Schedule"];

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 py-3">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            s < step ? "bg-[#00D09C] text-white" : s === step ? "bg-[#00D09C] text-white ring-2 ring-[#00D09C]/30 ring-offset-1" : "text-[#94A3B8]"
          }`} style={s > step ? { backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" } : {}}>
            {s < step ? <Check className="h-3.5 w-3.5" /> : s}
          </div>
          {s < TOTAL_STEPS && <div className={`w-8 h-0.5 rounded ${s < step ? "bg-[#00D09C]" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  // Clear field errors in real-time when user fills data
  useEffect(() => { if (companyName && errors.companyName) setErrors(prev => { const n = {...prev}; delete n.companyName; return n; }); }, [companyName]);
  useEffect(() => { if (expectedAmount && errors.expectedAmount) setErrors(prev => { const n = {...prev}; delete n.expectedAmount; return n; }); }, [expectedAmount]);
  useEffect(() => { if (frequency && errors.frequency) setErrors(prev => { const n = {...prev}; delete n.frequency; return n; }); }, [frequency]);
  useEffect(() => { if (selectedDay && errors.selectedDay) setErrors(prev => { const n = {...prev}; delete n.selectedDay; return n; }); }, [selectedDay]);
  useEffect(() => { if (selectedDate && errors.selectedDate) setErrors(prev => { const n = {...prev}; delete n.selectedDate; return n; }); }, [selectedDate]);

  const validate = () => {
    const newErrors = {};

    // Company Name validation
    const nameError = validateTextField(companyName, "Company name", 50);
    if (nameError) newErrors.companyName = nameError;
    
    // Check uniqueness
    if (isCompanyNameUnique === false) {
      newErrors.companyName = companyNameUniqueError || "An entry with this name already exists.";
    }

    // Amount validation
    const amountError = validatePositiveAmount(expectedAmount, "Expected amount");
    if (amountError) newErrors.expectedAmount = amountError;

    // Frequency validation
    if (!frequency) {
      newErrors.frequency = "Please select a frequency.";
    }

    // Conditional field validation
    if (frequency === "Weekly" && !selectedDay) {
      newErrors.selectedDay = "Please select a day.";
    }

    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a date.";
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

    setErrors(newErrors);
    
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Show confirmation dialog if editing
    if (id) {
      setShowUpdateConfirm(true);
      return;
    }

    // Check for duplicate business name when creating new
    try {
      const response = await axios.get(`${backendUrl}/api/income`);
      const businesses = response.data.filter(item => item.type === "Job");
      const duplicate = businesses.find(b => b.name.toLowerCase() === companyName.trim().toLowerCase());
      
      if (duplicate) {
        setExistingJob(duplicate);
        setShowDuplicateDialog(true);
        return;
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
    }

    // Proceed with save
    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    
    try {
      const payload = {
        type: "Job",
        name: companyName,
        expectedAmount: parseFloat(expectedAmount),
        frequency,
        selectedDay: selectedDay || null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
        customFrequency: customFrequency || null,
        customDate: customDate || null,
        // Variable income fields
        incomeType: incomeType,
        reminderTime: incomeType === "variable" ? reminderTime : null,
        startDate: startDate || null,
      };

      if (id) {
        // Update existing business
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        // Create new business
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      // Invalidate SWR cache
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      fireConfetti();
      setTimeout(() => navigate("/my-job"), 400);
    } catch (error) {
      console.error("Error saving job income:", error);
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
      
      // Invalidate SWR cache
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      navigate("/my-job");
    } catch (error) {
      console.error("Error deleting job:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP CONTENT (JSX variables, not components, to avoid remount on re-render) ───

  const step1Content = (
    <div className="space-y-6" data-testid="step-1-source">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Who pays you?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tell us about your employer</p>
      </div>
      {/* Company Name */}
      <div className="w-full">
        <label htmlFor="companyName" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Company Name</label>
        <div className="relative">
          <input id="companyName" type="text" value={companyName}
            onChange={(e) => { setCompanyName(e.target.value); if (errors.companyName) setErrors(prev => ({ ...prev, companyName: null })); }}
            onBlur={() => checkCompanyNameUnique(companyName)}
            placeholder="Enter Company Name" maxLength={50}
            className="w-full rounded-xl border px-4 py-3 pr-10 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.companyName || companyNameUniqueError ? "var(--status-error)" : isCompanyNameUnique === true && companyName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="company-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingCompanyName && <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />}
            {!isCheckingCompanyName && isCompanyNameUnique === true && companyName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.companyName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.companyName}</p>}
        {!errors.companyName && companyNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{companyNameUniqueError}</p>}
        {!errors.companyName && !companyNameUniqueError && isCompanyNameUnique === true && companyName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
      {/* Income Type Toggle */}
      <IncomeTypeToggle value={incomeType} onChange={setIncomeType} testId="income-type-toggle" />
      {/* Reminder Time - Variable only */}
      {incomeType === "variable" && <ReminderTimePicker value={reminderTime} onChange={setReminderTime} testId="reminder-time-picker" />}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amount">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>How much & how often?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your expected earnings</p>
      </div>
      {/* Expected Amount */}
      <div className="w-full">
        <label htmlFor="expectedAmount" className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Expected Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
          <input id="expectedAmount" type="text" value={expectedAmount} onChange={handleAmountChange} placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.expectedAmount ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="expected-amount-input" />
        </div>
        {parseFloat(expectedAmount) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(expectedAmount))}</p>}
        {errors.expectedAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.expectedAmount}</p>}
      </div>
      {/* Frequency */}
      <div className="w-full">
        <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Payment Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {frequencyOptions.map((opt) => (
            <button key={opt} type="button" onClick={() => setFrequency(opt)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${frequency === opt ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C] ring-1 ring-[#00D09C]/30" : ""}`}
              style={frequency !== opt ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
              data-testid={`freq-${opt.toLowerCase().replace(/\s+/g, '-')}`}>
              {opt}
            </button>
          ))}
        </div>
        {errors.frequency && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.frequency}</p>}
      </div>
    </div>
  );

  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>When to expect?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your payment schedule</p>
      </div>

      {/* Weekly */}
      {frequency === "Weekly" && (
        <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="weekly-fields">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Day</label>
          <div className="grid grid-cols-2 gap-2">
            {weekDays.map((day) => (
              <button key={day} type="button" onClick={() => setSelectedDay(day)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedDay === day ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                style={selectedDay !== day ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                data-testid={`day-${day.toLowerCase()}`}>
                {day}
              </button>
            ))}
          </div>
          {errors.selectedDay && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDay}</p>}
        </div>
      )}

      {/* Monthly */}
      {frequency === "Monthly" && (
        <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
          <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Select payment date" error={!!errors.selectedDate} testId="date-select" />
          {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
        </div>
      )}

      {/* Quarterly */}
      {frequency === "Quarterly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="quarterly-fields">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Quarter</label>
            <div className="grid grid-cols-2 gap-2">
              {quarters.map((q) => (
                <button key={q.id} type="button" onClick={() => { setSelectedQuarter(q.label); setSelectedMonth(""); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedQuarter === q.label ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedQuarter !== q.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                  {q.label}
                </button>
              ))}
            </div>
            {errors.selectedQuarter && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedQuarter}</p>}
          </div>
          {selectedQuarter && (
            <div className="w-full">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
              <div className="grid grid-cols-3 gap-2">
                {quarterMonths.map((month) => (
                  <button key={month} type="button" onClick={() => { setSelectedMonth(month); setSelectedDate(""); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === month ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                    style={selectedMonth !== month ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                    {month}
                  </button>
                ))}
              </div>
              {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
            </div>
          )}
          {selectedMonth && (
            <div className="w-full">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
          {calculateQuarterlyDates.length > 0 && (
            <div className="w-full rounded-xl p-4" style={{ backgroundColor: "#00D09C10", border: "1px solid #00D09C30" }}>
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-[#00D09C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Next Recurring Dates:</p>
                  <div className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>
                    {calculateQuarterlyDates.map((date, idx) => <div key={idx}>• {date}</div>)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Half-Yearly */}
      {frequency === "Half-Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="half-yearly-fields">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Half</label>
            <div className="grid grid-cols-2 gap-2">
              {halves.map((h) => (
                <button key={h.id} type="button" onClick={() => { setSelectedHalf(h.label); setSelectedMonth(""); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedHalf === h.label ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedHalf !== h.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                  {h.label}
                </button>
              ))}
            </div>
            {errors.selectedHalf && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedHalf}</p>}
          </div>
          {selectedHalf && (
            <div className="w-full">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
              <div className="grid grid-cols-3 gap-2">
                {halfMonths.map((month) => (
                  <button key={month} type="button" onClick={() => { setSelectedMonth(month); setSelectedDate(""); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === month ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                    style={selectedMonth !== month ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                    {month}
                  </button>
                ))}
              </div>
              {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
            </div>
          )}
          {selectedMonth && (
            <div className="w-full">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
          {calculateHalfYearlyDate && (
            <div className="w-full rounded-xl p-4" style={{ backgroundColor: "#00D09C10", border: "1px solid #00D09C30" }}>
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-[#00D09C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Next Recurring Date:</p>
                  <div className="text-sm" style={{ color: "var(--text-muted)" }}>• {calculateHalfYearlyDate}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Yearly */}
      {frequency === "Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="yearly-fields">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
            <div className="grid grid-cols-3 gap-2">
              {allMonths.map((m) => (
                <button key={m} type="button" onClick={() => setSelectedMonth(m)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === m ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedMonth !== m ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
            <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
            {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
          </div>
        </div>
      )}

      {/* Others */}
      {frequency === "Others" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="others-fields">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Custom Frequency</label>
            <input type="text" value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)} placeholder="e.g., Every 2 weeks"
              className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
              style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="custom-frequency-input" />
            {errors.customFrequency && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customFrequency}</p>}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
            <RestrictedDatePicker value={customDate} onChange={(date) => setCustomDate(date)} placeholder="Select next expected date" error={!!errors.customDate} testId="custom-date-input" />
            {errors.customDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customDate}</p>}
          </div>
        </div>
      )}

      {/* Start Date */}
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Start Date <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="start-date-input" />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>When did this income start?</p>
      </div>
    </div>
  );

  const renderStep = () => {
    if (id) {
      // Edit mode: show all fields at once
      return (
        <div className="space-y-8" data-testid="income-edit-all-fields">
          <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">1</span>Source</h3>{step1Content}</div>
          <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">2</span>Amount</h3>{step2Content}</div>
          <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">3</span>Schedule</h3>{step3Content}</div>
        </div>
      );
    }
    switch (step) {
      case 1: return step1Content;
      case 2: return step2Content;
      case 3: return step3Content;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg-app)" }} data-testid="job-income-page">
      {/* Header */}
      <header className="flex items-center px-5 pt-6 pb-2 flex-shrink-0">
        <button type="button" onClick={() => id ? navigate(-1) : (step > 1 ? handlePrev() : navigate(-1))}
          className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          data-testid="back-button">
          <ChevronLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold" style={{ color: "var(--text-primary)" }} data-testid="page-title">
          {id ? "Edit Job Income" : "Add Job Income"}
        </h1>
        {!id && (
          <button type="button" onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="close-button">
            <X className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
        )}
        {id && <div className="h-9 w-9" />}
      </header>

      {/* Step Indicator - only for create mode */}
      {!id && (
        <div className="px-5">
          <StepIndicator />
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="mx-auto w-full max-w-[540px] px-5 pt-4">
          {renderStep()}

          {/* Income Ledger - Edit Mode Only */}
          {id && (
            <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#00D09C08", border: "1px solid #00D09C20" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>Income Ledger</h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {incomeType === "variable" ? "Track your variable earnings" : "Auto-recorded based on frequency"}
                  </p>
                </div>
                {incomeType === "variable" && (
                  <button type="button" onClick={() => setShowIncomeModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00D09C] text-white text-xs font-medium" data-testid="add-todays-income-btn">
                    <PlusCircle className="h-3.5 w-3.5" /> Add Income
                  </button>
                )}
              </div>
              <TransactionHistoryPanel key={transactionRefreshKey} entityId={id} entityType="income"
                fetchHistory={getIncomeTransactionHistory} deleteTransaction={deleteIncomeTransaction}
                onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)}
                onEditTransaction={(txn) => { setEditingTransaction(txn); setShowRecordModal(true); }} />
            </div>
          )}

          {errors.submit && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div>}
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 py-3 z-40" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-light)" }}>
        <div className="mx-auto max-w-[540px] flex gap-3">
          {id ? (
            <>
              <button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ borderColor: "var(--status-error)", color: "var(--status-error)" }} data-testid="delete-button">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
              <button type="button" onClick={handleSave} disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm" data-testid="update-button">
                {isSubmitting ? "Updating..." : "Update Job Income"}
              </button>
            </>
          ) : (
            <>
              {step > 1 && (
                <button type="button" onClick={handlePrev}
                  className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-xl border font-medium text-sm transition-all active:scale-[0.98]"
                  style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }} data-testid="prev-step-btn">
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button type="button" onClick={handleNext}
                  className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-sm"
                  style={{ backgroundColor: "#00D09C" }} data-testid="next-step-btn">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSave} disabled={isSubmitting}
                  className="flex-1 h-12 rounded-xl text-white font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: "#00D09C" }} data-testid="save-button">
                  {isSubmitting ? "Saving..." : "Save Job Income"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">
              Confirm Changes
            </h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to update this job income? This will replace the existing information.
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">
              Delete Job?
            </h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{companyName}"? This action cannot be undone.
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

      {/* Duplicate Job Dialog */}
      {showDuplicateDialog && existingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">
              Job Already Exists
            </h3>
            <p className="text-[#334155]/70 mb-6">
              A job with the name "{companyName}" already exists. Would you like to edit the existing job or create a new one anyway?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateDialog(false);
                  navigate(`/job-income/${existingJob.id}`);
                }}
                className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium transition-colors hover:bg-[#0D9488]"
              >
                Edit Existing Job
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateDialog(false);
                  performSave();
                }}
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

      {/* Income Amount Modal (for Variable income) */}
      <IncomeAmountModal
        isOpen={showIncomeModal || showRecordModal}
        onClose={() => {
          setShowIncomeModal(false);
          setShowRecordModal(false);
          setEditingTransaction(null);
        }}
        entityId={id}
        entityName={companyName}
        expectedAmount={parseFloat(expectedAmount) || 0}
        editingTransaction={editingTransaction}
        onSubmit={async (data) => {
          await recordIncomeTransaction({
            ...data,
            incomeType: "variable"
          });
          await dismissRelatedNotifications(id);
          setTransactionRefreshKey(k => k + 1);
        }}
        onUpdate={async (data) => {
          await updateIncomeTransaction(data.transactionId, {
            amount: data.amount,
            transactionDate: data.transactionDate
          });
          setTransactionRefreshKey(k => k + 1);
        }}
      />

      {/* Bottom Navigation */}
    </div>
  );
};

export default JobIncome;

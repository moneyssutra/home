import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Check, Loader2, Calendar, PlusCircle } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import AmountInput from "@/components/AmountInput";
import IncomeTypeToggle from "@/components/IncomeTypeToggle";
import ReminderTimePicker from "@/components/ReminderTimePicker";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateTextField,
  scrollToFirstError
} from "@/lib/validations";
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

const BusinessIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL if editing
  const [businessName, setBusinessName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  
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
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingBusiness, setExistingBusiness] = useState(null);
  
  // Income Amount Modal (for Variable income)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Entity uniqueness check
  const {
    checkUniqueness: checkBusinessNameUnique,
    isChecking: isCheckingBusinessName,
    isUnique: isBusinessNameUnique,
    error: businessNameUniqueError,
    reset: resetBusinessNameCheck
  } = useEntityUniqueness({
    collection: "income_sources",
    field: "name",
    excludeId: id || null,
    typeFilter: "Business"
  });
  
  // Get today's date for minimum date restriction
  const today = new Date().toISOString().split('T')[0];

  // Fetch business data if editing
  useEffect(() => {
    if (id) {
      fetchBusinessData();
    }
  }, [id]);

  const fetchBusinessData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      // Pre-fill all fields
      setBusinessName(data.name || "");
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
      
      // Mark initial load as complete after a brief delay to allow state to settle
      setTimeout(() => setIsInitialLoad(false), 100);
    } catch (error) {
      console.error("Error fetching business data:", error);
      setErrors({ submit: "Failed to load business data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset conditional fields when frequency changes (only when creating new, not editing)
  const [isInitialLoad, setIsInitialLoad] = useState(!!id);
  
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

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  const validate = () => {
    const newErrors = {};

    // Business Name validation
    const nameError = validateTextField(businessName, "Business name", 50);
    if (nameError) newErrors.businessName = nameError;
    
    // Check uniqueness (only block if explicitly not unique)
    if (isBusinessNameUnique === false) {
      newErrors.businessName = businessNameUniqueError || "An entry with this name already exists.";
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
      const businesses = response.data.filter(item => item.type === "Business");
      const duplicate = businesses.find(b => b.name.toLowerCase() === businessName.trim().toLowerCase());
      
      if (duplicate) {
        setExistingBusiness(duplicate);
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
        type: "Business",
        name: businessName,
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
      };

      if (id) {
        // Update existing business
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        // Create new business
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      // Invalidate SWR cache to ensure fresh data on list pages
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      navigate("/my-business");
    } catch (error) {
      console.error("Error saving business income:", error);
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
      
      // Invalidate SWR cache to ensure fresh data on list pages
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      navigate("/my-business");
    } catch (error) {
      console.error("Error deleting business:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen honeycomb-bg flex flex-col"
      data-testid="business-income-page"
    >
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
          onClick={() => navigate("/my-business")}
          aria-label="Back to my business"
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1
          className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="page-title"
        >
          Business Income
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Business Name */}
            <div className="w-full">
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-[#334155] mb-2"
              >
                Business Name
              </label>
              <div className="relative">
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    if (errors.businessName) {
                      setErrors(prev => ({ ...prev, businessName: null }));
                    }
                  }}
                  onBlur={() => checkBusinessNameUnique(businessName)}
                  placeholder="Enter Business Name"
                  maxLength={50}
                  className="w-full rounded-xl border px-4 py-3 pr-10 text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: errors.businessName || businessNameUniqueError 
                      ? "var(--status-error)" 
                      : isBusinessNameUnique === true && businessName.trim() 
                        ? "var(--status-success)" 
                        : "var(--border-light)"
                  }}
                  data-testid="business-name-input"
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingBusinessName && (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
                  )}
                  {!isCheckingBusinessName && isBusinessNameUnique === true && businessName.trim() && (
                    <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />
                  )}
                </div>
              </div>
              {errors.businessName && (
                <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.businessName}</p>
              )}
              {!errors.businessName && businessNameUniqueError && (
                <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{businessNameUniqueError}</p>
              )}
              {!errors.businessName && !businessNameUniqueError && isBusinessNameUnique === true && businessName.trim() && (
                <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>
              )}
            </div>

            {/* Income Type Toggle (Fixed/Variable) */}
            <IncomeTypeToggle 
              value={incomeType} 
              onChange={setIncomeType}
              testId="income-type-toggle"
            />

            {/* Reminder Time - Only show when Variable is selected */}
            {incomeType === "variable" && (
              <ReminderTimePicker
                value={reminderTime}
                onChange={setReminderTime}
                testId="reminder-time-picker"
              />
            )}

            {/* Expected Amount */}
            <div className="w-full">
              <AmountInput
                label="Expected Amount"
                value={expectedAmount}
                onChange={setExpectedAmount}
                required
                testId="expected-amount-input"
              />
              {errors.expectedAmount && (
                <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>
              )}
            </div>

            {/* Frequency */}
            <div className="w-full">
              <label
                htmlFor="frequency"
                className="block text-sm font-medium text-[#334155] mb-2"
              >
                Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="frequency-select"
              >
                <option value="">Select Frequency</option>
                {frequencyOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.frequency && (
                <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>
              )}
            </div>

            {/* Conditional Fields - Weekly */}
            {frequency === "Weekly" && (
              <div
                className="w-full animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="weekly-fields"
              >
                <label htmlFor="weekDay" className="block text-sm font-medium text-[#334155] mb-2">
                  Select Day
                </label>
                <select
                  id="weekDay"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="day-select"
                >
                  <option value="">Select Day</option>
                  {weekDays.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                {errors.selectedDay && (
                  <p className="text-sm text-red-500 mt-1">{errors.selectedDay}</p>
                )}
              </div>
            )}

            {/* Conditional Fields - Monthly */}
            {frequency === "Monthly" && (
              <div
                className="w-full animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="monthly-fields"
              >
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Date
                </label>
                <RestrictedDatePicker
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  placeholder="Select payment date"
                  error={!!errors.selectedDate}
                  testId="date-select"
                />
                {errors.selectedDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                )}
              </div>
            )}

            {/* Conditional Fields - Quarterly */}
            {frequency === "Quarterly" && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="quarterly-fields"
              >
                {/* Quarter Selection */}
                <div className="w-full">
                  <label htmlFor="quarter" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Quarter
                  </label>
                  <select
                    id="quarter"
                    value={selectedQuarter}
                    onChange={(e) => {
                      setSelectedQuarter(e.target.value);
                      setSelectedMonth("");
                      setSelectedDate("");
                    }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="quarter-select"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => (
                      <option key={q.id} value={q.label}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                  {errors.selectedQuarter && (
                    <p className="text-sm text-red-500 mt-1">{errors.selectedQuarter}</p>
                  )}
                </div>

                {/* Month Selection (based on quarter) */}
                {selectedQuarter && (
                  <div className="w-full">
                    <label htmlFor="quarterMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="quarterMonth"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate("");
                      }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {quarterMonths.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                    {errors.selectedMonth && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>
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
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                    )}
                  </div>
                )}

                {/* Show Next Recurring Dates */}
                {calculateQuarterlyDates.length > 0 && (
                  <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#14B8A6]/30 p-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-[#14B8A6] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#334155] mb-1">
                          Next Recurring Dates:
                        </p>
                        <div className="text-sm text-[#334155]/80 space-y-1">
                          {calculateQuarterlyDates.map((date, idx) => (
                            <div key={idx}>• {date}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Fields - Half-Yearly */}
            {frequency === "Half-Yearly" && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="half-yearly-fields"
              >
                {/* Half Selection */}
                <div className="w-full">
                  <label htmlFor="half" className="block text-sm font-medium text-[#334155] mb-2">
                    Select Half
                  </label>
                  <select
                    id="half"
                    value={selectedHalf}
                    onChange={(e) => {
                      setSelectedHalf(e.target.value);
                      setSelectedMonth("");
                      setSelectedDate("");
                    }}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="half-select"
                  >
                    <option value="">Select Half</option>
                    {halves.map((h) => (
                      <option key={h.id} value={h.label}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                  {errors.selectedHalf && (
                    <p className="text-sm text-red-500 mt-1">{errors.selectedHalf}</p>
                  )}
                </div>

                {/* Month Selection (based on half) */}
                {selectedHalf && (
                  <div className="w-full">
                    <label htmlFor="halfMonth" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Month
                    </label>
                    <select
                      id="halfMonth"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate("");
                      }}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="month-select"
                    >
                      <option value="">Select Month</option>
                      {halfMonths.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                    {errors.selectedMonth && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>
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
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      restrictedMonth={getMonthIndex(selectedMonth)}
                      placeholder="Select date in selected month"
                      error={!!errors.selectedDate}
                      testId="date-select"
                    />
                    {errors.selectedDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                    )}
                  </div>
                )}

                {/* Show Next Recurring Date */}
                {calculateHalfYearlyDate && (
                  <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#14B8A6]/30 p-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-[#14B8A6] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#334155] mb-1">
                          Next Recurring Date:
                        </p>
                        <div className="text-sm text-[#334155]/80">
                          • {calculateHalfYearlyDate}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conditional Fields - Yearly */}
            {frequency === "Yearly" && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="yearly-fields"
              >
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
                    {allMonths.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {errors.selectedMonth && (
                    <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>
                  )}
                </div>
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
                  {errors.selectedDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                  )}
                </div>
              </div>
            )}

            {/* Conditional Fields - Others */}
            {frequency === "Others" && (
              <div
                className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300"
                data-testid="others-fields"
              >
                <div className="w-full">
                  <label htmlFor="customFreq" className="block text-sm font-medium text-[#334155] mb-2">
                    Enter Custom Frequency
                  </label>
                  <input
                    id="customFreq"
                    type="text"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    placeholder="e.g., Every 2 weeks"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="custom-frequency-input"
                  />
                  {errors.customFrequency && (
                    <p className="text-sm text-red-500 mt-1">{errors.customFrequency}</p>
                  )}
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
                  {errors.customDate && (
                    <p className="text-sm text-red-500 mt-1">{errors.customDate}</p>
                  )}
                </div>
              </div>
            )}

            {/* Income Ledger Section - Only shown in Edit Mode */}
            {id && (
              <div className="mt-6 p-4 rounded-xl bg-[#00D09C]/5 border border-[#00D09C]/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-[#334155]">Income Ledger</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {incomeType === "variable" 
                        ? "Track your variable earnings" 
                        : "Auto-recorded based on frequency"}
                    </p>
                  </div>
                  {/* Add Today's Income - Only for Variable income */}
                  {incomeType === "variable" && (
                    <button
                      type="button"
                      onClick={() => setShowIncomeModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D09C] text-white text-sm font-medium hover:bg-[#00B88A] transition-colors"
                      data-testid="add-todays-income-btn"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Today's Income
                    </button>
                  )}
                </div>
                
                {/* Transaction History Panel (Ledger) */}
                <TransactionHistoryPanel
                  key={transactionRefreshKey}
                  entityId={id}
                  entityType="income"
                  fetchHistory={getIncomeTransactionHistory}
                  deleteTransaction={deleteIncomeTransaction}
                  onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)}
                  onEditTransaction={(txn) => {
                    setEditingTransaction(txn);
                    setShowRecordModal(true);
                  }}
                />
              </div>
            )}

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
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
            /* Edit Mode - Show Update and Delete side-by-side */
            <div className="flex flex-row gap-3">
              {/* Delete Button - Ghost Style (flex: 1 = 30%) */}
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
              {/* Update Button - Primary Style (flex: 2 = 70%) */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Business Income"}
              </button>
            </div>
          ) : (
            /* Create Mode - Show Save Only */
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || isCheckingBusinessName || isBusinessNameUnique === false}
              className="w-full h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Business Income"}
            </button>
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
              Are you sure you want to update this business income? This will replace the existing information.
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
              Delete Business?
            </h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{businessName}"? This action cannot be undone.
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

      {/* Duplicate Business Dialog */}
      {showDuplicateDialog && existingBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">
              Business Already Exists
            </h3>
            <p className="text-[#334155]/70 mb-6">
              A business with the name "{businessName}" already exists. Would you like to edit the existing business or create a new one anyway?
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateDialog(false);
                  navigate(`/business-income/${existingBusiness.id}`);
                }}
                className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium transition-colors hover:bg-[#0D9488]"
              >
                Edit Existing Business
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
        isOpen={showIncomeModal}
        onClose={() => setShowIncomeModal(false)}
        entityId={id}
        entityName={businessName}
        expectedAmount={parseFloat(expectedAmount) || 0}
        onSubmit={async (data) => {
          await recordIncomeTransaction({
            ...data,
            incomeType: "variable"
          });
          await dismissRelatedNotifications(id);
          setTransactionRefreshKey(k => k + 1);
        }}
      />

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default BusinessIncome;

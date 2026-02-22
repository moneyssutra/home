import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Check, Loader2 } from "lucide-react";
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
  scrollToFirstError
} from "@/lib/validations";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";

const JobIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL if editing
  const [companyName, setCompanyName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
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
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingJob, setExistingJob] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
  // Get today's date for minimum date restriction
  const today = new Date().toISOString().split('T')[0];

  // Fetch business data if editing
  useEffect(() => {
    if (id) {
      fetchJobData();
    }
  }, [id]);

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
    } catch (error) {
      console.error("Error fetching job data:", error);
      setErrors({ submit: "Failed to load job data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset conditional fields when frequency changes
  useEffect(() => {
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

    // Company Name validation
    const nameError = validateTextField(companyName, "Company name", 50);
    if (nameError) newErrors.companyName = nameError;

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
      };

      if (id) {
        // Update existing business
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        // Create new business
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      navigate("/my-income");
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
      navigate("/my-income");
    } catch (error) {
      console.error("Error deleting job:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen honeycomb-bg flex flex-col"
      data-testid="job-income-page"
    >
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
          onClick={() => navigate("/my-income")}
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
          Job Income
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Company Name */}
            <div className="w-full">
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-[#334155] mb-2"
              >
                Company Name
              </label>
              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter Company Name"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="company-name-input"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
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
              <label
                htmlFor="expectedAmount"
                className="block text-sm font-medium text-[#334155] mb-2"
              >
                Expected Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">
                  ₹
                </span>
                <input
                  id="expectedAmount"
                  type="text"
                  value={expectedAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="expected-amount-input"
                />
              </div>
              {parseFloat(expectedAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="expected-amount-words">
                  {numberToWords(parseFloat(expectedAmount))}
                </p>
              )}
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

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
                {errors.submit}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-[#334155] bg-[#1E293B]/95 backdrop-blur-sm px-6 py-4 z-40">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            /* Edit Mode - Show Update and Delete */
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-[#1E293B] px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Job Income"}
              </button>
            </div>
          ) : (
            /* Create Mode - Show Save Only */
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Job Income"}
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

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default JobIncome;

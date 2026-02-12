import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2 } from "lucide-react";
import axios from "axios";

const BusinessIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID from URL if editing
  const [businessName, setBusinessName] = useState("");
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
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingBusiness, setExistingBusiness] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  
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
    } catch (error) {
      console.error("Error fetching business data:", error);
      setErrors({ submit: "Failed to load business data" });
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

    if (!businessName.trim()) {
      newErrors.businessName = "Business name is required";
    } else if (businessName.length > 50) {
      newErrors.businessName = "Business name must be 50 characters or less";
    }

    if (!expectedAmount || parseFloat(expectedAmount) <= 0) {
      newErrors.expectedAmount = "Expected amount must be greater than 0";
    }

    if (!frequency) {
      newErrors.frequency = "Please select a frequency";
    }

    // Conditional field validation
    if (frequency === "Weekly" && !selectedDay) {
      newErrors.selectedDay = "Please select a day";
    }

    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a date";
    }

    if (frequency === "Quarterly") {
      if (!selectedQuarter) {
        newErrors.selectedQuarter = "Please select a quarter";
      }
      if (!selectedMonth) {
        newErrors.selectedMonth = "Please select a month";
      }
      if (!selectedDate) {
        newErrors.selectedDate = "Please select a date";
      }
    }

    if (frequency === "Half-Yearly") {
      if (!selectedHalf) {
        newErrors.selectedHalf = "Please select a half";
      }
      if (!selectedMonth) {
        newErrors.selectedMonth = "Please select a month";
      }
      if (!selectedDate) {
        newErrors.selectedDate = "Please select a date";
      }
    }

    if (frequency === "Yearly") {
      if (!selectedMonth) {
        newErrors.selectedMonth = "Please select a month";
      }
      if (!selectedDate) {
        newErrors.selectedDate = "Please select a date";
      }
    }

    if (frequency === "Others") {
      if (!customFrequency.trim()) {
        newErrors.customFrequency = "Please enter custom frequency";
      }
      if (!customDate) {
        newErrors.customDate = "Please select a date";
      }
    }

    setErrors(newErrors);
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
      };

      if (id) {
        // Update existing business
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        // Create new business
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D09C]"
          onClick={() => navigate("/my-business")}
          aria-label="Back to my business"
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1
          className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]"
          style={{ fontFamily: "'Manrope', sans-serif" }}
          data-testid="page-title"
        >
          Business Income
        </h1>
        <div className="h-10 w-10" aria-hidden="true" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Business Name */}
            <div className="w-full">
              <label
                htmlFor="businessName"
                className="block text-sm font-medium text-[#0B3D2E] mb-2"
              >
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter Business Name"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="business-name-input"
              />
              {errors.businessName && (
                <p className="text-sm text-red-500 mt-1">{errors.businessName}</p>
              )}
            </div>

            {/* Expected Amount */}
            <div className="w-full">
              <label
                htmlFor="expectedAmount"
                className="block text-sm font-medium text-[#0B3D2E] mb-2"
              >
                Expected Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">
                  ₹
                </span>
                <input
                  id="expectedAmount"
                  type="text"
                  value={expectedAmount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white pl-10 pr-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="expected-amount-input"
                />
              </div>
              {errors.expectedAmount && (
                <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>
              )}
            </div>

            {/* Frequency */}
            <div className="w-full">
              <label
                htmlFor="frequency"
                className="block text-sm font-medium text-[#0B3D2E] mb-2"
              >
                Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                <label htmlFor="weekDay" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Select Day
                </label>
                <select
                  id="weekDay"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                <label htmlFor="monthlyDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    id="monthlyDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={today}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="date-select"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                </div>
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
                  <label htmlFor="quarter" className="block text-sm font-medium text-[#0B3D2E] mb-2">
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
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                    <label htmlFor="quarterMonth" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Month
                    </label>
                    <select
                      id="quarterMonth"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate("");
                      }}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                    <label htmlFor="quarterDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Date
                    </label>
                    <div className="relative">
                      <input
                        id="quarterDate"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={quarterlyDateRange.min}
                        max={quarterlyDateRange.max}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="date-select"
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                    </div>
                    {errors.selectedDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                    )}
                  </div>
                )}

                {/* Show Next Recurring Dates */}
                {calculateQuarterlyDates.length > 0 && (
                  <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#00D09C]/30 p-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-[#00D09C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B3D2E] mb-1">
                          Next Recurring Dates:
                        </p>
                        <div className="text-sm text-[#0B3D2E]/80 space-y-1">
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
                  <label htmlFor="half" className="block text-sm font-medium text-[#0B3D2E] mb-2">
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
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                    <label htmlFor="halfMonth" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Month
                    </label>
                    <select
                      id="halfMonth"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setSelectedDate("");
                      }}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                    <label htmlFor="halfDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Date
                    </label>
                    <div className="relative">
                      <input
                        id="halfDate"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={halfYearlyDateRange.min}
                        max={halfYearlyDateRange.max}
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                        data-testid="date-select"
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                    </div>
                    {errors.selectedDate && (
                      <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>
                    )}
                  </div>
                )}

                {/* Show Next Recurring Date */}
                {calculateHalfYearlyDate && (
                  <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#00D09C]/30 p-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-5 w-5 text-[#00D09C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#0B3D2E] mb-1">
                          Next Recurring Date:
                        </p>
                        <div className="text-sm text-[#0B3D2E]/80">
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
                  <label htmlFor="yearlyMonth" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Month
                  </label>
                  <select
                    id="yearlyMonth"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
                  <label htmlFor="yearlyDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Date
                  </label>
                  <div className="relative">
                    <input
                      id="yearlyDate"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={today}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="date-select"
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                  </div>
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
                  <label htmlFor="customFreq" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Enter Custom Frequency
                  </label>
                  <input
                    id="customFreq"
                    type="text"
                    value={customFrequency}
                    onChange={(e) => setCustomFrequency(e.target.value)}
                    placeholder="e.g., Every 2 weeks"
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="custom-frequency-input"
                  />
                  {errors.customFrequency && (
                    <p className="text-sm text-red-500 mt-1">{errors.customFrequency}</p>
                  )}
                </div>
                <div className="w-full">
                  <label htmlFor="customDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Date
                  </label>
                  <div className="relative">
                    <input
                      id="customDate"
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={today}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="custom-date-input"
                    />
                    <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                  </div>
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
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            /* Edit Mode - Show Update and Delete */
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-white px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#0B3D2E] mb-3">
              Confirm Changes
            </h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to update this business income? This will replace the existing information.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateConfirm(false)}
                className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium transition-colors hover:bg-[#F8FAF9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={performSave}
                className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium transition-colors hover:bg-[#00BA89]"
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">
              Delete Business?
            </h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{businessName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium transition-colors hover:bg-[#F8FAF9]"
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
    </div>
  );
};

export default BusinessIncome;

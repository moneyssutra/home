import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2, Search, Check, ChevronDown, Calendar, PlusCircle } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import IncomeTypeToggle from "@/components/IncomeTypeToggle";
import ReminderTimePicker from "@/components/ReminderTimePicker";
import { ValidationMessage } from "@/components/ValidationMessage";
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

// Profession categories with options
const PROFESSION_CATEGORIES = {
  "Medical": [
    "Doctor",
    "Surgeon", 
    "Dentist",
    "Physiotherapist",
    "Ayurvedic Practitioner",
    "Homeopath",
    "Veterinarian",
    "Nurse Practitioner",
    "Pharmacist"
  ],
  "Legal & Finance": [
    "CA (Chartered Accountant)",
    "Lawyer",
    "Tax Consultant",
    "Financial Advisor",
    "Company Secretary",
    "Auditor",
    "Advocate"
  ],
  "Tech & Creative": [
    "Software Consultant",
    "Graphic Designer",
    "Content Creator",
    "Web Developer",
    "UI/UX Designer",
    "Video Editor",
    "Photographer",
    "Architect",
    "Interior Designer"
  ],
  "Skilled Services": [
    "Plumber",
    "Electrician",
    "Carpenter",
    "Mechanic",
    "Mason",
    "Painter",
    "Welder",
    "HVAC Technician"
  ],
  "Others": []
};

const SelfEmployedIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  // Form fields
  const [profession, setProfession] = useState("");
  const [customProfession, setCustomProfession] = useState("");
  const [entityName, setEntityName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [frequency, setFrequency] = useState("");
  
  // Profession picker state
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [professionSearch, setProfessionSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  
  // Conditional fields for frequency
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
  
  // Income Amount Modal (for Variable income)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  // Fetch data if editing
  useEffect(() => {
    if (id) {
      fetchIncomeData();
    }
  }, [id]);

  const fetchIncomeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      // Check if it's a known or custom profession
      const allProfessions = Object.values(PROFESSION_CATEGORIES).flat();
      const savedProfession = data.profession || "";
      
      if (savedProfession && allProfessions.includes(savedProfession)) {
        // Known profession from the list
        setProfession(savedProfession);
        setCustomProfession("");
      } else if (savedProfession) {
        // Custom profession not in the standard list
        setProfession("Other");
        setCustomProfession(savedProfession);
      } else {
        // No profession saved - try to infer from name for old entries
        const nameMatch = allProfessions.find(p => 
          p.toLowerCase() === (data.name || "").toLowerCase()
        );
        if (nameMatch) {
          setProfession(nameMatch);
        } else {
          setProfession("");
        }
      }
      
      setEntityName(data.name || "");
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
      console.error("Error fetching income data:", error);
      setErrors({ submit: "Failed to load data" });
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

  // Filter professions based on search
  const filteredProfessions = useMemo(() => {
    const results = {};
    const searchLower = professionSearch.toLowerCase();
    
    Object.entries(PROFESSION_CATEGORIES).forEach(([category, professions]) => {
      if (category === "Others") return;
      
      const filtered = professions.filter(p => 
        p.toLowerCase().includes(searchLower)
      );
      
      if (filtered.length > 0 || category.toLowerCase().includes(searchLower)) {
        results[category] = filtered.length > 0 ? filtered : professions;
      }
    });
    
    // Always include Others option
    results["Others"] = [];
    
    return results;
  }, [professionSearch]);

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
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
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

  const quarterMonths = useMemo(() => {
    const quarter = quarters.find(q => q.label === selectedQuarter);
    return quarter ? quarter.months : [];
  }, [selectedQuarter]);

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

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  const handleSelectProfession = (prof) => {
    if (prof === "Other") {
      setProfession("Other");
      setShowProfessionPicker(false);
    } else {
      setProfession(prof);
      setCustomProfession("");
      setShowProfessionPicker(false);
    }
    setProfessionSearch("");
  };

  // Clear field errors in real-time when user fills data
  useEffect(() => { if (profession && errors.profession) setErrors(prev => { const n = {...prev}; delete n.profession; return n; }); }, [profession]);
  useEffect(() => { if (entityName && errors.entityName) setErrors(prev => { const n = {...prev}; delete n.entityName; return n; }); }, [entityName]);
  useEffect(() => { if (expectedAmount && errors.expectedAmount) setErrors(prev => { const n = {...prev}; delete n.expectedAmount; return n; }); }, [expectedAmount]);
  useEffect(() => { if (frequency && errors.frequency) setErrors(prev => { const n = {...prev}; delete n.frequency; return n; }); }, [frequency]);
  useEffect(() => { if (selectedDay && errors.selectedDay) setErrors(prev => { const n = {...prev}; delete n.selectedDay; return n; }); }, [selectedDay]);
  useEffect(() => { if (selectedDate && errors.selectedDate) setErrors(prev => { const n = {...prev}; delete n.selectedDate; return n; }); }, [selectedDate]);

  const validate = () => {
    const newErrors = {};

    // Profession validation
    if (!profession) {
      newErrors.profession = "Please select a profession.";
    }
    if (profession === "Other" && !customProfession.trim()) {
      newErrors.customProfession = "Please enter your profession.";
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
      const finalProfession = profession === "Other" ? customProfession.trim() : profession;
      
      const payload = {
        type: "Self-Employed",
        name: entityName.trim() || finalProfession,
        profession: finalProfession,
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
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      // Invalidate SWR cache to ensure fresh data on list pages
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      navigate("/my-self-employed");
    } catch (error) {
      console.error("Error saving self-employed income:", error);
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
      
      navigate("/my-self-employed");
    } catch (error) {
      console.error("Error deleting income:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDisplayProfession = () => {
    if (profession === "Other" && customProfession) {
      return customProfession;
    }
    return profession || "Select Profession";
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="self-employed-income-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/my-self-employed")}
          aria-label="Back"
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Self-Employed Income
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto pb-32">
        <form className="mx-auto w-full max-w-[620px] px-6 space-y-6">
          
          {/* Profession Picker */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Profession <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowProfessionPicker(true)}
              className="w-full px-4 py-3 rounded-xl text-left flex items-center justify-between"
              style={{ 
                backgroundColor: "#FFFFFF", 
                border: errors.profession ? "1px solid #EF4444" : "1px solid var(--border-light)",
                color: profession ? "var(--text-primary)" : "var(--text-muted)"
              }}
              data-testid="profession-picker-trigger"
            >
              <span>{getDisplayProfession()}</span>
              <ChevronDown className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </button>
            {errors.profession && <p className="text-rose-500 text-xs mt-1">{errors.profession}</p>}
          </div>

          {/* Custom Profession Input (shown when "Other" is selected) */}
          {profession === "Other" && (
            <div>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Your Profession <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customProfession}
                onChange={(e) => setCustomProfession(e.target.value)}
                placeholder="Enter your profession"
                className="w-full rounded-xl px-4 py-3"
                style={{ 
                  backgroundColor: "#FFFFFF",
                  border: errors.customProfession ? "1px solid #EF4444" : "1px solid var(--border-light)",
                  color: "var(--text-primary)"
                }}
                data-testid="custom-profession-input"
              />
              {errors.customProfession && <p className="text-rose-500 text-xs mt-1">{errors.customProfession}</p>}
            </div>
          )}

          {/* Entity Name (Optional) */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Entity Name <span className="text-[#94A3B8] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Example: Private Clinic, Freelance Portfolio, or Client Name"
              className="w-full rounded-xl px-4 py-3"
              style={{ 
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)"
              }}
              data-testid="entity-name-input"
            />
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
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Expected Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">₹</span>
              <input
                type="text"
                value={expectedAmount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 rounded-xl"
                style={{ 
                  backgroundColor: "#FFFFFF",
                  border: errors.expectedAmount ? "1px solid #EF4444" : "1px solid var(--border-light)",
                  color: "var(--text-primary)"
                }}
                data-testid="expected-amount-input"
              />
            </div>
            {parseFloat(expectedAmount) > 0 && (
              <p className="mt-1.5 text-xs text-[#334155]/50 italic">{numberToWords(parseFloat(expectedAmount))}</p>
            )}
            {errors.expectedAmount && <p className="text-rose-500 text-xs mt-1">{errors.expectedAmount}</p>}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Frequency <span className="text-rose-500">*</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-xl px-4 py-3"
              style={{ 
                backgroundColor: "#FFFFFF",
                border: errors.frequency ? "1px solid #EF4444" : "1px solid var(--border-light)",
                color: frequency ? "var(--text-primary)" : "var(--text-muted)"
              }}
              data-testid="frequency-select"
            >
              <option value="">Select Frequency</option>
              {frequencyOptions.map((freq) => (
                <option key={freq} value={freq}>{freq}</option>
              ))}
            </select>
            {errors.frequency && <p className="text-rose-500 text-xs mt-1">{errors.frequency}</p>}
          </div>

          {/* Conditional Fields based on Frequency */}
          {frequency === "Weekly" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Select Day <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full rounded-xl px-4 py-3"
                style={{ 
                  backgroundColor: "#FFFFFF",
                  border: errors.selectedDay ? "1px solid #EF4444" : "1px solid var(--border-light)",
                  color: selectedDay ? "var(--text-primary)" : "var(--text-muted)"
                }}
                data-testid="day-select"
              >
                <option value="">Select Day</option>
                {weekDays.map((day) => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
              {errors.selectedDay && <p className="text-rose-500 text-xs mt-1">{errors.selectedDay}</p>}
            </div>
          )}

          {frequency === "Monthly" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Select Date <span className="text-rose-500">*</span>
              </label>
              <RestrictedDatePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                placeholder="Select payment date"
                error={!!errors.selectedDate}
                testId="date-select"
              />
              {errors.selectedDate && <p className="text-rose-500 text-xs mt-1">{errors.selectedDate}</p>}
            </div>
          )}

          {frequency === "Quarterly" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Quarter Selection */}
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Quarter <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => {
                    setSelectedQuarter(e.target.value);
                    setSelectedMonth("");
                    setSelectedDate("");
                  }}
                  className="w-full rounded-xl px-4 py-3"
                  style={{ 
                    backgroundColor: "#FFFFFF",
                    border: errors.selectedQuarter ? "1px solid #EF4444" : "1px solid var(--border-light)",
                    color: selectedQuarter ? "var(--text-primary)" : "var(--text-muted)"
                  }}
                  data-testid="quarter-select"
                >
                  <option value="">Select Quarter</option>
                  {quarters.map((q) => (
                    <option key={q.id} value={q.label}>{q.label}</option>
                  ))}
                </select>
                {errors.selectedQuarter && <p className="text-rose-500 text-xs mt-1">{errors.selectedQuarter}</p>}
              </div>

              {/* Month Selection (based on quarter) */}
              {selectedQuarter && (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Month <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setSelectedDate("");
                    }}
                    className="w-full rounded-xl px-4 py-3"
                    style={{ 
                      backgroundColor: "#FFFFFF",
                      border: errors.selectedMonth ? "1px solid #EF4444" : "1px solid var(--border-light)",
                      color: selectedMonth ? "var(--text-primary)" : "var(--text-muted)"
                    }}
                    data-testid="month-select"
                  >
                    <option value="">Select Month</option>
                    {quarterMonths.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  {errors.selectedMonth && <p className="text-rose-500 text-xs mt-1">{errors.selectedMonth}</p>}
                </div>
              )}

              {/* Date Selection */}
              {selectedMonth && (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Date <span className="text-rose-500">*</span>
                  </label>
                  <RestrictedDatePicker
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    restrictedMonth={getMonthIndex(selectedMonth)}
                    placeholder="Select date in selected month"
                    error={!!errors.selectedDate}
                    testId="date-select"
                  />
                  {errors.selectedDate && <p className="text-rose-500 text-xs mt-1">{errors.selectedDate}</p>}
                </div>
              )}

              {/* Show Next Recurring Dates */}
              {calculateQuarterlyDates.length > 0 && (
                <div className="w-full rounded-xl p-4" style={{ backgroundColor: "var(--brand-primary-soft)", border: "1px solid var(--brand-primary)" }}>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                        Next Recurring Dates:
                      </p>
                      <div className="text-sm space-y-1" style={{ color: "var(--text-secondary)" }}>
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

          {frequency === "Half-Yearly" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Half Selection */}
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Half <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedHalf}
                  onChange={(e) => {
                    setSelectedHalf(e.target.value);
                    setSelectedMonth("");
                    setSelectedDate("");
                  }}
                  className="w-full rounded-xl px-4 py-3"
                  style={{ 
                    backgroundColor: "#FFFFFF",
                    border: errors.selectedHalf ? "1px solid #EF4444" : "1px solid var(--border-light)",
                    color: selectedHalf ? "var(--text-primary)" : "var(--text-muted)"
                  }}
                  data-testid="half-select"
                >
                  <option value="">Select Half</option>
                  {halves.map((h) => (
                    <option key={h.id} value={h.label}>{h.label}</option>
                  ))}
                </select>
                {errors.selectedHalf && <p className="text-rose-500 text-xs mt-1">{errors.selectedHalf}</p>}
              </div>

              {/* Month Selection (based on half) */}
              {selectedHalf && (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Month <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setSelectedDate("");
                    }}
                    className="w-full rounded-xl px-4 py-3"
                    style={{ 
                      backgroundColor: "#FFFFFF",
                      border: errors.selectedMonth ? "1px solid #EF4444" : "1px solid var(--border-light)",
                      color: selectedMonth ? "var(--text-primary)" : "var(--text-muted)"
                    }}
                    data-testid="month-select"
                  >
                    <option value="">Select Month</option>
                    {halfMonths.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                  {errors.selectedMonth && <p className="text-rose-500 text-xs mt-1">{errors.selectedMonth}</p>}
                </div>
              )}

              {/* Date Selection */}
              {selectedMonth && (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Date <span className="text-rose-500">*</span>
                  </label>
                  <RestrictedDatePicker
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    restrictedMonth={getMonthIndex(selectedMonth)}
                    placeholder="Select date in selected month"
                    error={!!errors.selectedDate}
                    testId="date-select"
                  />
                  {errors.selectedDate && <p className="text-rose-500 text-xs mt-1">{errors.selectedDate}</p>}
                </div>
              )}

              {/* Show Next Recurring Date */}
              {calculateHalfYearlyDate && (
                <div className="w-full rounded-xl p-4" style={{ backgroundColor: "var(--brand-primary-soft)", border: "1px solid var(--brand-primary)" }}>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "var(--brand-primary)" }} />
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                        Next Recurring Date:
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        • {calculateHalfYearlyDate}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {frequency === "Yearly" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Month <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setSelectedDate("");
                  }}
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ 
                    backgroundColor: "#FFFFFF",
                    border: errors.selectedMonth ? "1px solid #EF4444" : "1px solid var(--border-light)",
                    color: selectedMonth ? "var(--text-primary)" : "var(--text-muted)"
                  }}
                  data-testid="month-select"
                >
                  <option value="">Select Month</option>
                  {allMonths.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
                {errors.selectedMonth && <p className="text-rose-500 text-xs mt-1">{errors.selectedMonth}</p>}
              </div>

              {selectedMonth && (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Select Date <span className="text-rose-500">*</span>
                  </label>
                  <RestrictedDatePicker
                    value={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    restrictedMonth={getMonthIndex(selectedMonth)}
                    placeholder="Select date in selected month"
                    error={!!errors.selectedDate}
                    testId="date-select"
                  />
                  {errors.selectedDate && <p className="text-rose-500 text-xs mt-1">{errors.selectedDate}</p>}
                </div>
              )}
            </div>
          )}

          {frequency === "Others" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Custom Frequency <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customFrequency}
                  onChange={(e) => setCustomFrequency(e.target.value)}
                  placeholder="e.g., Every 2 weeks, Per project"
                  className="w-full px-4 py-3 rounded-xl"
                  style={{ 
                    backgroundColor: "#FFFFFF",
                    border: errors.customFrequency ? "1px solid #EF4444" : "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="custom-frequency-input"
                />
                {errors.customFrequency && <p className="text-rose-500 text-xs mt-1">{errors.customFrequency}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Next Expected Date <span className="text-rose-500">*</span>
                </label>
                <RestrictedDatePicker
                  value={customDate}
                  onChange={(date) => setCustomDate(date)}
                  placeholder="Select next expected date"
                  error={!!errors.customDate}
                  testId="custom-date-select"
                />
                {errors.customDate && <p className="text-rose-500 text-xs mt-1">{errors.customDate}</p>}
              </div>
            </div>
          )}

          {/* Income Ledger Section - Only shown in Edit Mode */}
          {isEditing && (
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

          {/* Error Message */}
          {errors.submit && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <p className="text-rose-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-row gap-3 pt-4">
            {isEditing && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-[#FF4D4D] bg-transparent text-[#FF4D4D] text-sm font-semibold transition-all hover:bg-red-50 active:scale-[0.98]"
                data-testid="delete-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className={`${isEditing ? 'flex-[2]' : 'w-full'} h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm`}
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : (isEditing ? "Update Income" : "Save Income")}
            </button>
          </div>
        </form>
      </div>

      {/* Profession Picker Modal */}
      {showProfessionPicker && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setShowProfessionPicker(false)}
          />
          <div 
            className="fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-3xl z-50 overflow-hidden flex flex-col"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div className="p-4 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="w-12 h-1.5 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--border-medium)" }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Select Profession
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={professionSearch}
                  onChange={(e) => setProfessionSearch(e.target.value)}
                  placeholder="Search profession..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)",
                    border: "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              {Object.entries(filteredProfessions).map(([category, professions]) => (
                <div key={category} className="mb-4 last:mb-8">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                    {category}
                  </h4>
                  {category === "Others" ? (
                    <button
                      type="button"
                      onClick={() => handleSelectProfession("Other")}
                      className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                      style={{ 
                        backgroundColor: profession === "Other" ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                        border: profession === "Other" ? "1px solid var(--brand-primary)" : "1px solid transparent"
                      }}
                    >
                      <span style={{ color: "var(--text-primary)" }}>Other (Enter Custom)</span>
                      {profession === "Other" && <Check className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {professions.map((prof) => (
                        <button
                          key={prof}
                          type="button"
                          onClick={() => handleSelectProfession(prof)}
                          className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                          style={{ 
                            backgroundColor: profession === prof ? "var(--brand-primary-soft)" : "var(--bg-subtle)",
                            border: profession === prof ? "1px solid var(--brand-primary)" : "1px solid transparent"
                          }}
                        >
                          <span style={{ color: "var(--text-primary)" }}>{prof}</span>
                          {profession === prof && <Check className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-2xl p-6 z-50" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Delete Income?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              This action cannot be undone. Are you sure you want to delete this income source?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: "var(--status-error)" }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowUpdateConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm rounded-2xl p-6 z-50" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Update Income?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to update this income source?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateConfirm(false)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
              >
                Cancel
              </button>
              <button
                onClick={performSave}
                className="flex-1 py-3 rounded-xl font-medium text-white"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Update
              </button>
            </div>
          </div>
        </>
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
        entityName={profession === "Other" ? customProfession : profession || "Self-Employment"}
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

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default SelfEmployedIncome;

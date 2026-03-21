import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trash2, Search, Check, ChevronDown, Calendar, PlusCircle, X, Loader2 } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
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
  const [startDate, setStartDate] = useState("");
  
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
    window.scrollTo(0, 0);
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
      setStartDate(data.startDate || "");
      
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

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!profession) newErrors.profession = "Please select a profession.";
      if (profession === "Other" && !customProfession.trim()) newErrors.customProfession = "Please enter your profession.";
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

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

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
        startDate: startDate || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      // Invalidate SWR cache to ensure fresh data on list pages
      await mutate((key) => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      
      fireConfetti();
      setTimeout(() => navigate("/my-self-employed"), 400);
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

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-profession">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Your Profession</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Tell us what you do</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Profession</label>
        <button type="button" onClick={() => setShowProfessionPicker(true)}
          className="w-full px-4 py-3 rounded-xl text-left flex items-center justify-between"
          style={{ backgroundColor: "var(--bg-subtle)", border: errors.profession ? "1px solid var(--status-error)" : "1px solid var(--border-light)", color: profession ? "var(--text-primary)" : "var(--text-muted)" }}
          data-testid="profession-picker-trigger">
          <span>{getDisplayProfession()}</span>
          <ChevronDown className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </button>
        {errors.profession && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.profession}</p>}
      </div>
      {profession === "Other" && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Your Profession</label>
          <input type="text" value={customProfession} onChange={(e) => setCustomProfession(e.target.value)}
            placeholder="Enter your profession" className="w-full rounded-xl px-4 py-3"
            style={{ backgroundColor: "var(--bg-subtle)", border: errors.customProfession ? "1px solid var(--status-error)" : "1px solid var(--border-light)", color: "var(--text-primary)" }}
            data-testid="custom-profession-input" />
          {errors.customProfession && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customProfession}</p>}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Entity Name <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(Optional)</span></label>
        <input type="text" value={entityName} onChange={(e) => setEntityName(e.target.value)}
          placeholder="Example: Private Clinic, Freelance Portfolio"
          className="w-full rounded-xl px-4 py-3"
          style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
          data-testid="entity-name-input" />
      </div>
      <IncomeTypeToggle value={incomeType} onChange={setIncomeType} testId="income-type-toggle" />
      {incomeType === "variable" && <ReminderTimePicker value={reminderTime} onChange={setReminderTime} testId="reminder-time-picker" />}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amount">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>How much & how often?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your expected earnings</p>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Expected Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
          <input type="text" value={expectedAmount} onChange={handleAmountChange} placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.expectedAmount ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="expected-amount-input" />
        </div>
        {parseFloat(expectedAmount) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(expectedAmount))}</p>}
        {errors.expectedAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.expectedAmount}</p>}
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Payment Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {frequencyOptions.map((opt) => (
            <button key={opt} type="button" onClick={() => setFrequency(opt)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${frequency === opt ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C] ring-1 ring-[#00D09C]/30" : ""}`}
              style={frequency !== opt ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
              data-testid={`freq-${opt.toLowerCase()}`}>{opt}</button>
          ))}
        </div>
        {errors.frequency && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.frequency}</p>}
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Start Date <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="start-date-input" />
      </div>
    </div>
  );

  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>When to expect?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your payment schedule</p>
      </div>
      {frequency === "Weekly" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Day</label>
          <div className="grid grid-cols-2 gap-2">
            {weekDays.map((day) => (
              <button key={day} type="button" onClick={() => setSelectedDay(day)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedDay === day ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                style={selectedDay !== day ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{day}</button>
            ))}
          </div>
          {errors.selectedDay && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDay}</p>}
        </div>
      )}
      {frequency === "Monthly" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
          <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Select payment date" error={!!errors.selectedDate} testId="date-select" />
          {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
        </div>
      )}
      {frequency === "Quarterly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Quarter</label>
            <div className="grid grid-cols-2 gap-2">
              {quarters.map((q) => (
                <button key={q.id} type="button" onClick={() => { setSelectedQuarter(q.label); setSelectedMonth(""); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedQuarter === q.label ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedQuarter !== q.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{q.label}</button>
              ))}
            </div>
            {errors.selectedQuarter && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedQuarter}</p>}
          </div>
          {selectedQuarter && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
              <div className="grid grid-cols-3 gap-2">
                {quarterMonths.map((month) => (
                  <button key={month} type="button" onClick={() => { setSelectedMonth(month); setSelectedDate(""); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === month ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                    style={selectedMonth !== month ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{month}</button>
                ))}
              </div>
              {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
            </div>
          )}
          {selectedMonth && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
          {calculateQuarterlyDates.length > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#00D09C10", border: "1px solid #00D09C30" }}>
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-[#00D09C] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Next Recurring Dates:</p>
                  <div className="text-sm space-y-1" style={{ color: "var(--text-muted)" }}>{calculateQuarterlyDates.map((date, idx) => <div key={idx}>• {date}</div>)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {frequency === "Half-Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Half</label>
            <div className="grid grid-cols-2 gap-2">
              {halves.map((h) => (
                <button key={h.id} type="button" onClick={() => { setSelectedHalf(h.label); setSelectedMonth(""); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedHalf === h.label ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedHalf !== h.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{h.label}</button>
              ))}
            </div>
            {errors.selectedHalf && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedHalf}</p>}
          </div>
          {selectedHalf && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
              <div className="grid grid-cols-3 gap-2">
                {halfMonths.map((month) => (
                  <button key={month} type="button" onClick={() => { setSelectedMonth(month); setSelectedDate(""); }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === month ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                    style={selectedMonth !== month ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{month}</button>
                ))}
              </div>
              {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
            </div>
          )}
          {selectedMonth && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
          {calculateHalfYearlyDate && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#00D09C10", border: "1px solid #00D09C30" }}>
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
      {frequency === "Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
            <div className="grid grid-cols-3 gap-2">
              {allMonths.map((m) => (
                <button key={m} type="button" onClick={() => { setSelectedMonth(m); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === m ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedMonth !== m ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{m.slice(0, 3)}</button>
              ))}
            </div>
            {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
          </div>
          {selectedMonth && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
        </div>
      )}
      {frequency === "Others" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Custom Frequency</label>
            <input type="text" value={customFrequency} onChange={(e) => setCustomFrequency(e.target.value)} placeholder="e.g., Every 2 weeks, Per project"
              className="w-full px-4 py-3 rounded-xl"
              style={{ backgroundColor: "var(--bg-subtle)", border: errors.customFrequency ? "1px solid var(--status-error)" : "1px solid var(--border-light)", color: "var(--text-primary)" }}
              data-testid="custom-frequency-input" />
            {errors.customFrequency && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customFrequency}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Next Expected Date</label>
            <RestrictedDatePicker value={customDate} onChange={(date) => setCustomDate(date)} placeholder="Select next expected date" error={!!errors.customDate} testId="custom-date-select" />
            {errors.customDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customDate}</p>}
          </div>
        </div>
      )}
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="self-employed-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">1</span>Profession</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">2</span>Amount</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">3</span>Schedule</h3>{step3Content}</div>
    </div>
  );

  const ledgerContent = isEditing ? (
    <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#00D09C08", border: "1px solid #00D09C20" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>Income Ledger</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{incomeType === "variable" ? "Track your variable earnings" : "Auto-recorded based on frequency"}</p>
        </div>
        {incomeType === "variable" && (
          <button type="button" onClick={() => setShowIncomeModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00D09C] text-white text-xs font-medium" data-testid="add-todays-income-btn">
            <PlusCircle className="h-3.5 w-3.5" /> Add Income
          </button>
        )}
      </div>
      <TransactionHistoryPanel key={transactionRefreshKey} entityId={id} entityType="income"
        fetchHistory={getIncomeTransactionHistory} deleteTransaction={deleteIncomeTransaction}
        onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)}
        onEditTransaction={(txn) => { setEditingTransaction(txn); setShowRecordModal(true); }} />
    </div>
  ) : null;

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Income?</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>This action cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Update Income?</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to update this income source?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">Update</button>
            </div>
          </div>
        </div>
      )}
      {showProfessionPicker && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setShowProfessionPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 max-h-[80vh] rounded-t-3xl z-50 overflow-hidden flex flex-col" style={{ backgroundColor: "var(--bg-card)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--border-light)" }}>
              <div className="w-12 h-1.5 rounded-full mx-auto mb-4" style={{ backgroundColor: "var(--border-medium)" }} />
              <h3 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Select Profession</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input type="text" value={professionSearch} onChange={(e) => setProfessionSearch(e.target.value)}
                  placeholder="Search profession..." className="w-full pl-10 pr-4 py-3 rounded-xl"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              {Object.entries(filteredProfessions).map(([category, professions]) => (
                <div key={category} className="mb-4 last:mb-8">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{category}</h4>
                  {category === "Others" ? (
                    <button type="button" onClick={() => handleSelectProfession("Other")}
                      className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                      style={{ backgroundColor: profession === "Other" ? "var(--brand-primary-soft)" : "var(--bg-subtle)", border: profession === "Other" ? "1px solid var(--brand-primary)" : "1px solid transparent" }}>
                      <span style={{ color: "var(--text-primary)" }}>Other (Enter Custom)</span>
                      {profession === "Other" && <Check className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {professions.map((prof) => (
                        <button key={prof} type="button" onClick={() => handleSelectProfession(prof)}
                          className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                          style={{ backgroundColor: profession === prof ? "var(--brand-primary-soft)" : "var(--bg-subtle)", border: profession === prof ? "1px solid var(--brand-primary)" : "1px solid transparent" }}>
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
      <IncomeAmountModal
        isOpen={showIncomeModal || showRecordModal}
        onClose={() => { setShowIncomeModal(false); setShowRecordModal(false); setEditingTransaction(null); }}
        entityId={id} entityName={profession === "Other" ? customProfession : profession || "Self-Employment"}
        expectedAmount={parseFloat(expectedAmount) || 0} editingTransaction={editingTransaction}
        onSubmit={async (data) => { await recordIncomeTransaction({ ...data, incomeType: "variable" }); await dismissRelatedNotifications(id); setTransactionRefreshKey(k => k + 1); }}
        onUpdate={async (data) => { await updateIncomeTransaction(data.transactionId, { amount: data.amount, transactionDate: data.transactionDate }); setTransactionRefreshKey(k => k + 1); }}
      />
    </>
  );

  return (
    <WizardShell
      title={isEditing ? "Edit Self-Employed Income" : "Add Self-Employed Income"}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={isEditing ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={isEditing} isSubmitting={isSubmitting} accentColor="#00D09C"
      editModeContent={editModeContent} ledgerContent={ledgerContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => window.history.length > 2 ? navigate(-1) : navigate("/my-income")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
    </WizardShell>
  );
};

export default SelfEmployedIncome;

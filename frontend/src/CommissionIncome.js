import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Trash2, PlusCircle, X, Check, Calendar } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import WizardShell from "@/components/WizardShell";
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
  dismissRelatedNotifications
} from "@/utils/transactionApi";
import { toast } from "sonner";

const CommissionIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Refs for auto-scroll (kept for frequency dropdowns)
  const dayFieldRef = useRef(null);
  const quarterFieldRef = useRef(null);
  const halfFieldRef = useRef(null);
  const monthFieldRef = useRef(null);
  
  // Form fields
  const [sourceName, setSourceName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  
  // Conditional date fields
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customDate, setCustomDate] = useState("");
  
  // Variable income fields
  const [incomeType, setIncomeType] = useState("fixed");
  const [reminderTime, setReminderTime] = useState("19:00");
  const [startDate, setStartDate] = useState("");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingCommission, setExistingCommission] = useState(null);
  
  // Income Amount Modal (for Variable income)
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  // Fetch data if editing
  useEffect(() => {
    window.scrollTo(0, 0);
    if (id) {
      fetchCommissionData();
    }
  }, [id]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/income/${id}`);
      const data = response.data;
      
      setSourceName(data.name || "");
      setExpectedAmount(data.expectedAmount?.toString() || "");
      setFrequency(data.frequency || "");
      setSelectedDay(data.selectedDay || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setCustomDate(data.customDate || "");
      // Variable income fields
      setIncomeType(data.incomeType || "fixed");
      setReminderTime(data.reminderTime || "19:00");
      setStartDate(data.startDate || "");
    } catch (error) {
      console.error("Error fetching commission data:", error);
      setErrors({ submit: "Failed to load commission data" });
    } finally {
      setLoading(false);
    }
  };

  // Reset conditional fields when frequency changes and auto-scroll
  useEffect(() => {
    if (!id) {
      setSelectedDay("");
      setSelectedDate("");
      setSelectedQuarter("");
      setSelectedHalf("");
      setSelectedMonth("");
      setCustomDate("");
    }
    
    // Auto-scroll to new fields based on frequency
    if (frequency) {
      setTimeout(() => {
        if (frequency === "Weekly" && dayFieldRef.current) {
          dayFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dayFieldRef.current.focus();
        } else if (frequency === "Quarterly" && quarterFieldRef.current) {
          quarterFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quarterFieldRef.current.focus();
        } else if (frequency === "Half-Yearly" && halfFieldRef.current) {
          halfFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          halfFieldRef.current.focus();
        } else if (frequency === "Yearly" && monthFieldRef.current) {
          monthFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          monthFieldRef.current.focus();
        }
      }, 100);
    }
  }, [frequency]);

  const frequencyOptions = ["Daily", "Weekly", "Monthly", "Quarterly", "Half-Yearly", "Yearly", "Irregular"];

  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const quarters = [
    { id: "Q1", label: "Q1 (Jan–Mar)" },
    { id: "Q2", label: "Q2 (Apr–Jun)" },
    { id: "Q3", label: "Q3 (Jul–Sep)" },
    { id: "Q4", label: "Q4 (Oct–Dec)" },
  ];

  const halves = [
    { id: "H1", label: "Jan–Jun" },
    { id: "H2", label: "Jul–Dec" },
  ];

  const allMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Helper to get month index (0-11) from month name
  const getMonthIndex = (monthName) => {
    return allMonths.indexOf(monthName);
  };

  // Get months for selected quarter
  const quarterMonths = useMemo(() => {
    const quarterMap = {
      "Q1 (Jan–Mar)": ["January", "February", "March"],
      "Q2 (Apr–Jun)": ["April", "May", "June"],
      "Q3 (Jul–Sep)": ["July", "August", "September"],
      "Q4 (Oct–Dec)": ["October", "November", "December"]
    };
    return quarterMap[selectedQuarter] || [];
  }, [selectedQuarter]);

  // Get months for selected half
  const halfMonths = useMemo(() => {
    const halfMap = {
      "Jan–Jun": ["January", "February", "March", "April", "May", "June"],
      "Jul–Dec": ["July", "August", "September", "October", "November", "December"]
    };
    return halfMap[selectedHalf] || [];
  }, [selectedHalf]);

  // Generate days 1-31 (kept for backward compatibility but not used in UI)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      const nameError = validateTextField(sourceName, "Commission source name", 100);
      if (nameError) newErrors.sourceName = nameError;
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
      if (frequency === "Irregular" && !customDate) newErrors.customDate = "Please select a date.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const validate = () => {
    const newErrors = {};

    // Source Name validation
    const nameError = validateTextField(sourceName, "Commission source name", 100);
    if (nameError) newErrors.sourceName = nameError;

    // Expected Amount validation
    const amountError = validatePositiveAmount(expectedAmount, "Expected amount");
    if (amountError) newErrors.expectedAmount = amountError;

    // Frequency validation
    if (!frequency) {
      newErrors.frequency = "Please select a frequency.";
    }

    // Date validation based on frequency (Daily has no date field)
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

    if (frequency === "Irregular" && !customDate) {
      newErrors.customDate = "Please select a date.";
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

    // Check for duplicate
    try {
      const response = await axios.get(`${backendUrl}/api/income`);
      const commissions = response.data.filter(item => item.type === "Commission");
      const duplicate = commissions.find(c => c.name.toLowerCase() === sourceName.trim().toLowerCase());
      
      if (duplicate) {
        setExistingCommission(duplicate);
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
        type: "Commission",
        name: sourceName,
        expectedAmount: parseFloat(expectedAmount),
        frequency,
        selectedDay: selectedDay || null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
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
      
      navigate("/my-income");
    } catch (error) {
      console.error("Error saving commission:", error);
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
      console.error("Error deleting commission:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-source">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Commission Source</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Name and type of your commission</p>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Source Name</label>
        <input type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g., Real Estate Sales, Insurance Referral" maxLength={50}
          className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.sourceName ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="source-name-input" />
        {errors.sourceName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.sourceName}</p>}
      </div>
      <IncomeTypeToggle value={incomeType} onChange={setIncomeType} testId="income-type-toggle" />
      {incomeType === "variable" && <ReminderTimePicker value={reminderTime} onChange={setReminderTime} testId="reminder-time-picker" />}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amount">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>How much & how often?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your expected commission</p>
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
    </div>
  );

  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>When to expect?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set your payment schedule</p>
      </div>
      {frequency === "Weekly" && (
        <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Day</label>
          <div className="grid grid-cols-2 gap-2">
            {weekDays.map((day) => (
              <button key={day} type="button" onClick={() => setSelectedDay(day)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedDay === day ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                style={selectedDay !== day ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                data-testid={`day-${day.toLowerCase()}`}>{day}</button>
            ))}
          </div>
          {errors.selectedDay && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDay}</p>}
        </div>
      )}
      {frequency === "Monthly" && (
        <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
          <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} placeholder="Select payment date" error={!!errors.selectedDate} testId="date-select" />
          {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
        </div>
      )}
      {frequency === "Quarterly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
          {selectedQuarter && quarterMonths.length > 0 && (
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
        </div>
      )}
      {frequency === "Half-Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
          {selectedHalf && halfMonths.length > 0 && (
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
        </div>
      )}
      {frequency === "Yearly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-full">
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Month</label>
            <div className="grid grid-cols-3 gap-2">
              {allMonths.map((m) => (
                <button key={m} type="button" onClick={() => { setSelectedMonth(m); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === m ? "border-[#00D09C] bg-[#00D09C]/10 text-[#00D09C]" : ""}`}
                  style={selectedMonth !== m ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
          </div>
          {selectedMonth && (
            <div className="w-full">
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <RestrictedDatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.selectedDate} testId="date-select" />
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
        </div>
      )}
      {frequency === "Irregular" && (
        <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
          <RestrictedDatePicker value={customDate} onChange={(date) => setCustomDate(date)} placeholder="Select expected date" error={!!errors.customDate} testId="irregular-date-input" />
          {errors.customDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.customDate}</p>}
        </div>
      )}
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          Start Date <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
        </label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="start-date-input" />
      </div>
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="commission-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">1</span>Source</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">2</span>Amount</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">3</span>Schedule</h3>{step3Content}</div>
    </div>
  );

  const ledgerContent = id ? (
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
        onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)} />
    </div>
  ) : null;

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Confirm Changes</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to update this commission income?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">Yes, Update</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Commission?</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to delete "{sourceName}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      {showDuplicateDialog && existingCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Commission Already Exists</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>A commission source with the name "{sourceName}" already exists.</p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setShowDuplicateDialog(false); navigate(`/commission-income/${existingCommission.id}`); }} className="w-full rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">Edit Existing</button>
              <button type="button" onClick={() => { setShowDuplicateDialog(false); performSave(); }} className="w-full rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Create New Anyway</button>
              <button type="button" onClick={() => setShowDuplicateDialog(false)} className="w-full rounded-xl px-4 py-3 font-medium" style={{ color: "var(--text-muted)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <IncomeAmountModal isOpen={showIncomeModal} onClose={() => setShowIncomeModal(false)}
        entityId={id} entityName={sourceName} expectedAmount={parseFloat(expectedAmount) || 0}
        onSubmit={async (data) => { await recordIncomeTransaction({ ...data, incomeType: "variable" }); await dismissRelatedNotifications(id); setTransactionRefreshKey(k => k + 1); }} />
    </>
  );

  return (
    <WizardShell
      title={id ? "Edit Commission Income" : "Add Commission Income"}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor="#00D09C"
      editModeContent={editModeContent} ledgerContent={ledgerContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate(-1)}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
    </WizardShell>
  );
};

export default CommissionIncome;

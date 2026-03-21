import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Trash2, Check, Loader2, PlusCircle } from "lucide-react";
import axios from "axios";
import { mutate } from "swr";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";
import { getQuarterMonths, getHalfYearMonths, validateQuarterDate, validateHalfYearDate } from "@/lib/quarterUtils";
import TransactionHistoryPanel from "@/components/TransactionHistoryPanel";
import RecordTransactionModal from "@/components/RecordTransactionModal";
import { 
  recordExpenseTransaction, 
  getExpenseTransactionHistory,
  deleteExpenseTransaction,
  dismissRelatedNotifications
} from "@/utils/transactionApi";
import { toast } from "sonner";

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  // Refs for auto-scroll
  const dayFieldRef = useRef(null);
  const dateFieldRef = useRef(null);
  const quarterFieldRef = useRef(null);
  const halfFieldRef = useRef(null);
  const monthFieldRef = useRef(null);
  const oneTimeFieldRef = useRef(null);
  
  // Form fields
  const [expenseName, setExpenseName] = useState("");
  const [expenseType, setExpenseType] = useState("Variable");
  const [category, setCategory] = useState("");
  const [categoryLocked, setCategoryLocked] = useState(false);
  const [expectedAmount, setExpectedAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  
  // Conditional date fields
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [oneTimeDate, setOneTimeDate] = useState("");
  
  // Calendar popover states
  const [calendarDate, setCalendarDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [quarterCalendarOpen, setQuarterCalendarOpen] = useState(false);
  const [halfCalendarOpen, setHalfCalendarOpen] = useState(false);
  const [yearlyCalendarOpen, setYearlyCalendarOpen] = useState(false);
  const [oneTimeCalendarOpen, setOneTimeCalendarOpen] = useState(false);
  
  // Accounts for linking
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  // Transaction recording
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [transactionRefreshKey, setTransactionRefreshKey] = useState(0);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  // Entity uniqueness check for expense name
  const {
    checkUniqueness: checkExpenseNameUnique,
    isChecking: isCheckingExpenseName,
    isUnique: isExpenseNameUnique,
    error: expenseNameUniqueError,
    reset: resetExpenseNameCheck
  } = useEntityUniqueness({
    collection: "expenses",
    field: "expenseName",
    excludeId: id || null
  });

  const categoryOptions = [
    "Housing",
    "Utilities",
    "Food",
    "Travel",
    "Shopping",
    "Medical",
    "Education",
    "Subscriptions",
    "Business Expense",
    "Salary Paid",
    "Other"
  ];

  const frequencyOptions = ["Daily", "Weekly", "Monthly", "Quarterly", "Half-Yearly", "Yearly", "One-Time"];

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

  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchAccounts();
    if (id) {
      fetchExpenseData();
    } else {
      // Check for type parameter when creating new expense
      const typeParam = searchParams.get('type');
      if (typeParam === 'Fixed' || typeParam === 'Variable') {
        setExpenseType(typeParam);
      }
      
      // Check for category parameter when creating new expense
      const categoryParam = searchParams.get('category');
      if (categoryParam) {
        setCategory(decodeURIComponent(categoryParam));
        setCategoryLocked(true);
        // Default to Fixed for certain categories
        if (['Housing', 'EMI', 'Insurance', 'Utilities', 'Subscriptions', 'Investments'].includes(decodeURIComponent(categoryParam))) {
          setExpenseType('Fixed');
        }
      }
    }
  }, [id, searchParams]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchExpenseData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/expenses/${id}`);
      const data = response.data;
      
      setExpenseName(data.expenseName || "");
      setExpenseType(data.expenseType || "Variable");
      setCategory(data.category || "");
      setExpectedAmount(data.expectedAmount?.toString() || "");
      setFrequency(data.frequency || "");
      setLinkedAccountId(data.linkedAccountId || "");
      setSelectedDay(data.selectedDay || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setOneTimeDate(data.oneTimeDate || "");
    } catch (error) {
      console.error("Error fetching expense data:", error);
      setErrors({ submit: "Failed to load expense data" });
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
      setOneTimeDate("");
    }
    
    if (frequency) {
      setTimeout(() => {
        if (frequency === "Weekly" && dayFieldRef.current) {
          dayFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dayFieldRef.current.focus();
        } else if (frequency === "Monthly" && dateFieldRef.current) {
          dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          dateFieldRef.current.focus();
        } else if (frequency === "Quarterly" && quarterFieldRef.current) {
          quarterFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          quarterFieldRef.current.focus();
        } else if (frequency === "Half-Yearly" && halfFieldRef.current) {
          halfFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          halfFieldRef.current.focus();
        } else if (frequency === "Yearly" && monthFieldRef.current) {
          monthFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          monthFieldRef.current.focus();
        } else if (frequency === "One-Time" && oneTimeFieldRef.current) {
          oneTimeFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          oneTimeFieldRef.current.focus();
        }
      }, 100);
    }
  }, [frequency]);

  // Auto-scroll when quarter/half/month is selected
  useEffect(() => {
    if (selectedQuarter && dateFieldRef.current) {
      setTimeout(() => {
        dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dateFieldRef.current.focus();
      }, 100);
    }
  }, [selectedQuarter]);

  useEffect(() => {
    if (selectedHalf && dateFieldRef.current) {
      setTimeout(() => {
        dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dateFieldRef.current.focus();
      }, 100);
    }
  }, [selectedHalf]);

  useEffect(() => {
    if (selectedMonth && dateFieldRef.current) {
      setTimeout(() => {
        dateFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dateFieldRef.current.focus();
      }, 100);
    }
  }, [selectedMonth]);

  const handleAmountChange = (e) => {
    const value = formatAmountInput(e.target.value);
    setExpectedAmount(value);
  };

  // Clear field errors in real-time when user fills data
  useEffect(() => { if (category && errors.category) setErrors(prev => { const n = {...prev}; delete n.category; return n; }); }, [category]);
  useEffect(() => { if (expectedAmount && errors.expectedAmount) setErrors(prev => { const n = {...prev}; delete n.expectedAmount; return n; }); }, [expectedAmount]);
  useEffect(() => { if (frequency && errors.frequency) setErrors(prev => { const n = {...prev}; delete n.frequency; return n; }); }, [frequency]);
  useEffect(() => { if (selectedDay && errors.selectedDay) setErrors(prev => { const n = {...prev}; delete n.selectedDay; return n; }); }, [selectedDay]);
  useEffect(() => { if (selectedDate && errors.selectedDate) setErrors(prev => { const n = {...prev}; delete n.selectedDate; return n; }); }, [selectedDate]);
  useEffect(() => { if (selectedQuarter && errors.selectedQuarter) setErrors(prev => { const n = {...prev}; delete n.selectedQuarter; return n; }); }, [selectedQuarter]);
  useEffect(() => { if (selectedHalf && errors.selectedHalf) setErrors(prev => { const n = {...prev}; delete n.selectedHalf; return n; }); }, [selectedHalf]);
  useEffect(() => { if (selectedMonth && errors.selectedMonth) setErrors(prev => { const n = {...prev}; delete n.selectedMonth; return n; }); }, [selectedMonth]);
  useEffect(() => { if (oneTimeDate && errors.oneTimeDate) setErrors(prev => { const n = {...prev}; delete n.oneTimeDate; return n; }); }, [oneTimeDate]);

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 3;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      const nameError = validateTextField(expenseName, "Expense name", 50);
      if (nameError) newErrors.expenseName = nameError;
      if (isExpenseNameUnique === false) newErrors.expenseName = expenseNameUniqueError || "An entry with this name already exists.";
      if (!category) newErrors.category = "Please select a category.";
    }
    if (s === 2) {
      const amountError = validatePositiveAmount(expectedAmount, "Expected amount");
      if (amountError) newErrors.expectedAmount = amountError;
    }
    if (s === 3) {
      if (!frequency) newErrors.frequency = "Please select a frequency.";
      if (frequency === "Weekly" && !selectedDay) newErrors.selectedDay = "Please select a day.";
      if (frequency === "Monthly" && !selectedDate) newErrors.selectedDate = "Please select a date.";
      if (frequency === "Quarterly") { if (!selectedQuarter) newErrors.selectedQuarter = "Please select a quarter."; if (!selectedDate) newErrors.selectedDate = "Please select a date."; }
      if (frequency === "Half-Yearly") { if (!selectedHalf) newErrors.selectedHalf = "Please select a half."; if (!selectedDate) newErrors.selectedDate = "Please select a date."; }
      if (frequency === "Yearly") { if (!selectedMonth) newErrors.selectedMonth = "Please select a month."; if (!selectedDate) newErrors.selectedDate = "Please select a date."; }
      if (frequency === "One-Time" && !oneTimeDate) newErrors.oneTimeDate = "Please select a date.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const validate = () => {
    const newErrors = {};

    // Expense Name validation
    const nameError = validateTextField(expenseName, "Expense name", 50);
    if (nameError) newErrors.expenseName = nameError;
    
    // Check uniqueness
    if (isExpenseNameUnique === false) {
      newErrors.expenseName = expenseNameUniqueError || "An entry with this name already exists.";
    }

    // Category validation
    if (!category) {
      newErrors.category = "Please select a category.";
    }

    // Amount validation
    const amountError = validatePositiveAmount(expectedAmount, "Expected amount");
    if (amountError) newErrors.expectedAmount = amountError;

    // Frequency validation
    if (!frequency) {
      newErrors.frequency = "Please select a frequency.";
    }

    // Date validation based on frequency
    if (frequency === "Weekly" && !selectedDay) {
      newErrors.selectedDay = "Please select a day.";
    }

    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Quarterly") {
      if (!selectedQuarter) newErrors.selectedQuarter = "Please select a quarter.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Half-Yearly") {
      if (!selectedHalf) newErrors.selectedHalf = "Please select a half.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "Yearly") {
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month.";
      if (!selectedDate) newErrors.selectedDate = "Please select a date.";
    }

    if (frequency === "One-Time" && !oneTimeDate) {
      newErrors.oneTimeDate = "Please select a date.";
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
        expenseName,
        expenseType,
        category,
        expectedAmount: parseFloat(expectedAmount),
        frequency,
        linkedAccountId: linkedAccountId || null,
        selectedDay: selectedDay || null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
        oneTimeDate: oneTimeDate || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/expenses/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/expenses`, payload);
      }
      
      // Invalidate SWR cache
      await mutate((key) => typeof key === 'string' && key.includes('/api/expenses'), undefined, { revalidate: true });
      
      fireConfetti();
      setTimeout(() => navigate(-1), 400);
    } catch (error) {
      console.error("Error saving expense:", error);
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
      await axios.delete(`${backendUrl}/api/expenses/${id}`);
      
      // Invalidate SWR cache
      await mutate((key) => typeof key === 'string' && key.includes('/api/expenses'), undefined, { revalidate: true });
      
      navigate(-1);
    } catch (error) {
      console.error("Error deleting expense:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-details">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Expense Details</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>What are you paying for?</p>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Expense Name</label>
        <div className="relative">
          <input type="text" value={expenseName} onChange={(e) => { setExpenseName(e.target.value); if (errors.expenseName) setErrors(prev => ({ ...prev, expenseName: null })); }}
            onBlur={() => checkExpenseNameUnique(expenseName)} placeholder="e.g., House Rent, Netflix, Groceries" maxLength={50}
            className="w-full rounded-xl border px-4 py-3 pr-10 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#FF4D4D]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.expenseName || expenseNameUniqueError ? "var(--status-error)" : isExpenseNameUnique === true && expenseName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="expense-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingExpenseName && <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />}
            {!isCheckingExpenseName && isExpenseNameUnique === true && expenseName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.expenseName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.expenseName}</p>}
        {!errors.expenseName && expenseNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{expenseNameUniqueError}</p>}
        {!errors.expenseName && !expenseNameUniqueError && isExpenseNameUnique === true && expenseName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Expense Type</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setExpenseType("Fixed")}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${expenseType === "Fixed" ? "border-[#334155] bg-[#334155] text-white" : ""}`}
            style={expenseType !== "Fixed" ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
            data-testid="fixed-button">Fixed</button>
          <button type="button" onClick={() => setExpenseType("Variable")}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${expenseType === "Variable" ? "border-[#F59E0B] bg-[#F59E0B] text-white" : ""}`}
            style={expenseType !== "Variable" ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
            data-testid="variable-button">Variable</button>
        </div>
      </div>
      {!categoryLocked && (
        <div className="w-full">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Category</label>
          <div className="grid grid-cols-2 gap-2">
            {categoryOptions.map((opt) => (
              <button key={opt} type="button" onClick={() => setCategory(opt)}
                className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.97] text-left ${category === opt ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D] ring-1 ring-[#FF4D4D]/30" : ""}`}
                style={category !== opt ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                data-testid={`category-${opt.toLowerCase().replace(/\s+/g, '-')}`}>{opt}</button>
            ))}
          </div>
          {errors.category && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.category}</p>}
        </div>
      )}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amount">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>How much & how often?</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set expected amount and frequency</p>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Expected Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
          <input type="text" value={expectedAmount} onChange={handleAmountChange} placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#FF4D4D]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.expectedAmount ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="expected-amount-input" />
        </div>
        {parseFloat(expectedAmount) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(expectedAmount))}</p>}
        {errors.expectedAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.expectedAmount}</p>}
      </div>
      {accounts.length > 0 && (
        <div className="w-full">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Linked Account <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
          <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#FF4D4D]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="linked-account-select">
            <option value="">Select Account (Optional)</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Payment Schedule</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Set frequency and payment schedule</p>
      </div>
      <div className="w-full">
        <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Payment Frequency</label>
        <div className="grid grid-cols-2 gap-2">
          {frequencyOptions.map((opt) => (
            <button key={opt} type="button" onClick={() => setFrequency(opt)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${frequency === opt ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D] ring-1 ring-[#FF4D4D]/30" : ""}`}
              style={frequency !== opt ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
              data-testid={`freq-${opt.toLowerCase().replace(/\s+/g, '-')}`}>{opt}</button>
          ))}
        </div>
        {errors.frequency && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.frequency}</p>}
      </div>
      {frequency === "Weekly" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Day</label>
          <div className="grid grid-cols-2 gap-2">
            {weekDays.map((day) => (
              <button key={day} type="button" onClick={() => setSelectedDay(day)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedDay === day ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D]" : ""}`}
                style={selectedDay !== day ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{day}</button>
            ))}
          </div>
          {errors.selectedDay && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDay}</p>}
        </div>
      )}
      {frequency === "Monthly" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Day of Month</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button ref={dateFieldRef} type="button" className="date-picker-trigger" data-testid="date-calendar-trigger">
                <span className={selectedDate ? "value" : "placeholder"}>{selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'} of every month` : "Select a date from calendar"}</span>
                <CalendarIcon className="h-5 w-5 icon" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
              <Calendar mode="single" selected={calendarDate} onSelect={(date) => { if (date) { setSelectedDate(date.getDate().toString()); setCalendarDate(date); } setCalendarOpen(false); }} initialFocus />
            </PopoverContent>
          </Popover>
          {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
        </div>
      )}
      {frequency === "Quarterly" && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Quarter</label>
            <div className="grid grid-cols-2 gap-2">
              {quarters.map((q) => (
                <button key={q.id} type="button" onClick={() => { setSelectedQuarter(q.label); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedQuarter === q.label ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D]" : ""}`}
                  style={selectedQuarter !== q.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{q.label}</button>
              ))}
            </div>
            {errors.selectedQuarter && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedQuarter}</p>}
          </div>
          {selectedQuarter && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <Popover open={quarterCalendarOpen} onOpenChange={setQuarterCalendarOpen}>
                <PopoverTrigger asChild>
                  <button ref={dateFieldRef} type="button" className="date-picker-trigger" data-testid="quarter-date-calendar">
                    <span className={selectedDate ? "value" : "placeholder"}>{selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'}` : "Select date"}</span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar mode="single" selected={calendarDate} onSelect={(date) => { if (date) { setSelectedDate(date.getDate().toString()); setCalendarDate(date); } setQuarterCalendarOpen(false); }} restrictedMonths={getQuarterMonths(selectedQuarter)} initialFocus />
                </PopoverContent>
              </Popover>
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
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
                <button key={h.id} type="button" onClick={() => { setSelectedHalf(h.label); setSelectedDate(""); }}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.97] ${selectedHalf === h.label ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D]" : ""}`}
                  style={selectedHalf !== h.label ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{h.label}</button>
              ))}
            </div>
            {errors.selectedHalf && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedHalf}</p>}
          </div>
          {selectedHalf && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <Popover open={halfCalendarOpen} onOpenChange={setHalfCalendarOpen}>
                <PopoverTrigger asChild>
                  <button ref={dateFieldRef} type="button" className="date-picker-trigger" data-testid="half-date-calendar">
                    <span className={selectedDate ? "value" : "placeholder"}>{selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'}` : "Select date"}</span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar mode="single" selected={calendarDate} onSelect={(date) => { if (date) { setSelectedDate(date.getDate().toString()); setCalendarDate(date); } setHalfCalendarOpen(false); }} restrictedMonths={getHalfYearMonths(selectedHalf)} initialFocus />
                </PopoverContent>
              </Popover>
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
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
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-[0.97] ${selectedMonth === m ? "border-[#FF4D4D] bg-[#FF4D4D]/10 text-[#FF4D4D]" : ""}`}
                  style={selectedMonth !== m ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}>{m.slice(0, 3)}</button>
              ))}
            </div>
            {errors.selectedMonth && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedMonth}</p>}
          </div>
          {selectedMonth && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
              <Popover open={yearlyCalendarOpen} onOpenChange={setYearlyCalendarOpen}>
                <PopoverTrigger asChild>
                  <button ref={dateFieldRef} type="button" className="date-picker-trigger" data-testid="yearly-date-calendar">
                    <span className={selectedDate ? "value" : "placeholder"}>{selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'} ${selectedMonth}` : "Select date"}</span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <Calendar mode="single" selected={calendarDate} onSelect={(date) => { if (date) { setSelectedDate(date.getDate().toString()); setCalendarDate(date); } setYearlyCalendarOpen(false); }} initialFocus />
                </PopoverContent>
              </Popover>
              {errors.selectedDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.selectedDate}</p>}
            </div>
          )}
        </div>
      )}
      {frequency === "One-Time" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Select Date</label>
          <Popover open={oneTimeCalendarOpen} onOpenChange={setOneTimeCalendarOpen}>
            <PopoverTrigger asChild>
              <button ref={oneTimeFieldRef} type="button" className="date-picker-trigger" data-testid="one-time-date-calendar">
                <span className={oneTimeDate ? "value" : "placeholder"}>{oneTimeDate ? format(new Date(oneTimeDate), "PPP") : "Select date"}</span>
                <CalendarIcon className="h-5 w-5 icon" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
              <Calendar mode="single" selected={oneTimeDate ? new Date(oneTimeDate) : undefined} onSelect={(date) => { if (date) setOneTimeDate(format(date, "yyyy-MM-dd")); setOneTimeCalendarOpen(false); }} initialFocus />
            </PopoverContent>
          </Popover>
          {errors.oneTimeDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.oneTimeDate}</p>}
        </div>
      )}
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="expense-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#FF4D4D]/10 flex items-center justify-center text-xs font-bold text-[#FF4D4D]">1</span>Details</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#FF4D4D]/10 flex items-center justify-center text-xs font-bold text-[#FF4D4D]">2</span>Amount</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#FF4D4D]/10 flex items-center justify-center text-xs font-bold text-[#FF4D4D]">3</span>Schedule</h3>{step3Content}</div>
    </div>
  );

  const ledgerContent = id ? (
    <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#FF4D4D08", border: "1px solid #FF4D4D20" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>Record Expense</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Log when you pay this expense</p>
        </div>
        <button type="button" onClick={() => setShowRecordModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FF4D4D] text-white text-xs font-medium" data-testid="record-transaction-btn">
          <PlusCircle className="h-3.5 w-3.5" /> Record
        </button>
      </div>
      <TransactionHistoryPanel key={transactionRefreshKey} entityId={id} entityType="expense"
        fetchHistory={getExpenseTransactionHistory} deleteTransaction={deleteExpenseTransaction}
        onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)} />
    </div>
  ) : null;

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Confirm Changes</h3>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Are you sure you want to update this expense?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl px-4 py-3 font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl px-4 py-3 text-white font-medium" style={{ backgroundColor: "var(--btn-primary-bg)" }}>Yes, Update</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--status-error)" }}>Delete Expense?</h3>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Are you sure you want to delete "{expenseName}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl px-4 py-3 font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl px-4 py-3 text-white font-medium" style={{ backgroundColor: "var(--status-error)" }}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
      <RecordTransactionModal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)}
        entityId={id} entityName={expenseName} expectedAmount={parseFloat(expectedAmount) || 0} type="expense"
        onSubmit={async (data) => { await recordExpenseTransaction(data); await dismissRelatedNotifications(id); setTransactionRefreshKey(k => k + 1); }} />
    </>
  );

  return (
    <WizardShell
      title={id ? "Edit Expense" : (categoryLocked ? `Add ${category} Expense` : "Add Expense")}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor="#FF4D4D"
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

export default ExpenseForm;

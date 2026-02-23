import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Check, Loader2, PlusCircle } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
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
  const [showAddSheet, setShowAddSheet] = useState(false);
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
      
      navigate("/my-expenses");
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
      navigate("/my-expenses");
    } catch (error) {
      console.error("Error deleting expense:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="expense-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors shadow-card"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
          onClick={() => navigate("/my-expenses")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-gray-900" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Expense" : "Add Expense"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Expense Name */}
            <div className="w-full">
              <label htmlFor="expenseName" className="block text-sm font-medium text-[#334155] mb-2">
                Expense Name
              </label>
              <div className="relative">
                <input
                  id="expenseName"
                  type="text"
                  value={expenseName}
                  onChange={(e) => {
                    setExpenseName(e.target.value);
                    if (errors.expenseName) {
                      setErrors(prev => ({ ...prev, expenseName: null }));
                    }
                  }}
                  onBlur={() => checkExpenseNameUnique(expenseName)}
                  placeholder="e.g., House Rent, Netflix, Groceries"
                  maxLength={50}
                  className="w-full rounded-xl border px-4 py-3 pr-10 text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    borderColor: errors.expenseName || expenseNameUniqueError 
                      ? "var(--status-error)" 
                      : isExpenseNameUnique === true && expenseName.trim() 
                        ? "var(--status-success)" 
                        : "var(--border-light)"
                  }}
                  data-testid="expense-name-input"
                />
                {/* Status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isCheckingExpenseName && (
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
                  )}
                  {!isCheckingExpenseName && isExpenseNameUnique === true && expenseName.trim() && (
                    <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />
                  )}
                </div>
              </div>
              {errors.expenseName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.expenseName}</p>}
              {!errors.expenseName && expenseNameUniqueError && (
                <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{expenseNameUniqueError}</p>
              )}
              {!errors.expenseName && !expenseNameUniqueError && isExpenseNameUnique === true && expenseName.trim() && (
                <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>
              )}
            </div>

            {/* Expense Type - Fixed/Variable Toggle */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium text-[#334155]">
                    Expense Type
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">Fixed expenses stay the same, Variable may change</p>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-[#334155] flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpenseType("Fixed")}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors min-w-[80px] ${
                      expenseType === "Fixed" 
                        ? "bg-[#334155] text-white" 
                        : "bg-[#1E293B] text-[#334155] hover:bg-[#0F172A]"
                    }`}
                    data-testid="fixed-button"
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType("Variable")}
                    className={`px-5 py-2.5 text-sm font-medium transition-colors min-w-[90px] ${
                      expenseType === "Variable" 
                        ? "bg-[#F59E0B] text-white" 
                        : "bg-[#1E293B] text-[#334155] hover:bg-[#0F172A]"
                    }`}
                    data-testid="variable-button"
                  >
                    Variable
                  </button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="w-full">
              <label htmlFor="category" className="block text-sm font-medium text-[#334155] mb-2">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="category-select"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category}</p>}
            </div>

            {/* Expected Amount */}
            <div className="w-full">
              <label htmlFor="expectedAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Expected Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
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
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="amount-in-words">
                  {numberToWords(parseFloat(expectedAmount))}
                </p>
              )}
              {errors.expectedAmount && <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>}
            </div>

            {/* Frequency */}
            <div className="w-full">
              <label htmlFor="frequency" className="block text-sm font-medium text-[#334155] mb-2">
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
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.frequency && <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>}
            </div>

            {/* Weekly - Day Selection */}
            {frequency === "Weekly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="weekly-fields">
                <label htmlFor="weeklyDay" className="block text-sm font-medium text-[#334155] mb-2">
                  Select Day
                </label>
                <select
                  id="weeklyDay"
                  ref={dayFieldRef}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="day-select"
                >
                  <option value="">Select a Day</option>
                  {weekDays.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
                {errors.selectedDay && <p className="text-sm text-red-500 mt-1">{errors.selectedDay}</p>}
              </div>
            )}

            {/* Monthly - Calendar Date Selection */}
            {frequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Day of Month
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      ref={dateFieldRef}
                      type="button"
                      className="date-picker-trigger"
                      data-testid="date-calendar-trigger"
                    >
                      <span className={selectedDate ? "value" : "placeholder"}>
                        {selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'} of every month` : "Select a date from calendar"}
                      </span>
                      <CalendarIcon className="h-5 w-5 icon" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date.getDate().toString());
                          setCalendarDate(date);
                        }
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-[#334155]/50 mt-1">Select any date - only the day number will be used for monthly recurrence</p>
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
                    ref={quarterFieldRef}
                    value={selectedQuarter}
                    onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedDate(""); }}
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
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <Popover open={quarterCalendarOpen} onOpenChange={setQuarterCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          ref={dateFieldRef}
                          type="button"
                          className="date-picker-trigger"
                          data-testid="quarter-date-calendar"
                        >
                          <span className={selectedDate ? "value" : "placeholder"}>
                            {selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'}` : "Select date from calendar"}
                          </span>
                          <CalendarIcon className="h-5 w-5 icon" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                        <Calendar
                          mode="single"
                          selected={calendarDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date.getDate().toString());
                              setCalendarDate(date);
                            }
                            setQuarterCalendarOpen(false);
                          }}
                          restrictedMonths={getQuarterMonths(selectedQuarter)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    ref={halfFieldRef}
                    value={selectedHalf}
                    onChange={(e) => { setSelectedHalf(e.target.value); setSelectedDate(""); }}
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
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date
                    </label>
                    <Popover open={halfCalendarOpen} onOpenChange={setHalfCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          ref={dateFieldRef}
                          type="button"
                          className="date-picker-trigger"
                          data-testid="half-date-calendar"
                        >
                          <span className={selectedDate ? "value" : "placeholder"}>
                            {selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'}` : "Select date from calendar"}
                          </span>
                          <CalendarIcon className="h-5 w-5 icon" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                        <Calendar
                          mode="single"
                          selected={calendarDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date.getDate().toString());
                              setCalendarDate(date);
                            }
                            setHalfCalendarOpen(false);
                          }}
                          restrictedMonths={getHalfYearMonths(selectedHalf)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                    ref={monthFieldRef}
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
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
                    <Popover open={yearlyCalendarOpen} onOpenChange={setYearlyCalendarOpen}>
                      <PopoverTrigger asChild>
                        <button
                          ref={dateFieldRef}
                          type="button"
                          className="date-picker-trigger"
                          data-testid="yearly-date-calendar"
                        >
                          <span className={selectedDate ? "value" : "placeholder"}>
                            {selectedDate ? `${selectedDate}${selectedDate === '1' ? 'st' : selectedDate === '2' ? 'nd' : selectedDate === '3' ? 'rd' : 'th'} ${selectedMonth}` : "Select date from calendar"}
                          </span>
                          <CalendarIcon className="h-5 w-5 icon" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                        <Calendar
                          mode="single"
                          selected={calendarDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date.getDate().toString());
                              setCalendarDate(date);
                            }
                            setYearlyCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* One-Time - Full Calendar Date Picker */}
            {frequency === "One-Time" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="one-time-fields">
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Select Date
                </label>
                <Popover open={oneTimeCalendarOpen} onOpenChange={setOneTimeCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      ref={oneTimeFieldRef}
                      type="button"
                      className="date-picker-trigger"
                      data-testid="one-time-date-calendar"
                    >
                      <span className={oneTimeDate ? "value" : "placeholder"}>
                        {oneTimeDate ? format(new Date(oneTimeDate), "PPP") : "Select date from calendar"}
                      </span>
                      <CalendarIcon className="h-5 w-5 icon" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                    <Calendar
                      mode="single"
                      selected={oneTimeDate ? new Date(oneTimeDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setOneTimeDate(format(date, "yyyy-MM-dd"));
                        }
                        setOneTimeCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.oneTimeDate && <p className="text-sm text-red-500 mt-1">{errors.oneTimeDate}</p>}
              </div>
            )}

            {/* Linked Account (Optional) */}
            {accounts.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#334155] mb-2">
                  Linked Account <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAccount"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="linked-account-select"
                >
                  <option value="">Select Account (Optional)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Record Transaction Section - Only shown in Edit Mode */}
            {id && (
              <div className="mt-6 p-4 rounded-xl bg-[#FF4D4D]/5 border border-[#FF4D4D]/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-[#334155]">Record Expense</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Log when you pay this expense</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D4D] text-white text-sm font-medium hover:bg-red-600 transition-colors"
                    data-testid="record-transaction-btn"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Record
                  </button>
                </div>
                
                {/* Transaction History Panel */}
                <TransactionHistoryPanel
                  key={transactionRefreshKey}
                  entityId={id}
                  entityType="expense"
                  fetchHistory={getExpenseTransactionHistory}
                  deleteTransaction={deleteExpenseTransaction}
                  onTransactionDeleted={() => setTransactionRefreshKey(k => k + 1)}
                />
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
            /* Edit Mode - Show Update and Delete side-by-side */
            <div className="flex flex-row gap-3">
              {/* Delete Button - Ghost Style (flex: 1 = 30%) */}
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
              {/* Update Button - Primary Style (flex: 2 = 70%) */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Expense"}
              </button>
            </div>
          ) : (
            /* Create Mode - Show Save Only */
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Expense"}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Confirm Changes</h3>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to update this expense?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl px-4 py-3 font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl px-4 py-3 text-white font-medium" style={{ backgroundColor: "var(--btn-primary-bg)" }}>
                Yes, Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--status-error)" }}>Delete Expense?</h3>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              Are you sure you want to delete "{expenseName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl px-4 py-3 font-medium" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl px-4 py-3 text-white font-medium" style={{ backgroundColor: "var(--status-error)" }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      <RecordTransactionModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        entityId={id}
        entityName={expenseName}
        expectedAmount={parseFloat(expectedAmount) || 0}
        type="expense"
        onSubmit={async (data) => {
          await recordExpenseTransaction(data);
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

export default ExpenseForm;

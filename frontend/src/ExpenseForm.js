import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";

const ExpenseForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  
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
  
  // Accounts for linking
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  const categoryOptions = [
    "Housing",
    "Utilities",
    "Food",
    "Transport",
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

  useEffect(() => {
    fetchAccounts();
    if (id) {
      fetchExpenseData();
    }
  }, [id]);

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
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!expenseName.trim()) {
      newErrors.expenseName = "Expense name is required";
    }

    if (!category) {
      newErrors.category = "Please select a category";
    }

    if (!expectedAmount || parseFloat(expectedAmount) <= 0) {
      newErrors.expectedAmount = "Amount must be greater than 0";
    }

    if (!frequency) {
      newErrors.frequency = "Please select a frequency";
    }

    // Date validation based on frequency
    if (frequency === "Weekly" && !selectedDay) {
      newErrors.selectedDay = "Please select a day";
    }

    if (frequency === "Monthly" && !selectedDate) {
      newErrors.selectedDate = "Please select a date";
    }

    if (frequency === "Quarterly") {
      if (!selectedQuarter) newErrors.selectedQuarter = "Please select a quarter";
      if (!selectedDate) newErrors.selectedDate = "Please select a date";
    }

    if (frequency === "Half-Yearly") {
      if (!selectedHalf) newErrors.selectedHalf = "Please select a half";
      if (!selectedDate) newErrors.selectedDate = "Please select a date";
    }

    if (frequency === "Yearly") {
      if (!selectedMonth) newErrors.selectedMonth = "Please select a month";
      if (!selectedDate) newErrors.selectedDate = "Please select a date";
    }

    if (frequency === "One-Time" && !oneTimeDate) {
      newErrors.oneTimeDate = "Please select a date";
    }

    setErrors(newErrors);
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
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/my-expenses")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Expense" : "Add Expense"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Expense Name */}
            <div className="w-full">
              <label htmlFor="expenseName" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Expense Name
              </label>
              <input
                id="expenseName"
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="e.g., House Rent, Netflix, Groceries"
                maxLength={50}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                data-testid="expense-name-input"
              />
              {errors.expenseName && <p className="text-sm text-red-500 mt-1">{errors.expenseName}</p>}
            </div>

            {/* Expense Type - Fixed/Variable Toggle */}
            <div className="w-full rounded-xl border border-[#E2E8F0] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#0B3D2E]">
                    Expense Type
                  </label>
                  <p className="text-xs text-[#0B3D2E]/60 mt-0.5">Fixed expenses stay the same, Variable may change</p>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setExpenseType("Fixed")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      expenseType === "Fixed" 
                        ? "bg-[#0B3D2E] text-white" 
                        : "bg-white text-[#0B3D2E] hover:bg-[#F8FAF9]"
                    }`}
                    data-testid="fixed-button"
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpenseType("Variable")}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      expenseType === "Variable" 
                        ? "bg-[#F59E0B] text-white" 
                        : "bg-white text-[#0B3D2E] hover:bg-[#F8FAF9]"
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
              <label htmlFor="category" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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
              <label htmlFor="expectedAmount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                Expected Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0B3D2E] font-medium">₹</span>
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
              {errors.expectedAmount && <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>}
            </div>

            {/* Frequency */}
            <div className="w-full">
              <label htmlFor="frequency" className="block text-sm font-medium text-[#0B3D2E] mb-2">
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
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.frequency && <p className="text-sm text-red-500 mt-1">{errors.frequency}</p>}
            </div>

            {/* Weekly - Day Selection */}
            {frequency === "Weekly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="weekly-fields">
                <label htmlFor="weeklyDay" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Select Day
                </label>
                <select
                  id="weeklyDay"
                  ref={dayFieldRef}
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
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

            {/* Monthly - Date Selection */}
            {frequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
                <label htmlFor="monthlyDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Select Day of Month
                </label>
                <select
                  id="monthlyDate"
                  ref={dateFieldRef}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="date-select"
                >
                  <option value="">Select a Date</option>
                  {days.map((day) => (
                    <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>
                  ))}
                </select>
                <p className="text-xs text-[#0B3D2E]/50 mt-1">E.g., 15th for 15th of every month</p>
                {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
              </div>
            )}

            {/* Quarterly Fields */}
            {frequency === "Quarterly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="quarterly-fields">
                <div className="w-full">
                  <label htmlFor="quarter" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Quarter
                  </label>
                  <select
                    id="quarter"
                    ref={quarterFieldRef}
                    value={selectedQuarter}
                    onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="quarter-select"
                  >
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => <option key={q.id} value={q.label}>{q.label}</option>)}
                  </select>
                  {errors.selectedQuarter && <p className="text-sm text-red-500 mt-1">{errors.selectedQuarter}</p>}
                </div>

                {selectedQuarter && (
                  <div className="w-full">
                    <label htmlFor="quarterDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Date
                    </label>
                    <select
                      id="quarterDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="date-select"
                    >
                      <option value="">Select a Date</option>
                      {days.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Half-Yearly Fields */}
            {frequency === "Half-Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="half-yearly-fields">
                <div className="w-full">
                  <label htmlFor="half" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Half
                  </label>
                  <select
                    id="half"
                    ref={halfFieldRef}
                    value={selectedHalf}
                    onChange={(e) => { setSelectedHalf(e.target.value); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="half-select"
                  >
                    <option value="">Select Half</option>
                    {halves.map((h) => <option key={h.id} value={h.label}>{h.label}</option>)}
                  </select>
                  {errors.selectedHalf && <p className="text-sm text-red-500 mt-1">{errors.selectedHalf}</p>}
                </div>

                {selectedHalf && (
                  <div className="w-full">
                    <label htmlFor="halfDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Date
                    </label>
                    <select
                      id="halfDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="date-select"
                    >
                      <option value="">Select a Date</option>
                      {days.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Yearly Fields */}
            {frequency === "Yearly" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300" data-testid="yearly-fields">
                <div className="w-full">
                  <label htmlFor="yearlyMonth" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                    Select Month
                  </label>
                  <select
                    id="yearlyMonth"
                    ref={monthFieldRef}
                    value={selectedMonth}
                    onChange={(e) => { setSelectedMonth(e.target.value); setSelectedDate(""); }}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                    data-testid="month-select"
                  >
                    <option value="">Select Month</option>
                    {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  {errors.selectedMonth && <p className="text-sm text-red-500 mt-1">{errors.selectedMonth}</p>}
                </div>
                
                {selectedMonth && (
                  <div className="w-full">
                    <label htmlFor="yearlyDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                      Select Date
                    </label>
                    <select
                      id="yearlyDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                      data-testid="date-select"
                    >
                      <option value="">Select a Date</option>
                      {days.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    {errors.selectedDate && <p className="text-sm text-red-500 mt-1">{errors.selectedDate}</p>}
                  </div>
                )}
              </div>
            )}

            {/* One-Time - Full Date Picker */}
            {frequency === "One-Time" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="one-time-fields">
                <label htmlFor="oneTimeDate" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Select Date
                </label>
                <label htmlFor="oneTimeDate" className="relative block cursor-pointer">
                  <input
                    id="oneTimeDate"
                    ref={oneTimeFieldRef}
                    type="date"
                    value={oneTimeDate}
                    onChange={(e) => setOneTimeDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 cursor-pointer"
                    data-testid="one-time-date-input"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                </label>
                {errors.oneTimeDate && <p className="text-sm text-red-500 mt-1">{errors.oneTimeDate}</p>}
              </div>
            )}

            {/* Linked Account (Optional) */}
            {accounts.length > 0 && (
              <div className="w-full">
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#0B3D2E] mb-2">
                  Linked Account <span className="text-[#94A3B8] font-normal">(Optional)</span>
                </label>
                <select
                  id="linkedAccount"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
                  data-testid="linked-account-select"
                >
                  <option value="">Select Account (Optional)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>
                  ))}
                </select>
              </div>
            )}

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm px-6 py-4">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-white px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Expense"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#00D09C] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#00BA89] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Expense"}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#0B3D2E] mb-3">Confirm Changes</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to update this expense?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium">
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Expense?</h3>
            <p className="text-[#0B3D2E]/70 mb-6">
              Are you sure you want to delete "{expenseName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#E2E8F0] bg-white px-4 py-3 text-[#0B3D2E] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseForm;

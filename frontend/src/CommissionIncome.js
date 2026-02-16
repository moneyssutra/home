import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Calendar, Trash2 } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const CommissionIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Refs for auto-scroll
  const dayFieldRef = useRef(null);
  const dateFieldRef = useRef(null);
  const quarterFieldRef = useRef(null);
  const halfFieldRef = useRef(null);
  const monthFieldRef = useRef(null);
  const irregularFieldRef = useRef(null);
  
  // Form fields
  const [sourceName, setSourceName] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [isVariable, setIsVariable] = useState(true); // Default: Variable
  const [frequency, setFrequency] = useState("");
  
  // Conditional date fields
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [customDate, setCustomDate] = useState("");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [existingCommission, setExistingCommission] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";
  const today = new Date().toISOString().split('T')[0];

  // Fetch data if editing
  useEffect(() => {
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
      setIsVariable(data.isVariable !== false); // Default to true if not set
      setFrequency(data.frequency || "");
      setSelectedDay(data.selectedDay || "");
      setSelectedDate(data.selectedDate || "");
      setSelectedQuarter(data.selectedQuarter || "");
      setSelectedHalf(data.selectedHalf || "");
      setSelectedMonth(data.selectedMonth || "");
      setCustomDate(data.customDate || "");
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
        } else if (frequency === "Irregular" && irregularFieldRef.current) {
          irregularFieldRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          irregularFieldRef.current.focus();
        }
      }, 100);
    }
  }, [frequency]);

  // Auto-scroll when quarter/half is selected
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

  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setExpectedAmount(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!sourceName.trim()) {
      newErrors.sourceName = "Commission source name is required";
    }

    if (!expectedAmount || parseFloat(expectedAmount) <= 0) {
      newErrors.expectedAmount = "Expected amount must be greater than 0";
    }

    if (!frequency) {
      newErrors.frequency = "Please select a frequency";
    }

    // Date validation based on frequency (Daily has no date field)
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

    if (frequency === "Irregular" && !customDate) {
      newErrors.customDate = "Please select a date";
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
        isVariable,
        frequency,
        selectedDay: selectedDay || null,
        selectedDate: selectedDate || null,
        selectedQuarter: selectedQuarter || null,
        selectedHalf: selectedHalf || null,
        selectedMonth: selectedMonth || null,
        customDate: customDate || null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/income/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/income`, payload);
      }
      
      navigate("/my-commission");
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
      navigate("/my-commission");
    } catch (error) {
      console.error("Error deleting commission:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="commission-income-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/my-income")}}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Commission Income
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Commission Source Name */}
            <div className="w-full">
              <label htmlFor="sourceName" className="block text-sm font-medium text-[#334155] mb-2">
                Commission Source Name
              </label>
              <input
                id="sourceName"
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., Real Estate Sales, Insurance Referral"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="source-name-input"
              />
              {errors.sourceName && <p className="text-sm text-red-500 mt-1">{errors.sourceName}</p>}
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
              {errors.expectedAmount && <p className="text-sm text-red-500 mt-1">{errors.expectedAmount}</p>}
            </div>

            {/* Fixed / Variable Toggle */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Commission Type
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">Is this a fixed or variable commission?</p>
                </div>
                <div className="flex rounded-lg overflow-hidden border border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setIsVariable(false)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      !isVariable 
                        ? "bg-[#334155] text-white" 
                        : "bg-[#1E293B] text-[#334155] hover:bg-[#0F172A]"
                    }`}
                    data-testid="fixed-button"
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVariable(true)}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      isVariable 
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

            {/* Monthly - Date Selection (1-31) */}
            {frequency === "Monthly" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="monthly-fields">
                <label htmlFor="monthlyDate" className="block text-sm font-medium text-[#334155] mb-2">
                  Select Date (Day of Month)
                </label>
                <select
                  id="monthlyDate"
                  ref={dateFieldRef}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                    <label htmlFor="quarterDate" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date (Day of Month)
                    </label>
                    <select
                      id="quarterDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                    <label htmlFor="halfDate" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date (Day of Month)
                    </label>
                    <select
                      id="halfDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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
                    <label htmlFor="yearlyDate" className="block text-sm font-medium text-[#334155] mb-2">
                      Select Date (Day of Month)
                    </label>
                    <select
                      id="yearlyDate"
                      ref={dateFieldRef}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
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

            {/* Irregular - Full Date Picker */}
            {frequency === "Irregular" && (
              <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300" data-testid="irregular-fields">
                <label htmlFor="irregularDate" className="block text-sm font-medium text-[#334155] mb-2">
                  Select Date
                </label>
                <label htmlFor="irregularDate" className="relative block cursor-pointer">
                  <input
                    id="irregularDate"
                    ref={irregularFieldRef}
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={today}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 cursor-pointer"
                    data-testid="irregular-date-input"
                  />
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#94A3B8] pointer-events-none" />
                </label>
                {errors.customDate && <p className="text-sm text-red-500 mt-1">{errors.customDate}</p>}
              </div>
            )}

            {errors.submit && (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{errors.submit}</div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Buttons */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-[#334155] bg-[#1E293B]/95 backdrop-blur-sm px-6 py-4 z-40">
        <div className="mx-auto max-w-[620px]">
          {id ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-[#1E293B] px-6 py-4 text-red-500 font-semibold transition-all hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                data-testid="delete-button"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Commission"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Commission"}
            </button>
          )}
        </div>
      </div>

      {/* Update Confirmation Dialog */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Confirm Changes</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to update this commission income?
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Commission?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{sourceName}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Commission Dialog */}
      {showDuplicateDialog && existingCommission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Commission Already Exists</h3>
            <p className="text-[#334155]/70 mb-6">
              A commission source with the name "{sourceName}" already exists. Would you like to edit the existing one or create a new one anyway?
            </p>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setShowDuplicateDialog(false); navigate(`/commission-income/${existingCommission.id}`); }} className="w-full rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">
                Edit Existing Commission
              </button>
              <button type="button" onClick={() => { setShowDuplicateDialog(false); performSave(); }} className="w-full rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">
                Create New Anyway
              </button>
              <button type="button" onClick={() => setShowDuplicateDialog(false)} className="w-full rounded-xl bg-[#1E293B] px-4 py-3 text-[#334155]/60 font-medium">
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

export default CommissionIncome;

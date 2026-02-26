import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Info } from "lucide-react";
import axios from "axios";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { ValidationMessage } from "@/components/ValidationMessage";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import { 
  validatePositiveAmount, 
  validateDateRange,
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const InvestmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Get pre-filled investment category from URL params
  const prefilledCategory = searchParams.get('category') || '';
  
  // Form fields
  const [investmentCategory, setInvestmentCategory] = useState(prefilledCategory);
  const [investmentMode, setInvestmentMode] = useState("");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [notes, setNotes] = useState("");
  
  // Dynamic fields based on category/mode
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [returnRate, setReturnRate] = useState("");
  const [compoundingType, setCompoundingType] = useState("Simple");
  const [compoundingFrequency, setCompoundingFrequency] = useState("");
  const [payoutFrequency, setPayoutFrequency] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [expectedMaturityValue, setExpectedMaturityValue] = useState("");
  const [lockInPeriod, setLockInPeriod] = useState("");
  const [investmentFrequency, setInvestmentFrequency] = useState("");
  const [sipSelectedDay, setSipSelectedDay] = useState("");
  const [sipSelectedDate, setSipSelectedDate] = useState("");
  const [sipSelectedQuarter, setSipSelectedQuarter] = useState("");
  const [sipSelectedHalf, setSipSelectedHalf] = useState("");
  const [sipSelectedMonth, setSipSelectedMonth] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(false);
  const [sipAmount, setSipAmount] = useState("");
  const [isLiquidAsset, setIsLiquidAsset] = useState(false);
  
  // Accounts for linking
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  
  // Calendar popover states
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [maturityCalendarOpen, setMaturityCalendarOpen] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const categoryOptions = [
    "Fixed Deposit (FD)",
    "Recurring Deposit (RD)",
    "Stocks",
    "US Stocks",
    "Mutual Fund",
    "ETF",
    "Bonds",
    "Sovereign Gold Bond (SGB)",
    "Digital Gold",
    "Digital Silver",
    "P2P Lending",
    "SWP",
    "ULIP",
    "Crypto",
    "PPF",
    "NPS",
    "Other"
  ];

  const modeOptions = [
    { value: "Income Generating", label: "Income Generating" },
    { value: "Growth Only", label: "Growth Only" },
    { value: "Growth with Maturity", label: "Growth with Maturity" }
  ];

  const compoundingFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];
  const payoutFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

  // Constants for frequency selections (same as BusinessIncome)
  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const allMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const quarters = [
    { id: "Q1", label: "Q1 (Jan-Mar)", months: ["January", "February", "March"] },
    { id: "Q2", label: "Q2 (Apr-Jun)", months: ["April", "May", "June"] },
    { id: "Q3", label: "Q3 (Jul-Sep)", months: ["July", "August", "September"] },
    { id: "Q4", label: "Q4 (Oct-Dec)", months: ["October", "November", "December"] }
  ];
  const halves = [
    { id: "H1", label: "H1 (Jan-Jun)", months: ["January", "February", "March", "April", "May", "June"] },
    { id: "H2", label: "H2 (Jul-Dec)", months: ["July", "August", "September", "October", "November", "December"] }
  ];

  // Computed values for quarter/half month selection
  const quarterMonths = useMemo(() => {
    const q = quarters.find(q => q.label === sipSelectedQuarter);
    return q ? q.months : [];
  }, [sipSelectedQuarter]);

  const halfMonths = useMemo(() => {
    const h = halves.find(h => h.label === sipSelectedHalf);
    return h ? h.months : [];
  }, [sipSelectedHalf]);

  const getMonthIndex = (monthName) => allMonths.indexOf(monthName);

  // Calculate quarterly dates preview
  const calculateQuarterlyDates = useMemo(() => {
    if (!sipSelectedMonth || !sipSelectedDate) return [];
    const monthIndex = getMonthIndex(sipSelectedMonth);
    const day = new Date(sipSelectedDate).getDate();
    const today = new Date();
    const dates = [];
    const quarterMonthIndices = [monthIndex, monthIndex + 3, monthIndex + 6, monthIndex + 9].map(m => m % 12);
    
    for (let i = 0; i < 4; i++) {
      const targetMonth = quarterMonthIndices[i];
      let targetYear = today.getFullYear();
      if (targetMonth < today.getMonth()) {
        targetYear++;
      }
      const date = new Date(targetYear, targetMonth, day);
      dates.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
    return dates;
  }, [sipSelectedMonth, sipSelectedDate]);

  // Calculate half-yearly date preview
  const calculateHalfYearlyDate = useMemo(() => {
    if (!sipSelectedMonth || !sipSelectedDate) return null;
    const monthIndex = getMonthIndex(sipSelectedMonth);
    const day = new Date(sipSelectedDate).getDate();
    const today = new Date();
    
    let nextDate = new Date(today.getFullYear(), monthIndex, day);
    if (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 6);
    }
    return nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [sipSelectedMonth, sipSelectedDate]);

  // Auto-suggest mode based on category
  useEffect(() => {
    if (!investmentMode && investmentCategory) {
      if (investmentCategory === "Sovereign Gold Bond (SGB)") {
        setInvestmentMode("Income Generating");
      } else if (["Digital Gold", "Digital Silver", "Stocks", "US Stocks", "Mutual Fund", "ETF", "Crypto"].includes(investmentCategory)) {
        setInvestmentMode("Growth Only");
      } else if (["Fixed Deposit (FD)", "Recurring Deposit (RD)", "Bonds"].includes(investmentCategory)) {
        setInvestmentMode("Growth with Maturity");
      }
    }
  }, [investmentCategory]);

  // Clear field errors in real-time when user fills data
  useEffect(() => {
    if (investmentCategory && errors.investmentCategory) {
      setErrors(prev => { const n = {...prev}; delete n.investmentCategory; return n; });
    }
  }, [investmentCategory]);
  
  useEffect(() => {
    if (investmentMode && errors.investmentMode) {
      setErrors(prev => { const n = {...prev}; delete n.investmentMode; return n; });
    }
  }, [investmentMode]);
  
  useEffect(() => {
    if (name && errors.name) {
      setErrors(prev => { const n = {...prev}; delete n.name; return n; });
    }
  }, [name]);
  
  useEffect(() => {
    if (principal && errors.principal) {
      setErrors(prev => { const n = {...prev}; delete n.principal; return n; });
    }
  }, [principal]);
  
  useEffect(() => {
    if (startDate && errors.startDate) {
      setErrors(prev => { const n = {...prev}; delete n.startDate; return n; });
    }
  }, [startDate]);
  
  useEffect(() => {
    if (maturityDate && errors.maturityDate) {
      setErrors(prev => { const n = {...prev}; delete n.maturityDate; return n; });
    }
  }, [maturityDate]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch accounts and investment data
  useEffect(() => {
    fetchAccounts();
    if (id) {
      fetchInvestmentData();
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

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/investments/${id}`);
      const data = response.data;
      
      setInvestmentCategory(data.investmentCategory || "");
      setInvestmentMode(data.investmentMode || "");
      setName(data.name || "");
      setPrincipal(data.principal?.toString() || "");
      setCurrentValue(data.currentValue?.toString() || "");
      setStartDate(data.startDate || "");
      setLinkedAccountId(data.linkedAccountId || "");
      setNotes(data.notes || "");
      setQuantity(data.quantity?.toString() || "");
      setUnitPrice(data.unitPrice?.toString() || "");
      setCurrentPrice(data.currentPrice?.toString() || "");
      setReturnRate(data.returnRate?.toString() || "");
      setCompoundingType(data.compoundingType || "Simple");
      setCompoundingFrequency(data.compoundingFrequency || "");
      setPayoutFrequency(data.payoutFrequency || "");
      setMaturityDate(data.maturityDate || "");
      setExpectedMaturityValue(data.expectedMaturityValue?.toString() || "");
      setLockInPeriod(data.lockInPeriod?.toString() || "");
      setInvestmentFrequency(data.investmentFrequency || "");
      setSipAmount(data.sipAmount?.toString() || "");
      setSipSelectedDay(data.sipSelectedDay || "");
      setSipSelectedDate(data.sipSelectedDate || "");
      setSipSelectedQuarter(data.sipSelectedQuarter || "");
      setSipSelectedHalf(data.sipSelectedHalf || "");
      setSipSelectedMonth(data.sipSelectedMonth || "");
      setAutoCreateExpense(data.autoCreateExpense || false);
      setIsLiquidAsset(data.isLiquidAsset || false);
    } catch (error) {
      console.error("Error fetching investment data:", error);
      setErrors({ submit: "Failed to load investment data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    const value = formatAmountInput(e.target.value);
    setter(value);
  };

  // Real-time validation for specific fields
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'principal':
        const principalError = validatePositiveAmount(value, "Principal amount");
        if (principalError) newErrors.principal = principalError;
        else delete newErrors.principal;
        break;
      case 'currentValue':
        if (value && parseFloat(value) < 0) {
          newErrors.currentValue = "Current value cannot be negative.";
        } else {
          delete newErrors.currentValue;
        }
        break;
      case 'maturityDate':
        if (startDate && value) {
          const dateError = validateDateRange(startDate, value, "Start Date", "Maturity Date");
          if (dateError) newErrors.maturityDate = dateError;
          else delete newErrors.maturityDate;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const validate = () => {
    const newErrors = {};

    // Investment Category validation
    if (!investmentCategory) {
      newErrors.investmentCategory = "Please select investment category.";
    }

    // Investment Mode validation
    if (!investmentMode) {
      newErrors.investmentMode = "Please select investment mode.";
    }

    // Investment Name validation
    const nameError = validateTextField(name, "Investment name", 100);
    if (nameError) newErrors.name = nameError;

    // Principal Amount validation
    const principalError = validatePositiveAmount(principal, "Principal amount");
    if (principalError) newErrors.principal = principalError;

    // Start Date validation
    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    // Maturity Date validation (if provided, must be after start date)
    if (maturityDate && startDate) {
      const dateError = validateDateRange(startDate, maturityDate, "Start Date", "Maturity Date");
      if (dateError) newErrors.maturityDate = dateError;
    }

    // Return Rate validation (if provided)
    if (returnRate && (isNaN(parseFloat(returnRate)) || parseFloat(returnRate) < 0)) {
      newErrors.returnRate = "Return rate cannot be negative.";
    }

    // SIP Amount validation (if frequency selected)
    if (investmentFrequency && investmentFrequency !== "" && sipAmount) {
      const sipError = validatePositiveAmount(sipAmount, "SIP amount");
      if (sipError) newErrors.sipAmount = sipError;
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
        investmentCategory,
        investmentMode,
        name,
        principal: parseFloat(principal),
        currentValue: currentValue ? parseFloat(currentValue) : parseFloat(principal),
        startDate,
        linkedAccountId: linkedAccountId || null,
        notes: notes || null,
        quantity: quantity ? parseFloat(quantity) : null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null,
        returnRate: returnRate ? parseFloat(returnRate) : null,
        compoundingType: compoundingType || null,
        compoundingFrequency: compoundingFrequency || null,
        payoutFrequency: payoutFrequency || null,
        maturityDate: maturityDate || null,
        expectedMaturityValue: expectedMaturityValue ? parseFloat(expectedMaturityValue) : null,
        lockInPeriod: lockInPeriod ? parseInt(lockInPeriod) : null,
        investmentFrequency: investmentFrequency || null,
        sipAmount: sipAmount ? parseFloat(sipAmount) : null,
        sipSelectedDay: sipSelectedDay || null,
        sipSelectedDate: sipSelectedDate || null,
        sipSelectedQuarter: sipSelectedQuarter || null,
        sipSelectedHalf: sipSelectedHalf || null,
        sipSelectedMonth: sipSelectedMonth || null,
        autoCreateExpense: autoCreateExpense,
        isLiquidAsset: isLiquidAsset,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/investments/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/investments`, payload);
      }
      
      navigate("/my-investments");
    } catch (error) {
      console.error("Error saving investment:", error);
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
      await axios.delete(`${backendUrl}/api/investments/${id}`);
      navigate("/my-investments");
    } catch (error) {
      console.error("Error deleting investment:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDigitalMetal = ["Digital Gold", "Digital Silver"].includes(investmentCategory);
  const isSGB = investmentCategory === "Sovereign Gold Bond (SGB)";
  const isSWP = investmentCategory === "SWP";
  const isIncomeGenerating = investmentMode === "Income Generating";
  const isGrowthWithMaturity = investmentMode === "Growth with Maturity";
  // Show frequency field for ALL categories except SGB and SWP
  const showFrequencyField = investmentCategory && !isSGB && !isSWP;

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="investment-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => {
            if (location.state?.fromExpenses) {
              // If came from expenses page, go back to that page
              navigate(location.state.fromExpenses);
            } else if (window.history.length > 2) {
              // Use browser history to go back if available
              navigate(-1);
            } else {
              navigate("/my-investments");
            }
          }}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Investment" : "Add Investment"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Investment Category */}
            <div className="w-full">
              <label htmlFor="investmentCategory" className="block text-sm font-medium text-[#334155] mb-2">
                Investment Category
              </label>
              <select
                id="investmentCategory"
                value={investmentCategory}
                onChange={(e) => { setInvestmentCategory(e.target.value); setInvestmentMode(""); }}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="category-select"
              >
                <option value="">Select Category</option>
                {categoryOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.investmentCategory && <p className="text-sm text-red-500 mt-1">{errors.investmentCategory}</p>}
            </div>

            {/* Investment Mode */}
            <div className="w-full">
              <label htmlFor="investmentMode" className="block text-sm font-medium text-[#334155] mb-2">
                Investment Mode
              </label>
              <select
                id="investmentMode"
                value={investmentMode}
                onChange={(e) => setInvestmentMode(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="mode-select"
              >
                <option value="">Select Mode</option>
                {modeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {errors.investmentMode && <p className="text-sm text-red-500 mt-1">{errors.investmentMode}</p>}
            </div>

            {/* Investment Name */}
            <div className="w-full">
              <label htmlFor="name" className="block text-sm font-medium text-[#334155] mb-2">
                Investment Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., SBI FD 2025, HDFC MF Growth"
                maxLength={100}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="name-input"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Principal / Invested Amount */}
            <div className="w-full">
              <label htmlFor="principal" className="block text-sm font-medium text-[#334155] mb-2">
                Principal / Invested Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="principal"
                  type="text"
                  value={principal}
                  onChange={handleAmountChange(setPrincipal)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="principal-input"
                />
              </div>
              {parseFloat(principal) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="principal-words">
                  {numberToWords(parseFloat(principal))}
                </p>
              )}
              {errors.principal && <p className="text-sm text-red-500 mt-1">{errors.principal}</p>}
            </div>

            {/* Start Date */}
            <div className="w-full">
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Start Date
              </label>
              <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="date-picker-trigger"
                    data-testid="start-date-input"
                  >
                    <span className={startDate ? "value" : "placeholder"}>
                      {startDate ? format(new Date(startDate), "PPP") : "Select start date"}
                    </span>
                    <CalendarIcon className="h-5 w-5 icon" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate ? new Date(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setStartDate(format(date, "yyyy-MM-dd"));
                      }
                      setStartCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.startDate && <p className="text-sm text-red-500 mt-1">{errors.startDate}</p>}
            </div>

            {/* Recurring Investment (SIP) Fields - Hidden for SGB and SWP */}
            {showFrequencyField && (
              <div className="w-full p-4 rounded-xl bg-[#F0FDF4] border border-[#10B981]/20">
                <h4 className="text-sm font-semibold text-[#334155] mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#10B981]" />
                  Recurring Investment (SIP)
                </h4>
                <div className="space-y-4">
                  <div className="w-full">
                    <label htmlFor="investmentFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                      Investment Frequency
                    </label>
                    <select
                      id="investmentFrequency"
                      value={investmentFrequency}
                      onChange={(e) => setInvestmentFrequency(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="investment-frequency-select"
                    >
                      <option value="">One-time Investment</option>
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly (SIP)</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half-Yearly">Half-Yearly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {investmentFrequency && investmentFrequency !== "" && (
                    <div className="w-full">
                      <label htmlFor="sipAmount" className="block text-sm font-medium text-[#334155] mb-2">
                        {investmentFrequency} Investment Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                        <input
                          id="sipAmount"
                          type="text"
                          value={sipAmount}
                          onChange={handleAmountChange(setSipAmount)}
                          placeholder="0"
                          className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                          data-testid="sip-amount-input"
                        />
                      </div>
                      {parseFloat(sipAmount) > 0 && (
                        <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="sip-amount-words">
                          {numberToWords(parseFloat(sipAmount))}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Date Selection based on Frequency */}
                  {investmentFrequency === "Weekly" && (
                    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-[#334155] mb-2">
                        Investment Day
                      </label>
                      <select
                        value={sipSelectedDay}
                        onChange={(e) => setSipSelectedDay(e.target.value)}
                        className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      >
                        <option value="">Select Day</option>
                        {weekDays.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Monthly - Date Picker */}
                  {investmentFrequency === "Monthly" && (
                    <div className="w-full animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-[#334155] mb-2">
                        Investment Date
                      </label>
                      <RestrictedDatePicker
                        value={sipSelectedDate}
                        onChange={(date) => setSipSelectedDate(date)}
                        placeholder="Select investment date"
                        testId="sip-date-select"
                      />
                    </div>
                  )}

                  {/* Quarterly - Quarter → Month → Date */}
                  {investmentFrequency === "Quarterly" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-[#334155] mb-2">
                          Select Quarter
                        </label>
                        <select
                          value={sipSelectedQuarter}
                          onChange={(e) => {
                            setSipSelectedQuarter(e.target.value);
                            setSipSelectedMonth("");
                            setSipSelectedDate("");
                          }}
                          className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                        >
                          <option value="">Select Quarter</option>
                          {quarters.map((q) => (
                            <option key={q.id} value={q.label}>{q.label}</option>
                          ))}
                        </select>
                      </div>

                      {sipSelectedQuarter && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-[#334155] mb-2">
                            Select Month
                          </label>
                          <select
                            value={sipSelectedMonth}
                            onChange={(e) => {
                              setSipSelectedMonth(e.target.value);
                              setSipSelectedDate("");
                            }}
                            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                          >
                            <option value="">Select Month</option>
                            {quarterMonths.map((month) => (
                              <option key={month} value={month}>{month}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {sipSelectedMonth && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-[#334155] mb-2">
                            Select Date
                          </label>
                          <RestrictedDatePicker
                            value={sipSelectedDate}
                            onChange={(date) => setSipSelectedDate(date)}
                            restrictedMonth={getMonthIndex(sipSelectedMonth)}
                            placeholder="Select date in selected month"
                            testId="sip-date-select"
                          />
                        </div>
                      )}

                      {/* Show Next Recurring Dates */}
                      {calculateQuarterlyDates.length > 0 && (
                        <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#14B8A6]/30 p-4">
                          <div className="flex items-start gap-2">
                            <CalendarIcon className="h-5 w-5 text-[#14B8A6] mt-0.5 flex-shrink-0" />
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

                  {/* Half-Yearly - Half → Month → Date */}
                  {investmentFrequency === "Half-Yearly" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-[#334155] mb-2">
                          Select Half
                        </label>
                        <select
                          value={sipSelectedHalf}
                          onChange={(e) => {
                            setSipSelectedHalf(e.target.value);
                            setSipSelectedMonth("");
                            setSipSelectedDate("");
                          }}
                          className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                        >
                          <option value="">Select Half</option>
                          {halves.map((h) => (
                            <option key={h.id} value={h.label}>{h.label}</option>
                          ))}
                        </select>
                      </div>

                      {sipSelectedHalf && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-[#334155] mb-2">
                            Select Month
                          </label>
                          <select
                            value={sipSelectedMonth}
                            onChange={(e) => {
                              setSipSelectedMonth(e.target.value);
                              setSipSelectedDate("");
                            }}
                            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                          >
                            <option value="">Select Month</option>
                            {halfMonths.map((month) => (
                              <option key={month} value={month}>{month}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {sipSelectedMonth && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-[#334155] mb-2">
                            Select Date
                          </label>
                          <RestrictedDatePicker
                            value={sipSelectedDate}
                            onChange={(date) => setSipSelectedDate(date)}
                            restrictedMonth={getMonthIndex(sipSelectedMonth)}
                            placeholder="Select date in selected month"
                            testId="sip-date-select"
                          />
                        </div>
                      )}

                      {/* Show Next Recurring Date */}
                      {calculateHalfYearlyDate && (
                        <div className="w-full rounded-xl bg-[#E8F8F4] border border-[#14B8A6]/30 p-4">
                          <div className="flex items-start gap-2">
                            <CalendarIcon className="h-5 w-5 text-[#14B8A6] mt-0.5 flex-shrink-0" />
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

                  {/* Yearly - Month → Date */}
                  {investmentFrequency === "Yearly" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="w-full">
                        <label className="block text-sm font-medium text-[#334155] mb-2">
                          Select Month
                        </label>
                        <select
                          value={sipSelectedMonth}
                          onChange={(e) => setSipSelectedMonth(e.target.value)}
                          className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                        >
                          <option value="">Select Month</option>
                          {allMonths.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      {sipSelectedMonth && (
                        <div className="w-full">
                          <label className="block text-sm font-medium text-[#334155] mb-2">
                            Select Date
                          </label>
                          <RestrictedDatePicker
                            value={sipSelectedDate}
                            onChange={(date) => setSipSelectedDate(date)}
                            restrictedMonth={getMonthIndex(sipSelectedMonth)}
                            placeholder="Select date in selected month"
                            testId="sip-date-select"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Auto Create SIP Expense Toggle - Show when frequency is selected and is not One-Time */}
                  {investmentFrequency && investmentFrequency !== "" && (
                    <div className="w-full p-4 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/30">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#334155]">Auto Create SIP Expense</p>
                          <p className="text-xs text-[#334155]/60 mt-0.5">
                            Creates recurring expense entry linked to this investment
                            {!sipAmount || parseFloat(sipAmount) <= 0 ? (
                              <span className="text-amber-600 block mt-1">Enter SIP amount above to enable</span>
                            ) : null}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => sipAmount && parseFloat(sipAmount) > 0 && setAutoCreateExpense(!autoCreateExpense)}
                          disabled={!sipAmount || parseFloat(sipAmount) <= 0}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            autoCreateExpense && sipAmount && parseFloat(sipAmount) > 0 ? "bg-[#10B981]" : "bg-gray-300"
                          } ${!sipAmount || parseFloat(sipAmount) <= 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                          data-testid="auto-expense-toggle"
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              autoCreateExpense && sipAmount && parseFloat(sipAmount) > 0 ? "translate-x-6" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Digital Gold/Silver Specific Fields */}
            {isDigitalMetal && (
              <>
                <div className="w-full">
                  <label htmlFor="quantity" className="block text-sm font-medium text-[#334155] mb-2">
                    Quantity (grams)
                  </label>
                  <input
                    id="quantity"
                    type="text"
                    value={quantity}
                    onChange={handleAmountChange(setQuantity)}
                    placeholder="e.g., 10.5"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="quantity-input"
                  />
                </div>
                <div className="w-full">
                  <label htmlFor="unitPrice" className="block text-sm font-medium text-[#334155] mb-2">
                    Purchase Price per gram
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="unitPrice"
                      type="text"
                      value={unitPrice}
                      onChange={handleAmountChange(setUnitPrice)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="unit-price-input"
                    />
                  </div>
                </div>
              </>
            )}

            {/* SGB Specific Fields */}
            {isSGB && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                <Info className="h-4 w-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#92400E]">
                  SGBs pay 2.5% interest semi-annually and have an 8-year maturity period.
                </p>
              </div>
            )}

            {/* Income Generating Mode Fields */}
            {isIncomeGenerating && (
              <>
                <div className="w-full">
                  <label htmlFor="returnRate" className="block text-sm font-medium text-[#334155] mb-2">
                    Return Rate (% per annum)
                  </label>
                  <div className="relative">
                    <input
                      id="returnRate"
                      type="text"
                      value={returnRate}
                      onChange={handleAmountChange(setReturnRate)}
                      placeholder="e.g., 7.5"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 pr-10 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="return-rate-input"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#334155]/60">%</span>
                  </div>
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">Interest Type</label>
                  <div className="flex rounded-lg overflow-hidden border border-[#334155]">
                    <button
                      type="button"
                      onClick={() => setCompoundingType("Simple")}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        compoundingType === "Simple" ? "bg-[#334155] text-white" : "bg-[#1E293B] text-[#334155]"
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompoundingType("Compound")}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                        compoundingType === "Compound" ? "bg-[#334155] text-white" : "bg-[#1E293B] text-[#334155]"
                      }`}
                    >
                      Compound
                    </button>
                  </div>
                </div>

                {compoundingType === "Compound" && (
                  <div className="w-full">
                    <label htmlFor="compoundingFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                      Compounding Frequency
                    </label>
                    <select
                      id="compoundingFrequency"
                      value={compoundingFrequency}
                      onChange={(e) => setCompoundingFrequency(e.target.value)}
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    >
                      <option value="">Select Frequency</option>
                      {compoundingFrequencyOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="w-full">
                  <label htmlFor="payoutFrequency" className="block text-sm font-medium text-[#334155] mb-2">
                    Payout Frequency
                  </label>
                  <select
                    id="payoutFrequency"
                    value={payoutFrequency}
                    onChange={(e) => setPayoutFrequency(e.target.value)}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  >
                    <option value="">Select Frequency</option>
                    {payoutFrequencyOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Growth with Maturity Mode Fields */}
            {isGrowthWithMaturity && (
              <>
                <div className="w-full">
                  <label htmlFor="lockInPeriod" className="block text-sm font-medium text-[#334155] mb-2">
                    Lock-in Period (months) <span className="text-[#94A3B8] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="lockInPeriod"
                    type="text"
                    value={lockInPeriod}
                    onChange={handleAmountChange(setLockInPeriod)}
                    placeholder="e.g., 36"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="lock-in-input"
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Maturity Date
                  </label>
                  <Popover open={maturityCalendarOpen} onOpenChange={setMaturityCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="date-picker-trigger"
                        data-testid="maturity-date-input"
                      >
                        <span className={maturityDate ? "value" : "placeholder"}>
                          {maturityDate ? format(new Date(maturityDate), "PPP") : "Select maturity date"}
                        </span>
                        <CalendarIcon className="h-5 w-5 icon" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={maturityDate ? new Date(maturityDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setMaturityDate(format(date, "yyyy-MM-dd"));
                          }
                          setMaturityCalendarOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="w-full">
                  <label htmlFor="expectedMaturityValue" className="block text-sm font-medium text-[#334155] mb-2">
                    Expected Maturity Value
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="expectedMaturityValue"
                      type="text"
                      value={expectedMaturityValue}
                      onChange={handleAmountChange(setExpectedMaturityValue)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="maturity-value-input"
                    />
                  </div>
                  {parseFloat(expectedMaturityValue) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="maturity-value-words">
                      {numberToWords(parseFloat(expectedMaturityValue))}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Current Value */}
            <div className="w-full">
              <label htmlFor="currentValue" className="block text-sm font-medium text-[#334155] mb-2">
                Current Value <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                <input
                  id="currentValue"
                  type="text"
                  value={currentValue}
                  onChange={handleAmountChange(setCurrentValue)}
                  placeholder="Defaults to principal if empty"
                  className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="current-value-input"
                />
              </div>
              {parseFloat(currentValue) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="current-value-words">
                  {numberToWords(parseFloat(currentValue))}
                </p>
              )}
              <p className="text-xs text-[#334155]/60 mt-1">This feeds into your Net Worth calculation</p>
            </div>

            {/* Linked Account */}
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
                  <option value="">Select Account</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="w-full">
              <label htmlFor="notes" className="block text-sm font-medium text-[#334155] mb-2">
                Notes <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 resize-none"
                data-testid="notes-input"
              />
            </div>

            {/* Consider as Liquid/Emergency Fund */}
            <div className="w-full p-4 rounded-xl border border-[#334155] bg-[#1E293B]/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label htmlFor="isLiquidAsset" className="block text-sm font-medium text-[#334155]">
                    Consider as Emergency Fund
                  </label>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Include this investment in your liquid/emergency fund calculation for AI insights
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLiquidAsset(!isLiquidAsset)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:ring-offset-2 ${
                    isLiquidAsset ? 'bg-[#14B8A6]' : 'bg-[#334155]'
                  }`}
                  data-testid="liquid-asset-toggle"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isLiquidAsset ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {isLiquidAsset && (
                <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-[#14B8A6]/10 border border-[#14B8A6]/20">
                  <Info className="h-4 w-4 text-[#14B8A6] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#0D9488]">
                    This amount will be added to your emergency fund for AI Smart Insights. FDs/RDs are automatically considered.
                  </p>
                </div>
              )}
            </div>

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
            <div className="flex flex-row gap-3">
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
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-[2] h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
                data-testid="update-button"
              >
                {isSubmitting ? "Updating..." : "Update Investment"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-[#00D09C] text-white text-sm font-semibold transition-all hover:bg-[#00B88A] active:scale-[0.98] disabled:opacity-50 shadow-sm"
              data-testid="save-button"
            >
              {isSubmitting ? "Saving..." : "Save Investment"}
            </button>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-[#334155] mb-3">Confirm Changes</h3>
            <p className="text-[#334155]/70 mb-6">Are you sure you want to update this investment?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#14B8A6] px-4 py-3 text-white font-medium">Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-[#1E293B] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Investment?</h3>
            <p className="text-[#334155]/70 mb-6">Are you sure you want to delete "{name}"? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border-2 border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] font-medium">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Yes, Delete</button>
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

export default InvestmentForm;

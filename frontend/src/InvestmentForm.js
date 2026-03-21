import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Info } from "lucide-react";
import axios from "axios";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { ValidationMessage } from "@/components/ValidationMessage";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
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
  
  const prefilledCategory = searchParams.get('category') || '';
  const isCategoryLocked = !!prefilledCategory && !id;
  
  // Form fields
  const [investmentCategory, setInvestmentCategory] = useState(prefilledCategory);
  const [investmentMode, setInvestmentMode] = useState("");
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [notes, setNotes] = useState("");
  
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
  
  // Loan Given fields
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [interestType, setInterestType] = useState("none");
  const [agreedReturnAmount, setAgreedReturnAmount] = useState("");
  const [repaymentType, setRepaymentType] = useState("flexible");
  const [repaymentFrequency, setRepaymentFrequency] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [numberOfInstallments, setNumberOfInstallments] = useState("");
  const [paymentDay, setPaymentDay] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueDateCalendarOpen, setDueDateCalendarOpen] = useState(false);
  
  const [accounts, setAccounts] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [maturityCalendarOpen, setMaturityCalendarOpen] = useState(false);

  // ─── WIZARD STATE ───
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const categoryOptions = [
    "Fixed Deposit (FD)", "Recurring Deposit (RD)", "Stocks", "US Stocks",
    "Mutual Fund", "ETF", "Bonds", "Sovereign Gold Bond (SGB)",
    "Digital Gold", "Digital Silver", "P2P Lending", "SWP", "ULIP",
    "Crypto", "PPF", "EPF", "NPS", "Loan Given", "Other"
  ];

  const modeOptions = [
    { value: "Income Generating", label: "Income Generating" },
    { value: "Growth Only", label: "Growth Only" },
    { value: "Growth with Maturity", label: "Growth with Maturity" }
  ];

  const compoundingFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];
  const payoutFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];
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

  const quarterMonths = useMemo(() => {
    const q = quarters.find(q => q.label === sipSelectedQuarter);
    return q ? q.months : [];
  }, [sipSelectedQuarter]);

  const halfMonths = useMemo(() => {
    const h = halves.find(h => h.label === sipSelectedHalf);
    return h ? h.months : [];
  }, [sipSelectedHalf]);

  const getMonthIndex = (monthName) => allMonths.indexOf(monthName);

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
      if (targetMonth < today.getMonth()) targetYear++;
      const date = new Date(targetYear, targetMonth, day);
      dates.push(date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
    }
    return dates;
  }, [sipSelectedMonth, sipSelectedDate]);

  const calculateHalfYearlyDate = useMemo(() => {
    if (!sipSelectedMonth || !sipSelectedDate) return null;
    const monthIndex = getMonthIndex(sipSelectedMonth);
    const day = new Date(sipSelectedDate).getDate();
    const today = new Date();
    let nextDate = new Date(today.getFullYear(), monthIndex, day);
    if (nextDate <= today) nextDate.setMonth(nextDate.getMonth() + 6);
    return nextDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [sipSelectedMonth, sipSelectedDate]);

  // Auto-suggest mode based on category
  useEffect(() => {
    if (!investmentMode && investmentCategory) {
      if (investmentCategory === "Sovereign Gold Bond (SGB)") setInvestmentMode("Income Generating");
      else if (["Digital Gold", "Digital Silver", "Stocks", "US Stocks", "Mutual Fund", "ETF", "Crypto"].includes(investmentCategory)) setInvestmentMode("Growth Only");
      else if (["Fixed Deposit (FD)", "Recurring Deposit (RD)", "Bonds"].includes(investmentCategory)) setInvestmentMode("Growth with Maturity");
      else if (investmentCategory === "Loan Given") setInvestmentMode("Fixed");
    }
  }, [investmentCategory]);

  // Clear field errors in real-time
  useEffect(() => { if (investmentCategory && errors.investmentCategory) setErrors(prev => { const n = {...prev}; delete n.investmentCategory; return n; }); }, [investmentCategory]);
  useEffect(() => { if (investmentMode && errors.investmentMode) setErrors(prev => { const n = {...prev}; delete n.investmentMode; return n; }); }, [investmentMode]);
  useEffect(() => {
    if (investmentFrequency && investmentFrequency !== "" && sipAmount && parseFloat(sipAmount) > 0) setAutoCreateExpense(true);
  }, [investmentFrequency, sipAmount]);
  useEffect(() => { if (name && errors.name) setErrors(prev => { const n = {...prev}; delete n.name; return n; }); }, [name]);
  useEffect(() => { if (principal && errors.principal) setErrors(prev => { const n = {...prev}; delete n.principal; return n; }); }, [principal]);
  useEffect(() => { if (startDate && errors.startDate) setErrors(prev => { const n = {...prev}; delete n.startDate; return n; }); }, [startDate]);
  useEffect(() => { if (maturityDate && errors.maturityDate) setErrors(prev => { const n = {...prev}; delete n.maturityDate; return n; }); }, [maturityDate]);

  useEffect(() => {
    if (investmentCategory === "Loan Given") {
      if (interestType === "none") setInvestmentMode("Fixed");
      else if (repaymentType === "fixed") setInvestmentMode("Income Generating");
      else setInvestmentMode("Growth with Maturity");
    }
  }, [interestType, repaymentType, investmentCategory]);

  useEffect(() => {
    if (investmentCategory === "Loan Given" && repaymentType === "fixed") {
      const totalReturn = agreedReturnAmount ? parseFloat(agreedReturnAmount) : (parseFloat(principal) || 0);
      if (totalReturn > 0) {
        if (numberOfInstallments && !installmentAmount) {
          const num = parseInt(numberOfInstallments);
          if (num > 0) setInstallmentAmount(String(Math.ceil(totalReturn / num)));
        } else if (installmentAmount && !numberOfInstallments) {
          const amt = parseFloat(installmentAmount);
          if (amt > 0) setNumberOfInstallments(String(Math.ceil(totalReturn / amt)));
        }
      }
    }
  }, [investmentCategory, repaymentType, principal, agreedReturnAmount]);

  useEffect(() => {
    if (investmentCategory === "Loan Given" && repaymentType === "fixed" && startDate && numberOfInstallments && repaymentFrequency) {
      try {
        const num = parseInt(numberOfInstallments);
        if (num > 0) {
          const start = new Date(startDate + "T00:00:00");
          let endDate = new Date(start);
          const freqMonths = { "Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Semi-Annually": 6, "Yearly": 12 };
          if (freqMonths[repaymentFrequency]) endDate.setMonth(endDate.getMonth() + freqMonths[repaymentFrequency] * num);
          else if (repaymentFrequency === "Weekly") endDate.setDate(endDate.getDate() + 7 * num);
          else if (repaymentFrequency === "Daily") endDate.setDate(endDate.getDate() + num);
          setDueDate(endDate.toISOString().split('T')[0]);
        }
      } catch(e) {}
    }
  }, [investmentCategory, repaymentType, startDate, numberOfInstallments, repaymentFrequency]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const checkDuplicate = async () => {
      if (!name || name.length < 2 || id) { setDuplicateWarning(""); return; }
      try {
        const res = await axios.get(`${backendUrl}/api/income/list/summary`);
        const existing = res.data.find(inc => inc.name && name && inc.name.toLowerCase().includes(name.toLowerCase()) && ["Interest", "Dividend"].includes(inc.type));
        if (existing) setDuplicateWarning(`"${existing.name}" (${existing.type}) is already linked as income. Adding may create a duplicate.`);
        else setDuplicateWarning("");
      } catch (e) {}
    };
    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [name, id, backendUrl]);

  useEffect(() => { fetchAccounts(); if (id) fetchInvestmentData(); }, [id]);

  const fetchAccounts = async () => {
    try { const r = await axios.get(`${backendUrl}/api/accounts`); setAccounts(r.data); } catch (e) { console.error("Error fetching accounts:", e); }
  };

  const fetchInvestmentData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/investments/${id}`);
      const data = response.data;
      setInvestmentCategory(data.investmentCategory || ""); setInvestmentMode(data.investmentMode || "");
      setName(data.name || ""); setPrincipal(data.principal?.toString() || "");
      setCurrentValue(data.currentValue?.toString() || ""); setStartDate(data.startDate || "");
      setLinkedAccountId(data.linkedAccountId || ""); setNotes(data.notes || "");
      setQuantity(data.quantity?.toString() || ""); setUnitPrice(data.unitPrice?.toString() || "");
      setCurrentPrice(data.currentPrice?.toString() || ""); setReturnRate(data.returnRate?.toString() || "");
      setCompoundingType(data.compoundingType || "Simple"); setCompoundingFrequency(data.compoundingFrequency || "");
      setPayoutFrequency(data.payoutFrequency || ""); setMaturityDate(data.maturityDate || "");
      setExpectedMaturityValue(data.expectedMaturityValue?.toString() || ""); setLockInPeriod(data.lockInPeriod?.toString() || "");
      setInvestmentFrequency(data.investmentFrequency || ""); setSipAmount(data.sipAmount?.toString() || "");
      setSipSelectedDay(data.sipSelectedDay || ""); setSipSelectedDate(data.sipSelectedDate || "");
      setSipSelectedQuarter(data.sipSelectedQuarter || ""); setSipSelectedHalf(data.sipSelectedHalf || "");
      setSipSelectedMonth(data.sipSelectedMonth || ""); setAutoCreateExpense(data.autoCreateExpense || false);
      setIsLiquidAsset(data.isLiquidAsset || false);
      setBorrowerName(data.borrowerName || ""); setBorrowerContact(data.borrowerContact || "");
      setInterestType(data.interestType || "none"); setAgreedReturnAmount(data.agreedReturnAmount?.toString() || "");
      setRepaymentType(data.repaymentType || "flexible"); setRepaymentFrequency(data.repaymentFrequency || "");
      setInstallmentAmount(data.installmentAmount?.toString() || ""); setNumberOfInstallments(data.numberOfInstallments?.toString() || "");
      setPaymentDay(data.paymentDay || ""); setDueDate(data.dueDate || "");
    } catch (error) { console.error("Error fetching investment data:", error); setErrors({ submit: "Failed to load investment data" }); }
    finally { setLoading(false); }
  };

  const handleAmountChange = (setter) => (e) => { setter(formatAmountInput(e.target.value)); };

  const isDigitalMetal = ["Digital Gold", "Digital Silver"].includes(investmentCategory);
  const isSGB = investmentCategory === "Sovereign Gold Bond (SGB)";
  const isSWP = investmentCategory === "SWP";
  const isLoanGiven = investmentCategory === "Loan Given";
  const isIncomeGenerating = investmentMode === "Income Generating";
  const isGrowthWithMaturity = investmentMode === "Growth with Maturity";
  const showFrequencyField = investmentCategory && !isSGB && !isSWP && !isLoanGiven;

  // ─── PER-STEP VALIDATION ───
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!investmentCategory) newErrors.investmentCategory = "Please select investment category.";
      if (!isLoanGiven && !investmentMode) newErrors.investmentMode = "Please select investment mode.";
    }
    if (s === 2) {
      const nameError = validateTextField(name, "Investment name", 100);
      if (nameError) newErrors.name = nameError;
      if (isLoanGiven && (!borrowerName || !borrowerName.trim())) newErrors.borrowerName = "Borrower name is required.";
    }
    if (s === 3) {
      if (investmentFrequency && investmentFrequency !== "") {
        if (principal !== "" && principal !== null && principal !== undefined) {
          const val = parseFloat(principal);
          if (isNaN(val) || val < 0) newErrors.principal = "Principal amount cannot be negative.";
        }
      } else if (!isLoanGiven) {
        const principalError = validatePositiveAmount(principal, "Principal amount");
        if (principalError) newErrors.principal = principalError;
      }
      if (isLoanGiven) {
        const principalError = validatePositiveAmount(principal, "Amount lent");
        if (principalError) newErrors.principal = principalError;
      }
      if (!startDate) newErrors.startDate = "Start date is required.";
      if (maturityDate && startDate) {
        const dateError = validateDateRange(startDate, maturityDate, "Start Date", "Maturity Date");
        if (dateError) newErrors.maturityDate = dateError;
      }
      if (returnRate && (isNaN(parseFloat(returnRate)) || parseFloat(returnRate) < 0)) newErrors.returnRate = "Return rate cannot be negative.";
      if (investmentFrequency && investmentFrequency !== "" && sipAmount) {
        const sipError = validatePositiveAmount(sipAmount, "SIP amount");
        if (sipError) newErrors.sipAmount = sipError;
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = () => {
    const newErrors = {};
    if (!investmentCategory) newErrors.investmentCategory = "Please select investment category.";
    if (!investmentMode) newErrors.investmentMode = "Please select investment mode.";
    const nameError = validateTextField(name, "Investment name", 100);
    if (nameError) newErrors.name = nameError;
    if (investmentFrequency && investmentFrequency !== "") {
      if (principal !== "" && parseFloat(principal) < 0) newErrors.principal = "Principal amount cannot be negative.";
    } else if (!isLoanGiven) {
      const principalError = validatePositiveAmount(principal, "Principal amount");
      if (principalError) newErrors.principal = principalError;
    }
    if (isLoanGiven) {
      const principalError = validatePositiveAmount(principal, "Amount lent");
      if (principalError) newErrors.principal = principalError;
      if (!borrowerName || !borrowerName.trim()) newErrors.borrowerName = "Borrower name is required.";
    }
    if (!startDate) newErrors.startDate = "Start date is required.";
    if (maturityDate && startDate) {
      const dateError = validateDateRange(startDate, maturityDate, "Start Date", "Maturity Date");
      if (dateError) newErrors.maturityDate = dateError;
    }
    if (returnRate && (isNaN(parseFloat(returnRate)) || parseFloat(returnRate) < 0)) newErrors.returnRate = "Return rate cannot be negative.";
    if (investmentFrequency && investmentFrequency !== "" && sipAmount) {
      const sipError = validatePositiveAmount(sipAmount, "SIP amount");
      if (sipError) newErrors.sipAmount = sipError;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const handleSave = async () => {
    if (!validate()) return;
    if (id) { setShowUpdateConfirm(true); return; }
    await performSave();
  };

  const performSave = async () => {
    setIsSubmitting(true); setShowUpdateConfirm(false);
    try {
      const payload = {
        investmentCategory, investmentMode, name,
        principal: principal ? parseFloat(principal) : 0,
        currentValue: currentValue ? parseFloat(currentValue) : (principal ? parseFloat(principal) : 0),
        startDate, linkedAccountId: linkedAccountId || null, notes: notes || null,
        quantity: quantity ? parseFloat(quantity) : null, unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        currentPrice: currentPrice ? parseFloat(currentPrice) : null, returnRate: returnRate ? parseFloat(returnRate) : null,
        compoundingType: compoundingType || null, compoundingFrequency: compoundingFrequency || null,
        payoutFrequency: payoutFrequency || null, maturityDate: maturityDate || null,
        expectedMaturityValue: expectedMaturityValue ? parseFloat(expectedMaturityValue) : null,
        lockInPeriod: lockInPeriod ? parseInt(lockInPeriod) : null,
        investmentFrequency: investmentFrequency || null, sipAmount: sipAmount ? parseFloat(sipAmount) : null,
        sipSelectedDay: sipSelectedDay || null, sipSelectedDate: sipSelectedDate || null,
        sipSelectedQuarter: sipSelectedQuarter || null, sipSelectedHalf: sipSelectedHalf || null,
        sipSelectedMonth: sipSelectedMonth || null, autoCreateExpense, isLiquidAsset,
        ...(investmentCategory === "Loan Given" && {
          borrowerName: borrowerName || null, borrowerContact: borrowerContact || null,
          interestType: interestType || "none",
          agreedReturnAmount: agreedReturnAmount ? parseFloat(agreedReturnAmount) : null,
          repaymentType: repaymentType || "flexible",
          repaymentFrequency: repaymentType === "fixed" ? (repaymentFrequency || null) : null,
          installmentAmount: repaymentType === "fixed" && installmentAmount ? parseFloat(installmentAmount) : null,
          numberOfInstallments: repaymentType === "fixed" && numberOfInstallments ? parseInt(numberOfInstallments) : null,
          paymentDay: paymentDay || null, dueDate: dueDate || null,
        }),
      };
      if (id) await axios.put(`${backendUrl}/api/investments/${id}`, payload);
      else await axios.post(`${backendUrl}/api/investments`, payload);
      fireConfetti();
      setTimeout(() => navigate("/my-investments"), 400);
    } catch (error) { console.error("Error saving investment:", error); setErrors({ submit: "Failed to save. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true); setShowDeleteConfirm(false);
    try {
      await axios.delete(`${backendUrl}/api/investments/${id}`);
      const { mutate: globalMutate } = await import("swr");
      globalMutate(key => typeof key === 'string' && key.includes('/api/investments'), undefined, { revalidate: true });
      globalMutate(key => typeof key === 'string' && key.includes('/api/income'), undefined, { revalidate: true });
      globalMutate(key => typeof key === 'string' && key.includes('/api/dashboard'), undefined, { revalidate: true });
      navigate("/my-investments");
    } catch (error) { console.error("Error deleting investment:", error); setErrors({ submit: "Failed to delete. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  // ─── SHARED INPUT STYLES ───
  const inputCls = "w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20";
  const inputStyle = (err) => ({ backgroundColor: "var(--bg-subtle)", borderColor: err ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" });
  const labelCls = "block text-sm font-medium mb-2";
  const labelStyle = { color: "var(--text-primary)" };
  const mutedStyle = { color: "var(--text-muted)" };

  // ─── STEP 1: Category & Mode ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-category">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>What type of investment?</p>
        <p className="text-xs mt-1" style={mutedStyle}>Select category and investment mode</p>
      </div>
      {!isCategoryLocked && (
        <div>
          <label className={labelCls} style={labelStyle}>Investment Category</label>
          <select value={investmentCategory} onChange={(e) => { setInvestmentCategory(e.target.value); setInvestmentMode(""); }}
            className={inputCls} style={inputStyle(errors.investmentCategory)} data-testid="category-select">
            <option value="">Select Category</option>
            {categoryOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {errors.investmentCategory && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.investmentCategory}</p>}
        </div>
      )}
      {!isLoanGiven && (
        <div>
          <label className={labelCls} style={labelStyle}>Investment Mode</label>
          <select value={investmentMode} onChange={(e) => setInvestmentMode(e.target.value)}
            className={inputCls} style={inputStyle(errors.investmentMode)} data-testid="mode-select">
            <option value="">Select Mode</option>
            {modeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          {errors.investmentMode && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.investmentMode}</p>}
        </div>
      )}
      {isLoanGiven && (
        <div>
          <label className={labelCls} style={labelStyle}>Investment Mode</label>
          <select value={investmentMode} onChange={(e) => setInvestmentMode(e.target.value)}
            className={inputCls} style={inputStyle(errors.investmentMode)} data-testid="loan-mode-select">
            <option value="">Select Mode</option>
            <option value="Fixed">Fixed (No Interest)</option>
            <option value="Growth Only">Growth Only</option>
            <option value="Income Generating">Income Generating</option>
            <option value="Growth with Maturity">Growth with Maturity</option>
          </select>
          <p className="text-xs mt-1.5" style={mutedStyle}>
            {investmentMode === "Fixed" && "Principal returned as-is, no interest applied"}
            {investmentMode === "Growth Only" && "Value may appreciate over time"}
            {investmentMode === "Income Generating" && "Regular repayments / interest income expected"}
            {investmentMode === "Growth with Maturity" && "Interest accumulates, lump sum return at maturity"}
          </p>
        </div>
      )}
    </div>
  );

  // ─── STEP 2: Name & Details ───
  const step2Content = (
    <div className="space-y-6" data-testid="step-2-name">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>{isLoanGiven ? "Loan Details" : "Investment Details"}</p>
        <p className="text-xs mt-1" style={mutedStyle}>{isLoanGiven ? "Tell us about the loan" : "Name and specifics"}</p>
      </div>
      {/* Investment Name */}
      <div>
        <label className={labelCls} style={labelStyle}>{isLoanGiven ? "Loan Label / Reference Name" : "Investment Name"}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={isLoanGiven ? "e.g., Loan to Rahul" : "e.g., SBI FD 2025"} maxLength={100}
          className={inputCls} style={inputStyle(errors.name)} data-testid="name-input" />
        {errors.name && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.name}</p>}
        {duplicateWarning && (
          <div className="flex items-start gap-2 mt-2 p-2.5 rounded-lg" style={{ backgroundColor: "#F59E0B15", border: "1px solid #F59E0B30" }} data-testid="duplicate-income-warning">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
            <p className="text-xs font-medium" style={{ color: "#F59E0B" }}>{duplicateWarning}</p>
          </div>
        )}
      </div>
      {/* Loan Given specific fields */}
      {isLoanGiven && (
        <div className="space-y-4 p-4 rounded-xl" style={{ backgroundColor: "#FFF7ED", border: "1px solid rgba(245,158,11,0.2)" }} data-testid="loan-given-section">
          <h4 className="text-sm font-semibold flex items-center gap-2" style={labelStyle}>
            <Info className="h-4 w-4" style={{ color: "#F59E0B" }} /> Loan Details
          </h4>
          <p className="text-xs" style={mutedStyle}>Recovery depends on borrower reliability.</p>
          <div>
            <label className={labelCls} style={labelStyle}>Borrower Name *</label>
            <input type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="Who did you lend to?" className={inputCls} style={inputStyle(errors.borrowerName)} data-testid="borrower-name-input" />
            {errors.borrowerName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.borrowerName}</p>}
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Borrower Contact</label>
            <input type="text" value={borrowerContact} onChange={(e) => setBorrowerContact(e.target.value)}
              placeholder="Phone or email (optional)" className={inputCls} style={inputStyle()} data-testid="borrower-contact-input" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Interest Type</label>
            <div className="grid grid-cols-2 gap-3">
              {[{ val: "none", label: "No Interest" }, { val: "simple", label: "With Interest" }].map((opt) => (
                <button key={opt.val} type="button" onClick={() => setInterestType(opt.val)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${interestType === opt.val ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]" : ""}`}
                  style={interestType !== opt.val ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                  data-testid={`interest-type-${opt.val}`}>{opt.label}</button>
              ))}
            </div>
          </div>
          {interestType !== "none" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} style={labelStyle}>Interest Rate (% per year)</label>
                <input type="text" value={returnRate} onChange={handleAmountChange(setReturnRate)} placeholder="e.g., 12"
                  className={inputCls} style={inputStyle()} data-testid="interest-rate-input" />
              </div>
              <div>
                <label className={labelCls} style={labelStyle}>OR Total Agreed Return Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
                  <input type="text" value={agreedReturnAmount} onChange={handleAmountChange(setAgreedReturnAmount)} placeholder="Total amount to be returned"
                    className={`${inputCls} pl-10`} style={inputStyle()} data-testid="agreed-return-input" />
                </div>
              </div>
            </div>
          )}
          <div>
            <label className={labelCls} style={labelStyle}>Repayment Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ val: "lump_sum", label: "Lump Sum" }, { val: "fixed", label: "Fixed EMI" }, { val: "flexible", label: "Flexible" }].map((opt) => (
                <button key={opt.val} type="button" onClick={() => setRepaymentType(opt.val)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${repaymentType === opt.val ? "border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]" : ""}`}
                  style={repaymentType !== opt.val ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                  data-testid={`repayment-type-${opt.val}`}>{opt.label}</button>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={mutedStyle}>
              {repaymentType === "lump_sum" && "Full amount returned at once on due date"}
              {repaymentType === "fixed" && "Fixed amount paid at regular intervals"}
              {repaymentType === "flexible" && "Borrower pays as and when possible"}
            </p>
          </div>
          {repaymentType === "fixed" && (
            <div className="space-y-4 p-3 rounded-lg" style={{ backgroundColor: "rgba(20,184,166,0.05)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <p className="text-xs font-semibold" style={labelStyle}>Installment Plan</p>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Payment Frequency</label>
                <select value={repaymentFrequency} onChange={(e) => setRepaymentFrequency(e.target.value)}
                  className={inputCls} style={inputStyle()} data-testid="repayment-frequency-select">
                  <option value="">Select Frequency</option>
                  <option value="Daily">Daily</option><option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Semi-Annually</option><option value="Yearly">Yearly</option>
                </select>
              </div>
              {repaymentFrequency && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
                    {repaymentFrequency === "Weekly" ? "Payment Day" : repaymentFrequency === "Daily" ? "" : "Payment Date (day of month)"}
                  </label>
                  {repaymentFrequency === "Weekly" ? (
                    <select value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)}
                      className={inputCls} style={inputStyle()} data-testid="payment-day-select">
                      <option value="">Select Day</option>
                      {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : repaymentFrequency === "Daily" ? (
                    <p className="text-xs px-3 py-2.5 rounded-xl" style={{ backgroundColor: "#14B8A610", color: "#14B8A6" }}>Every day</p>
                  ) : (
                    <select value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)}
                      className={inputCls} style={inputStyle()} data-testid="payment-date-select">
                      <option value="">Select Date</option>
                      {Array.from({length: 28}, (_, i) => i + 1).map(d => (
                        <option key={d} value={String(d)}>{d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"} of every {repaymentFrequency === "Quarterly" ? "quarter" : repaymentFrequency === "Half-Yearly" ? "half-year" : repaymentFrequency === "Yearly" ? "year" : "month"}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Amount per Installment</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium" style={labelStyle}>₹</span>
                    <input type="text" value={installmentAmount} onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, ""); setInstallmentAmount(val);
                      const totalReturn = agreedReturnAmount ? parseFloat(agreedReturnAmount) : (parseFloat(principal) || 0);
                      const amt = parseFloat(val);
                      if (amt > 0 && totalReturn > 0) setNumberOfInstallments(String(Math.ceil(totalReturn / amt)));
                    }} placeholder="e.g., 5000" className={`${inputCls} pl-8`} style={inputStyle()} data-testid="installment-amount-input" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={labelStyle}>No. of Installments</label>
                  <input type="text" value={numberOfInstallments} onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, ""); setNumberOfInstallments(val);
                    const totalReturn = agreedReturnAmount ? parseFloat(agreedReturnAmount) : (parseFloat(principal) || 0);
                    const num = parseInt(val);
                    if (num > 0 && totalReturn > 0) setInstallmentAmount(String(Math.ceil(totalReturn / num)));
                  }} placeholder="e.g., 10" className={inputCls} style={inputStyle()} data-testid="num-installments-input" />
                </div>
              </div>
              {installmentAmount && numberOfInstallments && repaymentFrequency && (
                <div className="p-2.5 rounded-lg" style={{ backgroundColor: "#14B8A610", border: "1px solid #14B8A620" }}>
                  <p className="text-xs font-medium" style={{ color: "#14B8A6" }}>
                    ₹{parseFloat(installmentAmount).toLocaleString("en-IN")} x {numberOfInstallments} {repaymentFrequency.toLowerCase()} installments = ₹{(parseFloat(installmentAmount) * parseInt(numberOfInstallments)).toLocaleString("en-IN")}
                  </p>
                </div>
              )}
            </div>
          )}
          <div>
            <label className={labelCls} style={labelStyle}>Due Date (optional)</label>
            <Popover open={dueDateCalendarOpen} onOpenChange={setDueDateCalendarOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={`${inputCls} text-left flex items-center justify-between`} style={inputStyle()} data-testid="due-date-picker">
                  <span style={dueDate ? labelStyle : mutedStyle}>{dueDate || "Select due date"}</span>
                  <CalendarIcon className="h-4 w-4" style={mutedStyle} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent mode="single" selected={dueDate ? new Date(dueDate + "T00:00:00") : undefined}
                  onSelect={(date) => { if (date) { const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,"0"); const d = String(date.getDate()).padStart(2,"0"); setDueDate(`${y}-${m}-${d}`); } setDueDateCalendarOpen(false); }}
                  initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );

  // ─── STEP 3: Amount & Financials ───
  const step3Content = (
    <div className="space-y-6" data-testid="step-3-amount">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Amount & Schedule</p>
        <p className="text-xs mt-1" style={mutedStyle}>Financial details of your investment</p>
      </div>
      {/* Principal */}
      <div>
        <label className={labelCls} style={labelStyle}>
          {isLoanGiven ? "Amount Lent *" : investmentFrequency && investmentFrequency !== "" ? "Initial Investment (can be 0)" : "Principal / Invested Amount"}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={principal} onChange={handleAmountChange(setPrincipal)} placeholder="0"
            className={`${inputCls} pl-10`} style={inputStyle(errors.principal)} data-testid="principal-input" />
        </div>
        {parseFloat(principal) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(principal))}</p>}
        {errors.principal && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.principal}</p>}
      </div>
      {/* Start Date */}
      <div>
        <label className={labelCls} style={labelStyle}>{isLoanGiven ? "Loan Date" : "Start Date"}</label>
        <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={`${inputCls} text-left flex items-center justify-between`}
              style={inputStyle(errors.startDate)} data-testid="start-date-input">
              <span style={startDate ? labelStyle : mutedStyle}>{startDate ? format(new Date(startDate), "PPP") : "Select start date"}</span>
              <CalendarIcon className="h-5 w-5" style={mutedStyle} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
            <CalendarComponent mode="single" selected={startDate ? new Date(startDate) : undefined}
              onSelect={(date) => { if (date) setStartDate(format(date, "yyyy-MM-dd")); setStartCalendarOpen(false); }} initialFocus />
          </PopoverContent>
        </Popover>
        {errors.startDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.startDate}</p>}
      </div>
      {/* SIP/Recurring */}
      {showFrequencyField && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: "#F0FDF4", border: "1px solid rgba(16,185,129,0.2)" }}>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={labelStyle}>
            <Info className="h-4 w-4" style={{ color: "#10B981" }} /> Recurring Investment (SIP)
          </h4>
          <div className="space-y-4">
            <div>
              <label className={labelCls} style={labelStyle}>Investment Frequency</label>
              <select value={investmentFrequency} onChange={(e) => setInvestmentFrequency(e.target.value)}
                className={inputCls} style={inputStyle()} data-testid="investment-frequency-select">
                <option value="">One-time Investment</option>
                <option value="Daily">Daily</option><option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly (SIP)</option><option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option><option value="Yearly">Yearly</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {investmentFrequency && investmentFrequency !== "" && (
              <div>
                <label className={labelCls} style={labelStyle}>{investmentFrequency} Investment Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
                  <input type="text" value={sipAmount} onChange={handleAmountChange(setSipAmount)} placeholder="0"
                    className={`${inputCls} pl-10`} style={inputStyle(errors.sipAmount)} data-testid="sip-amount-input" />
                </div>
                {parseFloat(sipAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(sipAmount))}</p>}
                {errors.sipAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.sipAmount}</p>}
              </div>
            )}
            {investmentFrequency === "Weekly" && (
              <div>
                <label className={labelCls} style={labelStyle}>Investment Day</label>
                <select value={sipSelectedDay} onChange={(e) => setSipSelectedDay(e.target.value)}
                  className={inputCls} style={inputStyle()}>
                  <option value="">Select Day</option>
                  {weekDays.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>
            )}
            {investmentFrequency === "Monthly" && (
              <div>
                <label className={labelCls} style={labelStyle}>Investment Date</label>
                <RestrictedDatePicker value={sipSelectedDate} onChange={(date) => setSipSelectedDate(date)}
                  placeholder="Select investment date" testId="sip-date-select" />
              </div>
            )}
            {investmentFrequency === "Quarterly" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Select Quarter</label>
                  <select value={sipSelectedQuarter} onChange={(e) => { setSipSelectedQuarter(e.target.value); setSipSelectedMonth(""); setSipSelectedDate(""); }}
                    className={inputCls} style={inputStyle()}>
                    <option value="">Select Quarter</option>
                    {quarters.map((q) => <option key={q.id} value={q.label}>{q.label}</option>)}
                  </select>
                </div>
                {sipSelectedQuarter && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Select Month</label>
                    <select value={sipSelectedMonth} onChange={(e) => { setSipSelectedMonth(e.target.value); setSipSelectedDate(""); }}
                      className={inputCls} style={inputStyle()}>
                      <option value="">Select Month</option>
                      {quarterMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                {sipSelectedMonth && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Select Date</label>
                    <RestrictedDatePicker value={sipSelectedDate} onChange={(date) => setSipSelectedDate(date)}
                      restrictedMonth={getMonthIndex(sipSelectedMonth)} placeholder="Select date" testId="sip-date-select" />
                  </div>
                )}
                {calculateQuarterlyDates.length > 0 && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: "#E8F8F4", border: "1px solid rgba(20,184,166,0.3)" }}>
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#14B8A6" }} />
                      <div><p className="text-sm font-medium mb-1" style={labelStyle}>Next Recurring Dates:</p>
                        {calculateQuarterlyDates.map((date, idx) => <div key={idx} className="text-sm" style={mutedStyle}>• {date}</div>)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {investmentFrequency === "Half-Yearly" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Select Half</label>
                  <select value={sipSelectedHalf} onChange={(e) => { setSipSelectedHalf(e.target.value); setSipSelectedMonth(""); setSipSelectedDate(""); }}
                    className={inputCls} style={inputStyle()}>
                    <option value="">Select Half</option>
                    {halves.map((h) => <option key={h.id} value={h.label}>{h.label}</option>)}
                  </select>
                </div>
                {sipSelectedHalf && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Select Month</label>
                    <select value={sipSelectedMonth} onChange={(e) => { setSipSelectedMonth(e.target.value); setSipSelectedDate(""); }}
                      className={inputCls} style={inputStyle()}>
                      <option value="">Select Month</option>
                      {halfMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
                {sipSelectedMonth && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Select Date</label>
                    <RestrictedDatePicker value={sipSelectedDate} onChange={(date) => setSipSelectedDate(date)}
                      restrictedMonth={getMonthIndex(sipSelectedMonth)} placeholder="Select date" testId="sip-date-select" />
                  </div>
                )}
                {calculateHalfYearlyDate && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: "#E8F8F4", border: "1px solid rgba(20,184,166,0.3)" }}>
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: "#14B8A6" }} />
                      <div><p className="text-sm font-medium mb-1" style={labelStyle}>Next Recurring Date:</p>
                        <div className="text-sm" style={mutedStyle}>• {calculateHalfYearlyDate}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {investmentFrequency === "Yearly" && (
              <div className="space-y-4">
                <div>
                  <label className={labelCls} style={labelStyle}>Select Month</label>
                  <select value={sipSelectedMonth} onChange={(e) => setSipSelectedMonth(e.target.value)}
                    className={inputCls} style={inputStyle()}>
                    <option value="">Select Month</option>
                    {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                {sipSelectedMonth && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Select Date</label>
                    <RestrictedDatePicker value={sipSelectedDate} onChange={(date) => setSipSelectedDate(date)}
                      restrictedMonth={getMonthIndex(sipSelectedMonth)} placeholder="Select date" testId="sip-date-select" />
                  </div>
                )}
              </div>
            )}
            {investmentFrequency && investmentFrequency !== "" && (
              <div className="p-4 rounded-xl" style={{ backgroundColor: "#FEF3C7", border: "1px solid rgba(245,158,11,0.3)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={labelStyle}>Auto Create SIP Expense</p>
                    <p className="text-xs mt-0.5" style={mutedStyle}>Creates recurring expense entry</p>
                  </div>
                  <button type="button" onClick={() => sipAmount && parseFloat(sipAmount) > 0 && setAutoCreateExpense(!autoCreateExpense)}
                    disabled={!sipAmount || parseFloat(sipAmount) <= 0}
                    className={`relative w-12 h-6 rounded-full transition-colors ${autoCreateExpense && sipAmount && parseFloat(sipAmount) > 0 ? "bg-[#10B981]" : "bg-gray-300"} ${!sipAmount || parseFloat(sipAmount) <= 0 ? "opacity-50" : ""}`}
                    data-testid="auto-expense-toggle">
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoCreateExpense && sipAmount && parseFloat(sipAmount) > 0 ? "translate-x-6" : ""}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Mode-specific fields */}
      {isDigitalMetal && !isLoanGiven && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Quantity (grams)</label>
            <input type="text" value={quantity} onChange={handleAmountChange(setQuantity)} placeholder="e.g., 10.5"
              className={inputCls} style={inputStyle()} data-testid="quantity-input" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Purchase Price per gram</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
              <input type="text" value={unitPrice} onChange={handleAmountChange(setUnitPrice)} placeholder="0"
                className={`${inputCls} pl-10`} style={inputStyle()} data-testid="unit-price-input" />
            </div>
          </div>
        </>
      )}
      {isSGB && !isLoanGiven && (
        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: "#F59E0B10", border: "1px solid #F59E0B20" }}>
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
          <p className="text-xs" style={{ color: "#92400E" }}>SGBs pay 2.5% interest semi-annually and have an 8-year maturity period.</p>
        </div>
      )}
      {isIncomeGenerating && !isLoanGiven && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Return Rate (% per annum)</label>
            <div className="relative">
              <input type="text" value={returnRate} onChange={handleAmountChange(setReturnRate)} placeholder="e.g., 7.5"
                className={`${inputCls} pr-10`} style={inputStyle(errors.returnRate)} data-testid="return-rate-input" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2" style={mutedStyle}>%</span>
            </div>
            {errors.returnRate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.returnRate}</p>}
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Interest Type</label>
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
              {["Simple", "Compound"].map(t => (
                <button key={t} type="button" onClick={() => setCompoundingType(t)}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors`}
                  style={compoundingType === t ? { backgroundColor: "var(--text-primary)", color: "white" } : { backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}>{t}</button>
              ))}
            </div>
          </div>
          {compoundingType === "Compound" && (
            <div>
              <label className={labelCls} style={labelStyle}>Compounding Frequency</label>
              <select value={compoundingFrequency} onChange={(e) => setCompoundingFrequency(e.target.value)}
                className={inputCls} style={inputStyle()}>
                <option value="">Select Frequency</option>
                {compoundingFrequencyOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={labelCls} style={labelStyle}>Payout Frequency</label>
            <select value={payoutFrequency} onChange={(e) => setPayoutFrequency(e.target.value)}
              className={inputCls} style={inputStyle()}>
              <option value="">Select Frequency</option>
              {payoutFrequencyOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </>
      )}
      {isGrowthWithMaturity && !isLoanGiven && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Lock-in Period (months) <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
            <input type="text" value={lockInPeriod} onChange={handleAmountChange(setLockInPeriod)} placeholder="e.g., 36"
              className={inputCls} style={inputStyle()} data-testid="lock-in-input" />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Maturity Date</label>
            <Popover open={maturityCalendarOpen} onOpenChange={setMaturityCalendarOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={`${inputCls} text-left flex items-center justify-between`}
                  style={inputStyle(errors.maturityDate)} data-testid="maturity-date-input">
                  <span style={maturityDate ? labelStyle : mutedStyle}>{maturityDate ? format(new Date(maturityDate), "PPP") : "Select maturity date"}</span>
                  <CalendarIcon className="h-5 w-5" style={mutedStyle} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border border-gray-200" align="start">
                <CalendarComponent mode="single" selected={maturityDate ? new Date(maturityDate) : undefined}
                  onSelect={(date) => { if (date) setMaturityDate(format(date, "yyyy-MM-dd")); setMaturityCalendarOpen(false); }} initialFocus />
              </PopoverContent>
            </Popover>
            {errors.maturityDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.maturityDate}</p>}
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Expected Maturity Value</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
              <input type="text" value={expectedMaturityValue} onChange={handleAmountChange(setExpectedMaturityValue)} placeholder="0"
                className={`${inputCls} pl-10`} style={inputStyle()} data-testid="maturity-value-input" />
            </div>
            {parseFloat(expectedMaturityValue) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(expectedMaturityValue))}</p>}
          </div>
        </>
      )}
    </div>
  );

  // ─── STEP 4: Extra Options ───
  const step4Content = (
    <div className="space-y-6" data-testid="step-4-options">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Final Details</p>
        <p className="text-xs mt-1" style={mutedStyle}>Optional settings and notes</p>
      </div>
      {/* Current Value */}
      {!isLoanGiven && (
        <div>
          <label className={labelCls} style={labelStyle}>Current Value <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
            <input type="text" value={currentValue} onChange={handleAmountChange(setCurrentValue)} placeholder="Defaults to principal if empty"
              className={`${inputCls} pl-10`} style={inputStyle()} data-testid="current-value-input" />
          </div>
          {parseFloat(currentValue) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(currentValue))}</p>}
          <p className="text-xs mt-1" style={mutedStyle}>This feeds into your Net Worth calculation</p>
        </div>
      )}
      {/* Linked Account */}
      {accounts.length > 0 && !isLoanGiven && (
        <div>
          <label className={labelCls} style={labelStyle}>Linked Account <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}
            className={inputCls} style={inputStyle()} data-testid="linked-account-select">
            <option value="">Select Account</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>)}
          </select>
        </div>
      )}
      {/* Notes */}
      <div>
        <label className={labelCls} style={labelStyle}>Notes <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3}
          className={`${inputCls} resize-none`} style={inputStyle()} data-testid="notes-input" />
      </div>
      {/* Emergency Fund Toggle */}
      {!isLoanGiven && (
        <div className="p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium" style={labelStyle}>Consider as Emergency Fund</label>
              <p className="text-xs mt-1" style={mutedStyle}>Include in your liquid/emergency fund calculation</p>
            </div>
            <button type="button" onClick={() => setIsLiquidAsset(!isLiquidAsset)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${isLiquidAsset ? 'bg-[#14B8A6]' : 'bg-gray-300'}`}
              data-testid="liquid-asset-toggle">
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isLiquidAsset ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          {isLiquidAsset && (
            <div className="mt-3 flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: "#14B8A610", border: "1px solid #14B8A620" }}>
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#14B8A6" }} />
              <p className="text-xs" style={{ color: "#0D9488" }}>This amount will be added to your emergency fund for AI Smart Insights.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── EDIT MODE: ALL FIELDS ───
  const accentColor = "#14B8A6";
  const editModeContent = (
    <div className="space-y-8" data-testid="investment-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">1</span>Category & Mode</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">2</span>Details</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">3</span>Amount & Schedule</h3>{step3Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">4</span>Options</h3>{step4Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={labelStyle}>Confirm Changes</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to update this investment?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl px-4 py-3 text-white font-medium" style={{ backgroundColor: accentColor }}>Yes, Update</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Investment?</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to delete "{name}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <WizardShell
      title={id ? "Edit Investment" : (isCategoryLocked ? `Add ${investmentCategory}` : "Add Investment")}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor={accentColor}
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate("/my-investments")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
      {step === 4 && step4Content}
    </WizardShell>
  );
};

export default InvestmentForm;

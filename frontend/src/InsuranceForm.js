import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Calendar as CalendarIcon, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import axios from "axios";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addMonths, addQuarters, addYears } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { 
  validatePositiveAmount, 
  validateDateRange,
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";
import API_BASE from './utils/apiConfig';

const InsuranceForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const prefilledType = searchParams.get('type') || '';
  const isTypeLocked = !!prefilledType && !id;
  
  // Form fields
  const [insuranceType, setInsuranceType] = useState(prefilledType);
  const [policyName, setPolicyName] = useState("");
  const [coverageAmount, setCoverageAmount] = useState("");
  const [premiumAmount, setPremiumAmount] = useState("");
  const [premiumFrequency, setPremiumFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [premiumPaymentDate, setPremiumPaymentDate] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [coveredPerson, setCoveredPerson] = useState("");
  const [maturityType, setMaturityType] = useState("");
  const [expectedMaturityAmount, setExpectedMaturityAmount] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(false);
  const [premiumEndDate, setPremiumEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [premiumPaymentTerm, setPremiumPaymentTerm] = useState("");
  
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedQuarter, setSelectedQuarter] = useState("");
  const [selectedHalf, setSelectedHalf] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  
  const [assets, setAssets] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [startCalendarOpen, setStartCalendarOpen] = useState(false);
  const [endCalendarOpen, setEndCalendarOpen] = useState(false);
  const [premiumEndCalendarOpen, setPremiumEndCalendarOpen] = useState(false);

  // ─── WIZARD STATE ───
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);

  const backendUrl = API_BASE;

  const {
    checkUniqueness: checkPolicyNameUnique,
    isChecking: isCheckingPolicyName,
    isUnique: isPolicyNameUnique,
    error: policyNameUniqueError,
  } = useEntityUniqueness({ collection: "insurances", field: "policyName", excludeId: id || null });

  const insuranceTypeOptions = ["Life Insurance", "Term Insurance", "Health Insurance", "Vehicle Insurance", "Property Insurance", "Business Insurance", "Asset Insurance", "Travel Insurance", "Other"];
  const premiumFrequencyOptions = ["One-Time", "Monthly", "Quarterly", "Half-Yearly", "Yearly"];
  const coveredPersonOptions = ["Self", "Spouse", "Child", "Parent", "Other"];
  const maturityTypeOptions = [
    { value: "Pure Protection", label: "Pure Protection (No Returns)" },
    { value: "Returns on Maturity", label: "Returns on Maturity" },
    { value: "Market Linked", label: "Market Linked (ULIP)" }
  ];
  const premiumPaymentTermOptions = ["1 Year", "2 Years", "3 Years", "5 Years", "10 Years", "15 Years", "20 Years", "25 Years", "30 Years", "Till Maturity"];

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
  const allMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getMonthIndex = (monthName) => allMonths.indexOf(monthName);
  const quarterMonths = useMemo(() => { const q = quarters.find(q => q.label === selectedQuarter); return q ? q.months : []; }, [selectedQuarter]);
  const halfMonths = useMemo(() => { const h = halves.find(h => h.label === selectedHalf); return h ? h.months : []; }, [selectedHalf]);

  useEffect(() => { setSelectedDay(""); setSelectedQuarter(""); setSelectedHalf(""); setSelectedMonth(""); setPremiumPaymentDate(""); }, [premiumFrequency]);

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const calculateNextPremiumDates = useMemo(() => {
    if (!premiumPaymentDate || !premiumFrequency || premiumFrequency === "One-Time") return [];
    const baseDate = new Date(premiumPaymentDate); const dates = [];
    for (let i = 1; i <= 3; i++) {
      let nextDate;
      switch (premiumFrequency) {
        case "Monthly": nextDate = addMonths(baseDate, i); break;
        case "Quarterly": nextDate = addQuarters(baseDate, i); break;
        case "Half-Yearly": nextDate = addMonths(baseDate, i * 6); break;
        case "Yearly": nextDate = addYears(baseDate, i); break;
        default: continue;
      }
      if (endDate && nextDate > new Date(endDate)) break;
      dates.push(format(nextDate, "MMM d, yyyy"));
    }
    return dates;
  }, [premiumPaymentDate, premiumFrequency, endDate]);

  useEffect(() => { fetchAssets(); if (id) fetchInsuranceData(); }, [id]);

  useEffect(() => {
    if (startDate && endDate) { const s = new Date(startDate); const e = new Date(endDate); if (s > e) { setEndDate(""); toast.info("Policy End Date cleared because it was before the new Start Date"); } }
  }, [startDate]);

  useEffect(() => {
    if (premiumPaymentTerm && startDate && autoCreateExpense) {
      const start = new Date(startDate);
      if (premiumPaymentTerm === "Till Maturity") { if (endDate) setPremiumEndDate(endDate); }
      else { const years = parseInt(premiumPaymentTerm); if (!isNaN(years)) { const premEnd = new Date(start); premEnd.setFullYear(premEnd.getFullYear() + years); setPremiumEndDate(format(premEnd, "yyyy-MM-dd")); } }
    }
  }, [premiumPaymentTerm, startDate, autoCreateExpense, endDate]);

  useEffect(() => {
    if (premiumPaymentDate && startDate) {
      const pd = new Date(premiumPaymentDate); const s = new Date(startDate);
      if (pd < s) { setPremiumPaymentDate(""); toast.info("Premium Payment Date cleared because it was before Policy Start Date"); }
      if (endDate) { const e = new Date(endDate); if (pd > e) { setPremiumPaymentDate(""); toast.info("Premium Payment Date cleared because it was after Policy End Date"); } }
    }
  }, [startDate, endDate]);

  const fetchAssets = async () => { try { const r = await axios.get(`${backendUrl}/api/assets`); setAssets(r.data); } catch (e) {} };

  const fetchInsuranceData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/insurances/${id}`);
      const data = response.data;
      setInsuranceType(data.insuranceType || ""); setPolicyName(data.policyName || "");
      setCoverageAmount(data.coverageAmount?.toString() || ""); setPremiumAmount(data.premiumAmount?.toString() || "");
      setPremiumFrequency(data.premiumFrequency || ""); setStartDate(data.startDate || "");
      setEndDate(data.endDate || ""); setPremiumPaymentDate(data.premiumPaymentDate || "");
      setLinkedAssetId(data.linkedAssetId || ""); setCoveredPerson(data.coveredPerson || "");
      setMaturityType(data.maturityType || ""); setExpectedMaturityAmount(data.expectedMaturityAmount?.toString() || "");
      setAutoCreateExpense(data.autoCreateExpense === true); setPremiumEndDate(data.premiumEndDate || "");
      setPremiumPaymentTerm(data.premiumPaymentTerm || ""); setNotes(data.notes || "");
    } catch (error) { setErrors({ submit: "Failed to load insurance data" }); }
    finally { setLoading(false); }
  };

  const handleAmountChange = (setter) => (e) => { setter(formatAmountInput(e.target.value)); };

  // Clear field errors in real-time
  useEffect(() => { if (insuranceType && errors.insuranceType) setErrors(prev => { const n = {...prev}; delete n.insuranceType; return n; }); }, [insuranceType]);
  useEffect(() => { if (coverageAmount && errors.coverageAmount) setErrors(prev => { const n = {...prev}; delete n.coverageAmount; return n; }); }, [coverageAmount]);
  useEffect(() => { if (premiumAmount && errors.premiumAmount) setErrors(prev => { const n = {...prev}; delete n.premiumAmount; return n; }); }, [premiumAmount]);
  useEffect(() => { if (premiumFrequency && errors.premiumFrequency) setErrors(prev => { const n = {...prev}; delete n.premiumFrequency; return n; }); }, [premiumFrequency]);
  useEffect(() => { if (startDate && errors.startDate) setErrors(prev => { const n = {...prev}; delete n.startDate; return n; }); }, [startDate]);
  useEffect(() => { if (endDate && errors.endDate) setErrors(prev => { const n = {...prev}; delete n.endDate; return n; }); }, [endDate]);

  // ─── PER-STEP VALIDATION ───
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!insuranceType) newErrors.insuranceType = "Please select insurance type.";
      const nameError = validateTextField(policyName, "Policy name", 100);
      if (nameError) newErrors.policyName = nameError;
      if (isPolicyNameUnique === false) newErrors.policyName = policyNameUniqueError || "An entry with this name already exists.";
    }
    if (s === 2) {
      const ce = validatePositiveAmount(coverageAmount, "Coverage amount"); if (ce) newErrors.coverageAmount = ce;
      const pe = validatePositiveAmount(premiumAmount, "Premium amount");
      if (pe) newErrors.premiumAmount = pe;
      else if (parseFloat(premiumAmount) >= parseFloat(coverageAmount)) newErrors.premiumAmount = "Premium amount must be less than coverage amount.";
      if (!premiumFrequency) newErrors.premiumFrequency = "Please select premium frequency.";
    }
    if (s === 3) {
      if (!startDate) newErrors.startDate = "Policy start date is required.";
      else if (new Date(startDate) > today) newErrors.startDate = "Policy start date cannot be in the future.";
      if (endDate && startDate) { const de = validateDateRange(startDate, endDate, "Policy Start Date", "Policy End Date"); if (de) newErrors.endDate = de; }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = () => {
    const newErrors = {};
    if (!insuranceType) newErrors.insuranceType = "Please select insurance type.";
    const nameError = validateTextField(policyName, "Policy name", 100); if (nameError) newErrors.policyName = nameError;
    if (isPolicyNameUnique === false) newErrors.policyName = policyNameUniqueError || "An entry with this name already exists.";
    const ce = validatePositiveAmount(coverageAmount, "Coverage amount"); if (ce) newErrors.coverageAmount = ce;
    const pe = validatePositiveAmount(premiumAmount, "Premium amount");
    if (pe) newErrors.premiumAmount = pe;
    else if (parseFloat(premiumAmount) >= parseFloat(coverageAmount)) newErrors.premiumAmount = "Premium amount must be less than coverage amount.";
    if (!premiumFrequency) newErrors.premiumFrequency = "Please select premium frequency.";
    if (!startDate) newErrors.startDate = "Policy start date is required.";
    else if (new Date(startDate) > today) newErrors.startDate = "Policy start date cannot be in the future.";
    if (endDate && startDate) { const de = validateDateRange(startDate, endDate, "Policy Start Date", "Policy End Date"); if (de) newErrors.endDate = de; }
    if (maturityType && maturityType !== "Pure Protection" && expectedMaturityAmount) {
      const me = validatePositiveAmount(expectedMaturityAmount, "Expected maturity amount"); if (me) newErrors.expectedMaturityAmount = me;
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  const handleSave = async () => { if (!validate()) return; if (id) { setShowUpdateConfirm(true); return; } await performSave(); };

  const performSave = async () => {
    setIsSubmitting(true); setShowUpdateConfirm(false);
    try {
      const payload = {
        insuranceType, policyName, coverageAmount: parseFloat(coverageAmount),
        premiumAmount: parseFloat(premiumAmount), premiumFrequency,
        startDate, endDate: endDate || null, premiumPaymentDate: premiumPaymentDate || null,
        linkedAssetId: linkedAssetId || null, coveredPerson: coveredPerson || null,
        maturityType: maturityType || null,
        expectedMaturityAmount: expectedMaturityAmount ? parseFloat(expectedMaturityAmount) : null,
        autoCreateExpense, premiumEndDate: premiumEndDate || null,
        premiumPaymentTerm: premiumPaymentTerm || null, notes: notes || null,
      };
      if (id) { await axios.put(`${backendUrl}/api/insurances/${id}`, payload); toast.success("Insurance updated!"); }
      else { await axios.post(`${backendUrl}/api/insurances`, payload); toast.success("Insurance saved!"); }
      if (location.state?.returnTo === '/asset' && location.state?.assetFormData) {
        navigate('/asset', { state: { assetFormData: location.state.assetFormData } });
      } else {
        fireConfetti();
        setTimeout(() => navigate("/my-insurance"), 400);
      }
    } catch (error) { setErrors({ submit: "Failed to save. Please try again." }); toast.error("Failed to save insurance"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true); setShowDeleteConfirm(false);
    try { await axios.delete(`${backendUrl}/api/insurances/${id}`); toast.success("Insurance deleted!"); navigate("/my-insurance"); }
    catch (error) { setErrors({ submit: "Failed to delete." }); toast.error("Failed to delete"); }
    finally { setIsSubmitting(false); }
  };

  const getFilteredAssets = () => {
    if (insuranceType === "Vehicle Insurance") return assets.filter(a => a.assetType === "Vehicle");
    if (insuranceType === "Property Insurance") return assets.filter(a => a.assetType.includes("Property") || a.assetType === "Land");
    return assets;
  };

  const showAssetSelector = ["Vehicle Insurance", "Property Insurance", "Asset Insurance", "Business Insurance"].includes(insuranceType);
  const showPersonSelector = ["Life Insurance", "Health Insurance", "Term Insurance"].includes(insuranceType);

  const handleBackNavigation = () => {
    if (location.state?.returnTo === '/asset' && location.state?.assetFormData) navigate('/asset', { state: { assetFormData: location.state.assetFormData } });
    else if (location.state?.fromExpenses) navigate(location.state.fromExpenses);
    else if (window.history.length > 2) navigate(-1);
    else navigate("/my-insurance");
  };

  // Shared styles
  const inputCls = "w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20";
  const inputStyle = (err) => ({ backgroundColor: "var(--bg-subtle)", borderColor: err ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" });
  const labelCls = "block text-sm font-medium mb-2";
  const labelStyle = { color: "var(--text-primary)" };
  const mutedStyle = { color: "var(--text-muted)" };

  // Helper for premium date preview
  const premiumDatePreview = calculateNextPremiumDates.length > 0 ? (
    <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "#00D09C08", border: "1px solid #00D09C20" }}>
      <div className="flex items-center gap-2 mb-2">
        <CalendarIcon className="h-4 w-4" style={{ color: "#00D09C" }} />
        <span className="text-sm font-medium" style={labelStyle}>Upcoming Premium Dates:</span>
      </div>
      <ul className="space-y-1">
        {calculateNextPremiumDates.map((date, idx) => (
          <li key={idx} className="text-sm flex items-center gap-2" style={mutedStyle}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D09C]" />{date}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  // ─── STEP 1: Type & Name ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-type">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Policy Details</p>
        <p className="text-xs mt-1" style={mutedStyle}>Select type and name your policy</p>
      </div>
      {!isTypeLocked && (
        <div>
          <label className={labelCls} style={labelStyle}>Insurance Type *</label>
          <select value={insuranceType} onChange={(e) => { setInsuranceType(e.target.value); setLinkedAssetId(""); setCoveredPerson(""); }}
            className={inputCls} style={inputStyle(errors.insuranceType)} data-testid="insurance-type-select">
            <option value="">Select Insurance Type</option>
            {insuranceTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {errors.insuranceType && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.insuranceType}</p>}
        </div>
      )}
      <div>
        <label className={labelCls} style={labelStyle}>Policy Name *</label>
        <div className="relative">
          <input type="text" value={policyName} onChange={(e) => { setPolicyName(e.target.value); if (errors.policyName) setErrors(prev => ({...prev, policyName: null})); }}
            onBlur={() => checkPolicyNameUnique(policyName)} placeholder="e.g., HDFC Life Term Plan" maxLength={100}
            className={`${inputCls} pr-10`}
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.policyName || policyNameUniqueError ? "var(--status-error)" : isPolicyNameUnique === true && policyName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="policy-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingPolicyName && <Loader2 className="h-5 w-5 animate-spin" style={mutedStyle} />}
            {!isCheckingPolicyName && isPolicyNameUnique === true && policyName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.policyName && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.policyName}</p>}
        {!errors.policyName && policyNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{policyNameUniqueError}</p>}
        {!errors.policyName && !policyNameUniqueError && isPolicyNameUnique === true && policyName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
    </div>
  );

  // ─── STEP 2: Coverage & Premium ───
  const step2Content = (
    <div className="space-y-6" data-testid="step-2-coverage">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Coverage & Premium</p>
        <p className="text-xs mt-1" style={mutedStyle}>Amount details and payment frequency</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Coverage Amount (Sum Insured) *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={coverageAmount} onChange={handleAmountChange(setCoverageAmount)} placeholder="0"
            className={`${inputCls} pl-10`} style={inputStyle(errors.coverageAmount)} data-testid="coverage-amount-input" />
        </div>
        {parseFloat(coverageAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(coverageAmount))}</p>}
        {errors.coverageAmount && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.coverageAmount}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Premium Amount *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={premiumAmount} onChange={handleAmountChange(setPremiumAmount)} placeholder="0"
            className={`${inputCls} pl-10`} style={inputStyle(errors.premiumAmount)} data-testid="premium-amount-input" />
        </div>
        {parseFloat(premiumAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(premiumAmount))}</p>}
        {errors.premiumAmount && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.premiumAmount}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Premium Frequency *</label>
        <select value={premiumFrequency} onChange={(e) => { setPremiumFrequency(e.target.value); if (e.target.value === "One-Time") setPremiumPaymentDate(""); }}
          className={inputCls} style={inputStyle(errors.premiumFrequency)} data-testid="premium-frequency-select">
          <option value="">Select Frequency</option>
          {premiumFrequencyOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {errors.premiumFrequency && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.premiumFrequency}</p>}
      </div>
      {/* Premium Date Fields based on frequency */}
      {premiumFrequency === "Monthly" && (
        <div>
          <label className={labelCls} style={labelStyle}>Select Payment Date</label>
          <RestrictedDatePicker value={premiumPaymentDate} onChange={(date) => setPremiumPaymentDate(date)}
            placeholder="Select premium payment date" error={!!errors.premiumPaymentDate} testId="premium-date-select" />
          {errors.premiumPaymentDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.premiumPaymentDate}</p>}
          {premiumDatePreview}
        </div>
      )}
      {premiumFrequency === "Quarterly" && (
        <div className="space-y-4">
          <div>
            <label className={labelCls} style={labelStyle}>Select Quarter</label>
            <select value={selectedQuarter} onChange={(e) => { setSelectedQuarter(e.target.value); setSelectedMonth(""); setPremiumPaymentDate(""); }}
              className={inputCls} style={inputStyle()} data-testid="premium-quarter-select">
              <option value="">Select Quarter</option>
              {quarters.map((q) => <option key={q.id} value={q.label}>{q.label}</option>)}
            </select>
          </div>
          {selectedQuarter && (
            <div>
              <label className={labelCls} style={labelStyle}>Select Month</label>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setPremiumPaymentDate(""); }}
                className={inputCls} style={inputStyle()} data-testid="premium-month-select">
                <option value="">Select Month</option>
                {quarterMonths.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {selectedMonth && (
            <div>
              <label className={labelCls} style={labelStyle}>Select Date</label>
              <RestrictedDatePicker value={premiumPaymentDate} onChange={(date) => setPremiumPaymentDate(date)}
                restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.premiumPaymentDate} testId="premium-date-select" />
            </div>
          )}
          {premiumDatePreview}
        </div>
      )}
      {premiumFrequency === "Half-Yearly" && (
        <div className="space-y-4">
          <div>
            <label className={labelCls} style={labelStyle}>Select Half</label>
            <select value={selectedHalf} onChange={(e) => { setSelectedHalf(e.target.value); setSelectedMonth(""); setPremiumPaymentDate(""); }}
              className={inputCls} style={inputStyle()} data-testid="premium-half-select">
              <option value="">Select Half</option>
              {halves.map((h) => <option key={h.id} value={h.label}>{h.label}</option>)}
            </select>
          </div>
          {selectedHalf && (
            <div>
              <label className={labelCls} style={labelStyle}>Select Month</label>
              <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setPremiumPaymentDate(""); }}
                className={inputCls} style={inputStyle()} data-testid="premium-month-select">
                <option value="">Select Month</option>
                {halfMonths.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}
          {selectedMonth && (
            <div>
              <label className={labelCls} style={labelStyle}>Select Date</label>
              <RestrictedDatePicker value={premiumPaymentDate} onChange={(date) => setPremiumPaymentDate(date)}
                restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.premiumPaymentDate} testId="premium-date-select" />
            </div>
          )}
          {premiumDatePreview}
        </div>
      )}
      {premiumFrequency === "Yearly" && (
        <div className="space-y-4">
          <div>
            <label className={labelCls} style={labelStyle}>Select Month</label>
            <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); setPremiumPaymentDate(""); }}
              className={inputCls} style={inputStyle()} data-testid="premium-month-select">
              <option value="">Select Month</option>
              {allMonths.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {selectedMonth && (
            <div>
              <label className={labelCls} style={labelStyle}>Select Date</label>
              <RestrictedDatePicker value={premiumPaymentDate} onChange={(date) => setPremiumPaymentDate(date)}
                restrictedMonth={getMonthIndex(selectedMonth)} placeholder="Select date" error={!!errors.premiumPaymentDate} testId="premium-date-select" />
            </div>
          )}
          {premiumDatePreview}
        </div>
      )}
    </div>
  );

  // ─── STEP 3: Policy Dates ───
  const step3Content = (
    <div className="space-y-6" data-testid="step-3-dates">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Policy Dates</p>
        <p className="text-xs mt-1" style={mutedStyle}>When does your policy start and end?</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Policy Start Date *</label>
        <Popover open={startCalendarOpen} onOpenChange={setStartCalendarOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={`${inputCls} text-left flex items-center justify-between`}
              style={inputStyle(errors.startDate)} data-testid="start-date-input">
              <span style={startDate ? labelStyle : mutedStyle}>{startDate ? format(new Date(startDate), "PPP") : "Select start date"}</span>
              <CalendarIcon className="h-5 w-5" style={mutedStyle} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
            <Calendar mode="single" selected={startDate ? new Date(startDate) : undefined}
              onSelect={(date) => { if (date) { setStartDate(format(date, "yyyy-MM-dd")); if (errors.startDate) setErrors(prev => ({...prev, startDate: null})); } setStartCalendarOpen(false); }}
              disabled={(date) => date > today} initialFocus className="rounded-xl"
              classNames={{ day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]", day_today: "bg-[#00D09C]/10 text-[#00D09C]" }} />
          </PopoverContent>
        </Popover>
        <p className="text-xs mt-1" style={mutedStyle}>Cannot be a future date</p>
        {errors.startDate && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.startDate}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Policy End Date <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <Popover open={endCalendarOpen} onOpenChange={setEndCalendarOpen}>
          <PopoverTrigger asChild>
            <button type="button" className={`${inputCls} text-left flex items-center justify-between`}
              style={inputStyle(errors.endDate)} data-testid="end-date-input">
              <span style={endDate ? labelStyle : mutedStyle}>{endDate ? format(new Date(endDate), "PPP") : "Select end date"}</span>
              <CalendarIcon className="h-5 w-5" style={mutedStyle} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
            <Calendar mode="single" selected={endDate ? new Date(endDate) : undefined}
              onSelect={(date) => {
                if (date) {
                  const sd = startDate ? new Date(startDate) : null;
                  if (sd && date < sd) { toast.error("End Date must be after Start Date"); return; }
                  setEndDate(format(date, "yyyy-MM-dd")); if (errors.endDate) setErrors(prev => ({...prev, endDate: null}));
                }
                setEndCalendarOpen(false);
              }}
              disabled={(date) => startDate && date < new Date(startDate)} initialFocus className="rounded-xl"
              classNames={{ day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]", day_today: "bg-[#00D09C]/10 text-[#00D09C]", day_disabled: "text-gray-300 cursor-not-allowed" }} />
          </PopoverContent>
        </Popover>
        {startDate && <p className="text-xs mt-1" style={mutedStyle}>Must be after {format(new Date(startDate), "PPP")}</p>}
        {errors.endDate && <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}><AlertCircle className="h-3.5 w-3.5" />{errors.endDate}</p>}
      </div>
    </div>
  );

  // ─── STEP 4: Additional Details ───
  const step4Content = (
    <div className="space-y-6" data-testid="step-4-details">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Additional Details</p>
        <p className="text-xs mt-1" style={mutedStyle}>Optional settings</p>
      </div>
      {showAssetSelector && (
        <div>
          <label className={labelCls} style={labelStyle}>Linked Asset <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <select value={linkedAssetId} onChange={(e) => setLinkedAssetId(e.target.value)}
            className={inputCls} style={inputStyle()} data-testid="linked-asset-select">
            <option value="">Select Asset</option>
            {getFilteredAssets().map((a) => <option key={a.id} value={a.id}>{a.assetName} - {a.assetType}</option>)}
          </select>
        </div>
      )}
      {showPersonSelector && (
        <div>
          <label className={labelCls} style={labelStyle}>Covered Person <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <select value={coveredPerson} onChange={(e) => setCoveredPerson(e.target.value)}
            className={inputCls} style={inputStyle()} data-testid="covered-person-select">
            <option value="">Select Person</option>
            {coveredPersonOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )}
      {(insuranceType === "Life Insurance" || insuranceType === "Term Insurance") && (
        <>
          <div>
            <label className={labelCls} style={labelStyle}>Maturity Type <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
            <select value={maturityType} onChange={(e) => setMaturityType(e.target.value)}
              className={inputCls} style={inputStyle()} data-testid="maturity-type-select">
              <option value="">Select Maturity Type</option>
              {maturityTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          {maturityType && maturityType !== "Pure Protection" && (
            <div>
              <label className={labelCls} style={labelStyle}>Expected Maturity Amount <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
                <input type="text" value={expectedMaturityAmount} onChange={handleAmountChange(setExpectedMaturityAmount)} placeholder="0"
                  className={`${inputCls} pl-10`} style={inputStyle()} data-testid="expected-maturity-input" />
              </div>
              {parseFloat(expectedMaturityAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(expectedMaturityAmount))}</p>}
            </div>
          )}
          <div>
            <label className={labelCls} style={labelStyle}>Premium Payment Term <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
            <select value={premiumPaymentTerm} onChange={(e) => setPremiumPaymentTerm(e.target.value)}
              className={inputCls} style={inputStyle()} data-testid="premium-payment-term-select">
              <option value="">Select Term</option>
              {premiumPaymentTermOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <p className="text-xs mt-1" style={mutedStyle}>How long will you pay premiums?</p>
          </div>
        </>
      )}
      {/* Auto Create Expense */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Auto Add to Expense</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>Automatically add premium to expense list</p>
          </div>
          <button type="button" onClick={() => setAutoCreateExpense(!autoCreateExpense)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCreateExpense ? "bg-[#00D09C]" : "bg-gray-300"}`}
            data-testid="auto-expense-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoCreateExpense ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {autoCreateExpense && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <label className={labelCls} style={labelStyle}>Premium End Date</label>
            <Popover open={premiumEndCalendarOpen} onOpenChange={setPremiumEndCalendarOpen}>
              <PopoverTrigger asChild>
                <button type="button" className={`${inputCls} text-left flex items-center justify-between`}
                  style={inputStyle()} data-testid="premium-end-date-input">
                  <span style={premiumEndDate ? labelStyle : mutedStyle}>{premiumEndDate ? format(new Date(premiumEndDate), "PPP") : "Select premium end date"}</span>
                  <CalendarIcon className="h-5 w-5" style={mutedStyle} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
                <Calendar mode="single" selected={premiumEndDate ? new Date(premiumEndDate) : undefined}
                  onSelect={(date) => { if (date) setPremiumEndDate(format(date, "yyyy-MM-dd")); setPremiumEndCalendarOpen(false); }}
                  disabled={(date) => startDate && date < new Date(startDate)} initialFocus className="rounded-xl"
                  classNames={{ day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]", day_today: "bg-[#00D09C]/10 text-[#00D09C]" }} />
              </PopoverContent>
            </Popover>
            <p className="text-xs mt-1" style={mutedStyle}>After this date, premium won't show in expenses</p>
          </div>
        )}
      </div>
      {/* Notes */}
      <div>
        <label className={labelCls} style={labelStyle}>Notes <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3}
          className={`${inputCls} resize-none`} style={inputStyle()} data-testid="notes-input" />
      </div>
    </div>
  );

  // ─── EDIT MODE ───
  const accentColor = "#00D09C";
  const editModeContent = (
    <div className="space-y-8" data-testid="insurance-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">1</span>Type & Policy</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">2</span>Coverage & Premium</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">3</span>Policy Dates</h3>{step3Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">4</span>Details</h3>{step4Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={labelStyle}>Confirm Changes</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to update this insurance?</p>
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Insurance?</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to delete "{policyName}"? This cannot be undone.</p>
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
      title={id ? "Edit Insurance" : (isTypeLocked ? `Add ${insuranceType}` : "Add Insurance")}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor={accentColor}
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate("/my-insurance")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
      {step === 4 && step4Content}
    </WizardShell>
  );
};

export default InsuranceForm;

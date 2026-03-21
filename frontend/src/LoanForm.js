import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Trash2, Building2, Home, ExternalLink, Plus, Check, Loader2 } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { numberToWords } from "@/lib/formatters";
import { RestrictedDatePicker } from "@/components/ui/date-picker";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { 
  validatePositiveAmount, 
  validateLoanOutstanding, 
  validateDateRange,
  validateTextField,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const LoanIncome = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const prefilledType = searchParams.get('type') || '';
  const isTypeLocked = !!prefilledType && !id;
  
  // Form fields
  const [loanType, setLoanType] = useState(prefilledType);
  const [loanName, setLoanName] = useState("");
  const [lenderName, setLenderName] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [emiAmount, setEmiAmount] = useState("");
  const [emiFrequency, setEmiFrequency] = useState("Monthly");
  const [tenureMonths, setTenureMonths] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasLinkedAsset, setHasLinkedAsset] = useState(false);
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [autoCreateExpense, setAutoCreateExpense] = useState(true);
  
  const [isShared, setIsShared] = useState(false);
  const [sharedMembers, setSharedMembers] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [endDateManuallySet, setEndDateManuallySet] = useState(false);
  const [assets, setAssets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [reverseLinkedAssets, setReverseLinkedAssets] = useState([]);
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  // ─── WIZARD STATE ───
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);

  const today = format(new Date(), "yyyy-MM-dd");
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const {
    checkUniqueness: checkLoanNameUnique,
    isChecking: isCheckingLoanName,
    isUnique: isLoanNameUnique,
    error: loanNameUniqueError,
  } = useEntityUniqueness({ collection: "loans", field: "loanName", excludeId: id || null });

  const loanTypeOptions = ["Home Loan", "Vehicle Loan", "Personal Loan", "Education Loan", "Business Loan", "Gold Loan", "Credit Card Dues", "Hand Loan Taken", "Other"];
  const emiFrequencyOptions = ["Monthly", "Quarterly", "Half-Yearly"];

  useEffect(() => { fetchAssets(); fetchAccounts(); fetchFamilyMembers(); if (id) fetchLoanData(); }, [id]);

  useEffect(() => {
    if (location.state?.loanFormData) {
      const data = location.state.loanFormData;
      setLoanType(data.loanType || ""); setLoanName(data.loanName || ""); setLenderName(data.lenderName || "");
      setPrincipalAmount(data.principalAmount || ""); setOutstandingAmount(data.outstandingAmount || "");
      setInterestRate(data.interestRate || ""); setEmiAmount(data.emiAmount || "");
      setEmiFrequency(data.emiFrequency || "Monthly"); setTenureMonths(data.tenureMonths || "");
      setStartDate(data.startDate || ""); setEndDate(data.endDate || "");
      setHasLinkedAsset(data.hasLinkedAsset || false); setLinkedAccountId(data.linkedAccountId || "");
      setAutoCreateExpense(data.autoCreateExpense !== false);
      if (location.state?.newAssetId) {
        fetchAssets().then(() => { setLinkedAssetId(location.state.newAssetId); setHasLinkedAsset(true); });
      }
    }
  }, [location.state]);

  const fetchAssets = async () => {
    try { const r = await axios.get(`${backendUrl}/api/assets`); setAssets(r.data); return r.data; } catch (e) { return []; }
  };
  const fetchAccounts = async () => {
    try { const r = await axios.get(`${backendUrl}/api/accounts`); setAccounts(r.data); } catch (e) {}
  };
  const fetchFamilyMembers = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/family`, { withCredentials: true });
      const family = res.data?.family || res.data;
      if (family?.members) setFamilyMembers(family.members.filter(m => m.role !== "owner"));
    } catch {}
  };

  const fetchLoanData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/loans/${id}`);
      const data = response.data;
      setLoanType(data.loanType || ""); setLoanName(data.loanName || ""); setLenderName(data.lenderName || "");
      setPrincipalAmount(data.principalAmount?.toString() || ""); setOutstandingAmount(data.outstandingAmount?.toString() || "");
      setInterestRate(data.interestRate?.toString() || ""); setEmiAmount(data.emiAmount?.toString() || "");
      setEmiFrequency(data.emiFrequency || "Monthly"); setTenureMonths(data.tenureMonths?.toString() || "");
      setStartDate(data.startDate || ""); setEndDate(data.endDate || "");
      setLinkedAssetId(data.linkedAssetId || ""); setHasLinkedAsset(!!data.linkedAssetId);
      setLinkedAccountId(data.linkedAccountId || ""); setAutoCreateExpense(data.autoCreateExpense !== false);
      try { const lr = await axios.get(`${backendUrl}/api/loans/${id}/linked-assets`); setReverseLinkedAssets(lr.data || []); } catch {}
    } catch (error) { setErrors({ submit: "Failed to load loan data" }); }
    finally { setLoading(false); }
  };

  // Auto-calculate EMI
  useEffect(() => {
    const p = parseFloat(principalAmount) || 0;
    const r = (parseFloat(interestRate) || 0) / 12 / 100;
    const n = parseInt(tenureMonths) || 0;
    if (p > 0 && r > 0 && n > 0) { const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); setEmiAmount(emi.toFixed(2)); }
  }, [principalAmount, interestRate, tenureMonths]);

  // Auto-calculate outstanding
  useEffect(() => {
    if (!principalAmount || !startDate || !emiAmount || !interestRate) return;
    const p = parseFloat(principalAmount) || 0; const emi = parseFloat(emiAmount) || 0;
    const monthlyRate = (parseFloat(interestRate) || 0) / 12 / 100;
    if (p <= 0 || emi <= 0) return;
    const start = new Date(startDate); const now = new Date();
    const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const emiPaid = Math.max(0, monthsDiff);
    if (emiPaid === 0) { setOutstandingAmount(p.toFixed(2)); return; }
    let balance = p;
    for (let i = 0; i < emiPaid && balance > 0; i++) { balance = Math.max(0, balance - (emi - balance * monthlyRate)); }
    setOutstandingAmount(balance.toFixed(2));
  }, [principalAmount, startDate, emiAmount, interestRate]);

  // Auto-calculate end date
  useEffect(() => {
    if (!endDateManuallySet && startDate && tenureMonths) {
      const start = new Date(startDate); const tenure = parseInt(tenureMonths) || 0;
      if (tenure > 0) { start.setMonth(start.getMonth() + tenure); setEndDate(start.toISOString().split('T')[0]); }
    }
    if (!tenureMonths && !endDateManuallySet) setEndDate("");
  }, [startDate, tenureMonths, endDateManuallySet]);

  const handleEndDateChange = (date) => { setEndDate(date); setEndDateManuallySet(true); };
  const handleTenureChange = (e) => { setTenureMonths(formatAmountInput(e.target.value)); setEndDateManuallySet(false); };
  const handleAmountChange = (setter) => (e) => { setter(formatAmountInput(e.target.value)); };

  const handleAddAsset = () => {
    const formData = { loanType, loanName, lenderName, principalAmount, outstandingAmount, interestRate, emiAmount, emiFrequency, tenureMonths, startDate, endDate, hasLinkedAsset: true, linkedAccountId, autoCreateExpense };
    navigate('/asset', { state: { returnTo: id ? `/loan/${id}` : '/loan', loanFormData: formData, fromLoanFlow: true } });
  };

  // Clear field errors in real-time
  useEffect(() => { if (loanType && errors.loanType) setErrors(prev => { const n = {...prev}; delete n.loanType; return n; }); }, [loanType]);
  useEffect(() => { if (loanName && errors.loanName) setErrors(prev => { const n = {...prev}; delete n.loanName; return n; }); }, [loanName]);
  useEffect(() => { if (principalAmount && errors.principalAmount) setErrors(prev => { const n = {...prev}; delete n.principalAmount; return n; }); }, [principalAmount]);
  useEffect(() => { if (outstandingAmount && errors.outstandingAmount) setErrors(prev => { const n = {...prev}; delete n.outstandingAmount; return n; }); }, [outstandingAmount]);
  useEffect(() => { if (interestRate && errors.interestRate) setErrors(prev => { const n = {...prev}; delete n.interestRate; return n; }); }, [interestRate]);
  useEffect(() => { if (emiAmount && errors.emiAmount) setErrors(prev => { const n = {...prev}; delete n.emiAmount; return n; }); }, [emiAmount]);
  useEffect(() => { if (startDate && errors.startDate) setErrors(prev => { const n = {...prev}; delete n.startDate; return n; }); }, [startDate]);
  useEffect(() => { if (endDate && errors.endDate) setErrors(prev => { const n = {...prev}; delete n.endDate; return n; }); }, [endDate]);

  // ─── PER-STEP VALIDATION ───
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!loanType) newErrors.loanType = "Please select a loan type.";
      const nameError = validateTextField(loanName, "Loan name", 100);
      if (nameError) newErrors.loanName = nameError;
      if (isLoanNameUnique === false) newErrors.loanName = loanNameUniqueError || "An entry with this name already exists.";
    }
    if (s === 2) {
      const pe = validatePositiveAmount(principalAmount, "Principal amount"); if (pe) newErrors.principalAmount = pe;
      if (!outstandingAmount || parseFloat(outstandingAmount) < 0) newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
      else { const oe = validateLoanOutstanding(outstandingAmount, principalAmount); if (oe) newErrors.outstandingAmount = oe; }
      const re = validatePositiveAmount(interestRate, "Interest rate"); if (re) newErrors.interestRate = re;
      const ee = validatePositiveAmount(emiAmount, "EMI amount"); if (ee) newErrors.emiAmount = ee;
    }
    if (s === 3) {
      if (!startDate) newErrors.startDate = "Start date is required.";
      if (startDate && endDate) { const de = validateDateRange(startDate, endDate, "Start Date", "End Date"); if (de) newErrors.endDate = de; }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = () => {
    const newErrors = {};
    if (!loanType) newErrors.loanType = "Please select a loan type.";
    const nameError = validateTextField(loanName, "Loan name", 100); if (nameError) newErrors.loanName = nameError;
    if (isLoanNameUnique === false) newErrors.loanName = loanNameUniqueError || "An entry with this name already exists.";
    const pe = validatePositiveAmount(principalAmount, "Principal amount"); if (pe) newErrors.principalAmount = pe;
    if (!outstandingAmount || parseFloat(outstandingAmount) < 0) newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
    else { const oe = validateLoanOutstanding(outstandingAmount, principalAmount); if (oe) newErrors.outstandingAmount = oe; }
    const re = validatePositiveAmount(interestRate, "Interest rate"); if (re) newErrors.interestRate = re;
    const ee = validatePositiveAmount(emiAmount, "EMI amount"); if (ee) newErrors.emiAmount = ee;
    if (!startDate) newErrors.startDate = "Start date is required.";
    if (startDate && endDate) { const de = validateDateRange(startDate, endDate, "Start Date", "End Date"); if (de) newErrors.endDate = de; }
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
        loanType, loanName, lenderName: lenderName || null,
        principalAmount: parseFloat(principalAmount), outstandingAmount: parseFloat(outstandingAmount),
        interestRate: parseFloat(interestRate), emiAmount: parseFloat(emiAmount), emiFrequency,
        tenureMonths: parseInt(tenureMonths) || null, startDate, endDate: endDate || null,
        linkedAssetId: linkedAssetId || null, linkedAccountId: linkedAccountId || null, autoCreateExpense,
        sharedWithMembers: isShared ? sharedMembers.filter(sm => sm.memberId) : null,
      };
      let savedLoanId = id;
      if (id) await axios.put(`${backendUrl}/api/loans/${id}`, payload);
      else { const r = await axios.post(`${backendUrl}/api/loans`, payload); savedLoanId = r.data.id; }
      if (location.state?.returnTo && location.state?.assetFormData) {
        navigate(location.state.returnTo, { state: { assetFormData: location.state.assetFormData, newLoanId: savedLoanId } });
      } else {
        fireConfetti();
        setTimeout(() => navigate("/my-loans"), 400);
      }
    } catch (error) { setErrors({ submit: "Failed to save. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true); setShowDeleteConfirm(false);
    try { await axios.delete(`${backendUrl}/api/loans/${id}`); navigate("/my-loans"); }
    catch (error) { setErrors({ submit: "Failed to delete. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  const formatAmount = (amount) => new Intl.NumberFormat('en-IN').format(amount);

  // Shared styles
  const inputCls = "w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20";
  const inputStyle = (err) => ({ backgroundColor: "var(--bg-subtle)", borderColor: err ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" });
  const labelCls = "block text-sm font-medium mb-2";
  const labelStyle = { color: "var(--text-primary)" };
  const mutedStyle = { color: "var(--text-muted)" };

  // ─── STEP 1: Type & Name ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-type">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Loan & Lender Name</p>
        <p className="text-xs mt-1" style={mutedStyle}>Basic loan identification</p>
      </div>
      {!isTypeLocked && (
        <div>
          <label className={labelCls} style={labelStyle}>Loan Type</label>
          <select value={loanType} onChange={(e) => setLoanType(e.target.value)}
            className={inputCls} style={inputStyle(errors.loanType)} data-testid="loan-type-select">
            <option value="">Select Loan Type</option>
            {loanTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          {errors.loanType && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.loanType}</p>}
        </div>
      )}
      <div>
        <label className={labelCls} style={labelStyle}>Loan Name</label>
        <div className="relative">
          <input type="text" value={loanName} onChange={(e) => { setLoanName(e.target.value); if (errors.loanName) setErrors(prev => ({...prev, loanName: null})); }}
            onBlur={() => checkLoanNameUnique(loanName)} placeholder="e.g., HDFC Home Loan" maxLength={50}
            className={`${inputCls} pr-10`}
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.loanName || loanNameUniqueError ? "var(--status-error)" : isLoanNameUnique === true && loanName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="loan-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingLoanName && <Loader2 className="h-5 w-5 animate-spin" style={mutedStyle} />}
            {!isCheckingLoanName && isLoanNameUnique === true && loanName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.loanName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.loanName}</p>}
        {!errors.loanName && loanNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{loanNameUniqueError}</p>}
        {!errors.loanName && !loanNameUniqueError && isLoanNameUnique === true && loanName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Lender Name <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <input type="text" value={lenderName} onChange={(e) => setLenderName(e.target.value)} placeholder="e.g., HDFC Bank" maxLength={50}
          className={inputCls} style={inputStyle()} data-testid="lender-name-input" />
      </div>
    </div>
  );

  // ─── STEP 2: Amounts ───
  const step2Content = (
    <div className="space-y-6" data-testid="step-2-amounts">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Loan Amounts</p>
        <p className="text-xs mt-1" style={mutedStyle}>Principal, outstanding, rate & EMI</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Principal Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={principalAmount} onChange={handleAmountChange(setPrincipalAmount)} placeholder="0"
            className={`${inputCls} pl-10`} style={inputStyle(errors.principalAmount)} data-testid="principal-amount-input" />
        </div>
        {parseFloat(principalAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(principalAmount))}</p>}
        {errors.principalAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.principalAmount}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Current Outstanding Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={outstandingAmount} onChange={handleAmountChange(setOutstandingAmount)} placeholder="Auto-calculated"
            className={`${inputCls} pl-10`} style={inputStyle(errors.outstandingAmount)} data-testid="outstanding-amount-input" />
        </div>
        {parseFloat(outstandingAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(outstandingAmount))}</p>}
        {errors.outstandingAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.outstandingAmount}</p>}
        <p className="text-xs mt-1" style={mutedStyle}>This affects your Net Worth calculation</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Interest Rate (% per annum)</label>
        <div className="relative">
          <input type="text" value={interestRate} onChange={handleAmountChange(setInterestRate)} placeholder="e.g., 8.5"
            className={`${inputCls} pr-10`} style={inputStyle(errors.interestRate)} data-testid="interest-rate-input" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2" style={mutedStyle}>%</span>
        </div>
        {errors.interestRate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.interestRate}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Tenure (Months) <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <input type="text" value={tenureMonths} onChange={handleTenureChange} placeholder="e.g., 240"
          className={inputCls} style={inputStyle()} data-testid="tenure-input" />
        {tenureMonths && parseInt(tenureMonths) > 0 && <p className="text-xs mt-1" style={mutedStyle}>{Math.floor(parseInt(tenureMonths) / 12)} years {parseInt(tenureMonths) % 12} months</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>EMI Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={emiAmount} onChange={handleAmountChange(setEmiAmount)} placeholder="Auto-calculated"
            className={`${inputCls} pl-10`} style={inputStyle(errors.emiAmount)} data-testid="emi-amount-input" />
        </div>
        {parseFloat(emiAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(emiAmount))}</p>}
        {errors.emiAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.emiAmount}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>EMI Frequency</label>
        <select value={emiFrequency} onChange={(e) => setEmiFrequency(e.target.value)}
          className={inputCls} style={inputStyle()} data-testid="emi-frequency-select">
          {emiFrequencyOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    </div>
  );

  // ─── STEP 3: Schedule ───
  const step3Content = (
    <div className="space-y-6" data-testid="step-3-schedule">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Loan Schedule</p>
        <p className="text-xs mt-1" style={mutedStyle}>Start and end dates</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Loan Start Date</label>
        <RestrictedDatePicker value={startDate} onChange={(date) => { setStartDate(date); if (endDate && date > endDate) setEndDate(""); }}
          maxDate={today} placeholder="Select start date" error={!!errors.startDate} testId="start-date-input" />
        {errors.startDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.startDate}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Loan End Date <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <RestrictedDatePicker value={endDate} onChange={handleEndDateChange} minDate={startDate || undefined}
          placeholder="Select end date" error={!!errors.endDate} testId="end-date-input" />
        {errors.endDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.endDate}</p>}
        <p className="text-xs mt-1" style={mutedStyle}>{endDateManuallySet ? "Manually set (override)" : "Auto-calculated from start date + tenure"}</p>
      </div>
    </div>
  );

  // ─── STEP 4: Linking & Options ───
  const step4Content = (
    <div className="space-y-6" data-testid="step-4-options">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={labelStyle}>Linking & Options</p>
        <p className="text-xs mt-1" style={mutedStyle}>Link assets, accounts, and more</p>
      </div>
      {/* Linked Asset */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Is This Loan For An Asset?</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>E.g., Home loan, Vehicle loan</p>
          </div>
          <button type="button" onClick={() => { setHasLinkedAsset(!hasLinkedAsset); if (hasLinkedAsset) setLinkedAssetId(""); }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasLinkedAsset ? "bg-[#00D09C]" : "bg-gray-300"}`}
            data-testid="has-linked-asset-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasLinkedAsset ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {hasLinkedAsset && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <label className={labelCls} style={labelStyle}>Select Linked Asset</label>
            {assets.length > 0 ? (
              <select value={linkedAssetId} onChange={(e) => setLinkedAssetId(e.target.value)}
                className={inputCls} style={inputStyle()} data-testid="linked-asset-select">
                <option value="">Select Asset</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.assetName} - {a.assetType}</option>)}
              </select>
            ) : (
              <div className="text-sm rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>No assets found.</div>
            )}
            <button type="button" onClick={handleAddAsset} className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: "#00D09C" }} data-testid="add-asset-link">
              <Plus className="h-4 w-4" /> Add New Asset
            </button>
          </div>
        )}
      </div>
      {/* Reverse-Linked Assets */}
      {id && reverseLinkedAssets.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "#F0F9FF", border: "1px solid #E0F2FE" }} data-testid="reverse-linked-assets">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5" style={{ color: "#0EA5E9" }} />
            <span className="text-sm font-semibold" style={{ color: "#0EA5E9" }}>Assets Financed by This Loan</span>
          </div>
          {reverseLinkedAssets.map((asset) => (
            <button key={asset.id} onClick={() => navigate(`/wealth/assets/${asset.id}`)}
              className="w-full flex items-center justify-between p-3 rounded-xl border mb-2" style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)" }}
              data-testid={`reverse-linked-asset-${asset.id}`}>
              <div className="flex items-center gap-3">
                {asset.assetType?.includes("Property") ? <Building2 className="h-5 w-5" style={{ color: "#0EA5E9" }} /> : <Home className="h-5 w-5" style={{ color: "#0EA5E9" }} />}
                <div><p className="text-sm font-medium" style={labelStyle}>{asset.assetName}</p><p className="text-xs" style={mutedStyle}>{asset.assetType}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: "#14B8A6" }}>₹ {formatAmount(asset.currentValue)}</span>
                <ExternalLink className="h-4 w-4" style={{ color: "#0EA5E9" }} />
              </div>
            </button>
          ))}
        </div>
      )}
      {/* Linked Account */}
      {accounts.length > 0 && (
        <div>
          <label className={labelCls} style={labelStyle}>EMI Debit Account <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}
            className={inputCls} style={inputStyle()} data-testid="linked-account-select">
            <option value="">Select Account (Optional)</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>)}
          </select>
        </div>
      )}
      {/* Auto Create Expense */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Auto Create EMI Expense</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>Automatically add EMI to your expense list</p>
          </div>
          <button type="button" onClick={() => setAutoCreateExpense(!autoCreateExpense)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCreateExpense ? "bg-[#00D09C]" : "bg-gray-300"}`}
            data-testid="auto-expense-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCreateExpense ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
      {/* Shared Loan */}
      {!id && familyMembers.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={labelStyle}>Share Loan with Family</p>
              <p className="text-[10px]" style={mutedStyle}>Both members become liable. Won't double-count in family view.</p>
            </div>
            <button type="button" onClick={() => { setIsShared(!isShared); if (isShared) setSharedMembers([]); }}
              className={`relative w-12 h-6 rounded-full transition-all ${isShared ? "bg-[#00D09C]" : "bg-gray-300"}`}
              data-testid="shared-loan-toggle">
              <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${isShared ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {isShared && (
            <div className="space-y-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
              {familyMembers.map((member) => {
                const existing = sharedMembers.find(sm => sm.memberId === member.id);
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
                    <input type="checkbox" checked={!!existing}
                      onChange={(e) => {
                        if (e.target.checked) setSharedMembers([...sharedMembers, { memberId: member.id, memberName: member.name, sharePercentage: 50 }]);
                        else setSharedMembers(sharedMembers.filter(sm => sm.memberId !== member.id));
                      }} className="w-4 h-4 rounded accent-[#00D09C]" data-testid={`share-member-${member.id}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={labelStyle}>{member.name}</p>
                      <p className="text-[10px]" style={mutedStyle}>{member.relationship}</p>
                    </div>
                    {existing && (
                      <div className="flex items-center gap-1">
                        <input type="number" min="1" max="99" value={existing.sharePercentage}
                          onChange={(e) => { const val = Math.min(99, Math.max(1, parseInt(e.target.value) || 50)); setSharedMembers(sharedMembers.map(sm => sm.memberId === member.id ? { ...sm, sharePercentage: val } : sm)); }}
                          className="w-14 text-center text-xs rounded-lg px-2 py-1.5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                          data-testid={`share-percentage-${member.id}`} />
                        <span className="text-xs" style={mutedStyle}>%</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {sharedMembers.length > 0 && <p className="text-[10px] text-center pt-1" style={mutedStyle}>Their share: {sharedMembers.map(sm => `${sm.memberName} (${sm.sharePercentage}%)`).join(", ")}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ─── EDIT MODE ───
  const accentColor = "#00D09C";
  const editModeContent = (
    <div className="space-y-8" data-testid="loan-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">1</span>Type & Name</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">2</span>Amounts</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">3</span>Schedule</h3>{step3Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#00D09C]/10 flex items-center justify-center text-xs font-bold text-[#00D09C]">4</span>Options</h3>{step4Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={labelStyle}>Confirm Changes</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to update this loan?</p>
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Loan?</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to delete "{loanName}"? This cannot be undone.</p>
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
      title={id ? "Edit Loan" : (isTypeLocked ? `Add ${loanType}` : "Add Loan")}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor={accentColor}
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate("/my-loans")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
      {step === 4 && step4Content}
    </WizardShell>
  );
};

export default LoanIncome;

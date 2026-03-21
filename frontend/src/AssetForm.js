import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { ChevronLeft, Trash2, Plus, Check, Loader2, AlertTriangle } from "lucide-react";
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
  validateNonNegativeAmount,
  validateTextField,
  validatePastOrTodayDate,
  validateInsuranceLink,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const AssetForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const prefilledType = searchParams.get('type') || '';
  const isTypeLocked = !!prefilledType && !id;
  
  // Form fields
  const [assetType, setAssetType] = useState(prefilledType);
  const [assetName, setAssetName] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [depreciationType, setDepreciationType] = useState("");
  const [isFinanced, setIsFinanced] = useState(false);
  const [linkedLoanId, setLinkedLoanId] = useState("");
  const [generatesIncome, setGeneratesIncome] = useState(false);
  const [linkedIncomeId, setLinkedIncomeId] = useState("");
  const [isInsured, setIsInsured] = useState(false);
  const [linkedInsuranceId, setLinkedInsuranceId] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [notes, setNotes] = useState("");
  
  // Income generation fields
  const [renterName, setRenterName] = useState("");
  const [rentalAmount, setRentalAmount] = useState("");
  const [securityDeposit, setSecurityDeposit] = useState("");
  const [rentalFrequency, setRentalFrequency] = useState("Monthly");
  
  // Available data for linking
  const [availableLoans, setAvailableLoans] = useState([]);
  const [availableInsurances, setAvailableInsurances] = useState([]);
  
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
    checkUniqueness: checkAssetNameUnique,
    isChecking: isCheckingAssetName,
    isUnique: isAssetNameUnique,
    error: assetNameUniqueError,
    reset: resetAssetNameCheck
  } = useEntityUniqueness({ collection: "assets", field: "assetName", excludeId: id || null });

  const assetTypes = [
    "Residential Property", "Commercial Property", "Land", "Vehicle",
    "Physical Gold", "Physical Silver", "Diamonds",
    "Business Asset", "Equipment / Machinery", "Other"
  ];

  const depreciationTypes = [
    { value: "Appreciating", label: "Appreciating (e.g., Property)" },
    { value: "Depreciating", label: "Depreciating (e.g., Vehicle)" },
    { value: "Market Driven", label: "Market Driven (e.g., Gold)" }
  ];

  // Auto-suggest depreciation type based on asset type
  useEffect(() => {
    if (!depreciationType) {
      if (assetType.includes("Property") || assetType === "Land") setDepreciationType("Appreciating");
      else if (assetType === "Vehicle" || assetType.includes("Equipment")) setDepreciationType("Depreciating");
      else if (assetType.includes("Gold") || assetType.includes("Silver") || assetType === "Diamonds") setDepreciationType("Market Driven");
    }
  }, [assetType]);

  useEffect(() => { fetchLoans(); fetchInsurances(); }, []);

  useEffect(() => {
    if (location.state?.assetFormData) {
      const data = location.state.assetFormData;
      setAssetType(data.assetType || ""); setAssetName(data.assetName || "");
      setPurchaseValue(data.purchaseValue || ""); setCurrentValue(data.currentValue || "");
      setPurchaseDate(data.purchaseDate || ""); setDepreciationType(data.depreciationType || "");
      setIsFinanced(data.isFinanced || false); setGeneratesIncome(data.generatesIncome || false);
      setIsInsured(data.isInsured || false); setAssetLocation(data.location || "");
      setNotes(data.notes || ""); setRenterName(data.renterName || "");
      setRentalAmount(data.rentalAmount || ""); setSecurityDeposit(data.securityDeposit || "");
      setRentalFrequency(data.rentalFrequency || "Monthly");
      if (location.state?.newLoanId) fetchLoans().then(() => { setLinkedLoanId(location.state.newLoanId); });
      if (location.state?.newInsuranceId) fetchInsurances().then(() => { setLinkedInsuranceId(location.state.newInsuranceId); setIsInsured(true); });
    }
  }, [location.state]);

  useEffect(() => { if (id) fetchAssetData(); }, [id]);

  const fetchLoans = async () => {
    try { const r = await axios.get(`${backendUrl}/api/loans`); setAvailableLoans(r.data); } catch (e) { console.error("Error fetching loans:", e); }
  };
  const fetchInsurances = async () => {
    try { const r = await axios.get(`${backendUrl}/api/insurances`); setAvailableInsurances(r.data || []); } catch (e) { setAvailableInsurances([]); }
  };

  const handleAddInsurance = () => {
    const formData = { assetType, assetName, purchaseValue, currentValue, purchaseDate, depreciationType, isFinanced, generatesIncome, isInsured: true, location: assetLocation, notes, renterName, rentalAmount, securityDeposit, rentalFrequency };
    navigate('/insurance', { state: { returnTo: '/asset', assetFormData: formData } });
  };

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/assets/${id}`);
      const data = response.data;
      setAssetType(data.assetType || ""); setAssetName(data.assetName || "");
      setPurchaseValue(data.purchaseValue?.toString() || ""); setCurrentValue(data.currentValue?.toString() || "");
      setPurchaseDate(data.purchaseDate || ""); setDepreciationType(data.depreciationType || "");
      setIsFinanced(data.isFinanced || false); setLinkedLoanId(data.linkedLoanId || "");
      setGeneratesIncome(data.generatesIncome || false); setLinkedIncomeId(data.linkedIncomeId || "");
      setIsInsured(data.isInsured || false); setLinkedInsuranceId(data.linkedInsuranceId || "");
      setAssetLocation(data.location || ""); setNotes(data.notes || "");
    } catch (error) { setErrors({ submit: "Failed to load asset data" }); }
    finally { setLoading(false); }
  };

  const handleAmountChange = (setter) => (e) => { setter(formatAmountInput(e.target.value)); };

  const isPropertyType = assetType.includes("Property") || assetType === "Land";

  // Clear field errors in real-time
  useEffect(() => { if (assetType && errors.assetType) setErrors(prev => { const n = {...prev}; delete n.assetType; return n; }); }, [assetType]);
  useEffect(() => { if (purchaseValue && errors.purchaseValue) setErrors(prev => { const n = {...prev}; delete n.purchaseValue; return n; }); }, [purchaseValue]);
  useEffect(() => { if (purchaseDate && errors.purchaseDate) setErrors(prev => { const n = {...prev}; delete n.purchaseDate; return n; }); }, [purchaseDate]);
  useEffect(() => { if (rentalAmount && errors.rentalAmount) setErrors(prev => { const n = {...prev}; delete n.rentalAmount; return n; }); }, [rentalAmount]);

  // ─── PER-STEP VALIDATION ───
  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      if (!assetType) newErrors.assetType = "Please select asset type.";
      const nameError = validateTextField(assetName, "Asset name", 100);
      if (nameError) newErrors.assetName = nameError;
      if (isAssetNameUnique === false) newErrors.assetName = assetNameUniqueError || "An entry with this name already exists.";
    }
    if (s === 2) {
      if (!purchaseValue || parseFloat(purchaseValue) <= 0) newErrors.purchaseValue = "Purchase value is required and must be greater than 0.";
      if (currentValue && parseFloat(currentValue) < 0) newErrors.currentValue = "Current market value cannot be negative.";
      if (purchaseDate) { const dateError = validatePastOrTodayDate(purchaseDate, "Purchase date"); if (dateError) newErrors.purchaseDate = dateError; }
    }
    if (s === 3) {
      if (generatesIncome) { const rentalError = validatePositiveAmount(rentalAmount, "Rental amount"); if (rentalError) newErrors.rentalAmount = rentalError; }
    }
    if (s === 4) {
      if (isInsured && !linkedInsuranceId) newErrors.linkedInsuranceId = "Please select an insurance policy or turn off the insurance toggle to save.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validate = () => {
    const newErrors = {};
    if (!assetType) newErrors.assetType = "Please select asset type.";
    const nameError = validateTextField(assetName, "Asset name", 100); if (nameError) newErrors.assetName = nameError;
    if (isAssetNameUnique === false) newErrors.assetName = assetNameUniqueError || "An entry with this name already exists.";
    if (!purchaseValue || parseFloat(purchaseValue) <= 0) newErrors.purchaseValue = "Purchase value is required and must be greater than 0.";
    if (currentValue && parseFloat(currentValue) < 0) newErrors.currentValue = "Current market value cannot be negative.";
    if (purchaseDate) { const dateError = validatePastOrTodayDate(purchaseDate, "Purchase date"); if (dateError) newErrors.purchaseDate = dateError; }
    if (isInsured && !linkedInsuranceId) newErrors.linkedInsuranceId = "Please select an insurance policy or turn off the insurance toggle to save.";
    if (generatesIncome) { const rentalError = validatePositiveAmount(rentalAmount, "Rental amount"); if (rentalError) newErrors.rentalAmount = rentalError; }
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
      const finalCurrentValue = currentValue ? parseFloat(currentValue) : (purchaseValue ? parseFloat(purchaseValue) : 0);
      const payload = {
        assetType, assetName,
        purchaseValue: purchaseValue ? parseFloat(purchaseValue) : null,
        currentValue: finalCurrentValue, purchaseDate: purchaseDate || null,
        depreciationType: depreciationType || null, isFinanced,
        linkedLoanId: isFinanced && linkedLoanId ? linkedLoanId : null, generatesIncome,
        linkedIncomeId: generatesIncome && linkedIncomeId ? linkedIncomeId : null,
        incomeAmount: generatesIncome && rentalAmount ? parseFloat(rentalAmount) : null,
        incomeFrequency: generatesIncome ? rentalFrequency : null,
        renterName: generatesIncome ? renterName : null,
        securityDeposit: generatesIncome && securityDeposit ? parseFloat(securityDeposit) : null,
        isInsured, linkedInsuranceId: isInsured && linkedInsuranceId ? linkedInsuranceId : null,
        location: assetLocation || null, notes: notes || null,
      };
      if (id) { await axios.put(`${backendUrl}/api/assets/${id}`, payload); }
      else {
        const response = await axios.post(`${backendUrl}/api/assets`, payload);
        const savedAssetId = response.data?.id;
        if (location.state?.fromLoanFlow && location.state?.loanFormData) {
          navigate(location.state.returnTo || '/loan', { state: { loanFormData: location.state.loanFormData, newAssetId: savedAssetId } });
          return;
        }
      }
      fireConfetti();
      setTimeout(() => navigate("/my-assets"), 400);
    } catch (error) { setErrors({ submit: "Failed to save. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true); setShowDeleteConfirm(false);
    try { await axios.delete(`${backendUrl}/api/assets/${id}`); navigate("/my-assets"); }
    catch (error) { setErrors({ submit: "Failed to delete. Please try again." }); }
    finally { setIsSubmitting(false); }
  };

  const handleBack = () => {
    if (location.state?.fromLoanFlow && location.state?.loanFormData) navigate(location.state.returnTo || '/loan', { state: { loanFormData: location.state.loanFormData } });
    else navigate("/my-assets");
  };

  // ─── SHARED STYLES ───
  const inputCls = "w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20";
  const inputStyle = (err) => ({ backgroundColor: "var(--bg-subtle)", borderColor: err ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" });
  const labelCls = "block text-sm font-medium mb-2";
  const labelStyle = { color: "var(--text-primary)" };
  const mutedStyle = { color: "var(--text-muted)" };

  // ─── STEP 1: Type & Name ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-type">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Asset Type & Name</p>
        <p className="text-xs mt-1" style={mutedStyle}>What kind of asset is this?</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Asset Type *</label>
        {isTypeLocked ? (
          <div className="flex items-center gap-2 rounded-xl border px-4 py-3" style={{ backgroundColor: "#14B8A610", borderColor: "#14B8A6", color: "#14B8A6" }} data-testid="type-locked">
            <span className="font-semibold text-sm">{assetType}</span>
          </div>
        ) : (
          <>
            <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
              className={inputCls} style={inputStyle(errors.assetType)} data-testid="asset-type-select">
              <option value="">Select Asset Type</option>
              {assetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            {errors.assetType && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.assetType}</p>}
          </>
        )}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Asset Name *</label>
        <div className="relative">
          <input type="text" value={assetName}
            onChange={(e) => { setAssetName(e.target.value); if (errors.assetName) setErrors(prev => ({...prev, assetName: null})); }}
            onBlur={() => checkAssetNameUnique(assetName)}
            placeholder="e.g., Green Villa – Flat 302, Honda City 2020" maxLength={100}
            className={`${inputCls} pr-10`}
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.assetName || assetNameUniqueError ? "var(--status-error)" : isAssetNameUnique === true && assetName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="asset-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingAssetName && <Loader2 className="h-5 w-5 animate-spin" style={mutedStyle} />}
            {!isCheckingAssetName && isAssetNameUnique === true && assetName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.assetName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.assetName}</p>}
        {!errors.assetName && assetNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{assetNameUniqueError}</p>}
        {!errors.assetName && !assetNameUniqueError && isAssetNameUnique === true && assetName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
    </div>
  );

  // ─── STEP 2: Valuation ───
  const step2Content = (
    <div className="space-y-6" data-testid="step-2-valuation">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Valuation</p>
        <p className="text-xs mt-1" style={mutedStyle}>Purchase price and current market value</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Purchase Value *</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={purchaseValue} onChange={handleAmountChange(setPurchaseValue)} placeholder="0"
            className={`${inputCls} pl-10`} style={inputStyle(errors.purchaseValue)} data-testid="purchase-value-input" />
        </div>
        {parseFloat(purchaseValue) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(purchaseValue))}</p>}
        {errors.purchaseValue && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.purchaseValue}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Current Market Value <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={labelStyle}>₹</span>
          <input type="text" value={currentValue} onChange={handleAmountChange(setCurrentValue)}
            placeholder={purchaseValue ? purchaseValue : "0"}
            className={`${inputCls} pl-10`} style={inputStyle(errors.currentValue)} data-testid="current-value-input" />
        </div>
        {parseFloat(currentValue) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(currentValue))}</p>}
        {errors.currentValue && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.currentValue}</p>}
        <p className="text-xs mt-1" style={mutedStyle}>{currentValue ? "This feeds into your Net Worth calculation" : "Leave blank to use Purchase Value for Net Worth"}</p>
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Purchase Date <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <RestrictedDatePicker value={purchaseDate} onChange={(date) => setPurchaseDate(date)}
          maxDate={today} placeholder="Select purchase date" error={!!errors.purchaseDate} testId="purchase-date-input" />
        {errors.purchaseDate && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.purchaseDate}</p>}
      </div>
      <div>
        <label className={labelCls} style={labelStyle}>Value Trend <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <select value={depreciationType} onChange={(e) => setDepreciationType(e.target.value)}
          className={inputCls} style={inputStyle()} data-testid="depreciation-type-select">
          <option value="">Select Value Trend</option>
          {depreciationTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>
    </div>
  );

  // ─── STEP 3: Income & Financing ───
  const step3Content = (
    <div className="space-y-6" data-testid="step-3-finance">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Financing & Income</p>
        <p className="text-xs mt-1" style={mutedStyle}>Loan linked? Generates rental income?</p>
      </div>
      {/* Financed Toggle */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Is This Asset Financed?</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>Link to a loan for net worth calculation</p>
          </div>
          <button type="button" onClick={() => setIsFinanced(!isFinanced)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFinanced ? "bg-[#F59E0B]" : "bg-gray-300"}`}
            data-testid="is-financed-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFinanced ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {isFinanced && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <label className={labelCls} style={labelStyle}>Select Linked Loan</label>
            <select value={linkedLoanId} onChange={(e) => setLinkedLoanId(e.target.value)}
              className={inputCls} style={inputStyle()} data-testid="linked-loan-select">
              <option value="">Select a Loan</option>
              {availableLoans.map((loan) => (
                <option key={loan.id} value={loan.id}>{loan.loanName} - ₹{new Intl.NumberFormat('en-IN').format(loan.outstandingAmount)}</option>
              ))}
            </select>
            <button type="button" onClick={() => navigate("/loan", { state: { returnTo: id ? `/asset/${id}` : '/asset', assetFormData: { assetType, assetName, purchaseValue, currentValue, purchaseDate, depreciationType, isFinanced, generatesIncome, isInsured, location: assetLocation, notes } } })}
              className="mt-3 flex items-center gap-2 text-sm font-medium" style={{ color: "#F59E0B" }} data-testid="add-loan-link">
              <Plus className="h-4 w-4" /> Add New Loan
            </button>
          </div>
        )}
      </div>
      {/* Generates Income Toggle */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Does This Asset Generate Income?</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>E.g., Rental income from property</p>
          </div>
          <button type="button" onClick={() => setGeneratesIncome(!generatesIncome)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${generatesIncome ? "bg-[#14B8A6]" : "bg-gray-300"}`}
            data-testid="generates-income-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${generatesIncome ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {generatesIncome && (
          <div className="mt-4 pt-4 space-y-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <div>
              <label className={labelCls} style={labelStyle}>Renter Name <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
              <input type="text" value={renterName} onChange={(e) => setRenterName(e.target.value)} placeholder="Enter renter's name"
                className={inputCls} style={inputStyle()} data-testid="renter-name-input" />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Rental Amount *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={mutedStyle}>₹</span>
                <input type="text" value={rentalAmount} onChange={(e) => setRentalAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                  className={`${inputCls} pl-10`} style={inputStyle(errors.rentalAmount)} data-testid="rental-amount-input" />
              </div>
              {parseFloat(rentalAmount) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(rentalAmount))}</p>}
              {errors.rentalAmount && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.rentalAmount}</p>}
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Security Deposit <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={mutedStyle}>₹</span>
                <input type="text" value={securityDeposit} onChange={(e) => setSecurityDeposit(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
                  className={`${inputCls} pl-10`} style={inputStyle()} data-testid="security-deposit-input" />
              </div>
              {parseFloat(securityDeposit) > 0 && <p className="mt-1.5 text-xs italic" style={mutedStyle}>{numberToWords(parseFloat(securityDeposit))}</p>}
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Rental Frequency</label>
              <select value={rentalFrequency} onChange={(e) => setRentalFrequency(e.target.value)}
                className={inputCls} style={inputStyle()} data-testid="rental-frequency-select">
                <option value="Daily">Daily</option><option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option>
                <option value="Half-Yearly">Half-Yearly</option><option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ─── STEP 4: Insurance & Notes ───
  const step4Content = (
    <div className="space-y-6" data-testid="step-4-extras">
      <div className="text-center mb-2">
        <p className="text-base font-semibold" style={labelStyle}>Insurance & Notes</p>
        <p className="text-xs mt-1" style={mutedStyle}>Optional coverage and details</p>
      </div>
      {/* Insurance Toggle */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium" style={labelStyle}>Is This Asset Insured?</label>
            <p className="text-xs mt-0.5" style={mutedStyle}>Link to an insurance policy</p>
          </div>
          <button type="button" onClick={() => setIsInsured(!isInsured)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isInsured ? "bg-[#6366F1]" : "bg-gray-300"}`}
            data-testid="is-insured-toggle">
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isInsured ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
        {isInsured && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls} style={labelStyle}>Select Insurance *</label>
              <button type="button" onClick={handleAddInsurance}
                className="flex items-center gap-1 text-xs font-medium" style={{ color: "#6366F1" }} data-testid="add-insurance-shortcut">
                <Plus className="h-3.5 w-3.5" /> Add Insurance
              </button>
            </div>
            {availableInsurances.length > 0 ? (
              <>
                <select value={linkedInsuranceId} onChange={(e) => { setLinkedInsuranceId(e.target.value); if (errors.linkedInsuranceId) setErrors(prev => ({...prev, linkedInsuranceId: null})); }}
                  className={inputCls} style={inputStyle(errors.linkedInsuranceId)} data-testid="linked-insurance-select">
                  <option value="">Select an Insurance Policy</option>
                  {availableInsurances.map((ins) => <option key={ins.id} value={ins.id}>{ins.policyName}</option>)}
                </select>
                {errors.linkedInsuranceId && (
                  <p className="text-sm mt-1 flex items-center gap-1" style={{ color: "var(--status-error)" }}>
                    <AlertTriangle className="h-4 w-4" />{errors.linkedInsuranceId}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className={`text-sm rounded-xl px-4 py-3 text-center ${errors.linkedInsuranceId ? "border" : ""}`}
                  style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", borderColor: errors.linkedInsuranceId ? "var(--status-error)" : "transparent" }}>
                  No insurance policies found. Click "Add Insurance" to create one.
                </div>
                {errors.linkedInsuranceId && (
                  <p className="text-sm flex items-center gap-1" style={{ color: "var(--status-error)" }}>
                    <AlertTriangle className="h-4 w-4" />{errors.linkedInsuranceId}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Location (for Property) */}
      {isPropertyType && (
        <div>
          <label className={labelCls} style={labelStyle}>Location <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
          <input type="text" value={assetLocation} onChange={(e) => setAssetLocation(e.target.value)}
            placeholder="e.g., Mumbai, Andheri West" maxLength={100}
            className={inputCls} style={inputStyle()} data-testid="location-input" />
        </div>
      )}
      {/* Notes */}
      <div>
        <label className={labelCls} style={labelStyle}>Notes <span className="text-xs font-normal" style={mutedStyle}>(Optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3}
          className={`${inputCls} resize-none`} style={inputStyle()} data-testid="notes-input" />
      </div>
    </div>
  );

  // ─── EDIT MODE ───
  const accentColor = "#14B8A6";
  const editModeContent = (
    <div className="space-y-8" data-testid="asset-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">1</span>Type & Name</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">2</span>Valuation</h3>{step2Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">3</span>Financing & Income</h3>{step3Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={mutedStyle}><span className="w-6 h-6 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-xs font-bold text-[#14B8A6]">4</span>Insurance & Notes</h3>{step4Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={labelStyle}>Confirm Changes</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to update this asset?</p>
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Asset?</h3>
            <p className="mb-6" style={mutedStyle}>Are you sure you want to delete "{assetName}"? This cannot be undone.</p>
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
      title={id ? "Edit Asset" : "Add Asset"}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor={accentColor}
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => handleBack()}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
      {step === 4 && step4Content}
    </WizardShell>
  );
};

export default AssetForm;

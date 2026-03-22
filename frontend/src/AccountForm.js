import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import axios from "axios";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { numberToWords } from "@/lib/formatters";
import { ValidationMessage } from "@/components/ValidationMessage";
import { 
  validatePositiveAmount, 
  validateNonNegativeAmount,
  validateTextField,
  validateCreditCardOutstanding,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";
import API_BASE from './utils/apiConfig';

const AccountForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  
  // Form fields
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState(searchParams.get("type") || "");
  const isTypeLocked = !!(searchParams.get("type")) && !id;
  const [currentBalance, setCurrentBalance] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [notes, setNotes] = useState("");
  
  // Credit Card specific fields
  const [creditLimit, setCreditLimit] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minimumDue, setMinimumDue] = useState("");
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  const backendUrl = API_BASE;

  const accountTypeOptions = [
    "Cash",
    "Bank Account",
    "Wallet",
    "Others"
  ];

  useEffect(() => {
    if (id) {
      fetchAccountData();
    }
  }, [id]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/accounts/${id}`);
      const data = response.data;
      
      setAccountName(data.accountName || "");
      setAccountType(data.accountType || "");
      setCurrentBalance(data.currentBalance?.toString() || "");
      setAccountNumber(data.accountNumber || "");
      setIsPrimary(data.isPrimary || false);
      setNotes(data.notes || "");
      setCreditLimit(data.creditLimit?.toString() || "");
      setOutstandingAmount(data.outstandingAmount?.toString() || "");
      setDueDate(data.dueDate || "");
      setMinimumDue(data.minimumDue?.toString() || "");
    } catch (error) {
      console.error("Error fetching account data:", error);
      setErrors({ submit: "Failed to load account data" });
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (setter) => (e) => {
    const value = formatAmountInput(e.target.value);
    setter(value);
  };

  // Real-time validation for credit card fields
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    if (accountType === "Credit Card") {
      if (field === 'outstandingAmount' && creditLimit) {
        const outstandingError = validateCreditCardOutstanding(value, creditLimit);
        if (outstandingError) newErrors.outstandingAmount = outstandingError;
        else delete newErrors.outstandingAmount;
      }
    }
    
    setErrors(newErrors);
  };

  // Clear field errors in real-time when user fills data
  useEffect(() => { if (accountName && errors.accountName) setErrors(prev => { const n = {...prev}; delete n.accountName; return n; }); }, [accountName]);
  useEffect(() => { if (accountType && errors.accountType) setErrors(prev => { const n = {...prev}; delete n.accountType; return n; }); }, [accountType]);
  useEffect(() => { if (creditLimit && errors.creditLimit) setErrors(prev => { const n = {...prev}; delete n.creditLimit; return n; }); }, [creditLimit]);
  useEffect(() => { if ((currentBalance || currentBalance === "0") && errors.currentBalance) setErrors(prev => { const n = {...prev}; delete n.currentBalance; return n; }); }, [currentBalance]);

  const validate = () => {
    const newErrors = {};

    // Account Name validation
    const nameError = validateTextField(accountName, "Account name", 50);
    if (nameError) newErrors.accountName = nameError;

    // Account Type validation
    if (!accountType) {
      newErrors.accountType = "Please select account type.";
    }

    if (accountType === "Credit Card") {
      // Credit Limit validation
      const limitError = validatePositiveAmount(creditLimit, "Credit limit");
      if (limitError) newErrors.creditLimit = limitError;

      // Outstanding Amount validation (can be 0 but not negative)
      if (outstandingAmount && parseFloat(outstandingAmount) < 0) {
        newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
      } else if (outstandingAmount && creditLimit) {
        const outstandingError = validateCreditCardOutstanding(outstandingAmount, creditLimit);
        if (outstandingError) newErrors.outstandingAmount = outstandingError;
      }
    } else {
      // Opening Balance validation (can be 0 but not negative for non-credit cards)
      const balanceError = validateNonNegativeAmount(currentBalance, "Opening balance");
      if (balanceError && currentBalance !== "") newErrors.currentBalance = balanceError;
      else if (currentBalance === "") newErrors.currentBalance = "Opening balance is required.";
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
        accountName,
        accountType,
        currentBalance: accountType === "Credit Card" ? 0 : parseFloat(currentBalance) || 0,
        openingBalance: accountType === "Credit Card" ? 0 : parseFloat(currentBalance) || 0,
        accountNumber: accountNumber || null,
        isPrimary,
        notes: notes || null,
        // Credit Card specific
        creditLimit: accountType === "Credit Card" ? parseFloat(creditLimit) || 0 : null,
        outstandingAmount: accountType === "Credit Card" ? parseFloat(outstandingAmount) || 0 : null,
        dueDate: accountType === "Credit Card" && dueDate ? dueDate : null,
        minimumDue: accountType === "Credit Card" ? parseFloat(minimumDue) || 0 : null,
      };

      if (id) {
        await axios.put(`${backendUrl}/api/accounts/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/accounts`, payload);
      }
      
      fireConfetti();
      setTimeout(() => navigate("/my-accounts"), 400);
    } catch (error) {
      console.error("Error saving account:", error);
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
      await axios.delete(`${backendUrl}/api/accounts/${id}`);
      navigate("/my-accounts");
    } catch (error) {
      console.error("Error deleting account:", error);
      setErrors({ submit: "Failed to delete. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreditCard = accountType === "Credit Card";

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 2;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      const nameError = validateTextField(accountName, "Account name", 50);
      if (nameError) newErrors.accountName = nameError;
      if (!accountType) newErrors.accountType = "Please select an account type.";
    }
    if (s === 2) {
      if (isCreditCard) {
        const limitError = validatePositiveAmount(creditLimit, "Credit limit");
        if (limitError) newErrors.creditLimit = limitError;
        if (outstandingAmount && parseFloat(outstandingAmount) < 0) newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
        else if (outstandingAmount && creditLimit) { const err = validateCreditCardOutstanding(outstandingAmount, creditLimit); if (err) newErrors.outstandingAmount = err; }
      } else {
        const balanceError = validateNonNegativeAmount(currentBalance, "Opening balance");
        if (balanceError && currentBalance !== "") newErrors.currentBalance = balanceError;
        else if (currentBalance === "") newErrors.currentBalance = "Opening balance is required.";
      }
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-info">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Account Info</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Name and type of your account</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Account Name</label>
        <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="e.g., HDFC Savings, Office Cash" maxLength={50}
          className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.accountName ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="account-name-input" />
        {errors.accountName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.accountName}</p>}
      </div>
      {!isTypeLocked && (
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            {accountTypeOptions.map((opt) => (
              <button key={opt} type="button" onClick={() => setAccountType(opt)}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all active:scale-[0.97] ${accountType === opt ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6] ring-1 ring-[#3B82F6]/30" : ""}`}
                style={accountType !== opt ? { backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" } : {}}
                data-testid={`type-${opt.toLowerCase().replace(/\s+/g, '-')}`}>{opt}</button>
            ))}
          </div>
          {errors.accountType && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.accountType}</p>}
        </div>
      )}
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-balance">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{isCreditCard ? "Card Details" : "Balance & Details"}</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{isCreditCard ? "Credit card specifics" : "Set balance and preferences"}</p>
      </div>
      {isCreditCard ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Credit Limit</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
              <input type="text" value={creditLimit} onChange={handleAmountChange(setCreditLimit)} placeholder="0"
                className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.creditLimit ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
                data-testid="credit-limit-input" />
            </div>
            {parseFloat(creditLimit) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(creditLimit))}</p>}
            {errors.creditLimit && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.creditLimit}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Current Outstanding</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
              <input type="text" value={outstandingAmount} onChange={handleAmountChange(setOutstandingAmount)} placeholder="0"
                className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
                data-testid="outstanding-amount-input" />
            </div>
            {parseFloat(outstandingAmount) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(outstandingAmount))}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Due Date <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="due-date-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Minimum Due <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
              <input type="text" value={minimumDue} onChange={handleAmountChange(setMinimumDue)} placeholder="0"
                className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
                data-testid="minimum-due-input" />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>{id ? "Current Balance" : "Opening Balance"}</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
            <input type="text" value={currentBalance} onChange={handleAmountChange(setCurrentBalance)} placeholder="0"
              className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.currentBalance ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="current-balance-input" />
          </div>
          {parseFloat(currentBalance) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(currentBalance))}</p>}
          {errors.currentBalance && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.currentBalance}</p>}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Account Number <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Last 4 digits or full number" maxLength={20}
          className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="account-number-input" />
      </div>
      <div className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Primary Account</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Used for default transactions</p>
        </div>
        <button type="button" onClick={() => setIsPrimary(!isPrimary)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrimary ? "bg-[#3B82F6]" : "bg-gray-300"}`}
          data-testid="is-primary-toggle">
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPrimary ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Notes <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3}
          className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 resize-none"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="notes-input" />
      </div>
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="account-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-xs font-bold text-[#3B82F6]">1</span>Account Info</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-xs font-bold text-[#3B82F6]">2</span>Details</h3>{step2Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = (
    <>
      {showUpdateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Confirm Changes</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to update this account?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowUpdateConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={performSave} className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-3 text-white font-medium">Yes, Update</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Account?</h3>
            <p className="mb-6" style={{ color: "var(--text-muted)" }}>Are you sure you want to delete "{accountName}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-xl border px-4 py-3 font-medium" style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}>Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-white font-medium">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ─── RENDER ───

  return (
    <WizardShell
      title={id ? "Edit Account" : (isTypeLocked ? `Add ${accountType}` : "Add Account")}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={handleSave}
      onDelete={id ? () => setShowDeleteConfirm(true) : undefined}
      isEdit={!!id} isSubmitting={isSubmitting} accentColor="#3B82F6"
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate("/my-accounts")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
    </WizardShell>
  );
};

export default AccountForm;

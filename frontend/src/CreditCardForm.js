import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Check, Loader2, Trash2, ChevronRight, X } from "lucide-react";
import WizardShell from "@/components/WizardShell";
import { fireConfetti } from "@/lib/confetti";
import { numberToWords } from "@/lib/formatters";
import { ValidationMessage } from "@/components/ValidationMessage";
import { useEntityUniqueness } from "@/hooks/useEntityUniqueness";
import { 
  validatePositiveAmount, 
  validateNonNegativeAmount,
  validateTextField,
  validateCreditCardOutstanding,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const CreditCardForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  // Form fields
  const [cardName, setCardName] = useState("");
  const [bankName, setBankName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [minimumDue, setMinimumDue] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  
  // Available accounts for linking
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  // Entity uniqueness check for card name
  const {
    checkUniqueness: checkCardNameUnique,
    isChecking: isCheckingCardName,
    isUnique: isCardNameUnique,
    error: cardNameUniqueError,
    reset: resetCardNameCheck
  } = useEntityUniqueness({
    collection: "credit_cards",
    field: "cardName",
    excludeId: id || null
  });

  useEffect(() => {
    fetchAccounts();
    if (id) {
      fetchCardData();
    }
  }, [id]);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/accounts`);
      setAccounts(response.data.filter(a => a.accountType !== "Credit Card"));
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchCardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/credit-cards/${id}`);
      const data = response.data;
      setCardName(data.cardName || "");
      setBankName(data.bankName || "");
      setCreditLimit(data.creditLimit?.toString() || "");
      setOutstandingAmount(data.outstandingAmount?.toString() || "");
      setBillingDate(data.billingDate?.toString() || "");
      setDueDate(data.dueDate?.toString() || "");
      setMinimumDue(data.minimumDue?.toString() || "");
      setInterestRate(data.interestRate?.toString() || "");
      setLinkedAccountId(data.linkedAccountId || "");
    } catch (error) {
      console.error("Error fetching card data:", error);
      setErrors({ submit: "Failed to load card data" });
    } finally {
      setLoading(false);
    }
  };

  // Real-time validation for outstanding amount
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    
    if (field === 'outstandingAmount' && creditLimit) {
      const outstandingError = validateCreditCardOutstanding(value, creditLimit);
      if (outstandingError) newErrors.outstandingAmount = outstandingError;
      else delete newErrors.outstandingAmount;
    }
    
    setErrors(newErrors);
  };

  const validate = () => {
    const newErrors = {};
    
    // Card Name validation
    const nameError = validateTextField(cardName, "Card name", 50);
    if (nameError) newErrors.cardName = nameError;
    
    // Check uniqueness
    if (isCardNameUnique === false) {
      newErrors.cardName = cardNameUniqueError || "An entry with this name already exists.";
    }
    
    // Bank Name validation
    const bankError = validateTextField(bankName, "Bank name", 50);
    if (bankError) newErrors.bankName = bankError;
    
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
    
    // Interest Rate validation (if provided)
    if (interestRate && (isNaN(parseFloat(interestRate)) || parseFloat(interestRate) < 0)) {
      newErrors.interestRate = "Interest rate cannot be negative.";
    }
    
    setErrors(newErrors);
    
    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        cardName: cardName.trim(),
        bankName: bankName.trim(),
        creditLimit: parseFloat(creditLimit) || 0,
        outstandingAmount: parseFloat(outstandingAmount) || 0,
        billingDate: billingDate ? parseInt(billingDate) : null,
        dueDate: dueDate ? parseInt(dueDate) : null,
        minimumDue: parseFloat(minimumDue) || 0,
        interestRate: parseFloat(interestRate) || 0,
        linkedAccountId: linkedAccountId || null,
      };

      if (isEditing) {
        await axios.put(`${backendUrl}/api/credit-cards/${id}`, payload);
      } else {
        await axios.post(`${backendUrl}/api/credit-cards`, payload);
      }
      fireConfetti();
      setTimeout(() => navigate("/my-credit-cards"), 400);
    } catch (error) {
      console.error("Error saving credit card:", error);
      setErrors({ submit: "Failed to save credit card. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this credit card?")) return;
    
    setLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/credit-cards/${id}`);
      navigate("/my-credit-cards");
    } catch (error) {
      console.error("Error deleting credit card:", error);
      setErrors({ submit: "Failed to delete credit card" });
    } finally {
      setLoading(false);
    }
  };

  // Generate date options (1-31)
  const dateOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  // ─── WIZARD STEP MANAGEMENT ───
  const TOTAL_STEPS = 2;
  const [step, setStep] = useState(1);

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 1) {
      const nameError = validateTextField(cardName, "Card name", 50);
      if (nameError) newErrors.cardName = nameError;
      if (isCardNameUnique === false) newErrors.cardName = cardNameUniqueError || "A card with this name already exists.";
      const bankError = validateTextField(bankName, "Bank name", 50);
      if (bankError) newErrors.bankName = bankError;
    }
    if (s === 2) {
      const limitError = validatePositiveAmount(creditLimit, "Credit limit");
      if (limitError) newErrors.creditLimit = limitError;
      if (outstandingAmount && parseFloat(outstandingAmount) < 0) newErrors.outstandingAmount = "Outstanding amount cannot be negative.";
      else if (outstandingAmount && creditLimit) { const err = validateCreditCardOutstanding(outstandingAmount, creditLimit); if (err) newErrors.outstandingAmount = err; }
      if (interestRate && (isNaN(parseFloat(interestRate)) || parseFloat(interestRate) < 0)) newErrors.interestRate = "Interest rate cannot be negative.";
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) scrollToFirstError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(Math.min(step + 1, TOTAL_STEPS)); };
  const handlePrev = () => setStep(Math.max(step - 1, 1));

  // ─── STEP CONTENT ───
  const step1Content = (
    <div className="space-y-6" data-testid="step-1-card-info">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Card Info</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Basic card details</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Card Name</label>
        <div className="relative">
          <input type="text" value={cardName} onChange={(e) => { setCardName(e.target.value); if (errors.cardName) setErrors(prev => ({ ...prev, cardName: null })); }}
            onBlur={() => checkCardNameUnique(cardName)} placeholder="e.g., HDFC Regalia, ICICI Amazon Pay"
            className="w-full rounded-xl border px-4 py-3 pr-10 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.cardName || cardNameUniqueError ? "var(--status-error)" : isCardNameUnique === true && cardName.trim() ? "var(--status-success)" : "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="card-name-input" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isCheckingCardName && <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />}
            {!isCheckingCardName && isCardNameUnique === true && cardName.trim() && <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />}
          </div>
        </div>
        {errors.cardName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.cardName}</p>}
        {!errors.cardName && cardNameUniqueError && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{cardNameUniqueError}</p>}
        {!errors.cardName && !cardNameUniqueError && isCardNameUnique === true && cardName.trim() && <p className="text-sm mt-1" style={{ color: "var(--status-success)" }}>Name is available</p>}
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Bank Name</label>
        <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., HDFC Bank, ICICI Bank"
          className="w-full rounded-xl border px-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
          style={{ backgroundColor: "var(--bg-subtle)", borderColor: errors.bankName ? "var(--status-error)" : "var(--border-light)", color: "var(--text-primary)" }}
          data-testid="bank-name-input" />
        {errors.bankName && <p className="text-sm mt-1" style={{ color: "var(--status-error)" }}>{errors.bankName}</p>}
      </div>
    </div>
  );

  const step2Content = (
    <div className="space-y-6" data-testid="step-2-card-details">
      <div className="text-center mb-5">
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Card Details</p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Credit limits and billing info</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Credit Limit</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
          <input type="text" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
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
          <input type="text" value={outstandingAmount} onChange={(e) => setOutstandingAmount(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
            className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="outstanding-amount-input" />
        </div>
        {parseFloat(outstandingAmount) > 0 && <p className="mt-1.5 text-xs italic" style={{ color: "var(--text-muted)" }}>{numberToWords(parseFloat(outstandingAmount))}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Billing Date</label>
          <select value={billingDate} onChange={(e) => setBillingDate(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="billing-date-select">
            <option value="">Select</option>
            {dateOptions.map(day => <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Due Date</label>
          <select value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="due-date-select">
            <option value="">Select</option>
            {dateOptions.map(day => <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Min. Due <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(opt.)</span></label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-primary)" }}>₹</span>
            <input type="text" value={minimumDue} onChange={(e) => setMinimumDue(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0"
              className="w-full rounded-xl border pl-10 pr-4 py-3 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
              style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="minimum-due-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>APR % <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(opt.)</span></label>
          <div className="relative">
            <input type="text" value={interestRate} onChange={(e) => setInterestRate(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="e.g., 42"
              className="w-full rounded-xl border px-4 py-3 pr-10 placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
              style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
              data-testid="interest-rate-input" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-medium" style={{ color: "var(--text-muted)" }}>%</span>
          </div>
        </div>
      </div>
      {accounts.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Linked Bank Account <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>(for bill payment)</span></label>
          <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20"
            style={{ backgroundColor: "var(--bg-subtle)", borderColor: "var(--border-light)", color: "var(--text-primary)" }}
            data-testid="linked-account-select">
            <option value="">Select Account</option>
            {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.accountName} - {acc.accountType}</option>)}
          </select>
        </div>
      )}
    </div>
  );

  const editModeContent = (
    <div className="space-y-8" data-testid="credit-card-edit-all-fields">
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-xs font-bold text-[#F59E0B]">1</span>Card Info</h3>{step1Content}</div>
      <div><h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}><span className="w-6 h-6 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-xs font-bold text-[#F59E0B]">2</span>Details</h3>{step2Content}</div>
    </div>
  );

  const errorContent = errors.submit ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 mt-4">{errors.submit}</div> : null;

  const dialogContent = null;

  return (
    <WizardShell
      title={isEditing ? "Edit Credit Card" : "Add Credit Card"}
      step={step} totalSteps={TOTAL_STEPS}
      onNext={handleNext} onPrev={handlePrev} onSave={(e) => { if (e) e.preventDefault(); handleSubmit({ preventDefault: () => {} }); }}
      onDelete={isEditing ? handleDelete : undefined}
      isEdit={isEditing} isSubmitting={loading} accentColor="#F59E0B"
      editModeContent={editModeContent}
      errorContent={errorContent} dialogContent={dialogContent}
      onClose={() => navigate("/my-credit-cards")}
    >
      {step === 1 && step1Content}
      {step === 2 && step2Content}
    </WizardShell>
  );
};

export default CreditCardForm;

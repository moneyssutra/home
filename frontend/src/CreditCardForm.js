import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Check, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import AmountInput from "@/components/AmountInput";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
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
  const [showAddSheet, setShowAddSheet] = useState(false);

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
      navigate("/my-credit-cards");
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

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="credit-card-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <BackButton fallbackPath="/my-credit-cards" />
        <h1 className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {isEditing ? "Edit Credit Card" : "Add Credit Card"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto pb-32">
        <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Card Name */}
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-[#334155] mb-2">
                Card Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="cardName"
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g., HDFC Regalia, ICICI Amazon Pay"
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="card-name-input"
              />
              {errors.cardName && <p className="text-rose-500 text-xs mt-1">{errors.cardName}</p>}
            </div>

            {/* Bank Name */}
            <div>
              <label htmlFor="bankName" className="block text-sm font-medium text-[#334155] mb-2">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g., HDFC Bank, ICICI Bank"
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="bank-name-input"
              />
              {errors.bankName && <p className="text-rose-500 text-xs mt-1">{errors.bankName}</p>}
            </div>

            {/* Credit Limit */}
            <div>
              <label htmlFor="creditLimit" className="block text-sm font-medium text-[#334155] mb-2">
                Credit Limit <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">₹</span>
                <input
                  id="creditLimit"
                  type="text"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#334155] bg-[#1E293B] text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="credit-limit-input"
                />
              </div>
              {parseFloat(creditLimit) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic">{numberToWords(parseFloat(creditLimit))}</p>
              )}
              {errors.creditLimit && <p className="text-rose-500 text-xs mt-1">{errors.creditLimit}</p>}
            </div>

            {/* Current Outstanding */}
            <div>
              <label htmlFor="outstandingAmount" className="block text-sm font-medium text-[#334155] mb-2">
                Current Outstanding
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">₹</span>
                <input
                  id="outstandingAmount"
                  type="text"
                  value={outstandingAmount}
                  onChange={(e) => setOutstandingAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#334155] bg-[#1E293B] text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="outstanding-amount-input"
                />
              </div>
              {parseFloat(outstandingAmount) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic">{numberToWords(parseFloat(outstandingAmount))}</p>
              )}
            </div>

            {/* Billing Cycle Date */}
            <div>
              <label htmlFor="billingDate" className="block text-sm font-medium text-[#334155] mb-2">
                Billing Cycle Date
              </label>
              <select
                id="billingDate"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="billing-date-select"
              >
                <option value="">Select Date</option>
                {dateOptions.map(day => (
                  <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month</option>
                ))}
              </select>
              <p className="text-xs text-[#334155]/50 mt-1">Statement generation date</p>
            </div>

            {/* Payment Due Date */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-[#334155] mb-2">
                Payment Due Date
              </label>
              <select
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="due-date-select"
              >
                <option value="">Select Date</option>
                {dateOptions.map(day => (
                  <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month</option>
                ))}
              </select>
            </div>

            {/* Minimum Due */}
            <div>
              <label htmlFor="minimumDue" className="block text-sm font-medium text-[#334155] mb-2">
                Minimum Due <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">₹</span>
                <input
                  id="minimumDue"
                  type="text"
                  value={minimumDue}
                  onChange={(e) => setMinimumDue(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#334155] bg-[#1E293B] text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="minimum-due-input"
                />
              </div>
              {parseFloat(minimumDue) > 0 && (
                <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="minimum-due-words">
                  {numberToWords(parseFloat(minimumDue))}
                </p>
              )}
            </div>

            {/* Interest Rate */}
            <div>
              <label htmlFor="interestRate" className="block text-sm font-medium text-[#334155] mb-2">
                Interest Rate (APR %) <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="interestRate"
                  type="text"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="e.g., 42"
                  className="w-full px-4 py-3 pr-10 rounded-xl border border-[#334155] bg-[#1E293B] text-[#334155] placeholder-[#334155]/40 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                  data-testid="interest-rate-input"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#334155]/60 font-medium">%</span>
              </div>
            </div>

            {/* Linked Bank Account */}
            {accounts.length > 0 && (
              <div>
                <label htmlFor="linkedAccount" className="block text-sm font-medium text-[#334155] mb-2">
                  Linked Bank Account <span className="text-[#94A3B8] font-normal">(for bill payment)</span>
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

            {/* Error Message */}
            {errors.submit && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600">
                {errors.submit}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#14B8A6] py-4 text-center text-lg font-semibold text-white transition-all hover:bg-[#0D9488] active:scale-[0.98] disabled:opacity-50 shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
              data-testid="save-credit-card-button"
            >
              {loading ? "Saving..." : isEditing ? "Update Credit Card" : "Save Credit Card"}
            </button>
            
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full rounded-xl border border-rose-200 py-3 text-center font-medium text-rose-500 transition-all hover:bg-rose-50"
                data-testid="delete-credit-card-button"
              >
                Delete Credit Card
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default CreditCardForm;

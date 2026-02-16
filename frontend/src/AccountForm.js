import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Trash2 } from "lucide-react";
import axios from "axios";
import { numberToWords } from "@/lib/formatters";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { ValidationMessage } from "@/components/ValidationMessage";
import { 
  validatePositiveAmount, 
  validateNonNegativeAmount,
  validateTextField,
  validateCreditCardOutstanding,
  formatAmountInput,
  scrollToFirstError
} from "@/lib/validations";

const AccountForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  // Form fields
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");
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

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  const accountTypeOptions = [
    "Bank Account",
    "Cash",
    "Credit Card",
    "Digital Wallet",
    "UPI Wallet",
    "Brokerage Account",
    "Business Account",
    "Other"
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
    const value = e.target.value.replace(/[^0-9]/g, "");
    setter(value);
  };

  const validate = () => {
    const newErrors = {};

    if (!accountName.trim()) {
      newErrors.accountName = "Account name is required";
    }

    if (!accountType) {
      newErrors.accountType = "Please select account type";
    }

    if (accountType === "Credit Card") {
      if (!creditLimit || parseFloat(creditLimit) <= 0) {
        newErrors.creditLimit = "Credit limit is required";
      }
    } else {
      if (currentBalance === "" || parseFloat(currentBalance) < 0) {
        newErrors.currentBalance = "Opening balance is required";
      }
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
      
      navigate("/my-accounts");
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

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="account-form-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#1E293B] text-[#334155] transition-colors hover:bg-[#0F172A]"
          onClick={() => navigate("/my-accounts")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[32px] font-semibold tracking-tight text-[#334155]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          {id ? "Edit Account" : "Add Account"}
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="mx-auto w-full max-w-[620px] px-6">
          <div className="space-y-6">
            {/* Account Name */}
            <div className="w-full">
              <label htmlFor="accountName" className="block text-sm font-medium text-[#334155] mb-2">
                Account Name
              </label>
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., HDFC Savings, Office Cash"
                maxLength={50}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="account-name-input"
              />
              {errors.accountName && <p className="text-sm text-red-500 mt-1">{errors.accountName}</p>}
            </div>

            {/* Account Type */}
            <div className="w-full">
              <label htmlFor="accountType" className="block text-sm font-medium text-[#334155] mb-2">
                Account Type
              </label>
              <select
                id="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="account-type-select"
              >
                <option value="">Select Account Type</option>
                {accountTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.accountType && <p className="text-sm text-red-500 mt-1">{errors.accountType}</p>}
            </div>

            {/* Credit Card Fields */}
            {isCreditCard ? (
              <>
                {/* Credit Limit */}
                <div className="w-full">
                  <label htmlFor="creditLimit" className="block text-sm font-medium text-[#334155] mb-2">
                    Credit Limit
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="creditLimit"
                      type="text"
                      value={creditLimit}
                      onChange={handleAmountChange(setCreditLimit)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="credit-limit-input"
                    />
                  </div>
                  {parseFloat(creditLimit) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="credit-limit-words">
                      {numberToWords(parseFloat(creditLimit))}
                    </p>
                  )}
                  {errors.creditLimit && <p className="text-sm text-red-500 mt-1">{errors.creditLimit}</p>}
                </div>

                {/* Outstanding Amount */}
                <div className="w-full">
                  <label htmlFor="outstandingAmount" className="block text-sm font-medium text-[#334155] mb-2">
                    Current Outstanding
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="outstandingAmount"
                      type="text"
                      value={outstandingAmount}
                      onChange={handleAmountChange(setOutstandingAmount)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="outstanding-amount-input"
                    />
                  </div>
                  {parseFloat(outstandingAmount) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="outstanding-amount-words">
                      {numberToWords(parseFloat(outstandingAmount))}
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div className="w-full">
                  <label htmlFor="dueDate" className="block text-sm font-medium text-[#334155] mb-2">
                    Payment Due Date <span className="text-[#94A3B8] font-normal">(Optional)</span>
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="due-date-input"
                  />
                </div>

                {/* Minimum Due */}
                <div className="w-full">
                  <label htmlFor="minimumDue" className="block text-sm font-medium text-[#334155] mb-2">
                    Minimum Due <span className="text-[#94A3B8] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                    <input
                      id="minimumDue"
                      type="text"
                      value={minimumDue}
                      onChange={handleAmountChange(setMinimumDue)}
                      placeholder="0"
                      className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                      data-testid="minimum-due-input"
                    />
                  </div>
                  {parseFloat(minimumDue) > 0 && (
                    <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="minimum-due-words">
                      {numberToWords(parseFloat(minimumDue))}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* Regular Account - Opening Balance */
              <div className="w-full">
                <label htmlFor="currentBalance" className="block text-sm font-medium text-[#334155] mb-2">
                  {id ? "Current Balance" : "Opening Balance"}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
                  <input
                    id="currentBalance"
                    type="text"
                    value={currentBalance}
                    onChange={handleAmountChange(setCurrentBalance)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#334155] bg-[#1E293B] pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                    data-testid="current-balance-input"
                  />
                </div>
                {parseFloat(currentBalance) > 0 && (
                  <p className="mt-1.5 text-xs text-[#334155]/50 italic" data-testid="current-balance-words">
                    {numberToWords(parseFloat(currentBalance))}
                  </p>
                )}
                {errors.currentBalance && <p className="text-sm text-red-500 mt-1">{errors.currentBalance}</p>}
              </div>
            )}

            {/* Account Number (Optional) */}
            <div className="w-full">
              <label htmlFor="accountNumber" className="block text-sm font-medium text-[#334155] mb-2">
                Account Number <span className="text-[#94A3B8] font-normal">(Optional)</span>
              </label>
              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Last 4 digits or full number"
                maxLength={20}
                className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20"
                data-testid="account-number-input"
              />
            </div>

            {/* Is Primary Account Toggle */}
            <div className="w-full rounded-xl border border-[#334155] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#334155]">
                    Primary Account
                  </label>
                  <p className="text-xs text-[#334155]/60 mt-0.5">Used for default transactions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrimary(!isPrimary)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPrimary ? "bg-[#14B8A6]" : "bg-[#334155]"
                  }`}
                  data-testid="is-primary-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-[#1E293B] transition-transform ${
                      isPrimary ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

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
                {isSubmitting ? "Updating..." : "Update Account"}
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
              {isSubmitting ? "Saving..." : "Save Account"}
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
              Are you sure you want to update this account?
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
            <h3 className="text-xl font-semibold text-red-600 mb-3">Delete Account?</h3>
            <p className="text-[#334155]/70 mb-6">
              Are you sure you want to delete "{accountName}"? This action cannot be undone.
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

      {/* Bottom Navigation */}
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default AccountForm;

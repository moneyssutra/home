import { useState, useEffect, useRef } from "react";
import { X, CheckCircle } from "lucide-react";
import { numberToWords } from "@/lib/formatters";
import { toast } from "sonner";
import { format, parse, isValid } from "date-fns";

/**
 * Income Amount Modal - Streamlined modal for recording income transactions
 * Used for Variable income via notifications and "Add Today's Income" button
 * 
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: function - Close handler
 * - entityId: string - The ID of the income source
 * - entityName: string - Name of the income source
 * - expectedAmount: number - Expected amount for reference
 * - onSubmit: function - Async function to save the income transaction
 * - editingTransaction: object - Transaction being edited (optional)
 * - onUpdate: function - Async function to update existing transaction (optional)
 */
const IncomeAmountModal = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  expectedAmount = 0,
  onSubmit,
  editingTransaction = null,
  onUpdate
}) => {
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  
  const isEditing = !!editingTransaction;

  // Reset and focus when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingTransaction) {
        // Pre-fill for editing
        setAmount(editingTransaction.amount?.toString() || "");
        setTransactionDate(editingTransaction.transactionDate?.split('T')[0] || new Date().toISOString().split('T')[0]);
      } else {
        // Reset for new entry
        setAmount("");
        setTransactionDate(new Date().toISOString().split('T')[0]);
      }
      // Focus input after a short delay for animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, editingTransaction]);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setAmount(value);
  };

  const formatDisplayAmount = (value) => {
    if (!value) return "";
    return new Intl.NumberFormat("en-IN").format(parseInt(value));
  };

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      toast.error("Please enter a valid income amount");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && onUpdate) {
        // Update existing transaction
        await onUpdate({
          transactionId: editingTransaction.id,
          entityId,
          amount: parseInt(amount),
          transactionDate: transactionDate,
          type: editingTransaction.type || "Variable",
          source: "manual"
        });
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#00D09C]" />
            <span>Transaction updated!</span>
          </div>
        );
      } else {
        // Create new transaction
        await onSubmit({
          entityId,
          amount: parseInt(amount),
          transactionDate: transactionDate,
          type: "Variable",
          source: "manual"
        });
        toast.success(
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-[#00D09C]" />
            <span>Income saved successfully!</span>
          </div>
        );
      }
      
      setAmount("");
      setTransactionDate("");
      onClose();
    } catch (error) {
      console.error("Error saving income:", error);
      toast.error(isEditing ? "Failed to update transaction." : "Failed to save income. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-[#334155]">
              {entityName}
            </h2>
            <p className="text-sm text-[#64748B]">
              Expected: <span className="font-medium text-[#00D09C]">₹{new Intl.NumberFormat("en-IN").format(expectedAmount)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            data-testid="close-income-modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Income Amount Field - Primary Focus */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#334155] mb-2">
              Income Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] text-lg font-medium">
                ₹
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formatDisplayAmount(amount)}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-10 pr-4 py-4 text-2xl font-semibold text-[#334155] border-2 border-gray-200 rounded-xl focus:border-[#00D09C] focus:ring-2 focus:ring-[#00D09C]/20 outline-none transition-all"
                data-testid="income-amount-input"
              />
            </div>
            {amount && parseInt(amount) > 0 && (
              <p className="mt-2 text-sm text-[#64748B] italic">
                {numberToWords(parseInt(amount))}
              </p>
            )}
          </div>
          
          {/* Today's Date Display */}
          <div className="mb-6 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Transaction Date</span>
              <span className="text-sm font-medium text-[#334155]">
                {new Date().toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#00D09C" }}
            data-testid="save-income-btn"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              "Save Income"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomeAmountModal;

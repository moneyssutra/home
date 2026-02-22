import { useState } from "react";
import { format } from "date-fns";
import { X, Calendar as CalendarIcon, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { numberToWords } from "@/lib/formatters";
import { toast } from "sonner";

/**
 * Record Transaction Modal - For recording actual income/expense entries
 * 
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: function - Close handler
 * - entityId: string - The ID of the income source or expense
 * - entityName: string - Name of the income source or expense
 * - expectedAmount: number - Expected/default amount
 * - type: "income" | "expense" - Transaction type
 * - onSubmit: function - Async function to record the transaction
 */
const RecordTransactionModal = ({
  isOpen,
  onClose,
  entityId,
  entityName,
  expectedAmount = 0,
  type = "income",
  onSubmit
}) => {
  const [amount, setAmount] = useState(expectedAmount?.toString() || "");
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const today = new Date();

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/[^0-9.]/g, "");
    setAmount(value);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        entityId,
        amount: parseFloat(amount),
        transactionDate,
        notes
      });
      
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-[#00D09C]" />
          <span>{type === "income" ? "Income" : "Expense"} recorded successfully!</span>
        </div>
      );
      
      // Reset form
      setAmount(expectedAmount?.toString() || "");
      setNotes("");
      setTransactionDate(format(new Date(), "yyyy-MM-dd"));
      
      onClose();
    } catch (error) {
      console.error("Error recording transaction:", error);
      toast.error("Failed to record transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#334155]">
            Record {type === "income" ? "Income" : "Expense"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-[#64748B]" />
          </button>
        </div>

        {/* Entity Name */}
        <div className="mb-4">
          <p className="text-sm text-[#64748B]">Recording for:</p>
          <p className="font-medium text-[#334155]">{entityName}</p>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#334155] mb-2">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#334155] font-medium">₹</span>
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full rounded-xl border border-[#CBD5E1] bg-white pl-10 pr-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
              autoFocus
            />
          </div>
          {parseFloat(amount) > 0 && (
            <p className="mt-1.5 text-xs text-[#64748B] italic">
              {numberToWords(parseFloat(amount))}
            </p>
          )}
        </div>

        {/* Transaction Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#334155] mb-2">
            Date
          </label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20"
              >
                <span className="text-[#334155]">
                  {format(new Date(transactionDate), "PPP")}
                </span>
                <CalendarIcon className="h-5 w-5 text-[#64748B]" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border border-gray-200 shadow-lg z-50" align="start">
              <Calendar
                mode="single"
                selected={new Date(transactionDate)}
                onSelect={(date) => {
                  if (date) {
                    setTransactionDate(format(date, "yyyy-MM-dd"));
                  }
                  setCalendarOpen(false);
                }}
                disabled={(date) => date > today}
                initialFocus
                className="rounded-xl"
                classNames={{
                  day_selected: "bg-[#00D09C] text-white hover:bg-[#00B88A]",
                  day_today: "bg-[#00D09C]/10 text-[#00D09C]",
                }}
              />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-[#64748B] mt-1">Cannot be a future date</p>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#334155] mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={2}
            className="w-full rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] placeholder-[#94A3B8] focus:border-[#00D09C] focus:outline-none focus:ring-2 focus:ring-[#00D09C]/20 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-[#CBD5E1] bg-white px-4 py-3 text-[#334155] font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-[#00D09C] px-4 py-3 text-white font-medium hover:bg-[#00B88A] transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Recording..." : "Record"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordTransactionModal;

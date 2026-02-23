import { useState, useEffect } from "react";
import { format } from "date-fns";
import { History, ChevronDown, ChevronUp, Trash2, Lock, AlertCircle, Edit3 } from "lucide-react";
import { toast } from "sonner";

/**
 * Transaction History Panel - Displays transaction records for an income/expense entity
 * 
 * Props:
 * - entityId: string - The ID of the income source or expense
 * - entityType: "income" | "expense" - Type of entity
 * - fetchHistory: function - API function to fetch transaction history
 * - deleteTransaction: function - API function to delete a transaction
 * - onTransactionDeleted: function - Callback when a transaction is deleted
 * - onEditTransaction: function - Callback when edit is clicked (receives transaction)
 */
const TransactionHistoryPanel = ({ 
  entityId, 
  entityType = "income",
  fetchHistory,
  deleteTransaction,
  onTransactionDeleted,
  onEditTransaction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic title based on entity type
  const historyTitle = entityType === "income" ? "Income History" : "Transaction History";

  useEffect(() => {
    if (isExpanded && entityId) {
      loadTransactions();
    }
  }, [isExpanded, entityId]);

  const loadTransactions = async () => {
    if (!entityId || !fetchHistory) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchHistory(entityId);
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Error loading history:", err);
      setError(`Failed to load ${entityType === "income" ? "income" : "transaction"} history`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (transactionId) => {
    if (!deleteTransaction) return;
    
    try {
      await deleteTransaction(transactionId);
      toast.success("Transaction deleted");
      // Refresh the list
      await loadTransactions();
      // Notify parent
      if (onTransactionDeleted) {
        onTransactionDeleted(transactionId);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("This transaction is locked and cannot be deleted");
      } else {
        toast.error("Failed to delete transaction");
      }
    }
  };

  const formatAmount = (amount) => {
    if (!amount) return "₹0";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "d MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-[#CBD5E1] bg-white overflow-hidden">
      {/* Header - Clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[#00D09C]" />
          <span className="font-medium text-[#334155]">{historyTitle}</span>
          {summary && (
            <span className="text-sm text-[#64748B]">
              ({summary.transactionCount} records)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-[#64748B]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#64748B]" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-[#E2E8F0]">
          {loading ? (
            <div className="p-4 text-center text-[#64748B]">
              Loading {entityType === "income" ? "income" : "transaction"} history...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 flex items-center justify-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-4 text-center text-[#64748B]">
              No {entityType === "income" ? "income" : "transactions"} recorded yet
            </div>
          ) : (
            <>
              {/* Summary */}
              {summary && (
                <div className="px-4 py-3 bg-[#00D09C]/5 border-b border-[#E2E8F0]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Total Recorded:</span>
                    <span className="font-semibold text-[#00D09C]">
                      {formatAmount(summary.totalAmount)}
                    </span>
                  </div>
                  {summary.averageAmount > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-[#64748B]">Average:</span>
                      <span className="font-medium text-[#334155]">
                        {formatAmount(summary.averageAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction List */}
              <div className="max-h-64 overflow-y-auto">
                {transactions.map((txn, idx) => (
                  <div
                    key={txn.id || idx}
                    className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] last:border-b-0 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#334155]">
                          {formatAmount(txn.amount)}
                        </span>
                        {txn.isLocked && (
                          <Lock className="h-3.5 w-3.5 text-[#94A3B8]" title="Locked" />
                        )}
                      </div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {formatDate(txn.transactionDate)}
                        {txn.notes && ` • ${txn.notes}`}
                      </div>
                    </div>
                    
                    {/* Edit button - only if not locked and callback provided */}
                    {!txn.isLocked && onEditTransaction && (
                      <button
                        type="button"
                        onClick={() => onEditTransaction(txn)}
                        className="p-2 text-[#94A3B8] hover:text-[#00D09C] transition-colors"
                        title="Edit transaction"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    
                    {/* Delete button - only if not locked */}
                    {!txn.isLocked && deleteTransaction && (
                      <button
                        type="button"
                        onClick={() => handleDelete(txn.id)}
                        className="p-2 text-[#94A3B8] hover:text-red-500 transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPanel;

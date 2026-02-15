import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Wallet, CreditCard, Building2, Banknote } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${backendUrl}/api/accounts`);
      const sortedAccounts = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAccounts(sortedAccounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(Math.abs(amount));
  };

  const getTotalLiquidBalance = () => {
    return accounts
      .filter(acc => acc.accountType !== "Credit Card")
      .reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
  };

  const getTotalCreditOutstanding = () => {
    return accounts
      .filter(acc => acc.accountType === "Credit Card")
      .reduce((sum, acc) => sum + (acc.outstandingAmount || 0), 0);
  };

  const getAccountIcon = (type) => {
    switch (type) {
      case "Bank Account":
      case "Business Account":
        return <Building2 className="h-5 w-5" />;
      case "Credit Card":
        return <CreditCard className="h-5 w-5" />;
      case "Cash":
        return <Banknote className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountColor = (type) => {
    switch (type) {
      case "Bank Account": return "bg-[#3B82F6]/10 text-[#3B82F6]";
      case "Credit Card": return "bg-[#EF4444]/10 text-[#EF4444]";
      case "Cash": return "bg-[#10B981]/10 text-[#10B981]";
      case "Digital Wallet":
      case "UPI Wallet": return "bg-[#8B5CF6]/10 text-[#8B5CF6]";
      case "Brokerage Account": return "bg-[#F59E0B]/10 text-[#F59E0B]";
      default: return "bg-[#6B7280]/10 text-[#6B7280]";
    }
  };

  const getBalanceAllocation = () => {
    const totalBalance = getTotalLiquidBalance();
    const allocation = {};
    accounts
      .filter(acc => acc.accountType !== "Credit Card")
      .forEach(acc => {
        const type = acc.accountType || "Other";
        allocation[type] = (allocation[type] || 0) + (acc.currentBalance || 0);
      });
    return Object.entries(allocation)
      .map(([type, value]) => ({
        type,
        value,
        percentage: totalBalance > 0 ? ((value / totalBalance) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-accounts-page">
      {/* Header */}
      <header className="flex items-center px-6 pt-8 pb-6 flex-shrink-0">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#0B3D2E] transition-colors hover:bg-[#F8FAF9]"
          onClick={() => navigate("/")}
          data-testid="back-button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-[28px] font-semibold tracking-tight text-[#0B3D2E]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          My Accounts
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Summary Cards */}
      {!loading && accounts.length > 0 && (
        <div className="px-6 mb-4">
          <div className="mx-auto max-w-[620px]">
            {/* Main Balance Card - Centered */}
            <div className="rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] p-5 text-white text-center mb-3">
              <p className="text-white/80 text-xs mb-1">Total Balance</p>
              <p className="text-2xl font-bold">₹ {formatAmount(getTotalLiquidBalance())}</p>
              <p className="text-white/60 text-xs mt-1">{accounts.filter(a => a.accountType !== "Credit Card").length} accounts</p>
            </div>
            
            {/* Balance Allocation */}
            {accounts.filter(a => a.accountType !== "Credit Card").length > 0 && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 mb-3">
                <p className="text-sm font-medium text-[#0B3D2E] mb-3">Balance Allocation</p>
                <div className="space-y-2">
                  {getBalanceAllocation().map(({ type, value, percentage }) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[#0B3D2E]/70">{type}</span>
                          <span className="font-medium text-[#0B3D2E]">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#10B981] rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {getTotalCreditOutstanding() > 0 && (
              <div className="rounded-xl bg-[#EF4444]/10 p-4 border border-[#EF4444]/20">
                <p className="text-xs text-[#EF4444] font-medium mb-1">Credit Outstanding</p>
                <p className="text-lg font-bold text-[#0B3D2E]">₹ {formatAmount(getTotalCreditOutstanding())}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#0B3D2E]/60">Loading...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F4] mb-6">
                <Wallet className="h-12 w-12 text-[#00D09C]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Accounts Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Add your bank accounts, wallets, and credit cards
              </p>
              <button
                type="button"
                onClick={() => navigate("/account")}
                className="flex items-center gap-2 rounded-xl bg-[#00D09C] px-6 py-3 text-white font-medium transition-all hover:bg-[#00BA89] active:scale-[0.98] shadow-[0_4px_12px_rgba(0,208,156,0.3)]"
                data-testid="add-account-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/account/${account.id}`)}
                    data-testid={`account-card-${account.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${getAccountColor(account.accountType)}`}>
                        {getAccountIcon(account.accountType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-[#0B3D2E]">
                            {account.accountName}
                          </h3>
                          {account.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#00D09C]/10 text-[#00D09C]">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#0B3D2E]/60">{account.accountType}</p>
                        
                        {account.accountType === "Credit Card" ? (
                          <div className="mt-2">
                            <span className="text-sm text-[#EF4444]">
                              Outstanding: ₹ {formatAmount(account.outstandingAmount || 0)}
                            </span>
                            {account.creditLimit && (
                              <span className="text-sm text-[#0B3D2E]/60 ml-2">
                                / Limit: ₹ {formatAmount(account.creditLimit)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-lg font-semibold text-[#0B3D2E] mt-1">
                            ₹ {formatAmount(account.currentBalance || 0)}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/account")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#00D09C] bg-[#E8F8F4] px-6 py-4 text-[#00D09C] font-semibold transition-all hover:bg-[#00D09C] hover:text-white active:scale-[0.98]"
                  data-testid="add-account-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAccounts;

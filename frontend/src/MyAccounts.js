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

  const getAccountStyle = (type) => {
    switch (type) {
      case "Bank Account": return { bg: "#DBEAFE", text: "#3B82F6" };
      case "Credit Card": return { bg: "#FEE2E2", text: "#EF4444" };
      case "Cash": return { bg: "#DCFCE7", text: "#16A34A" };
      case "Digital Wallet":
      case "UPI Wallet": return { bg: "#F3E8FF", text: "#8B5CF6" };
      case "Brokerage Account": return { bg: "#FEF3C7", text: "#F59E0B" };
      default: return { bg: "var(--bg-subtle)", text: "var(--text-secondary)" };
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
    <div className="min-h-screen pb-24 honeycomb-bg" data-testid="my-accounts-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/")}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Accounts
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-sm font-medium mb-1">Total Balance</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(getTotalLiquidBalance())}</h2>
          <p className="text-white/50 text-xs mt-1">{accounts.filter(a => a.accountType !== "Credit Card").length} accounts</p>
          
          {getTotalCreditOutstanding() > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Credit Outstanding</span>
                <span className="font-semibold" style={{ color: "#FCA5A5" }}>₹ {formatAmount(getTotalCreditOutstanding())}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {/* Balance Allocation */}
        {!loading && accounts.filter(a => a.accountType !== "Credit Card").length > 0 && (
          <div className="rounded-2xl p-5 shadow-card mb-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Balance Allocation</p>
            <div className="space-y-3">
              {getBalanceAllocation().map(({ type, value, percentage }) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{type}</span>
                      <span className="font-medium" style={{ color: "var(--text-primary)" }}>{percentage}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${percentage}%`, backgroundColor: "var(--brand-primary)" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
              <Wallet className="h-12 w-12" style={{ color: "var(--brand-primary)" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Accounts Added Yet
            </h2>
            <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
              Add your bank accounts, wallets, and credit cards
            </p>
            <button
              type="button"
              onClick={() => navigate("/account")}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--brand-primary)", boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)" }}
              data-testid="add-account-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add New Account
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              {accounts.map((account) => {
                const style = getAccountStyle(account.accountType);
                return (
                  <div
                    key={account.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    onClick={() => navigate(`/account/${account.id}`)}
                    data-testid={`account-card-${account.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: style.bg, color: style.text }}>
                          {getAccountIcon(account.accountType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                              {account.accountName}
                            </h3>
                            {account.isPrimary && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{account.accountType}</p>
                          
                          {account.accountType === "Credit Card" ? (
                            <div className="mt-2">
                              <span className="text-sm" style={{ color: "var(--status-error)" }}>
                                Outstanding: ₹ {formatAmount(account.outstandingAmount || 0)}
                              </span>
                              {account.creditLimit && (
                                <span className="text-sm ml-2" style={{ color: "var(--text-muted)" }}>
                                  / Limit: ₹ {formatAmount(account.creditLimit)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-lg font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
                              ₹ {formatAmount(account.currentBalance || 0)}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/account")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-semibold transition-all active:scale-[0.98]"
                style={{ borderColor: "var(--brand-primary)", color: "var(--brand-primary)" }}
                data-testid="add-account-button"
              >
                <Plus className="h-5 w-5" />
                Add New Account
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default MyAccounts;

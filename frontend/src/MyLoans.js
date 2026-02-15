import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Landmark } from "lucide-react";
import axios from "axios";

const MyLoans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, assetsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/loans`),
        axios.get(`${backendUrl}/api/assets`)
      ]);
      const loanData = loansRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setLoans(loanData);
      setAssets(assetsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLinkedAsset = (assetId) => {
    return assets.find(a => a.id === assetId);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const calculateProgress = (loan) => {
    const paid = loan.principalAmount - loan.outstandingAmount;
    return (paid / loan.principalAmount) * 100;
  };

  const getLoanAllocation = () => {
    const totalOutstanding = loans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);
    const allocation = {};
    loans.forEach(loan => {
      const type = loan.loanType || "Other";
      allocation[type] = (allocation[type] || 0) + (loan.outstandingAmount || 0);
    });
    return Object.entries(allocation)
      .map(([type, value]) => ({
        type,
        value,
        percentage: totalOutstanding > 0 ? ((value / totalOutstanding) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-loans-page">
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
          My Loans
        </h1>
        <div className="h-10 w-10" />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="mx-auto w-full max-w-[620px] px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#0B3D2E]/60">Loading...</div>
            </div>
          ) : loans.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FEF3C7] mb-6">
                <Landmark className="h-12 w-12 text-[#F59E0B]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Loans Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first loan or liability
              </p>
              <button
                type="button"
                onClick={() => navigate("/loan")}
                className="flex items-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3 text-white font-medium transition-all hover:bg-[#D97706] active:scale-[0.98] shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
                data-testid="add-loan-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Loan
              </button>
            </div>
          ) : (
            /* Loan List */
            <div className="space-y-4">
              {/* Summary Card */}
              <div className="rounded-2xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] p-5 text-white mb-3">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/80 text-sm">Total Outstanding</span>
                  <Landmark className="h-6 w-6 text-white/60" />
                </div>
                <p className="text-3xl font-bold">
                  ₹ {formatAmount(loans.reduce((sum, l) => sum + l.outstandingAmount, 0))}
                </p>
                <p className="text-white/70 text-sm mt-2">
                  {loans.length} active loan{loans.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Loan Allocation */}
              {loans.length > 0 && (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 mb-3">
                  <p className="text-sm font-medium text-[#0B3D2E] mb-3">Loan Allocation</p>
                  <div className="space-y-2">
                    {getLoanAllocation().map(({ type, value, percentage }) => (
                      <div key={type} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#0B3D2E]/70">{type}</span>
                            <span className="font-medium text-[#0B3D2E]">{percentage}%</span>
                          </div>
                          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#F59E0B] rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                    onClick={() => navigate(`/loan/${loan.id}`)}
                    data-testid={`loan-card-${loan.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Loan Name */}
                        <h3 className="text-lg font-semibold text-[#0B3D2E] mb-1">
                          {loan.loanName}
                        </h3>

                        {/* Lender */}
                        {loan.lenderName && (
                          <p className="text-sm text-[#0B3D2E]/60 mb-2">
                            {loan.lenderName}
                          </p>
                        )}

                        {/* Outstanding Amount */}
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-sm text-[#0B3D2E]/60">Outstanding:</span>
                          <span className="text-xl font-bold text-[#F59E0B]">
                            ₹ {formatAmount(loan.outstandingAmount)}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-[#0B3D2E]/60 mb-1">
                            <span>Paid: ₹{formatAmount(loan.principalAmount - loan.outstandingAmount)}</span>
                            <span>{calculateProgress(loan).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#00D09C] rounded-full transition-all"
                              style={{ width: `${calculateProgress(loan)}%` }}
                            />
                          </div>
                        </div>

                        {/* Details Row */}
                        <div className="flex items-center gap-4 text-sm text-[#0B3D2E]/70 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className="text-[#0B3D2E]/60">EMI:</span>
                            <span className="font-medium">₹{formatAmount(loan.emiAmount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#0B3D2E]/60">Rate:</span>
                            <span className="font-medium">{loan.interestRate}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#0B3D2E]/60">Started:</span>
                            <span className="font-medium">{formatDate(loan.startDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className="ml-4 mt-2">
                        <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add New Loan Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/loan")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#F59E0B] bg-[#FEF3C7] px-6 py-4 text-[#F59E0B] font-semibold transition-all hover:bg-[#F59E0B] hover:text-white active:scale-[0.98]"
                  data-testid="add-loan-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Loan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyLoans;

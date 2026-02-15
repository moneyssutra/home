import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Landmark, Home, Building2, ExternalLink } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyLoans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
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

  const totalOutstanding = loans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);

  const getLoanAllocation = () => {
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
    <div className="min-h-screen pb-24 honeycomb-bg" data-testid="my-loans-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
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
            My Loans
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/70 text-sm font-medium">Total Outstanding</p>
            <Landmark className="h-6 w-6 text-white/60" />
          </div>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalOutstanding)}</h2>
          <p className="text-white/50 text-xs mt-1">{loans.length} active loan{loans.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: "var(--status-warning-soft)" }}>
              <Landmark className="h-12 w-12" style={{ color: "var(--status-warning)" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Loans Added Yet
            </h2>
            <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
              Start by adding your first loan or liability
            </p>
            <button
              type="button"
              onClick={() => navigate("/loan")}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--status-warning)", boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)" }}
              data-testid="add-loan-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add New Loan
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Loan Allocation */}
            {loans.length > 0 && (
              <div className="rounded-2xl p-5 shadow-card" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Loan Allocation</p>
                <div className="space-y-3">
                  {getLoanAllocation().map(({ type, value, percentage }) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span style={{ color: "var(--text-secondary)" }}>{type}</span>
                          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                          <div 
                            className="h-full rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: "var(--status-warning)" }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loan List */}
            <div className="space-y-3">
              {loans.map((loan) => {
                const linkedAsset = loan.linkedAssetId ? getLinkedAsset(loan.linkedAssetId) : null;
                
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    onClick={() => navigate(`/loan/${loan.id}`)}
                    data-testid={`loan-card-${loan.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                          {loan.loanName}
                        </h3>

                        {loan.lenderName && (
                          <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                            {loan.lenderName}
                          </p>
                        )}

                        {linkedAsset && (
                          <div 
                            className="mb-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/asset/${linkedAsset.id}`);
                            }}
                            data-testid={`linked-asset-${linkedAsset.id}`}
                          >
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors" style={{ backgroundColor: "var(--status-info-soft)", color: "var(--status-info)" }}>
                              {linkedAsset.assetType?.includes("Property") ? (
                                <Building2 className="h-3 w-3" />
                              ) : (
                                <Home className="h-3 w-3" />
                              )}
                              <span>Linked: {linkedAsset.assetName}</span>
                              <ExternalLink className="h-3 w-3 opacity-60" />
                            </div>
                          </div>
                        )}

                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Outstanding:</span>
                          <span className="text-xl font-bold" style={{ color: "var(--status-warning)" }}>
                            ₹ {formatAmount(loan.outstandingAmount)}
                          </span>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                            <span>Paid: ₹{formatAmount(loan.principalAmount - loan.outstandingAmount)}</span>
                            <span>{calculateProgress(loan).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ width: `${calculateProgress(loan)}%`, backgroundColor: "var(--brand-primary)" }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: "var(--text-secondary)" }}>
                          <div className="flex items-center gap-1">
                            <span style={{ color: "var(--text-muted)" }}>EMI:</span>
                            <span className="font-medium">₹{formatAmount(loan.emiAmount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span style={{ color: "var(--text-muted)" }}>Rate:</span>
                            <span className="font-medium">{loan.interestRate}%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span style={{ color: "var(--text-muted)" }}>Started:</span>
                            <span className="font-medium">{formatDate(loan.startDate)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-4 mt-2">
                        <ChevronRight className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/loan")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-semibold transition-all active:scale-[0.98]"
                style={{ borderColor: "var(--status-warning)", color: "var(--status-warning)" }}
                data-testid="add-loan-button"
              >
                <Plus className="h-5 w-5" />
                Add New Loan
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

export default MyLoans;

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Landmark, Home, Building2, ExternalLink, CheckCircle } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useFamilyContext } from "@/context/FamilyContext";

const MyLoans = () => {
  const navigate = useNavigate();
  const [loans, setLoans] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeFilter, setActiveFilter] = useState("active"); // "all", "active", "closed"
  const { activeViewId, isPersonalView, isFamilyView } = useFamilyContext();
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [activeViewId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = isFamilyView ? "?family=true" : (!isPersonalView && activeViewId) ? `?memberId=${activeViewId}` : "";
      const [loansRes, assetsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/loans${params}`),
        axios.get(`${backendUrl}/api/assets${params}`)
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

  // Filter and sort loans
  const { activeLoans, closedLoans, filteredLoans } = useMemo(() => {
    const active = loans.filter(l => (l.outstandingAmount > 0) || l.status === "Active");
    const closed = loans.filter(l => (l.outstandingAmount <= 0) && l.status !== "Active")
      .sort((a, b) => new Date(b.closedDate || b.updatedAt || b.createdAt) - new Date(a.closedDate || a.updatedAt || a.createdAt));
    
    let filtered;
    if (activeFilter === "active") {
      filtered = active;
    } else if (activeFilter === "closed") {
      filtered = closed;
    } else {
      // All - active first, then closed
      filtered = [...active, ...closed];
    }
    
    return { activeLoans: active, closedLoans: closed, filteredLoans: filtered };
  }, [loans, activeFilter]);

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

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0);

  const getLoanAllocation = () => {
    const allocation = {};
    activeLoans.forEach(loan => {
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

  const isLoanClosed = (loan) => loan.outstandingAmount <= 0 && loan.status !== "Active";

  return (
    <div className="min-h-screen pb-32 honeycomb-bg" data-testid="my-loans-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate("/wealth")}
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
          <p className="text-white/50 text-xs mt-1">{activeLoans.length} active loan{activeLoans.length !== 1 ? 's' : ''}{closedLoans.length > 0 ? ` • ${closedLoans.length} closed` : ''}</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "all" 
                ? "bg-white text-[#D97706]" 
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            data-testid="filter-all"
          >
            All ({loans.length})
          </button>
          <button
            onClick={() => setActiveFilter("active")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "active" 
                ? "bg-white text-[#D97706]" 
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            data-testid="filter-active"
          >
            Active ({activeLoans.length})
          </button>
          <button
            onClick={() => setActiveFilter("closed")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeFilter === "closed" 
                ? "bg-white text-[#D97706]" 
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
            data-testid="filter-closed"
          >
            Closed ({closedLoans.length})
          </button>
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
              onClick={() => navigate("/add-loan")}
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
            {/* Loan Allocation - only show when viewing active loans */}
            {activeFilter !== "closed" && activeLoans.length > 0 && (
              <div 
                className="bg-white rounded-2xl p-5 shadow-card" 
                data-testid="loan-allocation"
              >
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer"
                  onClick={() => navigate("/loan-breakdown")}
                >
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Loan Allocation
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                    View All →
                  </span>
                </div>
                
                {/* Allocation by Type */}
                <div className="space-y-3">
                  {getLoanAllocation().map(({ type, value, percentage }) => {
                    const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
                    
                    return (
                      <div 
                        key={type} 
                        className="space-y-1 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/loans/${typeSlug}`);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: "var(--status-warning)" }}
                            />
                            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {type}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                              ₹{formatAmount(value)}
                            </span>
                            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: "var(--status-warning)"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state for filtered results */}
            {filteredLoans.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-6">
                <p className="text-center text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                  No {activeFilter} loans found
                </p>
                {activeFilter !== "all" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="text-sm font-medium"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    Show all loans
                  </button>
                )}
              </div>
            )}

            {/* Loan List */}
            <div className="space-y-3">
              {filteredLoans.map((loan) => {
                const linkedAsset = loan.linkedAssetId ? getLinkedAsset(loan.linkedAssetId) : null;
                const isClosed = isLoanClosed(loan);
                
                return (
                  <div
                    key={loan.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ 
                      backgroundColor: "var(--bg-card)", 
                      border: `1px solid ${isClosed ? "var(--status-success)" : "var(--border-light)"}`,
                      opacity: isClosed ? 0.8 : 1
                    }}
                    onClick={() => navigate(`/wealth/loans/${loan.id}`)}
                    data-testid={`loan-card-${loan.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                            {loan.loanName}
                          </h3>
                          {isClosed && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--status-success-soft)", color: "var(--status-success)" }}>
                              <CheckCircle className="h-3 w-3" />
                              Closed
                            </span>
                          )}
                        </div>

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
                              navigate(`/wealth/assets/${linkedAsset.id}`);
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

                        {isClosed ? (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total Paid:</span>
                            <span className="text-xl font-bold" style={{ color: "var(--status-success)" }}>
                              ₹ {formatAmount(loan.principalAmount)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Outstanding:</span>
                            <span className="text-xl font-bold" style={{ color: "var(--status-warning)" }}>
                              ₹ {formatAmount(loan.outstandingAmount)}
                            </span>
                          </div>
                        )}

                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                            <span>Paid: ₹{formatAmount(loan.principalAmount - loan.outstandingAmount)}</span>
                            <span>{calculateProgress(loan).toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                            <div 
                              className="h-full rounded-full transition-all"
                              style={{ width: `${calculateProgress(loan)}%`, backgroundColor: isClosed ? "var(--status-success)" : "var(--brand-primary)" }}
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
                onClick={() => navigate("/add-loan")}
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

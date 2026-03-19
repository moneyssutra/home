import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Building2, Home, Car, Tractor, Package, MoreHorizontal, Landmark, ExternalLink } from "lucide-react";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const MyAssets = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, loansRes] = await Promise.all([
        axios.get(`${backendUrl}/api/assets`),
        axios.get(`${backendUrl}/api/loans`)
      ]);
      setAssets(assetsRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoans(loansRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN').format(amount);
  };

  const getAssetIcon = (assetType) => {
    switch (assetType) {
      case "Residential Property":
        return <Home className="h-6 w-6" />;
      case "Commercial Property":
        return <Building2 className="h-6 w-6" />;
      case "Vehicle":
        return <Car className="h-6 w-6" />;
      case "Equipment":
        return <Tractor className="h-6 w-6" />;
      case "Land":
        return <Package className="h-6 w-6" />;
      default:
        return <MoreHorizontal className="h-6 w-6" />;
    }
  };

  const getLinkedLoan = (loanId) => {
    return loans.find(l => l.id === loanId);
  };

  const getNetAssetValue = (asset) => {
    if (!asset.isFinanced || !asset.linkedLoanId) {
      return asset.currentValue;
    }
    const loan = getLinkedLoan(asset.linkedLoanId);
    if (!loan) return asset.currentValue;
    return asset.currentValue - loan.outstandingAmount;
  };

  const totalAssetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalNetValue = assets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  const getAssetAllocation = () => {
    const allocation = {};
    assets.forEach(asset => {
      const type = asset.assetType || "Other";
      allocation[type] = (allocation[type] || 0) + asset.currentValue;
    });
    return Object.entries(allocation)
      .map(([type, value]) => ({
        type,
        value,
        percentage: ((value / totalAssetValue) * 100).toFixed(1)
      }))
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
  };

  return (
    <div className="min-h-screen pb-32 honeycomb-bg" data-testid="my-assets-page">
      {/* Header */}
      <header className="px-6 pt-8 pb-8" style={{ background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)" }}>
        <div className="flex items-center gap-4 mb-6">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            onClick={() => navigate(-1)}
            data-testid="back-button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
            My Assets
          </h1>
        </div>

        {/* Summary Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-white/70 text-sm font-medium mb-1">Total Asset Value</p>
          <h2 className="text-3xl font-bold text-white">₹ {formatAmount(totalAssetValue)}</h2>
          <p className="text-white/50 text-xs mt-1">{assets.length} assets</p>
          
          {totalNetValue !== totalAssetValue && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Net Value (after loans)</span>
                <span className="font-semibold text-white">₹ {formatAmount(totalNetValue)}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="px-6 -mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full mb-6" style={{ backgroundColor: "var(--status-info-soft)" }}>
              <Building2 className="h-12 w-12" style={{ color: "var(--status-info)" }} />
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No Assets Added Yet
            </h2>
            <p className="text-center mb-8" style={{ color: "var(--text-secondary)" }}>
              Start by adding your first asset
            </p>
            <button
              type="button"
              onClick={() => navigate("/asset")}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: "var(--status-info)", boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)" }}
              data-testid="add-asset-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add New Asset
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Asset Allocation Card */}
            {assets.length > 0 && (
              <div 
                className="bg-white rounded-2xl p-5 shadow-card" 
                data-testid="asset-allocation"
              >
                <div 
                  className="flex items-center justify-between mb-4 cursor-pointer"
                  onClick={() => navigate("/asset-breakdown")}
                >
                  <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    Asset Allocation
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}>
                    View All →
                  </span>
                </div>
                
                {/* Allocation by Type */}
                <div className="space-y-3">
                  {getAssetAllocation().map(({ type, value, percentage }) => {
                    const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
                    
                    return (
                      <div 
                        key={type} 
                        className="space-y-1 cursor-pointer rounded-lg p-2 -mx-2 hover:bg-gray-50 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/assets/${typeSlug}`);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: "var(--status-info)" }}
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
                              backgroundColor: "var(--status-info)"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Asset List */}
            <div className="space-y-3">
              {assets.map((asset) => {
                const linkedLoan = asset.linkedLoanId ? getLinkedLoan(asset.linkedLoanId) : null;
                const netValue = getNetAssetValue(asset);
                
                return (
                  <div
                    key={asset.id}
                    className="rounded-2xl p-5 shadow-card transition-all hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                    onClick={() => navigate(`/wealth/assets/${asset.id}`)}
                    data-testid={`asset-card-${asset.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl flex-shrink-0" style={{ backgroundColor: "var(--status-info-soft)", color: "var(--status-info)" }}>
                        {getAssetIcon(asset.assetType)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1" style={{ backgroundColor: "var(--status-info-soft)", color: "var(--status-info)" }}>
                          {asset.assetType}
                        </span>
                        
                        <h3 className="text-lg font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {asset.assetName}
                        </h3>

                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                            ₹ {formatAmount(asset.currentValue)}
                          </span>
                        </div>

                        {linkedLoan && (
                          <div 
                            className="mt-2 pt-2 -mx-2 px-2 py-1 rounded-lg transition-colors"
                            style={{ borderTop: "1px solid var(--border-light)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/wealth/loans/${linkedLoan.id}`);
                            }}
                            data-testid={`linked-loan-${linkedLoan.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Landmark className="h-4 w-4" style={{ color: "var(--status-warning)" }} />
                              <span className="text-xs font-medium" style={{ color: "var(--status-warning)" }}>Linked Loan</span>
                              <ExternalLink className="h-3 w-3 ml-auto" style={{ color: "var(--text-muted)" }} />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate" style={{ color: "var(--text-secondary)" }}>{linkedLoan.loanName}</span>
                              <span className="font-medium flex-shrink-0" style={{ color: "var(--status-warning)" }}>
                                - ₹{formatAmount(linkedLoan.outstandingAmount)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mt-1">
                              <span style={{ color: "var(--text-muted)" }}>Net Value:</span>
                              <span className="font-bold" style={{ color: netValue >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                                ₹ {formatAmount(netValue)}
                              </span>
                            </div>
                          </div>
                        )}

                        {asset.purchaseValue && (
                          <div className="mt-2">
                            {(() => {
                              const appreciation = ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100;
                              return (
                                <span className="text-xs font-medium" style={{ color: appreciation >= 0 ? "var(--finance-gain)" : "var(--finance-loss)" }}>
                                  {appreciation >= 0 ? '↑' : '↓'} {Math.abs(appreciation).toFixed(1)}% since purchase
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-6 w-6 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Button */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => navigate("/asset")}
                className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 font-semibold transition-all active:scale-[0.98]"
                style={{ borderColor: "var(--status-info)", color: "var(--status-info)" }}
                data-testid="add-asset-button"
              >
                <Plus className="h-5 w-5" />
                Add New Asset
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

export default MyAssets;

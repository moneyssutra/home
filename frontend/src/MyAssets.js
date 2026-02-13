import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Building2, Home, Car, Tractor, Package, MoreHorizontal } from "lucide-react";
import axios from "axios";

const MyAssets = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  // Calculate totals
  const totalAssetValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalNetValue = assets.reduce((sum, a) => sum + getNetAssetValue(a), 0);

  // Calculate asset allocation
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
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage)); // Sort by percentage descending
  };

  return (
    <div className="min-h-screen honeycomb-bg flex flex-col" data-testid="my-assets-page">
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
          My Assets
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
          ) : assets.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E0F2FE] mb-6">
                <Building2 className="h-12 w-12 text-[#0EA5E9]" />
              </div>
              <h2 className="text-xl font-semibold text-[#0B3D2E] mb-2">
                No Assets Added Yet
              </h2>
              <p className="text-[#0B3D2E]/60 text-center mb-8">
                Start by adding your first asset
              </p>
              <button
                type="button"
                onClick={() => navigate("/asset")}
                className="flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-6 py-3 text-white font-medium transition-all hover:bg-[#0284C7] active:scale-[0.98] shadow-[0_4px_12px_rgba(14,165,233,0.3)]"
                data-testid="add-asset-empty-button"
              >
                <Plus className="h-5 w-5" />
                Add New Asset
              </button>
            </div>
          ) : (
            /* Asset List */
            <div className="space-y-4">
              {/* Summary Card - Single centered card */}
              <div className="rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] p-4 text-white text-center mb-4">
                <p className="text-white/80 text-xs mb-1">Total Asset Value</p>
                <p className="text-2xl font-bold">₹ {formatAmount(totalAssetValue)}</p>
                <p className="text-white/60 text-xs mt-1">{assets.length} assets</p>
              </div>

              {/* Asset Allocation */}
              {assets.length > 0 && (
                <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 mb-4">
                  <p className="text-sm font-medium text-[#0B3D2E] mb-3">Asset Allocation</p>
                  <div className="space-y-2">
                    {getAssetAllocation().map(({ type, value, percentage }) => (
                      <div key={type} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-[#0B3D2E]/70">{type}</span>
                            <span className="font-medium text-[#0B3D2E]">{percentage}%</span>
                          </div>
                          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#0EA5E9] rounded-full"
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
                {assets.map((asset) => {
                  const linkedLoan = asset.linkedLoanId ? getLinkedLoan(asset.linkedLoanId) : null;
                  const netValue = getNetAssetValue(asset);
                  
                  return (
                    <div
                      key={asset.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(15,23,42,0.1)] cursor-pointer"
                      onClick={() => navigate(`/asset/${asset.id}`)}
                      data-testid={`asset-card-${asset.id}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Asset Icon */}
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0EA5E9] flex-shrink-0">
                          {getAssetIcon(asset.assetType)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          {/* Asset Type Badge */}
                          <span className="inline-block text-xs font-medium text-[#0EA5E9] bg-[#E0F2FE] px-2 py-0.5 rounded-full mb-1">
                            {asset.assetType}
                          </span>
                          
                          {/* Asset Name */}
                          <h3 className="text-lg font-semibold text-[#0B3D2E] truncate">
                            {asset.assetName}
                          </h3>

                          {/* Value */}
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-xl font-bold text-[#0B3D2E]">
                              ₹ {formatAmount(asset.currentValue)}
                            </span>
                          </div>

                          {/* Linked Loan Info */}
                          {linkedLoan && (
                            <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-[#0B3D2E]/60">Loan Outstanding:</span>
                                <span className="font-medium text-[#F59E0B]">
                                  - ₹{formatAmount(linkedLoan.outstandingAmount)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm mt-1">
                                <span className="text-[#0B3D2E]/60">Net Value:</span>
                                <span className={`font-bold ${netValue >= 0 ? 'text-[#00D09C]' : 'text-red-500'}`}>
                                  ₹ {formatAmount(netValue)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Appreciation if available */}
                          {asset.purchaseValue && (
                            <div className="mt-2">
                              {(() => {
                                const appreciation = ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100;
                                return (
                                  <span className={`text-xs font-medium ${appreciation >= 0 ? 'text-[#00D09C]' : 'text-red-500'}`}>
                                    {appreciation >= 0 ? '↑' : '↓'} {Math.abs(appreciation).toFixed(1)}% since purchase
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="h-6 w-6 text-[#0B3D2E]/40 flex-shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Asset Button */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/asset")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#0EA5E9] bg-[#E0F2FE] px-6 py-4 text-[#0EA5E9] font-semibold transition-all hover:bg-[#0EA5E9] hover:text-white active:scale-[0.98]"
                  data-testid="add-asset-button"
                >
                  <Plus className="h-5 w-5" />
                  Add New Asset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAssets;

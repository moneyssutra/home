import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Home, Building2, Car, Tractor, Package, Gem, MoreHorizontal, ExternalLink } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useAssetList, useLoanList } from "@/hooks/useApi";

// Asset type configurations
const assetTypeConfig = {
  "residential-property": { name: "Residential Property", icon: Home, color: "#3B82F6", bgColor: "#DBEAFE", description: "Houses, apartments, and residential real estate" },
  "commercial-property": { name: "Commercial Property", icon: Building2, color: "#8B5CF6", bgColor: "#F3E8FF", description: "Offices, shops, and commercial real estate" },
  "vehicle": { name: "Vehicle", icon: Car, color: "#F59E0B", bgColor: "#FEF3C7", description: "Cars, bikes, and other vehicles" },
  "equipment": { name: "Equipment", icon: Tractor, color: "#16A34A", bgColor: "#DCFCE7", description: "Machinery and equipment" },
  "land": { name: "Land", icon: Package, color: "#14B8A6", bgColor: "#CCFBF1", description: "Land and plots" },
  "jewellery": { name: "Jewellery", icon: Gem, color: "#EC4899", bgColor: "#FCE7F3", description: "Gold, silver, and precious items" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6", description: "Other assets" },
};

const CategoryAsset = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const config = assetTypeConfig[category] || assetTypeConfig.other;
  const Icon = config.icon;
  
  const { data: allAssets = [], isLoading: loadingAssets } = useAssetList();
  const { data: loans = [], isLoading: loadingLoans } = useLoanList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  const getLinkedLoan = (loanId) => {
    return loans.find(l => l.id === loanId);
  };

  const getNetValue = (asset) => {
    if (!asset.isFinanced || !asset.linkedLoanId) return asset.currentValue;
    const loan = getLinkedLoan(asset.linkedLoanId);
    if (!loan) return asset.currentValue;
    return asset.currentValue - loan.outstandingAmount;
  };

  // Filter assets for this category
  const { categoryAssets, totalValue, totalNetValue } = useMemo(() => {
    const filtered = allAssets.filter(asset => {
      const assetType = (asset.assetType || "Other");
      const assetTypeSlug = assetType.toLowerCase().replace(/\s+/g, '-');
      return assetTypeSlug === category || assetType === config.name;
    });
    
    return {
      categoryAssets: filtered,
      totalValue: filtered.reduce((sum, a) => sum + (a.currentValue || 0), 0),
      totalNetValue: filtered.reduce((sum, a) => sum + getNetValue(a), 0)
    };
  }, [allAssets, category, config.name, loans]);

  const loading = loadingAssets || loadingLoans;

  const sortedAssets = [...categoryAssets].sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/my-assets")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.bgColor }}>
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{config.name}</h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{config.description}</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4" style={{ backgroundColor: config.bgColor }}>
            <p className="text-xs mb-1" style={{ color: config.color }}>Total Value</p>
            <p className="text-xl font-bold" style={{ color: config.color }}>₹{formatAmount(totalValue)}</p>
            <p className="text-xs mt-1" style={{ color: config.color, opacity: 0.7 }}>{categoryAssets.length} {categoryAssets.length === 1 ? 'asset' : 'assets'}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Net Value</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(totalNetValue)}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>after liabilities</p>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Assets</h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : categoryAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: config.bgColor }}>
              <Icon className="h-10 w-10" style={{ color: config.color }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No {config.name} Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{config.description}</p>
            <button
              onClick={() => navigate(`/asset?type=${encodeURIComponent(config.name)}`)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: config.color }}
              data-testid="add-asset-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add {config.name}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAssets.map((asset) => {
              const linkedLoan = asset.linkedLoanId ? getLinkedLoan(asset.linkedLoanId) : null;
              const netValue = getNetValue(asset);
              
              return (
                <button
                  key={asset.id}
                  onClick={() => navigate(`/asset/${asset.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`asset-card-${asset.id}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold truncate mb-1" style={{ color: "var(--text-primary)" }}>{asset.assetName}</h4>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      {asset.location && <span>{asset.location}</span>}
                      {linkedLoan && (
                        <span className="flex items-center gap-1" style={{ color: "#DC2626" }}>
                          <ExternalLink className="h-3 w-3" />
                          Loan: ₹{formatAmount(linkedLoan.outstandingAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: config.color }}>₹{formatAmount(asset.currentValue)}</p>
                    {linkedLoan && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Net: ₹{formatAmount(netValue)}</p>
                    )}
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        {categoryAssets.length > 0 && (
          <button
            onClick={() => navigate(`/asset?type=${encodeURIComponent(config.name)}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 mt-4 font-medium transition-all"
            style={{ borderColor: config.color, color: config.color }}
            data-testid="add-asset-button"
          >
            <Plus className="h-5 w-5" />
            Add {config.name}
          </button>
        )}
      </div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default CategoryAsset;

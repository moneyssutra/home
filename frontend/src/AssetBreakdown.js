import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Home, Building2, Car, Tractor, Package, Gem, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useAssetList } from "@/hooks/useApi";

// Asset type configurations
const assetTypeConfig = {
  "residential-property": { 
    name: "Residential Property", 
    icon: Home, 
    color: "#3B82F6", 
    bgColor: "#DBEAFE",
    description: "Houses, apartments, and residential real estate"
  },
  "commercial-property": { 
    name: "Commercial Property", 
    icon: Building2, 
    color: "#8B5CF6", 
    bgColor: "#F3E8FF",
    description: "Offices, shops, and commercial real estate"
  },
  "vehicle": { 
    name: "Vehicle", 
    icon: Car, 
    color: "#F59E0B", 
    bgColor: "#FEF3C7",
    description: "Cars, bikes, and other vehicles"
  },
  "equipment": { 
    name: "Equipment", 
    icon: Tractor, 
    color: "#16A34A", 
    bgColor: "#DCFCE7",
    description: "Machinery and equipment"
  },
  "land": { 
    name: "Land", 
    icon: Package, 
    color: "#14B8A6", 
    bgColor: "#CCFBF1",
    description: "Land and plots"
  },
  "jewellery": { 
    name: "Jewellery", 
    icon: Gem, 
    color: "#EC4899", 
    bgColor: "#FCE7F3",
    description: "Gold, silver, and precious items"
  },
  "other": { 
    name: "Other", 
    icon: MoreHorizontal, 
    color: "#6B7280", 
    bgColor: "#F3F4F6",
    description: "Other assets"
  },
};

const AssetBreakdown = () => {
  const navigate = useNavigate();
  const { data: assets = [], isLoading: loading } = useAssetList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Calculate stats by asset type
  const { totalValue, typeBreakdown } = useMemo(() => {
    const breakdown = {};
    let value = 0;

    assets.forEach(asset => {
      const type = asset.assetType || "Other";
      const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
      
      if (!breakdown[typeSlug]) {
        breakdown[typeSlug] = {
          type,
          typeSlug,
          value: 0,
          count: 0,
          assets: []
        };
      }
      
      breakdown[typeSlug].value += asset.currentValue || 0;
      breakdown[typeSlug].count += 1;
      breakdown[typeSlug].assets.push(asset);
      
      value += asset.currentValue || 0;
    });

    return {
      totalValue: value,
      typeBreakdown: Object.values(breakdown).sort((a, b) => b.value - a.value)
    };
  }, [assets]);

  const chartColors = ["#3B82F6", "#8B5CF6", "#F59E0B", "#16A34A", "#14B8A6", "#EC4899", "#6B7280"];

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
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Asset Breakdown</h1>
        </div>

        {/* Total Summary Card */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)" }}>
          <p className="text-white/80 text-sm mb-1">Total Asset Value</p>
          <h2 className="text-3xl font-bold text-white mb-3">₹ {formatAmount(totalValue)}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-white/70">Total Assets: </span>
              <span className="text-white font-semibold">{assets.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Type Categories */}
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>By Asset Type</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : typeBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "#DBEAFE" }}>
              <Home className="h-10 w-10" style={{ color: "#0EA5E9" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Assets Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Add your first asset</p>
          </div>
        ) : (
          <div className="space-y-3">
            {typeBreakdown.map((item, idx) => {
              const config = assetTypeConfig[item.typeSlug] || assetTypeConfig.other;
              const Icon = config.icon;
              const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
              
              return (
                <button
                  key={item.typeSlug}
                  onClick={() => navigate(`/assets/${item.typeSlug}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`asset-type-${item.typeSlug}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.type}</h4>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(item.value)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.count} {item.count === 1 ? 'asset' : 'assets'}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: chartColors[idx % chartColors.length] }} />
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AssetBreakdown;

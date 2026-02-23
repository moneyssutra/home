import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Shield, Heart, Car, Home, Briefcase, Package, Plane, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useInsuranceList } from "@/hooks/useApi";

// Insurance type configurations
const insuranceTypeConfig = {
  "life-insurance": { 
    name: "Life Insurance", 
    icon: Shield, 
    color: "#16A34A", 
    bgColor: "#DCFCE7",
    description: "Life and term insurance policies"
  },
  "health-insurance": { 
    name: "Health Insurance", 
    icon: Heart, 
    color: "#3B82F6", 
    bgColor: "#DBEAFE",
    description: "Medical and health coverage"
  },
  "vehicle-insurance": { 
    name: "Vehicle Insurance", 
    icon: Car, 
    color: "#F59E0B", 
    bgColor: "#FEF3C7",
    description: "Car, bike, and vehicle insurance"
  },
  "property-insurance": { 
    name: "Property Insurance", 
    icon: Home, 
    color: "#8B5CF6", 
    bgColor: "#F3E8FF",
    description: "Home and property coverage"
  },
  "business-insurance": { 
    name: "Business Insurance", 
    icon: Briefcase, 
    color: "#EC4899", 
    bgColor: "#FCE7F3",
    description: "Business and commercial insurance"
  },
  "asset-insurance": { 
    name: "Asset Insurance", 
    icon: Package, 
    color: "#6366F1", 
    bgColor: "#E0E7FF",
    description: "Valuable assets coverage"
  },
  "travel-insurance": { 
    name: "Travel Insurance", 
    icon: Plane, 
    color: "#14B8A6", 
    bgColor: "#CCFBF1",
    description: "Travel and trip insurance"
  },
  "other": { 
    name: "Other", 
    icon: MoreHorizontal, 
    color: "#6B7280", 
    bgColor: "#F3F4F6",
    description: "Other insurance types"
  },
};

const InsuranceBreakdown = () => {
  const navigate = useNavigate();
  const { data: insurances = [], isLoading: loading } = useInsuranceList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Calculate stats by insurance type
  const { totalCoverage, totalPremium, typeBreakdown } = useMemo(() => {
    const breakdown = {};
    let coverage = 0;
    let premium = 0;

    insurances.forEach(ins => {
      const type = ins.insuranceType || "Other";
      const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
      
      if (!breakdown[typeSlug]) {
        breakdown[typeSlug] = {
          type,
          typeSlug,
          coverage: 0,
          premium: 0,
          count: 0,
          insurances: []
        };
      }
      
      breakdown[typeSlug].coverage += ins.coverageAmount || 0;
      breakdown[typeSlug].premium += ins.premiumAmount || 0;
      breakdown[typeSlug].count += 1;
      breakdown[typeSlug].insurances.push(ins);
      
      coverage += ins.coverageAmount || 0;
      premium += ins.premiumAmount || 0;
    });

    return {
      totalCoverage: coverage,
      totalPremium: premium,
      typeBreakdown: Object.values(breakdown).sort((a, b) => b.coverage - a.coverage)
    };
  }, [insurances]);

  const chartColors = ["#16A34A", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6", "#6B7280"];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/my-insurance")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ 
              backgroundColor: "var(--bg-card)", 
              border: "1px solid var(--border-light)" 
            }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Insurance Breakdown
          </h1>
        </div>

        {/* Total Summary Card */}
        <div 
          className="rounded-xl p-5 mb-4"
          style={{ 
            background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
          }}
        >
          <p className="text-white/80 text-sm mb-1">Total Coverage</p>
          <h2 className="text-3xl font-bold text-white mb-3">₹ {formatAmount(totalCoverage)}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-white/70">Total Premium: </span>
              <span className="text-white font-semibold">₹{formatAmount(totalPremium)}</span>
            </div>
            <div>
              <span className="text-white/70">Policies: </span>
              <span className="text-white font-semibold">{insurances.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insurance Type Categories */}
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          By Insurance Type
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : typeBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "#DCFCE7" }}>
              <Shield className="h-10 w-10" style={{ color: "#16A34A" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Insurance Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>Add your first insurance policy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {typeBreakdown.map((item, idx) => {
              const config = insuranceTypeConfig[item.typeSlug] || insuranceTypeConfig.other;
              const Icon = config.icon;
              const percentage = totalCoverage > 0 ? (item.coverage / totalCoverage) * 100 : 0;
              
              return (
                <button
                  key={item.typeSlug}
                  onClick={() => navigate(`/insurances/${item.typeSlug}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: "var(--bg-card)", 
                    border: "1px solid var(--border-light)" 
                  }}
                  data-testid={`insurance-type-${item.typeSlug}`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {item.type}
                      </h4>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        ₹{formatAmount(item.coverage)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.count} {item.count === 1 ? 'policy' : 'policies'} • Premium: ₹{formatAmount(item.premium)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: chartColors[idx % chartColors.length]
                        }}
                      />
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

export default InsuranceBreakdown;

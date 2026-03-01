import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Shield, Heart, Car, Home, Briefcase, Package, Plane, MoreHorizontal, Calendar } from "lucide-react";
import { addMonths, addQuarters, addYears, isBefore, format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
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

const CategoryInsurance = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const config = insuranceTypeConfig[category] || insuranceTypeConfig.other;
  const Icon = config.icon;
  
  const { data: allInsurances = [], isLoading: loading } = useInsuranceList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Filter insurances for this category
  const { categoryInsurances, totalCoverage, totalPremium } = useMemo(() => {
    const filtered = allInsurances.filter(ins => {
      const insType = (ins.insuranceType || "Other");
      const insTypeSlug = insType.toLowerCase().replace(/\s+/g, '-');
      
      // Direct match by slug
      if (insTypeSlug === category) return true;
      
      // Match by config name
      if (insType === config.name) return true;
      
      // Handle "other" category for unknown types
      if (category === 'other') {
        return !Object.keys(insuranceTypeConfig).includes(insTypeSlug);
      }
      
      return false;
    });
    
    return {
      categoryInsurances: filtered,
      totalCoverage: filtered.reduce((sum, ins) => sum + (ins.coverageAmount || 0), 0),
      totalPremium: filtered.reduce((sum, ins) => sum + (ins.premiumAmount || 0), 0)
    };
  }, [allInsurances, category, config.name]);

  // Calculate next premium date
  const getNextPremiumDate = (insurance) => {
    if (!insurance.premiumPaymentDate || insurance.premiumFrequency === "One-Time") {
      return null;
    }
    
    const baseDate = new Date(insurance.premiumPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextDate = new Date(baseDate);
    
    while (isBefore(nextDate, today) || nextDate <= today) {
      switch (insurance.premiumFrequency) {
        case "Monthly":
          nextDate = addMonths(nextDate, 1);
          break;
        case "Quarterly":
          nextDate = addQuarters(nextDate, 1);
          break;
        case "Half-Yearly":
          nextDate = addMonths(nextDate, 6);
          break;
        case "Yearly":
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return null;
      }
    }
    
    return format(nextDate, "dd MMM yyyy");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return format(date, "dd MMM yyyy");
  };

  const sortedInsurances = [...categoryInsurances].sort((a, b) => 
    (b.coverageAmount || 0) - (a.coverageAmount || 0)
  );

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-base)" }}>
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
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className="h-5 w-5" style={{ color: config.color }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                {config.name}
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {config.description}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: config.bgColor }}
          >
            <p className="text-xs mb-1" style={{ color: config.color }}>Total Coverage</p>
            <p className="text-xl font-bold" style={{ color: config.color }}>
              ₹{formatAmount(totalCoverage)}
            </p>
            <p className="text-xs mt-1" style={{ color: config.color, opacity: 0.7 }}>
              {categoryInsurances.length} {categoryInsurances.length === 1 ? 'policy' : 'policies'}
            </p>
          </div>
          <div 
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
          >
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Total Premium</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              ₹{formatAmount(totalPremium)}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              per payment cycle
            </p>
          </div>
        </div>
      </div>

      {/* Insurance List */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            All Policies
          </h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {categoryInsurances.length} {categoryInsurances.length === 1 ? 'policy' : 'policies'}
          </span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : categoryInsurances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div 
              className="flex h-20 w-20 items-center justify-center rounded-full mb-4"
              style={{ backgroundColor: config.bgColor }}
            >
              <Icon className="h-10 w-10" style={{ color: config.color }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              No {config.name} Yet
            </h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              {config.description}
            </p>
            <button
              onClick={() => navigate(`/insurance?type=${encodeURIComponent(config.name)}`)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: config.color }}
              data-testid="add-insurance-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add {config.name}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedInsurances.map((insurance) => {
              const nextPremiumDate = getNextPremiumDate(insurance);
              
              return (
                <button
                  key={insurance.id}
                  onClick={() => navigate(`/wealth/insurance/${insurance.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ 
                    backgroundColor: "var(--bg-card)", 
                    border: "1px solid var(--border-light)"
                  }}
                  data-testid={`insurance-card-${insurance.id}`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: config.bgColor }}
                  >
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-semibold truncate mb-1" style={{ color: "var(--text-primary)" }}>
                      {insurance.policyName}
                    </h4>
                    <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
                      <span>Coverage: ₹{formatAmount(insurance.coverageAmount)}</span>
                      <span>•</span>
                      <span>Premium: ₹{formatAmount(insurance.premiumAmount)}</span>
                    </div>
                    {nextPremiumDate && (
                      <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: "var(--status-warning)" }}>
                        <Calendar className="h-3 w-3" />
                        <span>Next: {nextPremiumDate}</span>
                      </div>
                    )}
                    {insurance.endDate && (
                      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        Expires: {formatDate(insurance.endDate)}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: config.color }}>
                      ₹{formatAmount(insurance.coverageAmount)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {insurance.premiumFrequency}
                    </p>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        {categoryInsurances.length > 0 && (
          <button
            onClick={() => navigate(`/insurance?type=${encodeURIComponent(config.name)}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 mt-4 font-medium transition-all"
            style={{ borderColor: config.color, color: config.color }}
            data-testid="add-insurance-button"
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

export default CategoryInsurance;

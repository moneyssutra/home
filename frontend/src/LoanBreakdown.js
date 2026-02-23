import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Landmark, Home, Car, Building2, Briefcase, GraduationCap, CreditCard, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useLoanList } from "@/hooks/useApi";

// Loan type configurations
const loanTypeConfig = {
  "home-loan": { 
    name: "Home Loan", 
    icon: Home, 
    color: "#3B82F6", 
    bgColor: "#DBEAFE",
    description: "Housing and property loans"
  },
  "personal-loan": { 
    name: "Personal Loan", 
    icon: CreditCard, 
    color: "#8B5CF6", 
    bgColor: "#F3E8FF",
    description: "Personal and consumer loans"
  },
  "vehicle-loan": { 
    name: "Vehicle Loan", 
    icon: Car, 
    color: "#F59E0B", 
    bgColor: "#FEF3C7",
    description: "Car, bike, and vehicle financing"
  },
  "business-loan": { 
    name: "Business Loan", 
    icon: Briefcase, 
    color: "#EC4899", 
    bgColor: "#FCE7F3",
    description: "Business and commercial loans"
  },
  "education-loan": { 
    name: "Education Loan", 
    icon: GraduationCap, 
    color: "#14B8A6", 
    bgColor: "#CCFBF1",
    description: "Student and education loans"
  },
  "property-loan": { 
    name: "Property Loan", 
    icon: Building2, 
    color: "#6366F1", 
    bgColor: "#E0E7FF",
    description: "Commercial property loans"
  },
  "other": { 
    name: "Other", 
    icon: MoreHorizontal, 
    color: "#6B7280", 
    bgColor: "#F3F4F6",
    description: "Other loan types"
  },
};

const LoanBreakdown = () => {
  const navigate = useNavigate();
  const { data: loans = [], isLoading: loading } = useLoanList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Calculate stats by loan type
  const { totalOutstanding, totalPrincipal, typeBreakdown, activeLoans } = useMemo(() => {
    const breakdown = {};
    let outstanding = 0;
    let principal = 0;
    const active = loans.filter(l => (l.outstandingAmount > 0) || l.status === "Active");

    active.forEach(loan => {
      const type = loan.loanType || "Other";
      const typeSlug = type.toLowerCase().replace(/\s+/g, '-');
      
      if (!breakdown[typeSlug]) {
        breakdown[typeSlug] = {
          type,
          typeSlug,
          outstanding: 0,
          principal: 0,
          emi: 0,
          count: 0,
          loans: []
        };
      }
      
      breakdown[typeSlug].outstanding += loan.outstandingAmount || 0;
      breakdown[typeSlug].principal += loan.principalAmount || 0;
      breakdown[typeSlug].emi += loan.emiAmount || 0;
      breakdown[typeSlug].count += 1;
      breakdown[typeSlug].loans.push(loan);
      
      outstanding += loan.outstandingAmount || 0;
      principal += loan.principalAmount || 0;
    });

    return {
      totalOutstanding: outstanding,
      totalPrincipal: principal,
      typeBreakdown: Object.values(breakdown).sort((a, b) => b.outstanding - a.outstanding),
      activeLoans: active
    };
  }, [loans]);

  const chartColors = ["#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6", "#6366F1", "#6B7280"];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-base)" }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/my-loans")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
            aria-label="Go back"
            data-testid="back-button"
          >
            <ChevronRight className="h-5 w-5 rotate-180" style={{ color: "var(--text-primary)" }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Loan Breakdown</h1>
        </div>

        {/* Total Summary Card */}
        <div className="rounded-xl p-5 mb-4" style={{ background: "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)" }}>
          <p className="text-white/80 text-sm mb-1">Total Outstanding</p>
          <h2 className="text-3xl font-bold text-white mb-3">₹ {formatAmount(totalOutstanding)}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-white/70">Principal: </span>
              <span className="text-white font-semibold">₹{formatAmount(totalPrincipal)}</span>
            </div>
            <div>
              <span className="text-white/70">Active Loans: </span>
              <span className="text-white font-semibold">{activeLoans.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Type Categories */}
      <div className="px-6">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>By Loan Type</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : typeBreakdown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: "#FEE2E2" }}>
              <Landmark className="h-10 w-10" style={{ color: "#DC2626" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No Active Loans</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>You have no active loans</p>
          </div>
        ) : (
          <div className="space-y-3">
            {typeBreakdown.map((item, idx) => {
              const config = loanTypeConfig[item.typeSlug] || loanTypeConfig.other;
              const Icon = config.icon;
              const percentage = totalOutstanding > 0 ? (item.outstanding / totalOutstanding) * 100 : 0;
              
              return (
                <button
                  key={item.typeSlug}
                  onClick={() => navigate(`/loans/${item.typeSlug}`)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                  data-testid={`loan-type-${item.typeSlug}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    <Icon className="h-6 w-6" style={{ color: config.color }} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold" style={{ color: "var(--text-primary)" }}>{item.type}</h4>
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(item.outstanding)}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {item.count} {item.count === 1 ? 'loan' : 'loans'} • EMI: ₹{formatAmount(item.emi)}/mo
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

export default LoanBreakdown;

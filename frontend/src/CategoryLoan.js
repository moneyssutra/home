import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Plus, Landmark, Home, Car, Building2, Briefcase, GraduationCap, CreditCard, MoreHorizontal, CheckCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useLoanList } from "@/hooks/useApi";

// Loan type configurations
const loanTypeConfig = {
  "home-loan": { name: "Home Loan", icon: Home, color: "#3B82F6", bgColor: "#DBEAFE", description: "Housing and property loans" },
  "personal-loan": { name: "Personal Loan", icon: CreditCard, color: "#8B5CF6", bgColor: "#F3E8FF", description: "Personal and consumer loans" },
  "vehicle-loan": { name: "Vehicle Loan", icon: Car, color: "#F59E0B", bgColor: "#FEF3C7", description: "Car, bike, and vehicle financing" },
  "business-loan": { name: "Business Loan", icon: Briefcase, color: "#EC4899", bgColor: "#FCE7F3", description: "Business and commercial loans" },
  "education-loan": { name: "Education Loan", icon: GraduationCap, color: "#14B8A6", bgColor: "#CCFBF1", description: "Student and education loans" },
  "property-loan": { name: "Property Loan", icon: Building2, color: "#6366F1", bgColor: "#E0E7FF", description: "Commercial property loans" },
  "other": { name: "Other", icon: MoreHorizontal, color: "#6B7280", bgColor: "#F3F4F6", description: "Other loan types" },
};

const CategoryLoan = () => {
  const navigate = useNavigate();
  const { category } = useParams();
  const [showAddSheet, setShowAddSheet] = useState(false);
  
  const config = loanTypeConfig[category] || loanTypeConfig.other;
  const Icon = config.icon;
  
  const { data: allLoans = [], isLoading: loading } = useLoanList();

  const formatAmount = (amount) => {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)} K`;
    return new Intl.NumberFormat("en-IN").format(amount);
  };

  // Filter loans for this category
  const { categoryLoans, totalOutstanding, totalEmi } = useMemo(() => {
    const filtered = allLoans.filter(loan => {
      const loanType = (loan.loanType || "Other");
      const loanTypeSlug = loanType.toLowerCase().replace(/\s+/g, '-');
      return loanTypeSlug === category || loanType === config.name;
    });
    
    const activeLoans = filtered.filter(l => (l.outstandingAmount > 0) || l.status === "Active");
    
    return {
      categoryLoans: filtered,
      totalOutstanding: activeLoans.reduce((sum, l) => sum + (l.outstandingAmount || 0), 0),
      totalEmi: activeLoans.reduce((sum, l) => sum + (l.emiAmount || 0), 0)
    };
  }, [allLoans, category, config.name]);

  const calculateProgress = (loan) => {
    const paid = loan.principalAmount - loan.outstandingAmount;
    return (paid / loan.principalAmount) * 100;
  };

  const sortedLoans = [...categoryLoans].sort((a, b) => {
    // Active loans first, then by outstanding amount
    const aActive = (a.outstandingAmount > 0) || a.status === "Active";
    const bActive = (b.outstandingAmount > 0) || b.status === "Active";
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return (b.outstandingAmount || 0) - (a.outstandingAmount || 0);
  });

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-base)" }}>
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
          <div className="rounded-xl p-4" style={{ backgroundColor: "#FEE2E2" }}>
            <p className="text-xs mb-1" style={{ color: "#DC2626" }}>Outstanding</p>
            <p className="text-xl font-bold" style={{ color: "#DC2626" }}>₹{formatAmount(totalOutstanding)}</p>
          </div>
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Monthly EMI</p>
            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(totalEmi)}</p>
          </div>
        </div>
      </div>

      {/* Loan List */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>All Loans</h3>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{categoryLoans.length} {categoryLoans.length === 1 ? 'loan' : 'loans'}</span>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div style={{ color: "var(--text-muted)" }}>Loading...</div>
          </div>
        ) : categoryLoans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full mb-4" style={{ backgroundColor: config.bgColor }}>
              <Icon className="h-10 w-10" style={{ color: config.color }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>No {config.name}s Yet</h2>
            <p className="text-center text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{config.description}</p>
            <button
              onClick={() => navigate(`/loan?type=${encodeURIComponent(config.name)}`)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-white font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: config.color }}
              data-testid="add-loan-empty-button"
            >
              <Plus className="h-5 w-5" />
              Add {config.name}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLoans.map((loan) => {
              const isActive = (loan.outstandingAmount > 0) || loan.status === "Active";
              const progress = calculateProgress(loan);
              
              return (
                <button
                  key={loan.id}
                  onClick={() => navigate(`/wealth/loans/${loan.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:shadow-md"
                  style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", opacity: isActive ? 1 : 0.7 }}
                  data-testid={`loan-card-${loan.id}`}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: config.bgColor }}>
                    {isActive ? (
                      <Icon className="h-6 w-6" style={{ color: config.color }} />
                    ) : (
                      <CheckCircle className="h-6 w-6" style={{ color: "#16A34A" }} />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{loan.loanName}</h4>
                      {!isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                      {loan.lenderName || 'Lender'} • EMI: ₹{formatAmount(loan.emiAmount || 0)}
                    </div>
                    {isActive && (
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="font-bold" style={{ color: isActive ? "#DC2626" : "#16A34A" }}>
                      ₹{formatAmount(loan.outstandingAmount || 0)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {isActive ? 'Outstanding' : 'Paid Off'}
                    </p>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Add Button */}
        {categoryLoans.length > 0 && (
          <button
            onClick={() => navigate(`/loan?type=${encodeURIComponent(config.name)}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 mt-4 font-medium transition-all"
            style={{ borderColor: config.color, color: config.color }}
            data-testid="add-loan-button"
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

export default CategoryLoan;

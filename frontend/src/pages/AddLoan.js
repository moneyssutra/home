import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Home, Car, User, GraduationCap, Briefcase, Coins, CreditCard, HandCoins, Layers } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const loanTypes = [
  { key: "Home Loan", label: "Home Loan", desc: "Housing loan, mortgage", icon: Home, color: "#3B82F6", bg: "#EFF6FF" },
  { key: "Vehicle Loan", label: "Vehicle Loan", desc: "Car loan, bike loan", icon: Car, color: "#D97706", bg: "#FEF3C7" },
  { key: "Personal Loan", label: "Personal Loan", desc: "Unsecured personal loan", icon: User, color: "#7C3AED", bg: "#F5F3FF" },
  { key: "Education Loan", label: "Education Loan", desc: "Student loan, study abroad", icon: GraduationCap, color: "#059669", bg: "#ECFDF5" },
  { key: "Business Loan", label: "Business Loan", desc: "Business expansion, working capital", icon: Briefcase, color: "#0891B2", bg: "#ECFEFF" },
  { key: "Gold Loan", label: "Gold Loan", desc: "Loan against gold", icon: Coins, color: "#CA8A04", bg: "#FEF9C3" },
  { key: "Credit Card Dues", label: "Credit Card Dues", desc: "Outstanding credit card balance", icon: CreditCard, color: "#DC2626", bg: "#FEF2F2" },
  { key: "Hand Loan Taken", label: "Hand Loan Taken", desc: "Borrowed from friends/family", icon: HandCoins, color: "#EA580C", bg: "#FFF7ED" },
  { key: "Other", label: "Other", desc: "Any other loan", icon: Layers, color: "#475569", bg: "#F1F5F9" },
];

const AddLoan = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-loan-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Loan</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select loan type to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {loanTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(`/loan?type=${encodeURIComponent(type.key)}`)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`loan-type-${type.key.toLowerCase().replace(/[\s]+/g, '-')}`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: type.bg }}>
                <Icon className="h-6 w-6" style={{ color: type.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{type.label}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{type.desc}</p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <ArrowLeft className="h-3 w-3 rotate-180" style={{ color: "var(--text-muted)" }} />
              </div>
            </button>
          );
        })}
      </div>
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default AddLoan;

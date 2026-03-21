import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Home, Zap, UtensilsCrossed, Plane, ShoppingBag, Stethoscope, GraduationCap, CreditCard, Briefcase, Banknote, Layers } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const expenseTypes = [
  { key: "Housing", label: "Housing", desc: "Rent, maintenance, society charges", icon: Home, color: "#3B82F6", bg: "#EFF6FF" },
  { key: "Utilities", label: "Utilities", desc: "Electricity, water, gas, internet", icon: Zap, color: "#F59E0B", bg: "#FFFBEB" },
  { key: "Food", label: "Food", desc: "Groceries, dining out, delivery", icon: UtensilsCrossed, color: "#059669", bg: "#ECFDF5" },
  { key: "Travel", label: "Travel", desc: "Fuel, transport, trips", icon: Plane, color: "#7C3AED", bg: "#F5F3FF" },
  { key: "Shopping", label: "Shopping", desc: "Clothing, electronics, household", icon: ShoppingBag, color: "#EC4899", bg: "#FDF2F8" },
  { key: "Medical", label: "Medical", desc: "Doctor visits, medicines, tests", icon: Stethoscope, color: "#DC2626", bg: "#FEF2F2" },
  { key: "Education", label: "Education", desc: "Tuition, courses, books", icon: GraduationCap, color: "#0891B2", bg: "#ECFEFF" },
  { key: "Subscriptions", label: "Subscriptions", desc: "Netflix, gym, SaaS tools", icon: CreditCard, color: "#6366F1", bg: "#EEF2FF" },
  { key: "Business Expense", label: "Business Expense", desc: "Office, staff, operational costs", icon: Briefcase, color: "#D97706", bg: "#FEF3C7" },
  { key: "Salary Paid", label: "Salary Paid", desc: "Employee/staff salary payments", icon: Banknote, color: "#0D9488", bg: "#CCFBF1" },
  { key: "Other", label: "Other", desc: "Any other expense", icon: Layers, color: "#475569", bg: "#F1F5F9" },
];

const AddExpense = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-expense-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Expense</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select expense category to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {expenseTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(`/expense?category=${encodeURIComponent(type.key)}`)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`expense-type-${type.key.toLowerCase().replace(/[\s]+/g, '-')}`}
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

export default AddExpense;

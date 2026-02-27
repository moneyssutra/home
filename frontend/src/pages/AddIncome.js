import { useNavigate } from "react-router-dom";
import { ArrowLeft, Briefcase, Building2, UserCheck, Home, Percent, TrendingUp, PieChart, Gift } from "lucide-react";

const incomeTypes = [
  { key: "Job", label: "Job", desc: "Salary, wages, bonuses", icon: Briefcase, color: "#3B82F6", bg: "#EFF6FF", path: "/job-income" },
  { key: "Business", label: "Business", desc: "Business profits, revenue", icon: Building2, color: "#059669", bg: "#ECFDF5", path: "/business-income" },
  { key: "Self-Employed", label: "Self-Employed", desc: "Freelance, consulting", icon: UserCheck, color: "#D97706", bg: "#FEF3C7", path: "/self-employed-income" },
  { key: "Rental", label: "Rental", desc: "Add property asset with rental income", icon: Home, color: "#F59E0B", bg: "#FFFBEB", path: "/asset" },
  { key: "Commission", label: "Commission", desc: "Sales commissions, referrals", icon: Percent, color: "#EC4899", bg: "#FDF2F8", path: "/commission-income" },
  { key: "Interest", label: "Interest", desc: "Add investment with interest income", icon: TrendingUp, color: "#0891B2", bg: "#ECFEFF", path: "/investment" },
  { key: "Dividend", label: "Dividend", desc: "Add investment with dividend income", icon: PieChart, color: "#10B981", bg: "#ECFDF5", path: "/investment" },
  { key: "Other", label: "Other Income", desc: "Gifts, refunds, misc", icon: Gift, color: "#8B5CF6", bg: "#F5F3FF", path: "/other-income" },
];

const AddIncome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-income-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/my-income")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Income</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select income type to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {incomeTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(type.path)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`income-type-${type.key.toLowerCase().replace(/\s+/g, '-')}`}
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
    </div>
  );
};

export default AddIncome;

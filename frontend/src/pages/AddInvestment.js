import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Landmark, BarChart3, TrendingUp, Coins, Shield, Gem, Bitcoin, Banknote, PiggyBank, CircleDollarSign, HandCoins, Layers, BarChart, Wallet } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const investmentTypes = [
  { key: "Fixed Deposit (FD)", label: "Fixed Deposit (FD)", desc: "Bank FDs with fixed returns", icon: Landmark, color: "#3B82F6", bg: "#EFF6FF" },
  { key: "Recurring Deposit (RD)", label: "Recurring Deposit (RD)", desc: "Monthly deposits, fixed returns", icon: PiggyBank, color: "#0891B2", bg: "#ECFEFF" },
  { key: "Mutual Fund", label: "Mutual Fund", desc: "SIP or lumpsum in MFs", icon: BarChart3, color: "#059669", bg: "#ECFDF5" },
  { key: "Stocks", label: "Stocks", desc: "Indian equity shares", icon: TrendingUp, color: "#D97706", bg: "#FEF3C7" },
  { key: "US Stocks", label: "US Stocks", desc: "International equity holdings", icon: BarChart, color: "#7C3AED", bg: "#F5F3FF" },
  { key: "ETF", label: "ETF", desc: "Exchange traded funds", icon: Layers, color: "#2563EB", bg: "#DBEAFE" },
  { key: "Bonds", label: "Bonds", desc: "Govt & corporate bonds", icon: Shield, color: "#0D9488", bg: "#CCFBF1" },
  { key: "Sovereign Gold Bond (SGB)", label: "Sovereign Gold Bond", desc: "RBI gold bonds", icon: Coins, color: "#CA8A04", bg: "#FEF9C3" },
  { key: "Digital Gold", label: "Digital Gold", desc: "Online gold investments", icon: Coins, color: "#F59E0B", bg: "#FFFBEB" },
  { key: "Digital Silver", label: "Digital Silver", desc: "Online silver investments", icon: Gem, color: "#64748B", bg: "#F1F5F9" },
  { key: "PPF", label: "PPF", desc: "Public Provident Fund", icon: PiggyBank, color: "#16A34A", bg: "#DCFCE7" },
  { key: "EPF", label: "EPF", desc: "Employee Provident Fund", icon: Wallet, color: "#047857", bg: "#D1FAE5" },
  { key: "NPS", label: "NPS", desc: "National Pension System", icon: Shield, color: "#9333EA", bg: "#F3E8FF" },
  { key: "Crypto", label: "Crypto", desc: "Bitcoin, Ethereum, etc.", icon: Bitcoin, color: "#EA580C", bg: "#FFF7ED" },
  { key: "ULIP", label: "ULIP", desc: "Unit linked insurance plan", icon: Shield, color: "#EC4899", bg: "#FDF2F8" },
  { key: "P2P Lending", label: "P2P Lending", desc: "Peer to peer lending", icon: HandCoins, color: "#6366F1", bg: "#EEF2FF" },
  { key: "SWP", label: "SWP", desc: "Systematic Withdrawal Plan", icon: CircleDollarSign, color: "#DC2626", bg: "#FEF2F2" },
  { key: "Loan Given", label: "Loan Given", desc: "Money lent to others", icon: Banknote, color: "#78716C", bg: "#F5F5F4" },
  { key: "Other", label: "Other", desc: "Any other investment", icon: Layers, color: "#475569", bg: "#F1F5F9" },
];

const AddInvestment = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-investment-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Investment</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select investment type to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {investmentTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(`/investment?category=${encodeURIComponent(type.key)}`)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`investment-type-${type.key.toLowerCase().replace(/[\s()]+/g, '-')}`}
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

export default AddInvestment;

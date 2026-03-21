import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Banknote, Building, Wallet, MoreHorizontal } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";

const accountTypes = [
  { key: "Cash", label: "Cash", desc: "Physical cash on hand", icon: Banknote, color: "#059669", bg: "#ECFDF5", path: "/account?type=Cash" },
  { key: "Bank Account", label: "Bank Account", desc: "Savings, salary, current account", icon: Building, color: "#3B82F6", bg: "#EFF6FF", path: "/account?type=Bank+Account" },
  { key: "Wallet", label: "Wallet", desc: "Digital wallets like Paytm, PhonePe", icon: Wallet, color: "#8B5CF6", bg: "#F5F3FF", path: "/account?type=Wallet" },
  { key: "Others", label: "Others", desc: "Any other type of account", icon: MoreHorizontal, color: "#6B7280", bg: "#F3F4F6", path: "/account?type=Others" },
];

const AddAccount = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="add-account-page">
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" style={{ color: "var(--text-primary)" }} />
          </button>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Add Account</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Select account type to continue</p>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-3">
        {accountTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.key}
              onClick={() => navigate(type.path)}
              className="w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98] hover:shadow-md"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
              data-testid={`account-type-${type.key.toLowerCase().replace(/\s+/g, '-')}`}
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

export default AddAccount;

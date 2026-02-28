import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useState } from "react";

const TABS = [
  { label: "Overview", path: "/wealth/expenses/overview" },
  { label: "Daily", path: "/wealth/expenses/daily" },
  { label: "Weekly", path: "/wealth/expenses/weekly" },
  { label: "Monthly", path: "/wealth/expenses/monthly" },
];

export const THEME = {
  bg: "linear-gradient(180deg, #0B1220 0%, #0F1B2D 100%)",
  bgSolid: "#0B1220",
  card: "rgba(15, 27, 45, 0.7)",
  cardBorder: "rgba(100, 140, 200, 0.1)",
  cardHover: "rgba(20, 40, 70, 0.8)",
  glass: "rgba(20, 35, 60, 0.5)",
  essential: "#3B82F6",
  lifestyle: "#F59E0B",
  wealth: "#10B981",
  accent: "#6366F1",
  danger: "#EF4444",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  barTrack: "#1E293B",
  divider: "rgba(100, 140, 200, 0.08)",
};

export const fmt = (n) => {
  if (!n && n !== 0) return "0";
  const a = Math.abs(n);
  if (a >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
};

export const fmtFull = (n) => {
  if (!n && n !== 0) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
};

const ExpenseLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddSheet, setShowAddSheet] = useState(false);

  const activeTab = TABS.findIndex((t) => location.pathname === t.path);

  return (
    <div
      className="min-h-screen pb-28 no-scrollbar"
      style={{ background: THEME.bg }}
      data-testid="expense-intelligence"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate("/wealth")}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${THEME.cardBorder}` }}
            data-testid="expense-back-btn"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: THEME.textSecondary }} />
          </button>
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ color: THEME.textPrimary, fontFamily: "'Manrope', sans-serif" }}
            >
              Expense Intelligence
            </h1>
            <p className="text-xs" style={{ color: THEME.textMuted }}>
              Deep dive into your spending
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${THEME.cardBorder}` }}
          data-testid="expense-tabs"
        >
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  color: isActive ? "#818CF8" : THEME.textMuted,
                  border: isActive ? "1px solid rgba(99, 102, 241, 0.25)" : "1px solid transparent",
                }}
                data-testid={`tab-${tab.label.toLowerCase()}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Page Content */}
      <div className="px-5 pb-4">{children}</div>

      <BottomNav onAddClick={() => setShowAddSheet(true)} />
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
    </div>
  );
};

export default ExpenseLayout;

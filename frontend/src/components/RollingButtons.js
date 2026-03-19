import { useNavigate, useLocation } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Shield,
  CreditCard,
  PiggyBank,
  Target,
  Receipt,
  HandCoins,
  Building2,
  LineChart,
  Landmark,
  BadgeDollarSign,
} from "lucide-react";

const BUTTON_GROUPS = [
  {
    id: "track",
    items: [
      { label: "Expenses", icon: Receipt, route: "/my-expenses", color: "#EF4444" },
      { label: "Income", icon: BadgeDollarSign, route: "/my-income", color: "#10B981" },
      { label: "Accounts", icon: Wallet, route: "/my-accounts", color: "#3B82F6" },
      { label: "Cards", icon: CreditCard, route: "/my-credit-cards", color: "#8B5CF6" },
    ],
    duration: "11.2s",  // 2.8s per item × 4
  },
  {
    id: "grow",
    items: [
      { label: "Invest", icon: LineChart, route: "/my-investments", color: "#8B5CF6" },
      { label: "Assets", icon: Building2, route: "/my-assets", color: "#3B82F6" },
      { label: "Loans", icon: HandCoins, route: "/my-investments", color: "#F59E0B" },
      { label: "Insure", icon: Shield, route: "/my-insurance", color: "#10B981" },
    ],
    duration: "12.8s",  // 3.2s per item × 4
  },
  {
    id: "plan",
    items: [
      { label: "Goals", icon: Target, route: "/my-goals", color: "#F59E0B" },
      { label: "Savings", icon: PiggyBank, route: "/my-accounts", color: "#10B981" },
      { label: "Debts", icon: Landmark, route: "/my-liabilities", color: "#EF4444" },
      { label: "Worth", icon: TrendingUp, route: "/dashboard", color: "#3B82F6" },
    ],
    duration: "14.4s",  // 3.6s per item × 4
  },
];

/*
  Pure CSS animation — each of 4 items gets 25% of the total cycle.
  Within each 25% slot: fade-in (3%), visible (19%), fade-out (3%).
  Keyframes:
    0%   → opacity 0
    3%   → opacity 1   (fade in)
    22%  → opacity 1   (visible)
    25%  → opacity 0   (fade out)
    100% → opacity 0   (hidden for rest)
*/

const PillButton = ({ group }) => {
  const navigate = useNavigate();

  return (
    <div className="rb-pill" data-testid={`rolling-btn-${group.id}`}>
      {group.items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={i}
            className="rb-layer"
            style={{
              animationName: "rbCycle",
              animationDuration: group.duration,
              animationTimingFunction: "ease",
              animationIterationCount: "infinite",
              animationDelay: `${(i * parseFloat(group.duration)) / 4}s`,
            }}
            onClick={() => navigate(item.route)}
            data-testid={`rolling-btn-${group.id}-${i}`}
          >
            <span className="rb-icon" style={{ background: `${item.color}15`, color: item.color }}>
              <Icon size={13} strokeWidth={2.5} />
            </span>
            <span className="rb-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const RollingButtons = () => {
  return (
    <div className="rb-container" data-testid="rolling-buttons-section">
      {BUTTON_GROUPS.map((group) => (
        <PillButton key={group.id} group={group} />
      ))}
    </div>
  );
};

export default RollingButtons;

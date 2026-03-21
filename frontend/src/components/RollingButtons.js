import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
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
      { label: "Cards", icon: CreditCard, route: "/credit-cards-experimental", color: "#8B5CF6" },
      { label: "Credit Cards", icon: CreditCard, route: "/credit-cards-experimental", color: "#8B5CF6" },
    ],
    interval: 2800,
    shimmerDelay: "0s",
  },
  {
    id: "goals",
    items: [
      { label: "Goals", icon: Target, route: "/dream-goals", color: "#F59E0B" },
      { label: "Dream Tracker", icon: Target, route: "/dream-goals", color: "#F59E0B" },
    ],
    interval: 3200,
    shimmerDelay: "0.6s",
  },
  {
    id: "plan",
    items: [
      { label: "Bank Balance", icon: Landmark, route: "/bank-accounts-experimental", color: "#3B82F6" },
      { label: "Check your balance", icon: Landmark, route: "/bank-accounts-experimental", color: "#3B82F6" },
    ],
    interval: 3600,
    shimmerDelay: "1.3s",
  },
];

const ITEM_H = 38;

const RollingButton = ({ group }) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const items = group.items;

  const advance = useCallback(() => {
    setIsRolling(true);
    const t = setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
      setIsRolling(false);
    }, 350);
    return () => clearTimeout(t);
  }, [items.length]);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(advance, group.interval);
    return () => clearInterval(id);
  }, [isPaused, advance, group.interval]);

  const curr = items[activeIndex];
  const next = items[(activeIndex + 1) % items.length];
  const CurrIcon = curr.icon;
  const NextIcon = next.icon;

  return (
    <button
      className="rb-pill"
      data-testid={`rolling-btn-${group.id}`}
      onClick={() => navigate(curr.route)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Shimmer light sweep */}
      <span className="rb-shimmer" style={{ animationDelay: group.shimmerDelay }} />
      <div className="rb-clip">
        <div
          className="rb-track"
          style={{
            transform: isRolling ? `translateY(-${ITEM_H}px)` : "translateY(0)",
            transition: isRolling ? "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          }}
        >
          <div className="rb-item">
            <span className="rb-icon" style={{ background: `${curr.color}15`, color: curr.color }}>
              <CurrIcon size={13} strokeWidth={2.5} />
            </span>
            <span className="rb-label">{curr.label}</span>
          </div>
          <div className="rb-item">
            <span className="rb-icon" style={{ background: `${next.color}15`, color: next.color }}>
              <NextIcon size={13} strokeWidth={2.5} />
            </span>
            <span className="rb-label">{next.label}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

const RollingButtons = () => {
  return (
    <div className="rb-container" data-testid="rolling-buttons-section">
      {BUTTON_GROUPS.map((group) => (
        <RollingButton key={group.id} group={group} />
      ))}
    </div>
  );
};

export default RollingButtons;

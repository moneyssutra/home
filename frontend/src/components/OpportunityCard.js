import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Shield, TrendingUp, Wallet, Heart, ChevronRight, Crown } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_CONFIG = {
  Safety: { icon: Shield, color: "#059669", bg: "#05966912", border: "#05966930", label: "Safety Suggestion" },
  Growth: { icon: TrendingUp, color: "#3B82F6", bg: "#3B82F612", border: "#3B82F630", label: "Growth Opportunity" },
  Debt: { icon: Wallet, color: "#F59E0B", bg: "#F59E0B12", border: "#F59E0B30", label: "Financial Upgrade" },
  Protection: { icon: Heart, color: "#8B5CF6", bg: "#8B5CF612", border: "#8B5CF630", label: "Protection Suggestion" },
};

export function OpportunityCard({ opportunity, onDismiss, isPremium }) {
  const navigate = useNavigate();
  const [dismissing, setDismissing] = useState(false);
  const config = CATEGORY_CONFIG[opportunity.category] || CATEGORY_CONFIG.Growth;
  const Icon = config.icon;

  const handleDismiss = async (e) => {
    e.stopPropagation();
    setDismissing(true);
    try {
      await axios.post(`${backendUrl}/api/opportunities/dismiss`, { opportunity_id: opportunity.id }, { withCredentials: true });
      onDismiss?.(opportunity.id);
    } catch {
      toast.error("Could not dismiss");
    }
    setDismissing(false);
  };

  const handleClick = async () => {
    try {
      await axios.post(`${backendUrl}/api/opportunities/track`, { opportunity_id: opportunity.id, event: "opportunity_clicked" }, { withCredentials: true });
    } catch { /* non-blocking */ }
    if (opportunity.destination_url) {
      navigate(opportunity.destination_url);
    }
  };

  return (
    <div
      className="rounded-2xl p-4 relative transition-all"
      style={{ backgroundColor: config.bg, border: `1px solid ${config.border}` }}
      data-testid={`opportunity-card-${opportunity.id}`}
    >
      {isPremium && (
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
          style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
          data-testid={`dismiss-opp-${opportunity.id}`}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}18` }}>
          <Icon className="h-5 w-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: config.color }}>{config.label}</span>
            {opportunity.premium_only && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700" data-testid="premium-badge">
                <Crown className="h-2.5 w-2.5" /> PREMIUM
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold mt-0.5 leading-tight" style={{ color: "var(--text-primary)" }}>{opportunity.title}</h4>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{opportunity.description}</p>
          <button
            onClick={handleClick}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-[0.97]"
            style={{ backgroundColor: config.color }}
            data-testid={`opp-cta-${opportunity.id}`}
          >
            {opportunity.cta_text || "Learn More"}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Fingerprint, Shield, Target, Zap } from "lucide-react";

const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

const DNA_COLORS = { needs: "#3B82F6", wants: "#F59E0B", savings: "#10B981", emi: "#EF4444" };
const DNA_LABELS = { needs: "Needs", wants: "Wants", savings: "Savings", emi: "EMI" };
const ZONE_META = {
  Survival: { color: "#EF4444", bg: "#EF444410", label: "Survival Zone" },
  Stabilizing: { color: "#F97316", bg: "#F9731610", label: "Stabilizing Zone" },
  Control: { color: "#EAB308", bg: "#EAB30810", label: "Control Zone" },
  Growth: { color: "#22C55E", bg: "#22C55E10", label: "Growth Zone" },
  Advanced: { color: "#3B82F6", bg: "#3B82F610", label: "Advanced Zone" },
};

export default function MoneyPatternWidget({ data }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const dna = data.spendingDNA || {};
  const dnaEntries = Object.entries(dna).filter(([, v]) => v > 0);
  const total = dnaEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const zone = ZONE_META[data.zone] || ZONE_META.Control;
  const confidence = data.confidence || 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="money-pattern-widget">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${zone.color}15`, border: `2px solid ${zone.color}30` }}>
            <span className="text-lg font-black" style={{ color: zone.color }}>{data.personalityId || "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: zone.bg, color: zone.color }}>
                {zone.label}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg-subtle)", color: confidence >= 80 ? "#10B981" : confidence >= 60 ? "#F59E0B" : "#EF4444" }}>
                {confidence}% match
              </span>
            </div>
            <p className="text-base font-black mt-1" style={{ color: "var(--text-primary)" }} data-testid="money-personality">{data.personality}</p>
            {data.secondary && (
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                Also traits of: <span className="font-bold" style={{ color: "var(--text-secondary)" }}>{data.secondary}</span>
              </p>
            )}
          </div>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{data.tagline}</p>
      </div>

      {/* Spending DNA Bar */}
      <div className="px-5 pb-3">
        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Spending DNA</p>
        <div className="h-4 rounded-full overflow-hidden flex" style={{ backgroundColor: "var(--bg-subtle)" }}>
          {dnaEntries.map(([key, val]) => (
            <div key={key} style={{ width: `${(val / total) * 100}%`, backgroundColor: DNA_COLORS[key], minWidth: val > 0 ? "8px" : "0" }}
              className="h-full transition-all" />
          ))}
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {dnaEntries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DNA_COLORS[key] }} />
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{DNA_LABELS[key]} {val}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics Row */}
      {data.metrics && (
        <div className="px-5 pb-3">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Survival", val: `${data.metrics.survivalDays}d`, color: zone.color },
              { label: "Score", val: data.metrics.controlScore, color: "#3B82F6" },
              { label: "Savings", val: `${data.metrics.savingsRate}%`, color: "#10B981" },
              { label: "Debt", val: `${data.metrics.debtToIncome}%`, color: data.metrics.debtToIncome > 40 ? "#EF4444" : "#F59E0B" },
            ].map((m, i) => (
              <div key={i} className="text-center p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                <p className="text-xs font-bold" style={{ color: m.color }}>{m.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Expense Categories */}
      {data.topExpenseCategories?.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Top Spending Areas</p>
          <div className="space-y-1">
            {data.topExpenseCategories.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{c.category}</span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(c.amount)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand for Strengths & Blind Spots */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1 py-2.5 text-[10px] font-bold"
        style={{ borderTop: "1px solid var(--border-light)", color: "var(--brand-primary)" }} data-testid="pattern-expand-btn">
        {expanded ? "Hide Details" : "Strengths & Blind Spots"}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {data.strengths?.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "#10B981" }}>
                <CheckCircle className="h-3 w-3" /> Strengths
              </p>
              <div className="space-y-1">
                {data.strengths.map((s, i) => (
                  <p key={i} className="text-xs pl-4" style={{ color: "var(--text-secondary)" }}>{s}</p>
                ))}
              </div>
            </div>
          )}
          {data.blindSpots?.length > 0 && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1" style={{ color: "#F59E0B" }}>
                <AlertCircle className="h-3 w-3" /> Blind Spots
              </p>
              <div className="space-y-1">
                {data.blindSpots.map((s, i) => (
                  <p key={i} className="text-xs pl-4" style={{ color: "var(--text-secondary)" }}>{s}</p>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2 pt-2" style={{ borderTop: "1px solid var(--border-light)" }}>
            {[
              { label: "Income", val: data.metrics?.monthlyIncome, color: "#10B981" },
              { label: "Expenses", val: data.metrics?.totalExpenses, color: "#EF4444" },
              { label: "Savings", val: data.metrics?.savings, color: "#3B82F6" },
              { label: "Investments", val: data.metrics?.investments, color: "#8B5CF6", isCount: true },
            ].map((m, i) => (
              <div key={i} className="text-center">
                <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                <p className="text-xs font-bold" style={{ color: m.color }}>{m.isCount ? m.val : `₹${fmt(m.val || 0)}`}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Fingerprint, Info, X } from "lucide-react";

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

const ALL_PERSONALITIES = [
  { id: 1, name: "Firefighter", zone: "Survival", color: "#EF4444" },
  { id: 2, name: "Drifter", zone: "Survival", color: "#EF4444" },
  { id: 3, name: "EMI Trapped", zone: "Survival", color: "#EF4444" },
  { id: 4, name: "Lifestyle Inflator", zone: "Survival", color: "#EF4444" },
  { id: 5, name: "Recovering Planner", zone: "Stabilizing", color: "#F97316" },
  { id: 6, name: "Buffer Builder", zone: "Stabilizing", color: "#F97316" },
  { id: 7, name: "Expense Controller", zone: "Stabilizing", color: "#F97316" },
  { id: 8, name: "Debt Warrior", zone: "Stabilizing", color: "#F97316" },
  { id: 9, name: "Structured Controller", zone: "Control", color: "#EAB308" },
  { id: 10, name: "Stability Seeker", zone: "Control", color: "#EAB308" },
  { id: 11, name: "Silent Saver", zone: "Control", color: "#EAB308" },
  { id: 12, name: "Score Climber", zone: "Control", color: "#EAB308" },
  { id: 13, name: "Wealth Builder", zone: "Growth", color: "#22C55E" },
  { id: 14, name: "Diversifier", zone: "Growth", color: "#22C55E" },
  { id: 15, name: "Income Multiplier", zone: "Growth", color: "#22C55E" },
  { id: 16, name: "Strategic Planner", zone: "Growth", color: "#22C55E" },
  { id: 17, name: "Capital Guardian", zone: "Advanced", color: "#3B82F6" },
  { id: 18, name: "Risk Balancer", zone: "Advanced", color: "#3B82F6" },
  { id: 19, name: "Financial Architect", zone: "Advanced", color: "#3B82F6" },
  { id: 20, name: "Sovereign", zone: "Advanced", color: "#3B82F6" },
];

const METRIC_INFO = {
  Survival: { meaning: "How many days you can survive without any income, using only your accessible savings.", formula: "Effective Funds / Daily Essential Expenses" },
  Score: { meaning: "Your overall financial control score combining savings, debt, buffer and income consistency.", formula: "Savings Rate + EMI Load + Safety Buffer + Income Consistency (each max 25)" },
  Savings: { meaning: "Percentage of your monthly income that you actually save after all expenses.", formula: "(Income - All Expenses) / Income x 100" },
  Debt: { meaning: "How much of your income goes to EMI repayments. Lower is better.", formula: "Total Monthly EMIs / Monthly Income x 100" },
};

export default function MoneyPatternWidget({ data }) {
  const [expanded, setExpanded] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [activeMetric, setActiveMetric] = useState(null);
  if (!data) return null;

  const dna = data.spendingDNA || {};
  const dnaEntries = Object.entries(dna).filter(([, v]) => v > 0);
  const total = dnaEntries.reduce((s, [, v]) => s + v, 0) || 1;
  const zone = ZONE_META[data.zone] || ZONE_META.Control;
  const confidence = data.confidence || 0;
  const currentId = data.personalityId || 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="money-pattern-widget">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="h-5 w-5" style={{ color: "#8B5CF6" }} />
          <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Your Money Personality</h3>
          <button onClick={() => setShowAllTypes(!showAllTypes)} className="ml-auto p-0.5" data-testid="personality-info-btn">
            <Info className="h-4 w-4" style={{ color: showAllTypes ? "#8B5CF6" : "var(--text-muted)" }} />
          </button>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${zone.color}15`, border: `2px solid ${zone.color}30` }}>
            <span className="text-lg font-black" style={{ color: zone.color }}>{currentId}</span>
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
        <p className="text-xs leading-relaxed mt-2" style={{ color: "var(--text-secondary)" }}>{data.tagline}</p>
      </div>

      {/* All 20 types panel */}
      {showAllTypes && (
        <div className="px-5 pb-3">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div className="max-h-[260px] overflow-y-auto">
              {["Survival", "Stabilizing", "Control", "Growth", "Advanced"].map((zoneName) => {
                const zm = ZONE_META[zoneName];
                const types = ALL_PERSONALITIES.filter(p => p.zone === zoneName);
                return (
                  <div key={zoneName}>
                    <div className="px-3 py-1.5 sticky top-0" style={{ backgroundColor: zm.bg, borderBottom: `1px solid ${zm.color}20` }}>
                      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: zm.color }}>{zm.label} ({types[0].id}-{types[types.length-1].id})</span>
                    </div>
                    {types.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-1.5" style={{
                        backgroundColor: p.id === currentId ? `${p.color}08` : "transparent",
                        borderBottom: "1px solid var(--border-light)",
                        borderLeft: p.id === currentId ? `3px solid ${p.color}` : "3px solid transparent"
                      }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0" style={{
                          backgroundColor: p.id <= currentId ? p.color : "var(--bg-subtle)",
                          color: p.id <= currentId ? "#fff" : "var(--text-muted)"
                        }}>{p.id}</span>
                        <span className="text-xs font-bold" style={{ color: p.id === currentId ? p.color : p.id < currentId ? "var(--text-primary)" : "var(--text-muted)" }}>{p.name}</span>
                        {p.id === currentId && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-auto" style={{ backgroundColor: `${p.color}20`, color: p.color }}>YOU</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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

      {/* Key Metrics Row with info tooltips */}
      {data.metrics && (
        <div className="px-5 pb-3">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: "Survival", label: "Survival", val: `${data.metrics.survivalDays}d`, color: zone.color },
              { key: "Score", label: "Score", val: data.metrics.controlScore, color: "#3B82F6" },
              { key: "Savings", label: "Savings", val: `${data.metrics.savingsRate}%`, color: "#10B981" },
              { key: "Debt", label: "Debt", val: `${data.metrics.debtToIncome}%`, color: data.metrics.debtToIncome > 40 ? "#EF4444" : "#F59E0B" },
            ].map((m, i) => (
              <button key={i} onClick={() => setActiveMetric(activeMetric === m.key ? null : m.key)}
                className="text-center p-1.5 rounded-lg transition-all" style={{
                  backgroundColor: activeMetric === m.key ? `${m.color}10` : "var(--bg-subtle)",
                  border: activeMetric === m.key ? `1px solid ${m.color}30` : "1px solid transparent"
                }}>
                <p className="text-[8px] flex items-center justify-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                  {m.label} <Info className="h-2 w-2 inline" />
                </p>
                <p className="text-xs font-bold" style={{ color: m.color }}>{m.val}</p>
              </button>
            ))}
          </div>
          {/* Metric explanation tooltip */}
          {activeMetric && METRIC_INFO[activeMetric] && (
            <div className="mt-2 p-2.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }} data-testid="metric-explanation">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{activeMetric}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>{METRIC_INFO[activeMetric].meaning}</p>
                  <p className="text-[9px] mt-1 font-mono px-1.5 py-0.5 rounded inline-block" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}>
                    {METRIC_INFO[activeMetric].formula}
                  </p>
                </div>
                <button onClick={() => setActiveMetric(null)} className="p-0.5 flex-shrink-0">
                  <X className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
                </button>
              </div>
            </div>
          )}
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

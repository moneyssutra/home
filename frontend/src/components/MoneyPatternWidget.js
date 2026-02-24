import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Fingerprint } from "lucide-react";

const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

const DNA_COLORS = { needs: "#3B82F6", wants: "#F59E0B", savings: "#10B981", emi: "#EF4444" };
const DNA_LABELS = { needs: "Needs", wants: "Wants", savings: "Savings", emi: "EMI" };

export default function MoneyPatternWidget({ data }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  const dna = data.spendingDNA || {};
  const dnaEntries = Object.entries(dna).filter(([, v]) => v > 0);
  const total = dnaEntries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="money-pattern-widget">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#8B5CF620" }}>
            <Fingerprint className="h-4.5 w-4.5" style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Your Money Personality</h3>
            <p className="text-base font-black" style={{ color: "var(--text-primary)" }} data-testid="money-personality">{data.personality}</p>
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

      {/* Top Expense Categories */}
      {data.topExpenseCategories?.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Top Spending Areas</p>
          <div className="space-y-1">
            {data.topExpenseCategories.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--text-secondary)" }}>{c.category}</span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>₹{fmt(c.amount)}/mo</span>
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
          {/* Strengths */}
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
          {/* Blind Spots */}
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
          {/* Monthly Metrics */}
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

import { useState, useEffect, useCallback } from "react";
import { Shield, TrendingUp, TrendingDown, Minus, ArrowRight, Info, Sliders } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(1)}K`; return n.toFixed(0); };

const LEVEL_COLORS = { "CHAMPION": "#8B5CF6", "SECURE": "#3B82F6", "COMFORTABLE": "#10B981", "BUILDING": "#F59E0B", "NEEDS ATTENTION": "#EF4444" };

export default function RunwaySimulator({ currentData }) {
  const [open, setOpen] = useState(false);
  const [incPct, setIncPct] = useState(0);
  const [expPct, setExpPct] = useState(0);
  const [extraSavings, setExtraSavings] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const simulate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/intelligence/runway-simulator`, {
        params: { income_change_pct: incPct, expense_change_pct: expPct, extra_savings: extraSavings },
        withCredentials: true,
      });
      setResult(res.data);
    } catch { /* silently fail */ }
    setLoading(false);
  }, [incPct, expPct, extraSavings]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(simulate, 400);
    return () => clearTimeout(timer);
  }, [open, simulate]);

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); simulate(); }}
        className="w-full rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
        style={{ backgroundColor: "var(--bg-card)", border: "1px dashed var(--brand-primary)", borderWidth: "1.5px" }}
        data-testid="runway-simulator-toggle">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#059669" + "15" }}>
          <Sliders className="h-5 w-5" style={{ color: "#059669" }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Runway Simulator</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>What happens if your income or expenses change?</p>
        </div>
        <ArrowRight className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
      </button>
    );
  }

  const sim = result?.simulated;
  const cur = result?.current;
  const impact = result?.impact;
  const projections = result?.projections || [];

  const dirIcon = impact?.direction === "up" ? TrendingUp : impact?.direction === "down" ? TrendingDown : Minus;
  const DirIcon = dirIcon;
  const dirColor = impact?.direction === "up" ? "#10B981" : impact?.direction === "down" ? "#EF4444" : "#6B7280";

  // Projection chart - simple bar visualization
  const maxDays = Math.max(...projections.map(p => p.survivalDays), 1);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="runway-simulator-widget">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5" style={{ color: "#059669" }} />
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Runway Simulator</h3>
          </div>
          <button onClick={() => { setOpen(false); setIncPct(0); setExpPct(0); setExtraSavings(0); }}
            className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}
            data-testid="simulator-close-btn">Close</button>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Adjust the sliders to see how changes affect your emergency runway</p>
      </div>

      {/* Sliders */}
      <div className="px-5 space-y-4">
        {/* Income change */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Income Change</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
              backgroundColor: incPct > 0 ? "#D1FAE5" : incPct < 0 ? "#FEE2E2" : "var(--bg-subtle)",
              color: incPct > 0 ? "#065F46" : incPct < 0 ? "#991B1B" : "var(--text-muted)"
            }}>{incPct > 0 ? "+" : ""}{incPct}%</span>
          </div>
          <input type="range" min="-100" max="100" step="5" value={incPct} onChange={e => setIncPct(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #EF4444 0%, #F59E0B 25%, var(--bg-subtle) 50%, #10B981 75%, #059669 100%)` }}
            data-testid="income-slider" />
          <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            <span>-100% (Job loss)</span><span>No change</span><span>+100% (Double)</span>
          </div>
        </div>

        {/* Expense change */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Expense Change</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
              backgroundColor: expPct < 0 ? "#D1FAE5" : expPct > 0 ? "#FEE2E2" : "var(--bg-subtle)",
              color: expPct < 0 ? "#065F46" : expPct > 0 ? "#991B1B" : "var(--text-muted)"
            }}>{expPct > 0 ? "+" : ""}{expPct}%</span>
          </div>
          <input type="range" min="-50" max="100" step="5" value={expPct} onChange={e => setExpPct(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, #059669 0%, #10B981 17%, var(--bg-subtle) 33%, #F59E0B 66%, #EF4444 100%)` }}
            data-testid="expense-slider" />
          <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            <span>-50% (Cut expenses)</span><span>No change</span><span>+100% (Double)</span>
          </div>
        </div>

        {/* Extra savings */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Add One-Time Savings</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
              backgroundColor: extraSavings > 0 ? "#D1FAE5" : "var(--bg-subtle)",
              color: extraSavings > 0 ? "#065F46" : "var(--text-muted)"
            }}>{extraSavings > 0 ? "+" : ""}&#8377;{fmt(extraSavings)}</span>
          </div>
          <input type="range" min="0" max="1000000" step="10000" value={extraSavings} onChange={e => setExtraSavings(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(to right, var(--bg-subtle) 0%, #10B981 50%, #059669 100%)` }}
            data-testid="savings-slider" />
          <div className="flex justify-between text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            <span>&#8377;0</span><span>&#8377;5L</span><span>&#8377;10L</span>
          </div>
        </div>
      </div>

      {/* Impact Result */}
      {result && !loading && (
        <div className="mx-5 mt-4">
          {/* Before → After comparison */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div className="grid grid-cols-[1fr_auto_1fr]">
              {/* Current */}
              <div className="p-3 text-center" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <p className="text-[9px] font-bold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>CURRENT</p>
                <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{cur?.survivalDays}</p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>days</p>
                <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: (LEVEL_COLORS[cur?.level] || "#6B7280") + "15", color: LEVEL_COLORS[cur?.level] || "#6B7280" }}>
                  {cur?.level}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center justify-center px-3" style={{ backgroundColor: "var(--bg-card)" }}>
                <DirIcon className="h-5 w-5" style={{ color: dirColor }} />
                <span className="text-xs font-black mt-1" style={{ color: dirColor }}>
                  {impact?.changeDays > 0 ? "+" : ""}{impact?.changeDays}
                </span>
                <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>days</span>
              </div>

              {/* Simulated */}
              <div className="p-3 text-center" style={{ backgroundColor: sim?.levelColor ? `${sim.levelColor}08` : "var(--bg-subtle)" }}>
                <p className="text-[9px] font-bold tracking-wider uppercase mb-1" style={{ color: "var(--text-muted)" }}>PROJECTED</p>
                <p className="text-2xl font-black" style={{ color: sim?.levelColor || "var(--text-primary)" }}>{sim?.survivalDays}</p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>days</p>
                <div className="mt-1 inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ backgroundColor: (sim?.levelColor || "#6B7280") + "15", color: sim?.levelColor || "#6B7280" }}>
                  {sim?.level}
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 divide-x" style={{ borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
              {[
                { label: "Monthly Income", val: sim?.monthlyIncome },
                { label: "Monthly Expense", val: sim?.monthlyExpense },
                { label: "Monthly Savings", val: sim?.monthlySavings },
              ].map((m, i) => (
                <div key={i} className="py-2 text-center">
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(m.val || 0)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Insight text */}
          {result.insight && (
            <p className="text-xs mt-3 p-2.5 rounded-lg flex items-start gap-2" style={{ backgroundColor: `${dirColor}08`, color: "var(--text-secondary)", border: `1px solid ${dirColor}20` }}>
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: dirColor }} />
              {result.insight}
            </p>
          )}

          {/* 12-month projection mini chart */}
          {projections.length > 1 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>12-Month Runway Projection</p>
                {projections[12] && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                    backgroundColor: projections[12].survivalDays > cur?.survivalDays ? "#D1FAE5" : projections[12].survivalDays < cur?.survivalDays ? "#FEE2E2" : "var(--bg-subtle)",
                    color: projections[12].survivalDays > cur?.survivalDays ? "#065F46" : projections[12].survivalDays < cur?.survivalDays ? "#991B1B" : "var(--text-muted)",
                  }}>
                    {projections[12].survivalDays > cur?.survivalDays ? "+" : ""}{projections[12].survivalDays - (cur?.survivalDays || 0)} days in 1yr
                  </span>
                )}
              </div>
              <div className="flex items-end gap-1" style={{ height: "60px" }}>
                {projections.map((p, i) => {
                  const h = Math.max((p.survivalDays / maxDays) * 100, 4);
                  const lc = LEVEL_COLORS[p.level] || "#6B7280";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t-sm transition-all" style={{ height: `${h}%`, backgroundColor: lc, minHeight: "2px", opacity: i === 0 ? 0.5 : 1 }} />
                      <span className="text-[7px]" style={{ color: "var(--text-muted)" }}>{i === 0 ? "Now" : i === 6 ? "6m" : i === 12 ? "1y" : ""}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] mt-1 text-center" style={{ color: "var(--text-muted)" }}>
                In 12 months: <span className="font-bold" style={{ color: "var(--text-primary)" }}>{projections[12]?.survivalDays} days</span> ({projections[12]?.level})
              </p>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="p-8 flex justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
        </div>
      )}

      {/* Quick scenarios */}
      <div className="px-5 py-4 mt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
        <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: "var(--text-muted)" }}>Quick Scenarios</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "Job Loss", inc: -100, exp: 0, sav: 0, color: "#EF4444" },
            { label: "50% Pay Cut", inc: -50, exp: 0, sav: 0, color: "#F97316" },
            { label: "Cut 20% Expenses", inc: 0, exp: -20, sav: 0, color: "#10B981" },
            { label: "+2L Savings", inc: 0, exp: 0, sav: 200000, color: "#3B82F6" },
            { label: "Raise + Save", inc: 20, exp: -10, sav: 100000, color: "#8B5CF6" },
            { label: "Reset", inc: 0, exp: 0, sav: 0, color: "#6B7280" },
          ].map((s) => (
            <button key={s.label} onClick={() => { setIncPct(s.inc); setExpPct(s.exp); setExtraSavings(s.sav); }}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              style={{ backgroundColor: `${s.color}10`, color: s.color, border: `1px solid ${s.color}25` }}
              data-testid={`scenario-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

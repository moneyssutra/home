import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertTriangle, Shield, TrendingUp, Target, Zap, ChevronDown, ChevronUp, ArrowRight, PiggyBank, Scale, Brain } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const formatINR = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const formatK = (v) => {
  if (!v) return "₹0";
  if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return formatINR(v);
};

const SEVERITY_CONFIG = {
  1: { label: "Watch", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  2: { label: "Alert", color: "#F97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)" },
  3: { label: "Critical", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)" },
};

const FinancialIntelligence = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/api/expenses/overspend-analysis`, { withCredentials: true });
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || !data) return null;

  const hasAlerts = data.overspendAlerts.length > 0 || data.incomeRatioAlerts.length > 0 || data.structuralAlerts.length > 0 || data.wealthShiftAlert;
  const maxSeverity = Math.max(
    ...data.overspendAlerts.map(a => a.severity),
    ...data.incomeRatioAlerts.map(a => a.severity),
    ...data.structuralAlerts.map(a => a.severity),
    data.wealthShiftAlert?.severity || 0,
    0
  );

  return (
    <div className="space-y-3" data-testid="financial-intelligence">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1" style={{ backgroundColor: "#E5E7EB" }} />
        <div className="flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5" style={{ color: "#6366F1" }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Financial Intelligence</p>
        </div>
        <div className="h-px flex-1" style={{ backgroundColor: "#E5E7EB" }} />
      </div>

      {/* Allocation Ratio Bar */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#fff", border: "1px solid #E5E7EB" }} data-testid="allocation-ratios">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold" style={{ color: "#1F2937" }}>Monthly Allocation</h4>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "#6366F1" }}>
            {data.template === "safety_growth" ? "Safety Focus" : data.template === "long_term_wealth" ? "Wealth Focus" : data.template === "goal_acceleration" ? "Goal Focused" : "Balanced"}
          </span>
        </div>

        {/* Actual vs Recommended */}
        <div className="space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: "#6B7280" }}>Actual</span>
              <span className="text-[10px] font-semibold" style={{ color: "#1F2937" }}>{formatK(data.monthlySpend)} of {formatK(data.monthlyIncome)}</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
              <div className="h-full transition-all duration-700" style={{ width: `${data.actualRatios.essential}%`, backgroundColor: "#3B82F6" }} title={`Essential ${data.actualRatios.essential}%`} />
              <div className="h-full transition-all duration-700" style={{ width: `${data.actualRatios.lifestyle}%`, backgroundColor: "#F97316" }} title={`Lifestyle ${data.actualRatios.lifestyle}%`} />
              <div className="h-full transition-all duration-700" style={{ width: `${data.actualRatios.wealth}%`, backgroundColor: "#22C55E" }} title={`Wealth ${data.actualRatios.wealth}%`} />
            </div>
            <div className="flex items-center gap-3 mt-1">
              {[
                { label: "Essential", pct: data.actualRatios.essential, color: "#3B82F6" },
                { label: "Lifestyle", pct: data.actualRatios.lifestyle, color: "#F97316" },
                { label: "Wealth", pct: data.actualRatios.wealth, color: "#22C55E" },
              ].map(i => (
                <div key={i.label} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i.color }} />
                  <span className="text-[9px]" style={{ color: "#94A3B8" }}>{i.label} {i.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px]" style={{ color: "#6B7280" }}>Recommended (50/30/20)</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
              <div className="h-full" style={{ width: "50%", backgroundColor: "rgba(59,130,246,0.3)" }} />
              <div className="h-full" style={{ width: "30%", backgroundColor: "rgba(249,115,22,0.3)" }} />
              <div className="h-full" style={{ width: "20%", backgroundColor: "rgba(34,197,94,0.3)" }} />
            </div>
          </div>
        </div>

        {/* Days of Safety */}
        <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
          <Shield className="h-4 w-4" style={{ color: data.daysOfSafety >= 180 ? "#22C55E" : data.daysOfSafety >= 90 ? "#F59E0B" : "#EF4444" }} />
          <div className="flex-1">
            <p className="text-[10px]" style={{ color: "#6B7280" }}>Days of Safety</p>
            <p className="text-sm font-bold" style={{ color: "#1F2937" }}>{data.daysOfSafety} days</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ 
            backgroundColor: data.daysOfSafety >= 180 ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", 
            color: data.daysOfSafety >= 180 ? "#22C55E" : "#F59E0B" 
          }}>
            {data.daysOfSafety >= 180 ? "Strong" : data.daysOfSafety >= 90 ? "Moderate" : "Build Up"}
          </span>
        </div>
      </div>

      {/* Primary Advice */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(99,102,241,0.04)", border: "1px solid rgba(99,102,241,0.12)" }} data-testid="primary-advice">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(99,102,241,0.1)" }}>
            <Target className="h-4 w-4" style={{ color: "#6366F1" }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: "#1F2937" }}>Primary Focus</p>
            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "#6B7280" }}>{data.primaryAdvice}</p>
          </div>
        </div>
      </div>

      {/* Overspend Alerts */}
      {data.overspendAlerts.length > 0 && (
        <div className="space-y-2" data-testid="overspend-alerts">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Category Overspend</p>
          {data.overspendAlerts.map((alert, i) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG[1];
            const isExpanded = expandedAlert === i;
            return (
              <div key={alert.category} className="rounded-xl overflow-hidden" style={{ backgroundColor: "#fff", border: `1px solid ${sev.border}` }}>
                <button
                  onClick={() => setExpandedAlert(isExpanded ? null : i)}
                  className="w-full flex items-center gap-3 p-3 text-left"
                  data-testid={`overspend-${alert.category}`}
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: sev.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: "#1F2937" }}>{alert.category}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: sev.bg, color: sev.color }}>L{alert.severity} · +{alert.driftPercent}%</span>
                    </div>
                    <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>
                      {formatINR(alert.overspendAmount)} above your pattern
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: "#94A3B8" }} /> : <ChevronDown className="h-4 w-4" style={{ color: "#94A3B8" }} />}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2" style={{ borderTop: `1px solid ${sev.border}` }}>
                    {/* Impact Cards */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#F0F9FF" }}>
                        <Shield className="h-3.5 w-3.5 mx-auto mb-0.5" style={{ color: "#3B82F6" }} />
                        <p className="text-[9px]" style={{ color: "#6B7280" }}>Safety Impact</p>
                        <p className="text-xs font-bold" style={{ color: "#1F2937" }}>-{alert.safetyDaysImpact}d</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#F0FDF4" }}>
                        <TrendingUp className="h-3.5 w-3.5 mx-auto mb-0.5" style={{ color: "#22C55E" }} />
                        <p className="text-[9px]" style={{ color: "#6B7280" }}>10yr Growth</p>
                        <p className="text-xs font-bold" style={{ color: "#1F2937" }}>{formatK(alert.futureValue10yr)}</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "#FFF7ED" }}>
                        <Target className="h-3.5 w-3.5 mx-auto mb-0.5" style={{ color: "#F97316" }} />
                        <p className="text-[9px]" style={{ color: "#6B7280" }}>Goal Impact</p>
                        <p className="text-xs font-bold" style={{ color: "#1F2937" }}>{alert.goalImpactPercent}%</p>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: "#6B7280" }}>
                      If redirected: <strong>+{alert.safetyDaysImpact} Safety Days</strong>, <strong>{formatK(alert.futureValue10yr)} in 10 years</strong>
                      {alert.goalName && <>, <strong>{alert.goalImpactPercent}% closer to {alert.goalName}</strong></>}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Income Ratio Alerts */}
      {data.incomeRatioAlerts.length > 0 && (
        <div className="space-y-2" data-testid="income-ratio-alerts">
          {data.incomeRatioAlerts.map((alert, i) => (
            <div key={i} className="rounded-xl p-3 flex items-start gap-3" style={{ backgroundColor: "rgba(249,115,22,0.04)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <Scale className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#F97316" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1F2937" }}>{alert.message}</p>
                <span className="text-[10px] font-bold mt-1 inline-block px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(249,115,22,0.1)", color: "#F97316" }}>{alert.metric}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Structural Alerts */}
      {data.structuralAlerts.length > 0 && (
        <div className="space-y-2" data-testid="structural-alerts">
          {data.structuralAlerts.map((alert, i) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG[1];
            return (
              <div key={i} className="rounded-xl p-3 flex items-start gap-3" style={{ backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}>
                <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: sev.color }} />
                <p className="text-xs font-semibold" style={{ color: "#1F2937" }}>{alert.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Wealth Shift Alert */}
      {data.wealthShiftAlert && (
        <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }} data-testid="wealth-shift-alert">
          <div className="flex items-start gap-3">
            <PiggyBank className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
            <div>
              <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{data.wealthShiftAlert.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[10px]" style={{ color: "#6B7280" }}>Lifestyle Drift: <strong style={{ color: "#F97316" }}>{formatINR(data.wealthShiftAlert.lifestyleDrift)}</strong></span>
                <span className="text-[10px]" style={{ color: "#6B7280" }}>Wealth: <strong style={{ color: "#22C55E" }}>{formatINR(data.wealthShiftAlert.wealthAllocation)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reallocation Suggestion */}
      {data.reallocation && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(34,197,94,0.04)", border: "1px solid rgba(34,197,94,0.15)" }} data-testid="reallocation-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRight className="h-4 w-4" style={{ color: "#22C55E" }} />
            <p className="text-xs font-bold" style={{ color: "#1F2937" }}>Suggested Reallocation</p>
          </div>
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: "#6B7280" }}>
            Shift <strong style={{ color: "#1F2937" }}>{formatINR(data.reallocation.amount)}</strong> from {data.reallocation.source} to <strong style={{ color: "#22C55E" }}>{data.reallocation.destination}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(34,197,94,0.06)" }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>Safety Days Gained</p>
              <p className="text-sm font-bold" style={{ color: "#22C55E" }}>+{data.reallocation.safetyDaysGained}</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ backgroundColor: "rgba(34,197,94,0.06)" }}>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "#6B7280" }}>10yr Future Value</p>
              <p className="text-sm font-bold" style={{ color: "#22C55E" }}>{formatK(data.reallocation.futureValue10yr)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "#22C55E" }} data-testid="reallocate-btn">
              Reallocate
            </button>
            <button className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: "#F1F5F9", color: "#6B7280" }} data-testid="ignore-btn">
              Ignore This Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialIntelligence;

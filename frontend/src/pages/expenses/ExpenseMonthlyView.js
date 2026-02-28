import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Lightbulb, Target, Zap } from "lucide-react";
import axios from "axios";
import ExpenseLayout, { THEME, fmt, fmtFull } from "./ExpenseLayout";

const API = process.env.REACT_APP_BACKEND_URL;
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const GlassCard = ({ children, className = "", style = {}, onClick, testId }) => (
  <div
    onClick={onClick}
    className={`rounded-2xl p-4 transition-all ${onClick ? "cursor-pointer active:scale-[0.98]" : ""} ${className}`}
    style={{ backgroundColor: THEME.card, border: `1px solid ${THEME.cardBorder}`, backdropFilter: "blur(12px)", ...style }}
    data-testid={testId}
  >
    {children}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#1A2332", border: `1px solid ${THEME.cardBorder}` }}>
      <p className="font-bold mb-1" style={{ color: THEME.textPrimary }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span style={{ color: THEME.textSecondary }}>{p.name}: {fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ExpenseMonthlyView() {
  const [summaryData, setSummaryData] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, behaviorRes] = await Promise.all([
          axios.get(`${API}/api/expenses/monthly-summary`, { params: { last: 6 }, withCredentials: true }),
          axios.get(`${API}/api/expenses/behavior-insights`, { withCredentials: true }),
        ]);
        setSummaryData(summaryRes.data);
        setBehaviorData(behaviorRes.data);
        if (summaryRes.data?.months?.length > 0) {
          setSelectedMonth(summaryRes.data.months.length - 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = useMemo(() => {
    if (!summaryData?.months) return [];
    return summaryData.months.map((m) => {
      const [, mon] = m.month.split("-").map(Number);
      return {
        month: MONTH_SHORT[mon - 1],
        Essential: m.essential,
        Lifestyle: m.lifestyle,
        "Wealth Building": m.wealth,
        total: m.total,
        raw: m,
      };
    });
  }, [summaryData]);

  const currentMonth = useMemo(() => {
    if (!summaryData?.months || selectedMonth === null) return null;
    return summaryData.months[selectedMonth];
  }, [summaryData, selectedMonth]);

  // Compute trend/drift insights dynamically
  const trendInsights = useMemo(() => {
    if (!summaryData?.months || summaryData.months.length < 2) return [];
    const months = summaryData.months;
    const insights = [];

    // Overall trend
    const totals = months.map((m) => m.total);
    const firstHalf = totals.slice(0, Math.floor(totals.length / 2));
    const secondHalf = totals.slice(Math.floor(totals.length / 2));
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    if (avgFirst > 0) {
      const driftPct = ((avgSecond - avgFirst) / avgFirst * 100).toFixed(1);
      if (Math.abs(driftPct) >= 3) {
        insights.push({
          type: driftPct > 0 ? "warning" : "positive",
          icon: driftPct > 0 ? TrendingUp : TrendingDown,
          title: driftPct > 0 ? "Spending Drift Detected" : "Spending Improving",
          desc: `Average spending ${driftPct > 0 ? "increased" : "decreased"} ${Math.abs(driftPct)}% over 6 months`,
          metric: `${driftPct > 0 ? "+" : ""}${driftPct}%`,
        });
      }
    }

    // Essential % trend
    const essentialPcts = months.filter((m) => m.total > 0).map((m) => (m.essential / m.total) * 100);
    if (essentialPcts.length >= 3) {
      const avgEssential = essentialPcts.reduce((a, b) => a + b, 0) / essentialPcts.length;
      if (avgEssential > 70) {
        insights.push({
          type: "neutral",
          icon: Target,
          title: "Heavy on Essentials",
          desc: `${avgEssential.toFixed(0)}% of spending goes to essentials — consider reviewing fixed costs`,
          metric: `${avgEssential.toFixed(0)}%`,
        });
      }
    }

    // Lifestyle creep
    const lifestylePcts = months.filter((m) => m.total > 0).map((m) => (m.lifestyle / m.total) * 100);
    if (lifestylePcts.length >= 3) {
      const recentLs = lifestylePcts.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const olderLs = lifestylePcts.slice(0, 2).reduce((a, b) => a + b, 0) / Math.max(1, lifestylePcts.slice(0, 2).length);
      if (olderLs > 0 && recentLs > olderLs * 1.15) {
        insights.push({
          type: "warning",
          icon: Zap,
          title: "Lifestyle Creep Alert",
          desc: `Lifestyle spending share grew from ${olderLs.toFixed(0)}% to ${recentLs.toFixed(0)}%`,
          metric: `+${(recentLs - olderLs).toFixed(0)}%`,
        });
      }
    }

    return insights;
  }, [summaryData]);

  if (loading) {
    return (
      <ExpenseLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: THEME.barTrack, borderTopColor: THEME.accent }} />
        </div>
      </ExpenseLayout>
    );
  }

  const COLORS = { Essential: THEME.essential, Lifestyle: THEME.lifestyle, "Wealth Building": THEME.wealth };

  return (
    <ExpenseLayout>
      <div className="space-y-4">
        {/* Stacked Bar Chart */}
        <GlassCard testId="monthly-chart">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
            6-Month Comparison
          </h3>
          {chartData.length > 0 ? (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                    onClick={(data) => {
                      if (data?.activeTooltipIndex !== undefined) {
                        setSelectedMonth(data.activeTooltipIndex);
                      }
                    }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: THEME.textMuted }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: THEME.textMuted }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => fmt(v)}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="Essential" stackId="a" fill={THEME.essential} radius={[0, 0, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Lifestyle" stackId="a" fill={THEME.lifestyle} radius={[0, 0, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Wealth Building" stackId="a" fill={THEME.wealth} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-2">
                {Object.entries(COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-[10px]" style={{ color: THEME.textMuted }}>{key}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-center py-6" style={{ color: THEME.textMuted }}>No data available</p>
          )}
        </GlassCard>

        {/* Selected Month Detail */}
        {currentMonth && (
          <GlassCard testId="monthly-detail">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.textMuted }}>
                {MONTH_SHORT[parseInt(currentMonth.month.split("-")[1]) - 1]} Detail
              </h3>
              <span className="text-sm font-bold" style={{ color: THEME.textPrimary }}>{fmtFull(currentMonth.total)}</span>
            </div>

            <div className="space-y-2.5">
              {[
                { label: "Essential", amount: currentMonth.essential, color: THEME.essential },
                { label: "Lifestyle", amount: currentMonth.lifestyle, color: THEME.lifestyle },
                { label: "Wealth Building", amount: currentMonth.wealth, color: THEME.wealth },
              ].map((item) => {
                const pct = currentMonth.total > 0 ? ((item.amount / currentMonth.total) * 100).toFixed(1) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-semibold" style={{ color: THEME.textPrimary }}>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: item.color }}>{fmtFull(item.amount)}</span>
                        <span className="text-[10px]" style={{ color: THEME.textMuted }}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: THEME.barTrack }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Income vs Expense */}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${THEME.divider}` }}>
              <span className="text-[10px]" style={{ color: THEME.textMuted }}>% of Income</span>
              <span
                className="text-xs font-bold"
                style={{ color: currentMonth.percentOfIncome > 80 ? "#EF4444" : currentMonth.percentOfIncome > 60 ? "#F59E0B" : "#10B981" }}
              >
                {currentMonth.percentOfIncome}%
              </span>
            </div>
          </GlassCard>
        )}

        {/* Trend Insights */}
        {trendInsights.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Monthly Insights
            </h3>
            <div className="space-y-2">
              {trendInsights.map((insight, i) => {
                const Icon = insight.icon;
                const colorMap = { warning: "#F59E0B", positive: "#10B981", neutral: THEME.accent };
                const color = colorMap[insight.type] || THEME.textMuted;
                return (
                  <GlassCard key={i} testId={`trend-insight-${i}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12` }}>
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold" style={{ color: THEME.textPrimary }}>{insight.title}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color }}>
                            {insight.metric}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: THEME.textSecondary }}>{insight.desc}</p>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Behavior Insights */}
        {behaviorData?.insights?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Behavior Patterns
            </h3>
            <div className="space-y-2">
              {behaviorData.insights.slice(0, 3).map((insight, i) => {
                const trendColors = { warning: "#F59E0B", positive: "#10B981", neutral: THEME.accent };
                const color = trendColors[insight.trend] || THEME.textMuted;
                return (
                  <GlassCard key={i} testId={`behavior-insight-${i}`}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}12` }}>
                        <Lightbulb className="h-4 w-4" style={{ color }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold" style={{ color: THEME.textPrimary }}>{insight.title}</p>
                        <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: THEME.textSecondary }}>{insight.description}</p>
                      </div>
                      <span className="text-[10px] font-bold flex-shrink-0" style={{ color }}>{insight.metric}</span>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </div>
        )}

        {/* Long-term Suggestion */}
        <GlassCard
          testId="long-term-suggestion"
          style={{ background: `linear-gradient(135deg, rgba(16, 185, 129, 0.06), ${THEME.card})`, border: `1px solid rgba(16, 185, 129, 0.15)` }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: THEME.textPrimary }}>Long-term Suggestion</p>
              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: THEME.textSecondary }}>
                {summaryData?.avgMonthlySpend > 0
                  ? `Your average monthly spend is ${fmtFull(summaryData.avgMonthlySpend)}. Reducing lifestyle expenses by 10% could save ${fmtFull(summaryData.avgMonthlySpend * 0.1)} per month or ${fmtFull(summaryData.avgMonthlySpend * 0.1 * 12)} per year.`
                  : "Start tracking expenses consistently to unlock long-term savings insights."}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </ExpenseLayout>
  );
}

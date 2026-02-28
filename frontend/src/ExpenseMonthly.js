import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Zap, Calendar, Briefcase, Scale, Clock, AlertTriangle, ArrowUpRight, Rocket, Shield, AlertCircle, PiggyBank, Brain, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};

const formatFull = (v) => `₹${v.toLocaleString("en-IN")}`;

const getMonthLabel = (mk) => {
  const [, m] = mk.split("-");
  return MONTH_NAMES_SHORT[parseInt(m) - 1];
};

const getFullLabel = (mk) => {
  const [y, m] = mk.split("-");
  return `${MONTH_NAMES_FULL[parseInt(m) - 1]} ${y}`;
};

// Premium turquoise dark theme tokens
const DK = {
  bg: "#041418",
  card: "#0A1F24",
  cardAlt: "#0D2A30",
  cardBorder: "rgba(13,148,136,0.15)",
  cardBorderHover: "rgba(13,148,136,0.3)",
  // Category colors
  blue: "#06B6D4",
  blueSoft: "rgba(6,182,212,0.08)",
  blueBorder: "rgba(6,182,212,0.25)",
  orange: "#FB923C",
  orangeHot: "#F97316",
  orangeSoft: "rgba(251,146,60,0.08)",
  orangeBorder: "rgba(251,146,60,0.25)",
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.08)",
  greenBorder: "rgba(52,211,153,0.25)",
  // Warm spectrum
  teal: "#2DD4BF",
  cyan: "#14B8A6",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.06)",
  amberBorder: "rgba(245,158,11,0.2)",
  gold: "#FBBF24",
  goldSoft: "rgba(251,191,36,0.05)",
  goldBorder: "rgba(251,191,36,0.15)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.1)",
  textPrimary: "#E8F5F2",
  textSecondary: "#8BC4B8",
  textMuted: "#547D73",
  barTrack: "#0C2A30",
  divider: "rgba(45,212,191,0.1)",
};

const ExpenseMonthly = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, behaviorRes] = await Promise.all([
        axios.get(`${API}/api/expenses/monthly-summary?last=6`, { withCredentials: true }),
        axios.get(`${API}/api/expenses/behavior-insights`, { withCredentials: true }),
      ]);
      setData(summaryRes.data);
      setBehaviorData(behaviorRes.data);
      setSelectedIdx(summaryRes.data.months.length - 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" style={{ backgroundColor: DK.bg }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: DK.teal, borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!data?.months?.length) {
    return (
      <div className="py-20 text-center" style={{ backgroundColor: DK.bg }}>
        <p style={{ color: DK.textMuted }}>No expense data yet</p>
      </div>
    );
  }

  const months = data.months;
  const sel = months[selectedIdx] || months[months.length - 1];
  const totals = months.map(m => m.total);
  const maxTotal = Math.max(...totals);
  const remaining = Math.max(0, sel.incomeTotal - sel.total);

  const chartData = months.map((m, i) => ({
    name: getMonthLabel(m.month),
    total: m.total,
    isHighest: m.total === maxTotal,
    isSelected: i === selectedIdx,
  }));

  const prevMonth = selectedIdx > 0 ? months[selectedIdx - 1] : null;

  return (
    <div className="pb-6" style={{ backgroundColor: DK.bg }} data-testid="expense-monthly">
      {/* Month Slider */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
          <button onClick={() => setSelectedIdx(i => Math.max(0, i - 1))} className="p-1.5 rounded-lg transition-colors" style={{ color: DK.textMuted }}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            {months.map((m, i) => (
              <button
                key={m.month}
                onClick={() => setSelectedIdx(i)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: i === selectedIdx ? DK.blue : "transparent",
                  color: i === selectedIdx ? "#fff" : DK.textMuted,
                  border: i === selectedIdx ? `1px solid ${DK.blueBorder}` : "1px solid transparent",
                }}
                data-testid={`month-pill-${m.month}`}
              >
                {getMonthLabel(m.month)}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIdx(i => Math.min(months.length - 1, i + 1))} className="p-1.5 rounded-lg transition-colors" style={{ color: DK.textMuted }}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Summary Card */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="monthly-summary-card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-3xl font-bold tracking-tight" style={{ color: DK.textPrimary, fontFamily: "'Manrope', sans-serif" }}>
                {formatFull(sel.total)}
              </p>
              <p className="text-xs mt-1 font-medium" style={{ color: DK.textSecondary }}>Spent This Month</p>
            </div>
            {sel.changeVsLastMonth !== undefined && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: sel.changeVsLastMonth > 0 ? DK.redSoft : DK.greenSoft, color: sel.changeVsLastMonth > 0 ? DK.red : DK.green, border: `1px solid ${sel.changeVsLastMonth > 0 ? 'rgba(239,68,68,0.2)' : DK.greenBorder}` }} data-testid="change-badge">
                {sel.changeVsLastMonth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {sel.changeVsLastMonth > 0 ? "+" : ""}{sel.changeVsLastMonth}%
              </div>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: DK.textMuted }}>
            {sel.percentOfIncome}% of Income{sel.changeVsLastMonth !== undefined ? ` | ${sel.changeVsLastMonth > 0 ? "+" : ""}${sel.changeVsLastMonth}% vs Last Month` : ""}
          </p>

          {/* Budget Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[11px] font-medium" style={{ color: DK.textSecondary }}>Remaining Budget</p>
              <p className="text-sm font-bold" style={{ color: DK.textPrimary }}>{formatFull(remaining)}</p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex" style={{ backgroundColor: DK.barTrack }}>
              <div className="h-full transition-all duration-700" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.essential / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.blue }} />
              <div className="h-full transition-all duration-700" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.lifestyle / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.orangeHot }} />
              <div className="h-full transition-all duration-700" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.wealth / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.green }} />
            </div>
          </div>
        </div>
      </div>

      {/* Expense Breakdown — 3 Cards */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Expense Breakdown</p>
          <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
        </div>
        <div className="grid grid-cols-3 gap-2.5" data-testid="monthly-category-breakdown">
          {[
            { label: "Essential", value: sel.essential, color: DK.blue, softBg: DK.blueSoft, borderColor: DK.blueBorder },
            { label: "Lifestyle", value: sel.lifestyle, color: DK.orangeHot, softBg: DK.orangeSoft, borderColor: DK.orangeBorder },
            { label: "Wealth", value: sel.wealth, color: DK.green, softBg: DK.greenSoft, borderColor: DK.greenBorder },
          ].map(({ label, value, color, softBg, borderColor }) => {
            const pct = sel.total > 0 ? Math.round(value / sel.total * 100) : 0;
            return (
              <div key={label} className="rounded-xl p-3" style={{ background: `linear-gradient(180deg, ${softBg} 0%, ${DK.card} 100%)`, border: `1px solid ${borderColor}` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color }}>{label}</p>
                <p className="text-lg font-bold" style={{ color: DK.textPrimary, fontFamily: "'Manrope', sans-serif" }}>{formatK(value)}</p>
                <p className="text-[11px] font-medium mb-2" style={{ color }}>{pct}%</p>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: DK.barTrack }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6-Month Trend Chart */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="monthly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>6-Month Trend</h3>
          <div className="h-[160px]" style={{ outline: "none" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={26} style={{ outline: "none" }} accessibilityLayer={false} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedIdx(e.activeTooltipIndex); }}>
                <XAxis dataKey="name" tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={42} />
                <Tooltip
                  formatter={(val) => [formatFull(val), "Spend"]}
                  contentStyle={{ backgroundColor: "#0D2A30", border: "1px solid rgba(45,212,191,0.3)", borderRadius: "12px", color: "#E8F5F2", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  labelStyle={{ color: "#2DD4BF", fontWeight: "bold" }}
                  itemStyle={{ color: "#E8F5F2" }}
                  cursor={false}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, idx) => {
                    let fill;
                    if (entry.isSelected) fill = DK.blue;
                    else if (entry.isHighest) fill = DK.amber;
                    else fill = DK.cyan;
                    return <Cell key={idx} fill={fill} fillOpacity={entry.isSelected ? 1 : 0.65} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spending Insights */}
      {data.insights?.length > 0 && (
        <div className="px-5 mb-4" data-testid="monthly-insights">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Spending Insights</p>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {data.insights.map((insight, i) => {
              const styles = [
                { border: DK.blueBorder, accent: DK.blue, barBg: `linear-gradient(90deg, ${DK.blue}40, ${DK.blue})` },
                { border: DK.orangeBorder, accent: DK.orangeHot, barBg: `linear-gradient(90deg, ${DK.orangeHot}40, ${DK.orangeHot})` },
                { border: DK.greenBorder, accent: DK.green, barBg: `linear-gradient(90deg, ${DK.green}40, ${DK.green})` },
              ];
              const s = styles[i % styles.length];
              return (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${s.border}` }}>
                  <p className="text-[11px] leading-snug font-medium" style={{ color: DK.textSecondary }}>{insight}</p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-full" style={{ width: "55%", background: s.barBg }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Categories for Selected Month */}
      {sel.topCategories?.length > 0 && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>{getFullLabel(sel.month)} — Top Expenses</h3>
            <div className="space-y-2.5">
              {sel.topCategories.slice(0, 5).map((c, i) => {
                const catColors = [DK.blue, DK.orangeHot, DK.green, DK.teal, DK.cyan];
                const pct = sel.total > 0 ? Math.round(c.amount / sel.total * 100) : 0;
                const color = catColors[i % catColors.length];
                return (
                  <div key={c.category}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium" style={{ color: DK.textSecondary }}>{c.category}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: DK.textPrimary }}>{formatK(c.amount)} <span style={{ color: DK.textMuted, fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison */}
            {prevMonth && (
              <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${DK.divider}` }}>
                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ backgroundColor: DK.amberSoft, border: `1px solid ${DK.amberBorder}` }}>
                  <Zap className="h-4 w-4 flex-shrink-0" style={{ color: DK.amber }} />
                  <p className="text-[11px]" style={{ color: DK.textSecondary }}>
                    vs {getMonthLabel(prevMonth.month)}: <span className="font-bold" style={{ color: sel.total > prevMonth.total ? DK.red : DK.green }}>{sel.total > prevMonth.total ? "+" : ""}{formatK(Math.abs(sel.total - prevMonth.total))} ({prevMonth.total > 0 ? (sel.total > prevMonth.total ? "+" : "") + Math.round((sel.total - prevMonth.total) / prevMonth.total * 100) : 0}%)</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-5 mb-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: DK.textMuted }}>Avg Monthly</p>
            <p className="text-base font-bold" style={{ color: DK.textPrimary }}>{formatK(data.avgMonthlySpend)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: DK.textMuted }}>Highest Month</p>
            <p className="text-base font-bold" style={{ color: DK.amber }}>{data.highestSpendMonth ? getFullLabel(data.highestSpendMonth).split(" ")[0] : "-"}</p>
          </div>
        </div>
      </div>

      {/* Behavior Connection — Premium warm-toned section */}
      {behaviorData?.insights?.length > 0 && (
        <div className="px-5 mb-4" data-testid="behavior-connection">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <div className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" style={{ color: DK.gold }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Behavior Connection</p>
            </div>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>

          <div className="space-y-2.5">
            {behaviorData.insights.map((insight, i) => {
              const iconMap = {
                calendar: Calendar, briefcase: Briefcase, scale: Scale,
                "trending-up": TrendingUp, clock: Clock, "alert-triangle": AlertTriangle,
                "arrow-up-right": ArrowUpRight, rocket: Rocket, shield: Shield,
                "alert-circle": AlertCircle, "piggy-bank": PiggyBank,
              };
              const trendStyles = {
                warning: { bg: DK.amberSoft, border: DK.amberBorder, accent: DK.amber, gradient: `linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(251,146,60,0.03) 100%)` },
                positive: { bg: DK.greenSoft, border: DK.greenBorder, accent: DK.green, gradient: `linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(45,212,191,0.03) 100%)` },
                neutral: { bg: DK.blueSoft, border: DK.blueBorder, accent: DK.blue, gradient: `linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(34,211,238,0.03) 100%)` },
              };
              const IconComp = iconMap[insight.icon] || Zap;
              const s = trendStyles[insight.trend] || trendStyles.neutral;

              return (
                <div
                  key={i}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{ background: s.gradient, border: `1px solid ${s.border}` }}
                  data-testid={`behavior-insight-${insight.type}`}
                >
                  <div className="mt-0.5 p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${s.accent}12`, border: `1px solid ${s.accent}20` }}>
                    <IconComp className="h-4 w-4" style={{ color: s.accent }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[13px] font-bold" style={{ color: DK.textPrimary }}>{insight.title}</p>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${s.accent}15`, color: s.accent, border: `1px solid ${s.accent}25` }}>
                        {insight.metric}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: DK.textSecondary }}>{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spending Distribution */}
          {behaviorData.summary && (
            <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="spending-distribution">
              <p className="text-[10px] uppercase tracking-wider mb-3 font-semibold" style={{ color: DK.textMuted }}>Spending Distribution</p>
              <div className="space-y-3">
                {[
                  { label: "Weekday", pct: behaviorData.summary.weekdayPct, color: DK.cyan, gradient: `linear-gradient(90deg, ${DK.cyan}50, ${DK.cyan})` },
                  { label: "Weekend", pct: behaviorData.summary.weekendPct, color: DK.orange, gradient: `linear-gradient(90deg, ${DK.orange}50, ${DK.orange})` },
                  { label: "First Week (Salary)", pct: behaviorData.summary.firstWeekPct, color: DK.amber, gradient: `linear-gradient(90deg, ${DK.amber}50, ${DK.amber})` },
                ].map(({ label, pct, color, gradient }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px] font-medium" style={{ color: DK.textSecondary }}>{label}</span>
                      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: gradient }} />
                    </div>
                  </div>
                ))}
              </div>

              {behaviorData.summary.consistentCategories?.length > 0 && (
                <div className="mt-3.5 pt-3" style={{ borderTop: `1px solid ${DK.divider}` }}>
                  <p className="text-[10px] uppercase tracking-wider mb-2 font-semibold" style={{ color: DK.textMuted }}>Recurring Categories</p>
                  <div className="flex flex-wrap gap-1.5">
                    {behaviorData.summary.consistentCategories.map((cat, i) => {
                      const tagColors = [DK.blue, DK.orangeHot, DK.teal, DK.amber, DK.cyan];
                      const c = tagColors[i % tagColors.length];
                      return (
                        <span key={cat} className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${c}10`, color: c, border: `1px solid ${c}25` }}>
                          {cat}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpenseMonthly;

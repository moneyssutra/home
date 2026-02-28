import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Zap, Calendar, Briefcase, Scale, Clock, AlertTriangle, ArrowUpRight, Rocket, Shield, AlertCircle, PiggyBank, Brain, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import FinancialIntelligence from "@/components/FinancialIntelligence";
import WealthImpactAnalysis from "@/components/financial_intelligence/WealthImpactAnalysis";
import SpendingInsights from "@/components/financial_intelligence/SpendingInsights";

const API = process.env.REACT_APP_BACKEND_URL;
const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatINR = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};
const getMonthLabel = (mk) => MONTH_NAMES_SHORT[parseInt(mk.split("-")[1]) - 1];
const getFullLabel = (mk) => { const [y, m] = mk.split("-"); return `${MONTH_NAMES_FULL[parseInt(m) - 1]} ${y}`; };

// Deep navy design tokens matching reference
const DK = {
  bg: "#F5F7FA",
  card: "#FFFFFF",
  cardHighlight: "#F8FAFC",
  cardBorder: "#E5E7EB",
  essentialBlue: "#3B82F6",
  lifestyleOrange: "#F97316",
  wealthGreen: "#22C55E",
  teal: "#0D9488",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  gold: "#FBBF24",
  red: "#EF4444",
  textWhite: "#1F2937",
  textPrimary: "#1F2937",
  textSecondary: "#6B7280",
  textMuted: "#94A3B8",
  barTrack: "#F1F5F9",
  divider: "#E5E7EB",
  monthPillActive: "#3B82F6",
};

const ExpenseMonthly = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [behaviorData, setBehaviorData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, behaviorRes] = await Promise.all([
        axios.get(`${API}/api/expenses/monthly-summary?last=6&tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true }),
        axios.get(`${API}/api/expenses/behavior-insights?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true }),
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
  const prevMonth = selectedIdx > 0 ? months[selectedIdx - 1] : null;
  const spentDisplay = sel.spentSoFar !== undefined ? sel.spentSoFar : sel.total;
  const upcomingDisplay = sel.upcoming || 0;
  const remaining = Math.max(0, sel.incomeTotal - sel.total);

  const chartData = months.map((m, i) => ({
    name: getMonthLabel(m.month),
    total: m.total,
    idx: i,
  }));
  const maxTotal = Math.max(...months.map(m => m.total));

  const breakdownItems = [
    { label: "Essential", value: sel.essential, color: DK.essentialBlue, bgGrad: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 100%)", borderColor: DK.essentialBlue },
    { label: "Lifestyle", value: sel.lifestyle, color: DK.lifestyleOrange, bgGrad: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0.05) 100%)", borderColor: DK.lifestyleOrange },
    { label: "Wealth Building", value: sel.wealth, color: DK.wealthGreen, bgGrad: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 100%)", borderColor: DK.wealthGreen },
  ];

  return (
    <div className="pb-6" style={{ backgroundColor: DK.bg }} data-testid="expense-monthly">

      {/* Month Selector — at top */}
      <div className="px-4 pt-4 mb-3">
        <div className="flex items-center justify-between rounded-2xl px-2 py-2" style={{ backgroundColor: DK.barTrack, border: `1px solid ${DK.cardBorder}` }}>
          <button onClick={() => setSelectedIdx(i => Math.max(0, i - 1))} className="p-1.5 rounded-lg" style={{ color: DK.textMuted }} data-testid="month-nav-prev"><ChevronLeft className="h-4 w-4" /></button>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {months.map((m, i) => (
              <button key={m.month} onClick={() => setSelectedIdx(i)} className="px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap" style={{ backgroundColor: i === selectedIdx ? DK.monthPillActive : "transparent", color: i === selectedIdx ? "#fff" : DK.textMuted }} data-testid={`month-pill-${m.month}`}>
                {getMonthLabel(m.month)}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedIdx(i => Math.min(months.length - 1, i + 1))} className="p-1.5 rounded-lg" style={{ color: DK.textMuted }} data-testid="month-nav-next"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Main Summary Card */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl p-4 sm:p-5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="monthly-summary-card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: DK.textWhite }}>
                {formatINR(sel.total)} <span className="text-sm sm:text-base font-medium" style={{ color: DK.textSecondary }}>Spent This Month</span>
              </p>
              <p className="text-xs sm:text-sm mt-1 font-medium" style={{ color: DK.textSecondary }}>
                {sel.percentOfIncome}% of Income{sel.changeVsLastMonth !== undefined ? ` | ${sel.changeVsLastMonth > 0 ? "+" : ""}${sel.changeVsLastMonth}% vs Last Month` : ""}
              </p>
            </div>
            {sel.changeVsLastMonth !== undefined && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold flex-shrink-0" style={{ backgroundColor: sel.changeVsLastMonth > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: sel.changeVsLastMonth > 0 ? DK.red : DK.wealthGreen }} data-testid="change-badge">
                {sel.changeVsLastMonth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {sel.changeVsLastMonth > 0 ? "+" : ""}{sel.changeVsLastMonth}%
              </div>
            )}
          </div>

          {/* Budget Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-xs font-semibold" style={{ color: DK.textSecondary }}>Remaining Budget:</p>
              <p className="text-sm font-bold" style={{ color: DK.textWhite }}>{formatINR(remaining)}</p>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex" style={{ backgroundColor: DK.barTrack }}>
              <div className="h-full transition-all duration-500" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.essential / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.essentialBlue }} />
              <div className="h-full transition-all duration-500" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.lifestyle / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.lifestyleOrange }} />
              <div className="h-full transition-all duration-500" style={{ width: `${sel.incomeTotal > 0 ? Math.min(100, sel.wealth / sel.incomeTotal * 100) : 0}%`, backgroundColor: DK.wealthGreen }} />
            </div>
          </div>
        </div>
      </div>

      {/* Expense Breakdown — 3 cards with left colored borders */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Expense Breakdown</p>
          <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
        </div>
        <div className="grid grid-cols-3 gap-2" data-testid="monthly-category-breakdown">
          {breakdownItems.map(({ label, value, color, bgGrad, borderColor }) => {
            const pct = sel.total > 0 ? Math.round(value / sel.total * 100) : 0;
            return (
              <button key={label} onClick={() => navigate(`/expenses/group/${label.toLowerCase().replace(/\s/g, "-")}`)} className="text-left rounded-xl p-3 transition-all active:scale-[0.97]" style={{ background: bgGrad, borderLeft: `4px solid ${borderColor}`, border: `1px solid ${DK.cardBorder}`, borderLeftWidth: "4px", borderLeftColor: borderColor }} data-testid={`breakdown-${label.toLowerCase().replace(/\s/g, "-")}`}>
                <p className="text-[11px] sm:text-xs font-bold mb-1" style={{ color }}>{label}</p>
                <p className="text-base sm:text-lg font-bold" style={{ color: DK.textWhite }}>{formatINR(value)}</p>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color }}>{pct}%</p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6-Month Trend Chart */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="monthly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textWhite }}>6-Month Trend</h3>
          <div className="h-[140px] sm:h-[160px]" style={{ outline: "none" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={22} style={{ outline: "none" }} accessibilityLayer={false} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedIdx(e.activeTooltipIndex); }}>
                <XAxis dataKey="name" tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={38} />
                <Tooltip
                  formatter={(val) => [formatINR(val), "Spend"]}
                  contentStyle={{ backgroundColor: DK.cardHighlight, border: `1px solid ${DK.cardBorder}`, borderRadius: "10px", color: DK.textWhite, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  labelStyle={{ color: DK.essentialBlue, fontWeight: "bold" }}
                  itemStyle={{ color: DK.textWhite }}
                  cursor={false}
                />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {chartData.map((entry, idx) => {
                    let fill;
                    if (idx === selectedIdx) fill = DK.essentialBlue;
                    else if (entry.total === maxTotal) fill = DK.amber;
                    else fill = DK.cyan;
                    return <Cell key={idx} fill={fill} fillOpacity={idx === selectedIdx ? 1 : 0.6} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spending Insights */}
      {data.insights?.length > 0 && (
        <div className="px-4 mb-3" data-testid="monthly-insights">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Spending Insights</p>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {data.insights.map((insight, i) => {
              const colors = [DK.essentialBlue, DK.lifestyleOrange, DK.wealthGreen];
              const c = colors[i % colors.length];
              return (
                <button key={i} className="text-left rounded-xl p-3 transition-all active:scale-[0.97]" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid={`insight-card-${i}`}>
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold" style={{ color: DK.textPrimary }}>{insight}</p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-full" style={{ width: "55%", background: `linear-gradient(90deg, ${c}60, ${c})` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Categories for Selected Month */}
      {sel.topCategories?.length > 0 && (
        <div className="px-4 mb-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <h3 className="text-sm font-bold mb-3" style={{ color: DK.textWhite }}>{getFullLabel(sel.month)} — Top Expenses</h3>
            <div className="space-y-2.5">
              {sel.topCategories.slice(0, 5).map((c, i) => {
                const catColors = [DK.essentialBlue, DK.lifestyleOrange, DK.wealthGreen, DK.teal, DK.cyan];
                const pct = sel.total > 0 ? Math.round(c.amount / sel.total * 100) : 0;
                const color = catColors[i % catColors.length];
                return (
                  <button key={c.category} onClick={() => navigate(`/expenses/${c.category.toLowerCase().replace(/\s+/g, "-")}`)} className="w-full text-left" data-testid={`top-cat-${c.category}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium" style={{ color: DK.textSecondary }}>{c.category}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: DK.textWhite }}>{formatINR(c.amount)} <span style={{ color: DK.textMuted, fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}60, ${color})` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cut Down Wasteful Spending — Amber accent card */}
      {behaviorData?.insights?.length > 0 && (
        <div className="px-4 mb-3" data-testid="behavior-connection">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid rgba(251,191,36,0.25)`, borderLeft: `4px solid ${DK.gold}` }}>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4" style={{ color: DK.gold }} />
              <p className="text-sm font-bold" style={{ color: DK.gold }}>Behavior Insights</p>
            </div>
            <div className="space-y-2">
              {behaviorData.insights.map((insight, i) => {
                const iconMap = { calendar: Calendar, briefcase: Briefcase, scale: Scale, "trending-up": TrendingUp, clock: Clock, "alert-triangle": AlertTriangle, "arrow-up-right": ArrowUpRight, rocket: Rocket, shield: Shield, "alert-circle": AlertCircle, "piggy-bank": PiggyBank };
                const trendColors = { warning: DK.amber, positive: DK.wealthGreen, neutral: DK.essentialBlue };
                const IconComp = iconMap[insight.icon] || Zap;
                const accent = trendColors[insight.trend] || DK.essentialBlue;
                return (
                  <div key={i} className="flex items-start gap-2.5 py-2" style={{ borderTop: i > 0 ? `1px solid ${DK.divider}` : "none" }} data-testid={`behavior-insight-${insight.type}`}>
                    <IconComp className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold" style={{ color: DK.textWhite }}>{insight.title}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${accent}20`, color: accent }}>{insight.metric}</span>
                      </div>
                      <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: DK.textSecondary }}>{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spending Distribution */}
      {behaviorData?.summary && (
        <div className="px-4 mb-3" data-testid="spending-distribution">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: DK.textSecondary }}>Spending Distribution</p>
            <div className="space-y-2.5">
              {[
                { label: "Weekday", pct: behaviorData.summary.weekdayPct, color: DK.cyan },
                { label: "Weekend", pct: behaviorData.summary.weekendPct, color: DK.lifestyleOrange },
                { label: "First Week (Salary)", pct: behaviorData.summary.firstWeekPct, color: DK.amber },
              ].map(({ label, pct, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] font-medium" style={{ color: DK.textSecondary }}>{label}</span>
                    <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${color}50, ${color})` }} />
                  </div>
                </div>
              ))}
            </div>
            {behaviorData.summary.consistentCategories?.length > 0 && (
              <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${DK.divider}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1.5 font-bold" style={{ color: DK.textMuted }}>Recurring Categories</p>
                <div className="flex flex-wrap gap-1.5">
                  {behaviorData.summary.consistentCategories.map((cat, i) => {
                    const tagColors = [DK.essentialBlue, DK.lifestyleOrange, DK.teal, DK.amber, DK.cyan];
                    const c = tagColors[i % tagColors.length];
                    return <span key={cat} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${c}15`, color: c, border: `1px solid ${c}30` }}>{cat}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Avg/Highest Footer */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5 font-bold" style={{ color: DK.textMuted }}>Avg Monthly</p>
            <p className="text-sm font-bold" style={{ color: DK.textWhite }}>{formatK(data.avgMonthlySpend)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <p className="text-[10px] uppercase tracking-wider mb-0.5 font-bold" style={{ color: DK.textMuted }}>Highest Month</p>
            <p className="text-sm font-bold" style={{ color: DK.amber }}>{data.highestSpendMonth ? getFullLabel(data.highestSpendMonth).split(" ")[0] : "-"}</p>
          </div>
        </div>
      </div>

      {/* Spending Insights */}
      <div className="px-4 mb-3">
        <SpendingInsights />
      </div>

      {/* Financial Intelligence Engine */}
      <div className="px-4 mb-3">
        <FinancialIntelligence />
      </div>

      {/* Wealth Impact Analysis */}
      <div className="px-4 mb-6">
        <WealthImpactAnalysis />
      </div>

    </div>
  );
};

export default ExpenseMonthly;

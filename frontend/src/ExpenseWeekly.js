import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, Eye, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DK = {
  bg: "#0E1421",
  card: "#1A2332",
  cardHighlight: "#222D3F",
  cardBorder: "rgba(100,140,200,0.12)",
  teal: "#2DD4BF",
  cyan: "#06B6D4",
  amber: "#F59E0B",
  orange: "#FB923C",
  orangeHot: "#F97316",
  green: "#22C55E",
  blue: "#3B82F6",
  gold: "#FBBF24",
  red: "#EF4444",
  textWhite: "#FFFFFF",
  textPrimary: "#E2E8F0",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  barTrack: "#1E293B",
  divider: "rgba(100,140,200,0.1)",
};

const formatINR = (v) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};

const getDayBarColor = (amount, max, isWeekend) => {
  if (amount === 0) return DK.barTrack;
  const ratio = max > 0 ? amount / max : 0;
  if (isWeekend) return ratio > 0.6 ? DK.orangeHot : DK.orange;
  if (ratio > 0.7) return DK.amber;
  if (ratio > 0.4) return DK.cyan;
  return DK.teal;
};

const CAT_COLORS = [DK.blue, DK.orangeHot, DK.green, DK.amber, DK.cyan, DK.teal];

const ExpenseWeekly = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/expenses/weekly-summary?last=8`, { withCredentials: true });
      setData(res.data);
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

  if (!data?.weeks?.length) {
    return (
      <div className="py-20 text-center" style={{ backgroundColor: DK.bg }}>
        <p style={{ color: DK.textMuted }}>No expense data yet</p>
      </div>
    );
  }

  const weeks = data.weeks;
  const currentWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const wowChange = prevWeek && prevWeek.total > 0 ? Math.round((currentWeek.total - prevWeek.total) / prevWeek.total * 100) : null;

  const trendData = weeks.map(w => ({ name: w.label.split(" - ")[0], total: w.total }));
  const maxTrend = Math.max(...trendData.map(t => t.total));

  const dayData = DAY_NAMES.map(d => ({
    name: d, amount: currentWeek.byDay[d] || 0, isWeekend: d === "Sat" || d === "Sun",
  }));
  const maxDayAmt = Math.max(...dayData.map(d => d.amount));
  const avgDaily = currentWeek.total > 0 ? Math.round(currentWeek.total / 7) : 0;
  const drillWeek = selectedWeek !== null ? weeks[selectedWeek] : null;

  return (
    <div className="pb-6" style={{ backgroundColor: DK.bg }} data-testid="expense-weekly">
      {/* Summary Card */}
      <div className="px-4 pt-4 mb-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-summary-card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: DK.textMuted }}>{currentWeek.label}</p>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: DK.textWhite }}>{formatINR(currentWeek.total)}</p>
            </div>
            {wowChange !== null && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: wowChange > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: wowChange > 0 ? DK.red : DK.green }}>
                {wowChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {wowChange > 0 ? "+" : ""}{wowChange}%
              </div>
            )}
          </div>

          {/* Weekday/Weekend */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(6,182,212,0.05) 100%)", border: `1px solid rgba(59,130,246,0.2)` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: DK.blue }}>Weekdays</p>
              <p className="text-lg font-bold" style={{ color: DK.textWhite }}>{formatK(currentWeek.weekdayTotal)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(251,146,60,0.05) 100%)", border: `1px solid rgba(249,115,22,0.2)` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: DK.orangeHot }}>Weekends</p>
              <p className="text-lg font-bold" style={{ color: DK.textWhite }}>{formatK(currentWeek.weekendTotal)}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-3 pt-2.5 text-xs" style={{ borderTop: `1px solid ${DK.divider}` }}>
            <span style={{ color: DK.textMuted }}>Week Total: <span className="font-bold" style={{ color: DK.textWhite }}>{formatINR(currentWeek.total)}</span></span>
            <span style={{ color: DK.divider }}>|</span>
            <span style={{ color: DK.textMuted }}>Avg Daily: <span className="font-bold" style={{ color: DK.textWhite }}>{formatINR(avgDaily)}</span></span>
          </div>
        </div>
      </div>

      {/* Day Breakdown */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-day-breakdown">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textWhite }}>This Week by Day</h3>
          <div className="space-y-2">
            {dayData.map(d => {
              const barColor = getDayBarColor(d.amount, maxDayAmt, d.isWeekend);
              return (
                <div key={d.name} className="flex items-center gap-2.5">
                  <span className="text-[11px] w-7 font-bold" style={{ color: d.isWeekend ? DK.orangeHot : DK.textSecondary }}>{d.name}</span>
                  <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-md transition-all duration-500" style={{ width: `${maxDayAmt > 0 ? Math.max(2, d.amount / maxDayAmt * 100) : 0}%`, background: d.amount > 0 ? `linear-gradient(90deg, ${barColor}AA, ${barColor})` : DK.barTrack }} />
                  </div>
                  <span className="text-[11px] w-16 text-right font-bold tabular-nums" style={{ color: d.amount > 0 ? DK.textWhite : DK.textMuted }}>{d.amount > 0 ? formatINR(d.amount) : "—"}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-2.5 pt-2" style={{ borderTop: `1px solid ${DK.divider}` }}>
            {[{ label: "Low", color: DK.teal }, { label: "Medium", color: DK.cyan }, { label: "High", color: DK.amber }, { label: "Weekend", color: DK.orangeHot }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} /><span className="text-[9px]" style={{ color: DK.textMuted }}>{label}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories for Current Week */}
      {currentWeek.topCategories?.length > 0 && (
        <div className="px-4 mb-3">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-categories">
            <h3 className="text-sm font-bold mb-3" style={{ color: DK.textWhite }}>This Week — Categories</h3>
            <div className="space-y-2">
              {currentWeek.topCategories.slice(0, 6).map((c, i) => {
                const pct = currentWeek.total > 0 ? Math.round(c.amount / currentWeek.total * 100) : 0;
                const color = CAT_COLORS[i % CAT_COLORS.length];
                return (
                  <button key={c.category} className="w-full text-left" data-testid={`weekly-cat-${c.category}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium" style={{ color: DK.textSecondary }}>{c.category}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: DK.textWhite }}>{formatINR(c.amount)}</span>
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

      {/* 8-Week Trend */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textWhite }}>8-Week Trend</h3>
          <div className="h-[140px] sm:h-[160px]" style={{ outline: "none" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barSize={18} style={{ outline: "none" }} accessibilityLayer={false} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedWeek(e.activeTooltipIndex === selectedWeek ? null : e.activeTooltipIndex); }}>
                <XAxis dataKey="name" tick={{ fill: DK.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={38} />
                <Tooltip formatter={(val) => [formatINR(val), "Spend"]} contentStyle={{ backgroundColor: DK.cardHighlight, border: `1px solid rgba(100,140,200,0.2)`, borderRadius: "10px", color: DK.textWhite, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }} labelStyle={{ color: DK.blue, fontWeight: "bold" }} itemStyle={{ color: DK.textWhite }} cursor={false} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {trendData.map((entry, idx) => {
                    const ratio = maxTrend > 0 ? entry.total / maxTrend : 0;
                    let fill;
                    if (idx === selectedWeek) fill = DK.gold;
                    else if (idx === trendData.length - 1) fill = DK.teal;
                    else if (ratio > 0.7) fill = DK.amber;
                    else fill = DK.cyan;
                    return <Cell key={idx} fill={fill} fillOpacity={idx === selectedWeek ? 1 : 0.65} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drill-down on trend click */}
      {drillWeek && (
        <div className="px-4 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-300" data-testid="week-drilldown">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.cardHighlight, border: `1px solid rgba(251,191,36,0.2)` }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold" style={{ color: DK.gold }}>{drillWeek.label}</h3>
              <button onClick={() => setSelectedWeek(null)} className="text-[11px] px-2 py-1 rounded-lg font-medium" style={{ color: DK.textMuted, backgroundColor: DK.barTrack }}>Close</button>
            </div>
            <p className="text-xl font-bold mb-2" style={{ color: DK.textWhite }}>{formatINR(drillWeek.total)}</p>
            <div className="space-y-1.5">
              {DAY_NAMES.map(d => {
                const val = drillWeek.byDay[d] || 0;
                const max = Math.max(...Object.values(drillWeek.byDay));
                const isWknd = d === "Sat" || d === "Sun";
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[11px] w-7 font-medium" style={{ color: isWknd ? DK.orangeHot : DK.textMuted }}>{d}</span>
                    <div className="flex-1 h-3.5 rounded-md overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-md" style={{ width: `${max > 0 ? val / max * 100 : 0}%`, backgroundColor: getDayBarColor(val, max, isWknd) }} />
                    </div>
                    <span className="text-[10px] w-14 text-right font-bold" style={{ color: DK.textSecondary }}>{val > 0 ? formatINR(val) : "—"}</span>
                  </div>
                );
              })}
            </div>
            {drillWeek.topCategories?.length > 0 && (
              <div className="mt-2.5 pt-2" style={{ borderTop: `1px solid ${DK.divider}` }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: DK.textMuted }}>Categories</p>
                {drillWeek.topCategories.slice(0, 4).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between py-0.5">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[i] }} /><span className="text-xs" style={{ color: DK.textSecondary }}>{c.category}</span></div>
                    <span className="text-xs font-bold" style={{ color: DK.textWhite }}>{formatINR(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Behavior Insights */}
      {data.insights?.length > 0 && (
        <div className="px-4" data-testid="weekly-insights">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <div className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" style={{ color: DK.gold }} /><p className="text-xs font-bold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Behavior Insights</p></div>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>
          <div className="space-y-2">
            {data.insights.map((insight, i) => {
              const colors = [DK.teal, DK.amber, DK.orangeHot];
              const c = colors[i % colors.length];
              return (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
                  <p className="text-[11px] sm:text-xs leading-snug font-semibold" style={{ color: DK.textPrimary }}>{insight}</p>
                  <div className="h-1 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-full" style={{ width: "55%", background: `linear-gradient(90deg, ${c}50, ${c})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseWeekly;

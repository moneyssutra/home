import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Zap, Eye } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Premium turquoise dark theme tokens
const DK = {
  bg: "#041418",
  card: "#0A1F24",
  cardAlt: "#0D2A30",
  cardBorder: "rgba(13,148,136,0.15)",
  cardBorderHover: "rgba(13,148,136,0.3)",
  // Warm spectrum
  teal: "#2DD4BF",
  tealSoft: "rgba(45,212,191,0.08)",
  tealBorder: "rgba(45,212,191,0.2)",
  cyan: "#14B8A6",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.06)",
  amberBorder: "rgba(245,158,11,0.2)",
  orange: "#FB923C",
  orangeHot: "#F97316",
  orangeSoft: "rgba(251,146,60,0.08)",
  orangeBorder: "rgba(251,146,60,0.2)",
  green: "#34D399",
  greenSoft: "rgba(52,211,153,0.08)",
  greenBorder: "rgba(52,211,153,0.2)",
  blue: "#06B6D4",
  blueSoft: "rgba(6,182,212,0.08)",
  blueBorder: "rgba(6,182,212,0.2)",
  gold: "#FBBF24",
  goldSoft: "rgba(251,191,36,0.06)",
  goldBorder: "rgba(251,191,36,0.15)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.1)",
  textPrimary: "#E8F5F2",
  textSecondary: "#8BC4B8",
  textMuted: "#547D73",
  barTrack: "#0C2A30",
  divider: "rgba(45,212,191,0.1)",
};

const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};

const formatFull = (v) => `₹${v.toLocaleString("en-IN")}`;

// Warm heatmap: teal → cyan → amber → orange based on intensity
const getDayBarColor = (amount, max, isWeekend) => {
  if (amount === 0) return DK.barTrack;
  const ratio = max > 0 ? amount / max : 0;
  if (isWeekend) {
    return ratio > 0.6 ? DK.orangeHot : DK.orange;
  }
  if (ratio > 0.7) return DK.amber;
  if (ratio > 0.4) return DK.cyan;
  return DK.teal;
};

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

  const trendData = weeks.map(w => ({
    name: w.label.split(" - ")[0],
    total: w.total,
    label: w.label,
  }));

  const dayData = DAY_NAMES.map(d => ({
    name: d,
    amount: currentWeek.byDay[d] || 0,
    isWeekend: d === "Sat" || d === "Sun",
  }));

  const maxDayAmt = Math.max(...dayData.map(d => d.amount));
  const avgDaily = currentWeek.total > 0 ? Math.round(currentWeek.total / 7) : 0;
  const drillWeek = selectedWeek !== null ? weeks[selectedWeek] : null;
  const maxTrend = Math.max(...trendData.map(t => t.total));

  return (
    <div className="pb-6" style={{ backgroundColor: DK.bg }} data-testid="expense-weekly">
      {/* Current Week Summary */}
      <div className="px-5 pt-4 mb-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-summary-card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: DK.textMuted }}>{currentWeek.label}</p>
              <p className="text-3xl font-bold tracking-tight" style={{ color: DK.textPrimary, fontFamily: "'Manrope', sans-serif" }}>{formatFull(currentWeek.total)}</p>
            </div>
            {wowChange !== null && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: wowChange > 0 ? DK.redSoft : DK.greenSoft, color: wowChange > 0 ? DK.red : DK.green, border: `1px solid ${wowChange > 0 ? 'rgba(239,68,68,0.2)' : DK.greenBorder}` }}>
                {wowChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {wowChange > 0 ? "+" : ""}{wowChange}%
              </div>
            )}
          </div>

          {/* Weekday vs Weekend — styled cards */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl p-3.5" style={{ background: `linear-gradient(135deg, ${DK.blueSoft} 0%, rgba(34,211,238,0.04) 100%)`, border: `1px solid ${DK.blueBorder}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: DK.blue }}>Weekdays</p>
              <p className="text-xl font-bold" style={{ color: DK.textPrimary }}>{formatK(currentWeek.weekdayTotal)}</p>
            </div>
            <div className="rounded-xl p-3.5" style={{ background: `linear-gradient(135deg, ${DK.orangeSoft} 0%, rgba(245,158,11,0.04) 100%)`, border: `1px solid ${DK.orangeBorder}` }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: DK.orange }}>Weekends</p>
              <p className="text-xl font-bold" style={{ color: DK.textPrimary }}>{formatK(currentWeek.weekendTotal)}</p>
            </div>
          </div>

          {/* Week Total / Avg Daily Footer */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3" style={{ borderTop: `1px solid ${DK.divider}` }}>
            <span className="text-xs" style={{ color: DK.textMuted }}>Week Total: <span className="font-bold" style={{ color: DK.textPrimary }}>{formatFull(currentWeek.total)}</span></span>
            <span style={{ color: DK.divider }}>|</span>
            <span className="text-xs" style={{ color: DK.textMuted }}>Avg. Daily: <span className="font-bold" style={{ color: DK.textPrimary }}>{formatK(avgDaily)}</span></span>
          </div>
        </div>
      </div>

      {/* Day Breakdown — warm heatmap bars */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-day-breakdown">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>This Week by Day</h3>
          <div className="space-y-2.5">
            {dayData.map(d => {
              const barColor = getDayBarColor(d.amount, maxDayAmt, d.isWeekend);
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-[11px] w-8 font-semibold" style={{ color: d.isWeekend ? DK.orange : DK.textSecondary }}>{d.name}</span>
                  <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div
                      className="h-full rounded-lg transition-all duration-700 ease-out"
                      style={{
                        width: `${maxDayAmt > 0 ? Math.max(2, d.amount / maxDayAmt * 100) : 0}%`,
                        background: d.amount > 0 ? `linear-gradient(90deg, ${barColor}CC, ${barColor})` : DK.barTrack,
                      }}
                    />
                  </div>
                  <span className="text-xs w-14 text-right font-bold tabular-nums" style={{ color: d.amount > 0 ? DK.textPrimary : DK.textMuted }}>
                    {d.amount > 0 ? formatK(d.amount) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Color legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-2.5" style={{ borderTop: `1px solid ${DK.divider}` }}>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DK.teal }} />
              <span className="text-[10px]" style={{ color: DK.textMuted }}>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DK.cyan }} />
              <span className="text-[10px]" style={{ color: DK.textMuted }}>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DK.amber }} />
              <span className="text-[10px]" style={{ color: DK.textMuted }}>High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: DK.orangeHot }} />
              <span className="text-[10px]" style={{ color: DK.textMuted }}>Weekend</span>
            </div>
          </div>
        </div>
      </div>

      {/* 8-Week Trend — warm gradient bars */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>8-Week Trend</h3>
          <div className="h-[160px]" style={{ outline: "none" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barSize={20} style={{ outline: "none" }} accessibilityLayer={false} onClick={(e) => { if (e?.activeTooltipIndex !== undefined) setSelectedWeek(e.activeTooltipIndex === selectedWeek ? null : e.activeTooltipIndex); }}>
                <XAxis dataKey="name" tick={{ fill: DK.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={38} />
                <Tooltip
                  formatter={(val) => [formatFull(val), "Spend"]}
                  contentStyle={{ backgroundColor: "#0D2A30", border: "1px solid rgba(45,212,191,0.3)", borderRadius: "12px", color: "#E8F5F2", fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                  labelStyle={{ color: "#2DD4BF", fontWeight: "bold" }}
                  itemStyle={{ color: "#E8F5F2" }}
                  cursor={false}
                />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {trendData.map((entry, idx) => {
                    const ratio = maxTrend > 0 ? entry.total / maxTrend : 0;
                    let fill;
                    if (idx === selectedWeek) fill = DK.gold;
                    else if (idx === trendData.length - 1) fill = DK.teal;
                    else if (ratio > 0.7) fill = DK.amber;
                    else fill = DK.cyan;
                    return <Cell key={idx} fill={fill} fillOpacity={idx === selectedWeek ? 1 : 0.7} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Week Drill-down */}
      {drillWeek && (
        <div className="px-5 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300" data-testid="week-drilldown">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.cardAlt, border: `1px solid ${DK.goldBorder}` }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold" style={{ color: DK.gold }}>{drillWeek.label}</h3>
              <button onClick={() => setSelectedWeek(null)} className="text-[11px] px-2.5 py-1 rounded-lg font-medium" style={{ color: DK.textMuted, backgroundColor: DK.barTrack, border: `1px solid ${DK.divider}` }}>Close</button>
            </div>
            <p className="text-xl font-bold mb-3" style={{ color: DK.textPrimary }}>{formatFull(drillWeek.total)}</p>
            <div className="space-y-1.5">
              {DAY_NAMES.map(d => {
                const val = drillWeek.byDay[d] || 0;
                const max = Math.max(...Object.values(drillWeek.byDay));
                const isWknd = d === "Sat" || d === "Sun";
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[11px] w-7 font-medium" style={{ color: isWknd ? DK.orange : DK.textMuted }}>{d}</span>
                    <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-md" style={{ width: `${max > 0 ? val / max * 100 : 0}%`, backgroundColor: getDayBarColor(val, max, isWknd) }} />
                    </div>
                    <span className="text-[10px] w-12 text-right font-medium" style={{ color: DK.textSecondary }}>{val > 0 ? formatK(val) : "—"}</span>
                  </div>
                );
              })}
            </div>
            {drillWeek.topCategories?.length > 0 && (
              <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${DK.divider}` }}>
                <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: DK.textMuted }}>Top Categories</p>
                {drillWeek.topCategories.map((c, i) => {
                  const catColors = [DK.teal, DK.amber, DK.orange];
                  return (
                    <div key={c.category} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColors[i] || DK.cyan }} />
                        <span className="text-xs" style={{ color: DK.textSecondary }}>{c.category}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: DK.textPrimary }}>{formatK(c.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Behavior Insights — Premium styled cards */}
      {data.insights?.length > 0 && (
        <div className="px-5" data-testid="weekly-insights">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" style={{ color: DK.gold }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Behavior Insights</p>
            </div>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>
          <div className="space-y-2.5">
            {data.insights.map((insight, i) => {
              const styles = [
                { bg: DK.tealSoft, border: DK.tealBorder, accent: DK.teal, barBg: `linear-gradient(90deg, ${DK.teal}40, ${DK.teal})` },
                { bg: DK.amberSoft, border: DK.amberBorder, accent: DK.amber, barBg: `linear-gradient(90deg, ${DK.amber}40, ${DK.amber})` },
                { bg: DK.orangeSoft, border: DK.orangeBorder, accent: DK.orange, barBg: `linear-gradient(90deg, ${DK.orange}40, ${DK.orange})` },
              ];
              const s = styles[i % styles.length];
              return (
                <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
                  <p className="text-[12px] leading-relaxed font-medium" style={{ color: DK.textPrimary }}>{insight}</p>
                  <div className="h-1 rounded-full mt-2.5 overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                    <div className="h-full rounded-full" style={{ width: "60%", background: s.barBg }} />
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

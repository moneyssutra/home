import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DK = {
  bg: "#0B1120",
  card: "#111827",
  cardBorder: "rgba(59,130,246,0.08)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.12)",
  orange: "#F97316",
  orangeSoft: "rgba(249,115,22,0.12)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.12)",
  purple: "#8B5CF6",
  amber: "#F59E0B",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  barTrack: "#1E293B",
  divider: "rgba(148,163,184,0.08)",
};

const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${Math.round(v / 1000)}k`;
  return `₹${v}`;
};

const formatFull = (v) => `₹${v.toLocaleString("en-IN")}`;

const dayColors = { Mon: DK.blue, Tue: DK.blue, Wed: DK.blue, Thu: DK.blue, Fri: DK.purple, Sat: DK.orange, Sun: DK.orange };

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
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: DK.blue, borderTopColor: "transparent" }} />
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
  }));

  const maxDayAmt = Math.max(...dayData.map(d => d.amount));
  const drillWeek = selectedWeek !== null ? weeks[selectedWeek] : null;

  return (
    <div className="pb-6" style={{ backgroundColor: DK.bg }} data-testid="expense-weekly">
      {/* Current Week Summary */}
      <div className="px-5 pt-4 mb-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-summary-card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: DK.textMuted }}>{currentWeek.label}</p>
              <p className="text-3xl font-bold" style={{ color: DK.textPrimary, fontFamily: "'Manrope', sans-serif" }}>{formatFull(currentWeek.total)}</p>
            </div>
            {wowChange !== null && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: wowChange > 0 ? "rgba(239,68,68,0.12)" : DK.greenSoft, color: wowChange > 0 ? "#EF4444" : DK.green }}>
                {wowChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {wowChange > 0 ? "+" : ""}{wowChange}%
              </div>
            )}
          </div>

          {/* Weekday vs Weekend */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <div className="rounded-xl p-3" style={{ backgroundColor: DK.blueSoft, border: "1px solid rgba(59,130,246,0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DK.blue }}>Weekdays</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: DK.textPrimary }}>{formatK(currentWeek.weekdayTotal)}</p>
            </div>
            <div className="rounded-xl p-3" style={{ backgroundColor: DK.orangeSoft, border: "1px solid rgba(249,115,22,0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: DK.orange }}>Weekends</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: DK.textPrimary }}>{formatK(currentWeek.weekendTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Day Breakdown Bars */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-day-breakdown">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>This Week by Day</h3>
          <div className="space-y-2">
            {dayData.map(d => (
              <div key={d.name} className="flex items-center gap-2.5">
                <span className="text-[11px] w-8 font-medium" style={{ color: d.name === "Sat" || d.name === "Sun" ? DK.orange : DK.textMuted }}>{d.name}</span>
                <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                  <div
                    className="h-full rounded-md transition-all duration-500"
                    style={{
                      width: `${maxDayAmt > 0 ? Math.max(2, d.amount / maxDayAmt * 100) : 0}%`,
                      backgroundColor: dayColors[d.name],
                      opacity: d.amount > 0 ? 0.85 : 0.15,
                    }}
                  />
                </div>
                <span className="text-[11px] w-14 text-right font-medium" style={{ color: d.amount > 0 ? DK.textPrimary : DK.textMuted }}>
                  {d.amount > 0 ? formatK(d.amount) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8-Week Trend */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }} data-testid="weekly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: DK.textPrimary }}>8-Week Trend</h3>
          <div className="h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barSize={18}>
                <XAxis dataKey="name" tick={{ fill: DK.textMuted, fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: DK.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={38} />
                <Tooltip formatter={(val) => [formatFull(val), "Spend"]} contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: 12 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(_, idx) => setSelectedWeek(idx === selectedWeek ? null : idx)}>
                  {trendData.map((_, idx) => (
                    <Cell key={idx} fill={idx === selectedWeek ? DK.orange : DK.purple} fillOpacity={idx === selectedWeek ? 1 : 0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Week Drill-down */}
      {drillWeek && (
        <div className="px-5 mb-4 animate-in fade-in slide-in-from-bottom-3 duration-300" data-testid="week-drilldown">
          <div className="rounded-2xl p-4" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}` }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold" style={{ color: DK.textPrimary }}>{drillWeek.label}</h3>
              <button onClick={() => setSelectedWeek(null)} className="text-xs px-2 py-0.5 rounded-md" style={{ color: DK.textMuted, backgroundColor: DK.barTrack }}>Close</button>
            </div>
            <p className="text-xl font-bold mb-3" style={{ color: DK.textPrimary }}>{formatFull(drillWeek.total)}</p>
            <div className="space-y-1.5">
              {DAY_NAMES.map(d => {
                const val = drillWeek.byDay[d] || 0;
                const max = Math.max(...Object.values(drillWeek.byDay));
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[11px] w-7" style={{ color: DK.textMuted }}>{d}</span>
                    <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: DK.barTrack }}>
                      <div className="h-full rounded-md" style={{ width: `${max > 0 ? val / max * 100 : 0}%`, backgroundColor: dayColors[d] }} />
                    </div>
                    <span className="text-[10px] w-12 text-right" style={{ color: DK.textSecondary }}>{val > 0 ? formatK(val) : "—"}</span>
                  </div>
                );
              })}
            </div>
            {drillWeek.topCategories?.length > 0 && (
              <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${DK.divider}` }}>
                <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: DK.textMuted }}>Top Categories</p>
                {drillWeek.topCategories.map(c => (
                  <div key={c.category} className="flex justify-between py-1">
                    <span className="text-xs" style={{ color: DK.textSecondary }}>{c.category}</span>
                    <span className="text-xs font-medium" style={{ color: DK.textPrimary }}>{formatK(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights?.length > 0 && (
        <div className="px-5" data-testid="weekly-insights">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: DK.textSecondary }}>Behavior Insights</p>
            <div className="h-px flex-1" style={{ backgroundColor: DK.divider }} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {data.insights.map((insight, i) => {
              const colors = [DK.blue, DK.orange, DK.green];
              return (
                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: DK.card, border: `1px solid ${DK.cardBorder}`, borderBottom: `2px solid ${colors[i]}` }}>
                  <p className="text-[11px] leading-snug font-medium" style={{ color: DK.textSecondary }}>{insight}</p>
                  <div className="h-1 rounded-full mt-2" style={{ backgroundColor: colors[i], opacity: 0.6 }} />
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

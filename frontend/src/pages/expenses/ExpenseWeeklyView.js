import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, Lightbulb, Calendar } from "lucide-react";
import axios from "axios";
import ExpenseLayout, { THEME, fmt, fmtFull } from "./ExpenseLayout";

const API = process.env.REACT_APP_BACKEND_URL;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
      <p className="font-bold" style={{ color: THEME.textPrimary }}>{label}</p>
      <p style={{ color: THEME.accent }}>{fmtFull(payload[0].value)}</p>
    </div>
  );
};

export default function ExpenseWeeklyView() {
  const [weeklyData, setWeeklyData] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API}/api/expenses/weekly-summary`, {
          params: { last: 8 },
          withCredentials: true,
        });
        setWeeklyData(res.data);
        if (res.data?.weeks?.length > 0) {
          setSelectedWeek(res.data.weeks.length - 1);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentWeek = useMemo(() => {
    if (!weeklyData?.weeks || selectedWeek === null) return null;
    return weeklyData.weeks[selectedWeek];
  }, [weeklyData, selectedWeek]);

  const prevWeek = useMemo(() => {
    if (!weeklyData?.weeks || selectedWeek === null || selectedWeek <= 0) return null;
    return weeklyData.weeks[selectedWeek - 1];
  }, [weeklyData, selectedWeek]);

  const barData = useMemo(() => {
    if (!currentWeek?.byDay) return [];
    return DAY_NAMES.map((d) => ({
      day: d,
      amount: currentWeek.byDay[d] || 0,
      isWeekend: d === "Sat" || d === "Sun",
    }));
  }, [currentWeek]);

  const changeVsPrev = useMemo(() => {
    if (!currentWeek || !prevWeek || prevWeek.total === 0) return null;
    return ((currentWeek.total - prevWeek.total) / prevWeek.total) * 100;
  }, [currentWeek, prevWeek]);

  if (loading) {
    return (
      <ExpenseLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: THEME.barTrack, borderTopColor: THEME.accent }} />
        </div>
      </ExpenseLayout>
    );
  }

  return (
    <ExpenseLayout>
      <div className="space-y-4">
        {/* Week Selector */}
        {weeklyData?.weeks && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-testid="week-selector">
            {weeklyData.weeks.map((w, i) => {
              const isActive = i === selectedWeek;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedWeek(i)}
                  className="flex-shrink-0 px-3 py-2 rounded-xl text-[10px] font-semibold transition-all whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? "rgba(99, 102, 241, 0.12)" : "rgba(255,255,255,0.03)",
                    color: isActive ? "#818CF8" : THEME.textMuted,
                    border: isActive ? "1px solid rgba(99, 102, 241, 0.2)" : `1px solid ${THEME.cardBorder}`,
                  }}
                  data-testid={`week-${i}`}
                >
                  {w.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Weekly Total Card */}
        {currentWeek && (
          <GlassCard testId="weekly-total" style={{ background: `linear-gradient(135deg, rgba(99, 102, 241, 0.08), ${THEME.card})` }}>
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: THEME.textMuted }}>Week Total</p>
                <p className="text-2xl font-black" style={{ color: THEME.textPrimary }}>{fmtFull(currentWeek.total)}</p>
              </div>
              {changeVsPrev !== null && (
                <div
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: changeVsPrev > 0 ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
                    color: changeVsPrev > 0 ? "#EF4444" : "#10B981",
                  }}
                  data-testid="week-change"
                >
                  {changeVsPrev > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(changeVsPrev).toFixed(1)}% vs prev
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <p className="text-[9px]" style={{ color: THEME.textMuted }}>Weekday</p>
                <p className="text-xs font-bold" style={{ color: THEME.essential }}>{fmtFull(currentWeek.weekdayTotal)}</p>
              </div>
              <div className="p-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                <p className="text-[9px]" style={{ color: THEME.textMuted }}>Weekend</p>
                <p className="text-xs font-bold" style={{ color: THEME.lifestyle }}>{fmtFull(currentWeek.weekendTotal)}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Bar Chart */}
        {barData.length > 0 && (
          <GlassCard testId="weekly-chart">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Daily Breakdown
            </h3>
            <div style={{ width: "100%", height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="day"
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
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {barData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.isWeekend ? THEME.lifestyle : THEME.accent}
                        fillOpacity={entry.amount > 0 ? 0.8 : 0.2}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: THEME.accent }} />
                <span className="text-[10px]" style={{ color: THEME.textMuted }}>Weekday</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: THEME.lifestyle }} />
                <span className="text-[10px]" style={{ color: THEME.textMuted }}>Weekend</span>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Week Comparison */}
        {weeklyData?.weeks?.length >= 2 && (
          <GlassCard testId="week-comparison">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Week Comparison
            </h3>
            <div className="space-y-2">
              {weeklyData.weeks.slice(-4).map((w, i) => {
                const maxTotal = Math.max(...weeklyData.weeks.map((wk) => wk.total));
                const pct = maxTotal > 0 ? (w.total / maxTotal) * 100 : 0;
                const isSelected = weeklyData.weeks.indexOf(w) === selectedWeek;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedWeek(weeklyData.weeks.indexOf(w))}
                    className="w-full flex items-center gap-3 transition-all"
                    data-testid={`compare-week-${i}`}
                  >
                    <span className="text-[10px] font-medium w-24 text-left truncate" style={{ color: isSelected ? "#818CF8" : THEME.textMuted }}>
                      {w.label.split(" - ")[0]}
                    </span>
                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: THEME.barTrack }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: isSelected ? `linear-gradient(90deg, ${THEME.accent}, #818CF8)` : "rgba(99, 102, 241, 0.3)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-bold w-14 text-right" style={{ color: isSelected ? "#818CF8" : THEME.textSecondary }}>
                      {fmt(w.total)}
                    </span>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* Top Categories This Week */}
        {currentWeek?.topCategories?.length > 0 && (
          <GlassCard testId="weekly-categories">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: THEME.textMuted }}>
              Top Categories
            </h3>
            <div className="space-y-2">
              {currentWeek.topCategories.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold w-4 text-center" style={{ color: THEME.textMuted }}>{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: THEME.textPrimary }}>{cat.category}</span>
                      <span className="text-xs font-bold" style={{ color: THEME.textSecondary }}>{fmtFull(cat.amount)}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: THEME.barTrack }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${currentWeek.topCategories[0].amount > 0 ? (cat.amount / currentWeek.topCategories[0].amount) * 100 : 0}%`,
                          backgroundColor: [THEME.accent, THEME.lifestyle, THEME.wealth][i] || THEME.textMuted,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Weekly Insights */}
        {weeklyData?.insights?.length > 0 && (
          <GlassCard testId="weekly-insights">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4" style={{ color: "#FBBF24" }} />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: THEME.textMuted }}>Weekly Insights</h3>
            </div>
            <div className="space-y-2">
              {weeklyData.insights.map((insight, i) => (
                <p key={i} className="text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
                  {insight}
                </p>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </ExpenseLayout>
  );
}

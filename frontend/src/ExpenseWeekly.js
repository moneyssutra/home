import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Lightbulb, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_COLORS = { Mon: "#3B82F6", Tue: "#3B82F6", Wed: "#3B82F6", Thu: "#3B82F6", Fri: "#8B5CF6", Sat: "#F97316", Sun: "#F97316" };

const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v}`;
};

const ExpenseWeekly = () => {
  const navigate = useNavigate();
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!data || !data.weeks?.length) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <header className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }}><ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} /></button>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Weekly Analysis</h1>
        </header>
        <div className="px-6 py-20 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No expense data yet</p>
        </div>
      </div>
    );
  }

  const weeks = data.weeks;
  const currentWeek = weeks[weeks.length - 1];
  const prevWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const wowChange = prevWeek && prevWeek.total > 0 ? Math.round((currentWeek.total - prevWeek.total) / prevWeek.total * 100) : null;

  // Trend chart data
  const trendData = weeks.map(w => ({
    name: w.label.split(" - ")[0],
    total: w.total,
    label: w.label,
  }));

  // Current week day breakdown
  const dayData = DAY_NAMES.map(d => ({
    name: d,
    amount: currentWeek.byDay[d] || 0,
  }));

  const drillWeek = selectedWeek !== null ? weeks[selectedWeek] : null;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-primary)" }} data-testid="expense-weekly">
      {/* Current Week Summary */}
      <div className="px-5 pt-5">
        <div className="rounded-2xl p-5 shadow-card" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="weekly-summary-card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-400">{currentWeek.label}</p>
            {wowChange !== null && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: wowChange > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: wowChange > 0 ? "#EF4444" : "#22C55E" }}>
                {wowChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {wowChange > 0 ? "+" : ""}{wowChange}%
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>₹{currentWeek.total.toLocaleString("en-IN")}</p>

          {/* Weekday vs Weekend */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
              <p className="text-[10px] text-blue-400 mb-0.5">Weekdays</p>
              <p className="text-sm font-bold text-blue-300">{formatK(currentWeek.weekdayTotal)}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ backgroundColor: "rgba(249,115,22,0.1)" }}>
              <p className="text-[10px] text-orange-400 mb-0.5">Weekends</p>
              <p className="text-sm font-bold text-orange-300">{formatK(currentWeek.weekendTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Day Breakdown for Current Week */}
      <div className="px-5 mt-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="weekly-day-breakdown">
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>This Week by Day</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} barSize={24}>
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={40} />
                <Tooltip formatter={(val) => [`₹${val.toLocaleString("en-IN")}`, "Spend"]} contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: 12 }} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {dayData.map((entry, idx) => (
                    <Cell key={idx} fill={DAY_COLORS[entry.name]} fillOpacity={entry.amount > 0 ? 0.85 : 0.2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 8-Week Trend */}
      <div className="px-5 mt-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="weekly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>8-Week Trend</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} barSize={20}>
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={40} />
                <Tooltip formatter={(val) => [`₹${val.toLocaleString("en-IN")}`, "Spend"]} contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: 12 }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(_, idx) => setSelectedWeek(idx)}>
                  {trendData.map((_, idx) => (
                    <Cell key={idx} fill={idx === selectedWeek ? "#F97316" : "#6366F1"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Week Drill-down */}
      {drillWeek && (
        <div className="px-5 mt-4 animate-in fade-in slide-in-from-bottom-3 duration-300" data-testid="week-drilldown">
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white">{drillWeek.label}</h3>
              <button onClick={() => setSelectedWeek(null)} className="text-xs text-slate-400">Close</button>
            </div>
            <p className="text-xl font-bold text-white mb-2">₹{drillWeek.total.toLocaleString("en-IN")}</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                <p className="text-[10px] text-blue-400">Weekdays</p>
                <p className="text-sm font-bold text-blue-300">{formatK(drillWeek.weekdayTotal)}</p>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "rgba(249,115,22,0.1)" }}>
                <p className="text-[10px] text-orange-400">Weekends</p>
                <p className="text-sm font-bold text-orange-300">{formatK(drillWeek.weekendTotal)}</p>
              </div>
            </div>

            {/* Day bars */}
            <div className="space-y-1.5">
              {DAY_NAMES.map(d => {
                const val = drillWeek.byDay[d] || 0;
                const max = Math.max(...Object.values(drillWeek.byDay));
                return (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[11px] w-8 text-slate-400">{d}</span>
                    <div className="flex-1 h-4 rounded-md overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-md transition-all" style={{ width: `${max > 0 ? val / max * 100 : 0}%`, backgroundColor: DAY_COLORS[d] }} />
                    </div>
                    <span className="text-[10px] text-slate-300 w-12 text-right">{val > 0 ? formatK(val) : "-"}</span>
                  </div>
                );
              })}
            </div>

            {drillWeek.topCategories.length > 0 && (
              <div className="mt-3 pt-2 border-t border-white/5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Top Categories</p>
                {drillWeek.topCategories.map(c => (
                  <div key={c.category} className="flex justify-between py-1">
                    <span className="text-xs text-slate-300">{c.category}</span>
                    <span className="text-xs font-medium text-white">{formatK(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights */}
      {data.insights?.length > 0 && (
        <div className="px-5 mt-4 mb-6" data-testid="weekly-insights">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4" style={{ color: "#FBBF24" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Behavior Insights</h3>
            </div>
            <div className="space-y-2">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: "rgba(251,191,36,0.15)" }}>
                    <span className="text-[9px] font-bold" style={{ color: "#FBBF24" }}>{i + 1}</span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseWeekly;

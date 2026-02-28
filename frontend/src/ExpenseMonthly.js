import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronRight, Lightbulb, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = process.env.REACT_APP_BACKEND_URL;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatK = (v) => {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
  return `₹${v}`;
};

const getMonthLabel = (mk) => {
  const [y, m] = mk.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(2)}`;
};

const ExpenseMonthly = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/expenses/monthly-summary?last=6`, { withCredentials: true });
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

  if (!data || !data.months?.length) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
        <header className="px-5 pt-6 pb-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }}><ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} /></button>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Monthly Analysis</h1>
        </header>
        <div className="px-6 py-20 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p style={{ color: "var(--text-muted)" }}>No expense data yet</p>
        </div>
      </div>
    );
  }

  const months = data.months;
  const currentMonth = months[months.length - 1];
  const totals = months.map(m => m.total);
  const maxTotal = Math.max(...totals);

  const chartData = months.map(m => ({
    name: getMonthLabel(m.month),
    total: m.total,
    month: m.month,
    isHighest: m.total === maxTotal,
  }));

  const drillDown = selectedMonth ? months.find(m => m.month === selectedMonth) : null;

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: "var(--bg-primary)" }} data-testid="expense-monthly">
      {/* Summary Card */}
      <div className="px-5 pt-5">
        <div className="rounded-2xl p-5 shadow-card" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="monthly-summary-card">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium text-slate-400">{getMonthLabel(currentMonth.month)}</p>
            {currentMonth.changeVsLastMonth !== undefined && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: currentMonth.changeVsLastMonth > 0 ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: currentMonth.changeVsLastMonth > 0 ? "#EF4444" : "#22C55E" }} data-testid="change-badge">
                {currentMonth.changeVsLastMonth > 0 ? <TrendingUp className="h-3 w-3" /> : currentMonth.changeVsLastMonth < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {currentMonth.changeVsLastMonth > 0 ? "+" : ""}{currentMonth.changeVsLastMonth}%
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>₹{currentMonth.total.toLocaleString("en-IN")}</p>
          <p className="text-xs text-slate-400">{currentMonth.percentOfIncome}% of income</p>

          {/* Category bars */}
          <div className="mt-4 space-y-2">
            {[
              { label: "Essential", value: currentMonth.essential, color: "#3B82F6", total: currentMonth.total },
              { label: "Lifestyle", value: currentMonth.lifestyle, color: "#F97316", total: currentMonth.total },
              { label: "Wealth", value: currentMonth.wealth, color: "#22C55E", total: currentMonth.total },
            ].map(({ label, value, color, total }) => (
              <div key={label}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-300 font-medium">{formatK(value)} ({total > 0 ? Math.round(value / total * 100) : 0}%)</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total > 0 ? Math.min(100, value / total * 100) : 0}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6 Month Trend Chart */}
      <div className="px-5 mt-5">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="monthly-trend-chart">
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>6-Month Trend</h3>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatK} width={45} />
                <Tooltip
                  formatter={(val) => [`₹${val.toLocaleString("en-IN")}`, "Spend"]}
                  contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#fff", fontSize: 12 }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d) => setSelectedMonth(d.month)}>
                  {chartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.isHighest ? "#F97316" : "#3B82F6"} fillOpacity={selectedMonth === entry.month ? 1 : 0.75} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Stacked Breakdown */}
      <div className="px-5 mt-4">
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="monthly-category-breakdown">
          <h3 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>Category Breakdown</h3>
          <div className="space-y-2.5">
            {months.map(m => {
              const t = m.total || 1;
              return (
                <button key={m.month} onClick={() => setSelectedMonth(m.month === selectedMonth ? null : m.month)} className="w-full" data-testid={`month-bar-${m.month}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium w-14 text-left" style={{ color: "var(--text-secondary)" }}>{getMonthLabel(m.month)}</span>
                    <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>{formatK(m.total)}</span>
                  </div>
                  <div className="h-5 rounded-lg overflow-hidden flex" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <div className="h-full transition-all" style={{ width: `${m.essential / t * 100}%`, backgroundColor: "#3B82F6" }} title={`Essential: ${formatK(m.essential)}`} />
                    <div className="h-full transition-all" style={{ width: `${m.lifestyle / t * 100}%`, backgroundColor: "#F97316" }} title={`Lifestyle: ${formatK(m.lifestyle)}`} />
                    <div className="h-full transition-all" style={{ width: `${m.wealth / t * 100}%`, backgroundColor: "#22C55E" }} title={`Wealth: ${formatK(m.wealth)}`} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            {[{ label: "Essential", color: "#3B82F6" }, { label: "Lifestyle", color: "#F97316" }, { label: "Wealth", color: "#22C55E" }].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Month Drill-Down */}
      {drillDown && (
        <div className="px-5 mt-4 animate-in fade-in slide-in-from-bottom-3 duration-300" data-testid="month-drilldown">
          <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{getMonthLabel(drillDown.month)} Detail</h3>
              <button onClick={() => setSelectedMonth(null)} className="text-xs text-slate-400 hover:text-white">Close</button>
            </div>
            <p className="text-2xl font-bold text-white mb-1">₹{drillDown.total.toLocaleString("en-IN")}</p>
            <p className="text-xs text-slate-400 mb-3">{drillDown.percentOfIncome}% of income</p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: "rgba(59,130,246,0.12)" }}>
                <p className="text-[10px] text-blue-400">Essential</p>
                <p className="text-sm font-bold text-blue-300">{formatK(drillDown.essential)}</p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: "rgba(249,115,22,0.12)" }}>
                <p className="text-[10px] text-orange-400">Lifestyle</p>
                <p className="text-sm font-bold text-orange-300">{formatK(drillDown.lifestyle)}</p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ backgroundColor: "rgba(34,197,94,0.12)" }}>
                <p className="text-[10px] text-green-400">Wealth</p>
                <p className="text-sm font-bold text-green-300">{formatK(drillDown.wealth)}</p>
              </div>
            </div>

            {/* Top categories */}
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Top Categories</p>
            <div className="space-y-1.5">
              {drillDown.topCategories.slice(0, 5).map((c, i) => (
                <div key={c.category} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#94A3B8" }}>#{i + 1}</span>
                    <span className="text-xs text-slate-300">{c.category}</span>
                  </div>
                  <span className="text-xs font-semibold text-white">{formatK(c.amount)}</span>
                </div>
              ))}
            </div>

            {/* Comparison with previous month */}
            {(() => {
              const idx = months.findIndex(m => m.month === drillDown.month);
              if (idx > 0) {
                const prev = months[idx - 1];
                const diff = drillDown.total - prev.total;
                const pct = prev.total > 0 ? Math.round(diff / prev.total * 100) : 0;
                return (
                  <div className="mt-3 p-2.5 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
                    <p className="text-xs text-slate-300">
                      vs {getMonthLabel(prev.month)}: <span className="font-bold" style={{ color: diff > 0 ? "#EF4444" : "#22C55E" }}>{diff > 0 ? "+" : ""}{formatK(Math.abs(diff))} ({pct > 0 ? "+" : ""}{pct}%)</span>
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {/* Intelligence Insights */}
      {data.insights?.length > 0 && (
        <div className="px-5 mt-4" data-testid="monthly-insights">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4" style={{ color: "#FBBF24" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Intelligence</h3>
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

      {/* Stats row */}
      <div className="px-5 mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Avg Monthly</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{formatK(data.avgMonthlySpend)}</p>
          </div>
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-muted)" }}>Highest Month</p>
            <p className="text-base font-bold" style={{ color: "#F97316" }}>{data.highestSpendMonth ? getMonthLabel(data.highestSpendMonth) : "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseMonthly;

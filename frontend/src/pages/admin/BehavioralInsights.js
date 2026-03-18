import React, { useState, useEffect } from "react";
import adminApi from "@/utils/adminApi";
import {
  Activity, Users, AlertTriangle, TrendingUp, TrendingDown, Minus,
  UserX, UserCheck, Brain, ArrowUpRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";


const churnColors = { high: "#E11D48", medium: "#D97706", low: "#059669" };
const trendIcons = { improving: TrendingUp, declining: TrendingDown, stable: Minus };
const trendColors = { improving: "#059669", declining: "#E11D48", stable: "#94A3B8" };

const StatCard = ({ icon: Icon, label, value, subtitle, color = "teal" }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm" data-testid={`behavior-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-6 h-6 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-3 w-3 text-${color}-600`} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-black text-gray-900">{value}</div>
    {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-500"><span className="font-semibold" style={{ color: p.color }}>{p.name}:</span> {p.value}</p>
      ))}
    </div>
  );
};

const BehavioralInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("churn");

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await adminApi.get(`/admin/behavioral-insights?tz_offset=${tz}`);
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const churnDist = data.churnDistribution || {};
  const churnChartData = [
    { name: "High Risk", value: churnDist.high || 0, fill: churnColors.high },
    { name: "Medium Risk", value: churnDist.medium || 0, fill: churnColors.medium },
    { name: "Low Risk", value: churnDist.low || 0, fill: churnColors.low },
  ];

  return (
    <div data-testid="behavioral-insights-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">Behavioral Insights</h1>
        <p className="text-xs text-gray-400 mt-1">Churn prediction, behavioral patterns, and financial improvement tracking</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={Users} color="teal" label="Total Users" value={data.totalUsers} />
        <StatCard icon={UserCheck} color="emerald" label="Active (7d)" value={data.activeUsers} />
        <StatCard icon={UserX} color="rose" label="Dormant (14d+)" value={data.dormantUsers} />
        <StatCard icon={AlertTriangle} color="amber" label="High Churn" value={churnDist.high || 0} subtitle="Likely to leave" />
        <StatCard icon={TrendingUp} color="emerald" label="Improving" value={data.improvingCount} subtitle="Score trending up" />
        <StatCard icon={TrendingDown} color="rose" label="Declining" value={data.decliningCount} subtitle="Score trending down" />
      </div>

      {/* Churn Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid="churn-chart">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Churn Risk Distribution</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={churnChartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40} name="Users">
                  {churnChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Risk Indicators */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Risk Indicators</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl p-3 bg-rose-50 border border-rose-100">
              <div className="text-[10px] font-bold text-rose-600 uppercase mb-1">High Churn Risk</div>
              <div className="text-xs text-rose-500">Inactive 14+ days OR activity dropped 50%+ with declining score</div>
            </div>
            <div className="rounded-xl p-3 bg-amber-50 border border-amber-100">
              <div className="text-[10px] font-bold text-amber-600 uppercase mb-1">Medium Risk</div>
              <div className="text-xs text-amber-500">Inactive 7-14 days OR moderate activity decline with low engagement</div>
            </div>
            <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100">
              <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Low Risk</div>
              <div className="text-xs text-emerald-500">Active within 7 days with stable or improving activity</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4">
        {[
          { key: "churn", label: "Churn Risk Users", icon: AlertTriangle },
          { key: "improving", label: "Improving Users", icon: TrendingUp },
          { key: "declining", label: "Declining Users", icon: TrendingDown },
          { key: "all", label: "All Users", icon: Users },
        ].map(({ key, label, icon: TabIcon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${tab === key ? "bg-teal-50 text-teal-700 border border-teal-200 shadow-sm" : "text-gray-400 bg-white border border-gray-200 hover:border-gray-300"}`}
            data-testid={`tab-${key}`}>
            <TabIcon className="h-3 w-3" /> {label}
          </button>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" data-testid="behavior-table">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["User", "Events (30d)", "This Week", "Last Week", "Activity Change", "Days Inactive", "Score Trend", "Churn Score", "Churn Risk"].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(tab === "churn" ? data.highChurnUsers :
                tab === "improving" ? data.improvingUsers :
                tab === "declining" ? data.decliningUsers :
                data.users || []
              ).map((u, i) => {
                const TrendIcon = trendIcons[u.scoreTrend] || Minus;
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-all" data-testid={`behavior-row-${i}`}>
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-800">{u.name || u.userId}</div>
                      <div className="text-[10px] text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 font-medium">{u.totalEvents30d}</td>
                    <td className="px-3 py-3 text-gray-600">{u.eventsThisWeek}</td>
                    <td className="px-3 py-3 text-gray-600">{u.eventsLastWeek}</td>
                    <td className="px-3 py-3">
                      <span className={`font-bold ${u.activityChange > 0 ? "text-emerald-600" : u.activityChange < 0 ? "text-rose-500" : "text-gray-400"}`}>
                        {u.activityChange > 0 ? "+" : ""}{u.activityChange}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{u.daysInactive != null ? `${u.daysInactive}d` : "—"}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1">
                        <TrendIcon className="h-3 w-3" style={{ color: trendColors[u.scoreTrend] }} />
                        <span className="text-[10px] font-semibold capitalize" style={{ color: trendColors[u.scoreTrend] }}>{u.scoreTrend}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${u.churnScore}%`, backgroundColor: churnColors[u.churnRisk] }} />
                        </div>
                        <span className="font-bold text-gray-700">{u.churnScore}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                        style={{ backgroundColor: `${churnColors[u.churnRisk]}10`, color: churnColors[u.churnRisk], borderColor: `${churnColors[u.churnRisk]}30` }}>
                        {u.churnRisk}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {((tab === "churn" && !data.highChurnUsers?.length) ||
          (tab === "improving" && !data.improvingUsers?.length) ||
          (tab === "declining" && !data.decliningUsers?.length) ||
          (tab === "all" && !data.users?.length)) && (
          <div className="text-center py-10 text-gray-400 text-xs" data-testid="no-behavior-data">
            <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            No users in this category
          </div>
        )}
      </div>
    </div>
  );
};

export default BehavioralInsights;

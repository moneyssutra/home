import React, { useState, useEffect, useMemo } from "react";
import adminApi from "@/utils/adminApi";
import { Activity, TrendingUp, TrendingDown, Users, UserPlus, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";


const PeriodToggle = ({ value, onChange }) => {
  const options = ["daily", "weekly", "monthly"];
  return (
    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5" data-testid="period-toggle">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${value === opt ? "bg-white text-teal-700 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
          data-testid={`period-${opt}`}
        >{opt}</button>
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, change, color = "teal" }) => {
  const isPositive = change >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
          <Icon className={`h-3.5 w-3.5 text-${color}-600`} />
        </div>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}>
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isPositive ? "+" : ""}{change}%
        </div>
      )}
    </div>
  );
};

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

const UserGrowth = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("daily");

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await adminApi.get(`/admin/user-growth?tz_offset=${tz}`);
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    if (period === "daily") return data.dailyRegistrations || [];
    if (period === "weekly") return data.weeklyRegistrations || [];
    return data.monthlyRegistrations || [];
  }, [data, period]);

  const cohortData = useMemo(() => data?.cohortRetention || [], [data]);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  return (
    <div data-testid="user-growth-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wide text-gray-900">User Growth Analytics</h1>
          <p className="text-xs text-gray-400 mt-1">Registration trends and cohort retention</p>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Users} label="Total Users" value={data.totalUsers || 0} />
        <StatCard icon={UserPlus} label="New Today" value={data.newToday || 0} change={data.dailyGrowthPct} color="emerald" />
        <StatCard icon={Calendar} label="New This Week" value={data.newThisWeek || 0} change={data.weeklyGrowthPct} color="blue" />
        <StatCard icon={Calendar} label="New This Month" value={data.newThisMonth || 0} change={data.monthlyGrowthPct} color="violet" />
      </div>

      {/* Registration Graph */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8" data-testid="registration-chart">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Registration Trend — {period.charAt(0).toUpperCase() + period.slice(1)}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#0D9488" strokeWidth={2} fill="url(#regGrad)" name="New Users" dot={{ r: 3, fill: "#0D9488" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Rate Bar Chart */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8" data-testid="growth-rate-chart">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Growth Rate %</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="growthPct" fill="#7C3AED" radius={[6, 6, 0, 0]} name="Growth %" barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cohort Retention Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="cohort-retention">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Cohort Retention</h3>
        <p className="text-[10px] text-gray-400 mb-3">% of users still active after N days since registration</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="cohort-table">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Cohort</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Users</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Day 1</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Day 7</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Day 30</th>
              </tr>
            </thead>
            <tbody>
              {cohortData.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Not enough data for cohort analysis</td></tr>
              ) : cohortData.map((c, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                  <td className="px-4 py-3 font-semibold text-gray-700">{c.cohort}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{c.users}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold" style={retentionStyle(c.day1)}>{c.day1}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold" style={retentionStyle(c.day7)}>{c.day7}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold" style={retentionStyle(c.day30)}>{c.day30}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function retentionStyle(pct) {
  if (pct >= 60) return { backgroundColor: "#ECFDF5", color: "#059669" };
  if (pct >= 30) return { backgroundColor: "#FFF7ED", color: "#D97706" };
  return { backgroundColor: "#FFF1F2", color: "#E11D48" };
}

export default UserGrowth;

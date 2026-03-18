import React, { useState, useEffect } from "react";
import adminApi from "@/utils/adminApi";
import { Activity, Clock, Zap, Calendar, Sun } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDuration(sec) {
  if (!sec || sec === 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const StatCard = ({ icon: Icon, label, value, subtitle, color = "teal" }) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid={`engagement-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-7 h-7 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-3.5 w-3.5 text-${color}-600`} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-2xl font-black text-gray-900">{value}</div>
    {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
  </div>
);

const HeatmapCell = ({ value, max }) => {
  const intensity = max > 0 ? value / max : 0;
  const bg = intensity > 0.7 ? "#0D9488" : intensity > 0.4 ? "#5EEAD4" : intensity > 0.1 ? "#CCFBF1" : "#F8FAFC";
  const text = intensity > 0.4 ? "white" : "#94A3B8";
  return (
    <td className="p-0">
      <div className="w-full h-8 flex items-center justify-center text-[9px] font-bold transition-all"
        style={{ backgroundColor: bg, color: text }}>
        {value > 0 ? value : ""}
      </div>
    </td>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl px-3 py-2 shadow-lg border border-gray-100 text-xs">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-500"><span className="font-semibold" style={{ color: p.color }}>{p.name}:</span> {formatDuration(p.value)}</p>
      ))}
    </div>
  );
};

const EngagementAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await adminApi.get(`/admin/engagement?tz_offset=${tz}`);
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const heatmap = data.heatmap || Array.from({ length: 7 }, () => Array(24).fill(0));
  const maxHeat = Math.max(...heatmap.flat(), 1);
  const noData = data.totalEvents30d === 0;

  return (
    <div data-testid="engagement-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">Engagement Intelligence</h1>
        <p className="text-xs text-gray-400 mt-1">Session analytics, activity patterns, and peak hours</p>
      </div>

      {/* Session Duration Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard icon={Clock} color="teal" label="Avg Session Today" value={formatDuration(data.avgSessionToday)} />
        <StatCard icon={Clock} color="blue" label="Avg Session (7d)" value={formatDuration(data.avgSession7d)} />
        <StatCard icon={Clock} color="violet" label="Avg Session (30d)" value={formatDuration(data.avgSession30d)} />
        <StatCard icon={Zap} color="emerald" label="Total Sessions (30d)" value={data.totalSessions30d} />
      </div>

      {noData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-center">
          <p className="text-sm font-semibold text-amber-700">Event tracking just enabled</p>
          <p className="text-xs text-amber-500 mt-1">Analytics data will populate as users interact with the app. Check back in a few hours.</p>
        </div>
      )}

      {/* Peak Hours */}
      {data.peakHours?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Peak Activity Hours</h3>
          <div className="flex gap-2">
            {data.peakHours.map((h, i) => (
              <span key={i} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">
                <Sun className="inline h-3 w-3 mr-1" />{h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Time-of-Day Activity Heatmap */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-8 overflow-x-auto" data-testid="activity-heatmap">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Time-of-Day Activity Heatmap</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[9px] text-gray-400 p-1 w-10"></th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="text-[9px] text-gray-400 p-0 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.map((row, dow) => (
              <tr key={dow}>
                <td className="text-[10px] font-semibold text-gray-500 pr-2 py-0">{dayLabels[dow]}</td>
                {row.map((val, h) => <HeatmapCell key={h} value={val} max={maxHeat} />)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[9px] text-gray-400">Less</span>
          {[0, 0.2, 0.5, 0.8].map((i, idx) => (
            <div key={idx} className="w-4 h-3 rounded-sm" style={{ backgroundColor: i === 0 ? "#F8FAFC" : i < 0.4 ? "#CCFBF1" : i < 0.7 ? "#5EEAD4" : "#0D9488" }} />
          ))}
          <span className="text-[9px] text-gray-400">More</span>
        </div>
      </div>

      {/* Day-of-Week Engagement */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="dow-chart">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Day-of-Week Engagement</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.dayOfWeekChart || []} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => formatDuration(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgDuration" fill="#0D9488" radius={[8, 8, 0, 0]} barSize={36} name="Avg Duration" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EngagementAnalytics;

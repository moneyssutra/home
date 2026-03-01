import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Users, Activity, Shield, TrendingUp, Zap, AlertTriangle, Heart, Clock, UserPlus, CalendarDays, BarChart3, ArrowUpRight } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));

const colorMap = {
  teal: { bg: "bg-teal-50", border: "border-teal-100", icon: "text-teal-600", accent: "#0D9488" },
  blue: { bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600", accent: "#2563EB" },
  amber: { bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600", accent: "#D97706" },
  violet: { bg: "bg-violet-50", border: "border-violet-100", icon: "text-violet-600", accent: "#7C3AED" },
  rose: { bg: "bg-rose-50", border: "border-rose-100", icon: "text-rose-600", accent: "#E11D48" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600", accent: "#059669" },
  sky: { bg: "bg-sky-50", border: "border-sky-100", icon: "text-sky-600", accent: "#0284C7" },
  orange: { bg: "bg-orange-50", border: "border-orange-100", icon: "text-orange-600", accent: "#EA580C" },
};

const KPICard = ({ icon: Icon, color, label, value, subtitle, delay = 0, to, onClick }) => {
  const [vis, setVis] = useState(false);
  const c = colorMap[color] || colorMap.teal;
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={`bg-white rounded-2xl p-3 sm:p-5 border border-gray-100 shadow-sm transition-all duration-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5 group`}
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease" }}
      onClick={onClick}
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-3">
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${c.bg} ${c.border} border flex items-center justify-center`}>
          <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <span className="text-[9px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex-1 leading-tight">{label}</span>
        {to && <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-300 group-hover:text-teal-500 transition-colors" />}
      </div>
      <div className="text-lg sm:text-2xl font-black text-gray-900">{value}</div>
      {subtitle && <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">{subtitle}</div>}
    </div>
  );
};

const PFSIRing = ({ value }) => {
  const radius = 54, circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "#059669" : value >= 40 ? "#D97706" : "#E11D48";
  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{value}</span>
        <span className="text-[10px] font-semibold text-gray-400 tracking-widest">PFSI</span>
      </div>
    </div>
  );
};

const RiskBar = ({ label, count, total, color, threshold }) => {
  const pct = total > 0 ? (count / total * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-semibold text-gray-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-gray-800 w-8 text-right">{count}</span>
      <span className="text-[10px] text-gray-400 w-16 text-right">{threshold}</span>
    </div>
  );
};

const CommandCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const [ccRes, growthRes] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/command-center?tz_offset=${tz}`, { withCredentials: true }),
          axios.get(`${backendUrl}/api/admin/user-growth?tz_offset=${tz}`, { withCredentials: true }).catch(() => ({ data: {} })),
        ]);
        setData({ ...ccRes.data, growth: growthRes.data });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const risk = data.riskDistribution || {};
  const totalRisk = Object.values(risk).reduce((a, b) => a + b, 0) || 1;
  const g = data.growth || {};

  return (
    <div data-testid="command-center-page">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-base sm:text-lg font-black tracking-wide text-gray-900">Executive Overview</h1>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Platform performance at a glance</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-8">
        <KPICard icon={Users} color="teal" label="Total Users" value={data.totalUsers} subtitle={`${data.active7d} active (7d)`} delay={0} to="/admin/users" onClick={() => navigate("/admin/users")} />
        <KPICard icon={Activity} color="blue" label="Active (DAU)" value={g.dauCount || 0} subtitle="Today" delay={60} to="/admin/engagement" onClick={() => navigate("/admin/engagement")} />
        <KPICard icon={BarChart3} color="sky" label="WAU" value={g.wauCount || data.active7d} subtitle="This week" delay={120} to="/admin/engagement" onClick={() => navigate("/admin/engagement")} />
        <KPICard icon={Activity} color="emerald" label="MAU" value={g.mauCount || data.active30d} subtitle="This month" delay={180} to="/admin/engagement" onClick={() => navigate("/admin/engagement")} />
        <KPICard icon={UserPlus} color="violet" label="New Today" value={g.newToday || 0} delay={240} to="/admin/growth" onClick={() => navigate("/admin/growth")} />
        <KPICard icon={CalendarDays} color="orange" label="New This Week" value={g.newThisWeek || 0} delay={300} to="/admin/growth" onClick={() => navigate("/admin/growth")} />
        <KPICard icon={CalendarDays} color="rose" label="New This Month" value={g.newThisMonth || 0} delay={360} to="/admin/growth" onClick={() => navigate("/admin/growth")} />
        <KPICard icon={Shield} color="amber" label="Avg Safety Days" value={`${data.avgSafetyDays}d`} subtitle={`${data.pctLowSafety}% below 30d`} delay={420} to="/admin/segmentation" onClick={() => navigate("/admin/segmentation")} />
      </div>

      {/* Second row: Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-8">
        <KPICard icon={TrendingUp} color="violet" label="Avg Wealth %" value={`${data.avgWealthPct}%`} delay={480} to="/admin/segmentation" onClick={() => navigate("/admin/segmentation")} />
        <KPICard icon={Heart} color="rose" label="Avg Health Score" value={data.avgHealthScore} delay={540} to="/admin/segmentation" onClick={() => navigate("/admin/segmentation")} />
        <KPICard icon={AlertTriangle} color="orange" label="Critical Risk" value={risk.critical || 0} subtitle="Users < 15 safety days" delay={600} to="/admin/risk" onClick={() => navigate("/admin/risk")} />
        <KPICard icon={Clock} color="sky" label="Avg Session" value={g.avgSessionDuration || "—"} subtitle="minutes" delay={660} to="/admin/engagement" onClick={() => navigate("/admin/engagement")} />
      </div>

      {/* PFSI + Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="pfsi-card">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Platform Financial Strength Index</h3>
          <PFSIRing value={data.pfsi} />
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center"><span className="text-[10px] text-gray-400">Safety</span><div className="text-sm font-bold text-teal-600">{data.avgSafetyDays}d</div></div>
            <div className="text-center"><span className="text-[10px] text-gray-400">Wealth</span><div className="text-sm font-bold text-violet-600">{data.avgWealthPct}%</div></div>
            <div className="text-center"><span className="text-[10px] text-gray-400">Health</span><div className="text-sm font-bold text-rose-500">{data.avgHealthScore}</div></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="risk-distribution-card">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Risk Distribution</h3>
          <RiskBar label="Critical" count={risk.critical || 0} total={totalRisk} color="#E11D48" threshold="<15 days" />
          <RiskBar label="High" count={risk.high || 0} total={totalRisk} color="#D97706" threshold="15-30d" />
          <RiskBar label="Moderate" count={risk.moderate || 0} total={totalRisk} color="#2563EB" threshold="30-60d" />
          <RiskBar label="Stable" count={risk.stable || 0} total={totalRisk} color="#059669" threshold="60+d" />
          <div className="mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Monetization Buckets</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(data.monetizationBuckets || {}).map(([k, v]) => (
                <span key={k} className="text-[10px] px-2 py-1 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-100">
                  {k}: {v}
                </span>
              ))}
              {Object.keys(data.monetizationBuckets || {}).length === 0 && <span className="text-[10px] text-gray-400">No eligible users</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;

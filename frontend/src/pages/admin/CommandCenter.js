import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Activity, Shield, TrendingUp, Zap, AlertTriangle, Heart } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));

const GlassCard = ({ icon: Icon, iconColor, label, value, subtitle, delay = 0 }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="rounded-2xl p-5 transition-all duration-500 cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(6,182,212,0.08)]"
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease",
        background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
      data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4" style={{ color: iconColor }} />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};

const PFSIRing = ({ value }) => {
  const radius = 54, circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? "#10B981" : value >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{value}</span>
        <span className="text-[10px] font-semibold text-gray-500 tracking-widest">PFSI</span>
      </div>
    </div>
  );
};

const RiskBar = ({ label, count, total, color, threshold }) => {
  const pct = total > 0 ? (count / total * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-semibold text-gray-400 w-20">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right">{count}</span>
      <span className="text-[10px] text-gray-600 w-16 text-right">{threshold}</span>
    </div>
  );
};

const CommandCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await axios.get(`${backendUrl}/api/admin/command-center?tz_offset=${tz}`, { withCredentials: true });
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-cyan-400 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Failed to load data</div>;

  const risk = data.riskDistribution || {};
  const totalRisk = Object.values(risk).reduce((a, b) => a + b, 0) || 1;

  return (
    <div data-testid="command-center-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-white">Financial Behavior Observatory</h1>
        <p className="text-xs text-gray-500 mt-1">Platform financial pulse — real-time metrics</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        <GlassCard icon={Users} iconColor="#06B6D4" label="Total Users" value={data.totalUsers} subtitle={`${data.active7d} active (7d)`} delay={0} />
        <GlassCard icon={Activity} iconColor="#10B981" label="Active (30d)" value={data.active30d} delay={80} />
        <GlassCard icon={Shield} iconColor="#F59E0B" label="Avg Safety Days" value={`${data.avgSafetyDays}d`} subtitle={`${data.pctLowSafety}% below 30d`} delay={160} />
        <GlassCard icon={TrendingUp} iconColor="#8B5CF6" label="Avg Wealth %" value={`${data.avgWealthPct}%`} delay={240} />
        <GlassCard icon={Heart} iconColor="#EC4899" label="Avg Health Score" value={data.avgHealthScore} delay={320} />
        <GlassCard icon={AlertTriangle} iconColor="#EF4444" label="Critical Risk" value={risk.critical || 0} subtitle="Users < 15 safety days" delay={400} />
      </div>

      {/* PFSI + Risk Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* PFSI */}
        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(6,182,212,0.04) 100%)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="pfsi-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Platform Financial Strength Index</h3>
          <PFSIRing value={data.pfsi} />
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center"><span className="text-[10px] text-gray-600">Safety</span><div className="text-sm font-bold text-cyan-400">{data.avgSafetyDays}d</div></div>
            <div className="text-center"><span className="text-[10px] text-gray-600">Wealth</span><div className="text-sm font-bold text-purple-400">{data.avgWealthPct}%</div></div>
            <div className="text-center"><span className="text-[10px] text-gray-600">Health</span><div className="text-sm font-bold text-pink-400">{data.avgHealthScore}</div></div>
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(239,68,68,0.03) 100%)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="risk-distribution-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Risk Distribution</h3>
          <RiskBar label="Critical" count={risk.critical || 0} total={totalRisk} color="#EF4444" threshold="<15 days" />
          <RiskBar label="High" count={risk.high || 0} total={totalRisk} color="#F59E0B" threshold="15-30d" />
          <RiskBar label="Moderate" count={risk.moderate || 0} total={totalRisk} color="#3B82F6" threshold="30-60d" />
          <RiskBar label="Stable" count={risk.stable || 0} total={totalRisk} color="#10B981" threshold="60+d" />
          <div className="mt-4 pt-3 border-t border-white/5">
            <span className="text-xs text-gray-500">Monetization Buckets</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(data.monetizationBuckets || {}).map(([k, v]) => (
                <span key={k} className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ backgroundColor: "rgba(6,182,212,0.1)", color: "#06B6D4" }}>
                  {k}: {v}
                </span>
              ))}
              {Object.keys(data.monetizationBuckets || {}).length === 0 && <span className="text-[10px] text-gray-600">No eligible users</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;

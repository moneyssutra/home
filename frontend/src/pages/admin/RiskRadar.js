import React, { useState, useEffect } from "react";
import axios from "axios";
import { ShieldAlert, Activity, TrendingDown, AlertTriangle, Wallet, Users } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const riskConfig = {
  critical: { color: "#EF4444", bg: "rgba(239,68,68,0.08)", label: "Critical", icon: AlertTriangle },
  high: { color: "#F59E0B", bg: "rgba(245,158,11,0.08)", label: "High Risk", icon: ShieldAlert },
  moderate: { color: "#3B82F6", bg: "rgba(59,130,246,0.08)", label: "Moderate", icon: Activity },
  stable: { color: "#10B981", bg: "rgba(16,185,129,0.08)", label: "Stable", icon: TrendingDown },
};

const driverIcons = {
  "Low Wealth Allocation (<15%)": Wallet,
  "High EMI Burden (>35%)": AlertTriangle,
  "High Lifestyle Drift (>40%)": TrendingDown,
  "Low Income Band (<25K)": Users,
};

const RiskBucketCard = ({ name, config: cfg, data, total, delay }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const Icon = cfg.icon;
  const pct = total > 0 ? Math.round(data.count / total * 100) : 0;
  return (
    <div className="rounded-2xl p-5 transition-all duration-500 hover:scale-[1.02]"
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease",
        backgroundColor: cfg.bg, border: `1px solid ${cfg.color}15` }}
      data-testid={`risk-bucket-${name}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{cfg.label}</span>
        </div>
        <span className="text-[10px] text-gray-600">{data.threshold}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-black" style={{ color: cfg.color }}>{data.count}</span>
        <span className="text-sm text-gray-500 mb-1">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
      </div>
    </div>
  );
};

const RiskRadar = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await axios.get(`${backendUrl}/api/admin/risk-radar?tz_offset=${tz}`, { withCredentials: true });
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-cyan-400 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-500">Failed to load data</div>;

  const total = data.totalUsers || 1;

  return (
    <div data-testid="risk-radar-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-white">Risk Intelligence</h1>
        <p className="text-xs text-gray-500 mt-1">User risk distribution and driving factors</p>
      </div>

      {/* Risk Buckets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {Object.entries(riskConfig).map(([key, cfg], i) => (
          <RiskBucketCard key={key} name={key} config={cfg} data={data.riskBuckets[key] || { count: 0, threshold: "" }} total={total} delay={i * 100} />
        ))}
      </div>

      {/* Risk Drivers */}
      <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(239,68,68,0.03) 100%)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="risk-drivers">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Risk Drivers</h3>
        {data.riskDrivers.length === 0 ? (
          <p className="text-xs text-gray-600">No significant risk drivers detected</p>
        ) : (
          <div className="space-y-3">
            {data.riskDrivers.map((d, i) => {
              const Icon = driverIcons[d.driver] || AlertTriangle;
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <Icon className="h-4 w-4 text-red-400 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-300">{d.driver}</div>
                    <div className="text-[10px] text-gray-600">{d.count} users ({d.pct}%)</div>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiskRadar;

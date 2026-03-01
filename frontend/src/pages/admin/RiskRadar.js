import React, { useState, useEffect } from "react";
import axios from "axios";
import { ShieldAlert, Activity, TrendingDown, AlertTriangle, Wallet, Users } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const riskConfig = {
  critical: { color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3", label: "Critical", icon: AlertTriangle },
  high: { color: "#D97706", bg: "#FFF7ED", border: "#FED7AA", label: "High Risk", icon: ShieldAlert },
  moderate: { color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", label: "Moderate", icon: Activity },
  stable: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Stable", icon: TrendingDown },
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
    <div className="rounded-2xl p-5 transition-all duration-500 hover:shadow-md hover:-translate-y-0.5"
      style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease",
        backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}
      data-testid={`risk-bucket-${name}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color: cfg.color }} />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cfg.label}</span>
        </div>
        <span className="text-[10px] text-gray-400">{data.threshold}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-black" style={{ color: cfg.color }}>{data.count}</span>
        <span className="text-sm text-gray-400 mb-1">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/50 overflow-hidden">
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

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const total = data.totalUsers || 1;

  return (
    <div data-testid="risk-radar-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">Risk Intelligence</h1>
        <p className="text-xs text-gray-400 mt-1">User risk distribution and driving factors</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {Object.entries(riskConfig).map(([key, cfg], i) => (
          <RiskBucketCard key={key} name={key} config={cfg} data={data.riskBuckets[key] || { count: 0, threshold: "" }} total={total} delay={i * 100} />
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="risk-drivers">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Risk Drivers</h3>
        {data.riskDrivers.length === 0 ? (
          <p className="text-xs text-gray-400">No significant risk drivers detected</p>
        ) : (
          <div className="space-y-3">
            {data.riskDrivers.map((d, i) => {
              const Icon = driverIcons[d.driver] || AlertTriangle;
              return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Icon className="h-4 w-4 text-rose-500 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-gray-700">{d.driver}</div>
                    <div className="text-[10px] text-gray-400">{d.count} users ({d.pct}%)</div>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-rose-500 transition-all duration-700" style={{ width: `${d.pct}%` }} />
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

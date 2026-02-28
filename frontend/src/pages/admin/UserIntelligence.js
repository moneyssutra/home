import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Activity, Search, X, TrendingUp, Shield, Wallet, Heart } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const riskColors = { critical: "#EF4444", high: "#F59E0B", moderate: "#3B82F6", stable: "#10B981" };
const bucketColors = { "Safety Boost": "#EF4444", "Wealth Optimization": "#8B5CF6", "Debt Optimization": "#F59E0B", "None": "#6B7280" };

const UserDrawer = ({ user, onClose }) => {
  if (!user) return null;
  const metrics = [
    { label: "Safety Days", value: `${user.safetyDays}d`, icon: Shield, color: riskColors[user.riskLevel] },
    { label: "Wealth %", value: `${user.wealthPct}%`, icon: TrendingUp, color: "#8B5CF6" },
    { label: "Lifestyle %", value: `${user.lifestylePct}%`, icon: Wallet, color: "#EC4899" },
    { label: "EMI %", value: `${user.emiPct}%`, icon: Activity, color: "#F59E0B" },
    { label: "Health Score", value: user.healthScore, icon: Heart, color: "#10B981" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="user-drawer">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#111827] border-l border-white/5 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">{user.userId}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${riskColors[user.riskLevel]}20`, color: riskColors[user.riskLevel] }}>
                {user.riskLevel.toUpperCase()}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5"><X className="h-4 w-4 text-gray-500" /></button>
          </div>
          <div className="space-y-3">
            {metrics.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                <span className="text-xs text-gray-500 flex-1">{label}</span>
                <span className="text-sm font-bold text-white">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Summary</div>
            <div className="text-xs text-gray-400 space-y-1">
              <div>Income Band: <span className="text-white font-semibold">{user.incomeBand}</span></div>
              <div>Essential: <span className="text-white font-semibold">{user.essentialPct}%</span></div>
              <div>Monetization: <span className="font-semibold" style={{ color: bucketColors[user.monetizationBucket] || "#6B7280" }}>{user.monetizationBucket}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UserIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

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

  const users = (data?.userMetrics || []).filter(u => {
    if (riskFilter !== "all" && u.riskLevel !== riskFilter) return false;
    if (search && !u.userId.toLowerCase().includes(search.toLowerCase()) && !u.incomeBand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-testid="user-intelligence-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-white">User Intelligence</h1>
        <p className="text-xs text-gray-500 mt-1">Behavioral patterns and monetization insights</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/5 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500/30"
            data-testid="user-search-input" />
        </div>
        <div className="flex gap-1">
          {["all", "critical", "high", "moderate", "stable"].map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${riskFilter === r ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20" : "text-gray-600 border border-white/5 hover:border-white/10"}`}
              data-testid={`filter-${r}`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="user-table">
            <thead>
              <tr className="border-b border-white/5" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                {["User ID", "Income", "Safety", "Wealth%", "Lifestyle%", "EMI%", "Health", "Risk", "Bucket"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} onClick={() => setSelectedUser(u)}
                  className="border-b border-white/[0.02] cursor-pointer hover:bg-white/[0.03] transition-all"
                  data-testid={`user-row-${i}`}
                >
                  <td className="px-4 py-3 font-mono text-gray-400">{u.userId}</td>
                  <td className="px-4 py-3 text-gray-300">{u.incomeBand}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: riskColors[u.riskLevel] }}>{u.safetyDays}d</td>
                  <td className="px-4 py-3 text-gray-300">{u.wealthPct}%</td>
                  <td className="px-4 py-3 text-gray-300">{u.lifestylePct}%</td>
                  <td className="px-4 py-3 text-gray-300">{u.emiPct}%</td>
                  <td className="px-4 py-3 font-bold text-gray-300">{u.healthScore}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${riskColors[u.riskLevel]}15`, color: riskColors[u.riskLevel] }}>
                      {u.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold" style={{ color: bucketColors[u.monetizationBucket] || "#6B7280" }}>{u.monetizationBucket}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="text-center py-10 text-gray-600 text-xs">No users match filters</div>}
      </div>

      {selectedUser && <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
};

export default UserIntelligence;

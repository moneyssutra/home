import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Activity, Search, X, TrendingUp, Shield, Wallet, Heart } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const riskColors = { critical: "#E11D48", high: "#D97706", moderate: "#2563EB", stable: "#059669" };
const bucketColors = { "Safety Boost": "#E11D48", "Wealth Optimization": "#7C3AED", "Debt Optimization": "#D97706", "None": "#94A3B8" };

const UserDrawer = ({ user, onClose }) => {
  if (!user) return null;
  const metrics = [
    { label: "Safety Days", value: `${user.safetyDays}d`, icon: Shield, color: riskColors[user.riskLevel] },
    { label: "Wealth %", value: `${user.wealthPct}%`, icon: TrendingUp, color: "#7C3AED" },
    { label: "Lifestyle %", value: `${user.lifestylePct}%`, icon: Wallet, color: "#E11D48" },
    { label: "EMI %", value: `${user.emiPct}%`, icon: Activity, color: "#D97706" },
    { label: "Health Score", value: user.healthScore, icon: Heart, color: "#059669" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="user-drawer">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white border-l border-gray-200 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">{user.userId}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${riskColors[user.riskLevel]}10`, color: riskColors[user.riskLevel] }}>
                {user.riskLevel.toUpperCase()}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <div className="space-y-3">
            {metrics.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                <span className="text-xs text-gray-500 flex-1">{label}</span>
                <span className="text-sm font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2">Summary</div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Income Band: <span className="text-gray-900 font-semibold">{user.incomeBand}</span></div>
              <div>Essential: <span className="text-gray-900 font-semibold">{user.essentialPct}%</span></div>
              <div>Monetization: <span className="font-semibold" style={{ color: bucketColors[user.monetizationBucket] || "#94A3B8" }}>{user.monetizationBucket}</span></div>
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

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;

  const users = (data?.userMetrics || []).filter(u => {
    if (riskFilter !== "all" && u.riskLevel !== riskFilter) return false;
    if (search && !u.userId.toLowerCase().includes(search.toLowerCase()) && !u.incomeBand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-testid="user-intelligence-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">User Intelligence</h1>
        <p className="text-xs text-gray-400 mt-1">Behavioral patterns and monetization insights</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
            data-testid="user-search-input" />
        </div>
        <div className="flex gap-1">
          {["all", "critical", "high", "moderate", "stable"].map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${riskFilter === r ? "bg-teal-50 text-teal-700 border border-teal-200 shadow-sm" : "text-gray-400 bg-white border border-gray-200 hover:border-gray-300"}`}
              data-testid={`filter-${r}`}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs" data-testid="user-table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["User ID", "Income", "Safety", "Wealth%", "Lifestyle%", "EMI%", "Health", "Risk", "Bucket"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={i} onClick={() => setSelectedUser(u)}
                  className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all"
                  data-testid={`user-row-${i}`}
                >
                  <td className="px-4 py-3 font-mono text-gray-500">{u.userId}</td>
                  <td className="px-4 py-3 text-gray-700">{u.incomeBand}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: riskColors[u.riskLevel] }}>{u.safetyDays}d</td>
                  <td className="px-4 py-3 text-gray-700">{u.wealthPct}%</td>
                  <td className="px-4 py-3 text-gray-700">{u.lifestylePct}%</td>
                  <td className="px-4 py-3 text-gray-700">{u.emiPct}%</td>
                  <td className="px-4 py-3 font-bold text-gray-700">{u.healthScore}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${riskColors[u.riskLevel]}10`, color: riskColors[u.riskLevel] }}>
                      {u.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-semibold" style={{ color: bucketColors[u.monetizationBucket] || "#94A3B8" }}>{u.monetizationBucket}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="text-center py-10 text-gray-400 text-xs">No users match filters</div>}
      </div>

      {selectedUser && <UserDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  );
};

export default UserIntelligence;

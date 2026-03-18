import React, { useState, useEffect } from "react";
import adminApi from "@/utils/adminApi";
import { Activity, BarChart3, Layers, ArrowDown } from "lucide-react";


function formatDuration(sec) {
  if (!sec || sec === 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

const repeatColors = { High: "#059669", Medium: "#D97706", Low: "#94A3B8" };
const repeatBg = { High: "#ECFDF5", Medium: "#FFF7ED", Low: "#F8FAFC" };

const FunnelBar = ({ stage, users, pct, maxPct, index }) => {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), index * 100); return () => clearTimeout(t); }, [index]);
  const width = maxPct > 0 ? (pct / maxPct * 100) : 0;
  return (
    <div className="flex items-center gap-3" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-20px)", transition: "all 0.5s ease" }}>
      <span className="text-xs font-semibold text-gray-600 w-20 text-right">{stage}</span>
      <div className="flex-1 h-9 rounded-xl bg-gray-50 overflow-hidden relative">
        <div className="h-full rounded-xl transition-all duration-700 flex items-center px-3"
          style={{ width: `${Math.max(width, 5)}%`, background: `linear-gradient(90deg, #0D9488 0%, #5EEAD4 100%)` }}>
          <span className="text-[10px] font-bold text-white whitespace-nowrap">{users} users</span>
        </div>
      </div>
      <span className="text-xs font-bold text-gray-500 w-12 text-right">{pct}%</span>
      {index > 0 && (
        <div className="w-16 text-center">
          <ArrowDown className="h-3 w-3 mx-auto text-gray-300" />
        </div>
      )}
    </div>
  );
};

const FeatureUsage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await adminApi.get(`/admin/feature-usage?tz_offset=${tz}`);
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const pageTable = data.pageTable || [];
  const funnel = data.funnel || [];
  const maxFunnelPct = Math.max(...funnel.map(f => f.pct), 1);
  const noData = pageTable.length === 0 && funnel.every(f => f.users === 0);

  return (
    <div data-testid="feature-usage-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">Feature Usage</h1>
        <p className="text-xs text-gray-400 mt-1">Page-level analytics and activity funnel</p>
      </div>

      {noData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8 text-center">
          <p className="text-sm font-semibold text-amber-700">Collecting usage data</p>
          <p className="text-xs text-amber-500 mt-1">Event tracking is now active. Data will appear as users navigate the app.</p>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-teal-600" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pages Tracked</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{pageTable.length}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Sessions</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{data.totalSessions}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-violet-600" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tracked Users</span>
          </div>
          <div className="text-2xl font-black text-gray-900">{data.totalTrackedUsers}</div>
        </div>
      </div>

      {/* Page Usage Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm mb-8" data-testid="page-usage-table">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Page-wise Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {["Page", "Avg Time", "% Users Visited", "Total Visits", "Repeat Visits"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageTable.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No page data yet — tracking has just started</td></tr>
              ) : pageTable.map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all">
                  <td className="px-5 py-3 font-semibold text-gray-700">{p.page}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDuration(p.avgTimeSec)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.min(p.pctUsersVisited, 100)}%` }} />
                      </div>
                      <span className="text-gray-500">{p.pctUsersVisited}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700 font-bold">{p.totalVisits}</td>
                  <td className="px-5 py-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: repeatBg[p.repeatVisits], color: repeatColors[p.repeatVisits] }}>
                      {p.repeatVisits}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Funnel */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm" data-testid="activity-funnel">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Activity Funnel</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <FunnelBar key={f.stage} stage={f.stage} users={f.users} pct={f.pct} maxPct={maxFunnelPct} index={i} />
          ))}
          {funnel.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No funnel data yet</p>}
        </div>
      </div>
    </div>
  );
};

export default FeatureUsage;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, Search, HelpCircle, TrendingUp, MessageCircle, Users, Hash } from "lucide-react";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ icon: Icon, label, value, color = "teal" }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm" data-testid={`support-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-6 h-6 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-3 w-3 text-${color}-600`} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-black text-gray-900">{value}</div>
  </div>
);

const SupportIntelligence = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await axios.get(`${backendUrl}/api/admin/support-intelligence?tz_offset=${tz}`, { withCredentials: true });
        setData(res.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;
  if (!data) return <div className="text-center py-20 text-gray-400">Failed to load data</div>;

  const hasSearchData = data.topSearches?.length > 0;

  return (
    <div data-testid="support-intelligence-page">
      <div className="mb-6">
        <h1 className="text-lg font-black tracking-wide text-gray-900">User Support Intelligence</h1>
        <p className="text-xs text-gray-400 mt-1">FAQ searches, help queries, and support patterns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Search} color="teal" label="Total Searches" value={data.totalSearches || 0} />
        <StatCard icon={Users} color="blue" label="Unique Searchers" value={data.uniqueSearchers || 0} />
        <StatCard icon={Hash} color="violet" label="Unique Terms" value={data.totalSearchTerms || 0} />
        <StatCard icon={MessageCircle} color="emerald" label="Searches (7d)" value={data.searchEvents7d || 0} />
      </div>

      {!hasSearchData && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 text-center" data-testid="no-search-data">
          <HelpCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-amber-700">No search data yet</p>
          <p className="text-xs text-amber-500 mt-1">Search analytics will populate as users use the in-app search and FAQ features. Integrate the trackEvent call with search event type in search inputs to start tracking.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Search Terms */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="top-searches-table">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> Top Search Terms
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Term</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Count</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Users</th>
                  <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Trend</th>
                </tr>
              </thead>
              <tbody>
                {(data.topSearches || []).map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-all" data-testid={`search-row-${i}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{s.term}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{s.count}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{s.uniqueUsers}</td>
                    <td className="px-4 py-2.5 text-center">
                      {s.trending ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <TrendingUp className="inline h-2.5 w-2.5 mr-0.5" />Rising
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Stable</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data.topSearches || data.topSearches.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No search terms recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Pages */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" data-testid="faq-pages-table">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5" /> Most Visited Help Pages
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Page</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Visits</th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Users</th>
                </tr>
              </thead>
              <tbody>
                {(data.topFaqPages || []).map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-all" data-testid={`faq-row-${i}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.page}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{p.visits}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{p.uniqueUsers}</td>
                  </tr>
                ))}
                {(!data.topFaqPages || data.topFaqPages.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No FAQ page views recorded yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportIntelligence;

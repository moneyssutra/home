import React, { useState, useEffect, useCallback } from "react";
import adminApi from "@/utils/adminApi";
import {
  Activity, Filter, Users, Shield, Heart, TrendingUp, ChevronDown, ChevronUp,
  Download, Search, X, DollarSign, MapPin, Briefcase, Calendar
} from "lucide-react";

const fmt = (n) => new Intl.NumberFormat("en-IN").format(Math.round(n));
const riskColors = { critical: "#E11D48", high: "#D97706", moderate: "#2563EB", stable: "#059669" };

const StatCard = ({ icon: Icon, label, value, color = "teal" }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm" data-testid={`seg-stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-6 h-6 rounded-lg bg-${color}-50 border border-${color}-100 flex items-center justify-center`}>
        <Icon className={`h-3 w-3 text-${color}-600`} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="text-xl font-black text-gray-900">{value}</div>
  </div>
);

const RangeSlider = ({ label, min, max, value, onChange, step = 1, format }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-bold text-teal-600">
        {format ? format(value[0]) : value[0]} – {format ? format(value[1]) : value[1]}
      </span>
    </div>
    <div className="flex gap-2 items-center">
      <input type="range" min={min} max={max} step={step} value={value[0]}
        onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
        className="flex-1 h-1 accent-teal-600" />
      <input type="range" min={min} max={max} step={step} value={value[1]}
        onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
        className="flex-1 h-1 accent-teal-600" />
    </div>
  </div>
);

const SelectFilter = ({ label, value, options, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
      data-testid={`filter-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <option value="">{placeholder || "All"}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SegmentationLab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);

  // Filter state
  const [ageRange, setAgeRange] = useState([0, 100]);
  const [gender, setGender] = useState("");
  const [city, setCity] = useState("");
  const [occupation, setOccupation] = useState("");
  const [incomeRange, setIncomeRange] = useState([0, 10000000]);
  const [safetyRange, setSafetyRange] = useState([0, 365]);
  const [riskLevel, setRiskLevel] = useState("");
  const [healthRange, setHealthRange] = useState([0, 100]);
  const [wealthRange, setWealthRange] = useState([0, 100]);
  const [emiMax, setEmiMax] = useState(100);
  const [bucket, setBucket] = useState("");

  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState({ cities: [], occupations: [], genders: [] });

  const fetchData = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const tz = new Date().getTimezoneOffset();
      const params = new URLSearchParams({
        tz_offset: tz,
        page: p,
        page_size: 20,
        age_min: ageRange[0],
        age_max: ageRange[1],
        income_min: incomeRange[0],
        income_max: incomeRange[1],
        safety_min: safetyRange[0],
        safety_max: safetyRange[1],
        health_min: healthRange[0],
        health_max: healthRange[1],
        wealth_min: wealthRange[0],
        wealth_max: wealthRange[1],
        emi_max: emiMax,
      });
      if (gender) params.set("gender", gender);
      if (city) params.set("city", city);
      if (occupation) params.set("occupation", occupation);
      if (riskLevel) params.set("risk_level", riskLevel);
      if (bucket) params.set("bucket", bucket);

      const res = await adminApi.get(`/admin/segmentation?${params}`);
      setData(res.data);
      if (res.data.filterOptions) setFilterOptions(res.data.filterOptions);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [ageRange, gender, city, occupation, incomeRange, safetyRange, riskLevel, healthRange, wealthRange, emiMax, bucket]);

  useEffect(() => { fetchData(1); setPage(1); }, [fetchData]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const resetFilters = () => {
    setAgeRange([0, 100]);
    setGender("");
    setCity("");
    setOccupation("");
    setIncomeRange([0, 10000000]);
    setSafetyRange([0, 365]);
    setRiskLevel("");
    setHealthRange([0, 100]);
    setWealthRange([0, 100]);
    setEmiMax(100);
    setBucket("");
  };

  const exportCSV = () => {
    if (!data?.users?.length) return;
    const headers = ["Name", "Email", "Age", "Gender", "City", "Occupation", "Annual Income", "Safety Days", "Wealth%", "Lifestyle%", "EMI%", "Health Score", "Risk", "Income Band", "Bucket"];
    const rows = data.users.map(u => [
      u.name, u.email, u.age ?? "", u.gender, u.city, u.occupation, u.annualIncome,
      u.safetyDays, u.wealthPct, u.lifestylePct, u.emiPct, u.healthScore, u.riskLevel, u.incomeBand, u.monetizationBucket
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segmentation-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary || {};
  const users = data?.users || [];
  const activeFilters = [gender, city, occupation, riskLevel, bucket].filter(Boolean).length +
    (ageRange[0] > 0 || ageRange[1] < 100 ? 1 : 0) +
    (incomeRange[0] > 0 || incomeRange[1] < 10000000 ? 1 : 0) +
    (safetyRange[0] > 0 || safetyRange[1] < 365 ? 1 : 0) +
    (healthRange[0] > 0 || healthRange[1] < 100 ? 1 : 0) +
    (wealthRange[0] > 0 || wealthRange[1] < 100 ? 1 : 0) +
    (emiMax < 100 ? 1 : 0);

  return (
    <div data-testid="segmentation-lab-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wide text-gray-900">User Segmentation Lab</h1>
          <p className="text-xs text-gray-400 mt-1">Filter, analyze, and export user segments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={!users.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="export-csv-btn">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 overflow-hidden" data-testid="filter-panel">
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-all"
          data-testid="toggle-filters-btn">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-teal-600" />
            <span className="text-xs font-bold text-gray-700">Filters</span>
            {activeFilters > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-100">
                {activeFilters} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4">
            {activeFilters > 0 && (
              <div className="flex justify-end mb-3">
                <button onClick={resetFilters}
                  className="text-[10px] text-gray-400 hover:text-gray-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 transition-all"
                  data-testid="reset-filters-btn">
                  <X className="h-3 w-3" /> Reset All Filters
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              {/* Demographics */}
              <RangeSlider label="Age" min={0} max={100} value={ageRange} onChange={setAgeRange} />
              <SelectFilter label="Gender" value={gender} options={filterOptions.genders} onChange={setGender} placeholder="All Genders" />
              <SelectFilter label="City" value={city} options={filterOptions.cities} onChange={setCity} placeholder="All Cities" />
              <SelectFilter label="Occupation" value={occupation} options={filterOptions.occupations} onChange={setOccupation} placeholder="All Occupations" />
              <RangeSlider label="Annual Income" min={0} max={10000000} step={100000} value={incomeRange} onChange={setIncomeRange} format={(v) => `${fmt(v)}`} />

              {/* Financial Metrics */}
              <RangeSlider label="Safety Days" min={0} max={365} value={safetyRange} onChange={setSafetyRange} format={(v) => `${v}d`} />
              <SelectFilter label="Risk Level" value={riskLevel} options={["critical", "high", "moderate", "stable"]} onChange={setRiskLevel} placeholder="All Risk Levels" />
              <RangeSlider label="Health Score" min={0} max={100} value={healthRange} onChange={setHealthRange} />
              <RangeSlider label="Wealth %" min={0} max={100} value={wealthRange} onChange={setWealthRange} format={(v) => `${v}%`} />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Max EMI %</span>
                  <span className="text-[10px] font-bold text-teal-600">{emiMax}%</span>
                </div>
                <input type="range" min={0} max={100} value={emiMax} onChange={(e) => setEmiMax(Number(e.target.value))}
                  className="w-full h-1 accent-teal-600" />
              </div>
              <SelectFilter label="Monetization Bucket" value={bucket}
                options={["Safety Boost", "Wealth Optimization", "Debt Optimization", "None"]}
                onChange={setBucket} placeholder="All Buckets" />
            </div>
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Activity className="h-6 w-6 text-teal-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <StatCard icon={Users} color="teal" label="Matched Users" value={`${data?.filteredCount || 0} / ${data?.totalUsers || 0}`} />
            <StatCard icon={Shield} color="amber" label="Avg Safety" value={`${summary.avgSafetyDays || 0}d`} />
            <StatCard icon={Heart} color="rose" label="Avg Health" value={summary.avgHealthScore || 0} />
            <StatCard icon={TrendingUp} color="violet" label="Avg Wealth" value={`${summary.avgWealthPct || 0}%`} />
            <StatCard icon={DollarSign} color="emerald" label="Avg Income" value={fmt(summary.avgAnnualIncome || 0)} />
            <StatCard icon={Calendar} color="blue" label="Avg Age" value={summary.avgAge || "—"} />
          </div>

          {/* Distribution Pills */}
          {(Object.keys(summary.riskDistribution || {}).length > 0 || Object.keys(summary.genderDistribution || {}).length > 0) && (
            <div className="flex flex-wrap gap-4 mb-6">
              {Object.keys(summary.riskDistribution || {}).length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-1 min-w-[200px]">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Risk Breakdown</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(summary.riskDistribution).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-1 rounded-full font-bold border"
                        style={{ backgroundColor: `${riskColors[k]}10`, color: riskColors[k], borderColor: `${riskColors[k]}30` }}>
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Object.keys(summary.cityDistribution || {}).length > 0 && (
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex-1 min-w-[200px]">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">City Breakdown</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Object.entries(summary.cityDistribution).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        <MapPin className="inline h-2.5 w-2.5 mr-0.5" />{k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Table */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm" data-testid="segmentation-table">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Name", "Age", "City", "Occupation", "Income", "Safety", "Wealth%", "EMI%", "Health", "Risk", "Bucket"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-all" data-testid={`seg-user-row-${i}`}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-800">{u.name || u.userId}</div>
                        <div className="text-[10px] text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600">{u.age ?? "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{u.city || "—"}</td>
                      <td className="px-3 py-3 text-gray-600">{u.occupation || "—"}</td>
                      <td className="px-3 py-3 text-gray-700 font-medium">{fmt(u.annualIncome)}</td>
                      <td className="px-3 py-3 font-bold" style={{ color: riskColors[u.riskLevel] }}>{u.safetyDays}d</td>
                      <td className="px-3 py-3 text-gray-700">{u.wealthPct}%</td>
                      <td className="px-3 py-3 text-gray-700">{u.emiPct}%</td>
                      <td className="px-3 py-3 font-bold text-gray-700">{u.healthScore}</td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ backgroundColor: `${riskColors[u.riskLevel]}10`, color: riskColors[u.riskLevel] }}>
                          {u.riskLevel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[10px] font-semibold text-gray-500">{u.monetizationBucket}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length === 0 && !loading && (
              <div className="text-center py-12 text-gray-400 text-xs" data-testid="no-results">
                <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                No users match the current filters
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100" data-testid="pagination">
                <span className="text-[10px] text-gray-400">
                  Page {page} of {data.totalPages} ({data.filteredCount} users)
                </span>
                <div className="flex gap-1">
                  <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    data-testid="prev-page-btn">
                    Prev
                  </button>
                  {Array.from({ length: Math.min(data.totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button key={pageNum} onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${page === pageNum ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100"}`}
                        data-testid={`page-btn-${pageNum}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => handlePageChange(page + 1)} disabled={page >= data.totalPages}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    data-testid="next-page-btn">
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default SegmentationLab;

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Rocket, BarChart3, Eye, MousePointerClick, XCircle, CheckCircle, ChevronDown, ChevronUp, Power, PowerOff } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_COLORS = {
  Safety: "#059669", Growth: "#3B82F6", Debt: "#F59E0B", Protection: "#8B5CF6",
};

export default function MonetizationEngine() {
  const [opportunities, setOpportunities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const [expandedRules, setExpandedRules] = useState(null);

  const [form, setForm] = useState({
    title: "", description: "", cta_text: "Learn More", category: "Growth",
    priority: 3, type: "system", destination_url: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    active: true, eligibility_json: {}, target_filter_json: {},
  });

  // Rule builder state
  const [ruleKey, setRuleKey] = useState("days_of_safety");
  const [ruleOp, setRuleOp] = useState("lt");
  const [ruleVal, setRuleVal] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [oppRes, statsRes] = await Promise.all([
        axios.get(`${backendUrl}/api/opportunities/admin/list`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/opportunities/admin/stats`, { withCredentials: true }),
      ]);
      setOpportunities(oppRes.data.opportunities || []);
      setStats(statsRes.data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({
      title: "", description: "", cta_text: "Learn More", category: "Growth",
      priority: 3, type: "system", destination_url: "",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      active: true, eligibility_json: {}, target_filter_json: {},
    });
    setEditingOpp(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    };

    try {
      if (editingOpp) {
        await axios.put(`${backendUrl}/api/opportunities/admin/${editingOpp}`, payload, { withCredentials: true });
      } else {
        await axios.post(`${backendUrl}/api/opportunities/admin/create`, payload, { withCredentials: true });
      }
      resetForm();
      fetchData();
    } catch { /* silent */ }
  };

  const handleEdit = (opp) => {
    setForm({
      title: opp.title, description: opp.description, cta_text: opp.cta_text,
      category: opp.category, priority: opp.priority, type: opp.type,
      destination_url: opp.destination_url || "",
      start_date: (opp.start_date || "").slice(0, 10),
      end_date: (opp.end_date || "").slice(0, 10),
      active: opp.active,
      eligibility_json: opp.eligibility_json || {},
      target_filter_json: opp.target_filter_json || {},
    });
    setEditingOpp(opp.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${backendUrl}/api/opportunities/admin/${id}`, { withCredentials: true });
      fetchData();
    } catch { /* silent */ }
  };

  const handleToggleActive = async (opp) => {
    try {
      await axios.put(`${backendUrl}/api/opportunities/admin/${opp.id}`, { active: !opp.active }, { withCredentials: true });
      fetchData();
    } catch { /* silent */ }
  };

  const addRule = () => {
    if (!ruleVal) return;
    const rules = { ...form.eligibility_json };
    rules[ruleKey] = { op: ruleOp, value: parseFloat(ruleVal) || ruleVal };
    setForm({ ...form, eligibility_json: rules });
    setRuleVal("");
  };

  const removeRule = (key) => {
    const rules = { ...form.eligibility_json };
    delete rules[key];
    setForm({ ...form, eligibility_json: rules });
  };

  const totals = stats?.totals || {};

  return (
    <div data-testid="monetization-engine">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Monetization Engine</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage smart opportunities & campaigns</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all" data-testid="create-opp-btn">
          <Plus className="h-4 w-4" /> Create Opportunity
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Impressions", value: totals.shown || 0, icon: Eye, color: "#3B82F6" },
          { label: "Clicks", value: totals.clicked || 0, icon: MousePointerClick, color: "#059669" },
          { label: "Dismissed", value: totals.dismissed || 0, icon: XCircle, color: "#EF4444" },
          { label: "CTR", value: `${totals.ctr || 0}%`, icon: BarChart3, color: "#8B5CF6" },
        ].map((s) => {
          const I = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100">
              <I className="h-4 w-4 mb-2" style={{ color: s.color }} />
              <p className="text-[10px] font-medium text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6" data-testid="opp-form">
          <h3 className="text-sm font-bold text-gray-900 mb-4">{editingOpp ? "Edit Opportunity" : "Create Opportunity"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Opportunity title" data-testid="opp-title-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">CTA Text</label>
              <input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-cta-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" rows={2} placeholder="Why this matters for the user" data-testid="opp-desc-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-category-select">
                <option>Safety</option><option>Growth</option><option>Debt</option><option>Protection</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-type-select">
                <option value="system">System</option><option value="campaign">Campaign</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Priority (1=Highest)</label>
              <input type="number" min={1} max={5} value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 3 })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-priority-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Destination URL</label>
              <input value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="/goals" data-testid="opp-url-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-start-input" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-gray-500 uppercase">End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" data-testid="opp-end-input" />
            </div>

            {/* Rule Builder */}
            {form.type === "system" && (
              <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4">
                <h4 className="text-xs font-bold text-gray-700 mb-3">Eligibility Rules</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  {Object.entries(form.eligibility_json).map(([key, val]) => (
                    <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-lg border text-xs">
                      <span className="font-medium text-gray-700">{key}</span>
                      <span className="text-gray-400">{typeof val === "object" ? `${val.op} ${val.value}` : String(val)}</span>
                      <button onClick={() => removeRule(key)} className="text-red-400 hover:text-red-600 ml-1"><XCircle className="h-3 w-3" /></button>
                    </span>
                  ))}
                  {Object.keys(form.eligibility_json).length === 0 && <span className="text-xs text-gray-400">No rules added — all users eligible</span>}
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <select value={ruleKey} onChange={(e) => setRuleKey(e.target.value)} className="px-2 py-1.5 rounded-lg border text-xs">
                    <option value="days_of_safety">Days of Safety</option>
                    <option value="wealth_percent">Wealth %</option>
                    <option value="monthly_income">Monthly Income</option>
                    <option value="emi_percent">EMI %</option>
                    <option value="idle_cash">Idle Cash</option>
                    <option value="no_active_sip">No Active SIP</option>
                    <option value="no_insurance">No Insurance</option>
                    <option value="income">Income</option>
                  </select>
                  <select value={ruleOp} onChange={(e) => setRuleOp(e.target.value)} className="px-2 py-1.5 rounded-lg border text-xs">
                    <option value="lt">Less than</option>
                    <option value="gt">Greater than</option>
                    <option value="eq">Equals</option>
                    <option value="lte">Less or equal</option>
                    <option value="gte">Greater or equal</option>
                  </select>
                  <input value={ruleVal} onChange={(e) => setRuleVal(e.target.value)} placeholder="Value" className="w-24 px-2 py-1.5 rounded-lg border text-xs" data-testid="rule-value-input" />
                  <button onClick={addRule} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700" data-testid="add-rule-btn">Add</button>
                </div>
              </div>
            )}

            <div className="sm:col-span-2 flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="rounded" />
                <span className="text-xs font-medium text-gray-700">Active</span>
              </label>
              <div className="flex gap-2">
                <button onClick={resetForm} className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700" data-testid="save-opp-btn">{editingOpp ? "Update" : "Create"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <Rocket className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No opportunities created yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first smart opportunity above</p>
          </div>
        ) : (
          opportunities.map((opp) => {
            const catColor = CATEGORY_COLORS[opp.category] || "#6B7280";
            const s = opp.stats || {};
            const isExpanded = expandedRules === opp.id;
            return (
              <div key={opp.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden" data-testid={`admin-opp-${opp.id}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                        <span className="text-xs font-bold text-gray-900">{opp.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${opp.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                          {opp.active ? "Active" : "Inactive"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-50 text-gray-500">P{opp.priority}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${catColor}15`, color: catColor }}>{opp.category}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{opp.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleActive(opp)} className="p-1.5 rounded-lg hover:bg-gray-50" title={opp.active ? "Deactivate" : "Activate"}>
                        {opp.active ? <PowerOff className="h-3.5 w-3.5 text-red-400" /> : <Power className="h-3.5 w-3.5 text-green-500" />}
                      </button>
                      <button onClick={() => handleEdit(opp)} className="p-1.5 rounded-lg hover:bg-gray-50"><Edit3 className="h-3.5 w-3.5 text-gray-400" /></button>
                      <button onClick={() => handleDelete(opp.id)} className="p-1.5 rounded-lg hover:bg-gray-50"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                    </div>
                  </div>

                  {/* Inline stats */}
                  <div className="flex gap-4 mt-3 text-[10px]">
                    <span className="text-gray-400"><Eye className="h-3 w-3 inline mr-0.5" />{s.shown || 0} shown</span>
                    <span className="text-green-500"><MousePointerClick className="h-3 w-3 inline mr-0.5" />{s.clicked || 0} clicks</span>
                    <span className="text-red-400"><XCircle className="h-3 w-3 inline mr-0.5" />{s.dismissed || 0} dismissed</span>
                    <span className="text-purple-500"><CheckCircle className="h-3 w-3 inline mr-0.5" />{s.converted || 0} converted</span>
                  </div>

                  {/* Expand rules */}
                  <button onClick={() => setExpandedRules(isExpanded ? null : opp.id)} className="flex items-center gap-1 mt-2 text-[10px] font-medium text-teal-600 hover:text-teal-700">
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Hide Rules" : "View Rules"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">Eligibility Rules</p>
                      {Object.entries(opp.eligibility_json || {}).length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(opp.eligibility_json).map(([k, v]) => (
                            <span key={k} className="px-2 py-1 bg-white rounded border text-[10px] text-gray-600">
                              {k}: {typeof v === "object" ? `${v.op} ${v.value}` : String(v)}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-gray-400">No rules — all users eligible</span>}
                      <p className="text-[10px] font-semibold text-gray-500 mt-3 mb-1">Details</p>
                      <div className="text-[10px] text-gray-500 space-y-0.5">
                        <p>Type: {opp.type} | CTA: {opp.cta_text} | URL: {opp.destination_url || "—"}</p>
                        <p>Period: {(opp.start_date || "").slice(0, 10)} → {(opp.end_date || "").slice(0, 10)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

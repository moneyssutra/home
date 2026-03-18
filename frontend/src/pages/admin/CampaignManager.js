import React, { useState, useEffect } from "react";
import adminApi from "@/utils/adminApi";
import {
  Activity, Plus, Megaphone, Bell, MessageSquare, Trash2, Play, Pause,
  Edit3, X, Target, Calendar, ChevronDown, ChevronUp, Eye
} from "lucide-react";


const typeConfig = {
  banner: { icon: Megaphone, color: "teal", label: "Banner" },
  notification: { icon: Bell, color: "blue", label: "Notification" },
  popup: { icon: MessageSquare, color: "violet", label: "Popup" },
};

const priorityColors = {
  low: "text-gray-400 bg-gray-50 border-gray-200",
  normal: "text-blue-600 bg-blue-50 border-blue-200",
  high: "text-amber-600 bg-amber-50 border-amber-200",
  urgent: "text-rose-600 bg-rose-50 border-rose-200",
};

const statusColors = {
  draft: "text-gray-500 bg-gray-50 border-gray-200",
  active: "text-emerald-600 bg-emerald-50 border-emerald-200",
  paused: "text-amber-600 bg-amber-50 border-amber-200",
  expired: "text-gray-400 bg-gray-50 border-gray-200",
};

const CampaignForm = ({ campaign, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title: "", message: "", type: "banner", priority: "normal",
    ctaText: "", ctaUrl: "", startDate: new Date().toISOString().slice(0, 10), endDate: "",
    targeting: { audience: "all", riskLevel: "", incomeBand: "", city: "" },
    ...campaign,
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const updateTargeting = (key, val) => setForm(prev => ({
    ...prev, targeting: { ...prev.targeting, [key]: val }
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6" data-testid="campaign-form">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-800">{campaign ? "Edit Campaign" : "Create Campaign"}</h3>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100">
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Title</label>
          <input value={form.title} onChange={(e) => update("title", e.target.value)} required
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
            data-testid="campaign-title-input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Type</label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400"
              data-testid="campaign-type-select">
              <option value="banner">Banner</option>
              <option value="notification">Notification</option>
              <option value="popup">Popup</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
            <select value={form.priority} onChange={(e) => update("priority", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400"
              data-testid="campaign-priority-select">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Message</label>
        <textarea value={form.message} onChange={(e) => update("message", e.target.value)} rows={3} required
          className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none"
          data-testid="campaign-message-input" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Start Date</label>
          <input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">End Date</label>
          <input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CTA Text</label>
          <input value={form.ctaText} onChange={(e) => update("ctaText", e.target.value)} placeholder="Learn More"
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CTA URL</label>
          <input value={form.ctaUrl} onChange={(e) => update("ctaUrl", e.target.value)} placeholder="/health"
            className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-white border border-gray-200 text-gray-700 focus:outline-none focus:border-teal-400" />
        </div>
      </div>

      {/* Targeting */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-3.5 w-3.5 text-teal-600" />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Targeting Rules</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] text-gray-400">Audience</label>
            <select value={form.targeting?.audience || "all"} onChange={(e) => updateTargeting("audience", e.target.value)}
              className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700"
              data-testid="campaign-audience-select">
              <option value="all">All Users</option>
              <option value="risk">By Risk Level</option>
              <option value="income">By Income Band</option>
              <option value="city">By City</option>
            </select>
          </div>
          {form.targeting?.audience === "risk" && (
            <div>
              <label className="text-[10px] text-gray-400">Risk Level</label>
              <select value={form.targeting?.riskLevel || ""} onChange={(e) => updateTargeting("riskLevel", e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700">
                <option value="">Select</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="stable">Stable</option>
              </select>
            </div>
          )}
          {form.targeting?.audience === "income" && (
            <div>
              <label className="text-[10px] text-gray-400">Income Band</label>
              <select value={form.targeting?.incomeBand || ""} onChange={(e) => updateTargeting("incomeBand", e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700">
                <option value="">Select</option>
                <option value="<25K">&lt;25K</option>
                <option value="25K-50K">25K-50K</option>
                <option value="50K-100K">50K-100K</option>
                <option value="100K-200K">100K-200K</option>
                <option value="200K+">200K+</option>
              </select>
            </div>
          )}
          {form.targeting?.audience === "city" && (
            <div>
              <label className="text-[10px] text-gray-400">City</label>
              <input value={form.targeting?.city || ""} onChange={(e) => updateTargeting("city", e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg text-xs bg-white border border-gray-200 text-gray-700" placeholder="Mumbai" />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all" data-testid="campaign-save-btn">
          {campaign ? "Update" : "Create"} Campaign
        </button>
      </div>
    </form>
  );
};

const CampaignCard = ({ campaign, onEdit, onDelete, onToggle }) => {
  const tc = typeConfig[campaign.type] || typeConfig.banner;
  const TypeIcon = tc.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all" data-testid={`campaign-card-${campaign.id}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl bg-${tc.color}-50 border border-${tc.color}-100 flex items-center justify-center shrink-0`}>
            <TypeIcon className={`h-4 w-4 text-${tc.color}-600`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-gray-800 truncate">{campaign.title}</h4>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${statusColors[campaign.status]}`}>
                {campaign.status}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${priorityColors[campaign.priority]}`}>
                {campaign.priority}
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-1">{campaign.message}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onToggle(campaign.id)} className={`p-1.5 rounded-lg transition-all ${campaign.status === "active" ? "hover:bg-amber-50 text-amber-500" : "hover:bg-emerald-50 text-emerald-500"}`}
              data-testid={`toggle-campaign-${campaign.id}`}>
              {campaign.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button onClick={() => onEdit(campaign)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 transition-all"
              data-testid={`edit-campaign-${campaign.id}`}>
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => onDelete(campaign.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 transition-all"
              data-testid={`delete-campaign-${campaign.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 transition-all">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div><span className="text-[10px] text-gray-400">Type</span><div className="font-semibold text-gray-700 capitalize">{campaign.type}</div></div>
              <div><span className="text-[10px] text-gray-400">Dates</span><div className="font-semibold text-gray-700">{campaign.startDate || "—"} → {campaign.endDate || "Ongoing"}</div></div>
              <div><span className="text-[10px] text-gray-400">Targeting</span><div className="font-semibold text-gray-700 capitalize">{campaign.targeting?.audience || "All"}{campaign.targeting?.riskLevel ? `: ${campaign.targeting.riskLevel}` : ""}{campaign.targeting?.incomeBand ? `: ${campaign.targeting.incomeBand}` : ""}{campaign.targeting?.city ? `: ${campaign.targeting.city}` : ""}</div></div>
              <div><span className="text-[10px] text-gray-400">Performance</span><div className="font-semibold text-gray-700"><Eye className="inline h-3 w-3 mr-0.5" />{campaign.impressions || 0} views, {campaign.clicks || 0} clicks</div></div>
            </div>
            {campaign.ctaText && (
              <div className="mt-2 text-xs text-gray-500">CTA: <span className="font-semibold text-teal-600">{campaign.ctaText}</span> → {campaign.ctaUrl}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchCampaigns = async () => {
    try {
      const res = await adminApi.get("/admin/campaigns");
      setCampaigns(res.data.campaigns || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleSave = async (form) => {
    try {
      if (editingCampaign) {
        await adminApi.put(`/admin/campaigns/${editingCampaign.id}`, form);
      } else {
        await adminApi.post("/admin/campaigns", form);
      }
      setShowForm(false);
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id) => {
    try {
      await adminApi.delete(`/admin/campaigns/${id}`);
      fetchCampaigns();
    } catch (e) { console.error(e); }
  };

  const handleToggle = async (id) => {
    try {
      await adminApi.post(`/admin/campaigns/${id}/toggle`, {});
      fetchCampaigns();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Activity className="h-6 w-6 text-teal-600 animate-spin" /></div>;

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);
  const counts = { all: campaigns.length, active: campaigns.filter(c => c.status === "active").length, draft: campaigns.filter(c => c.status === "draft").length, paused: campaigns.filter(c => c.status === "paused").length };

  return (
    <div data-testid="campaign-manager-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-black tracking-wide text-gray-900">Targeted Campaigns</h1>
          <p className="text-xs text-gray-400 mt-1">Create and manage banners, notifications, and popups</p>
        </div>
        <button onClick={() => { setEditingCampaign(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-sm"
          data-testid="create-campaign-btn">
          <Plus className="h-3.5 w-3.5" /> New Campaign
        </button>
      </div>

      {showForm && (
        <CampaignForm campaign={editingCampaign} onSave={handleSave} onCancel={() => { setShowForm(false); setEditingCampaign(null); }} />
      )}

      {/* Status Filter */}
      <div className="flex gap-1 mb-4">
        {["all", "active", "draft", "paused"].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filter === s ? "bg-teal-50 text-teal-700 border border-teal-200 shadow-sm" : "text-gray-400 bg-white border border-gray-200 hover:border-gray-300"}`}
            data-testid={`filter-${s}`}>
            {s} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {filtered.map(c => (
          <CampaignCard key={c.id} campaign={c} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center" data-testid="no-campaigns">
            <Megaphone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-400">No campaigns {filter !== "all" ? `with status "${filter}"` : "yet"}</p>
            <p className="text-xs text-gray-300 mt-1">Create your first campaign to start reaching users</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignManager;

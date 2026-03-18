import { useState } from "react";
import { Download, Users, BarChart3, FileSpreadsheet, Loader2 } from "lucide-react";
import adminApi from "@/utils/adminApi";

const exportOptions = [
  {
    id: "users",
    title: "User List",
    description: "Emails, signup dates, auth type, profile status",
    icon: Users,
    endpoint: "/admin/export/users",
    color: "#3B82F6",
  },
  {
    id: "analytics",
    title: "Platform Analytics",
    description: "Per-user data counts, health scores, badges, activity",
    icon: BarChart3,
    endpoint: "/admin/export/analytics",
    color: "#8B5CF6",
  },
];

export default function DataExport() {
  const [loading, setLoading] = useState(null);
  const [userId, setUserId] = useState("");

  const handleExport = async (endpoint, filename) => {
    setLoading(endpoint);
    try {
      const response = await adminApi.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl" data-testid="admin-export-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Data Export</h1>
      <p className="text-sm text-gray-500 mb-8">Download platform data as CSV files</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {exportOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleExport(opt.endpoint, `${opt.id}_export.csv`)}
            disabled={loading === opt.endpoint}
            className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all text-left group"
            data-testid={`export-${opt.id}-btn`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${opt.color}15` }}>
                {loading === opt.endpoint ? (
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: opt.color }} />
                ) : (
                  <opt.icon className="h-5 w-5" style={{ color: opt.color }} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{opt.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
              <Download className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors mt-1" />
            </div>
          </button>
        ))}
      </div>

      <div className="p-5 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#10B98115" }}>
            <FileSpreadsheet className="h-5 w-5" style={{ color: "#10B981" }} />
          </div>
          <div>
            <p className="font-semibold text-gray-900">User Financial Data</p>
            <p className="text-xs text-gray-500">Export income, expenses, investments, accounts for a specific user</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter user_id (e.g., user_abc123)"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
            data-testid="export-user-id-input"
          />
          <button
            onClick={() => userId && handleExport(`/admin/export/financial/${userId}`, `financial_${userId}.csv`)}
            disabled={!userId || loading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-testid="export-financial-btn"
          >
            {loading?.includes("financial") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

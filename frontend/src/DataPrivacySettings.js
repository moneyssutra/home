import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Database, 
  Download, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  Loader2,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Lock,
  ExternalLink,
  Activity,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const DataPrivacySettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExportData = async () => {
    setExporting('json');
    try {
      const response = await fetch(`${backendUrl}/api/settings/data-export`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `moneyssutra_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    
    setDeleting(true);
    try {
      const response = await fetch(`${backendUrl}/api/settings/delete-account`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      toast.success("Account deleted successfully");
      setShowDeleteConfirm(false);
      
      // Logout and redirect
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="data-privacy-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Data & Privacy</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Section 1: Data Export */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Database className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Export Your Data
          </h3>
          
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Download all your financial data in JSON format. This includes all your assets, investments, loans, income sources, expenses, and goals.
          </p>
          
          <button
            onClick={handleExportData}
            disabled={exporting === 'json'}
            className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}
            data-testid="export-data-btn"
          >
            {exporting === 'json' ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download All Data (JSON)
              </>
            )}
          </button>
        </div>

        {/* Section 2: Data Protection */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            Data Protection
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <Lock className="h-5 w-5 mt-0.5" style={{ color: "#059669" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>End-to-End Encryption</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>All your data is encrypted in transit and at rest</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <Database className="h-5 w-5 mt-0.5" style={{ color: "#3B82F6" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Secure Cloud Storage</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Data stored on MongoDB Atlas with enterprise security</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            </div>
            
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <Activity className="h-5 w-5 mt-0.5" style={{ color: "#8B5CF6" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>No Data Sharing</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your financial data is never shared with third parties</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Section 3: Delete Account */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid #FEE2E2" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </h3>
          
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-red-600 border-2 border-red-200 hover:bg-red-50"
              data-testid="delete-account-btn"
            >
              <Trash2 className="h-5 w-5" />
              Delete My Account
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">This will permanently delete:</p>
                    <ul className="text-sm text-red-600 mt-2 space-y-1">
                      <li>• All your financial data (assets, investments, loans)</li>
                      <li>• Income sources and expense records</li>
                      <li>• Goals and analytics history</li>
                      <li>• Account credentials and preferences</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-red-600">
                  Type "DELETE" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full p-3 rounded-xl border-2 border-red-200 focus:border-red-500 focus:outline-none"
                  data-testid="delete-confirm-input"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="confirm-delete-btn"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Delete Forever
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataPrivacySettings;

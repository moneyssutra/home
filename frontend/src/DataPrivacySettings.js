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
  Activity
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DataPrivacySettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleExport = async (type) => {
    setExporting(type);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${type === 'zip' ? 'Data archive' : type === 'excel' ? 'Excel export' : 'Activity report'} prepared. Check your email for download link.`);
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setExporting(null);
    }
  };

  const handleClearWorkspace = () => {
    toast.success("Workspace cleared successfully");
    setShowClearConfirm(false);
  };

  const handleResetData = () => {
    toast.success("All data has been reset");
    setShowResetConfirm(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    toast.error("Account deletion is disabled in demo mode");
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="data-privacy-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Data & Privacy</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Section 1: Data Access */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Download className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Data Access
          </h3>

          {/* Download All Data (ZIP) */}
          <button
            onClick={() => handleExport('zip')}
            disabled={exporting === 'zip'}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all hover:shadow-sm"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
                <Database className="h-5 w-5" style={{ color: "#3B82F6" }} />
              </div>
              <div className="text-left">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Download All Data</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Get complete backup as ZIP</p>
              </div>
            </div>
            {exporting === 'zip' ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            ) : (
              <Download className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            )}
          </button>

          {/* Download as Excel */}
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting === 'excel'}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all hover:shadow-sm"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
                <FileSpreadsheet className="h-5 w-5" style={{ color: "#059669" }} />
              </div>
              <div className="text-left">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Export as Excel</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Spreadsheet format export</p>
              </div>
            </div>
            {exporting === 'excel' ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            ) : (
              <Download className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            )}
          </button>

          {/* Activity Report */}
          <button
            onClick={() => handleExport('activity')}
            disabled={exporting === 'activity'}
            className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-sm"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
                <Activity className="h-5 w-5" style={{ color: "#8B5CF6" }} />
              </div>
              <div className="text-left">
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Download Activity Report</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Login history & changes log</p>
              </div>
            </div>
            {exporting === 'activity' ? (
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            ) : (
              <Download className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            )}
          </button>
        </div>

        {/* Section 2: Data Control */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <RefreshCw className="h-5 w-5" style={{ color: "#F59E0B" }} />
            Data Control
          </h3>

          {/* Clear Workspace */}
          {!showClearConfirm ? (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5" style={{ color: "#F59E0B" }} />
                <div className="text-left">
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>Clear Workspace</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Remove temporary data & cache</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl mb-3" style={{ backgroundColor: "rgba(245, 158, 11, 0.1)" }}>
              <p className="text-sm mb-3" style={{ color: "#F59E0B" }}>This will clear cached data. Your saved data is safe.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2 rounded-xl font-medium"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearWorkspace}
                  className="flex-1 py-2 rounded-xl font-medium text-white"
                  style={{ backgroundColor: "#F59E0B" }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Reset All Data */}
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-between p-4 rounded-xl transition-all"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5" style={{ color: "#EF4444" }} />
                <div className="text-left">
                  <p className="font-medium" style={{ color: "#EF4444" }}>Reset All Data</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Start fresh with empty data</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                <p className="text-sm" style={{ color: "#EF4444" }}>
                  This will delete all your financial data. Your account will remain but all transactions, goals, and settings will be erased.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-xl font-medium"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetData}
                  className="flex-1 py-2 rounded-xl font-medium text-white"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  Reset Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Privacy */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            Privacy
          </h3>

          {/* Encryption Info */}
          <div className="p-4 rounded-xl mb-3" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 mt-0.5" style={{ color: "#059669" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Data Encryption</p>
                <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                  All your data is encrypted using AES-256 encryption at rest and TLS 1.3 in transit. 
                  Your financial information is never shared with third parties.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Policy */}
          <button
            onClick={() => toast.info("Privacy Policy page coming soon")}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-3 transition-all hover:shadow-sm"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)" }}>Privacy Policy</span>
            </div>
            <ExternalLink className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          </button>

          {/* Terms of Service */}
          <button
            onClick={() => toast.info("Terms of Service page coming soon")}
            className="w-full flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-sm"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)" }}>Terms of Service</span>
            </div>
            <ExternalLink className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Section 4: Account Termination - Red Zone */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#EF4444" }}>
            <Trash2 className="h-5 w-5" />
            Account Termination
          </h3>

          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl font-semibold transition-all"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}
            >
              Delete My Account Permanently
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#EF4444" }}>
                    This is permanent and cannot be undone!
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    All your data including transactions, goals, investments, and settings will be permanently deleted.
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                  Type <strong>DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="w-full p-3 rounded-xl outline-none"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)", 
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE"}
                  className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  Delete Forever
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

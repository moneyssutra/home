import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Database, Download, Trash2, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const DataPrivacySettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Data export started. You'll receive an email with the download link.");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    toast.error("Account deletion is disabled in demo mode");
    setShowDeleteConfirm(false);
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="data-privacy-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Data & Privacy</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Export Data */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <Download className="h-5 w-5" style={{ color: "#3B82F6" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Export Your Data</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Download all your financial data</p>
            </div>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Export all your data including income, expenses, investments, and more in a downloadable format.
          </p>
          <button
            onClick={handleExportData}
            disabled={exporting}
            className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}
          >
            {exporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export Data
              </>
            )}
          </button>
        </div>

        {/* Privacy Policy */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Privacy Policy</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Learn how we protect your data</p>
            </div>
          </div>
        </div>

        {/* Data Storage Info */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(139, 92, 246, 0.1)" }}>
              <Database className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Data Storage</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Your data is securely stored</p>
            </div>
          </div>
          <div className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            <p>• All data is encrypted at rest and in transit</p>
            <p>• Stored on secure cloud servers</p>
            <p>• Regular backups are performed</p>
            <p>• We never sell your data to third parties</p>
          </div>
        </div>

        {/* Delete Account */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
              <Trash2 className="h-5 w-5" style={{ color: "#EF4444" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "#EF4444" }}>Delete Account</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Permanently delete your account and data</p>
            </div>
          </div>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 rounded-xl font-semibold transition-all"
              style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}
            >
              Delete My Account
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}>
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
                <p className="text-sm" style={{ color: "#EF4444" }}>
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-semibold"
                  style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-xl font-semibold text-white"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  Yes, Delete
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

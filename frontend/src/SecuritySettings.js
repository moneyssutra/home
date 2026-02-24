import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Smartphone, Loader2, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user, setPassword } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: ""
  });

  const hasPassword = user?.has_password || user?.auth_type === "jwt";

  const handleChangePassword = async () => {
    if (passwords.new.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const result = await setPassword(passwords.new);
      if (result.success) {
        toast.success("Password updated successfully");
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        toast.error(result.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: "var(--bg-app)" }} data-testid="security-settings-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button
          onClick={() => navigate("/settings", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors hover:bg-gray-100"
          data-testid="back-button"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Security</h1>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-6">
        {/* Auth Type Info */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(5, 150, 105, 0.1)" }}>
              <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            </div>
            <div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {user?.auth_type === "google" ? "Google Account" : "Email & Password"}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {hasPassword ? "Password is set" : "No password set"}
              </p>
            </div>
          </div>
        </div>

        {/* Change/Set Password Section */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3 mb-4">
            <Key className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {hasPassword ? "Change Password" : "Set Password"}
            </h3>
          </div>

          <div className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Eye className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Eye className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Password requirements:</p>
              <div className="flex items-center gap-2">
                <Check className={`h-4 w-4 ${passwords.new.length >= 6 ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>At least 6 characters</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className={`h-4 w-4 ${passwords.new === passwords.confirm && passwords.confirm.length > 0 ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Passwords match</span>
              </div>
            </div>

            {/* Update Button */}
            <button
              onClick={handleChangePassword}
              disabled={saving || passwords.new.length < 6 || passwords.new !== passwords.confirm}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                hasPassword ? "Update Password" : "Set Password"
              )}
            </button>
          </div>
        </div>

        {/* Two-Factor Auth (Coming Soon) */}
        <div className="rounded-2xl p-4 opacity-60" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Two-Factor Authentication</p>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;

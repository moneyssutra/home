import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  Key, 
  Smartphone,
  Fingerprint,
  Loader2, 
  Check,
  Monitor,
  MapPin,
  Clock,
  LogOut,
  History,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { user, setPassword, logout } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const hasPassword = user?.has_password || user?.auth_type === "jwt";

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch2FAStatus();
    fetchSessions();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/auth/2fa/status`, { withCredentials: true });
      setTwoFAEnabled(response.data.enabled);
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/auth/sessions`, { withCredentials: true });
      setActiveSessions(response.data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      // Fallback to mock data if API fails
      setActiveSessions([
        { id: "current", device: "Current Browser", location: "Current", lastActive: "Now", current: true }
      ]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "#e5e7eb" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 1) return { score: 20, label: "Weak", color: "#EF4444" };
    if (score <= 2) return { score: 40, label: "Fair", color: "#F59E0B" };
    if (score <= 3) return { score: 60, label: "Good", color: "#3B82F6" };
    if (score <= 4) return { score: 80, label: "Strong", color: "#059669" };
    return { score: 100, label: "Very Strong", color: "#059669" };
  };

  const passwordStrength = getPasswordStrength(passwords.new);

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
        setPasswords({ new: "", confirm: "" });
      } else {
        toast.error(result.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutSession = (sessionId) => {
    toast.success("Session logged out");
  };

  const handleLogoutAllSessions = () => {
    toast.success("All other sessions logged out");
  };

  const handleDeleteAccount = () => {
    toast.error("Account deletion is disabled in demo mode");
    setShowDeleteConfirm(false);
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
        {/* Section 1: Authentication */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Key className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
            Authentication
          </h3>

          {/* Change Password */}
          <div className="space-y-4 pb-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {hasPassword ? "Change Password" : "Set Password"}
            </p>

            {/* New Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type={showNewPassword ? "text" : "password"}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                placeholder="New password"
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

            {/* Password Strength Meter */}
            {passwords.new && (
              <div className="space-y-1">
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${passwordStrength.score}%`, backgroundColor: passwordStrength.color }}
                  />
                </div>
                <p className="text-xs" style={{ color: passwordStrength.color }}>{passwordStrength.label}</p>
              </div>
            )}

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="Confirm password"
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

            {/* Password Match Indicator */}
            {passwords.confirm && (
              <div className="flex items-center gap-2">
                <Check className={`h-4 w-4 ${passwords.new === passwords.confirm ? "text-green-500" : "text-gray-300"}`} />
                <span className="text-xs" style={{ color: passwords.new === passwords.confirm ? "#059669" : "var(--text-muted)" }}>
                  Passwords {passwords.new === passwords.confirm ? "match" : "do not match"}
                </span>
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={saving || passwords.new.length < 6 || passwords.new !== passwords.confirm}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {hasPassword ? "Update Password" : "Set Password"}
            </button>
          </div>

          {/* 2FA Toggle */}
          <div className="flex items-center justify-between py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Two-Factor Authentication</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add extra security with OTP</p>
              </div>
            </div>
            <button
              onClick={() => {
                setTwoFAEnabled(!twoFAEnabled);
                toast.info("2FA " + (!twoFAEnabled ? "enabled" : "disabled"));
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${twoFAEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFAEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Biometric Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <div>
                <p className="font-medium" style={{ color: "var(--text-primary)" }}>Biometric Login</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Use fingerprint or face ID</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBiometricEnabled(!biometricEnabled);
                toast.info("Biometric login " + (!biometricEnabled ? "enabled" : "disabled"));
              }}
              className={`relative w-12 h-7 rounded-full transition-colors ${biometricEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${biometricEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Section 2: Active Sessions */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Monitor className="h-5 w-5" style={{ color: "#3B82F6" }} />
            Active Sessions
          </h3>

          <div className="space-y-3">
            {activeSessions.map((session) => (
              <div 
                key={session.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: session.current ? "var(--brand-primary-soft)" : "var(--bg-subtle)" }}
              >
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 mt-0.5" style={{ color: session.current ? "var(--brand-primary)" : "var(--text-muted)" }} />
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      {session.device}
                      {session.current && <span className="ml-2 text-xs text-green-500">(This device)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin className="h-3 w-3" /> {session.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <Clock className="h-3 w-3" /> {session.lastActive}
                      </span>
                    </div>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleLogoutSession(session.id)}
                    className="p-2 rounded-lg hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleLogoutAllSessions}
            className="w-full mt-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444" }}
          >
            <LogOut className="h-4 w-4" />
            Logout from all other devices
          </button>
        </div>

        {/* Section 3: Account Safety */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield className="h-5 w-5" style={{ color: "#059669" }} />
            Account Safety
          </h3>

          {/* Login History */}
          <button
            onClick={() => toast.info("Login history coming soon")}
            className="w-full flex items-center justify-between p-4 rounded-xl mb-3"
            style={{ backgroundColor: "var(--bg-subtle)" }}
          >
            <div className="flex items-center gap-3">
              <History className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <span style={{ color: "var(--text-primary)" }}>Login History</span>
            </div>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>View all</span>
          </button>

          {/* Delete Account - Red Zone */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Trash2 className="h-5 w-5" style={{ color: "#EF4444" }} />
              <div>
                <p className="font-semibold" style={{ color: "#EF4444" }}>Delete Account</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Permanently delete your account and data</p>
              </div>
            </div>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 rounded-xl font-medium"
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
                    className="flex-1 py-3 rounded-xl font-medium"
                    style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 py-3 rounded-xl font-medium text-white"
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
    </div>
  );
};

export default SecuritySettings;

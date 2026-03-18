import { useState, useEffect, useRef } from "react";
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
  AlertTriangle,
  Hash
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
  // MPIN state
  const [hasMpin, setHasMpin] = useState(false);
  const [mpinLoading, setMpinLoading] = useState(true);
  const [showMpinSetup, setShowMpinSetup] = useState(false);
  const [mpinDigits, setMpinDigits] = useState(["", "", "", ""]);
  const [mpinConfirm, setMpinConfirm] = useState(["", "", "", ""]);
  const [mpinStep, setMpinStep] = useState(1);
  const [mpinSaving, setMpinSaving] = useState(false);
  const mpinInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const mpinConfirmRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  // Biometric state
  const [hasBiometric, setHasBiometric] = useState(false);
  const [biometricCreds, setBiometricCreds] = useState([]);
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [biometricRegistering, setBiometricRegistering] = useState(false);

  const hasPassword = user?.has_password === true;

  useEffect(() => {
    window.scrollTo(0, 0);
    fetch2FAStatus();
    fetchSessions();
    fetchMpinStatus();
    fetchBiometricStatus();
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

  const fetchMpinStatus = async () => {
    setMpinLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/mpin/status`, { withCredentials: true });
      setHasMpin(res.data.has_mpin);
    } catch { setHasMpin(false); }
    finally { setMpinLoading(false); }
  };

  const handleMpinDigitChange = (refs, digits, setDigits, index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    if (value && index < 3) refs[index + 1].current?.focus();
  };

  const handleMpinDigitKeyDown = (refs, digits, index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handleSetMpin = async () => {
    const pin = mpinDigits.join("");
    const confirm = mpinConfirm.join("");
    if (pin.length !== 4) { toast.error("Please enter all 4 digits"); return; }
    if (mpinStep === 1) {
      setMpinStep(2);
      setTimeout(() => mpinConfirmRefs[0].current?.focus(), 100);
      return;
    }
    if (pin !== confirm) {
      toast.error("PINs do not match. Please try again.");
      setMpinConfirm(["", "", "", ""]);
      mpinConfirmRefs[0].current?.focus();
      return;
    }
    setMpinSaving(true);
    try {
      await axios.post(`${backendUrl}/api/mpin/set`, { mpin: pin }, { withCredentials: true });
      toast.success("MPIN set successfully");
      setHasMpin(true);
      setShowMpinSetup(false);
      setMpinDigits(["", "", "", ""]);
      setMpinConfirm(["", "", "", ""]);
      setMpinStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to set MPIN");
    } finally { setMpinSaving(false); }
  };

  const handleRemoveMpin = async () => {
    try {
      await axios.delete(`${backendUrl}/api/mpin/remove`, { withCredentials: true });
      toast.success("MPIN removed");
      setHasMpin(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove MPIN");
    }
  };


  // WebAuthn helpers
  const _base64urlToBuffer = (base64url) => {
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + padding;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  };

  const _bufferToBase64url = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const fetchBiometricStatus = async () => {
    setBiometricLoading(true);
    try {
      const res = await axios.get(`${backendUrl}/api/biometric/status`, { withCredentials: true });
      setHasBiometric(res.data.has_biometric);
      setBiometricCreds(res.data.credentials || []);
    } catch { setHasBiometric(false); }
    finally { setBiometricLoading(false); }
  };

  const handleRegisterBiometric = async () => {
    if (!window.PublicKeyCredential) {
      toast.error("Biometrics not supported on this device/browser");
      return;
    }
    // Check if running inside an iframe (WebAuthn is blocked in cross-origin iframes)
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      toast.error("Biometric setup requires a direct browser window. Please open the app in a new tab.", { duration: 5000 });
      // Try to open in a new tab
      window.open(window.location.href, "_blank");
      return;
    }
    // Check if platform authenticator is available (Touch ID, Windows Hello, etc.)
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error("No biometric authenticator found on this device (e.g., Touch ID, Windows Hello, fingerprint scanner)", { duration: 5000 });
        return;
      }
    } catch { /* proceed anyway, some browsers don't support this check */ }

    setBiometricRegistering(true);
    try {
      const optRes = await axios.post(`${backendUrl}/api/biometric/register/options`, {}, { withCredentials: true });
      const options = JSON.parse(optRes.data.options);
      options.challenge = _base64urlToBuffer(options.challenge);
      options.user.id = _base64urlToBuffer(options.user.id);
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: _base64urlToBuffer(c.id) }));
      }
      const credential = await navigator.credentials.create({ publicKey: options });
      const attestation = {
        id: credential.id,
        rawId: _bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: _bufferToBase64url(credential.response.attestationObject),
          clientDataJSON: _bufferToBase64url(credential.response.clientDataJSON),
        },
      };
      await axios.post(`${backendUrl}/api/biometric/register/verify`, {
        credential: attestation,
        device_name: navigator.userAgent.includes("Mobile") ? "Mobile Device" : "Desktop",
      }, { withCredentials: true });
      toast.success("Biometric registered successfully!");
      fetchBiometricStatus();
    } catch (err) {
      if (err.name === "NotAllowedError") {
        toast.error("Biometric registration was denied. Make sure you have Touch ID, Windows Hello, or a fingerprint scanner enabled.", { duration: 5000 });
      } else if (err.name === "SecurityError") {
        toast.error("Biometric blocked by browser security. Please open the app directly (not in an iframe/preview).", { duration: 5000 });
        window.open(window.location.href, "_blank");
      } else {
        toast.error(err.response?.data?.detail || err.message || "Failed to register biometric");
      }
    } finally { setBiometricRegistering(false); }
  };

  const handleRemoveBiometric = async () => {
    try {
      await axios.delete(`${backendUrl}/api/biometric/remove`, { withCredentials: true });
      toast.success("Biometric credentials removed");
      setHasBiometric(false);
      setBiometricCreds([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to remove biometric");
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
    if (hasPassword && !passwords.current) {
      toast.error("Please enter your current password");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      if (hasPassword) {
        // Use change-password endpoint if user already has a password
        await axios.post(`${backendUrl}/api/auth/change-password`, {
          current_password: passwords.current,
          new_password: passwords.new
        }, { withCredentials: true });
        toast.success("Password changed successfully");
      } else {
        // Use set-password for first-time password setup
        const result = await setPassword(passwords.new);
        if (result.success) {
          toast.success("Password set successfully");
        } else {
          toast.error(result.error || "Failed to set password");
          return;
        }
      }
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle2FA = async () => {
    setTwoFALoading(true);
    try {
      const newState = !twoFAEnabled;
      await axios.post(`${backendUrl}/api/auth/2fa/toggle`, {
        enabled: newState
      }, { withCredentials: true });
      setTwoFAEnabled(newState);
      toast.success(`Two-factor authentication ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update 2FA");
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleLogoutSession = async (sessionId) => {
    try {
      await axios.post(`${backendUrl}/api/auth/sessions/logout`, {
        session_id: sessionId
      }, { withCredentials: true });
      toast.success("Session logged out");
      fetchSessions();
    } catch (error) {
      toast.error("Failed to logout session");
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      await axios.post(`${backendUrl}/api/auth/sessions/logout-all`, {}, { withCredentials: true });
      toast.success("All other sessions logged out");
      fetchSessions();
    } catch (error) {
      toast.error("Failed to logout sessions");
    }
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

            {/* Current Password - only show if user has password */}
            {hasPassword && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  placeholder="Current password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <Eye className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  )}
                </button>
              </div>
            )}

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
              disabled={saving || passwords.new.length < 8 || passwords.new !== passwords.confirm || (hasPassword && !passwords.current)}
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
              onClick={handleToggle2FA}
              disabled={twoFALoading}
              className={`relative w-12 h-7 rounded-full transition-colors ${twoFAEnabled ? "bg-green-500" : "bg-gray-300"}`}
            >
              {twoFALoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                </div>
              ) : (
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFAEnabled ? "translate-x-6" : "translate-x-1"}`} />
              )}
            </button>
          </div>

          {/* Biometric Login */}
          <div className="py-4 border-b" style={{ borderColor: "var(--border-light)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Fingerprint className="h-5 w-5" style={{ color: hasBiometric ? "var(--brand-primary)" : "var(--text-muted)" }} />
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>Biometric Login</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {hasBiometric ? `${biometricCreds.length} device(s) registered` : "Use fingerprint or face ID"}
                  </p>
                </div>
              </div>
              {biometricLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              ) : hasBiometric ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegisterBiometric}
                    disabled={biometricRegistering}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                    style={{ color: "var(--brand-primary)", backgroundColor: "var(--brand-primary-soft)" }}
                    data-testid="add-biometric-btn"
                  >
                    {biometricRegistering && <Loader2 className="h-3 w-3 animate-spin" />}
                    Add Device
                  </button>
                  <button
                    onClick={handleRemoveBiometric}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all text-red-500 bg-red-50 hover:bg-red-100"
                    data-testid="remove-biometric-btn"
                  >
                    Remove All
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegisterBiometric}
                  disabled={biometricRegistering}
                  className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all flex items-center gap-1 disabled:opacity-50"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  data-testid="setup-biometric-btn"
                >
                  {biometricRegistering && <Loader2 className="h-3 w-3 animate-spin" />}
                  Set Up
                </button>
              )}
            </div>
          </div>

          {/* MPIN Setup */}
          <div className="py-4" data-testid="mpin-section">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash className="h-5 w-5" style={{ color: hasMpin ? "var(--brand-primary)" : "var(--text-muted)" }} />
                <div>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>MPIN Login</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {hasMpin ? "4-digit PIN is set" : "Quick login with 4-digit PIN"}
                  </p>
                </div>
              </div>
              {mpinLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              ) : hasMpin ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setShowMpinSetup(true); setMpinStep(1); setMpinDigits(["","","",""]); setMpinConfirm(["","","",""]); }}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: "var(--brand-primary)", backgroundColor: "var(--brand-primary-soft)" }}
                    data-testid="change-mpin-btn"
                  >
                    Change
                  </button>
                  <button
                    onClick={handleRemoveMpin}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all text-red-500 bg-red-50 hover:bg-red-100"
                    data-testid="remove-mpin-btn"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setShowMpinSetup(true); setMpinStep(1); setMpinDigits(["","","",""]); setMpinConfirm(["","","",""]); }}
                  className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition-all"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  data-testid="setup-mpin-btn"
                >
                  Set Up
                </button>
              )}
            </div>

            {showMpinSetup && (
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
                <p className="text-sm font-medium mb-3 text-center" style={{ color: "var(--text-primary)" }}>
                  {mpinStep === 1 ? "Enter a 4-digit MPIN" : "Confirm your MPIN"}
                </p>
                <div className="flex gap-3 justify-center mb-4">
                  {(mpinStep === 1 ? mpinDigits : mpinConfirm).map((digit, i) => (
                    <input
                      key={`mpin-setup-${mpinStep}-${i}`}
                      ref={mpinStep === 1 ? mpinInputRefs[i] : mpinConfirmRefs[i]}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleMpinDigitChange(
                        mpinStep === 1 ? mpinInputRefs : mpinConfirmRefs,
                        mpinStep === 1 ? mpinDigits : mpinConfirm,
                        mpinStep === 1 ? setMpinDigits : setMpinConfirm,
                        i, e.target.value
                      )}
                      onKeyDown={(e) => handleMpinDigitKeyDown(
                        mpinStep === 1 ? mpinInputRefs : mpinConfirmRefs,
                        mpinStep === 1 ? mpinDigits : mpinConfirm,
                        i, e
                      )}
                      className="w-12 h-12 text-center text-xl font-bold rounded-xl outline-none transition-all focus:ring-2"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "2px solid var(--border-light)",
                        color: "var(--text-primary)",
                      }}
                      data-testid={`setup-mpin-digit-${mpinStep}-${i}`}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowMpinSetup(false); setMpinStep(1); }}
                    className="flex-1 py-2.5 rounded-xl font-medium text-sm"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--border-light)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSetMpin}
                    disabled={mpinSaving || (mpinStep === 1 ? mpinDigits : mpinConfirm).join("").length !== 4}
                    className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                    data-testid="confirm-mpin-btn"
                  >
                    {mpinSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mpinStep === 1 ? "Next" : "Set MPIN"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Active Sessions */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Monitor className="h-5 w-5" style={{ color: "#3B82F6" }} />
            Active Sessions
          </h3>

          {sessionsLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
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
          )}

          <button
            onClick={handleLogoutAllSessions}
            disabled={activeSessions.filter(s => !s.current).length === 0}
            className="w-full mt-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
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

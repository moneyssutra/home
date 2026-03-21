import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Wallet, Mail, AlertCircle, CheckCircle, ArrowLeft, Send, Loader2, Lock, Eye, EyeOff, KeyRound, LinkIcon } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromLogin = location.state?.email || localStorage.getItem("moneyssutra_last_email") || "";
  const [identifier, setIdentifier] = useState(emailFromLogin);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // OTP state
  const [mode, setMode] = useState(null); // null = choose, "otp", "link"
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValidIdentifier = (value) => {
    if (!value) return false;
    return isValidEmail(value) || /^\d{10}$/.test(value);
  };

  // ---- Send Reset Link ----
  const handleSendLink = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !isValidIdentifier(identifier.trim())) {
      setError("Please enter a valid email address or 10-digit mobile number");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/auth/forgot-password`, { username: identifier.trim() });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Send OTP ----
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setError("");
    const email = identifier.trim();
    if (!email || !isValidEmail(email)) {
      setError("Please enter a valid email address to receive OTP");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/auth/send-otp`, { email });
      setOtpSent(true);
      setResendTimer(60);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- OTP Input Handlers ----
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const otpString = otp.join("");

  // ---- Verify OTP + Reset Password ----
  const handleResetWithOTP = async (e) => {
    e.preventDefault();
    setError("");
    if (otpString.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/auth/reset-password-otp`, {
        email: identifier.trim(),
        otp: otpString,
        new_password: newPassword,
      });
      setOtpVerified(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Wrapper ----
  const PageShell = ({ children }) => (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg border border-white/30">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">MoneySSutra</h1>
          <p className="text-white/70 text-sm">Password Recovery</p>
        </div>
        {children}
      </div>
    </div>
  );

  // ---- Success: Link Sent ----
  if (success && mode === "link") {
    return (
      <PageShell>
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal text-center" style={{ backgroundColor: "var(--bg-card)" }} data-testid="reset-link-success">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
            <CheckCircle className="h-8 w-8" style={{ color: "var(--status-success)" }} />
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Check Your Email</h2>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            If an account exists with this email, you will receive a password reset link shortly.
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Don't forget to check your spam folder!</p>
          <Link to="/login" className="inline-block w-full py-3 rounded-xl text-white font-semibold text-center" style={{ backgroundColor: "var(--btn-primary-bg)" }} data-testid="back-to-login-btn">
            Back to Login
          </Link>
        </div>
      </PageShell>
    );
  }

  // ---- Success: OTP Reset Done ----
  if (otpVerified) {
    return (
      <PageShell>
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal text-center" style={{ backgroundColor: "var(--bg-card)" }} data-testid="otp-reset-success">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
            <CheckCircle className="h-8 w-8" style={{ color: "var(--status-success)" }} />
          </div>
          <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>Password Reset Successful!</h2>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Your password has been changed. You can now log in.</p>
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-white font-semibold" style={{ backgroundColor: "var(--btn-primary-bg)" }} data-testid="go-to-login-btn">
            Go to Login
          </button>
        </div>
      </PageShell>
    );
  }

  // ---- OTP Flow: Enter OTP + New Password ----
  if (mode === "otp" && otpSent) {
    return (
      <PageShell>
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }} data-testid="otp-verify-form">
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Verify & Reset</h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Enter the 6-digit code sent to <strong>{identifier.trim()}</strong>
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
              <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleResetWithOTP} className="space-y-5">
            {/* OTP Inputs */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-13 text-center text-xl font-bold rounded-xl outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: "var(--bg-subtle)",
                    border: `2px solid ${digit ? "var(--brand-primary)" : "var(--border-light)"}`,
                    color: "var(--text-primary)",
                  }}
                  data-testid={`otp-input-${i}`}
                />
              ))}
            </div>

            {/* Resend */}
            <div className="text-center">
              {resendTimer > 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resend in {resendTimer}s</p>
              ) : (
                <button type="button" onClick={handleSendOTP} className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }} data-testid="resend-otp-btn">
                  Resend OTP
                </button>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                  data-testid="new-password-input"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                  data-testid="confirm-password-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpString.length !== 6}
              className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="reset-password-otp-btn"
            >
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Resetting...</> : "Reset Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setOtpSent(false); setMode(null); setError(""); setOtp(["","","","","",""]); }} className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--brand-primary)" }}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ---- Choose Mode: OTP vs Link ----
  if (mode === null) {
    return (
      <PageShell>
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }} data-testid="forgot-password-page">
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Forgot Password?</h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Choose how you'd like to reset your password
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
              <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Email ID or Mobile Number
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@email.com or 10-digit mobile"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                data-testid="recovery-identifier-input"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              onClick={() => {
                if (!identifier.trim() || !isValidEmail(identifier.trim())) {
                  setError("Please enter a valid email address for OTP");
                  return;
                }
                setError("");
                setMode("otp");
                handleSendOTP();
              }}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5 text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="choose-otp-btn"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
              Reset via OTP
            </button>

            <button
              onClick={() => { setError(""); setMode("link"); }}
              className="w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2.5"
              style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-primary)", border: "1px solid var(--border-light)" }}
              data-testid="choose-link-btn"
            >
              <LinkIcon className="h-5 w-5" />
              Reset via Email Link
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: "var(--brand-primary)" }} data-testid="back-to-login-link">
              <ArrowLeft className="h-4 w-4" /> Back to Login
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  // ---- Link Mode Form ----
  return (
    <PageShell>
      <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }} data-testid="reset-link-form">
        <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Send Reset Link</h2>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
          We'll send a password reset link to your email.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
            <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
            <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email ID or Mobile Number</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@email.com or 10-digit mobile"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
                style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
                data-testid="recovery-identifier-input-link"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !identifier.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--btn-primary-bg)" }}
            data-testid="send-reset-link-btn"
          >
            {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending...</> : <><Send className="h-5 w-5" /> Send Reset Link</>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setMode(null); setError(""); }} className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--brand-primary)" }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </div>
    </PageShell>
  );
};

export default ForgotPassword;

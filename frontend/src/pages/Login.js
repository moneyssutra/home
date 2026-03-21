import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Mail, Loader2, ArrowLeft, Lock, Eye, EyeOff, Check } from "lucide-react";
import RegisterForm from "@/components/RegisterForm";
import { LogoFull } from "@/components/Logo";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, loading, checkAuth } = useAuth();

  const urlParams = new URLSearchParams(location.search);
  const inviteCodeFromUrl = urlParams.get("invite") || "";

  // Core step state: "enter" → "otp" → "mpin_setup" | "mpin" → "success"
  const [step, setStep] = useState("enter");
  const [isRegisterMode, setIsRegisterMode] = useState(!!inviteCodeFromUrl);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [resendTimer, setResendTimer] = useState(0);

  // MPIN state
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const [mpinConfirm, setMpinConfirm] = useState(["", "", "", ""]);
  const [mpinStep, setMpinStep] = useState("enter"); // "enter" | "confirm"
  const mpinRefs = useRef([]);
  const mpinConfirmRefs = useRef([]);

  // Temp token from OTP verify
  const [tempToken, setTempToken] = useState(null);
  const [userState, setUserState] = useState(null);

  // Password fallback
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Prefill last email
  useEffect(() => {
    const lastEmail = localStorage.getItem("moneyssutra_last_email");
    if (lastEmail) setIdentifier(lastEmail);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  // OTP resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ============================================================
  // STEP 1: ENTER EMAIL
  // ============================================================
  const handleStart = async (e) => {
    e.preventDefault();
    setError("");
    const email = identifier.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${backendUrl}/api/auth/start`, { identifier: email });
      setStep("otp");
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // STEP 2: OTP VERIFY
  // ============================================================
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const full = [...next].join("");
      if (full.length === 6) handleOtpSubmit(full);
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      otpRefs.current[5]?.focus();
      handleOtpSubmit(paste);
    }
  };

  const handleOtpSubmit = async (otpStr) => {
    const code = otpStr || otp.join("");
    if (code.length !== 6) return;
    setError("");
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${backendUrl}/api/auth/verify-login-otp`, {
        identifier: identifier.trim(),
        otp: code,
      }, { withCredentials: true });

      const data = res.data;
      setTempToken(data.temp_token);
      setUserState(data);

      if (!data.user_exists) {
        // New user → redirect to register
        setIsRegisterMode(true);
        setStep("enter");
        return;
      }

      if (data.status === "authenticated" && data.needs_mpin_setup) {
        // Already logged in but needs MPIN setup
        setStep("mpin_setup");
        setMpinStep("enter");
        setMpin(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
        await checkAuth();
        return;
      }

      if (data.has_mpin) {
        setStep("mpin");
        setMpin(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
      } else {
        // No MPIN, no biometric → should have been auto-logged in
        setStep("success");
        await checkAuth();
        setTimeout(() => navigate(location.state?.from?.pathname || "/home", { replace: true }), 1200);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid code. Try again.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await axios.post(`${backendUrl}/api/auth/start`, { identifier: identifier.trim() });
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resend OTP");
    }
  };

  // ============================================================
  // STEP 3: MPIN LOGIN
  // ============================================================
  const handleMpinChange = (refs, state, setState, index, value, onComplete) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...state];
    next[index] = value;
    setState(next);
    if (value && index < 3) refs.current[index + 1]?.focus();
    if (value && index === 3) {
      const full = next.join("");
      if (full.length === 4 && onComplete) onComplete(full);
    }
  };

  const handleMpinKeyDown = (refs, state, index, e) => {
    if (e.key === "Backspace" && !state[index] && index > 0) refs.current[index - 1]?.focus();
  };

  const handleMpinLogin = async (pinStr) => {
    const pin = pinStr || mpin.join("");
    if (pin.length !== 4) return;
    setError("");
    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/auth/mpin-login`, {
        temp_token: tempToken,
        mpin: pin,
      }, { withCredentials: true });
      setStep("success");
      await checkAuth();
      setTimeout(() => navigate(location.state?.from?.pathname || "/home", { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid MPIN. Try again.");
      setMpin(["", "", "", ""]);
      mpinRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // STEP 3B: MPIN SETUP (first time)
  // ============================================================
  const handleMpinSetupComplete = (pinStr) => {
    if (mpinStep === "enter") {
      setMpinStep("confirm");
      setMpinConfirm(["", "", "", ""]);
      setTimeout(() => mpinConfirmRefs.current[0]?.focus(), 100);
    } else {
      const original = mpin.join("");
      if (pinStr !== original) {
        setError("PINs don't match. Try again.");
        setMpinStep("enter");
        setMpin(["", "", "", ""]);
        setMpinConfirm(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
        return;
      }
      submitMpinSetup(pinStr);
    }
  };

  const submitMpinSetup = async (pinStr) => {
    setError("");
    setIsSubmitting(true);
    try {
      await axios.post(`${backendUrl}/api/auth/mpin-setup-login`, {
        temp_token: tempToken,
        mpin: pinStr,
      }, { withCredentials: true });
      setStep("success");
      await checkAuth();
      setTimeout(() => navigate(location.state?.from?.pathname || "/home", { replace: true }), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set MPIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // PASSWORD FALLBACK
  // ============================================================
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Please enter email and password");
      return;
    }
    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    if (result.success) {
      navigate(location.state?.from?.pathname || "/home", { replace: true });
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  // ============================================================
  // UI COMPONENTS
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
      </div>
    );
  }

  // Register mode
  if (isRegisterMode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="register-page">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 py-8">
          <div className="flex flex-col items-center mb-6"><LogoFull height={100} className="mb-2" /></div>
          <RegisterForm onBackToLogin={() => { setIsRegisterMode(false); setStep("enter"); }} initialInviteCode={inviteCodeFromUrl} />
        </div>
      </div>
    );
  }

  // Password fallback mode
  if (showPasswordFallback) {
    return (
      <PageShell>
        <Card>
          <button onClick={() => { setShowPasswordFallback(false); setStep("enter"); setError(""); }} className="flex items-center gap-2 mb-4 text-sm" style={{ color: "var(--brand-primary)" }} data-testid="back-from-password">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Login with Password</h2>
          <p className="text-sm text-center mb-5" style={{ color: "var(--text-muted)" }}>Enter your credentials</p>
          <ErrorBanner message={error} />
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <InputField icon={<Mail className="h-5 w-5" />} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email ID" testId="pw-identifier-input" />
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
                className="w-full pl-11 pr-12 py-3 rounded-xl outline-none" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="pw-password-input" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: "var(--btn-primary-bg)" }} data-testid="pw-login-btn">
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing In...</> : "Login"}
            </button>
          </form>
          <button onClick={() => navigate("/forgot-password")} className="block w-full text-center mt-3 text-sm" style={{ color: "var(--brand-primary)" }} data-testid="pw-forgot-link">Forgot Password?</button>
        </Card>
      </PageShell>
    );
  }

  // ============================================================
  // STEP SCREENS
  // ============================================================

  return (
    <PageShell>
      {/* STEP: ENTER */}
      {step === "enter" && (
        <Card>
          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }} data-testid="welcome-heading">
            Welcome back
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            Control Your Money. Effortlessly.
          </p>

          <ErrorBanner message={error} />

          <form onSubmit={handleStart} className="space-y-4">
            <InputField icon={<Mail className="h-5 w-5" />} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter your email" testId="identifier-input" autoFocus />
            <button type="submit" disabled={isSubmitting || !identifier.trim()} className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: "var(--btn-primary-bg)" }} data-testid="continue-btn">
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending OTP...</> : "Continue"}
            </button>
          </form>

          {/* Secondary options */}
          <div className="mt-5 space-y-2 text-center">
            <div className="flex items-center justify-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <button onClick={() => setShowPasswordFallback(true)} className="hover:underline" data-testid="use-password-link">Use Password</button>
              <span>|</span>
              <button onClick={() => navigate("/forgot-password")} className="hover:underline" data-testid="need-help-link">Need Help?</button>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              New here?{" "}
              <button onClick={() => setIsRegisterMode(true)} className="font-semibold hover:underline" style={{ color: "var(--brand-primary)" }} data-testid="create-account-link">
                Create Account
              </button>
            </p>
          </div>

          {/* Google login */}
          <div className="flex items-center my-4">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
            <span className="px-3 text-xs" style={{ color: "var(--text-muted)" }}>OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
          </div>
          <button onClick={() => loginWithGoogle(false)} className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-3 transition-all hover:shadow-sm" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="google-login-btn">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </Card>
      )}

      {/* STEP: OTP */}
      {step === "otp" && (
        <Card>
          <button onClick={() => { setStep("enter"); setError(""); setOtp(["","","","","",""]); }} className="flex items-center gap-2 mb-3 text-sm" style={{ color: "var(--brand-primary)" }} data-testid="otp-back-btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            Verify your email
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            Enter the 6-digit code sent to <strong className="break-all">{identifier}</strong>
          </p>

          <ErrorBanner message={error} />

          <div className="flex justify-center gap-2 mb-4" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (otpRefs.current[i] = el)}
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
                data-testid={`otp-digit-${i}`}
              />
            ))}
          </div>

          {isSubmitting && (
            <div className="flex justify-center mb-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            </div>
          )}

          <div className="text-center">
            {resendTimer > 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resend in {resendTimer}s</p>
            ) : (
              <button onClick={handleResend} className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }} data-testid="resend-otp-btn">Resend OTP</button>
            )}
          </div>
        </Card>
      )}

      {/* STEP: MPIN (returning user) */}
      {step === "mpin" && (
        <Card>
          <button onClick={() => { setStep("otp"); setError(""); setMpin(["","","",""]); }} className="flex items-center gap-2 mb-3 text-sm" style={{ color: "var(--brand-primary)" }} data-testid="mpin-back-btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            Enter your secure PIN
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            Enter your 4-digit MPIN to continue
          </p>

          <ErrorBanner message={error} />

          <div className="flex justify-center gap-3 mb-6">
            {mpin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (mpinRefs.current[i] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleMpinChange(mpinRefs, mpin, setMpin, i, e.target.value, handleMpinLogin)}
                onKeyDown={(e) => handleMpinKeyDown(mpinRefs, mpin, i, e)}
                className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all focus:ring-2"
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  border: `2px solid ${digit ? "var(--brand-primary)" : "var(--border-light)"}`,
                  color: "var(--text-primary)",
                }}
                data-testid={`mpin-digit-${i}`}
              />
            ))}
          </div>

          {isSubmitting && (
            <div className="flex justify-center mb-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            </div>
          )}
        </Card>
      )}

      {/* STEP: MPIN SETUP (first time) */}
      {step === "mpin_setup" && (
        <Card>
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            {mpinStep === "enter" ? "Set up your MPIN" : "Confirm your MPIN"}
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            {mpinStep === "enter"
              ? "Create a 4-digit PIN for quick access"
              : "Re-enter your PIN to confirm"}
          </p>

          <ErrorBanner message={error} />

          {mpinStep === "enter" ? (
            <div className="flex justify-center gap-3 mb-6">
              {mpin.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (mpinRefs.current[i] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleMpinChange(mpinRefs, mpin, setMpin, i, e.target.value, handleMpinSetupComplete)}
                  onKeyDown={(e) => handleMpinKeyDown(mpinRefs, mpin, i, e)}
                  className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: "var(--bg-subtle)", border: `2px solid ${digit ? "var(--brand-primary)" : "var(--border-light)"}`, color: "var(--text-primary)" }}
                  data-testid={`mpin-setup-digit-${i}`}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center gap-3 mb-6">
              {mpinConfirm.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (mpinConfirmRefs.current[i] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleMpinChange(mpinConfirmRefs, mpinConfirm, setMpinConfirm, i, e.target.value, handleMpinSetupComplete)}
                  onKeyDown={(e) => handleMpinKeyDown(mpinConfirmRefs, mpinConfirm, i, e)}
                  className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all focus:ring-2"
                  style={{ backgroundColor: "var(--bg-subtle)", border: `2px solid ${digit ? "var(--brand-primary)" : "var(--border-light)"}`, color: "var(--text-primary)" }}
                  data-testid={`mpin-confirm-digit-${i}`}
                />
              ))}
            </div>
          )}

          {isSubmitting && (
            <div className="flex justify-center mb-3">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} />
            </div>
          )}

          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
                backgroundColor: (mpinStep === "enter" ? mpin[i] : mpinConfirm[i]) ? "var(--brand-primary)" : "var(--border-light)",
              }} />
            ))}
          </div>
        </Card>
      )}

      {/* STEP: SUCCESS */}
      {step === "success" && (
        <Card>
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce" style={{ backgroundColor: "var(--status-success-soft)" }}>
              <Check className="h-10 w-10" style={{ color: "var(--status-success)" }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }} data-testid="success-heading">
              You're in
            </h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecting to your dashboard...</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
};

// ============================================================
// SHARED UI COMPONENTS
// ============================================================

const PageShell = ({ children }) => (
  <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="login-page">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
    </div>
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
      <div className="flex flex-col items-center mb-8">
        <LogoFull height={120} className="mb-3" />
      </div>
      {children}
    </div>
    <div className="relative z-10 pb-6">
      <p className="text-center text-xs" style={{ color: "#333333" }}>
        By signing in, you agree to our{" "}
        <a href="/terms-of-service" className="underline font-medium" style={{ color: "#1A1A1A" }}>Terms</a>
        {" "}and{" "}
        <a href="/privacy-policy" className="underline font-medium" style={{ color: "#1A1A1A" }}>Privacy Policy</a>
      </p>
    </div>
  </div>
);

const Card = ({ children }) => (
  <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
    {children}
  </div>
);

const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }} data-testid="error-banner">
      <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
      <p className="text-sm" style={{ color: "var(--status-error)" }}>{message}</p>
    </div>
  );
};

const InputField = ({ icon, value, onChange, placeholder, testId, autoFocus }) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>{icon}</div>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
      style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
      data-testid={testId}
    />
  </div>
);

export default Login;

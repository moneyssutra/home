import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Mail, Loader2, ArrowLeft, Lock, Eye, EyeOff, Check } from "lucide-react";
import RegisterForm from "@/components/RegisterForm";
import { LogoFull } from "@/components/Logo";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, loading, checkAuth } = useAuth();
  const inviteCodeFromUrl = new URLSearchParams(location.search).get("invite") || "";

  // Steps: "enter" → "mpin" | "otp" → "mpin_setup" → "success"
  // Also: "forgot_mpin_otp" → "reset_mpin" for forgot MPIN flow
  const [step, setStep] = useState("enter");
  const [isRegisterMode, setIsRegisterMode] = useState(!!inviteCodeFromUrl);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);
  const [resendTimer, setResendTimer] = useState(0);

  // MPIN
  const [mpin, setMpin] = useState(["", "", "", ""]);
  const [mpinConfirm, setMpinConfirm] = useState(["", "", "", ""]);
  const [mpinStep, setMpinStep] = useState("enter");
  const mpinRefs = useRef([]);
  const mpinConfirmRefs = useRef([]);

  // Temp token (from OTP verify for new user / forgot MPIN)
  const [tempToken, setTempToken] = useState(null);

  // Password fallback
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Prefill last email
  useEffect(() => {
    const last = localStorage.getItem("moneyssutra_last_email");
    if (last) setIdentifier(last);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) navigate(location.state?.from?.pathname || "/home", { replace: true });
  }, [isAuthenticated, loading, navigate, location]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const goHome = () => navigate(location.state?.from?.pathname || "/home", { replace: true });

  // ============================================================
  // STEP 1: CHECK USER
  // ============================================================
  const handleContinue = async (e) => {
    e.preventDefault();
    setError("");
    const email = identifier.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/auth/check-user`, { identifier: email });
      const { user_exists, has_mpin } = res.data;
      setFirstName(res.data.firstName || "");
      localStorage.setItem("moneyssutra_last_email", email);

      if (!user_exists) {
        // New user → Register
        setIsRegisterMode(true);
        return;
      }

      if (has_mpin) {
        // Has MPIN → go directly to MPIN screen
        setStep("mpin");
        setMpin(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
      } else {
        // No MPIN → send OTP → setup MPIN
        await sendOtp(email);
        setStep("otp");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // OTP HELPERS
  // ============================================================
  const sendOtp = async (email) => {
    await axios.post(`${API}/api/auth/start`, { identifier: email || identifier.trim() });
    setResendTimer(30);
    setOtp(["", "", "", "", "", ""]);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
    if (v && i === 5) { const full = next.join(""); if (full.length === 6) submitOtp(full); }
  };
  const handleOtpKey = (i, e) => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); };
  const handleOtpPaste = (e) => {
    const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (p.length === 6) { setOtp(p.split("")); otpRefs.current[5]?.focus(); submitOtp(p); }
  };

  const submitOtp = async (code) => {
    if (code.length !== 6) return;
    setError(""); setIsSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/auth/verify-login-otp`, {
        identifier: identifier.trim(), otp: code,
      }, { withCredentials: true });

      const d = res.data;
      setTempToken(d.temp_token);

      if (!d.user_exists) { setIsRegisterMode(true); return; }

      if (d.status === "authenticated" && d.needs_mpin_setup) {
        setStep("mpin_setup"); setMpinStep("enter"); setMpin(["", "", "", ""]);
        await checkAuth();
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
        return;
      }

      if (d.has_mpin) {
        setStep("mpin"); setMpin(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
      } else {
        setStep("success"); await checkAuth();
        setTimeout(goHome, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid code. Try again.");
      setOtp(["", "", "", "", "", ""]); otpRefs.current[0]?.focus();
    } finally { setIsSubmitting(false); }
  };

  // ============================================================
  // MPIN HELPERS
  // ============================================================
  const pinChange = (refs, state, setState, i, v, onComplete) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...state]; next[i] = v; setState(next);
    if (v && i < 3) refs.current[i + 1]?.focus();
    if (v && i === 3 && next.join("").length === 4 && onComplete) onComplete(next.join(""));
  };
  const pinKey = (refs, state, i, e) => { if (e.key === "Backspace" && !state[i] && i > 0) refs.current[i - 1]?.focus(); };

  // Direct MPIN login (no OTP)
  const handleMpinLogin = async (pin) => {
    if (pin.length !== 4) return;
    setError(""); setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/auth/mpin-direct-login`, {
        email: identifier.trim(), mpin: pin,
      }, { withCredentials: true });
      setStep("success"); await checkAuth();
      setTimeout(goHome, 1200);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || "Invalid MPIN. Try again.";
      setError(detail);
      if (status === 429) {
        // Locked out — show forgot MPIN option prominently
        setMpin(["", "", "", ""]);
      } else {
        setMpin(["", "", "", ""]); mpinRefs.current[0]?.focus();
      }
    } finally { setIsSubmitting(false); }
  };

  // MPIN setup (first time, after OTP)
  const handleMpinSetupComplete = (pin) => {
    if (mpinStep === "enter") {
      setMpinStep("confirm"); setMpinConfirm(["", "", "", ""]);
      setTimeout(() => mpinConfirmRefs.current[0]?.focus(), 100);
    } else {
      if (pin !== mpin.join("")) {
        setError("PINs don't match. Try again.");
        setMpinStep("enter"); setMpin(["", "", "", ""]); setMpinConfirm(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
        return;
      }
      submitMpinSetup(pin);
    }
  };

  const submitMpinSetup = async (pin) => {
    setError(""); setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/auth/mpin-setup-login`, {
        temp_token: tempToken, mpin: pin,
      }, { withCredentials: true });
      setStep("success"); await checkAuth();
      setTimeout(goHome, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set MPIN");
    } finally { setIsSubmitting(false); }
  };

  // ============================================================
  // FORGOT MPIN FLOW
  // ============================================================
  const handleForgotMpin = async () => {
    setError(""); setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/auth/forgot-mpin`, { email: identifier.trim() });
      setStep("forgot_mpin_otp");
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send OTP");
    } finally { setIsSubmitting(false); }
  };

  const submitForgotMpinOtp = async (code) => {
    if (code.length !== 6) return;
    setStep("reset_mpin");
    setMpin(["", "", "", ""]); setMpinStep("enter");
    // Store the OTP for the final reset call
    setTempToken(code);
    setTimeout(() => mpinRefs.current[0]?.focus(), 100);
  };

  const handleResetMpinComplete = (pin) => {
    if (mpinStep === "enter") {
      setMpinStep("confirm"); setMpinConfirm(["", "", "", ""]);
      setTimeout(() => mpinConfirmRefs.current[0]?.focus(), 100);
    } else {
      if (pin !== mpin.join("")) {
        setError("PINs don't match. Try again.");
        setMpinStep("enter"); setMpin(["", "", "", ""]); setMpinConfirm(["", "", "", ""]);
        setTimeout(() => mpinRefs.current[0]?.focus(), 100);
        return;
      }
      submitResetMpin(pin);
    }
  };

  const submitResetMpin = async (pin) => {
    setError(""); setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/auth/reset-mpin`, {
        email: identifier.trim(), otp: tempToken, new_mpin: pin,
      }, { withCredentials: true });
      setStep("success"); await checkAuth();
      setTimeout(goHome, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset MPIN");
    } finally { setIsSubmitting(false); }
  };

  // ============================================================
  // PASSWORD FALLBACK
  // ============================================================
  const handlePasswordLogin = async (e) => {
    e.preventDefault(); setError("");
    if (!identifier.trim() || !password) { setError("Enter email and password"); return; }
    setIsSubmitting(true);
    const result = await login(identifier.trim(), password);
    if (result.success) goHome(); else setError(result.error);
    setIsSubmitting(false);
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }} />
    </div>;
  }

  if (isRegisterMode) {
    return (
      <PageShell>
        <RegisterForm onBackToLogin={() => { setIsRegisterMode(false); setStep("enter"); }} initialInviteCode={inviteCodeFromUrl} />
      </PageShell>
    );
  }

  if (showPasswordFallback) {
    return (
      <PageShell>
        <Card>
          <BackBtn onClick={() => { setShowPasswordFallback(false); setStep("enter"); setError(""); }} testId="back-from-password" />
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Login with Password</h2>
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
            <PrimaryBtn disabled={isSubmitting} testId="pw-login-btn">{isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Signing In...</> : "Login"}</PrimaryBtn>
          </form>
          <button onClick={() => navigate("/forgot-password", { state: { email: identifier.trim() } })} className="block w-full text-center mt-3 text-sm" style={{ color: "var(--brand-primary)" }} data-testid="pw-forgot-link">Forgot Password?</button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* STEP: ENTER EMAIL */}
      {step === "enter" && (
        <Card>
          <h2 className="text-2xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }} data-testid="welcome-heading">Welcome back</h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>Control Your Money. Effortlessly.</p>
          <ErrorBanner message={error} />
          <form onSubmit={handleContinue} className="space-y-4">
            <InputField icon={<Mail className="h-5 w-5" />} value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Enter your email" testId="identifier-input" autoFocus />
            <PrimaryBtn disabled={isSubmitting || !identifier.trim()} testId="continue-btn">
              {isSubmitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Checking...</> : "Continue"}
            </PrimaryBtn>
          </form>
          <SecondaryLinks>
            <button onClick={() => setShowPasswordFallback(true)} className="hover:underline" data-testid="use-password-link">Use Password</button>
            <span>|</span>
            <button onClick={() => navigate("/forgot-password", { state: { email: identifier.trim() } })} className="hover:underline" data-testid="need-help-link">Need Help?</button>
          </SecondaryLinks>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
            New here? <button onClick={() => setIsRegisterMode(true)} className="font-semibold hover:underline" style={{ color: "var(--brand-primary)" }} data-testid="create-account-link">Create Account</button>
          </p>
          <Divider />
          <GoogleBtn onClick={() => loginWithGoogle(false)} />
        </Card>
      )}

      {/* STEP: MPIN (direct, no OTP) */}
      {step === "mpin" && (
        <Card>
          <BackBtn onClick={() => { setStep("enter"); setError(""); setMpin(["","","",""]); }} testId="mpin-back-btn" />
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            {firstName ? `Hi, ${firstName}` : "Enter your secure PIN"}
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>Enter your 4-digit MPIN</p>
          <ErrorBanner message={error} />
          <PinInputRow refs={mpinRefs} state={mpin} setState={setMpin} onChange={(i, v) => pinChange(mpinRefs, mpin, setMpin, i, v, handleMpinLogin)} onKeyDown={(i, e) => pinKey(mpinRefs, mpin, i, e)} prefix="mpin-digit" />
          {isSubmitting && <SpinnerRow />}
          <button onClick={handleForgotMpin} disabled={isSubmitting} className="block w-full text-center mt-4 text-xs font-medium" style={{ color: "var(--brand-primary)" }} data-testid="forgot-mpin-btn">
            Forgot MPIN?
          </button>
        </Card>
      )}

      {/* STEP: OTP (for new MPIN setup / no MPIN users) */}
      {step === "otp" && (
        <Card>
          <BackBtn onClick={() => { setStep("enter"); setError(""); setOtp(["","","","","",""]); }} testId="otp-back-btn" />
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>Verify your email</h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>6-digit code sent to <strong className="break-all">{identifier}</strong></p>
          <ErrorBanner message={error} />
          <OtpInputRow refs={otpRefs} state={otp} onChange={handleOtpChange} onKeyDown={handleOtpKey} onPaste={handleOtpPaste} />
          {isSubmitting && <SpinnerRow />}
          <ResendRow timer={resendTimer} onResend={() => sendOtp(identifier.trim())} />
        </Card>
      )}

      {/* STEP: MPIN SETUP (first time, after OTP) */}
      {step === "mpin_setup" && (
        <Card>
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            {mpinStep === "enter" ? "Set up your MPIN" : "Confirm your MPIN"}
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            {mpinStep === "enter" ? "Create a 4-digit PIN for quick access" : "Re-enter your PIN to confirm"}
          </p>
          <ErrorBanner message={error} />
          {mpinStep === "enter"
            ? <PinInputRow refs={mpinRefs} state={mpin} setState={setMpin} onChange={(i, v) => pinChange(mpinRefs, mpin, setMpin, i, v, handleMpinSetupComplete)} onKeyDown={(i, e) => pinKey(mpinRefs, mpin, i, e)} prefix="mpin-setup-digit" />
            : <PinInputRow refs={mpinConfirmRefs} state={mpinConfirm} setState={setMpinConfirm} onChange={(i, v) => pinChange(mpinConfirmRefs, mpinConfirm, setMpinConfirm, i, v, handleMpinSetupComplete)} onKeyDown={(i, e) => pinKey(mpinConfirmRefs, mpinConfirm, i, e)} prefix="mpin-confirm-digit" />
          }
          {isSubmitting && <SpinnerRow />}
          <DotIndicator filled={mpinStep === "enter" ? mpin : mpinConfirm} />
        </Card>
      )}

      {/* STEP: FORGOT MPIN — OTP */}
      {step === "forgot_mpin_otp" && (
        <Card>
          <BackBtn onClick={() => { setStep("mpin"); setError(""); setOtp(["","","","","",""]); }} testId="forgot-mpin-otp-back" />
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>Reset your MPIN</h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>Enter the 6-digit code sent to <strong className="break-all">{identifier}</strong></p>
          <ErrorBanner message={error} />
          <OtpInputRow refs={otpRefs} state={otp} onChange={(i, v) => {
            if (!/^\d?$/.test(v)) return;
            const next = [...otp]; next[i] = v; setOtp(next);
            if (v && i < 5) otpRefs.current[i + 1]?.focus();
            if (v && i === 5 && next.join("").length === 6) submitForgotMpinOtp(next.join(""));
          }} onKeyDown={handleOtpKey} onPaste={(e) => {
            const p = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (p.length === 6) { setOtp(p.split("")); submitForgotMpinOtp(p); }
          }} />
          <ResendRow timer={resendTimer} onResend={handleForgotMpin} />
        </Card>
      )}

      {/* STEP: RESET MPIN (new PIN after OTP) */}
      {step === "reset_mpin" && (
        <Card>
          <h2 className="text-xl font-bold mb-1 text-center" style={{ color: "var(--text-primary)" }}>
            {mpinStep === "enter" ? "Set new MPIN" : "Confirm new MPIN"}
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
            {mpinStep === "enter" ? "Create your new 4-digit PIN" : "Re-enter to confirm"}
          </p>
          <ErrorBanner message={error} />
          {mpinStep === "enter"
            ? <PinInputRow refs={mpinRefs} state={mpin} setState={setMpin} onChange={(i, v) => pinChange(mpinRefs, mpin, setMpin, i, v, handleResetMpinComplete)} onKeyDown={(i, e) => pinKey(mpinRefs, mpin, i, e)} prefix="reset-mpin-digit" />
            : <PinInputRow refs={mpinConfirmRefs} state={mpinConfirm} setState={setMpinConfirm} onChange={(i, v) => pinChange(mpinConfirmRefs, mpinConfirm, setMpinConfirm, i, v, handleResetMpinComplete)} onKeyDown={(i, e) => pinKey(mpinConfirmRefs, mpinConfirm, i, e)} prefix="reset-mpin-confirm-digit" />
          }
          {isSubmitting && <SpinnerRow />}
          <DotIndicator filled={mpinStep === "enter" ? mpin : mpinConfirm} />
        </Card>
      )}

      {/* STEP: SUCCESS */}
      {step === "success" && (
        <Card>
          <div className="text-center py-6">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce" style={{ backgroundColor: "var(--status-success-soft)" }}>
              <Check className="h-10 w-10" style={{ color: "var(--status-success)" }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }} data-testid="success-heading">You're in</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Redirecting to your dashboard...</p>
          </div>
        </Card>
      )}
    </PageShell>
  );
};

// ============================================================
// SHARED UI PRIMITIVES
// ============================================================
const PageShell = ({ children }) => (
  <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="login-page">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
    </div>
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
      <div className="flex flex-col items-center mb-8"><LogoFull height={120} className="mb-3" /></div>
      {children}
    </div>
    <div className="relative z-10 pb-6">
      <p className="text-center text-xs" style={{ color: "#333" }}>
        By signing in, you agree to our <a href="/terms-of-service" className="underline font-medium" style={{ color: "#1A1A1A" }}>Terms</a> and <a href="/privacy-policy" className="underline font-medium" style={{ color: "#1A1A1A" }}>Privacy Policy</a>
      </p>
    </div>
  </div>
);

const Card = ({ children }) => <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>{children}</div>;

const ErrorBanner = ({ message }) => !message ? null : (
  <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }} data-testid="error-banner">
    <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
    <p className="text-sm" style={{ color: "var(--status-error)" }}>{message}</p>
  </div>
);

const InputField = ({ icon, value, onChange, placeholder, testId, autoFocus }) => (
  <div className="relative">
    <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>{icon}</div>
    <input type="text" value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
      className="w-full pl-11 pr-4 py-3 rounded-xl outline-none" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid={testId} />
  </div>
);

const PrimaryBtn = ({ children, disabled, testId, type = "submit" }) => (
  <button type={type} disabled={disabled} className="w-full py-3.5 rounded-xl font-semibold text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
    style={{ backgroundColor: "var(--btn-primary-bg)" }} data-testid={testId}>{children}</button>
);

const BackBtn = ({ onClick, testId }) => (
  <button onClick={onClick} className="flex items-center gap-2 mb-3 text-sm" style={{ color: "var(--brand-primary)" }} data-testid={testId}>
    <ArrowLeft className="h-4 w-4" /> Back
  </button>
);

const SecondaryLinks = ({ children }) => (
  <div className="mt-5 mb-2 flex items-center justify-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>{children}</div>
);

const Divider = () => (
  <div className="flex items-center my-4">
    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
    <span className="px-3 text-xs" style={{ color: "var(--text-muted)" }}>OR</span>
    <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
  </div>
);

const GoogleBtn = ({ onClick }) => (
  <button onClick={onClick} className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-3 hover:shadow-sm"
    style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="google-login-btn">
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" /> Continue with Google
  </button>
);

const OtpInputRow = ({ refs, state, onChange, onKeyDown, onPaste }) => (
  <div className="flex justify-center gap-2 mb-4" onPaste={onPaste}>
    {state.map((d, i) => (
      <input key={i} ref={(el) => (refs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={d}
        onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)}
        className="w-11 h-13 text-center text-xl font-bold rounded-xl outline-none transition-all focus:ring-2"
        style={{ backgroundColor: "var(--bg-subtle)", border: `2px solid ${d ? "var(--brand-primary)" : "var(--border-light)"}`, color: "var(--text-primary)" }}
        data-testid={`otp-digit-${i}`} />
    ))}
  </div>
);

const PinInputRow = ({ refs, state, onChange, onKeyDown, prefix }) => (
  <div className="flex justify-center gap-3 mb-4">
    {state.map((d, i) => (
      <input key={i} ref={(el) => (refs.current[i] = el)} type="password" inputMode="numeric" maxLength={1} value={d}
        onChange={(e) => onChange(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)}
        className="w-14 h-14 text-center text-2xl font-bold rounded-xl outline-none transition-all focus:ring-2"
        style={{ backgroundColor: "var(--bg-subtle)", border: `2px solid ${d ? "var(--brand-primary)" : "var(--border-light)"}`, color: "var(--text-primary)" }}
        data-testid={`${prefix}-${i}`} />
    ))}
  </div>
);

const SpinnerRow = () => <div className="flex justify-center mb-3"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--brand-primary)" }} /></div>;
const ResendRow = ({ timer, onResend }) => (
  <div className="text-center">
    {timer > 0 ? <p className="text-xs" style={{ color: "var(--text-muted)" }}>Resend in {timer}s</p>
      : <button onClick={onResend} className="text-xs font-semibold" style={{ color: "var(--brand-primary)" }} data-testid="resend-otp-btn">Resend OTP</button>}
  </div>
);
const DotIndicator = ({ filled }) => (
  <div className="flex justify-center gap-2 mt-2">
    {[0, 1, 2, 3].map((i) => <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{ backgroundColor: filled[i] ? "var(--brand-primary)" : "var(--border-light)" }} />)}
  </div>
);

export default Login;

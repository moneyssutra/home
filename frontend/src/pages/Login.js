import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock, Eye, EyeOff, AlertCircle, Mail, Loader2, ArrowLeft, Check } from "lucide-react";
import RegisterForm from "@/components/RegisterForm";
import { LogoIcon, LogoWordmark } from "@/components/Logo";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, isAuthenticated, loading } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: enter email/mobile, 2: success
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  // Validate identifier (email or 10-digit mobile)
  const isValidIdentifier = (value) => {
    if (!value) return false;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isMobile = /^\d{10}$/.test(value);
    return isEmail || isMobile;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) {
      setError("Please enter your email ID or mobile number");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsSubmitting(true);
    const result = await login(identifier, password, rememberMe);
    
    if (result.success) {
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setError("");
    setIdentifier("");
    setPassword("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!identifier.trim()) {
      setError("Please enter your registered email ID or mobile number");
      return;
    }

    if (!isValidIdentifier(identifier.trim())) {
      setError("Please enter a valid email address or 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${backendUrl}/api/auth/forgot-password`, {
        username: identifier.trim()
      });
      setSuccessMessage(response.data.message);
      setForgotPasswordStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to process request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForgotPassword = () => {
    setIsForgotPasswordMode(false);
    setForgotPasswordStep(1);
    setIdentifier("");
    setError("");
    setSuccessMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }}></div>
      </div>
    );
  }

  // Show Register Form
  if (isRegisterMode) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="register-page">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 py-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-lg border border-white/30">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Moneyssutra
            </h1>
          </div>
          
          <RegisterForm onBackToLogin={() => setIsRegisterMode(false)} />
        </div>
        
        {/* Footer */}
        <div className="relative z-10 pb-4">
          <p className="text-center text-white/50 text-xs">
            By signing in, you agree to our{" "}
            <span className="text-white/70 hover:text-white cursor-pointer">Terms of Service</span>
            {" "}and{" "}
            <span className="text-white/70 hover:text-white cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="login-page">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg border border-white/30">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Moneyssutra
          </h1>
          <p className="text-white/70 text-sm">Your Personal Finance Tracker</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
          {/* Forgot Password Mode */}
          {isForgotPasswordMode ? (
            <>
              {/* Back Button */}
              <button
                onClick={resetForgotPassword}
                className="flex items-center gap-2 mb-4 text-sm hover:underline"
                style={{ color: "var(--brand-primary)" }}
                data-testid="back-to-login-btn"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </button>

              <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
                Forgot Password
              </h2>
              
              {forgotPasswordStep === 1 ? (
                <>
                  <p className="text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
                    Enter your registered email ID or mobile number to receive a password reset link.
                  </p>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
                      <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
                      <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
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
                          className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                          style={{ 
                            backgroundColor: "var(--bg-subtle)", 
                            border: "1px solid var(--border-light)",
                            color: "var(--text-primary)"
                          }}
                          data-testid="forgot-password-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !identifier.trim()}
                      className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: "var(--brand-primary)" }}
                      data-testid="forgot-password-submit"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* Step 2: Success */
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
                    <Check className="h-8 w-8" style={{ color: "var(--status-success)" }} />
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    Check Your Email
                  </h3>
                  <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                    {successMessage || "If an account exists, you will receive a password reset link shortly."}
                  </p>
                  <button
                    onClick={resetForgotPassword}
                    className="py-2 px-6 rounded-xl font-medium"
                    style={{ backgroundColor: "var(--brand-primary)", color: "white" }}
                    data-testid="back-to-login-success-btn"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Normal Login Form */
            <>
              <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "var(--text-primary)" }}>
                Welcome Back
              </h2>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
                  <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
                  <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email or Mobile */}
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
                      className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                      style={{ 
                        backgroundColor: "var(--bg-subtle)", 
                        border: "1px solid var(--border-light)",
                        color: "var(--text-primary)"
                      }}
                      data-testid="identifier-input"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                      style={{ 
                        backgroundColor: "var(--bg-subtle)", 
                        border: "1px solid var(--border-light)",
                        color: "var(--text-primary)"
                      }}
                      data-testid="password-input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <Eye className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-2 cursor-pointer accent-[var(--brand-primary)]"
                      style={{ borderColor: "var(--border-light)" }}
                      data-testid="remember-me-checkbox"
                    />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      Remember me
                    </span>
                  </label>
                  <button 
                    type="button"
                    onClick={() => { setIsForgotPasswordMode(true); setError(""); }}
                    className="text-sm hover:underline"
                    style={{ color: "var(--brand-primary)" }}
                    data-testid="forgot-password-link"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !identifier.trim() || !password}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                  data-testid="login-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </form>

              {/* Create Account Link */}
              <p className="text-center mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                New to Moneyssutra?{" "}
                <button
                  onClick={toggleMode}
                  className="font-semibold hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                  data-testid="create-account-link"
                >
                  Create Account
                </button>
              </p>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--border-light)" }}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2" style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)" }}>OR</span>
                </div>
              </div>

              {/* Google Login */}
              <button
                onClick={loginWithGoogle}
                className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:shadow-md"
                style={{ 
                  backgroundColor: "var(--bg-subtle)", 
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)"
                }}
                data-testid="google-login-btn"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 pb-6">
        <p className="text-center text-white/50 text-xs">
          By signing in, you agree to our{" "}
          <a href="/terms-of-service" className="text-white/70 hover:text-white underline" data-testid="login-terms-link">Terms of Service</a>
          {" "}and{" "}
          <a href="/privacy-policy" className="text-white/70 hover:text-white underline" data-testid="login-privacy-link">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default Login;

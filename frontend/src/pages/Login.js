import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Lock, User, Eye, EyeOff, AlertCircle, Mail, UserPlus, LogIn, Check, X, Loader2 } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithGoogle, isAuthenticated, loading } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real-time validation states for registration
  const [nameAvailable, setNameAvailable] = useState(null); // null = not checked, true = available, false = taken
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [checkingName, setCheckingName] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

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

  // Debounced check for username availability
  const checkUsernameAvailability = useCallback(async (username) => {
    if (!username || username.length < 2) {
      setNameAvailable(null);
      return;
    }
    
    setCheckingName(true);
    try {
      const response = await axios.post(`${backendUrl}/api/auth/check-availability`, {
        username: username
      });
      setNameAvailable(response.data.username_available);
    } catch (err) {
      console.error("Error checking username:", err);
      setNameAvailable(null);
    } finally {
      setCheckingName(false);
    }
  }, []);

  // Debounced check for email availability
  const checkEmailAvailability = useCallback(async (emailValue) => {
    if (!emailValue || !emailValue.includes("@")) {
      setEmailAvailable(null);
      return;
    }
    
    setCheckingEmail(true);
    try {
      const response = await axios.post(`${backendUrl}/api/auth/check-availability`, {
        email: emailValue
      });
      setEmailAvailable(response.data.email_available);
    } catch (err) {
      console.error("Error checking email:", err);
      setEmailAvailable(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  // Debounce effect for username
  useEffect(() => {
    if (!isRegisterMode) return;
    
    const timer = setTimeout(() => {
      if (name.trim()) {
        checkUsernameAvailability(name.trim());
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [name, isRegisterMode, checkUsernameAvailability]);

  // Debounce effect for email (only in register mode)
  useEffect(() => {
    if (!isRegisterMode) return;
    
    const timer = setTimeout(() => {
      if (email.trim()) {
        checkEmailAvailability(email.trim());
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [email, isRegisterMode, checkEmailAvailability]);

  // Check if registration form is valid
  const isRegistrationValid = () => {
    if (!isRegisterMode) return true;
    return (
      name.trim().length >= 2 &&
      email.trim().includes("@") &&
      password.length >= 4 &&
      password === confirmPassword &&
      nameAvailable === true &&
      emailAvailable === true
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegisterMode) {
      if (!name.trim()) {
        setError("Please enter your name");
        return;
      }
      if (!email.trim()) {
        setError("Please enter your email");
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setIsSubmitting(true);

    let result;
    if (isRegisterMode) {
      result = await register(name, email, password);
    } else {
      result = await login(email, password);
    }
    
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
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    // Reset validation states
    setNameAvailable(null);
    setEmailAvailable(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }}></div>
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

        {/* Auth Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
          <h2 className="text-xl font-bold mb-6 text-center" style={{ color: "var(--text-primary)" }}>
            {isRegisterMode ? "Create Account" : "Welcome Back"}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
              <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - only for registration */}
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Username (Display Name)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameAvailable(null); // Reset while typing
                    }}
                    placeholder="Enter your username"
                    className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                    style={{ 
                      backgroundColor: "var(--bg-subtle)", 
                      border: nameAvailable === false ? "1px solid var(--status-error)" : nameAvailable === true ? "1px solid var(--status-success)" : "1px solid var(--border-light)",
                      color: "var(--text-primary)"
                    }}
                    data-testid="name-input"
                  />
                  {/* Validation indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingName && (
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
                    )}
                    {!checkingName && nameAvailable === true && (
                      <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />
                    )}
                    {!checkingName && nameAvailable === false && (
                      <X className="h-5 w-5" style={{ color: "var(--status-error)" }} />
                    )}
                  </div>
                </div>
                {/* Availability message */}
                {nameAvailable === false && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>
                    This username is already taken
                  </p>
                )}
                {nameAvailable === true && (
                  <p className="mt-1 text-xs" style={{ color: "var(--status-success)" }}>
                    Username is available
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                {isRegisterMode ? "Email" : "Username / Email"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={isRegisterMode ? "email" : "text"}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isRegisterMode) setEmailAvailable(null); // Reset while typing
                  }}
                  placeholder={isRegisterMode ? "Enter your email" : "Enter username or email"}
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)", 
                    border: isRegisterMode && emailAvailable === false ? "1px solid var(--status-error)" : isRegisterMode && emailAvailable === true ? "1px solid var(--status-success)" : "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="username-input"
                  required
                />
                {/* Validation indicator - only in register mode */}
                {isRegisterMode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingEmail && (
                      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--text-muted)" }} />
                    )}
                    {!checkingEmail && emailAvailable === true && (
                      <Check className="h-5 w-5" style={{ color: "var(--status-success)" }} />
                    )}
                    {!checkingEmail && emailAvailable === false && (
                      <X className="h-5 w-5" style={{ color: "var(--status-error)" }} />
                    )}
                  </div>
                )}
              </div>
              {/* Email availability message - only in register mode */}
              {isRegisterMode && emailAvailable === false && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-error)" }}>
                  This email is already registered
                </p>
              )}
              {isRegisterMode && emailAvailable === true && (
                <p className="mt-1 text-xs" style={{ color: "var(--status-success)" }}>
                  Email is available
                </p>
              )}
            </div>

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
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - only for registration */}
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                    style={{ 
                      backgroundColor: "var(--bg-subtle)", 
                      border: "1px solid var(--border-light)",
                      color: "var(--text-primary)"
                    }}
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (isRegisterMode && !isRegistrationValid())}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="login-button"
            >
              {isSubmitting ? (
                isRegisterMode ? "Creating Account..." : "Signing in..."
              ) : (
                <>
                  {isRegisterMode ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                  {isRegisterMode ? "Create Account" : "Sign In"}
                </>
              )}
            </button>
          </form>

          {/* Forgot Password Link - only in login mode */}
          {!isRegisterMode && (
            <div className="mt-3 text-center">
              <Link
                to="/forgot-password"
                className="text-sm transition-colors hover:underline"
                style={{ color: "var(--brand-primary)" }}
                data-testid="forgot-password-link"
              >
                Forgot Username / Password?
              </Link>
            </div>
          )}

          {/* Toggle Login/Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              data-testid="toggle-auth-mode"
            >
              {isRegisterMode ? (
                <>Already have an account? <span className="font-semibold" style={{ color: "var(--brand-primary)" }}>Sign In</span></>
              ) : (
                <>New to Moneyssutra? <span className="font-semibold" style={{ color: "var(--brand-primary)" }}>Create Account</span></>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
            <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "var(--border-light)" }} />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-3"
            style={{ 
              backgroundColor: "var(--bg-card)", 
              border: "1px solid var(--border-light)",
              color: "var(--text-primary)"
            }}
            data-testid="google-login-button"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-white/50 text-xs text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Lock, User, Eye, EyeOff, AlertCircle, Mail, UserPlus, LogIn } from "lucide-react";

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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  // Check for error from OAuth redirect
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegisterMode) {
      // Validation for registration
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00C853] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3B] via-[#111827] to-[#0B1F3B] flex flex-col" data-testid="login-page">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#00C853]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FFB300]/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo & Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00C853] to-[#1DB954] flex items-center justify-center mb-4 shadow-lg shadow-[#00C853]/20">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Moneyssutra
          </h1>
          <p className="text-white/50 text-sm">Your Personal Finance Tracker</p>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-[#1F2937] mb-6 text-center">
            {isRegisterMode ? "Create Account" : "Welcome Back"}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#E53935] flex-shrink-0" />
              <p className="text-sm text-[#E53935]">{error}</p>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field - only for registration */}
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 outline-none transition-all text-[#1F2937]"
                    data-testid="name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1.5">
                {isRegisterMode ? "Email" : "Username / Email"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                <input
                  type={isRegisterMode ? "email" : "text"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isRegisterMode ? "Enter your email" : "Enter username or email"}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 outline-none transition-all text-[#1F2937]"
                  data-testid="username-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#6B7280] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 outline-none transition-all text-[#1F2937]"
                  data-testid="password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password - only for registration */}
            {isRegisterMode && (
              <div>
                <label className="block text-sm font-medium text-[#6B7280] mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#00C853] focus:ring-2 focus:ring-[#00C853]/20 outline-none transition-all text-[#1F2937]"
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00C853] to-[#1DB954] text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* Toggle Login/Register */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-[#6B7280] hover:text-[#00C853] transition-colors"
              data-testid="toggle-auth-mode"
            >
              {isRegisterMode ? (
                <>Already have an account? <span className="font-semibold text-[#00C853]">Sign In</span></>
              ) : (
                <>New to Moneyssutra? <span className="font-semibold text-[#00C853]">Create Account</span></>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-[#6B7280] uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="w-full py-3 rounded-xl border border-gray-200 text-[#1F2937] font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
            data-testid="google-login-button"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <p className="mt-8 text-white/30 text-xs text-center">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;

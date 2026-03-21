import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import axios from "axios";
import { LogoFull } from "@/components/Logo";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [tokenError, setTokenError] = useState("");

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setTokenError("No reset token provided");
        return;
      }

      try {
        const response = await axios.get(`${backendUrl}/api/auth/verify-reset-token?token=${token}`);
        setTokenValid(response.data.valid);
        if (!response.data.valid) {
          setTokenError(response.data.message || "Invalid or expired reset link");
        }
      } catch (err) {
        setTokenValid(false);
        setTokenError("Unable to verify reset link");
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${backendUrl}/api/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while verifying token
  if (tokenValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: "var(--brand-primary-soft)", borderTopColor: "var(--brand-primary)" }}></div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <LogoFull height={120} className="mb-3" />
          </div>

          {/* Error Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal text-center" style={{ backgroundColor: "var(--bg-card)" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-error-soft)" }}>
              <AlertCircle className="h-8 w-8" style={{ color: "var(--status-error)" }} />
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Invalid Reset Link
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              {tokenError}
            </p>
            <Link
              to="/forgot-password"
              className="inline-block w-full py-3 rounded-xl text-white font-semibold transition-all"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
            >
              Request New Link
            </Link>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <LogoFull height={120} className="mb-3" />
          </div>

          {/* Success Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal text-center" style={{ backgroundColor: "var(--bg-card)" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
              <CheckCircle className="h-8 w-8" style={{ color: "var(--status-success)" }} />
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Password Reset Successful!
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              Your password has been changed. You can now log in with your new password.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="reset-password-page">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <LogoFull height={120} className="mb-3" />
          <p className="text-white/70 text-sm">Create New Password</p>
        </div>

        {/* Reset Form Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
            Create New Password
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Enter your new password below
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
              <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)", 
                    border: "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="new-password-input"
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

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)", 
                    border: "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="confirm-new-password-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="reset-password-button"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

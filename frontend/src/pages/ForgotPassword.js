import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, Mail, AlertCircle, CheckCircle, ArrowLeft, Send, Loader2 } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

    if (!isValidIdentifier(identifier.trim())) {
      setError("Please enter a valid email address or 10-digit mobile number");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${backendUrl}/api/auth/forgot-password`, { 
        username: identifier.trim() 
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="forgot-password-success-page">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg border border-white/30">
              <Wallet className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Moneyssutra</h1>
          </div>

          {/* Success Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal text-center" style={{ backgroundColor: "var(--bg-card)" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--status-success-soft)" }}>
              <CheckCircle className="h-8 w-8" style={{ color: "var(--status-success)" }} />
            </div>
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              Check Your Email
            </h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
              If an account exists with this email or mobile number, you will receive a password reset link shortly.
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Don't forget to check your spam folder!
            </p>
            <Link
              to="/login"
              className="inline-block w-full py-3 rounded-xl text-white font-semibold transition-all text-center"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="back-to-login-btn"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password Form
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="forgot-password-page">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg border border-white/30">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Moneyssutra</h1>
          <p className="text-white/70 text-sm">Password Recovery</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
            Forgot Password?
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Enter your registered email ID or mobile number to receive a password reset link.
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
                  data-testid="recovery-identifier-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !identifier.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="send-reset-link-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm transition-colors hover:underline"
              style={{ color: "var(--brand-primary)" }}
              data-testid="back-to-login-link"
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

export default ForgotPassword;

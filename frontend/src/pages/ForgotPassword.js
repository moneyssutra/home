import { useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, User, Mail, AlertCircle, CheckCircle, ArrowLeft, Send } from "lucide-react";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

const ForgotPassword = () => {
  const [mode, setMode] = useState(null); // 'username' or 'password'
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleForgotUsername = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${backendUrl}/api/auth/forgot-username`, { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter your username or email");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(`${backendUrl}/api/auth/forgot-password`, { username });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMode(null);
    setEmail("");
    setUsername("");
    setError("");
    setSuccess(false);
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
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
              {mode === 'username' 
                ? "If an account exists with this email, you will receive your username shortly."
                : "If an account exists with this username, you will receive a password reset link shortly."
              }
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Don't forget to check your spam folder!
            </p>
            <Link
              to="/"
              className="inline-block w-full py-3 rounded-xl text-white font-semibold transition-all"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Mode selection
  if (mode === null) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="forgot-credentials-page">
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
            <p className="text-white/70 text-sm">Account Recovery</p>
          </div>

          {/* Selection Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
              What do you need help with?
            </h2>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Choose an option below
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setMode('username')}
                className="w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left hover:shadow-md"
                style={{ 
                  backgroundColor: "var(--bg-subtle)", 
                  borderColor: "var(--border-light)"
                }}
                data-testid="forgot-username-btn"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-primary-soft)" }}>
                  <User className="h-6 w-6" style={{ color: "var(--brand-primary)" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Forgot Username</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Get your username sent to your email
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode('password')}
                className="w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left hover:shadow-md"
                style={{ 
                  backgroundColor: "var(--bg-subtle)", 
                  borderColor: "var(--border-light)"
                }}
                data-testid="forgot-password-btn"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--status-warning-soft)" }}>
                  <Mail className="h-6 w-6" style={{ color: "var(--status-warning)" }} />
                </div>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Forgot Password</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Get a password reset link via email
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/"
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
  }

  // Forgot Username Form
  if (mode === 'username') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
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

          {/* Form Card */}
          <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
            <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
              Recover Username
            </h2>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Enter your registered email to receive your username
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
                <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
                <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
              </div>
            )}

            <form onSubmit={handleForgotUsername} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                    style={{ 
                      backgroundColor: "var(--bg-subtle)", 
                      border: "1px solid var(--border-light)",
                      color: "var(--text-primary)"
                    }}
                    data-testid="recovery-email-input"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--btn-primary-bg)" }}
                data-testid="send-username-btn"
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Send Username
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={resetForm}
                className="inline-flex items-center gap-2 text-sm transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Options
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password Form
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
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

        {/* Form Card */}
        <div className="w-full max-w-sm rounded-3xl p-8 shadow-modal" style={{ backgroundColor: "var(--bg-card)" }}>
          <h2 className="text-xl font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>
            Reset Password
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
            Enter your username to receive a password reset link
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: "var(--status-error-soft)", border: "1px solid var(--status-error)" }}>
              <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--status-error)" }} />
              <p className="text-sm" style={{ color: "var(--status-error)" }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Username or Email
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-all"
                  style={{ 
                    backgroundColor: "var(--bg-subtle)", 
                    border: "1px solid var(--border-light)",
                    color: "var(--text-primary)"
                  }}
                  data-testid="recovery-username-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--btn-primary-bg)" }}
              data-testid="send-reset-link-btn"
            >
              {isSubmitting ? (
                "Sending..."
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Reset Link
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Options
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

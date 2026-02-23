import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Lock, Eye, EyeOff, X, Check, Loader2 } from "lucide-react";

const SetPasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const { setPassword } = useAuth();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const result = await setPassword(password);
    
    if (result.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(result.error);
    }
    
    setIsSubmitting(false);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleSkip}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md mx-4 rounded-2xl p-6 shadow-xl"
        style={{ backgroundColor: "var(--bg-card)" }}
        data-testid="set-password-modal"
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100"
          data-testid="close-modal-btn"
        >
          <X className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div 
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "var(--brand-primary-soft)" }}
          >
            <Lock className="h-8 w-8" style={{ color: "var(--brand-primary)" }} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Set a Password
          </h2>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Create a password to login with your email directly, without needing Google each time.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div 
            className="mb-4 p-3 rounded-xl text-sm"
            style={{ backgroundColor: "var(--status-error-soft)", color: "var(--status-error)" }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                style={{ 
                  backgroundColor: "var(--bg-subtle)", 
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)"
                }}
                data-testid="new-password-input"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "var(--text-muted)" }} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full pl-11 pr-12 py-3 rounded-xl outline-none transition-all"
                style={{ 
                  backgroundColor: "var(--bg-subtle)", 
                  border: "1px solid var(--border-light)",
                  color: "var(--text-primary)"
                }}
                data-testid="confirm-password-input"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                ) : (
                  <Eye className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !password || !confirmPassword}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: "var(--brand-primary)" }}
            data-testid="set-password-submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting Password...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Set Password
              </>
            )}
          </button>

          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
            data-testid="skip-password-btn"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordModal;

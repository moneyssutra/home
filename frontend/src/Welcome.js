import { useNavigate } from "react-router-dom";
import { TrendingUp, Shield, PiggyBank, Target } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }} data-testid="welcome-page">
      <div className="relative flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo/Icon */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-2xl border border-white/30">
            <TrendingUp className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-3 text-center" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Moneyssutra
        </h1>
        <p className="text-white/70 text-center text-lg mb-12 max-w-xs">
          Your complete wealth intelligence system
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4 mb-12 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <PiggyBank className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/70 text-xs text-center">Track Wealth</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Target className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/70 text-xs text-center">Set Goals</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <span className="text-white/70 text-xs text-center">Stay Secure</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate("/setup")}
          className="w-full max-w-sm py-4 rounded-2xl bg-white text-lg font-semibold shadow-lg transition-all hover:shadow-xl active:scale-[0.98]"
          style={{ color: "var(--brand-primary)" }}
          data-testid="get-started-button"
        >
          Get Started
        </button>

        {/* Skip link */}
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-white/50 text-sm hover:text-white/70 transition-colors"
          data-testid="skip-button"
        >
          Skip for now
        </button>
      </div>

      {/* Footer */}
      <div className="relative py-6 text-center">
        <p className="text-white/40 text-xs">
          Secure & Private
        </p>
      </div>
    </div>
  );
};

export default Welcome;

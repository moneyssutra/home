import { useNavigate } from "react-router-dom";
import { TrendingUp, Shield, PiggyBank, Target } from "lucide-react";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#334155] via-[#134E3E] to-[#334155] flex flex-col" data-testid="welcome-page">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgMHYyaC0ydi0yaDJ6bTIgMGgydjJoLTJ2LTJ6bS0yLTR2MmgtMnYtMmgyek0zNCAyNnYyaC0ydi0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
      
      <div className="relative flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo/Icon */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-gradient-to-r from-[#14B8A6] to-[#10B981] rounded-full blur-xl opacity-30 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#10B981] flex items-center justify-center shadow-2xl">
            <TrendingUp className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-3 text-center" style={{ fontFamily: "'Manrope', sans-serif" }}>
          Moneyssutra
        </h1>
        <p className="text-white/60 text-center text-lg mb-12 max-w-xs">
          Your complete wealth intelligence system
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-4 mb-12 w-full max-w-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#1E293B]/10 flex items-center justify-center">
              <PiggyBank className="h-6 w-6 text-[#14B8A6]" />
            </div>
            <span className="text-white/60 text-xs text-center">Track Wealth</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#1E293B]/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-[#14B8A6]" />
            </div>
            <span className="text-white/60 text-xs text-center">Set Goals</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#1E293B]/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-[#14B8A6]" />
            </div>
            <span className="text-white/60 text-xs text-center">Stay Secure</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate("/setup")}
          className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-r from-[#14B8A6] to-[#10B981] text-white text-lg font-semibold shadow-lg shadow-[#14B8A6]/30 transition-all hover:shadow-xl hover:shadow-[#14B8A6]/40 active:scale-[0.98]"
          data-testid="get-started-button"
        >
          Get Started
        </button>

        {/* Skip link */}
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-white/40 text-sm hover:text-white/60 transition-colors"
          data-testid="skip-button"
        >
          Skip for now
        </button>
      </div>

      {/* Footer */}
      <div className="relative py-6 text-center">
        <p className="text-white/30 text-xs">
          Secure & Private
        </p>
      </div>
    </div>
  );
};

export default Welcome;

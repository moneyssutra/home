import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Download, ArrowRight, Loader2, Smartphone } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

const InviteLanding = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await axios.get(`${API}/api/family/invite-info/${code}`);
        setInviteInfo(res.data);
      } catch {
        setError("This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    if (code) fetchInvite();
  }, [code]);

  const detectOS = () => {
    const ua = navigator.userAgent || "";
    if (/android/i.test(ua)) return "android";
    if (/iPad|iPhone|iPod/.test(ua)) return "ios";
    return "web";
  };

  const handleDownload = () => {
    const os = detectOS();
    if (os === "android") {
      window.location.href = "https://play.google.com/store/apps/details?id=com.moneyssutra.app";
    } else if (os === "ios") {
      window.location.href = "https://apps.apple.com/app/moneyssutra/id000000000";
    } else {
      navigate(`/login?invite=${code}`);
    }
  };

  const handleWebSignup = () => {
    navigate(`/login?invite=${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-500 font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Invalid Invite</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: "var(--brand-primary)" }}
            data-testid="invite-login-btn"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Invite Card */}
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl" data-testid="invite-card">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7C3AED, #A78BFA)" }}>
              <Users className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Manrope', sans-serif" }}>
              You're Invited!
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              <strong>{inviteInfo.ownerName}</strong> wants you to join
            </p>
          </div>

          {/* Family Info */}
          <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: "#F3E8FF", border: "1px solid #E9D5FF" }}>
            <p className="text-lg font-bold text-center" style={{ color: "#7C3AED" }}>
              {inviteInfo.familyName}
            </p>
            <p className="text-xs text-center mt-1" style={{ color: "#9333EA" }}>
              {inviteInfo.memberCount} member{inviteInfo.memberCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Invite Code Display */}
          <div className="rounded-xl p-3 mb-6 text-center" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
            <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Your Invite Code</p>
            <p className="text-2xl font-mono font-bold tracking-[0.2em]" style={{ color: "var(--brand-primary)" }} data-testid="invite-code-display">
              {inviteInfo.inviteCode}
            </p>
          </div>

          {/* Relationship Pre-fill Info */}
          {inviteInfo.pendingMember && (
            <div className="rounded-xl p-3 mb-6 flex items-center gap-3" style={{ backgroundColor: "#DBEAFE", border: "1px solid #BFDBFE" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#93C5FD", color: "#1E40AF" }}>
                {inviteInfo.pendingMember.name?.charAt(0) || "?"}
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "#1E40AF" }}>{inviteInfo.pendingMember.name}</p>
                <p className="text-[10px]" style={{ color: "#3B82F6" }}>{inviteInfo.pendingMember.relationship}</p>
              </div>
            </div>
          )}

          {/* CTA Buttons */}
          <button
            onClick={handleDownload}
            className="w-full py-3.5 rounded-xl text-white font-semibold flex items-center justify-center gap-2 mb-3 transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 14px rgba(5,150,105,0.4)" }}
            data-testid="download-app-btn"
          >
            <Download className="h-5 w-5" />
            Download MoneySutra App
          </button>

          <button
            onClick={handleWebSignup}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ border: "1px solid var(--border-medium)", color: "var(--text-primary)" }}
            data-testid="web-signup-btn"
          >
            <Smartphone className="h-4 w-4" />
            Continue on Web
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* App Features */}
        <div className="mt-8 text-center max-w-sm">
          <p className="text-white/80 text-sm font-medium mb-3">Track your family finances together</p>
          <div className="flex justify-center gap-6 text-white/60 text-xs">
            <span>Income</span>
            <span>Expenses</span>
            <span>Investments</span>
            <span>Goals</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteLanding;

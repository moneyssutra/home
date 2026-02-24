import { useState, useRef, useEffect } from "react";
import { X, Download, Share2, Zap, Shield, Target, Trophy, Flame, Award, Copy, Check } from "lucide-react";
import html2canvas from "html2canvas";
import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

const GRADE_META = {
  A: { color: "#10B981", label: "Excellent" },
  B: { color: "#3B82F6", label: "Good" },
  C: { color: "#F59E0B", label: "Fair" },
  D: { color: "#F97316", label: "Needs Work" },
  E: { color: "#EF4444", label: "Critical" },
};

const LEVEL_COLORS = [null,"#94A3B8","#A78BFA","#818CF8","#60A5FA","#38BDF8","#34D399","#4ADE80","#A3E635","#FACC15","#FB923C","#F87171","#E879F9","#C084FC","#818CF8","#38BDF8","#2DD4BF","#4ADE80","#FCD34D","#FB923C","#F43F5E"];

const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

function getGrade(score) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

export default function ShareScoreCard({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    axios.get(`${backendUrl}/api/gamification/share-card`, { withCredentials: true })
      .then(res => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, backgroundColor: null, useCORS: true, logging: false,
      });
      const link = document.createElement("a");
      link.download = `${data?.name || "My"}-Financial-ScoreCard.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) { console.error(e); }
    setDownloading(false);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, backgroundColor: null, useCORS: true, logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (navigator.share && blob) {
          const file = new File([blob], "Financial-ScoreCard.png", { type: "image/png" });
          await navigator.share({ title: `${data?.name}'s Financial Score Card`, files: [file] });
        } else {
          handleDownload();
        }
      });
    } catch { handleDownload(); }
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.origin + "/insights");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const grade = data ? getGrade(data.controlScore) : "C";
  const gm = GRADE_META[grade] || GRADE_META.C;
  const lvlColor = LEVEL_COLORS[data?.levelNumber] || "#10B981";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} data-testid="share-card-modal">
      <div className="w-full max-w-md" style={{ animation: "slideUp 0.3s ease" }}>
        {/* Close */}
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} data-testid="share-card-close-btn">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {loading || !data ? (
          <div className="rounded-3xl p-12 flex items-center justify-center" style={{ backgroundColor: "#1a1a2e" }}>
            <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* THE CARD */}
            <div ref={cardRef} style={{ borderRadius: "24px", overflow: "hidden" }}>
              <div style={{
                background: "linear-gradient(145deg, #0f0f23 0%, #1a1a3e 40%, #16213e 100%)",
                padding: "32px 28px 24px", position: "relative", overflow: "hidden",
              }}>
                {/* Decorative elements */}
                <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: `radial-gradient(circle, ${lvlColor}15 0%, transparent 70%)` }} />
                <div style={{ position: "absolute", bottom: "-30px", left: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${gm.color}10 0%, transparent 70%)` }} />
                <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", bottom: "12px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)", pointerEvents: "none" }} />

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", position: "relative" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Financial Score Card</p>
                    <p style={{ fontSize: "20px", color: "#fff", fontWeight: 800, lineHeight: 1.2 }}>{data.name}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "20px", backgroundColor: `${lvlColor}20`, border: `1px solid ${lvlColor}40` }}>
                    <Zap style={{ width: "14px", height: "14px", color: lvlColor }} />
                    <span style={{ fontSize: "12px", fontWeight: 700, color: lvlColor }}>Lv.{data.levelNumber}</span>
                  </div>
                </div>

                {/* Main Score */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", position: "relative" }}>
                  <div style={{
                    width: "96px", height: "96px", borderRadius: "50%", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", border: `3px solid ${gm.color}`,
                    background: `radial-gradient(circle at 30% 30%, ${gm.color}20 0%, transparent 60%)`,
                    boxShadow: `0 0 30px ${gm.color}20`,
                  }}>
                    <span style={{ fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{data.controlScore}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: gm.color, letterSpacing: "1px" }}>GRADE {grade}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: lvlColor, marginBottom: "2px" }}>{data.level}</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{fmt(data.xp)} XP earned</p>
                    <div style={{ marginTop: "10px", height: "4px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "4px", width: `${Math.min((data.controlScore / 100) * 100, 100)}%`, background: `linear-gradient(90deg, ${gm.color}, ${gm.color}88)` }} />
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { icon: Shield, value: `${data.survivalDays}d`, label: "RUNWAY", color: "#8B5CF6" },
                    { icon: Trophy, value: data.achievements, label: "BADGES", color: "#F59E0B" },
                    { icon: Flame, value: `${data.streak}w`, label: "STREAK", color: "#EF4444" },
                    { icon: Target, value: gm.label, label: "HEALTH", color: gm.color },
                  ].map((s, i) => {
                    const I = s.icon;
                    return (
                      <div key={i} style={{ textAlign: "center", padding: "12px 4px", borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <I style={{ width: "18px", height: "18px", color: s.color, margin: "0 auto 6px" }} />
                        <p style={{ fontSize: "16px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</p>
                        <p style={{ fontSize: "8px", fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "1px", marginTop: "4px" }}>{s.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "6px", backgroundColor: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Award style={{ width: "12px", height: "12px", color: "#fff" }} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>MoneySutra</span>
                  </div>
                  <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>
                    {new Date(data.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={handleDownload} disabled={downloading}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderRadius: "16px", backgroundColor: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "14px", color: "#1F2937", opacity: downloading ? 0.6 : 1 }}
                data-testid="download-scorecard-btn">
                <Download style={{ width: "18px", height: "18px" }} />
                {downloading ? "Saving..." : "Download"}
              </button>
              <button onClick={handleShare}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px", borderRadius: "16px", backgroundColor: "#059669", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "14px", color: "#fff" }}
                data-testid="share-scorecard-btn">
                <Share2 style={{ width: "18px", height: "18px" }} />
                Share
              </button>
              <button onClick={handleCopyLink}
                style={{ width: "52px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px", backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer" }}
                data-testid="copy-link-btn">
                {copied ? <Check style={{ width: "18px", height: "18px", color: "#10B981" }} /> : <Copy style={{ width: "18px", height: "18px", color: "#fff" }} />}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

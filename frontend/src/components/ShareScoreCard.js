import { useState, useRef, useEffect } from "react";
import { X, Download, Share2, Copy, Check } from "lucide-react";
import html2canvas from "html2canvas";
import axios from "axios";
import API_BASE from '../utils/apiConfig';

const backendUrl = API_BASE;

const GRADE_META = {
  A: { color: "#10B981", label: "Excellent" },
  B: { color: "#3B82F6", label: "Good" },
  C: { color: "#F59E0B", label: "Fair" },
  D: { color: "#F97316", label: "Needs Work" },
  E: { color: "#EF4444", label: "Critical" },
};

const LEVEL_COLORS = [null,"#94A3B8","#A78BFA","#818CF8","#60A5FA","#38BDF8","#34D399","#4ADE80","#A3E635","#FACC15","#FB923C","#F87171","#E879F9","#C084FC","#818CF8","#38BDF8","#2DD4BF","#4ADE80","#FCD34D","#FB923C","#F43F5E"];

function getGrade(score) {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "E";
}

function capitalizeWords(str) {
  if (!str) return "User";
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// Inline SVG icons for html2canvas compatibility
const InlineSvg = ({ path, color, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 6px" }}>
    <path d={path} />
  </svg>
);

const ICON_PATHS = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2Z",
  flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  target: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
};

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
  const displayName = capitalizeWords(data?.name);

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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "4px" }}>Financial Safety Card</p>
                    <p style={{ fontSize: "20px", color: "#fff", fontWeight: 800, lineHeight: 1.2 }} data-testid="share-card-name">{displayName}</p>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", backgroundColor: `${lvlColor}20`, border: `1px solid ${lvlColor}40`, flexShrink: 0, marginTop: "2px" }} data-testid="share-card-stage">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={lvlColor} stroke="none">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: lvlColor, whiteSpace: "nowrap" }}>Stage {data.levelNumber}</span>
                  </div>
                </div>

                {/* Main Score */}
                <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px", position: "relative" }}>
                  <div style={{
                    width: "120px", height: "120px", borderRadius: "50%", display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", border: `3px solid ${gm.color}`,
                    background: `radial-gradient(circle at 30% 30%, ${gm.color}20 0%, transparent 60%)`,
                    boxShadow: `0 0 30px ${gm.color}20`, flexShrink: 0,
                  }} data-testid="share-card-score-circle">
                    <span style={{ fontSize: "36px", fontWeight: 900, color: "#fff", lineHeight: 1 }}>{data.survivalDays}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "1.5px", marginTop: "6px" }}>DAYS SAFE</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: 700, color: lvlColor, marginBottom: "2px" }}>{data.level}</p>
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>If income stops today</p>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>Score: {data.controlScore}/100</p>
                    <div style={{ marginTop: "10px", height: "4px", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: "4px", width: `${Math.min((data.controlScore / 100) * 100, 100)}%`, background: `linear-gradient(90deg, ${gm.color}, ${gm.color}88)` }} />
                    </div>
                  </div>
                </div>

                {/* Stats Grid - using inline SVGs for html2canvas compatibility */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                  {[
                    { path: ICON_PATHS.shield, value: `${data.survivalDays}d`, label: "SAFETY", color: "#8B5CF6" },
                    { path: ICON_PATHS.trophy, value: data.achievements, label: "BADGES", color: "#F59E0B" },
                    { path: ICON_PATHS.flame, value: `${data.streak}w`, label: "STREAK", color: "#EF4444" },
                    { path: ICON_PATHS.target, value: gm.label, label: "HEALTH", color: gm.color },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "12px 4px", borderRadius: "14px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid={`share-card-stat-${s.label.toLowerCase()}`}>
                      <InlineSvg path={s.path} color={s.color} size={18} />
                      <p style={{ fontSize: "16px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: "8px", fontWeight: 600, color: "rgba(255,255,255,0.35)", letterSpacing: "1px", marginTop: "4px" }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Footer with actual logo */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <img
                      src="/assets/branding/logo-icon-round-sm.png"
                      alt="MoneySutra"
                      style={{ width: "22px", height: "22px", borderRadius: "6px" }}
                      crossOrigin="anonymous"
                    />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>MoneySSutra</span>
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

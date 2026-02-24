import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart3, FileText, ChevronRight, RefreshCw,
  Shield, Target, AlertTriangle, Flame, Trophy, Star,
  TrendingUp, TrendingDown, Clock, Zap, Award, ChevronDown, ChevronUp,
  AlertCircle, Repeat, ArrowUpRight, ShieldAlert, ShieldCheck,
  Crown, Rocket, CheckCircle, Medal, Swords
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useState, useEffect } from "react";
import { useIntelligenceData } from "@/hooks/useIntelligenceData";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

// Color configs
const SURVIVAL_COLORS = {
  "CRITICAL": { bg: "#FEE2E2", text: "#991B1B", accent: "#EF4444", ring: "#EF4444" },
  "VULNERABLE": { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B", ring: "#F59E0B" },
  "STABLE": { bg: "#D1FAE5", text: "#065F46", accent: "#10B981", ring: "#10B981" },
  "SECURE": { bg: "#DBEAFE", text: "#1E40AF", accent: "#3B82F6", ring: "#3B82F6" },
  "FINANCIAL WARRIOR": { bg: "#EDE9FE", text: "#5B21B6", accent: "#8B5CF6", ring: "#8B5CF6" }
};

const GRADE_COLORS = {
  "A": "#10B981", "B": "#3B82F6", "C": "#F59E0B", "D": "#F97316", "E": "#EF4444"
};

const SEVERITY_STYLES = {
  "HIGH": { bg: "#FEE2E2", border: "#FECACA", text: "#991B1B", icon: "#EF4444" },
  "MEDIUM": { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E", icon: "#F59E0B" },
  "LOW": { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "#22C55E" }
};

const ALERT_ICONS = {
  "alert-circle": AlertCircle, "alert-triangle": AlertTriangle, "trending-up": TrendingUp,
  "repeat": Repeat, "arrow-up-right": ArrowUpRight, "shield-alert": ShieldAlert,
  "shield": Shield, "shield-check": ShieldCheck
};

const ACHIEVEMENT_ICONS = {
  "shield": Shield, "shield-check": ShieldCheck, "castle": Crown, "crown": Crown,
  "target": Target, "award": Award, "flame": Flame, "trophy": Trophy,
  "medal": Medal, "trending-down": TrendingDown, "rocket": Rocket, "check-circle": CheckCircle
};

const formatAmount = (amount) => {
  if (!amount && amount !== 0) return "0";
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(amount / 1000).toFixed(0)}K`;
  return amount.toFixed(0);
};

// ─── SURVIVAL CLOCK WIDGET ───
const SurvivalClockWidget = ({ data }) => {
  if (!data) return null;
  const colors = SURVIVAL_COLORS[data.level] || SURVIVAL_COLORS["CRITICAL"];
  const maxDays = 365;
  const pct = Math.min((data.survivalDays / maxDays) * 100, 100);
  const circumference = 2 * Math.PI * 58;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="survival-clock-widget">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5" style={{ color: colors.accent }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Financial Survival Clock</h3>
      </div>
      <div className="flex items-center gap-6">
        {/* Circular gauge */}
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="58" fill="none" stroke="var(--border-light)" strokeWidth="8" />
            <circle cx="65" cy="65" r="58" fill="none" stroke={colors.ring} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{data.survivalDays}</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>DAYS</span>
          </div>
        </div>
        {/* Details */}
        <div className="flex-1 space-y-3">
          <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {data.level}
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Liquid Funds</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.liquidFunds)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Monthly Burn</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>₹{formatAmount(data.monthlyMandatoryExpense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CONTROL SCORE WIDGET ───
const ControlScoreWidget = ({ data }) => {
  if (!data) return null;
  const gradeColor = GRADE_COLORS[data.grade] || "#6B7280";
  const breakdown = data.breakdown || {};
  const bars = [
    { label: "Cash Control", score: breakdown.cashControl?.score || 0, max: 25, color: "#10B981" },
    { label: "Debt Pressure", score: breakdown.debtPressure?.score || 0, max: 25, color: "#3B82F6" },
    { label: "Liquidity", score: breakdown.liquidity?.score || 0, max: 25, color: "#8B5CF6" },
    { label: "Stability", score: breakdown.stability?.score || 0, max: 25, color: "#F59E0B" },
  ];

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="control-score-widget">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5" style={{ color: gradeColor }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Financial Control Score</h3>
      </div>
      <div className="flex items-start gap-5">
        {/* Score circle */}
        <div className="flex-shrink-0 relative">
          <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ border: `4px solid ${gradeColor}`, backgroundColor: `${gradeColor}10` }}>
            <span className="text-3xl font-black" style={{ color: gradeColor }}>{data.finalScore}</span>
            <span className="text-xs font-bold" style={{ color: gradeColor }}>Grade {data.grade}</span>
          </div>
        </div>
        {/* Breakdown bars */}
        <div className="flex-1 space-y-2.5">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{bar.label}</span>
                <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.score}/{bar.max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(bar.score / bar.max) * 100}%`, backgroundColor: bar.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── GAMIFICATION PROFILE WIDGET ───
const GamificationWidget = ({ data, onProcess }) => {
  if (!data) return null;
  const xpPct = data.nextLevelXP ? Math.min((data.currentXP / data.nextLevelXP) * 100, 100) : 100;
  const levelColors = {
    1: "#EF4444", 2: "#F59E0B", 3: "#10B981", 4: "#3B82F6", 5: "#8B5CF6", 6: "#D946EF"
  };
  const color = levelColors[data.level] || "#10B981";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }} data-testid="gamification-widget">
      {/* Header gradient */}
      <div className="p-5 relative" style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Zap className="h-6 w-6" style={{ color }} />
            </div>
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>LEVEL {data.level}</p>
              <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.title}</p>
            </div>
          </div>
          {data.streak > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: "#FEF3C7" }}>
              <Flame className="h-4 w-4" style={{ color: "#F59E0B" }} />
              <span className="text-xs font-bold" style={{ color: "#92400E" }}>{data.streak}W</span>
            </div>
          )}
        </div>
        {/* XP Bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold" style={{ color }}>{data.currentXP} XP</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.nextLevelXP ? `${data.xpToNextLevel} XP to ${data.nextLevelTitle}` : "MAX LEVEL"}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: `${color}15` }}>
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, ${color}, ${color}CC)` }} />
          </div>
        </div>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x" style={{ backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        <div className="p-3 text-center">
          <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.lastScore || 0}</p>
          <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>SCORE</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.lastSurvivalDays || 0}</p>
          <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>SURVIVAL</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.achievementCount || 0}/{data.totalAchievements || 12}</p>
          <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>BADGES</p>
        </div>
      </div>
    </div>
  );
};

// ─── BEHAVIOR ALERTS WIDGET ───
const BehaviorAlertsWidget = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data || !data.alerts?.length) return null;
  const alerts = expanded ? data.alerts : data.alerts.slice(0, 3);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="behavior-alerts-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Behavior Alerts</h3>
        </div>
        {data.highCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
            {data.highCount} Critical
          </span>
        )}
      </div>
      <div className="space-y-3">
        {alerts.map((alert, i) => {
          const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES["LOW"];
          const IconComp = ALERT_ICONS[alert.icon] || AlertCircle;
          return (
            <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
              <div className="flex gap-3">
                <IconComp className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: style.icon }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: style.text }}>{alert.message}</p>
                  {alert.detail && <p className="text-xs mt-1 opacity-80" style={{ color: style.text }}>{alert.detail}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {data.alerts.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto" style={{ color: "var(--brand-primary)" }}>
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show Less</> : <><ChevronDown className="h-3 w-3" /> Show All ({data.alerts.length})</>}
        </button>
      )}
    </div>
  );
};

// ─── ACHIEVEMENTS GRID ───
const AchievementsWidget = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  if (!data?.allAchievements) return null;
  const sorted = [...data.allAchievements].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  const items = showAll ? sorted : sorted.slice(0, 6);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="achievements-widget">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Achievements</h3>
        <span className="ml-auto text-xs font-medium" style={{ color: "var(--text-muted)" }}>{data.achievementCount}/{data.totalAchievements}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((ach) => {
          const IconComp = ACHIEVEMENT_ICONS[ach.icon] || Star;
          const unlocked = ach.unlocked;
          return (
            <div key={ach.code} className="flex flex-col items-center p-3 rounded-xl text-center transition-all"
              style={{ backgroundColor: unlocked ? "var(--bg-subtle)" : "var(--bg-app)", opacity: unlocked ? 1 : 0.4, border: unlocked ? "1px solid var(--brand-primary)" : "1px solid var(--border-light)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: unlocked ? "#D1FAE5" : "#F1F5F9" }}>
                <IconComp className="h-5 w-5" style={{ color: unlocked ? "#059669" : "#94A3B8" }} />
              </div>
              <p className="text-[10px] font-bold leading-tight" style={{ color: unlocked ? "var(--text-primary)" : "var(--text-muted)" }}>{ach.title}</p>
            </div>
          );
        })}
      </div>
      {data.allAchievements.length > 6 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto" style={{ color: "var(--brand-primary)" }}>
          {showAll ? "Show Less" : `View All (${data.allAchievements.length})`}
        </button>
      )}
    </div>
  );
};

// ─── CHALLENGES WIDGET ───
const ChallengesWidget = ({ data, onJoin }) => {
  if (!data) return null;
  const available = data.available || [];
  const active = data.active || [];

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Challenges</h3>
      </div>
      {active.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>ACTIVE</p>
          {active.map((c) => (
            <div key={c.id} className="rounded-xl p-3" style={{ backgroundColor: "#EDE9FE", border: "1px solid #DDD6FE" }}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold" style={{ color: "#5B21B6" }}>{c.title}</p>
                  <p className="text-xs" style={{ color: "#7C3AED" }}>{c.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black" style={{ color: "#5B21B6" }}>{c.progress || 0}%</p>
                  <p className="text-[10px]" style={{ color: "#7C3AED" }}>+{c.xp_reward} XP</p>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#DDD6FE" }}>
                <div className="h-full rounded-full" style={{ width: `${c.progress || 0}%`, backgroundColor: "#8B5CF6" }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {available.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>AVAILABLE</p>
          {available.slice(0, 3).map((c) => (
            <div key={c.code} className="rounded-xl p-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.description} &middot; +{c.xp_reward} XP</p>
              </div>
              <button onClick={() => onJoin(c.code)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--brand-primary)" }} data-testid={`join-challenge-${c.code}`}>
                Join
              </button>
            </div>
          ))}
        </div>
      )}
      {available.length === 0 && active.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No challenges available yet</p>
      )}
    </div>
  );
};

// ─── MAIN INSIGHTS PAGE ───
const Insights = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { survivalClock, controlScore, behaviorAlerts, gamification, challenges, loading, refresh, processWeekly, joinChallenge } = useIntelligenceData();
  const [processing, setProcessing] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleProcess = async () => {
    setProcessing(true);
    await processWeekly();
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Loading intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="insights-page">
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)" }}>
        <button onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
          data-testid="back-button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Insights</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleProcess} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: "var(--brand-primary)", opacity: processing ? 0.6 : 1 }}
            data-testid="process-weekly-btn">
            <Zap className="h-3.5 w-3.5" />
            {processing ? "Processing..." : "Update Score"}
          </button>
          <button onClick={refresh}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}
            data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-2 space-y-4 max-w-3xl mx-auto">
        {/* Gamification Profile */}
        <GamificationWidget data={gamification} onProcess={handleProcess} />

        {/* Two-column: Survival Clock + Control Score */}
        <SurvivalClockWidget data={survivalClock} />
        <ControlScoreWidget data={controlScore} />

        {/* Behavior Alerts */}
        <BehaviorAlertsWidget data={behaviorAlerts} />

        {/* Achievements */}
        <AchievementsWidget data={gamification} />

        {/* Challenges */}
        <ChallengesWidget data={challenges} onJoin={joinChallenge} />

        {/* Navigation Cards */}
        <div className="space-y-3 pt-2">
          <p className="text-xs font-bold tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>Explore More</p>
          {[
            { id: "analytics", title: "Analytics", desc: "Charts & trends", icon: BarChart3, color: "#8B5CF6", path: "/insights/analytics" },
            { id: "reports", title: "Reports", desc: "PDF & Excel export", icon: FileText, color: "#059669", path: "/insights/reports" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.id} onClick={() => navigate(card.path)}
                className="w-full rounded-xl p-4 text-left flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.98]"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                data-testid={`insights-${card.id}-card`}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{card.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{card.desc}</p>
                </div>
                <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
              </button>
            );
          })}
        </div>
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Insights;

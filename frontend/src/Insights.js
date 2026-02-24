import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart3, FileText, ChevronRight, RefreshCw,
  Shield, Target, AlertTriangle, Flame, Trophy, Star,
  TrendingUp, TrendingDown, Clock, Zap, Award, ChevronDown, ChevronUp,
  AlertCircle, Repeat, ArrowUpRight, ShieldAlert, ShieldCheck,
  Crown, Rocket, CheckCircle, Medal, Swords, Info, X,
  HeartPulse, LifeBuoy, PieChart, ListChecks, Flag, GitBranch, CircleCheckBig, Gauge
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import { useState, useEffect } from "react";
import { useIntelligenceData } from "@/hooks/useIntelligenceData";

// ─── CONSTANTS ───
const SURVIVAL_COLORS = {
  "CRITICAL": { bg: "#FEE2E2", text: "#991B1B", accent: "#EF4444", ring: "#EF4444", gradient: "linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)" },
  "VULNERABLE": { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B", ring: "#F59E0B", gradient: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)" },
  "STABLE": { bg: "#D1FAE5", text: "#065F46", accent: "#10B981", ring: "#10B981", gradient: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)" },
  "SECURE": { bg: "#DBEAFE", text: "#1E40AF", accent: "#3B82F6", ring: "#3B82F6", gradient: "linear-gradient(135deg, #DBEAFE 0%, #BFDBFE 100%)" },
  "FINANCIAL WARRIOR": { bg: "#EDE9FE", text: "#5B21B6", accent: "#8B5CF6", ring: "#8B5CF6", gradient: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)" }
};

const GRADE_COLORS = { "A": "#10B981", "B": "#3B82F6", "C": "#F59E0B", "D": "#F97316", "E": "#EF4444" };

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
  "medal": Medal, "trending-down": TrendingDown, "rocket": Rocket, "check-circle": CheckCircle,
  "heart-pulse": HeartPulse, "life-buoy": LifeBuoy, "pie-chart": PieChart,
  "list-checks": ListChecks, "flag": Flag, "git-branch": GitBranch,
  "circle-check-big": CircleCheckBig, "gauge": Gauge, "star": Star
};

const LEVEL_COLORS = { 1: "#EF4444", 2: "#F59E0B", 3: "#10B981", 4: "#3B82F6", 5: "#8B5CF6", 6: "#D946EF" };

const CATEGORY_COLORS = {
  "starter": "#6366F1", "behavior": "#10B981", "survival": "#3B82F6", "score": "#F59E0B",
  "streak": "#EF4444", "debt": "#F97316", "insurance": "#EC4899", "emergency": "#14B8A6",
  "investment": "#8B5CF6", "goals": "#06B6D4", "income": "#84CC16"
};

const fmt = (n) => {
  if (!n && n !== 0) return "0";
  const a = Math.abs(n);
  if (a >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (a >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toFixed(0);
};

// ─── SURVIVAL WARNING BANNER ───
const SurvivalWarning = ({ data }) => {
  if (!data || data.survivalDays > 90) return null;
  const critical = data.survivalDays <= 30;
  return (
    <div className="rounded-2xl p-4 flex items-center gap-3 animate-pulse" data-testid="survival-warning-banner"
      style={{ background: critical ? "linear-gradient(135deg, #991B1B, #DC2626)" : "linear-gradient(135deg, #92400E, #D97706)", color: "#fff" }}>
      <ShieldAlert className="h-8 w-8 flex-shrink-0 opacity-90" />
      <div>
        <p className="text-sm font-black">
          {data.survivalDays === 0 ? "ZERO survival funds!" : `You will survive only ${data.survivalDays} days without income.`}
        </p>
        <p className="text-xs opacity-80 mt-0.5">
          {critical ? "This is critical. Build your emergency fund immediately!" : "Target 6+ months of expenses as your safety net."}
        </p>
      </div>
    </div>
  );
};

// ─── LEVEL JOURNEY (shows progression through all levels) ───
const LevelJourney = ({ data }) => {
  const [showXPRules, setShowXPRules] = useState(false);
  if (!data?.allLevels) return null;
  const color = LEVEL_COLORS[data.level] || "#10B981";
  const xpPct = data.nextLevelXP ? Math.min(((data.currentXP - data.levelMinXP) / (data.nextLevelXP - data.levelMinXP)) * 100, 100) : 100;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }} data-testid="gamification-widget">
      {/* Header */}
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}05 100%)`, backgroundColor: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}>
              <Zap className="h-7 w-7" style={{ color }} />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 rounded-full text-white" style={{ backgroundColor: color }}>{data.level}</span>
            </div>
            <div>
              {data.prevLevelTitle && <p className="text-[10px] line-through opacity-50" style={{ color: "var(--text-muted)" }}>{data.prevLevelTitle}</p>}
              <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{data.description}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {data.streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7" }}>
                <Flame className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-bold" style={{ color: "#92400E" }}>{data.streak}W</span>
              </div>
            )}
            <button onClick={() => setShowXPRules(!showXPRules)} className="flex items-center gap-1 text-[10px] font-medium" style={{ color }}>
              <Info className="h-3 w-3" /> How to earn XP
            </button>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ color }}>{data.currentXP} XP</span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data.nextLevelXP ? `${data.xpToNextLevel} XP to ${data.nextLevelTitle}` : "MAX LEVEL REACHED"}
            </span>
          </div>
          <div className="h-3.5 rounded-full overflow-hidden relative" style={{ backgroundColor: `${color}12` }}>
            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, ${color}, ${color}BB)` }}>
              <div className="absolute inset-0 opacity-30" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)" }} />
            </div>
          </div>
        </div>

        {/* Level Journey dots */}
        <div className="flex items-center justify-between mt-3 px-1">
          {data.allLevels.map((lvl, i) => (
            <div key={lvl.level} className="flex flex-col items-center" style={{ flex: 1 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all"
                style={{
                  backgroundColor: lvl.reached ? LEVEL_COLORS[lvl.level] : "var(--bg-subtle)",
                  color: lvl.reached ? "#fff" : "var(--text-muted)",
                  border: data.level === lvl.level ? `2px solid ${LEVEL_COLORS[lvl.level]}` : "none",
                  boxShadow: data.level === lvl.level ? `0 0 8px ${LEVEL_COLORS[lvl.level]}40` : "none"
                }}>
                {lvl.level}
              </div>
              <span className="text-[8px] mt-1 text-center leading-tight" style={{ color: lvl.reached ? "var(--text-primary)" : "var(--text-muted)" }}>
                {lvl.title.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* XP Rules dropdown */}
      {showXPRules && data.xpRules && (
        <div className="px-5 py-3 space-y-2" style={{ backgroundColor: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>How to Earn XP</p>
          {data.xpRules.map((rule, i) => {
            const Icon = ACHIEVEMENT_ICONS[rule.icon] || Star;
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{rule.action}</span>
                <span className="text-xs font-bold" style={{ color }}>{rule.xp}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x" style={{ backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        {[
          { val: data.lastScore || 0, label: "SCORE" },
          { val: data.lastSurvivalDays || 0, label: "SURVIVAL" },
          { val: `${data.achievementCount || 0}/${data.totalAchievements || 20}`, label: "BADGES" },
          { val: data.maxBadgesUnlocked || data.achievementCount || 0, label: "MAX" },
        ].map((s, i) => (
          <div key={i} className="py-3 text-center">
            <p className="text-base font-black" style={{ color: "var(--text-primary)" }}>{s.val}</p>
            <p className="text-[9px] font-semibold tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SURVIVAL CLOCK ───
const SurvivalClockWidget = ({ data }) => {
  if (!data) return null;
  const colors = SURVIVAL_COLORS[data.level] || SURVIVAL_COLORS["CRITICAL"];
  const maxDays = 365;
  const pct = Math.min((data.survivalDays / maxDays) * 100, 100);
  const circumference = 2 * Math.PI * 58;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="survival-clock-widget">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5" style={{ color: colors.accent }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Financial Survival Clock</h3>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="58" fill="none" stroke="var(--border-light)" strokeWidth="8" />
            <circle cx="65" cy="65" r="58" fill="none" stroke={colors.ring} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset}
              transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{data.survivalDays}</span>
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>DAYS</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>
            {data.level}
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Liquid Funds</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.liquidFunds)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Monthly Burn Rate</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.monthlyMandatoryExpense)}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Daily Burn</p>
            <p className="text-sm font-semibold" style={{ color: colors.accent }}>&#8377;{fmt(data.dailyBurnRate)}/day</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CONTROL SCORE ───
const ControlScoreWidget = ({ data }) => {
  if (!data) return null;
  const gradeColor = GRADE_COLORS[data.grade] || "#6B7280";
  const bd = data.breakdown || {};
  const bars = [
    { label: "Cash Control", score: bd.cashControl?.score || 0, max: 25, color: "#10B981", detail: `Ratio: ${((bd.cashControl?.ratio || 0) * 100).toFixed(0)}%` },
    { label: "Debt Pressure", score: bd.debtPressure?.score || 0, max: 25, color: "#3B82F6", detail: `DTI: ${((bd.debtPressure?.ratio || 0) * 100).toFixed(0)}%` },
    { label: "Liquidity", score: bd.liquidity?.score || 0, max: 25, color: "#8B5CF6", detail: `${bd.liquidity?.survivalDays || 0} days` },
    { label: "Stability", score: bd.stability?.score || 0, max: 25, color: "#F59E0B", detail: `Var: ${bd.stability?.variancePct || 0}%` },
  ];

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="control-score-widget">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5" style={{ color: gradeColor }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Financial Control Score</h3>
      </div>
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 relative">
          <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ border: `4px solid ${gradeColor}`, backgroundColor: `${gradeColor}10` }}>
            <span className="text-3xl font-black" style={{ color: gradeColor }}>{data.finalScore}</span>
            <span className="text-xs font-bold" style={{ color: gradeColor }}>Grade {data.grade}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{bar.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{bar.detail}</span>
                  <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.score}/{bar.max}</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(bar.score / bar.max) * 100}%`, backgroundColor: bar.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Metrics summary */}
      {data.metrics && (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          {[
            { label: "Monthly Income", val: data.metrics.monthlyIncome },
            { label: "Discretionary", val: data.metrics.monthlyDiscretionary },
            { label: "Total EMI", val: data.metrics.totalEMI },
            { label: "Liquid Funds", val: data.metrics.liquidFunds },
          ].map((m) => (
            <div key={m.label}>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(m.val)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── BEHAVIOR ALERTS ───
const BehaviorAlertsWidget = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  if (!data || !data.alerts?.length) {
    return (
      <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="behavior-alerts-widget">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="h-5 w-5" style={{ color: "#10B981" }} />
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Behavior Alerts</h3>
        </div>
        <p className="text-sm text-center py-3" style={{ color: "#10B981" }}>All clear! No financial alerts.</p>
      </div>
    );
  }
  const alerts = expanded ? data.alerts : data.alerts.slice(0, 3);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="behavior-alerts-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Behavior Alerts</h3>
        </div>
        {data.highCount > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold animate-pulse" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>
            {data.highCount} Critical
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {alerts.map((alert, i) => {
          const sty = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES["LOW"];
          const Icon = ALERT_ICONS[alert.icon] || AlertCircle;
          return (
            <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: sty.bg, border: `1px solid ${sty.border}` }}>
              <div className="flex gap-3">
                <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: sty.icon }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: sty.text }}>{alert.message}</p>
                  {alert.detail && <p className="text-xs mt-1 opacity-80" style={{ color: sty.text }}>{alert.detail}</p>}
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

// ─── ACHIEVEMENTS GRID (eye-catching with categories) ───
const AchievementsWidget = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedAch, setSelectedAch] = useState(null);
  if (!data?.allAchievements) return null;

  const sorted = [...data.allAchievements].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  const items = showAll ? sorted : sorted.slice(0, 8);
  const categories = [...new Set(data.allAchievements.map(a => a.category))];

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="achievements-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Achievements</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
            Peak: {data.maxBadgesUnlocked || data.achievementCount}
          </span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{data.achievementCount}/{data.totalAchievements}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {items.map((ach) => {
          const Icon = ACHIEVEMENT_ICONS[ach.icon] || Star;
          const catColor = CATEGORY_COLORS[ach.category] || "#6B7280";
          const unlocked = ach.unlocked;
          return (
            <button key={ach.code} onClick={() => setSelectedAch(selectedAch?.code === ach.code ? null : ach)}
              className="flex flex-col items-center p-2.5 rounded-xl text-center transition-all relative group"
              style={{
                backgroundColor: unlocked ? `${catColor}10` : "var(--bg-app)",
                border: unlocked ? `2px solid ${catColor}` : "1px solid var(--border-light)",
                opacity: unlocked ? 1 : 0.35,
                transform: selectedAch?.code === ach.code ? "scale(1.05)" : "scale(1)"
              }}>
              {unlocked && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: catColor }}><CheckCircle className="h-2.5 w-2.5 text-white" /></div>}
              <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5"
                style={{ backgroundColor: unlocked ? `${catColor}20` : "#F1F5F9" }}>
                <Icon className="h-4.5 w-4.5" style={{ color: unlocked ? catColor : "#94A3B8" }} />
              </div>
              <p className="text-[9px] font-bold leading-tight" style={{ color: unlocked ? "var(--text-primary)" : "var(--text-muted)" }}>{ach.title}</p>
              <span className="text-[8px] mt-0.5 font-medium" style={{ color: catColor }}>+{ach.xp_bonus} XP</span>
            </button>
          );
        })}
      </div>

      {/* Achievement detail popup */}
      {selectedAch && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            {(() => { const I = ACHIEVEMENT_ICONS[selectedAch.icon] || Star; return <I className="h-4 w-4" style={{ color: CATEGORY_COLORS[selectedAch.category] }} />; })()}
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{selectedAch.title}</span>
            <button onClick={() => setSelectedAch(null)} className="ml-auto"><X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} /></button>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{selectedAch.description}</p>
          {selectedAch.achieved_at && <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Unlocked: {new Date(selectedAch.achieved_at).toLocaleDateString()}</p>}
        </div>
      )}

      {data.allAchievements.length > 8 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto" style={{ color: "var(--brand-primary)" }}>
          {showAll ? "Show Less" : `View All (${data.allAchievements.length})`}
        </button>
      )}
    </div>
  );
};

// ─── CHALLENGES ───
const ChallengesWidget = ({ data, onJoin, onLeave }) => {
  const [expandedChallenge, setExpandedChallenge] = useState(null);
  if (!data) return null;
  const { available = [], active = [], completed = [] } = data;
  const DIFF_COLORS = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="flex items-center gap-2 mb-4">
        <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        <h3 className="text-sm font-bold tracking-wide uppercase" style={{ color: "var(--text-secondary)" }}>Challenges</h3>
      </div>

      {/* What are challenges? */}
      <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "#EDE9FE15", border: "1px dashed #8B5CF640" }}>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Challenges are time-bound financial goals. Join one, take action in your real finances, and earn bonus XP when you hit the target!
        </p>
      </div>

      {/* Active */}
      {active.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Active Challenges</p>
          {active.map((c) => {
            const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000));
            return (
              <div key={c.id} className="rounded-xl p-3.5 relative" style={{ backgroundColor: "#EDE9FE", border: "1px solid #DDD6FE" }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: "#5B21B6" }}>{c.title}</p>
                      {c.difficulty && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}20`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#7C3AED" }}>{c.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#8B5CF6" }}>{daysLeft} days left &middot; +{c.xp_reward} XP</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-lg font-black" style={{ color: "#5B21B6" }}>{c.progress || 0}%</p>
                    <button onClick={() => onLeave(c.id)} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEE2E280", color: "#991B1B" }} data-testid={`leave-challenge-${c.id}`}>
                      Abandon
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#DDD6FE" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${c.progress || 0}%`, backgroundColor: "#8B5CF6" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available */}
      {available.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Available Challenges</p>
          {available.map((c) => (
            <div key={c.code} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
              <div className="p-3.5 flex items-center gap-3" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                    {c.difficulty && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}20`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.duration_days} days &middot; +{c.xp_reward} XP</p>
                </div>
                <button onClick={() => setExpandedChallenge(expandedChallenge === c.code ? null : c.code)}
                  className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                  {expandedChallenge === c.code ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button onClick={() => onJoin(c.code)} className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--brand-primary)" }} data-testid={`join-challenge-${c.code}`}>
                  Join
                </button>
              </div>
              {expandedChallenge === c.code && c.explainer && (
                <div className="px-3.5 py-3 text-xs" style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)" }}>
                  {c.explainer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold tracking-wider uppercase mb-2" style={{ color: "var(--text-muted)" }}>Completed ({completed.length})</p>
          <div className="space-y-1.5">
            {completed.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: "#D1FAE520" }}>
                <CheckCircle className="h-4 w-4" style={{ color: "#10B981" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{c.title}</span>
                <span className="ml-auto text-[10px] font-bold" style={{ color: "#10B981" }}>+{c.xp_reward} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN INSIGHTS PAGE ───
const Insights = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const { survivalClock, controlScore, behaviorAlerts, gamification, challenges, loading, refresh, processWeekly, joinChallenge, leaveChallenge } = useIntelligenceData();
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
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate("/home", { replace: true })}
          className="flex items-center justify-center w-9 h-9 rounded-full"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
          data-testid="back-button">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Insights</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleProcess} disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: "var(--brand-primary)", opacity: processing ? 0.6 : 1 }}
            data-testid="process-weekly-btn">
            <Zap className="h-3.5 w-3.5" />
            {processing ? "..." : "Update Score"}
          </button>
          <button onClick={refresh}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}
            data-testid="refresh-btn">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="px-4 py-3 space-y-4 max-w-3xl mx-auto">
        {/* Survival Warning Banner */}
        <SurvivalWarning data={survivalClock} />

        {/* Gamification + Level Journey */}
        <LevelJourney data={gamification} />

        {/* Survival Clock */}
        <SurvivalClockWidget data={survivalClock} />

        {/* Control Score */}
        <ControlScoreWidget data={controlScore} />

        {/* Behavior Alerts */}
        <BehaviorAlertsWidget data={behaviorAlerts} />

        {/* Achievements */}
        <AchievementsWidget data={gamification} />

        {/* Challenges */}
        <ChallengesWidget data={challenges} onJoin={joinChallenge} onLeave={leaveChallenge} />

        {/* Explore More */}
        <div className="space-y-2.5 pt-2">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Explore More</p>
          {[
            { id: "analytics", title: "Analytics", desc: "Charts & trends", icon: BarChart3, color: "#8B5CF6", path: "/insights/analytics" },
            { id: "reports", title: "Reports", desc: "PDF & Excel export", icon: FileText, color: "#059669", path: "/insights/reports" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <button key={card.id} onClick={() => navigate(card.path)}
                className="w-full rounded-xl p-4 text-left flex items-center gap-4 transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}
                data-testid={`insights-${card.id}-card`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
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

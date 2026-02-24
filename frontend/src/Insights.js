import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, BarChart3, FileText, ChevronRight, RefreshCw,
  Shield, Target, AlertTriangle, Flame, Trophy, Star,
  TrendingUp, TrendingDown, Clock, Zap, Award, ChevronDown, ChevronUp,
  AlertCircle, Repeat, ArrowUpRight, ShieldAlert, ShieldCheck,
  Crown, Rocket, CheckCircle, Medal, Swords, Info, X, Share2,
  HeartPulse, LifeBuoy, PieChart, ListChecks, Flag, GitBranch, CircleCheckBig, Gauge,
  Lock, BarChart3 as BarChart3Icon, XCircle, PiggyBank
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import ShareScoreCard from "@/components/ShareScoreCard";
import { useState, useEffect } from "react";
import { useIntelligenceData } from "@/hooks/useIntelligenceData";

// ─── CONSTANTS ───
const GRADE_COLORS = { "A": "#10B981", "B": "#3B82F6", "C": "#F59E0B", "D": "#F97316", "E": "#EF4444" };
const SEVERITY_STYLES = {
  "HIGH": { bg: "#FEE2E2", border: "#FECACA", text: "#991B1B", icon: "#EF4444" },
  "MEDIUM": { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E", icon: "#F59E0B" },
  "LOW": { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534", icon: "#22C55E" }
};
const ALERT_ICONS = { "alert-circle": AlertCircle, "alert-triangle": AlertTriangle, "trending-up": TrendingUp, "repeat": Repeat, "arrow-up-right": ArrowUpRight, "shield-alert": ShieldAlert, "shield": Shield, "shield-check": ShieldCheck };
const ACH_ICONS = { "shield": Shield, "shield-check": ShieldCheck, "castle": Crown, "crown": Crown, "target": Target, "award": Award, "flame": Flame, "trophy": Trophy, "medal": Medal, "trending-down": TrendingDown, "rocket": Rocket, "check-circle": CheckCircle, "heart-pulse": HeartPulse, "life-buoy": LifeBuoy, "pie-chart": PieChart, "list-checks": ListChecks, "flag": Flag, "git-branch": GitBranch, "circle-check-big": CircleCheckBig, "gauge": Gauge, "lock": Lock, "bar-chart-3": BarChart3Icon, "x-circle": XCircle, "piggy-bank": PiggyBank, "star": Star };
const CAT_COLORS = { "starter": "#6366F1", "behavior": "#10B981", "emergency": "#14B8A6", "survival": "#3B82F6", "score": "#F59E0B", "streak": "#EF4444", "debt": "#F97316", "insurance": "#EC4899", "investment": "#8B5CF6", "goals": "#06B6D4", "income": "#84CC16", "savings": "#0EA5E9" };
const LVL_COLORS = [null, "#94A3B8", "#A78BFA", "#818CF8", "#60A5FA", "#38BDF8", "#34D399", "#4ADE80", "#A3E635", "#FACC15", "#FB923C", "#F87171", "#E879F9", "#C084FC", "#818CF8", "#38BDF8", "#2DD4BF", "#4ADE80", "#FCD34D", "#FB923C", "#F43F5E"];
const DIFF_COLORS = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

// ─── SURVIVAL WARNING ───
const SurvivalWarning = ({ data }) => {
  if (!data || data.survivalDays > 90) return null;
  const critical = data.survivalDays <= 30;
  return (
    <div className="rounded-2xl p-4 flex items-start gap-3" data-testid="survival-warning-banner"
      style={{ background: critical ? "linear-gradient(135deg, #991B1B, #DC2626)" : "linear-gradient(135deg, #92400E, #D97706)", color: "#fff" }}>
      <ShieldAlert className="h-7 w-7 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-black leading-snug">
          {data.survivalDays === 0
            ? "If your income stops today, you have zero backup funds."
            : `If your income stops today, your savings will last only ${data.survivalDays} days.`}
        </p>
        <p className="text-xs opacity-80 mt-1">{data.tip || (critical ? "Start small - even ₹500/month builds your safety net." : "Target 6+ months of expenses as your safety net.")}</p>
      </div>
    </div>
  );
};

// ─── LEVEL JOURNEY ───
const LevelJourney = ({ data }) => {
  const [showXP, setShowXP] = useState(false);
  if (!data?.allLevels) return null;
  const color = LVL_COLORS[data.level] || "#10B981";
  const xpPct = data.nextLevelXP ? Math.min(((data.currentXP - data.levelMinXP) / (data.nextLevelXP - data.levelMinXP)) * 100, 100) : 100;
  // Show subset of levels around current
  const allLevels = data.allLevels || [];
  const maxShow = 7;
  let startIdx = Math.max(0, data.level - 3);
  let endIdx = Math.min(allLevels.length, startIdx + maxShow);
  if (endIdx - startIdx < maxShow) startIdx = Math.max(0, endIdx - maxShow);
  const visibleLevels = allLevels.slice(startIdx, endIdx);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }} data-testid="gamification-widget">
      <div className="p-5" style={{ background: `linear-gradient(135deg, ${color}18 0%, ${color}05 100%)`, backgroundColor: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative" style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}>
              <Zap className="h-7 w-7" style={{ color }} />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 rounded-full text-white" style={{ backgroundColor: color }}>{data.level}</span>
            </div>
            <div>
              {data.prevLevelTitle && <p className="text-[10px] line-through opacity-40" style={{ color: "var(--text-muted)" }}>{data.prevLevelTitle}</p>}
              <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{data.title}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {data.streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: "#FEF3C7" }}>
                <Flame className="h-3.5 w-3.5" style={{ color: "#F59E0B" }} />
                <span className="text-[11px] font-bold" style={{ color: "#92400E" }}>{data.streak}W streak</span>
              </div>
            )}
            <button onClick={() => setShowXP(!showXP)} className="flex items-center gap-1 text-[10px] font-medium" style={{ color }} data-testid="how-to-earn-xp-btn">
              <Info className="h-3 w-3" /> How to earn XP?
            </button>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold" style={{ color }}>{data.currentXP} XP</span>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data.nextLevelXP ? `${data.xpToNextLevel} XP to Level ${data.level + 1} "${data.nextLevelTitle}"` : "MAX LEVEL"}
            </span>
          </div>
          <div className="h-3.5 rounded-full overflow-hidden relative" style={{ backgroundColor: `${color}12` }}>
            <div className="h-full rounded-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${xpPct}%`, background: `linear-gradient(90deg, ${color}, ${color}BB)` }}>
              <div className="absolute inset-0 opacity-30" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)" }} />
            </div>
          </div>
        </div>

        {/* Level dots */}
        <div className="flex items-center justify-between mt-3 px-1">
          {visibleLevels.map((lvl) => (
            <div key={lvl.level} className="flex flex-col items-center" style={{ flex: 1 }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{
                  backgroundColor: lvl.reached ? (LVL_COLORS[lvl.level] || "#10B981") : "var(--bg-subtle)",
                  color: lvl.reached ? "#fff" : "var(--text-muted)",
                  boxShadow: data.level === lvl.level ? `0 0 8px ${LVL_COLORS[lvl.level]}60` : "none",
                  border: data.level === lvl.level ? `2px solid ${LVL_COLORS[lvl.level]}` : "1px solid transparent"
                }}>
                {lvl.level}
              </div>
              <span className="text-[7px] mt-0.5 text-center leading-tight truncate w-12" style={{ color: lvl.reached ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {lvl.title.split(" ").slice(0, 2).join(" ")}
              </span>
            </div>
          ))}
        </div>
        {allLevels.length > maxShow && <p className="text-[9px] text-center mt-1" style={{ color: "var(--text-muted)" }}>{allLevels.length} levels total</p>}
      </div>

      {/* XP Rules */}
      {showXP && data.xpRules && (
        <div className="px-5 py-3 space-y-2" style={{ backgroundColor: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>How to Earn XP</p>
          {data.xpRules.map((r, i) => {
            const I = ACH_ICONS[r.icon] || Star;
            return (<div key={i} className="flex items-center gap-2"><I className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} /><span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{r.action}</span><span className="text-xs font-bold" style={{ color }}>{r.xp}</span></div>);
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x" style={{ backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        {[
          { val: data.lastScore || 0, label: "FIN. SCORE" },
          { val: data.lastSurvivalDays || 0, label: "RUNWAY" },
          { val: `${data.achievementCount || 0}/${data.totalAchievements || 24}`, label: "BADGES" },
          { val: data.maxBadgesUnlocked || data.achievementCount || 0, label: "PEAK" },
        ].map((s, i) => (
          <div key={i} className="py-3 text-center">
            <p className="text-base font-black" style={{ color: "var(--text-primary)" }}>{s.val}</p>
            <p className="text-[8px] font-semibold tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── EMERGENCY RUNWAY (was Survival Clock) ───
const EmergencyRunwayWidget = ({ data }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  if (!data) return null;
  const levelColor = data.levelColor || "#EF4444";
  const maxDays = 365;
  const pct = Math.min((data.survivalDays / maxDays) * 100, 100);
  const circ = 2 * Math.PI * 58;
  const offset = circ - (pct / 100) * circ;
  const fb = data.fundBreakdown || {};

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="survival-clock-widget">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5" style={{ color: levelColor }} />
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Emergency Runway</h3>
        <button onClick={() => setShowBreakdown(!showBreakdown)} className="ml-auto"><Info className="h-4 w-4" style={{ color: "var(--text-muted)" }} /></button>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>How long your accessible savings last if income stops today</p>

      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="58" fill="none" stroke="var(--border-light)" strokeWidth="8" />
            <circle cx="65" cy="65" r="58" fill="none" stroke={levelColor} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
              transform="rotate(-90 65 65)" style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black" style={{ color: "var(--text-primary)" }}>{data.survivalDays}</span>
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>DAYS</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          <div className="inline-flex px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${levelColor}15`, color: levelColor, border: `1px solid ${levelColor}30` }}>
            {data.level}
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Accessible Funds</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.effectiveFunds)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Monthly Essential Expenses</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.monthlyMandatoryExpense)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Daily Burn Rate</p>
            <p className="text-sm font-semibold" style={{ color: levelColor }}>&#8377;{fmt(data.dailyBurnRate)}/day</p>
          </div>
        </div>
      </div>

      {/* Tip */}
      {data.tip && (
        <p className="text-xs mt-3 p-2.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>{data.tip}</p>
      )}

      {/* Fund breakdown */}
      {showBreakdown && fb.details && (
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--border-light)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Where your funds are</p>
          {[
            { key: "instant", label: fb.instant?.label, amt: fb.instant?.total, desc: fb.instant?.description, color: "#10B981" },
            { key: "semi", label: fb.semiLiquid?.label, amt: fb.semiLiquid?.total, desc: fb.semiLiquid?.description, color: "#F59E0B" },
            { key: "mkt", label: fb.marketable?.label, amt: fb.marketable?.total, desc: fb.marketable?.description, color: "#3B82F6" },
            { key: "lock", label: fb.locked?.label, amt: fb.locked?.total, desc: fb.locked?.description, color: "#94A3B8" },
          ].filter(b => b.amt > 0 || b.key === "instant").map(b => (
            <div key={b.key} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.label}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
              </div>
              <span className="text-xs font-bold" style={{ color: b.color }}>&#8377;{fmt(b.amt || 0)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2" style={{ borderTop: "1px dashed var(--border-light)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Effective for Runway</span>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(fb.effectiveTotal || 0)}</span>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Note: FDs/RDs counted at 90% (early withdrawal penalty). Mutual Funds/Stocks at 85% (market risk). PPF/EPF not counted (locked).</p>
        </div>
      )}
    </div>
  );
};

// ─── FINANCIAL SCORE (was Control Score) ───
const FinancialScoreWidget = ({ data }) => {
  if (!data) return null;
  const gc = GRADE_COLORS[data.grade] || "#6B7280";
  const bd = data.breakdown || {};
  const bars = [
    { ...bd.savingsRate, color: "#10B981", key: "sr" },
    { ...bd.emiLoad, color: "#3B82F6", key: "el" },
    { ...bd.safetyBuffer, color: "#8B5CF6", key: "sb" },
    { ...bd.incomeConsistency, color: "#F59E0B", key: "ic" },
  ].filter(b => b.label);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="control-score-widget">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5" style={{ color: gc }} />
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Financial Score</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Your overall financial health rating based on 4 pillars</p>

      <div className="flex items-start gap-5">
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full flex flex-col items-center justify-center" style={{ border: `4px solid ${gc}`, backgroundColor: `${gc}10` }}>
            <span className="text-3xl font-black" style={{ color: gc }}>{data.finalScore}</span>
            <span className="text-xs font-bold" style={{ color: gc }}>Grade {data.grade}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {bars.map((bar) => (
            <div key={bar.key}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{bar.label}</span>
                <span className="text-xs font-bold" style={{ color: bar.color }}>{bar.score}/{bar.max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(bar.score / bar.max) * 100}%`, backgroundColor: bar.color }} />
              </div>
              {bar.help && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{bar.help}</p>}
            </div>
          ))}
        </div>
      </div>
      {data.metrics && (
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          {[
            { label: "Monthly Income", val: data.metrics.monthlyIncome },
            { label: "Monthly Expenses", val: data.metrics.monthlyExpenses },
            { label: "Total EMI", val: data.metrics.totalEMI },
            { label: "Accessible Funds", val: data.metrics.availableFunds },
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
        <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5" style={{ color: "#10B981" }} /><h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Smart Alerts</h3></div>
        <p className="text-sm text-center py-3" style={{ color: "#10B981" }}>All clear! No financial alerts right now.</p>
      </div>
    );
  }
  const alerts = expanded ? data.alerts : data.alerts.slice(0, 3);
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="behavior-alerts-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Smart Alerts</h3>
        </div>
        {data.highCount > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#FEE2E2", color: "#991B1B" }}>{data.highCount} Critical</span>}
      </div>
      <div className="space-y-2.5">
        {alerts.map((al, i) => {
          const s = SEVERITY_STYLES[al.severity] || SEVERITY_STYLES["LOW"];
          const I = ALERT_ICONS[al.icon] || AlertCircle;
          return (<div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}><div className="flex gap-3"><I className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: s.icon }} /><div className="flex-1 min-w-0"><p className="text-sm font-semibold" style={{ color: s.text }}>{al.message}</p>{al.detail && <p className="text-xs mt-1 opacity-80" style={{ color: s.text }}>{al.detail}</p>}</div></div></div>);
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

// ─── ACHIEVEMENTS ───
const AchievementsWidget = ({ data }) => {
  const [showAll, setShowAll] = useState(false);
  const [sel, setSel] = useState(null);
  if (!data?.allAchievements) return null;
  const sorted = [...data.allAchievements].sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0));
  const items = showAll ? sorted : sorted.slice(0, 8);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="achievements-widget">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} /><h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Badges</h3></div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>Peak: {data.maxBadgesUnlocked || data.achievementCount}</span>
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{data.achievementCount}/{data.totalAchievements}</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {items.map((a) => {
          const I = ACH_ICONS[a.icon] || Star;
          const cc = CAT_COLORS[a.category] || "#6B7280";
          return (
            <button key={a.code} onClick={() => setSel(sel?.code === a.code ? null : a)}
              className="flex flex-col items-center p-2 rounded-xl text-center transition-all relative"
              style={{ backgroundColor: a.unlocked ? `${cc}10` : "var(--bg-app)", border: a.unlocked ? `2px solid ${cc}` : "1px solid var(--border-light)", opacity: a.unlocked ? 1 : 0.30 }}>
              {a.unlocked && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: cc }}><CheckCircle className="h-2 w-2 text-white" /></div>}
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: a.unlocked ? `${cc}20` : "#F1F5F9" }}>
                <I className="h-4 w-4" style={{ color: a.unlocked ? cc : "#94A3B8" }} />
              </div>
              <p className="text-[8px] font-bold leading-tight" style={{ color: a.unlocked ? "var(--text-primary)" : "var(--text-muted)" }}>{a.title}</p>
              <span className="text-[7px] mt-0.5 font-medium" style={{ color: cc }}>+{a.xp_bonus} XP</span>
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            {(() => { const I = ACH_ICONS[sel.icon] || Star; return <I className="h-4 w-4" style={{ color: CAT_COLORS[sel.category] }} />; })()}
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{sel.title}</span>
            <button onClick={() => setSel(null)} className="ml-auto"><X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} /></button>
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{sel.description}</p>
          {sel.achieved_at && <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Unlocked: {new Date(sel.achieved_at).toLocaleDateString()}</p>}
        </div>
      )}
      {data.allAchievements.length > 8 && (
        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-medium flex items-center gap-1 mx-auto" style={{ color: "var(--brand-primary)" }}>
          {showAll ? "Show Less" : `View All ${data.allAchievements.length} Badges`}
        </button>
      )}
    </div>
  );
};

// ─── CHALLENGES ───
const ChallengesWidget = ({ data, onJoin, onLeave }) => {
  const [expCh, setExpCh] = useState(null);
  if (!data) return null;
  const { available = [], active = [], completed = [] } = data;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="flex items-center gap-2 mb-2">
        <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Challenges</h3>
      </div>
      <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: "var(--bg-subtle)", border: "1px dashed var(--border-light)" }}>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Challenges are time-bound financial goals you set for yourself. Join one, take real action with your money, and earn bonus XP when you achieve the target!
        </p>
      </div>

      {active.length > 0 && (
        <div className="space-y-2.5 mb-4">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Your Active Challenges</p>
          {active.map((c) => {
            const dl = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000));
            return (
              <div key={c.id} className="rounded-xl p-3.5" style={{ backgroundColor: "#EDE9FE", border: "1px solid #DDD6FE" }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><p className="text-sm font-bold" style={{ color: "#5B21B6" }}>{c.title}</p>{c.difficulty && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}20`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>}</div>
                    <p className="text-xs mt-0.5" style={{ color: "#7C3AED" }}>{c.description}</p>
                    <p className="text-[10px] mt-1" style={{ color: "#8B5CF6" }}>{dl} days left &middot; +{c.xp_reward} XP reward</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <p className="text-lg font-black" style={{ color: "#5B21B6" }}>{c.progress || 0}%</p>
                    <button onClick={() => onLeave(c.id)} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FEE2E280", color: "#991B1B" }} data-testid={`leave-challenge-${c.id}`}>Abandon</button>
                  </div>
                </div>
                <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#DDD6FE" }}>
                  <div className="h-full rounded-full" style={{ width: `${c.progress || 0}%`, backgroundColor: "#8B5CF6" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {available.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Available to Join</p>
          {available.map((c) => (
            <div key={c.code} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
              <div className="p-3.5 flex items-center gap-3" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.title}</p>{c.difficulty && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}20`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>}</div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.duration_days} days &middot; +{c.xp_reward} XP</p>
                </div>
                <button onClick={() => setExpCh(expCh === c.code ? null : c.code)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>{expCh === c.code ? <ChevronUp className="h-4 w-4" /> : <Info className="h-4 w-4" />}</button>
                <button onClick={() => onJoin(c.code)} className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "var(--brand-primary)" }} data-testid={`join-challenge-${c.code}`}>Join</button>
              </div>
              {expCh === c.code && c.explainer && (
                <div className="px-3.5 py-3 text-xs" style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)" }}>{c.explainer}</div>
              )}
            </div>
          ))}
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
  const handleProcess = async () => { setProcessing(true); await processWeekly(); setProcessing(false); };

  if (loading) {
    return (<div className="min-h-screen pb-24 flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}><div className="flex flex-col items-center gap-3"><RefreshCw className="h-8 w-8 animate-spin" style={{ color: "var(--brand-primary)" }} /><p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Loading your financial intelligence...</p></div></div>);
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }} data-testid="insights-page">
      <header className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate("/home", { replace: true })} className="flex items-center justify-center w-9 h-9 rounded-full" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }} data-testid="back-button"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Insights</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleProcess} disabled={processing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "var(--brand-primary)", opacity: processing ? 0.6 : 1 }} data-testid="process-weekly-btn">
            <Zap className="h-3.5 w-3.5" />{processing ? "..." : "Update"}
          </button>
          <button onClick={refresh} className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }} data-testid="refresh-btn"><RefreshCw className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="px-4 py-3 space-y-4 max-w-3xl mx-auto">
        <SurvivalWarning data={survivalClock} />
        <LevelJourney data={gamification} />
        <EmergencyRunwayWidget data={survivalClock} />
        <FinancialScoreWidget data={controlScore} />
        <BehaviorAlertsWidget data={behaviorAlerts} />
        <AchievementsWidget data={gamification} />
        <ChallengesWidget data={challenges} onJoin={joinChallenge} onLeave={leaveChallenge} />
        <div className="space-y-2.5 pt-2">
          <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Explore</p>
          {[
            { id: "analytics", title: "Analytics", desc: "Charts & trends", icon: BarChart3, color: "#8B5CF6", path: "/insights/analytics" },
            { id: "reports", title: "Reports", desc: "PDF & Excel export", icon: FileText, color: "#059669", path: "/insights/reports" },
          ].map((c) => { const I = c.icon; return (
            <button key={c.id} onClick={() => navigate(c.path)} className="w-full rounded-xl p-4 text-left flex items-center gap-4 active:scale-[0.98]" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={`insights-${c.id}-card`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${c.color}15` }}><I className="h-5 w-5" style={{ color: c.color }} /></div>
              <div className="flex-1"><p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{c.title}</p><p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.desc}</p></div>
              <ChevronRight className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </button>
          ); })}
        </div>
      </div>
      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Insights;

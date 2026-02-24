import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import ShareScoreCard from "@/components/ShareScoreCard";
import RunwaySimulator from "@/components/RunwaySimulator";
import MoneyPatternWidget from "@/components/MoneyPatternWidget";
import { useState } from "react";
import { useIntelligenceData } from "@/hooks/useIntelligenceData";
import {
  ArrowLeft, BarChart3, FileText, ChevronRight, RefreshCw,
  Shield, Target, AlertTriangle, Flame, Trophy, Star,
  TrendingUp, TrendingDown, Clock, Zap, Award, ChevronDown, ChevronUp,
  AlertCircle, Info, X, Share2,
  HeartPulse, LifeBuoy, PieChart, ListChecks, Flag,
  Lock, XCircle, PiggyBank, CheckCircle, Rocket, Medal, Crown,
  Gauge, Swords, ShieldCheck, Castle
} from "lucide-react";

// ─── HELPERS ───
const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `₹${(n/100000).toFixed(1)}L`; if (a >= 1000) return `₹${(n/1000).toFixed(0)}K`; return `₹${n.toFixed(0)}`; };
const fmtNum = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

// Icon map for achievements
const ACH_ICONS = {
  "rocket": Rocket, "shield": Shield, "shield-check": ShieldCheck, "castle": Castle, "crown": Crown,
  "star": Star, "life-buoy": LifeBuoy, "gauge": Gauge, "target": Target, "award": Award,
  "trending-up": TrendingUp, "trending-down": TrendingDown, "check-circle": CheckCircle,
  "flame": Flame, "trophy": Trophy, "medal": Medal, "bar-chart-3": BarChart3,
  "pie-chart": PieChart, "piggy-bank": PiggyBank, "x-circle": XCircle, "list-checks": ListChecks,
  "heart-pulse": HeartPulse, "alert-circle": AlertCircle, "flag": Flag, "lock": Lock,
  "swords": Swords, "info": Info,
};
const TIER_COLORS = { bronze: "#CD7F32", silver: "#94A3B8", gold: "#F59E0B", platinum: "#8B5CF6" };
const TIER_BG = { bronze: "#CD7F3215", silver: "#94A3B815", gold: "#F59E0B15", platinum: "#8B5CF615" };
const CAT_LABELS = {
  survival: "Survival & Liquidity", score: "Financial Score", behavior: "Behavior",
  savings: "Savings & Cash", debt: "Debt Control", investment: "Investment",
  streak: "Streak & Consistency", elite: "Power & Elite"
};
const PHASE_META = {
  1: { label: "Critical", color: "#EF4444", emoji: "PHASE 1" },
  2: { label: "Stabilizing", color: "#F97316", emoji: "PHASE 2" },
  3: { label: "Control", color: "#EAB308", emoji: "PHASE 3" },
  4: { label: "Growth", color: "#22C55E", emoji: "PHASE 4" },
  5: { label: "Power", color: "#3B82F6", emoji: "PHASE 5" },
};

// ─── SURVIVAL WARNING BANNER ───
const SurvivalWarning = ({ data }) => {
  if (!data || data.survivalDays > 90) return null;
  const color = data.survivalDays < 30 ? "#DC2626" : "#F59E0B";
  return (
    <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ backgroundColor: `${color}10`, border: `1px solid ${color}30` }} data-testid="survival-warning">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color }} />
      <div>
        <p className="text-xs font-bold" style={{ color }}>{data.survivalDays < 30 ? "CRITICAL" : "Warning"}: Only {data.survivalDays} days of runway</p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{data.explanation}</p>
      </div>
    </div>
  );
};

// ─── 20-STAGE JOURNEY (Show ~10 around current) ───
const StageJourney = ({ data, onShare }) => {
  const [showXpRules, setShowXpRules] = useState(false);
  if (!data) return null;

  const level = data.level || 1;
  const title = data.title || "Getting Started";
  const xp = data.currentXP || data.xp || 0;
  const nextXp = data.nextLevelXP || data.nextLevelXp || 100;
  const xpPct = Math.min((xp / nextXp) * 100, 100);

  // Get visible stages from survival clock (will be passed as prop)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="stage-journey">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center" style={{ background: `linear-gradient(135deg, ${data.color || "#059669"}30, ${data.color || "#059669"}10)`, border: `2px solid ${data.color || "#059669"}50` }}>
            <span className="text-xl font-black" style={{ color: data.color || "#059669" }}>{level}</span>
          </div>
          <div className="flex-1">
            <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{title}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{fmtNum(xp)} XP · Level {level} of 20</p>
            <div className="mt-1.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${xpPct}%`, backgroundColor: data.color || "#059669" }} />
            </div>
          </div>
        </div>

        {/* XP Rules */}
        <button onClick={() => setShowXpRules(!showXpRules)} className="mt-3 text-[10px] font-bold flex items-center gap-1" style={{ color: "var(--brand-primary)" }} data-testid="xp-rules-toggle">
          {showXpRules ? <ChevronUp className="h-3 w-3" /> : <Info className="h-3 w-3" />}
          {showXpRules ? "Hide XP rules" : "How to earn XP?"}
        </button>
        {showXpRules && data.xpRules && (
          <div className="mt-2 space-y-1">
            {data.xpRules.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <span style={{ color: "var(--text-secondary)" }}>{r.rule}</span>
                <span className="font-bold" style={{ color: "var(--brand-primary)" }}>+{r.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 divide-x" style={{ backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        {[
          { val: data.lastScore || 0, label: "FIN. SCORE" },
          { val: data.lastSurvivalDays || 0, label: "RUNWAY" },
          { val: `${data.achievementCount || 0}/${data.totalAchievements || 100}`, label: "BADGES" },
          { val: data.maxBadgesUnlocked || data.achievementCount || 0, label: "PEAK" },
        ].map((s, i) => (
          <div key={i} className="py-3 text-center">
            <p className="text-base font-black" style={{ color: "var(--text-primary)" }}>{s.val}</p>
            <p className="text-[8px] font-semibold tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Share button */}
      {onShare && (
        <button onClick={onShare} className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)", color: "var(--brand-primary)" }}
          data-testid="share-card-btn">
          <Share2 className="h-3.5 w-3.5" /> Share Your Financial Score Card
        </button>
      )}
    </div>
  );
};

// ─── SURVIVAL STAGES (20 stages, show ~10) ───
const SurvivalStages = ({ data }) => {
  if (!data?.visibleStages) return null;
  const stages = data.visibleStages;
  const pm = PHASE_META[data.phaseNum] || PHASE_META[1];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="survival-stages-widget">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pm.color}15` }}>
              <Shield className="h-4 w-4" style={{ color: pm.color }} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Survival Stage {data.stage}/20</p>
              <p className="text-sm font-bold" style={{ color: pm.color }}>{pm.emoji}: {pm.label} Zone</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-black" style={{ color: data.levelColor }}>{data.level}</p>
            <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{data.survivalDays} days</p>
          </div>
        </div>
      </div>

      {/* Stage dots - show ~10 around current */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1">
          {stages.map((s) => (
            <div key={s.stage} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-sm transition-all" style={{
                height: s.current ? "20px" : s.reached ? "12px" : "6px",
                backgroundColor: s.reached ? s.color : "var(--bg-subtle)",
                border: s.current ? `2px solid ${s.color}` : "none",
                boxShadow: s.current ? `0 0 8px ${s.color}40` : "none",
              }} />
              <span className="text-[7px] font-bold" style={{ color: s.current ? s.color : s.reached ? "var(--text-muted)" : "var(--text-muted)" }}>
                {s.current ? s.stage : (s.stage === stages[0].stage || s.stage === stages[stages.length-1].stage) ? s.stage : ""}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{stages[0].name}</span>
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{stages[stages.length-1].name}</span>
        </div>
      </div>
    </div>
  );
};

// ─── EMERGENCY RUNWAY with 3-Buffer Display ───
const EmergencyRunwayWidget = ({ data }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  if (!data) return null;

  const fb = data.fundBreakdown || {};

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="emergency-runway">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" style={{ color: data.levelColor }} />
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Emergency Runway</h3>
          </div>
          <button onClick={() => setShowBreakdown(!showBreakdown)} className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }} data-testid="runway-breakdown-btn">
            <Info className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Main metric */}
        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-black" style={{ color: data.levelColor }}>{data.survivalDays}</span>
          <span className="text-sm font-medium mb-1" style={{ color: "var(--text-muted)" }}>days</span>
          <div className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${data.levelColor}15`, color: data.levelColor }}>
            Stage {data.stage}: {data.level}
          </div>
        </div>

        {/* 3 Buffer Numbers */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: "Liquid Buffer", val: fb.liquidBuffer, desc: "Instant access", color: "#10B981" },
            { label: "Extended Buffer", val: fb.extendedBuffer, desc: "Including 60% semi-liquid", color: "#3B82F6" },
            { label: "Total Net Worth", val: fb.netWorth, desc: "All assets", color: "#8B5CF6" },
          ].map((b, i) => (
            <div key={i} className="p-2.5 rounded-xl text-center" style={{ backgroundColor: `${b.color}08`, border: `1px solid ${b.color}15` }}>
              <p className="text-xs font-black" style={{ color: b.color }}>{fmt(b.val || 0)}</p>
              <p className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>{b.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Monthly Essential</p>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{fmt(data.monthlyMandatoryExpense)}</p>
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Daily Burn Rate</p>
            <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{fmt(data.dailyBurnRate)}/day</p>
          </div>
        </div>

        {/* Fund Breakdown */}
        {showBreakdown && fb && (
          <div className="mt-3 space-y-2" style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Fund Breakdown by Liquidity</p>
            {/* Category summaries */}
            {[
              { ...fb.liquid, badge: "100%", badgeColor: "#10B981" },
              { ...fb.semiLiquid, badge: "60%", badgeColor: "#3B82F6" },
              { ...fb.illiquid, badge: "0%", badgeColor: "#6B7280" },
            ].filter(c => c.total > 0).map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{cat.label}</p>
                  <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{cat.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{fmt(cat.total)}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${cat.badgeColor}15`, color: cat.badgeColor }}>
                    {cat.badge} in survival
                  </span>
                </div>
              </div>
            ))}
            {/* Individual assets */}
            {fb.details?.slice(0, 8).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] px-2">
                <span style={{ color: "var(--text-secondary)" }}>{d.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{fmt(d.amount)}</span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{
                    backgroundColor: d.category === "liquid" ? "#10B98115" : d.category === "semi_liquid" ? "#3B82F615" : "#6B728015",
                    color: d.category === "liquid" ? "#10B981" : d.category === "semi_liquid" ? "#3B82F6" : "#6B7280"
                  }}>{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] mt-3 p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-muted)" }}>
          <Info className="h-3 w-3 inline mr-1" />{data.tip}
        </p>
      </div>
    </div>
  );
};

// ─── FINANCIAL SCORE ───
const ControlScoreWidget = ({ data }) => {
  const [showHelp, setShowHelp] = useState(false);
  if (!data) return null;

  const bd = data.breakdown || {};
  const bars = [
    { ...bd.savingsRate, label: "Savings Rate", help: "How much you save vs earn" },
    { ...bd.emiLoad, label: "EMI Load", help: "How much EMI eats your income" },
    { ...bd.safetyBuffer, label: "Safety Buffer", help: "Emergency fund coverage" },
    { ...bd.incomeConsistency, label: "Income Consistency", help: "Income stability" },
  ].filter(b => b.score !== undefined);

  const score = data.finalScore || data.score || 0;
  const grade = data.grade || "C";
  const gradeColor = score >= 85 ? "#10B981" : score >= 70 ? "#3B82F6" : score >= 55 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
  const m = data.metrics || {};

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="financial-score">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5" style={{ color: gradeColor }} />
            <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Financial Score</h3>
          </div>
          <button onClick={() => setShowHelp(!showHelp)} className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <Info className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center" style={{ border: `3px solid ${gradeColor}`, boxShadow: `0 0 20px ${gradeColor}20` }}>
            <span className="text-2xl font-black" style={{ color: gradeColor }}>{score}</span>
            <span className="text-[9px] font-bold" style={{ color: gradeColor }}>GRADE {grade}</span>
          </div>
          <div className="flex-1 space-y-2">
            {bars.map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span style={{ color: "var(--text-muted)" }}>{b.label}</span>
                  <span className="font-bold" style={{ color: "var(--text-primary)" }}>{b.score}/{b.max}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                  <div className="h-full rounded-full" style={{ width: `${(b.score / b.max) * 100}%`, backgroundColor: gradeColor }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {showHelp && (
          <div className="p-3 rounded-lg text-[10px] space-y-1" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
            {bars.map((b, i) => (
              <p key={i}><strong>{b.label} ({b.score}/{b.max})</strong>: {b.help}</p>
            ))}
            <p className="mt-1" style={{ color: "var(--text-muted)" }}>Score = sum of all 4 pillars (out of 100)</p>
          </div>
        )}

        {/* Monthly metrics */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: "Income", val: m.monthlyIncome },
            { label: "Expenses", val: m.monthlyExpenses },
            { label: "Total EMI", val: m.totalEMI },
            { label: "Liquid Funds", val: m.availableFunds },
          ].map((mt, i) => (
            <div key={i} className="text-center p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{mt.label}</p>
              <p className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>{fmt(mt.val || 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── BADGES GRID (100 badges, grouped by category, tier-colored) ───
const BadgesWidget = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  if (!data?.allAchievements) return null;

  const all = data.allAchievements;
  const unlocked = all.filter(a => a.unlocked);
  const filtered = activeCategory === "all" ? all : all.filter(a => a.category === activeCategory);
  const showList = expanded ? filtered : filtered.filter(a => a.unlocked).slice(0, 8);

  const categories = [...new Set(all.map(a => a.category))];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="badges-widget">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Badges</h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-black" style={{ color: "var(--text-primary)" }}>{unlocked.length}</span>
            <span style={{ color: "var(--text-muted)" }}>/ {all.length}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: "#F59E0B15", color: "#F59E0B" }}>
              Peak: {data.maxBadgesUnlocked || unlocked.length}
            </span>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setActiveCategory("all")}
            className="px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap flex-shrink-0"
            style={{
              backgroundColor: activeCategory === "all" ? "var(--brand-primary)" : "var(--bg-subtle)",
              color: activeCategory === "all" ? "#fff" : "var(--text-muted)"
            }} data-testid="badge-filter-all">All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)}
              className="px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: activeCategory === c ? "var(--brand-primary)" : "var(--bg-subtle)",
                color: activeCategory === c ? "#fff" : "var(--text-muted)"
              }} data-testid={`badge-filter-${c}`}>{CAT_LABELS[c] || c}</button>
          ))}
        </div>
      </div>

      {/* Badges grid */}
      <div className="px-5 pb-3 grid grid-cols-4 gap-2">
        {showList.map((a) => {
          const Icon = ACH_ICONS[a.icon] || Star;
          const tierColor = a.unlocked ? (TIER_COLORS[a.tier] || "#6B7280") : "var(--text-muted)";
          const tierBg = a.unlocked ? (TIER_BG[a.tier] || "#6B728010") : "var(--bg-subtle)";
          return (
            <div key={a.code} className="flex flex-col items-center p-2 rounded-xl text-center transition-all"
              style={{
                backgroundColor: tierBg,
                border: a.unlocked ? `1.5px solid ${tierColor}40` : "1.5px solid transparent",
                opacity: a.unlocked ? 1 : 0.4,
                filter: a.unlocked ? "none" : "grayscale(1)",
              }} data-testid={`badge-${a.code}`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-1" style={{
                backgroundColor: a.unlocked ? `${tierColor}20` : "transparent",
              }}>
                <Icon className="h-4 w-4" style={{ color: tierColor }} />
              </div>
              <p className="text-[8px] font-bold leading-tight" style={{ color: a.unlocked ? tierColor : "var(--text-muted)" }}>{a.title}</p>
              {a.unlocked && (
                <span className="text-[7px] font-bold mt-0.5 px-1 rounded uppercase" style={{ backgroundColor: `${tierColor}15`, color: tierColor }}>
                  {a.tier}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tier legend */}
      <div className="px-5 pb-2 flex gap-3 justify-center">
        {["bronze", "silver", "gold", "platinum"].map(t => (
          <div key={t} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[t] }} />
            <span className="text-[8px] font-medium capitalize" style={{ color: "var(--text-muted)" }}>{t}</span>
          </div>
        ))}
      </div>

      <button onClick={() => setExpanded(!expanded)}
        className="w-full py-2.5 text-[10px] font-bold flex items-center justify-center gap-1"
        style={{ borderTop: "1px solid var(--border-light)", color: "var(--brand-primary)" }}
        data-testid="badges-expand-btn">
        {expanded ? "Show Less" : `View All ${filtered.length} Badges`}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </div>
  );
};

// ─── CHALLENGES ───
const DIFF_COLORS = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

const ChallengesWidget = ({ challenges, onJoin, onLeave }) => {
  const [expCh, setExpCh] = useState(null);
  if (!challenges) return null;

  const active = challenges.active || [];
  const available = challenges.available || [];
  const completed = challenges.completed || [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Challenges</h3>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#8B5CF615", color: "#8B5CF6" }}>
            {active.length} active
          </span>
        </div>
      </div>

      {active.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>Active</p>
          {active.map((c) => (
            <div key={c.id} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <button onClick={() => onLeave(c.id)} className="text-[9px] font-bold px-2 py-1 rounded" style={{ color: "#EF4444", backgroundColor: "#EF444410" }} data-testid={`leave-challenge-${c.id}`}>Abandon</button>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full" style={{ width: `${(c.progress / c.target) * 100}%`, backgroundColor: "#10B981" }} />
              </div>
              <p className="text-[9px] mt-1" style={{ color: "var(--text-muted)" }}>{c.progress}/{c.target} · {c.daysLeft}d left</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pb-4 space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Available ({available.length})</p>
        {available.slice(0, 6).map((c) => (
          <div key={c.code} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}15`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{c.description}</p>
              </div>
              <button onClick={() => onJoin(c.code)} className="ml-2 text-[9px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "var(--brand-primary)" }} data-testid={`join-challenge-${c.code}`}>Join</button>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[9px]" style={{ color: "var(--text-muted)" }}>
              <span>{c.duration_days}d</span>
              <span>+{c.xp_reward} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── MAIN INSIGHTS PAGE ───
const Insights = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const { survivalClock, controlScore, behaviorAlerts, gamification, challenges, moneyPattern, loading, refresh, processWeekly, joinChallenge, leaveChallenge } = useIntelligenceData();
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    setProcessing(true);
    await processWeekly();
    setProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
        <div className="animate-spin h-8 w-8 border-3 border-t-transparent rounded-full" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: "var(--bg-app)" }}>
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: "var(--bg-app)", borderBottom: "1px solid var(--border-light)" }}>
        <button onClick={() => navigate(-1)} data-testid="insights-back-btn"><ArrowLeft className="h-5 w-5" style={{ color: "var(--text-primary)" }} /></button>
        <h1 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Insights</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={handleProcess} disabled={processing} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95" style={{ backgroundColor: "var(--brand-primary)", opacity: processing ? 0.6 : 1 }} data-testid="process-weekly-btn">
            <Zap className="h-3.5 w-3.5" />{processing ? "Updating..." : "Update"}
          </button>
          <button onClick={refresh} className="p-2 rounded-xl" style={{ backgroundColor: "var(--bg-card)" }} data-testid="refresh-btn"><RefreshCw className="h-4 w-4" style={{ color: "var(--text-muted)" }} /></button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-3xl mx-auto">
        <SurvivalWarning data={survivalClock} />
        <StageJourney data={gamification} onShare={() => setShowShareCard(true)} />
        <SurvivalStages data={survivalClock} />
        <EmergencyRunwayWidget data={survivalClock} />
        <RunwaySimulator currentData={survivalClock} />
        <MoneyPatternWidget data={moneyPattern} />
        <ControlScoreWidget data={controlScore} />
        <BadgesWidget data={gamification} />
        <ChallengesWidget challenges={challenges} onJoin={joinChallenge} onLeave={leaveChallenge} />

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Analytics", desc: "Charts & trends", icon: BarChart3, route: "/analytics" },
            { label: "Reports", desc: "Download PDF", icon: FileText, route: "/reports" },
          ].map((l) => {
            const I = l.icon;
            return (
              <button key={l.label} onClick={() => navigate(l.route)} className="p-4 rounded-2xl flex items-center gap-3 text-left active:scale-[0.98] transition-all" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
                <I className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{l.label}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto" style={{ color: "var(--text-muted)" }} />
              </button>
            );
          })}
        </div>
      </div>

      <AddActionSheet isOpen={showAddSheet} onClose={() => setShowAddSheet(false)} />
      <ShareScoreCard isOpen={showShareCard} onClose={() => setShowShareCard(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Insights;

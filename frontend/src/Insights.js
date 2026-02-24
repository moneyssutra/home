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
  AlertCircle, Info, Share2,
  HeartPulse, LifeBuoy, PieChart, ListChecks, Flag,
  Lock, XCircle, PiggyBank, CheckCircle, Rocket, Medal, Crown,
  Gauge, Swords, ShieldCheck, Castle
} from "lucide-react";

// ─── HELPERS ───
const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(0)}K`; return n.toFixed(0); };

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
  survival: "Survival", score: "Score", behavior: "Behavior", savings: "Savings",
  debt: "Debt", investment: "Investment", streak: "Streak", elite: "Elite"
};
const PHASE_META = {
  1: { label: "Critical", color: "#EF4444" },
  2: { label: "Stabilizing", color: "#F97316" },
  3: { label: "Control", color: "#EAB308" },
  4: { label: "Growth", color: "#22C55E" },
  5: { label: "Power", color: "#3B82F6" },
};
const DIFF_COLORS = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

// Plain-language stage explanations a kid could understand
const STAGE_EXPLAIN = {
  "Exposed": "Almost no savings backup. If income stops, you'd struggle within days.",
  "Unstable": "About 1-2 weeks of backup. One surprise expense could be a problem.",
  "Vulnerable": "About 2-3 weeks of backup. Still risky — keep building your safety net.",
  "Recovering": "About 1 month of backup. Good start, but keep going!",
  "Balancing": "1-1.5 months without income. You're getting more stable.",
  "Securing": "About 2 months of backup. A decent safety net is forming.",
  "Shielded": "2-2.5 months covered. Protected against most short-term surprises.",
  "Grounded": "3 months covered — the minimum experts recommend!",
  "Structured": "3-4 months covered. Your finances have real structure now.",
  "Disciplined": "4+ months covered. Your discipline is paying off.",
  "In Control": "5 months of runway. You control your money, not the other way around.",
  "Stabilized": "6 months covered. Half a year of safety — that's real stability!",
  "Advancing": "6-7 months covered. Past safety net territory, into wealth-building.",
  "Strategic": "8 months covered. Your money strategy is working well.",
  "Expanding": "8-9 months covered. Your financial reach is growing steadily.",
  "Wealth Builder": "9-12 months covered! Your savings can last nearly a year without income.",
  "Fortified": "1-1.5 years of runway. Very few surprises can shake you.",
  "Independent": "1.5-2 years covered. Approaching financial independence!",
  "Financially Free": "2-3 years of runway. Almost nothing can shake your foundation.",
  "Sovereign": "3+ years covered. Complete financial freedom achieved.",
};

// ─── SURVIVAL WARNING ───
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

// ─── COMBINED: YOUR FINANCIAL STAGE + XP ───
const LevelAndStagesWidget = ({ gamData, clockData, onShare }) => {
  const [showXpRules, setShowXpRules] = useState(false);
  const [showAllStages, setShowAllStages] = useState(false);
  if (!gamData) return null;

  const stageName = clockData?.level || "—";
  const stageNum = clockData?.stage || 0;
  const stageColor = clockData?.levelColor || "#059669";
  const pm = PHASE_META[clockData?.phaseNum] || PHASE_META[1];
  const survDays = clockData?.survivalDays || 0;
  const allStages = clockData?.allStages || clockData?.visibleStages || [];

  const xp = gamData.currentXP || gamData.xp || 0;
  const nextXp = gamData.nextLevelXP || gamData.nextLevelXp || 100;
  const xpPct = Math.min((xp / nextXp) * 100, 100);
  const crossed = allStages.filter(s => s.reached && !s.current).length;
  const remaining = allStages.filter(s => !s.reached && !s.current).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="stage-journey">
      {/* Header */}
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <Rocket className="h-4 w-4" style={{ color: "#8B5CF6" }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Financial Journey</h3>
      </div>
      {/* Main identity */}
      <div className="p-5 pb-3 pt-2">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${stageColor}25, ${stageColor}08)`, border: `2px solid ${stageColor}50` }}>
            <span className="text-2xl font-black leading-none" style={{ color: stageColor }}>{stageNum}</span>
            <span className="text-[8px] font-bold tracking-wide" style={{ color: stageColor }}>STAGE</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: pm.color }}>{pm.label} Zone</p>
            <p className="text-xl font-black leading-tight" style={{ color: "var(--text-primary)" }}>{stageName}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{survDays} days runway · Stage {stageNum} of 20</p>
            {STAGE_EXPLAIN[stageName] && (
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "var(--text-secondary)" }} data-testid="stage-explanation">
                {STAGE_EXPLAIN[stageName]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* All 20 stages visual bar */}
      {allStages.length > 0 && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Your Journey</span>
            <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
              <span className="font-bold" style={{ color: stageColor }}>{crossed}</span> crossed · <span className="font-bold">{remaining}</span> to go
            </span>
            <button onClick={() => setShowAllStages(!showAllStages)} className="ml-1.5 p-0.5" data-testid="stages-info-btn">
              <Info className="h-3.5 w-3.5" style={{ color: showAllStages ? "var(--brand-primary)" : "var(--text-muted)" }} />
            </button>
          </div>
          <div className="flex items-end gap-[3px]">
            {allStages.map((s) => (
              <div key={s.stage} className="flex-1 flex flex-col items-center" title={`${s.stage}. ${s.name}`}>
                <div className="w-full rounded-sm transition-all" style={{
                  height: s.current ? "18px" : s.reached ? "10px" : "6px",
                  backgroundColor: s.reached || s.current ? s.color : "var(--bg-subtle)",
                  boxShadow: s.current ? `0 0 6px ${s.color}50` : "none",
                  opacity: !s.reached && !s.current ? 0.4 : 1,
                }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>1 · {allStages[0]?.name}</span>
            <span className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>20 · {allStages[allStages.length - 1]?.name}</span>
          </div>
        </div>
      )}

      {/* Expandable: all 20 stages detail */}
      {showAllStages && allStages.length > 0 && (
        <div className="px-5 pb-3">
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-light)" }}>
            <div className="max-h-[240px] overflow-y-auto">
              {allStages.map((s) => {
                const isCurrent = s.current;
                const isReached = s.reached;
                const pMeta = PHASE_META[s.phase_num] || {};
                return (
                  <div key={s.stage} className="flex items-center gap-2.5 px-3 py-2" style={{
                    backgroundColor: isCurrent ? `${s.color}10` : "transparent",
                    borderBottom: "1px solid var(--border-light)",
                    borderLeft: isCurrent ? `3px solid ${s.color}` : "3px solid transparent"
                  }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black" style={{
                      backgroundColor: isReached || isCurrent ? s.color : "var(--bg-subtle)",
                      color: isReached || isCurrent ? "#fff" : "var(--text-muted)"
                    }}>{s.stage}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold" style={{ color: isCurrent ? s.color : isReached ? "var(--text-primary)" : "var(--text-muted)" }}>{s.name}</span>
                        {isCurrent && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${s.color}20`, color: s.color }}>YOU</span>}
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {s.min}-{s.max > 9000 ? "∞" : s.max} days · {pMeta.label || s.phase}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {isReached && !isCurrent && <CheckCircle className="h-3.5 w-3.5" style={{ color: s.color }} />}
                      {isCurrent && <Zap className="h-3.5 w-3.5" style={{ color: s.color }} />}
                      {!isReached && !isCurrent && <Lock className="h-3 w-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* XP bar */}
      <div className="px-5 pb-3 flex items-center gap-3">
        <Zap className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#F59E0B" }} />
        <div className="flex-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="h-full rounded-full" style={{ width: `${xpPct}%`, backgroundColor: "#F59E0B" }} />
          </div>
        </div>
        <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{fmt(xp)} XP</span>
        <button onClick={() => setShowXpRules(!showXpRules)} className="text-[10px] font-bold" style={{ color: "var(--brand-primary)" }} data-testid="xp-rules-toggle">
          {showXpRules ? "Hide" : "XP?"}
        </button>
      </div>

      {showXpRules && gamData.xpRules && (
        <div className="px-5 pb-3 space-y-1">
          {gamData.xpRules.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] px-2 py-1 rounded" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <span style={{ color: "var(--text-primary)" }}>{r.action || r.rule || "Action"}</span>
              <span className="font-bold flex-shrink-0 ml-2" style={{ color: "#F59E0B" }}>{r.xp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x" style={{ borderTop: "1px solid var(--border-light)", borderColor: "var(--border-light)" }}>
        {[
          { val: gamData.lastScore || 0, label: "FIN. SCORE" },
          { val: survDays || gamData.lastSurvivalDays || 0, label: "RUNWAY" },
          { val: `${gamData.achievementCount || 0}/${gamData.totalAchievements || 100}`, label: "BADGES" },
          { val: gamData.maxBadgesUnlocked || gamData.achievementCount || 0, label: "PEAK" },
        ].map((s, i) => (
          <div key={i} className="py-3 text-center">
            <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{s.val}</p>
            <p className="text-[8px] font-semibold tracking-wider" style={{ color: "var(--text-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Share button */}
      {onShare && (
        <button onClick={onShare} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all active:scale-[0.98]"
          style={{ backgroundColor: "var(--bg-subtle)", borderTop: "1px solid var(--border-light)", color: "var(--brand-primary)" }}
          data-testid="share-card-btn">
          <Share2 className="h-3.5 w-3.5" /> Share Your Financial Score Card
        </button>
      )}
    </div>
  );
};

// ─── EMERGENCY RUNWAY (Original ring design + 3-buffer) ───
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
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="emergency-runway">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5" style={{ color: levelColor }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Emergency Runway</h3>
        <button onClick={() => setShowBreakdown(!showBreakdown)} className="ml-auto" data-testid="runway-breakdown-btn">
          <Info className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </button>
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
            Stage {data.stage}: {data.level}
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Accessible Funds</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.effectiveFunds)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Monthly Essential</p>
            <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(data.monthlyMandatoryExpense)}</p>
          </div>
          <div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Daily Burn Rate</p>
            <p className="text-sm font-semibold" style={{ color: levelColor }}>&#8377;{fmt(data.dailyBurnRate)}/day</p>
          </div>
        </div>
      </div>

      {/* 3 Buffer Numbers */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[
          { label: "Liquid Buffer", val: fb.liquidBuffer, color: "#10B981" },
          { label: "Extended Buffer", val: fb.extendedBuffer, color: "#3B82F6" },
          { label: "Total Net Worth", val: fb.netWorth, color: "#8B5CF6" },
        ].map((b, i) => (
          <div key={i} className="p-2 rounded-xl text-center" style={{ backgroundColor: `${b.color}08`, border: `1px solid ${b.color}15` }}>
            <p className="text-xs font-black" style={{ color: b.color }}>&#8377;{fmt(b.val || 0)}</p>
            <p className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>{b.label}</p>
          </div>
        ))}
      </div>

      {data.tip && <p className="text-xs mt-3 p-2.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}>{data.tip}</p>}

      {/* Fund breakdown */}
      {showBreakdown && fb && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--border-light)" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Where your funds are</p>
          {[
            { key: "liquid", label: fb.liquid?.label, amt: fb.liquid?.total, desc: fb.liquid?.description, color: "#10B981", badge: "100%" },
            { key: "semi_liquid", label: fb.semiLiquid?.label, amt: fb.semiLiquid?.total, desc: fb.semiLiquid?.description, color: "#3B82F6", badge: "60%" },
            { key: "illiquid", label: fb.illiquid?.label, amt: fb.illiquid?.total, desc: fb.illiquid?.description, color: "#94A3B8", badge: "0%" },
          ].filter(b => b.amt > 0).map((b, i) => {
            const items = (fb.details || []).filter(d => d.category === b.key);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{b.label}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.desc}</p>
                  </div>
                  <div className="text-right flex items-center gap-1.5">
                    <span className="text-xs font-bold" style={{ color: b.color }}>&#8377;{fmt(b.amt)}</span>
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: `${b.color}15`, color: b.color }}>{b.badge}</span>
                  </div>
                </div>
                {items.length > 0 && (
                  <div className="ml-4 pl-2 space-y-1" style={{ borderLeft: `2px solid ${b.color}20` }}>
                    {items.map((item, j) => (
                      <div key={j} className="flex items-center justify-between">
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex justify-between pt-2" style={{ borderTop: "1px dashed var(--border-light)" }}>
            <span className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Effective for Runway</span>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>&#8377;{fmt(fb.effectiveTotal || 0)}</span>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Semi-liquid counted at 60% (withdrawal delay + market risk). Illiquid not counted (locked).</p>
        </div>
      )}
    </div>
  );
};

// ─── FINANCIAL SCORE (Original design with individual colors per pillar) ───
const FinancialScoreWidget = ({ data }) => {
  if (!data) return null;
  const score = data.finalScore || data.score || 0;
  const grade = data.grade || "C";
  const gc = score >= 85 ? "#10B981" : score >= 70 ? "#3B82F6" : score >= 55 ? "#F59E0B" : score >= 40 ? "#F97316" : "#EF4444";
  const m = data.metrics || {};
  const bd = data.breakdown || {};
  const bars = [
    { ...bd.savingsRate, color: "#10B981", help: "How much you save vs earn" },
    { ...bd.emiLoad, color: "#3B82F6", help: "How much EMI eats your income" },
    { ...bd.safetyBuffer, color: "#8B5CF6", help: "Emergency fund coverage" },
    { ...bd.incomeConsistency, color: "#F59E0B", help: "Income stability & consistency" },
  ].filter(b => b.label);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const period = data.scorePeriod?.label;

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="financial-score">
      <div className="flex items-center gap-2 mb-1">
        <Target className="h-5 w-5" style={{ color: gc }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Financial Score</h3>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        {period ? `Rolling 3-month window: ${period}` : `Updated ${today}`}
      </p>

      <div className="flex items-center gap-5">
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center" style={{ background: `linear-gradient(135deg, ${gc}20, ${gc}05)`, border: `2px solid ${gc}40` }}>
          <span className="text-3xl font-black" style={{ color: gc }}>{score}</span>
          <span className="text-[9px] font-bold" style={{ color: gc }}>GRADE {grade}</span>
        </div>
        <div className="flex-1 space-y-2">
          {bars.map((b, i) => (
            <div key={i}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span style={{ color: "var(--text-secondary)" }}>{b.label}</span>
                <span className="font-bold" style={{ color: b.color }}>{b.score}/{b.max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(b.score / b.max) * 100}%`, backgroundColor: b.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly metrics */}
      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: "Income", val: m.monthlyIncome, color: "#10B981" },
          { label: "Expenses", val: m.monthlyExpenses, color: "#EF4444" },
          { label: "Total EMI", val: m.totalEMI, color: "#F59E0B" },
          { label: "Ext. Buffer", val: m.availableFunds, color: "#3B82F6" },
        ].map((mt, i) => (
          <div key={i} className="text-center p-1.5 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{mt.label}</p>
            <p className="text-[10px] font-bold" style={{ color: mt.color }}>&#8377;{fmt(mt.val || 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── BADGES (Scrollable, max 4 rows visible) ───
const BadgesWidget = ({ data }) => {
  const [activeCategory, setActiveCategory] = useState("all");
  if (!data?.allAchievements) return null;

  const all = data.allAchievements;
  const unlocked = all.filter(a => a.unlocked);
  const filtered = activeCategory === "all" ? all : all.filter(a => a.category === activeCategory);
  const categories = [...new Set(all.map(a => a.category))];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="badges-widget">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} />
            <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Badges</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-black" style={{ color: "var(--text-primary)" }}>{unlocked.length}</span>
            <span style={{ color: "var(--text-muted)" }}>/ {all.length}</span>
            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: "#F59E0B15", color: "#F59E0B" }}>
              Peak: {data.maxBadgesUnlocked || unlocked.length}
            </span>
          </div>
        </div>

        {/* Category filter - horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <button onClick={() => setActiveCategory("all")} className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0"
            style={{ backgroundColor: activeCategory === "all" ? "var(--brand-primary)" : "var(--bg-subtle)", color: activeCategory === "all" ? "#fff" : "var(--text-muted)" }} data-testid="badge-filter-all">All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setActiveCategory(c)} className="px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: activeCategory === c ? "var(--brand-primary)" : "var(--bg-subtle)", color: activeCategory === c ? "#fff" : "var(--text-muted)" }} data-testid={`badge-filter-${c}`}>{CAT_LABELS[c] || c}</button>
          ))}
        </div>

        {/* Tier legend */}
        <div className="flex gap-3 mb-1">
          {["bronze", "silver", "gold", "platinum"].map(t => (
            <div key={t} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[t] }} />
              <span className="text-[10px] font-medium capitalize" style={{ color: "var(--text-muted)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable badge grid - fixed height, 4 rows visible */}
      <div className="px-4 pb-3 overflow-y-auto" style={{ maxHeight: "300px", scrollbarWidth: "thin" }}>
        <div className="grid grid-cols-4 gap-2">
          {filtered.map((a) => {
            const Icon = ACH_ICONS[a.icon] || Star;
            const tierColor = a.unlocked ? (TIER_COLORS[a.tier] || "#6B7280") : "#9CA3AF";
            const tierBg = a.unlocked ? (TIER_BG[a.tier] || "#6B728010") : "var(--bg-subtle)";
            return (
              <div key={a.code} className="flex flex-col items-center p-2 rounded-xl text-center transition-all"
                style={{
                  backgroundColor: tierBg,
                  border: a.unlocked ? `1.5px solid ${tierColor}40` : "1.5px solid transparent",
                  opacity: a.unlocked ? 1 : 0.35,
                  filter: a.unlocked ? "none" : "grayscale(1)",
                }} data-testid={`badge-${a.code}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-1" style={{
                  backgroundColor: a.unlocked ? `${tierColor}20` : "transparent",
                }}>
                  <Icon className="h-4.5 w-4.5" style={{ color: tierColor }} />
                </div>
                <p className="text-[10px] font-bold leading-tight" style={{ color: a.unlocked ? tierColor : "var(--text-muted)" }}>{a.title}</p>
                {a.unlocked && (
                  <span className="text-[9px] font-bold mt-0.5 px-1.5 rounded uppercase" style={{ backgroundColor: `${tierColor}15`, color: tierColor }}>{a.tier}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── CHALLENGES ───
const ChallengesWidget = ({ challenges, onJoin, onLeave }) => {
  if (!challenges) return null;
  const active = challenges.active || [];
  const available = challenges.available || [];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
          <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Challenges</h3>
          <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#8B5CF615", color: "#8B5CF6" }}>
            {active.length} active
          </span>
        </div>
      </div>

      {active.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>Active</p>
          {active.map((c) => (
            <div key={c.id} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <button onClick={() => onLeave(c.id)} className="text-xs font-bold px-2.5 py-1 rounded" style={{ color: "#EF4444", backgroundColor: "#EF444410" }} data-testid={`leave-challenge-${c.id}`}>Abandon</button>
              </div>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full" style={{ width: `${(c.progress / c.target) * 100}%`, backgroundColor: "#10B981" }} />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{c.progress}/{c.target} · {c.daysLeft}d left</p>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 pb-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Available ({available.length})</p>
        {available.slice(0, 6).map((c) => (
          <div key={c.code} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty]}15`, color: DIFF_COLORS[c.difficulty] }}>{c.difficulty}</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.description}</p>
              </div>
              <button onClick={() => onJoin(c.code)} className="ml-2 text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: "var(--brand-primary)" }} data-testid={`join-challenge-${c.code}`}>Join</button>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{c.duration_days}d</span><span>+{c.xp_reward} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── FINANCIAL SHOCK TEST ───
const ShockTestWidget = ({ clockData }) => {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const scenarios = [
    { id: "job_loss", title: "Job Loss", icon: AlertTriangle, color: "#EF4444", desc: "No income for 3 months" },
    { id: "medical", title: "Medical", icon: HeartPulse, color: "#F97316", desc: "₹5L expense" },
    { id: "car_repair", title: "Repair", icon: AlertCircle, color: "#EAB308", desc: "₹2L cost" },
    { id: "emi_hike", title: "EMI Hike", icon: TrendingUp, color: "#8B5CF6", desc: "All EMIs +20%" },
  ];

  const runTest = async (id, custom = null) => {
    setTesting(true); setActiveId(id); setResult(null);
    try {
      const body = custom ? { customAmount: custom } : { scenarioId: id };
      const res = await fetch(`${backendUrl}/api/intelligence/shock-test`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) setResult(await res.json());
    } catch (e) { console.error(e); }
    setTesting(false);
  };

  const sevColor = { critical: "#EF4444", warning: "#F59E0B", safe: "#10B981" };

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="shock-test">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-5 w-5" style={{ color: "#EF4444" }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Shock Test</h3>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>Can your finances handle an emergency?</p>

      <div className="grid grid-cols-2 gap-2">
        {scenarios.map((s) => {
          const Icon = s.icon;
          const isActive = activeId === s.id;
          return (
            <button key={s.id} onClick={() => runTest(s.id)} disabled={testing}
              className="p-3 rounded-xl text-left transition-all active:scale-[0.97]"
              style={{ backgroundColor: isActive ? `${s.color}10` : "var(--bg-subtle)", border: `1px solid ${isActive ? s.color + '40' : 'var(--border-light)'}` }}
              data-testid={`shock-${s.id}`}>
              <Icon className="h-4 w-4 mb-1.5" style={{ color: s.color }} />
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.title}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
            </button>
          );
        })}
      </div>

      {testing && <div className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>Simulating...</div>}

      {/* Custom amount input */}
      <div className="mt-2 flex gap-2">
        <input type="number" placeholder="Custom ₹ amount" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
          data-testid="custom-shock-input" />
        <button onClick={() => { if (customAmount > 0) runTest("custom", Number(customAmount)); }} disabled={testing || !customAmount}
          className="px-3 py-2 rounded-lg text-xs font-bold" style={{ backgroundColor: customAmount ? "#8B5CF620" : "var(--bg-subtle)", color: customAmount ? "#8B5CF6" : "var(--text-muted)" }}
          data-testid="custom-shock-btn">Test</button>
      </div>

      {result && !testing && (
        <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: `${sevColor[result.impact.severity]}08`, border: `1px solid ${sevColor[result.impact.severity]}30` }} data-testid="shock-result">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{result.scenario.title}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ backgroundColor: `${sevColor[result.impact.severity]}20`, color: sevColor[result.impact.severity] }}>
              {result.impact.severity}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-center flex-1 p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{result.current.survivalDays}</p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>Before</p>
            </div>
            <ChevronRight className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
            <div className="text-center flex-1 p-2 rounded-lg" style={{ backgroundColor: "var(--bg-subtle)" }}>
              <p className="text-lg font-black" style={{ color: sevColor[result.impact.severity] }}>{result.postShock.survivalDays}</p>
              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>After</p>
            </div>
          </div>
          <p className="text-[10px] font-bold" style={{ color: sevColor[result.impact.severity] }}>
            -{result.impact.daysLost} days · {result.impact.label}
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{result.tip}</p>
        </div>
      )}
    </div>
  );
};


// ─── MAIN INSIGHTS PAGE ───
const Insights = () => {
  const navigate = useNavigate();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const { survivalClock, controlScore, behaviorAlerts, gamification, challenges, moneyPattern, futureYou, personalityHistory, loading, refresh, processWeekly, joinChallenge, leaveChallenge } = useIntelligenceData();
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => { setProcessing(true); await processWeekly(); setProcessing(false); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="animate-spin h-8 w-8 border-3 border-t-transparent rounded-full" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
    </div>
  );

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
        <LevelAndStagesWidget gamData={gamification} clockData={survivalClock} onShare={() => setShowShareCard(true)} />
        <FinancialScoreWidget data={controlScore} />
        <EmergencyRunwayWidget data={survivalClock} />
        <ShockTestWidget clockData={survivalClock} />
        <RunwaySimulator currentData={survivalClock} />
        <MoneyPatternWidget data={moneyPattern} />
        <BadgesWidget data={gamification} />
        <ChallengesWidget challenges={challenges} onJoin={joinChallenge} onLeave={leaveChallenge} />

        {/* Future You Widget */}
        <FutureYouWidget data={futureYou} />

        {/* Personality Evolution */}
        <PersonalityEvolutionWidget data={personalityHistory} currentPersonality={moneyPattern?.personality} />

        {/* Quick Links */}
        <div className="space-y-2.5 pt-2">
          <p className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>Explore</p>
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
      <ShareScoreCard isOpen={showShareCard} onClose={() => setShowShareCard(false)} />
      <BottomNav onAddClick={() => setShowAddSheet(true)} />
    </div>
  );
};

export default Insights;

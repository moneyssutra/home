import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import AddActionSheet from "@/components/AddActionSheet";
import ShareScoreCard from "@/components/ShareScoreCard";
import RunwaySimulator from "@/components/RunwaySimulator";
import MoneyPatternWidget from "@/components/MoneyPatternWidget";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import FinancialHealthWizard from "@/components/FinancialHealthWizard";
import { useFamilyContext } from "@/context/FamilyContext";
import { useState, useEffect } from "react";
import { useIntelligenceData } from "@/hooks/useIntelligenceData";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  ArrowLeft, BarChart3, FileText, ChevronRight, RefreshCw,
  Shield, Target, AlertTriangle, Flame, Trophy, Star,
  TrendingUp, TrendingDown, Clock, Zap, Award, ChevronDown, ChevronUp,
  AlertCircle, Info, Share2,
  HeartPulse, LifeBuoy, PieChart, ListChecks, Flag,
  Lock, XCircle, PiggyBank, CheckCircle, Rocket, Medal, Crown,
  Gauge, Swords, ShieldCheck, Castle, ClipboardEdit
} from "lucide-react";
import axios from "axios";

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

// ─── Helper: detect if user has real financial data ───
const hasRealData = (clockData, scoreData) => {
  const hasExpenses = clockData?.monthlyMandatoryExpense > 0;
  const hasFunds = clockData?.effectiveFunds > 0;
  const hasIncome = scoreData?.metrics?.monthlyIncome > 0;
  return hasExpenses || hasFunds || hasIncome;
};

// ─── SURVIVAL WARNING ───
const SurvivalWarning = ({ data, isEmpty }) => {
  if (!data || isEmpty || data.survivalDays > 90) return null;
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
  if (!gamData) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="stage-journey">
      <div className="flex items-center gap-2 mb-2"><Rocket className="h-4 w-4" style={{ color: "#8B5CF6" }} /><h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Financial Journey</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add income or expenses to start your financial journey.</p>
    </div>
  );

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
  if (!data) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="emergency-runway">
      <div className="flex items-center gap-2 mb-2"><Shield className="h-5 w-5" style={{ color: "#94A3B8" }} /><h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Emergency Runway</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add your savings and expenses to calculate your emergency runway.</p>
    </div>
  );
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
  const [showInfo, setShowInfo] = useState(false);
  if (!data) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="financial-score">
      <div className="flex items-center gap-2 mb-2"><Target className="h-5 w-5" style={{ color: "#94A3B8" }} /><h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Financial Score</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add income and expenses to calculate your financial score.</p>
    </div>
  );
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
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5" style={{ color: gc }} />
          <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Financial Score</h3>
        </div>
        <button 
          onClick={() => setShowInfo(!showInfo)} 
          className="p-1.5 rounded-full transition-colors"
          style={{ backgroundColor: showInfo ? `${gc}20` : 'var(--bg-subtle)' }}
          data-testid="financial-score-info-btn"
        >
          <Info className="h-4 w-4" style={{ color: showInfo ? gc : 'var(--text-muted)' }} />
        </button>
      </div>

      {/* Info tooltip */}
      {showInfo && (
        <div className="mb-3 p-3 rounded-xl text-xs leading-relaxed" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
          <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>How is your score calculated?</p>
          <div className="space-y-1.5">
            <p><span className="font-semibold" style={{color: "#10B981"}}>Savings Rate (25pts)</span> — Net Savings / Income. 35%+ = 25pts, 30% = 22, 25% = 20, 20% = 17, 15% = 14, 10% = 10, 5% = 6, &lt;1% = 0.</p>
            <p><span className="font-semibold" style={{color: "#3B82F6"}}>EMI Load (25pts)</span> — Total EMI / Income. ≤20% = 25pts, 25% = 22, 30% = 20, 40% = 15, 50% = 10, 60% = 5, &gt;60% = 0.</p>
            <p><span className="font-semibold" style={{color: "#8B5CF6"}}>Safety Buffer (25pts)</span> — (Liquid + 60% Semi-liquid) / Monthly Expenses. 8+ months = 25pts, 6 = 22, 4 = 18, 3 = 14, 2 = 10, 1 = 5, &lt;1 = 0.</p>
            <p><span className="font-semibold" style={{color: "#F59E0B"}}>Income Consistency (25pts)</span> — Std Dev / Avg Income over 3 months. ≤5% = 25pts, 10% = 22, 20% = 18, 30% = 14, 40% = 8, 50% = 4, &gt;50% = 0.</p>
          </div>
          <p className="mt-2 italic" style={{ color: 'var(--text-muted)' }}>Score is based on a rolling 3-month window. Every small improvement moves your score up.</p>
        </div>
      )}

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
            <div key={i} title={b.help}>
              <div className="flex justify-between text-[10px] mb-0.5">
                <span style={{ color: "var(--text-secondary)" }}>{b.label}</span>
                <span className="font-bold" style={{ color: b.color }}>{b.score}/{b.max}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(b.score / b.max) * 100}%`, backgroundColor: b.color }} />
              </div>
              {showInfo && (
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{b.help}</p>
              )}
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
  if (!data?.allAchievements) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="badges-widget">
      <div className="flex items-center gap-2 mb-2"><Trophy className="h-5 w-5" style={{ color: "#F59E0B" }} /><h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Badges</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Start tracking your finances to unlock badges.</p>
    </div>
  );

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
  if (!challenges) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="flex items-center gap-2 mb-2"><Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} /><h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Challenges</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Challenges will appear here once your data loads.</p>
    </div>
  );
  const active = challenges.active || [];
  const available = challenges.available || [];
  const completed = challenges.completed || [];
  const totalChallenges = active.length + available.length + completed.length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="challenges-widget">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5" style={{ color: "#8B5CF6" }} />
            <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Challenges</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-black" style={{ color: "var(--text-primary)" }}>{completed.length}</span>
            <span style={{ color: "var(--text-muted)" }}>/ {totalChallenges}</span>
            <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: "#8B5CF615", color: "#8B5CF6" }}>
              {active.length} active
            </span>
          </div>
        </div>
      </div>

      {active.length > 0 && (
        <div className="px-5 pb-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#10B981" }}>Active</p>
          {active.map((c) => (
            <div key={c.id} className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                  {c.difficulty && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${DIFF_COLORS[c.difficulty] || "#8B5CF6"}15`, color: DIFF_COLORS[c.difficulty] || "#8B5CF6" }}>{c.difficulty}</span>}
                </div>
                <button onClick={() => onLeave(c.id)} className="text-xs font-bold px-2.5 py-1 rounded" style={{ color: "#EF4444", backgroundColor: "#EF444410" }} data-testid={`leave-challenge-${c.id}`}>Abandon</button>
              </div>
              {c.description && <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>{c.description}</p>}
              {c.explainer && (
                <div className="mt-2 p-2.5 rounded-lg" style={{ backgroundColor: "var(--bg-app)", border: "1px solid var(--border-light)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#8B5CF6" }}>How to complete</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{c.explainer}</p>
                </div>
              )}
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-app)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min((c.progress / (c.target_pct || c.target || 1)) * 100, 100)}%`, backgroundColor: "#10B981", transition: "width 0.5s ease" }} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{c.progress || 0}% progress</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{c.daysLeft || c.duration_days}d left</span>
                  <span className="font-bold" style={{ color: "#8B5CF6" }}>+{c.xp_reward} XP</span>
                </div>
              </div>
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

  const isFamilyData = clockData?.fundBreakdown?.extendedBuffer !== undefined;

  const scenarios = [
    { id: "job_loss", title: "Job Loss", icon: AlertTriangle, color: "#EF4444", desc: "No income for 3 months" },
    { id: "medical", title: "Medical", icon: HeartPulse, color: "#F97316", desc: "₹5L expense" },
    { id: "car_repair", title: "Repair", icon: AlertCircle, color: "#EAB308", desc: "₹2L cost" },
    { id: "emi_hike", title: "EMI Hike", icon: TrendingUp, color: "#8B5CF6", desc: "All EMIs +20%" },
  ];

  const runLocalShock = (id, custom = null) => {
    const funds = clockData?.effectiveFunds || 0;
    const monthlyExp = clockData?.monthlyMandatoryExpense || clockData?.monthlyExpenses || 0;
    const monthlyInc = clockData?.monthlyIncome || 0;
    const curDays = clockData?.survivalDays || 0;
    const daily = monthlyExp / 30;

    let shockAmount = 0, title = "", desc = "";
    if (custom) { shockAmount = custom; title = "Custom Shock"; desc = `₹${fmt(custom)} expense`; }
    else if (id === "job_loss") { shockAmount = monthlyInc * 3; title = "Job Loss"; desc = "No income for 3 months"; }
    else if (id === "medical") { shockAmount = 500000; title = "Medical Emergency"; desc = "₹5L medical expense"; }
    else if (id === "car_repair") { shockAmount = 200000; title = "Major Repair"; desc = "₹2L repair cost"; }
    else if (id === "emi_hike") { shockAmount = monthlyExp * 0.2 * 12; title = "EMI Hike"; desc = "All EMIs +20% for 12 months"; }

    const postFunds = Math.max(0, funds - shockAmount);
    const postDays = daily > 0 ? Math.round(postFunds / daily) : 0;
    const daysLost = curDays - postDays;
    const severity = postDays < 30 ? "critical" : postDays < 90 ? "warning" : "safe";
    const label = severity === "critical" ? "Severe impact" : severity === "warning" ? "Moderate impact" : "Manageable";

    setResult({
      scenario: { id, title, description: desc },
      current: { survivalDays: curDays, effectiveFunds: funds, monthlyExpenses: monthlyExp },
      postShock: { survivalDays: postDays, effectiveFunds: postFunds, monthlyExpenses: monthlyExp },
      impact: { daysLost, severity, label, amountImpact: shockAmount },
    });
  };

  const runTest = async (id, custom = null) => {
    setTesting(true); setActiveId(id); setResult(null);
    if (isFamilyData) {
      runLocalShock(id, custom);
      setTesting(false);
      return;
    }
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

  const fmt = (n) => { if (!n && n !== 0) return "0"; const a = Math.abs(n); if (a >= 10000000) return `${(n/10000000).toFixed(1)}Cr`; if (a >= 100000) return `${(n/100000).toFixed(1)}L`; if (a >= 1000) return `${(n/1000).toFixed(1)}K`; return n.toFixed(0); };

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

// ─── FUTURE YOU (12-month projection) ───
const FutureYouWidget = ({ data }) => {
  if (!data) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="future-you">
      <div className="flex items-center gap-2 mb-2"><Rocket className="h-5 w-5" style={{ color: "#8B5CF6" }} /><h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Future You</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Add financial data to see your 12-month projection.</p>
    </div>
  );
  const cur = data.current || {};
  const proj = data.projected || {};
  const imp = data.improvement || {};
  const projections = data.projections || [];

  const maxDays = Math.max(...projections.map(p => p.survivalDays), cur.survivalDays, 1);

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="future-you">
      <div className="flex items-center gap-2 mb-1">
        <Rocket className="h-5 w-5" style={{ color: "#8B5CF6" }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Future You</h3>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>12-month projection at current pace</p>

      {/* Now vs Future comparison */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: "var(--bg-subtle)" }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Today</p>
          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{cur.survivalDays}d</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{cur.stage}</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: "#8B5CF608", border: "1px solid #8B5CF620" }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: "#8B5CF6" }}>12 Months</p>
          <p className="text-xl font-black" style={{ color: "#8B5CF6" }}>{proj.survivalDays}d</p>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{proj.stage}</p>
        </div>
      </div>

      {/* Gains */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Runway", val: `+${imp.survivalDaysGain}d`, color: imp.survivalDaysGain > 0 ? "#10B981" : "#EF4444" },
          { label: "Score", val: `+${imp.scoreGain}`, color: imp.scoreGain > 0 ? "#10B981" : "#EF4444" },
          { label: "Net Worth", val: `+₹${fmt(imp.netWorthGain)}`, color: imp.netWorthGain > 0 ? "#10B981" : "#EF4444" },
        ].map((g, i) => (
          <div key={i} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${g.color}08` }}>
            <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{g.label}</p>
            <p className="text-xs font-bold" style={{ color: g.color }}>{g.val}</p>
          </div>
        ))}
      </div>

      {/* Mini chart */}
      <div className="flex items-end gap-[2px] h-12">
        {projections.map((p, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div className="w-full rounded-t-sm" style={{
              height: `${Math.max((p.survivalDays / maxDays) * 100, 5)}%`,
              backgroundColor: i === projections.length - 1 ? "#8B5CF6" : "#8B5CF640",
            }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{projections[0]?.label}</span>
        <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>{projections[projections.length - 1]?.label}</span>
      </div>

      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{data.tip}</p>
    </div>
  );
};

// ─── PERSONALITY EVOLUTION TRACKER (Line Chart) ───
const PersonalityEvolutionWidget = ({ data, currentPersonality }) => {
  const history = data?.history || [];
  if (!currentPersonality) return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="personality-evolution">
      <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-5 w-5" style={{ color: "#F59E0B" }} /><h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Personality Evolution</h3></div>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your financial personality will evolve as you track your money.</p>
    </div>
  );

  const ZONE_COLORS = { Survival: "#EF4444", Stabilizing: "#F97316", Control: "#EAB308", Growth: "#22C55E", Advanced: "#3B82F6" };

  // Prepare chart data (reversed so oldest first for left-to-right timeline)
  const chartData = [...history].reverse().map(h => ({
    month: h.month,
    personality: h.personality,
    personalityId: h.personalityId || 0,
    confidence: h.confidence || 0,
    survivalDays: h.survivalDays || 0,
    controlScore: h.controlScore || 0,
    zone: h.zone,
    zoneColor: ZONE_COLORS[h.zone] || "#94A3B8",
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg px-3 py-2 text-xs shadow-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }}>
        <p className="font-bold" style={{ color: d.zoneColor }}>{d.personality}</p>
        <p style={{ color: "var(--text-muted)" }}>{d.month} · {d.zone}</p>
        <p style={{ color: "var(--text-secondary)" }}>Level {d.personalityId} · {d.confidence}% match</p>
        {d.survivalDays > 0 && <p style={{ color: "var(--text-muted)" }}>{d.survivalDays}d runway · Score {d.controlScore}</p>}
      </div>
    );
  };

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid="personality-evolution">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-5 w-5" style={{ color: "#F59E0B" }} />
        <h3 className="text-base font-black uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Personality Evolution</h3>
      </div>
      <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>How your financial identity has evolved</p>

      {chartData.length >= 2 ? (
        <>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="personalityId" stroke="#F59E0B" strokeWidth={2.5} dot={(props) => {
                  const { cx, cy, payload } = props;
                  const isLast = payload === chartData[chartData.length - 1];
                  return (
                    <circle cx={cx} cy={cy} r={isLast ? 5 : 3} fill={payload.zoneColor} stroke={isLast ? "#fff" : "none"} strokeWidth={isLast ? 2 : 0} />
                  );
                }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Zone legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {Object.entries(ZONE_COLORS).map(([zone, color]) => (
              <div key={zone} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{zone}</span>
              </div>
            ))}
          </div>
          {/* Current + history list (compact) */}
          <div className="mt-3 space-y-1.5">
            {history.slice(0, 4).map((h, i) => {
              const zc = ZONE_COLORS[h.zone] || "#94A3B8";
              const isCurrent = i === 0;
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: isCurrent ? `${zc}08` : "transparent" }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: zc }}>
                    <span className="text-[7px] font-black text-white">{h.personalityId}</span>
                  </div>
                  <span className="text-xs font-bold flex-1" style={{ color: isCurrent ? zc : "var(--text-primary)" }}>{h.personality}</span>
                  {isCurrent && <span className="text-[8px] font-bold px-1 py-0.5 rounded-full" style={{ backgroundColor: `${zc}20`, color: zc }}>NOW</span>}
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{h.month}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : history.length === 1 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: `${ZONE_COLORS[history[0].zone] || "#94A3B8"}08` }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: ZONE_COLORS[history[0].zone] || "#94A3B8" }}>
              <span className="text-xs font-black text-white">{history[0].personalityId}</span>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: ZONE_COLORS[history[0].zone] || "var(--text-primary)" }}>{history[0].personality}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{history[0].month} · {history[0].zone} · {history[0].confidence}% match</p>
            </div>
          </div>
          <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>Chart will appear after your 2nd monthly evaluation.</p>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Your personality evolution will show here next month.</p>
          <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>Current: <span className="font-bold">{currentPersonality}</span></p>
        </div>
      )}
    </div>
  );
};



// ─── RED ZONE THEME STYLES ───
const RED_ZONE_STYLES = {
  "--bg-app": "#0D0A0A",
  "--bg-card": "#1A1111",
  "--bg-subtle": "#231515",
  "--text-primary": "#F5E6E6",
  "--text-secondary": "#C9A3A3",
  "--text-muted": "#8B5555",
  "--border-light": "#3D1F1F",
  "--brand-primary": "#EF4444",
};

// ─── ACCORDION MODULE WRAPPER ───
const AccordionModule = ({ title, icon: Icon, iconColor, children, isOpen, onToggle, locked, unlockStage, stageNum, testId, meta }) => {
  const [showLockedMsg, setShowLockedMsg] = useState(false);

  const LOCK_MESSAGES = [
    "Keep building your financial runway to unlock this.",
    "You're getting closer! Level up to access deeper insights.",
    "Your financial journey is just beginning — keep going!",
    "Reach the next stage to reveal this module.",
    "Unlock more power as your financial strength grows.",
  ];

  if (locked) {
    return (
      <div className="rounded-2xl overflow-hidden relative" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={testId}>
        <button
          className="w-full p-4 flex items-center gap-3 text-left"
          onClick={() => setShowLockedMsg(prev => !prev)}
          data-testid={`${testId}-locked-btn`}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}15` }}>
            <Icon className="h-4 w-4" style={{ color: iconColor, opacity: 0.5 }} />
          </div>
          <span className="text-sm font-bold flex-1" style={{ color: "var(--text-muted)" }}>{title}</span>
          <Lock className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
        </button>
        {showLockedMsg && (
          <div className="px-4 pb-4 pt-0">
            <div className="rounded-xl p-3" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4" style={{ color: iconColor }} />
                <span className="text-xs font-bold" style={{ color: iconColor }}>Stage {unlockStage} Required</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {LOCK_MESSAGES[(unlockStage || 0) % LOCK_MESSAGES.length]} You're at Stage {stageNum || 0}.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-light)" }} data-testid={testId}>
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left" data-testid={`${testId}-toggle`}>
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
        <span className="text-sm font-bold flex-1" style={{ color: "var(--text-primary)" }}>{title}</span>
        {meta && <span className="text-xs font-bold mr-1" style={{ color: "var(--text-muted)" }}>{meta}</span>}
        <ChevronDown className="h-4 w-4 transition-transform" style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      <div style={{ maxHeight: isOpen ? "2000px" : "0", overflow: "hidden", transition: "max-height 300ms ease-in-out" }}>
        {isOpen && <div className="px-0 pb-0">{children}</div>}
      </div>
    </div>
  );
};

// ─── ZONE GRADIENT CONFIG ───
const ZONE_GRADIENTS = {
  1: { bg: "linear-gradient(135deg, #1A0A0A, #7F1D1D)", glow: "rgba(239,68,68,0.3)", accent: "#EF4444", stroke1: "#FCA5A5", stroke2: "#DC2626", btn: "linear-gradient(135deg, #DC2626, #EF4444)", secondary: "#FCA5A5" },
  2: { bg: "linear-gradient(135deg, #1A0F0A, #9A3412)", glow: "rgba(249,115,22,0.3)", accent: "#F97316", stroke1: "#FDBA74", stroke2: "#EA580C", btn: "linear-gradient(135deg, #EA580C, #F97316)", secondary: "#FDBA74" },
  3: { bg: "linear-gradient(135deg, #1A170A, #854D0E)", glow: "rgba(234,179,8,0.3)", accent: "#EAB308", stroke1: "#FDE68A", stroke2: "#CA8A04", btn: "linear-gradient(135deg, #CA8A04, #EAB308)", secondary: "#FDE68A" },
  4: { bg: "linear-gradient(135deg, #0A1A0F, #166534)", glow: "rgba(34,197,94,0.3)", accent: "#22C55E", stroke1: "#86EFAC", stroke2: "#16A34A", btn: "linear-gradient(135deg, #16A34A, #22C55E)", secondary: "#BBF7D0" },
  5: { bg: "linear-gradient(135deg, #1E1B4B, #312E81)", glow: "rgba(139,92,246,0.3)", accent: "#8B5CF6", stroke1: "#A78BFA", stroke2: "#7C3AED", btn: "linear-gradient(135deg, #6366F1, #8B5CF6)", secondary: "#C7D2FE" },
};

// ─── HERO SECTION ───
const HeroSection = ({ clockData, gamData, onImprove, onShare }) => {
  const survDays = clockData?.survivalDays || 0;
  const stageName = clockData?.level || "Getting Started";
  const stageNum = clockData?.stage || 0;
  const phaseNum = clockData?.phaseNum || 1;
  const levelsToSovereign = Math.max(0, 20 - stageNum);
  const progressPct = (stageNum / 20) * 100;
  const zone = ZONE_GRADIENTS[phaseNum] || ZONE_GRADIENTS[5];
  const [showTooltip, setShowTooltip] = useState(false);
  const [ringAnimated, setRingAnimated] = useState(false);

  // SVG ring — larger to fit text inside
  const r = 88, circ = 2 * Math.PI * r;
  const targetOffset = circ - (progressPct / 100) * circ;
  const gradId = "ring-grad";

  useEffect(() => {
    const t = setTimeout(() => setRingAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ background: zone.bg }} data-testid="hero-section" onClick={() => showTooltip && setShowTooltip(false)}>
      {/* Radial glow behind circle */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full" style={{ background: `radial-gradient(circle, ${zone.glow}, transparent 70%)` }} />

      <div className="relative p-6 pb-3 text-center">
        {/* Top label */}
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: zone.secondary }}>Your Financial Safety</p>

        {/* Circular progress ring */}
        <div className="relative inline-block mb-4">
          <svg width="200" height="200" viewBox="0 0 200 200" className="block">
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={zone.stroke1} />
                <stop offset="100%" stopColor={zone.stroke2} />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="100" cy="100" r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth="3"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={ringAnimated ? targetOffset : circ}
              transform="rotate(-90 100 100)" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${zone.accent}40)` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ animation: "fadeIn 0.8s ease" }}>
            <span className="text-6xl font-black text-white leading-none tracking-tight" style={{
              textShadow: `0 0 40px ${zone.accent}30, 0 2px 4px rgba(0,0,0,0.4)`,
              animation: "subtlePulse 3s ease-in-out infinite"
            }} data-testid="hero-days">{survDays}</span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold tracking-[0.12em] text-white/50">DAYS OF SAFETY</span>
              <button onClick={(e) => { e.stopPropagation(); setShowTooltip(prev => !prev); }} className="relative" data-testid="tooltip-trigger">
                <Info className="h-3 w-3 text-white/25 hover:text-white/50 transition-colors" />
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-xl text-left z-10" style={{ backgroundColor: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }} data-testid="tooltip-content">
                    <p className="text-[11px] text-white/80 leading-relaxed">This shows how many days your current liquid savings can cover your essential monthly expenses.</p>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: "rgba(0,0,0,0.9)", borderRight: "1px solid rgba(255,255,255,0.15)", borderBottom: "1px solid rgba(255,255,255,0.15)" }} />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <p className="text-xs text-white/40 mb-3">If your income stops today</p>

        {/* Stage */}
        <p className="text-lg font-black tracking-wide text-white">{stageName}</p>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: zone.secondary }}>{levelsToSovereign} level{levelsToSovereign !== 1 ? "s" : ""} away from Sovereign</p>

        {/* Dopamine line */}
        <p className="text-sm font-bold mt-3" style={{ color: zone.accent }}>
          +{Math.max(1, Math.round(survDays * 0.028))} days added this month
        </p>
      </div>

      {/* CTAs */}
      <div className="relative px-6 pb-5 pt-1 space-y-2.5">
        <button onClick={onImprove} className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97]" style={{
          background: zone.btn, boxShadow: `0 4px 20px ${zone.accent}30`,
        }} data-testid="improve-position-btn">
          Increase My Safety
        </button>
        <button onClick={onShare} className="w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-2" style={{
          backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)"
        }} data-testid="hero-share-btn">
          <Share2 className="h-3.5 w-3.5" /> Share My Progress
        </button>
      </div>

      <style>{`
        @keyframes subtlePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.92; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// ─── ACTION SECTION ───
const ActionSection = ({ clockData, scoreData, challenges }) => {
  const suggestions = [];
  const m = scoreData?.metrics || {};
  const bd = scoreData?.breakdown || {};
  const survDays = clockData?.survivalDays || 0;

  // Savings rate suggestion
  if (bd.savingsRate && bd.savingsRate.score < bd.savingsRate.max * 0.8) {
    const gap = Math.round((m.monthlyIncome || 0) * 0.1);
    const boost = Math.round(gap / ((clockData?.dailyBurnRate || 1) || 1));
    if (gap > 0) suggestions.push({ text: `Increase savings by ₹${fmt(gap)}`, impact: `+${boost} days`, color: "#10B981" });
  }
  // EMI load suggestion
  if (bd.emiLoad && bd.emiLoad.score < bd.emiLoad.max * 0.7) {
    const emiReduction = Math.round((m.totalEMI || 0) * 0.1);
    const boost = Math.round(emiReduction * 30 / ((clockData?.dailyBurnRate || 1) * 30 || 1));
    if (emiReduction > 0) suggestions.push({ text: `Reduce EMI by 10%`, impact: `+${boost} days`, color: "#3B82F6" });
  }
  // Safety buffer suggestion
  if (bd.safetyBuffer && bd.safetyBuffer.score < bd.safetyBuffer.max * 0.6) {
    suggestions.push({ text: `Build emergency fund to 6 months`, impact: "Unlock Stability Bonus", color: "#8B5CF6" });
  }
  // Challenge suggestion
  const pending = challenges?.available?.length || 0;
  if (pending > 0 && suggestions.length < 3) {
    suggestions.push({ text: `Complete a Shock Test`, impact: "Unlock new badge", color: "#F59E0B" });
  }

  const isStrong = suggestions.length === 0;

  return (
    <div className="space-y-3" data-testid="action-section" id="action-section">
      <h2 className="text-base font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>How To Improve</h2>
      {isStrong ? (
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "#10B98108", border: "1px solid #10B98120" }}>
          <p className="text-sm font-bold" style={{ color: "#10B981" }}>You're operating at strong stability. Maintain discipline.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3.5 rounded-xl" style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}18` }} data-testid={`suggestion-${i}`}>
              <p className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>{s.text}</p>
              <span className="text-xs font-bold ml-3 px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: `${s.color}15`, color: s.color }}>{s.impact}</span>
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
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [openModule, setOpenModule] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState(null);
  const { survivalClock, controlScore, behaviorAlerts, gamification, challenges, moneyPattern, futureYou, personalityHistory, loading, refresh, joinChallenge, leaveChallenge } = useIntelligenceData();
  const { activeViewLabel, isPersonalView, isFamilyView } = useFamilyContext();

  useEffect(() => {
    if (isPersonalView) {
      axios.get(`${backendUrl}/api/financial-health/wizard`, { withCredentials: true })
        .then(res => { if (res.data && Object.keys(res.data).length > 1) setWizardData(res.data); })
        .catch(() => {});
    }
  }, [backendUrl, isPersonalView]);

  const isEmpty = !hasRealData(survivalClock, controlScore);
  const isRedZone = !isEmpty && survivalClock && survivalClock.survivalDays < 30;
  const stageNum = survivalClock?.stage || 0;

  const handleToggle = (key) => setOpenModule(prev => prev === key ? null : key);
  const scrollToActions = () => document.getElementById("action-section")?.scrollIntoView({ behavior: "smooth" });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg-app)" }}>
      <div className="animate-spin h-8 w-8 border-3 border-t-transparent rounded-full" style={{ borderColor: "var(--brand-primary)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-32" style={isRedZone ? { ...RED_ZONE_STYLES, backgroundColor: RED_ZONE_STYLES["--bg-app"] } : { backgroundColor: "var(--bg-app)" }} data-testid={isRedZone ? "insights-red-zone" : "insights-page"}>
      <header className="relative" style={isRedZone ? { backgroundColor: RED_ZONE_STYLES["--bg-app"], borderBottom: `1px solid ${RED_ZONE_STYLES["--border-light"]}` } : { background: "linear-gradient(135deg, var(--brand-primary) 0%, var(--btn-primary-hover) 100%)" }}>
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ProfileMenu userName={null} userPicture={null} />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowShareCard(true)} className="p-2 rounded-xl bg-white/10" data-testid="share-btn"><Share2 className="h-4 w-4 text-white" /></button>
              <button onClick={refresh} className="p-2 rounded-xl bg-white/10" data-testid="refresh-btn"><RefreshCw className="h-4 w-4 text-white" /></button>
              <NotificationBell />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: isRedZone ? "#EF4444" : "#fff", fontFamily: "'Manrope', sans-serif" }}>
            {isRedZone ? "RED ZONE" : isFamilyView ? `${activeViewLabel} Health` : !isPersonalView ? `${activeViewLabel}'s Health` : "Health"}
          </h1>
          {isRedZone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse mt-1 inline-block" style={{ backgroundColor: "#EF444420", color: "#EF4444", border: "1px solid #EF444440" }}>CRITICAL</span>}
          {!isRedZone && <p className="text-white/70 text-sm">{isFamilyView ? `${activeViewLabel} intelligence lab` : !isPersonalView ? `${activeViewLabel}'s intelligence lab` : "Your financial intelligence lab"}</p>}
        </div>
      </header>

      <div className="px-4 py-5 space-y-5 max-w-3xl mx-auto">
        {/* Welcome banner for new users */}
        {isEmpty && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--brand-primary)", background: "linear-gradient(135deg, #059669, #10B981)" }} data-testid="welcome-banner">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Welcome to Your Financial Journey!</p>
              <p className="text-xs text-white/80">Start by adding your income, expenses, and savings to unlock all insights.</p>
            </div>
          </div>
        )}

        {/* Red Zone Warning */}
        {isRedZone && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: "#EF444418", border: "2px solid #EF4444", boxShadow: "0 0 30px #EF444420" }} data-testid="red-zone-alert">
            <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: "#EF444430" }}>
              <AlertTriangle className="h-6 w-6" style={{ color: "#EF4444" }} />
            </div>
            <div>
              <p className="text-sm font-black" style={{ color: "#EF4444" }}>RED ZONE ACTIVE</p>
              <p className="text-xs" style={{ color: "#C9A3A3" }}>Only {survivalClock.survivalDays} days of runway left. Take immediate action.</p>
            </div>
          </div>
        )}

        <SurvivalWarning data={survivalClock} isEmpty={isEmpty} />


        {/* LAYER 1: HERO */}
        <HeroSection clockData={survivalClock} gamData={gamification} onImprove={scrollToActions} onShare={() => setShowShareCard(true)} />

        {/* LAYER 2: ACTION SECTION */}
        <ActionSection clockData={survivalClock} scoreData={controlScore} challenges={challenges} />

        {/* LAYER 3: COLLAPSIBLE MODULES */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Detailed Modules</p>

          <AccordionModule title="Shock Test" icon={Zap} iconColor="#EF4444" isOpen={openModule === "shock"} onToggle={() => handleToggle("shock")} locked={stageNum < 1 && stageNum === 0} unlockStage={1} stageNum={stageNum} testId="accordion-shock">
            <ShockTestWidget clockData={survivalClock} />
          </AccordionModule>

          <AccordionModule title="Financial Score" icon={Target} iconColor="#10B981" isOpen={openModule === "score"} onToggle={() => handleToggle("score")} locked={stageNum < 2 && stageNum > 0} unlockStage={2} stageNum={stageNum} testId="accordion-score">
            <FinancialScoreWidget data={controlScore} />
          </AccordionModule>

          <AccordionModule title="Emergency Runway" icon={Shield} iconColor="#3B82F6" isOpen={openModule === "runway"} onToggle={() => handleToggle("runway")} locked={stageNum < 3 && stageNum > 0} unlockStage={3} stageNum={stageNum} testId="accordion-runway">
            <EmergencyRunwayWidget data={survivalClock} />
          </AccordionModule>

          <AccordionModule title="Money Personality" icon={TrendingUp} iconColor="#F59E0B" isOpen={openModule === "personality"} onToggle={() => handleToggle("personality")} locked={stageNum < 5 && stageNum > 0} unlockStage={5} stageNum={stageNum} testId="accordion-personality">
            <MoneyPatternWidget data={moneyPattern} />
          </AccordionModule>

          <AccordionModule title="Runway Simulator" icon={Rocket} iconColor="#8B5CF6" isOpen={openModule === "simulator"} onToggle={() => handleToggle("simulator")} locked={stageNum < 7 && stageNum > 0} unlockStage={7} stageNum={stageNum} testId="accordion-simulator">
            <RunwaySimulator currentData={survivalClock} />
          </AccordionModule>

          <AccordionModule title="Future You" icon={Rocket} iconColor="#8B5CF6" isOpen={openModule === "future"} onToggle={() => handleToggle("future")} locked={stageNum < 9 && stageNum > 0} unlockStage={9} stageNum={stageNum} testId="accordion-future">
            <FutureYouWidget data={futureYou} />
          </AccordionModule>

          <AccordionModule title="Personality Evolution" icon={TrendingUp} iconColor="#F59E0B" isOpen={openModule === "evolution"} onToggle={() => handleToggle("evolution")} locked={stageNum < 11 && stageNum > 0} unlockStage={11} stageNum={stageNum} testId="accordion-evolution">
            <PersonalityEvolutionWidget data={personalityHistory} currentPersonality={moneyPattern?.personality} />
          </AccordionModule>

          <AccordionModule title="Badges" icon={Trophy} iconColor="#F59E0B" isOpen={openModule === "badges"} onToggle={() => handleToggle("badges")} locked={false} unlockStage={0} stageNum={stageNum} testId="accordion-badges" meta={gamification?.allAchievements ? `${gamification.allAchievements.filter(a => a.unlocked).length}/${gamification.allAchievements.length}` : null}>
            <BadgesWidget data={gamification} />
          </AccordionModule>

          <AccordionModule title="Challenges" icon={Swords} iconColor="#8B5CF6" isOpen={openModule === "challenges"} onToggle={() => handleToggle("challenges")} locked={false} unlockStage={0} stageNum={stageNum} testId="accordion-challenges" meta={challenges ? `${(challenges.completed || []).length}/${(challenges.active || []).length + (challenges.available || []).length + (challenges.completed || []).length}` : null}>
            <ChallengesWidget challenges={challenges} onJoin={joinChallenge} onLeave={leaveChallenge} />
          </AccordionModule>
        </div>

        {/* Explore Links */}
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

import { useState, useEffect } from "react";
import axios from "axios";
import { useFamilyContext } from "@/context/FamilyContext";

const backendUrl = process.env.REACT_APP_BACKEND_URL;

export function useIntelligenceData() {
  const { isPersonalView, isFamilyView, activeViewId } = useFamilyContext();
  const [survivalClock, setSurvivalClock] = useState(null);
  const [controlScore, setControlScore] = useState(null);
  const [behaviorAlerts, setBehaviorAlerts] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [challenges, setChallenges] = useState(null);
  const [moneyPattern, setMoneyPattern] = useState(null);
  const [futureYou, setFutureYou] = useState(null);
  const [personalityHistory, setPersonalityHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Survival stage table matching backend logic
  const SURVIVAL_STAGES = [
    { stage: 1, name: "Exposed", min: 0, max: 7, phase: "Critical", phase_num: 1, color: "#DC2626" },
    { stage: 2, name: "Unstable", min: 8, max: 14, phase: "Critical", phase_num: 1, color: "#DC2626" },
    { stage: 3, name: "Vulnerable", min: 15, max: 21, phase: "Critical", phase_num: 1, color: "#EF4444" },
    { stage: 4, name: "Recovering", min: 22, max: 30, phase: "Critical", phase_num: 1, color: "#EF4444" },
    { stage: 5, name: "Balancing", min: 31, max: 45, phase: "Stabilizing", phase_num: 2, color: "#F97316" },
    { stage: 6, name: "Securing", min: 46, max: 60, phase: "Stabilizing", phase_num: 2, color: "#F97316" },
    { stage: 7, name: "Shielded", min: 61, max: 75, phase: "Stabilizing", phase_num: 2, color: "#FB923C" },
    { stage: 8, name: "Grounded", min: 76, max: 90, phase: "Stabilizing", phase_num: 2, color: "#FB923C" },
    { stage: 9, name: "Structured", min: 91, max: 110, phase: "Control", phase_num: 3, color: "#EAB308" },
    { stage: 10, name: "Disciplined", min: 111, max: 130, phase: "Control", phase_num: 3, color: "#EAB308" },
    { stage: 11, name: "In Control", min: 131, max: 150, phase: "Control", phase_num: 3, color: "#FACC15" },
    { stage: 12, name: "Stabilized", min: 151, max: 180, phase: "Control", phase_num: 3, color: "#FACC15" },
    { stage: 13, name: "Advancing", min: 181, max: 210, phase: "Growth", phase_num: 4, color: "#22C55E" },
    { stage: 14, name: "Strategic", min: 211, max: 240, phase: "Growth", phase_num: 4, color: "#22C55E" },
    { stage: 15, name: "Expanding", min: 241, max: 270, phase: "Growth", phase_num: 4, color: "#16A34A" },
    { stage: 16, name: "Wealth Builder", min: 271, max: 365, phase: "Growth", phase_num: 4, color: "#16A34A" },
    { stage: 17, name: "Fortified", min: 366, max: 540, phase: "Power", phase_num: 5, color: "#3B82F6" },
    { stage: 18, name: "Independent", min: 541, max: 720, phase: "Power", phase_num: 5, color: "#2563EB" },
    { stage: 19, name: "Financially Free", min: 721, max: 1000, phase: "Power", phase_num: 5, color: "#7C3AED" },
    { stage: 20, name: "Sovereign", min: 1001, max: 99999, phase: "Power", phase_num: 5, color: "#9333EA" },
  ];

  const buildSurvivalClock = (survivalDays, effectiveFunds, monthlyExpenses, liquidBalance, netWorth) => {
    const daily = monthlyExpenses / 30;
    const level = SURVIVAL_STAGES.find(s => survivalDays >= s.min && survivalDays <= s.max) || SURVIVAL_STAGES[0];
    const currentStage = level.stage;
    const start = Math.max(0, currentStage - 6);
    const end = Math.min(SURVIVAL_STAGES.length, currentStage + 4);
    const allStages = SURVIVAL_STAGES.map(s => ({ ...s, reached: survivalDays >= s.min, current: s.stage === currentStage }));
    const visibleStages = allStages.slice(start, end);

    return {
      survivalDays,
      survivalMonths: Math.round(survivalDays / 30 * 10) / 10,
      effectiveFunds: Math.round(effectiveFunds),
      monthlyMandatoryExpense: Math.round(monthlyExpenses),
      dailyBurnRate: Math.round(daily),
      level: level.name,
      label: level.name,
      levelColor: level.color,
      stage: level.stage,
      phase: level.phase,
      phaseNum: level.phase_num,
      totalStages: 20,
      allStages,
      visibleStages,
      fundBreakdown: {
        liquid: { label: "Liquid Funds", total: Math.round(liquidBalance), description: "Bank accounts & cash" },
        semiLiquid: { label: "Semi-Liquid", total: Math.round(effectiveFunds - liquidBalance), description: "60% of MF/FD accessible" },
        illiquid: { label: "Illiquid", total: 0, description: "Not immediately accessible" },
        liquidBuffer: Math.round(liquidBalance),
        extendedBuffer: Math.round(effectiveFunds),
        netWorth: Math.round(netWorth),
        effectiveTotal: Math.round(effectiveFunds),
      },
      explanation: `Combined family savings of ₹${Math.round(effectiveFunds).toLocaleString('en-IN')} can cover ${survivalDays} days of essential expenses.`,
      tip: survivalDays < 30 ? "Build an emergency fund covering at least 3 months of family expenses." :
           survivalDays < 90 ? "Good start! Aim for 6 months of family expenses as emergency buffer." :
           survivalDays < 180 ? "Solid foundation. Continue building towards 6+ months runway." :
           "Excellent family financial safety net!",
      monthlyIncome: 0,
      monthlyExpenses,
      liquidBalance,
      netWorth: netWorth || 0,
    };
  };

  // Generate badges and challenges from financial metrics (used for family combined + individual member views)
  const generateBadgesAndChallenges = (survivalDays, sr, finalScore, emiRatio, totalInvestments, incomeSources) => {
    const badges = [];
    if (survivalDays >= 180) badges.push({ id: "survivor_6m", name: "6-Month Survivor", icon: "shield", description: "Emergency fund covers 6+ months", unlocked: true, tier: "gold" });
    if (survivalDays >= 90) badges.push({ id: "survivor_3m", name: "3-Month Buffer", icon: "shield", description: "3+ months emergency fund", unlocked: true, tier: "silver" });
    else badges.push({ id: "survivor_3m", name: "3-Month Buffer", icon: "shield", description: "Build 3 months emergency fund", unlocked: false, tier: "silver" });
    if (sr >= 30) badges.push({ id: "super_saver", name: "Super Saver", icon: "piggy-bank", description: "Saving 30%+ of income", unlocked: true, tier: "gold" });
    else if (sr >= 20) badges.push({ id: "good_saver", name: "Smart Saver", icon: "piggy-bank", description: "Saving 20%+ of income", unlocked: true, tier: "silver" });
    else badges.push({ id: "good_saver", name: "Smart Saver", icon: "piggy-bank", description: "Save 20% of income to unlock", unlocked: false, tier: "silver" });
    if (finalScore >= 75) badges.push({ id: "health_star", name: "Health Star", icon: "star", description: "Financial health score 75+", unlocked: true, tier: "gold" });
    else badges.push({ id: "health_star", name: "Health Star", icon: "star", description: "Reach 75+ health score", unlocked: false, tier: "gold" });
    if (emiRatio <= 20) badges.push({ id: "debt_free", name: "Low Debt Champion", icon: "trending-down", description: "EMI under 20% of income", unlocked: true, tier: "silver" });
    if (totalInvestments > 0) badges.push({ id: "investor", name: "Active Investor", icon: "trending-up", description: "Has active investments", unlocked: true, tier: "bronze" });
    if (incomeSources > 1) badges.push({ id: "multi_income", name: "Multi-Income", icon: "layers", description: "Multiple income sources", unlocked: true, tier: "silver" });

    const unlocked = badges.filter(b => b.unlocked);
    const gamData = {
      level: Math.min(Math.floor(survivalDays / 30), 20), xp: survivalDays * 10 + finalScore * 5,
      achievements: unlocked, activeChallenges: [], allAchievements: badges,
      achievementCount: unlocked.length, maxBadgesUnlocked: unlocked.length,
    };

    const challs = [];
    if (sr < 20) challs.push({ code: "save_20", name: "Save 20% Challenge", description: "Increase savings rate to 20%", type: "active", difficulty: "medium" });
    if (survivalDays < 90) challs.push({ code: "build_buffer", name: "3-Month Buffer", description: "Build 3 months emergency fund", type: "available", difficulty: "hard" });
    if (emiRatio > 30) challs.push({ code: "reduce_emi", name: "EMI Reduction", description: "Reduce EMI to under 30%", type: "available", difficulty: "hard" });
    const challData = { active: challs.filter(c => c.type === "active"), available: challs.filter(c => c.type === "available"), completed: [] };

    return { gamData, challData };
  };


  const fetchAll = async () => {
    if (isFamilyView) {
      setLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/family/combined-summary`, { withCredentials: true });
        const cs = res.data.combinedSummary || {};
        // Use normalized (frequency-based) values for health scoring — matches personal /api/financial-health algorithm
        const monthlyIncome = cs.normalizedMonthlyIncome || cs.monthlyIncome || 0;
        const monthlyExpenses = cs.normalizedMonthlyExpense || cs.monthlyExpenses || 0;
        const liquidBalance = cs.liquidBalance || 0;
        const effectiveFunds = cs.effectiveFunds || liquidBalance;
        const survivalDays = cs.survivalDays || (monthlyExpenses > 0 ? Math.round(effectiveFunds / (monthlyExpenses / 30)) : 0);
        const savingsRate = cs.savingsRate || (monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0);

        const clock = buildSurvivalClock(survivalDays, effectiveFunds, monthlyExpenses, liquidBalance, cs.netWorth || 0);
        clock.monthlyIncome = monthlyIncome;

        // Calculate proper Financial Score with breakdown for FinancialScoreWidget
        const totalEMI = cs.totalEMI || 0;
        const emiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;
        const emergencyMonths = monthlyExpenses > 0 ? effectiveFunds / monthlyExpenses : 0;

        // Score breakdown matching personal view structure
        const sr = savingsRate;
        const srScore = sr >= 35 ? 25 : sr >= 30 ? 22 : sr >= 25 ? 20 : sr >= 20 ? 17 : sr >= 15 ? 14 : sr >= 10 ? 10 : sr >= 5 ? 6 : 0;
        const emiScore = emiRatio <= 20 ? 25 : emiRatio <= 25 ? 22 : emiRatio <= 30 ? 20 : emiRatio <= 40 ? 15 : emiRatio <= 50 ? 10 : emiRatio <= 60 ? 5 : 0;
        const bufferScore = emergencyMonths >= 8 ? 25 : emergencyMonths >= 6 ? 22 : emergencyMonths >= 4 ? 18 : emergencyMonths >= 3 ? 14 : emergencyMonths >= 2 ? 10 : emergencyMonths >= 1 ? 5 : 0;
        const consistencyScore = 18; // Default for family (no 3-month history)
        const finalScore = srScore + emiScore + bufferScore + consistencyScore;
        const grade = finalScore >= 85 ? "A+" : finalScore >= 75 ? "A" : finalScore >= 65 ? "B+" : finalScore >= 55 ? "B" : finalScore >= 45 ? "C" : finalScore >= 35 ? "D" : "F";

        const controlScoreData = {
          finalScore,
          score: finalScore,
          grade,
          phase: finalScore >= 60 ? 3 : finalScore >= 30 ? 2 : 1,
          metrics: {
            monthlyIncome,
            totalEMI,
            savingsRate: sr,
            effectiveFunds,
            monthlyExpenses,
            emergencyMonths: Math.round(emergencyMonths * 10) / 10,
          },
          breakdown: {
            savingsRate: { label: "Savings Rate", score: srScore, max: 25 },
            emiLoad: { label: "EMI Load", score: emiScore, max: 25 },
            safetyBuffer: { label: "Safety Buffer", score: bufferScore, max: 25 },
            incomeConsistency: { label: "Income Consistency", score: consistencyScore, max: 25 },
          },
          modules: []
        };

        // Money Personality for family - match ALL_PERSONALITIES structure
        const spendRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 100;
        const needsRatio = Math.min(50, spendRatio * 0.5);
        const wantsRatio = Math.max(0, spendRatio - needsRatio);
        const emiPct = emiRatio;

        // Map to personality ID based on financial position
        let personalityId, personality, zone;
        if (sr >= 40 && emergencyMonths >= 6) { personalityId = 13; personality = "Wealth Builder"; zone = "Growth"; }
        else if (sr >= 30 && emergencyMonths >= 4) { personalityId = 9; personality = "Structured Controller"; zone = "Control"; }
        else if (sr >= 20 && emergencyMonths >= 2) { personalityId = 6; personality = "Buffer Builder"; zone = "Stabilizing"; }
        else if (sr >= 10) { personalityId = 5; personality = "Recovering Planner"; zone = "Stabilizing"; }
        else if (emiRatio > 40) { personalityId = 3; personality = "EMI Trapped"; zone = "Survival"; }
        else { personalityId = 2; personality = "Drifter"; zone = "Survival"; }

        const confidence = Math.min(95, Math.max(40, Math.round(sr * 1.2 + emergencyMonths * 5)));

        setSurvivalClock(clock);
        setControlScore(controlScoreData);
        const totalInvestments = cs.totalInvestments || 0;
        const incomeSources = 1; // Default for family combined view
        const { gamData: fGam, challData: fChall } = generateBadgesAndChallenges(survivalDays, sr, finalScore, emiRatio, totalInvestments, incomeSources);
        setGamification(fGam);
        setChallenges(fChall);
        setBehaviorAlerts(null);
        setMoneyPattern({
          personality,
          personalityId,
          zone,
          confidence,
          tagline: `Family financial profile based on ${Math.round(sr)}% savings rate and ${Math.round(emergencyMonths * 10) / 10} months emergency buffer.`,
          secondary: null,
          dominantTrait: personality,
          spendingDNA: { needs: Math.round(needsRatio), wants: Math.round(wantsRatio), savings: Math.round(sr), emi: Math.round(emiPct) },
          metrics: { survival: survivalDays, score: finalScore, savings: Math.round(sr), debt: Math.round(emiRatio) },
        });
        setFutureYou(null);
        setPersonalityHistory(null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
      return;
    }
    if (!isPersonalView) {
      // Individual family member view — fetch their specific data
      setLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/family/member/${activeViewId}/summary`, { withCredentials: true });
        const s = res.data.summary || {};
        const monthlyIncome = s.monthlyIncome || 0;
        const monthlyExpenses = s.monthlyExpenses || 0;
        const liquidBalance = s.liquidBalance || 0;
        const totalInvestments = s.totalInvestments || 0;
        const netWorth = s.netWorth || 0;
        const totalEMI = s.totalEMI || 0;
        const effectiveFunds = s.effectiveFunds || liquidBalance;
        const survivalDays = s.survivalDays || (monthlyExpenses > 0 ? Math.round(effectiveFunds / (monthlyExpenses / 30)) : 0);
        const savingsRate = s.savingsRate || (monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0);

        const clock = buildSurvivalClock(survivalDays, effectiveFunds, monthlyExpenses, liquidBalance, netWorth);
        clock.monthlyIncome = monthlyIncome;

        // Calculate Financial Score with breakdown
        const emiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;
        const emergencyMonths = monthlyExpenses > 0 ? effectiveFunds / monthlyExpenses : 0;

        const sr = savingsRate;
        const srScore = sr >= 35 ? 25 : sr >= 30 ? 22 : sr >= 25 ? 20 : sr >= 20 ? 17 : sr >= 15 ? 14 : sr >= 10 ? 10 : sr >= 5 ? 6 : 0;
        const emiScore = emiRatio <= 20 ? 25 : emiRatio <= 25 ? 22 : emiRatio <= 30 ? 20 : emiRatio <= 40 ? 15 : emiRatio <= 50 ? 10 : emiRatio <= 60 ? 5 : 0;
        const bufferScore = emergencyMonths >= 8 ? 25 : emergencyMonths >= 6 ? 22 : emergencyMonths >= 4 ? 18 : emergencyMonths >= 3 ? 14 : emergencyMonths >= 2 ? 10 : emergencyMonths >= 1 ? 5 : 0;
        const consistencyScore = 18;
        const finalScore = srScore + emiScore + bufferScore + consistencyScore;
        const grade = finalScore >= 85 ? "A+" : finalScore >= 75 ? "A" : finalScore >= 65 ? "B+" : finalScore >= 55 ? "B" : finalScore >= 45 ? "C" : finalScore >= 35 ? "D" : "F";

        const controlScoreData = {
          finalScore, score: finalScore, grade,
          phase: finalScore >= 60 ? 3 : finalScore >= 30 ? 2 : 1,
          metrics: { monthlyIncome, totalEMI, savingsRate: sr, effectiveFunds, monthlyExpenses, emergencyMonths: Math.round(emergencyMonths * 10) / 10 },
          breakdown: {
            savingsRate: { label: "Savings Rate", score: srScore, max: 25 },
            emiLoad: { label: "EMI Load", score: emiScore, max: 25 },
            safetyBuffer: { label: "Safety Buffer", score: bufferScore, max: 25 },
            incomeConsistency: { label: "Income Consistency", score: consistencyScore, max: 25 },
          },
          modules: []
        };

        // Money Personality
        const spendRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 100;
        const needsRatio = Math.min(50, spendRatio * 0.5);
        const wantsRatio = Math.max(0, spendRatio - needsRatio);
        const emiPct = emiRatio;

        let personalityId, personality, zone;
        if (sr >= 40 && emergencyMonths >= 6) { personalityId = 13; personality = "Wealth Builder"; zone = "Growth"; }
        else if (sr >= 30 && emergencyMonths >= 4) { personalityId = 9; personality = "Structured Controller"; zone = "Control"; }
        else if (sr >= 20 && emergencyMonths >= 2) { personalityId = 6; personality = "Buffer Builder"; zone = "Stabilizing"; }
        else if (sr >= 10) { personalityId = 5; personality = "Recovering Planner"; zone = "Stabilizing"; }
        else if (emiRatio > 40) { personalityId = 3; personality = "EMI Trapped"; zone = "Survival"; }
        else { personalityId = 2; personality = "Drifter"; zone = "Survival"; }

        const confidence = Math.min(95, Math.max(40, Math.round(sr * 1.2 + emergencyMonths * 5)));

        setSurvivalClock(clock);
        setControlScore(controlScoreData);
        const { gamData: mGam, challData: mChall } = generateBadgesAndChallenges(survivalDays, sr, finalScore, emiRatio, totalInvestments, s.counts?.income || 0);
        setGamification(mGam);
        setChallenges(mChall);
        setBehaviorAlerts(null);
        setMoneyPattern({
          personality, personalityId, zone, confidence,
          tagline: `Financial profile based on ${Math.round(sr)}% savings rate and ${Math.round(emergencyMonths * 10) / 10} months emergency buffer.`,
          secondary: null, dominantTrait: personality,
          spendingDNA: { needs: Math.round(needsRatio), wants: Math.round(wantsRatio), savings: Math.round(sr), emi: Math.round(emiPct) },
          metrics: { survival: survivalDays, score: finalScore, savings: Math.round(sr), debt: Math.round(emiRatio) },
        });
        setFutureYou(null);
        setPersonalityHistory(null);
      } catch (e) {
        console.error("Failed to fetch member health data:", e);
        const clock = buildSurvivalClock(0, 0, 0, 0, 0);
        setSurvivalClock(clock);
        setControlScore({ overallScore: 0, phase: 0, modules: [] });
        setGamification({ level: 0, xp: 0, achievements: [], activeChallenges: [], allAchievements: [] });
        setBehaviorAlerts(null);
        setChallenges({ active: [], available: [], completed: [] });
        setMoneyPattern(null);
        setFutureYou(null);
        setPersonalityHistory(null);
      }
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Phase 1: Use combined endpoint for critical data (shown above the fold)
      const combinedRes = await axios.get(`${backendUrl}/api/combined/intelligence?tz_offset=${new Date().getTimezoneOffset()}`, { withCredentials: true });
      const cd = combinedRes.data;
      setSurvivalClock(cd.survivalClock);
      setControlScore(cd.controlScore);
      setGamification(cd.gamification);
      setChallenges(cd.challenges);
      setPersonalityHistory(cd.personalityHistory);
      setLoading(false);

      // Phase 2: Secondary data — load in background after UI renders
      const [alertsRes, patternRes, futureRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/behavior-alerts`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/money-pattern`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/future-you`, { withCredentials: true }).catch(() => ({ data: null })),
      ]);
      setBehaviorAlerts(alertsRes.data);
      setMoneyPattern(patternRes.data);
      setFutureYou(futureRes.data);

      // Phase 3: Auto-process gamification to award any new badges
      try {
        const processRes = await axios.post(`${backendUrl}/api/gamification/process`, {}, { withCredentials: true });
        if (processRes.data) setGamification(prev => ({ ...prev, ...processRes.data }));
      } catch (e) { /* silently skip if already processed recently */ }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const processWeekly = async () => {
    try {
      const res = await axios.post(`${backendUrl}/api/gamification/process`, {}, { withCredentials: true });
      await fetchAll();
      return res.data;
    } catch (err) {
      return null;
    }
  };

  const joinChallenge = async (code) => {
    try {
      await axios.post(`${backendUrl}/api/gamification/challenges/${code}/join`, {}, { withCredentials: true });
      await fetchAll();
      return true;
    } catch {
      return false;
    }
  };

  const leaveChallenge = async (id) => {
    try {
      await axios.delete(`${backendUrl}/api/gamification/challenges/${id}/leave`, { withCredentials: true });
      await fetchAll();
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    fetchAll();
  }, [activeViewId]);

  return { survivalClock, controlScore, behaviorAlerts, gamification, challenges, moneyPattern, futureYou, personalityHistory, loading, error, refresh: fetchAll, processWeekly, joinChallenge, leaveChallenge };
}

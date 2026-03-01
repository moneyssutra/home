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

  const fetchAll = async () => {
    if (isFamilyView) {
      setLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/family/combined-summary`, { withCredentials: true });
        const cs = res.data.combinedSummary || {};
        const monthlyIncome = cs.monthlyIncome || 0;
        const monthlyExpenses = cs.monthlyExpenses || 0;
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

        // Money Personality for family
        const spendRatio = monthlyIncome > 0 ? (monthlyExpenses / monthlyIncome) * 100 : 100;
        let personality, description;
        if (sr >= 40) { personality = "Wealth Builder"; description = "Your family saves aggressively and builds wealth consistently."; }
        else if (sr >= 25) { personality = "Balanced Planner"; description = "Your family maintains a healthy balance between spending and saving."; }
        else if (sr >= 10) { personality = "Cautious Spender"; description = "Your family spends conservatively but has room to save more."; }
        else { personality = "Active Spender"; description = "Your family prioritizes spending. Consider building more savings buffer."; }

        setSurvivalClock(clock);
        setControlScore(controlScoreData);
        setGamification({ level: Math.min(Math.floor(survivalDays / 30), 20), xp: survivalDays * 10, achievements: [], activeChallenges: [], allAchievements: [] });
        setChallenges({ active: [], available: [], completed: [] });
        setBehaviorAlerts(null);
        setMoneyPattern({ personality, description, dominantTrait: personality, traits: { saving: sr, spending: spendRatio, planning: Math.min(100, emergencyMonths * 16.7), risk: Math.min(100, 100 - (emiRatio * 2)) } });
        setFutureYou(null);
        setPersonalityHistory(null);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
      return;
    }
    if (!isPersonalView) {
      const clock = buildSurvivalClock(0, 0, 0, 0, 0);
      setSurvivalClock(clock);
      setControlScore({ overallScore: 0, phase: 0, modules: [] });
      setGamification({ level: 0, xp: 0, achievements: [], activeChallenges: [], allAchievements: [] });
      setBehaviorAlerts(null);
      setChallenges({ active: [], available: [], completed: [] });
      setMoneyPattern(null);
      setFutureYou(null);
      setPersonalityHistory(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Phase 1: Critical data (shown above the fold) — load first
      const [survivalRes, scoreRes, profileRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/survival-clock`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/intelligence/control-score`, { withCredentials: true }),
        axios.get(`${backendUrl}/api/gamification/profile`, { withCredentials: true }),
      ]);
      setSurvivalClock(survivalRes.data);
      setControlScore(scoreRes.data);
      setGamification(profileRes.data);
      setLoading(false);

      // Phase 2: Secondary data — load in background after UI renders
      const [alertsRes, challengesRes, patternRes, futureRes, historyRes] = await Promise.all([
        axios.get(`${backendUrl}/api/intelligence/behavior-alerts`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/gamification/challenges`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/money-pattern`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/future-you`, { withCredentials: true }).catch(() => ({ data: null })),
        axios.get(`${backendUrl}/api/intelligence/personality-history`, { withCredentials: true }).catch(() => ({ data: null })),
      ]);
      setBehaviorAlerts(alertsRes.data);
      setChallenges(challengesRes.data);
      setMoneyPattern(patternRes.data);
      setFutureYou(futureRes.data);
      setPersonalityHistory(historyRes.data);

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

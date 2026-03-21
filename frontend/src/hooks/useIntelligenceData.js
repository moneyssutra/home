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
  // Matches backend ACHIEVEMENTS structure: 30 badges in 8 categories
  const generateBadgesAndChallenges = (survivalDays, sr, finalScore, emiRatio, totalInvestments, incomeSources, extraData = {}) => {
    const badges = [];
    const liquidBalance = extraData.liquidBalance || 0;
    const totalLoans = extraData.totalLoans || 0;
    const investmentCategories = extraData.investmentCategories || 0;

    // ═══ CATEGORY 1: Survival & Liquidity (6 Badges) ═══
    badges.push({ id: "FIRST_STEP", name: "First Step", icon: "rocket", description: "Started tracking your finances", unlocked: true, tier: "bronze", category: "survival" });
    badges.push({ id: "BUFFER_30D", name: "30-Day Shield", icon: "shield", description: survivalDays >= 30 ? "1 month of emergency runway" : "Build 1 month emergency fund", unlocked: survivalDays >= 30, tier: "bronze", category: "survival" });
    badges.push({ id: "BUFFER_90D", name: "90-Day Fortress", icon: "shield-check", description: survivalDays >= 90 ? "3 months of safety net" : "Build 3 months emergency fund", unlocked: survivalDays >= 90, tier: "silver", category: "survival" });
    badges.push({ id: "BUFFER_180D", name: "180-Day Defender", icon: "castle", description: survivalDays >= 180 ? "6 months of financial safety" : "Build 6 months emergency fund", unlocked: survivalDays >= 180, tier: "silver", category: "survival" });
    badges.push({ id: "BUFFER_365D", name: "365-Day Stronghold", icon: "crown", description: survivalDays >= 365 ? "Full year of emergency funds!" : "Build 12 months emergency fund", unlocked: survivalDays >= 365, tier: "gold", category: "survival" });
    badges.push({ id: "FINANCIAL_FORTRESS", name: "Financial Fortress", icon: "castle", description: survivalDays >= 510 ? "Reached Fortified zone" : "Reach 17+ months emergency fund", unlocked: survivalDays >= 510, tier: "platinum", category: "survival" });

    // ═══ CATEGORY 2: Financial Control Score (4 Badges) ═══
    badges.push({ id: "SCORE_60", name: "Score 60 Club", icon: "gauge", description: finalScore >= 60 ? "Financial Score reached 60+" : "Reach 60+ financial score", unlocked: finalScore >= 60, tier: "bronze", category: "score" });
    badges.push({ id: "SCORE_75", name: "Score 75 Performer", icon: "target", description: finalScore >= 75 ? "Financial Score reached 75+" : "Reach 75+ financial score", unlocked: finalScore >= 75, tier: "silver", category: "score" });
    badges.push({ id: "SCORE_90", name: "Score 90 Champion", icon: "award", description: finalScore >= 90 ? "Financial Score above 90!" : "Reach 90+ financial score", unlocked: finalScore >= 90, tier: "gold", category: "score" });
    badges.push({ id: "SCORE_100", name: "Perfect 100", icon: "star", description: finalScore >= 100 ? "Achieved a perfect Financial Score" : "Achieve perfect 100 score", unlocked: finalScore >= 100, tier: "platinum", category: "score" });

    // ═══ CATEGORY 3: Behavior Intelligence (4 Badges) ═══
    badges.push({ id: "OVERSPEND_SLAYER", name: "Overspending Slayer", icon: "trending-down", description: "Reduced overspending by 20%", unlocked: sr >= 10, tier: "bronze", category: "behavior" });
    badges.push({ id: "SMART_SPENDER", name: "Smart Spender", icon: "check-circle", description: sr >= 20 ? "Wants ratio below 20% of income" : "Keep wants below 20%", unlocked: sr >= 20, tier: "bronze", category: "behavior" });
    badges.push({ id: "DISCIPLINE_PRO", name: "Financial Discipline Pro", icon: "list-checks", description: "All expense categories within budget", unlocked: sr >= 30 && emiRatio <= 30, tier: "silver", category: "behavior" });
    badges.push({ id: "BEHAVIORAL_CHAMPION", name: "Behavioral Champion", icon: "crown", description: "Zero alerts + positive patterns", unlocked: sr >= 40 && emiRatio <= 20 && survivalDays >= 180, tier: "platinum", category: "behavior" });

    // ═══ CATEGORY 4: Savings & Cash Discipline (4 Badges) ═══
    badges.push({ id: "SAVED_10K", name: "First 10K Saved", icon: "piggy-bank", description: liquidBalance >= 10000 ? "Savings crossed 10,000" : "Save 10,000 to unlock", unlocked: liquidBalance >= 10000, tier: "bronze", category: "savings" });
    badges.push({ id: "SAVED_1L", name: "1L Saver", icon: "piggy-bank", description: liquidBalance >= 100000 ? "Savings crossed 1,00,000" : "Save 1 lakh to unlock", unlocked: liquidBalance >= 100000, tier: "silver", category: "savings" });
    badges.push({ id: "SAVINGS_RATE_30", name: "30% Savings Rate", icon: "trending-up", description: sr >= 30 ? "Saving 30%+ of monthly income" : "Save 30% of income", unlocked: sr >= 30, tier: "silver", category: "savings" });
    badges.push({ id: "CASH_FLOW_KING", name: "Cash Flow King", icon: "crown", description: "Positive cash flow mastery", unlocked: sr >= 40 && survivalDays >= 365, tier: "platinum", category: "savings" });

    // ═══ CATEGORY 5: Debt Control (3 Badges) ═══
    badges.push({ id: "FIRST_EMI_CLOSED", name: "First EMI Closed", icon: "x-circle", description: "Paid off a loan completely", unlocked: totalLoans === 0 && emiRatio === 0, tier: "bronze", category: "debt" });
    badges.push({ id: "DEBT_DESTROYER_50", name: "50% Debt Destroyer", icon: "trending-down", description: emiRatio <= 15 ? "Half your debt is gone!" : "Reduce debt by 50%", unlocked: emiRatio <= 15, tier: "gold", category: "debt" });
    badges.push({ id: "FREEDOM_BUILDER", name: "Freedom Builder", icon: "crown", description: "Completely debt-free!", unlocked: emiRatio === 0 && totalLoans === 0, tier: "platinum", category: "debt" });

    // ═══ CATEGORY 6: Investment Growth (3 Badges) ═══
    badges.push({ id: "FIRST_SIP", name: "First SIP", icon: "bar-chart-3", description: totalInvestments > 0 ? "Started investing" : "Start your first investment", unlocked: totalInvestments > 0, tier: "bronze", category: "investment" });
    badges.push({ id: "DIVERSIFIED_PORTFOLIO", name: "Diversified Portfolio", icon: "pie-chart", description: investmentCategories >= 5 ? "5+ different investment types" : "Diversify to 5+ types", unlocked: investmentCategories >= 5, tier: "silver", category: "investment" });
    badges.push({ id: "INVESTMENT_STRATEGIST", name: "Investment Strategist", icon: "crown", description: "Investment value exceeds annual income", unlocked: totalInvestments > 0 && sr >= 30, tier: "platinum", category: "investment" });

    // ═══ CATEGORY 7: Streak & Consistency (3 Badges) ═══
    badges.push({ id: "STREAK_4W", name: "4-Week Streak", icon: "flame", description: "1 month of consistency", unlocked: false, tier: "bronze", category: "streak" });
    badges.push({ id: "STREAK_12W", name: "12-Week Streak", icon: "trophy", description: "3 months of financial discipline!", unlocked: false, tier: "silver", category: "streak" });
    badges.push({ id: "STREAK_52W", name: "52-Week Discipline", icon: "medal", description: "Full year of financial discipline!", unlocked: false, tier: "platinum", category: "streak" });

    // ═══ CATEGORY 8: Power & Elite Status (3 Badges) ═══
    const level = Math.min(Math.floor(survivalDays / 30), 20);
    badges.push({ id: "FINANCIAL_CLIMBER", name: "Financial Climber", icon: "trending-up", description: level >= 5 ? "Reached Level 5" : "Reach Level 5", unlocked: level >= 5, tier: "bronze", category: "elite" });
    badges.push({ id: "WEALTH_WARRIOR", name: "Wealth Warrior", icon: "award", description: level >= 15 ? "Reached Level 15" : "Reach Level 15", unlocked: level >= 15, tier: "gold", category: "elite" });
    const allUnlocked = badges.filter(b => b.unlocked).length;
    badges.push({ id: "MONEYSUTRA_LEGEND", name: "MoneySutra Legend", icon: "star", description: "All badges, Level 20, Score 95+", unlocked: allUnlocked >= 29 && level >= 20 && finalScore >= 95, tier: "platinum", category: "elite" });

    const unlocked = badges.filter(b => b.unlocked);
    const gamData = {
      level, xp: survivalDays * 10 + finalScore * 5,
      achievements: unlocked, activeChallenges: [], allAchievements: badges,
      achievementCount: unlocked.length, totalBadges: badges.length,
    };

    // Challenges — always provide a mix of active + available
    const challs = [];
    // Deficit-based challenges
    if (sr < 20) challs.push({ code: "save_20", name: "Save 20% Challenge", description: "Increase savings rate to 20%", type: "active", difficulty: "medium" });
    if (survivalDays < 90) challs.push({ code: "build_buffer", name: "3-Month Buffer", description: "Build 3 months emergency fund", type: "active", difficulty: "hard" });
    if (emiRatio > 30) challs.push({ code: "reduce_emi", name: "EMI Reduction", description: "Reduce EMI to under 30%", type: "active", difficulty: "hard" });
    // Growth challenges — always at least a few
    if (sr >= 20 && sr < 30) challs.push({ code: "save_30", name: "Super Saver", description: "Push savings rate to 30%", type: "available", difficulty: "medium" });
    if (sr >= 30 && sr < 50) challs.push({ code: "save_50", name: "Frugal Master", description: "Push savings rate to 50%", type: "available", difficulty: "hard" });
    if (survivalDays >= 90 && survivalDays < 180) challs.push({ code: "build_6m_buffer", name: "6-Month Safety Net", description: "Extend emergency fund to 6 months", type: "available", difficulty: "hard" });
    if (survivalDays >= 180 && survivalDays < 365) challs.push({ code: "build_1y_buffer", name: "1-Year Fortress", description: "Build a full year of emergency fund", type: "available", difficulty: "hard" });
    if (totalInvestments === 0) challs.push({ code: "first_investment", name: "First Investment", description: "Start your investment journey", type: "available", difficulty: "easy" });
    if (incomeSources <= 1) challs.push({ code: "diversify_income", name: "Income Diversification", description: "Add a second income source", type: "available", difficulty: "hard" });
    if (finalScore < 75) challs.push({ code: "health_75", name: "Health Star", description: "Reach 75+ financial health score", type: "available", difficulty: "medium" });
    if (finalScore >= 75) challs.push({ code: "maintain_health", name: "Consistency King", description: "Maintain 75+ health score for 3 months", type: "active", difficulty: "medium" });
    // Evergreen challenges (always available for everyone)
    challs.push({ code: "review_portfolio", name: "Portfolio Review", description: "Review and rebalance your portfolio this month", type: "available", difficulty: "easy" });
    challs.push({ code: "track_expenses", name: "Expense Tracker", description: "Log all expenses for 30 consecutive days", type: "available", difficulty: "medium" });
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
        const { gamData: fGam, challData: fChall } = generateBadgesAndChallenges(survivalDays, sr, finalScore, emiRatio, totalInvestments, incomeSources, {
          liquidBalance: liquidBalance,
          totalLoans: cs.totalLoans || 0,
          investmentCategories: 0
        });
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
      // Individual family member view — fetch their specific data using the networth API
      setLoading(true);
      try {
        const nwRes = await axios.get(`${backendUrl}/api/dashboard/networth?tz_offset=${new Date().getTimezoneOffset()}&memberId=${activeViewId}`, { withCredentials: true });
        const nw = nwRes.data;
        const monthlyIncome = nw.monthlyIncome || 0;
        const monthlyExpenses = nw.monthlyExpenses || 0;
        const liquidBalance = nw.liquidBalance || 0;
        const totalInvestments = nw.totalInvestments || 0;
        const netWorth = nw.netWorth || 0;
        const totalEMI = nw.totalEMI || 0;
        const effectiveFunds = nw.effectiveFunds || liquidBalance;
        const survivalDays = monthlyExpenses > 0 ? Math.round(effectiveFunds / (monthlyExpenses / 30)) : 0;
        const savingsRate = monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0;

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
        const { gamData: mGam, challData: mChall } = generateBadgesAndChallenges(survivalDays, sr, finalScore, emiRatio, totalInvestments, nw.incomeCount || 0, {
          liquidBalance: liquidBalance,
          totalLoans: nw.totalLiabilities || 0,
          investmentCategories: nw.investmentCategories || 0
        });
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

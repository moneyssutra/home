"""Gamification Engine - XP, 20 Levels, Streaks, Achievements, Challenges."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging
import re

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter, create_notification_and_cleanup

router = APIRouter(prefix="/gamification", tags=["Gamification"])
logger = logging.getLogger(__name__)

# 20 Levels - first 5-6 achievable in month 1
LEVELS = [
    {"min_xp": 0, "title": "Getting Started", "level": 1, "stage": "begin"},
    {"min_xp": 20, "title": "First Steps", "level": 2, "stage": "begin"},
    {"min_xp": 50, "title": "Curious Mind", "level": 3, "stage": "begin"},
    {"min_xp": 100, "title": "Building Habits", "level": 4, "stage": "learn"},
    {"min_xp": 180, "title": "On Track", "level": 5, "stage": "learn"},
    {"min_xp": 300, "title": "Rising Star", "level": 6, "stage": "grow"},
    {"min_xp": 450, "title": "Steady Progress", "level": 7, "stage": "grow"},
    {"min_xp": 650, "title": "Smart Saver", "level": 8, "stage": "grow"},
    {"min_xp": 900, "title": "Money Aware", "level": 9, "stage": "control"},
    {"min_xp": 1200, "title": "Financially Fit", "level": 10, "stage": "control"},
    {"min_xp": 1600, "title": "Budget Pro", "level": 11, "stage": "control"},
    {"min_xp": 2100, "title": "Wealth Builder", "level": 12, "stage": "expand"},
    {"min_xp": 2700, "title": "Asset Grower", "level": 13, "stage": "expand"},
    {"min_xp": 3500, "title": "Finance Pro", "level": 14, "stage": "expand"},
    {"min_xp": 4500, "title": "Money Strategist", "level": 15, "stage": "master"},
    {"min_xp": 5800, "title": "Wealth Commander", "level": 16, "stage": "master"},
    {"min_xp": 7500, "title": "Financial Champion", "level": 17, "stage": "master"},
    {"min_xp": 9500, "title": "Money Legend", "level": 18, "stage": "legend"},
    {"min_xp": 12000, "title": "Finance Guru", "level": 19, "stage": "legend"},
    {"min_xp": 15000, "title": "Financial Freedom", "level": 20, "stage": "freedom"},
]

STREAK_REWARDS = {4: 50, 8: 100, 12: 150, 24: 300, 52: 500}

XP_RULES = [
    {"action": "Weekly Financial Score above 70", "xp": "+20 XP", "icon": "target"},
    {"action": "Weekly Financial Score above 85", "xp": "+40 XP", "icon": "star"},
    {"action": "Emergency runway increased", "xp": "+25 XP", "icon": "shield"},
    {"action": "Debt reduced week-over-week", "xp": "+30 XP", "icon": "trending-down"},
    {"action": "No critical alerts this week", "xp": "+15 XP", "icon": "check-circle"},
    {"action": "4-week streak bonus", "xp": "+50 XP", "icon": "flame"},
    {"action": "Unlock achievements", "xp": "+10-300 XP", "icon": "trophy"},
]

# Gender-friendly achievements - 100 Badges in 8 Categories
# Bronze (1-30), Silver (31-60), Gold (61-85), Platinum (86-100)
ACHIEVEMENTS = {
    # ═══ CATEGORY 1: Survival & Liquidity (20 Badges) ═══
    "FIRST_STEP": {"title": "First Step", "description": "Started tracking your finances", "icon": "rocket", "xp_bonus": 10, "category": "survival", "tier": "bronze"},
    "BUFFER_7D": {"title": "7-Day Buffer", "description": "7 days of emergency runway", "icon": "shield", "xp_bonus": 15, "category": "survival", "tier": "bronze"},
    "BUFFER_14D": {"title": "14-Day Buffer", "description": "14 days of emergency runway", "icon": "shield", "xp_bonus": 20, "category": "survival", "tier": "bronze"},
    "BUFFER_30D": {"title": "30-Day Shield", "description": "1 month of emergency runway", "icon": "shield", "xp_bonus": 30, "category": "survival", "tier": "bronze"},
    "BUFFER_60D": {"title": "60-Day Cushion", "description": "2 months of emergency backup", "icon": "shield-check", "xp_bonus": 40, "category": "survival", "tier": "bronze"},
    "BUFFER_90D": {"title": "90-Day Fortress", "description": "3 months of safety net", "icon": "shield-check", "xp_bonus": 60, "category": "survival", "tier": "silver"},
    "BUFFER_120D": {"title": "120-Day Guard", "description": "4 months covered", "icon": "castle", "xp_bonus": 70, "category": "survival", "tier": "silver"},
    "BUFFER_180D": {"title": "180-Day Defender", "description": "6 months of financial safety", "icon": "castle", "xp_bonus": 100, "category": "survival", "tier": "silver"},
    "BUFFER_270D": {"title": "270-Day Reserve", "description": "9 months of backup ready", "icon": "crown", "xp_bonus": 120, "category": "survival", "tier": "gold"},
    "BUFFER_365D": {"title": "365-Day Stronghold", "description": "Full year of emergency funds!", "icon": "crown", "xp_bonus": 150, "category": "survival", "tier": "gold"},
    "BUFFER_500D": {"title": "500-Day Stability", "description": "Elite stability milestone", "icon": "crown", "xp_bonus": 180, "category": "survival", "tier": "gold"},
    "BUFFER_730D": {"title": "2-Year Runway", "description": "2 years of financial runway", "icon": "star", "xp_bonus": 250, "category": "survival", "tier": "platinum"},
    "LIQUIDITY_BUILDER": {"title": "Liquidity Builder", "description": "Built liquid buffer above 3 months", "icon": "shield", "xp_bonus": 50, "category": "survival", "tier": "silver"},
    "EMERGENCY_STARTER": {"title": "Emergency Starter", "description": "Opened a dedicated emergency account", "icon": "life-buoy", "xp_bonus": 20, "category": "survival", "tier": "bronze"},
    "EMERGENCY_PRO": {"title": "Emergency Pro", "description": "Emergency fund covers 3+ months", "icon": "life-buoy", "xp_bonus": 60, "category": "survival", "tier": "silver"},
    "EMERGENCY_MASTER": {"title": "Emergency Master", "description": "Emergency fund covers 6+ months", "icon": "life-buoy", "xp_bonus": 100, "category": "survival", "tier": "gold"},
    "BUFFER_BOOSTER": {"title": "Buffer Booster", "description": "Increased runway by 30 days in a month", "icon": "trending-up", "xp_bonus": 40, "category": "survival", "tier": "bronze"},
    "SHOCK_RESISTANT": {"title": "Shock Resistant", "description": "Runway survived a major expense", "icon": "shield-check", "xp_bonus": 50, "category": "survival", "tier": "silver"},
    "SURVIVAL_STRATEGIST": {"title": "Survival Strategist", "description": "Reached Stage 10+ in survival", "icon": "target", "xp_bonus": 80, "category": "survival", "tier": "gold"},
    "FINANCIAL_FORTRESS": {"title": "Financial Fortress", "description": "Reached Stage 17+ - Fortified zone", "icon": "castle", "xp_bonus": 200, "category": "survival", "tier": "platinum"},

    # ═══ CATEGORY 2: Financial Control Score (15 Badges) ═══
    "SCORE_60": {"title": "Score 60 Club", "description": "Financial Score reached 60+", "icon": "gauge", "xp_bonus": 25, "category": "score", "tier": "bronze"},
    "SCORE_70": {"title": "Score 70 Achiever", "description": "Financial Score reached 70+", "icon": "gauge", "xp_bonus": 35, "category": "score", "tier": "bronze"},
    "SCORE_75": {"title": "Score 75 Performer", "description": "Financial Score reached 75+", "icon": "target", "xp_bonus": 45, "category": "score", "tier": "silver"},
    "SCORE_80": {"title": "Score 80 Elite", "description": "Financial Score crossed 80!", "icon": "target", "xp_bonus": 60, "category": "score", "tier": "silver"},
    "SCORE_85": {"title": "Score 85 Leader", "description": "Financial Score reached 85+", "icon": "award", "xp_bonus": 80, "category": "score", "tier": "gold"},
    "SCORE_90": {"title": "Score 90 Champion", "description": "Financial Score above 90!", "icon": "award", "xp_bonus": 100, "category": "score", "tier": "gold"},
    "SCORE_95": {"title": "Score 95 Dominator", "description": "Near-perfect Financial Score!", "icon": "star", "xp_bonus": 150, "category": "score", "tier": "platinum"},
    "SCORE_100": {"title": "Perfect 100", "description": "Achieved a perfect Financial Score", "icon": "star", "xp_bonus": 300, "category": "score", "tier": "platinum"},
    "SCORE_RISE_4W": {"title": "4-Week Score Rise", "description": "Score improved 4 weeks in a row", "icon": "trending-up", "xp_bonus": 40, "category": "score", "tier": "bronze"},
    "SCORE_CONSISTENCY_8W": {"title": "8-Week Consistency", "description": "Score stayed above 70 for 8 weeks", "icon": "check-circle", "xp_bonus": 60, "category": "score", "tier": "silver"},
    "SCORE_CONTROL_12W": {"title": "12-Week Control", "description": "Score above 70 for 12 consecutive weeks", "icon": "check-circle", "xp_bonus": 80, "category": "score", "tier": "gold"},
    "SCORE_RECOVERY": {"title": "Score Recovery Hero", "description": "Recovered 15+ points after a dip", "icon": "trending-up", "xp_bonus": 50, "category": "score", "tier": "silver"},
    "COMEBACK_KID": {"title": "Comeback Kid", "description": "Bounced back from grade D or E", "icon": "rocket", "xp_bonus": 60, "category": "score", "tier": "silver"},
    "STABILITY_STREAK": {"title": "Stability Streak", "description": "Score variance < 5 points for 8 weeks", "icon": "check-circle", "xp_bonus": 50, "category": "score", "tier": "silver"},
    "CONTROL_COMMANDER": {"title": "Control Commander", "description": "Grade A maintained for 12+ weeks", "icon": "crown", "xp_bonus": 150, "category": "score", "tier": "platinum"},

    # ═══ CATEGORY 3: Behavior Intelligence (15 Badges) ═══
    "OVERSPEND_SLAYER": {"title": "Overspending Slayer", "description": "Reduced overspending by 20%", "icon": "trending-down", "xp_bonus": 40, "category": "behavior", "tier": "bronze"},
    "LIFESTYLE_CONTROLLER": {"title": "Lifestyle Controller", "description": "Kept lifestyle inflation below 5%", "icon": "check-circle", "xp_bonus": 50, "category": "behavior", "tier": "silver"},
    "INFLATION_BLOCKER": {"title": "Inflation Blocker", "description": "0% lifestyle inflation for 3 months", "icon": "shield", "xp_bonus": 60, "category": "behavior", "tier": "silver"},
    "EMI_PROTECTOR": {"title": "EMI Protector", "description": "EMI ratio below 30% for 3 months", "icon": "shield-check", "xp_bonus": 45, "category": "behavior", "tier": "silver"},
    "RISK_AWARE": {"title": "Risk Aware", "description": "Reviewed all financial risks", "icon": "alert-circle", "xp_bonus": 30, "category": "behavior", "tier": "bronze"},
    "ALERT_FREE_WEEK": {"title": "Alert-Free Week", "description": "Zero critical alerts for 7 days", "icon": "check-circle", "xp_bonus": 15, "category": "behavior", "tier": "bronze"},
    "ALERT_FREE_MONTH": {"title": "Alert-Free Month", "description": "Zero critical alerts for 30 days", "icon": "check-circle", "xp_bonus": 40, "category": "behavior", "tier": "silver"},
    "ALERT_FREE_QUARTER": {"title": "Alert-Free Quarter", "description": "No alerts for 90 days", "icon": "shield-check", "xp_bonus": 80, "category": "behavior", "tier": "gold"},
    "DISCIPLINE_PRO": {"title": "Financial Discipline Pro", "description": "All expense categories within budget", "icon": "list-checks", "xp_bonus": 50, "category": "behavior", "tier": "silver"},
    "SMART_SPENDER": {"title": "Smart Spender", "description": "Wants ratio below 20% of income", "icon": "check-circle", "xp_bonus": 40, "category": "behavior", "tier": "bronze"},
    "SPENDING_ANALYZER": {"title": "Spending Analyzer", "description": "Tracked expenses for 30 consecutive days", "icon": "list-checks", "xp_bonus": 35, "category": "behavior", "tier": "bronze"},
    "TREND_BREAKER": {"title": "Trend Breaker", "description": "Broke a bad spending pattern", "icon": "trending-down", "xp_bonus": 50, "category": "behavior", "tier": "silver"},
    "PATTERN_MASTER": {"title": "Pattern Master", "description": "Maintained positive patterns for 3 months", "icon": "target", "xp_bonus": 70, "category": "behavior", "tier": "gold"},
    "EXPENSE_OPTIMIZER": {"title": "Expense Optimizer", "description": "Reduced total expenses by 10%", "icon": "trending-down", "xp_bonus": 60, "category": "behavior", "tier": "silver"},
    "BEHAVIORAL_CHAMPION": {"title": "Behavioral Champion", "description": "Zero alerts + positive patterns for 6 months", "icon": "crown", "xp_bonus": 150, "category": "behavior", "tier": "platinum"},

    # ═══ CATEGORY 4: Savings & Cash Discipline (10 Badges) ═══
    "SAVED_10K": {"title": "First 10K Saved", "description": "Accessible savings crossed ₹10,000", "icon": "piggy-bank", "xp_bonus": 15, "category": "savings", "tier": "bronze"},
    "SAVED_50K": {"title": "50K Milestone", "description": "Accessible savings crossed ₹50,000", "icon": "piggy-bank", "xp_bonus": 25, "category": "savings", "tier": "bronze"},
    "SAVED_1L": {"title": "1L Saver", "description": "Accessible savings crossed ₹1,00,000", "icon": "piggy-bank", "xp_bonus": 40, "category": "savings", "tier": "silver"},
    "SAVED_5L": {"title": "5L Cushion", "description": "Accessible savings crossed ₹5,00,000", "icon": "piggy-bank", "xp_bonus": 80, "category": "savings", "tier": "gold"},
    "SAVINGS_RATE_20": {"title": "20% Savings Rate", "description": "Saving 20%+ of monthly income", "icon": "trending-up", "xp_bonus": 35, "category": "savings", "tier": "bronze"},
    "SAVINGS_RATE_30": {"title": "30% Savings Rate", "description": "Saving 30%+ of monthly income", "icon": "trending-up", "xp_bonus": 50, "category": "savings", "tier": "silver"},
    "SAVINGS_RATE_40": {"title": "40% Savings Rate", "description": "Saving 40%+ of income — incredible!", "icon": "trending-up", "xp_bonus": 80, "category": "savings", "tier": "gold"},
    "CONSISTENT_SAVER": {"title": "Consistent Saver", "description": "Saved 20%+ for 3 consecutive months", "icon": "check-circle", "xp_bonus": 60, "category": "savings", "tier": "silver"},
    "SAVINGS_ARCHITECT": {"title": "Savings Architect", "description": "Saved 30%+ for 6 consecutive months", "icon": "award", "xp_bonus": 100, "category": "savings", "tier": "gold"},
    "CASH_FLOW_KING": {"title": "Cash Flow King", "description": "Positive cash flow every month for a year", "icon": "crown", "xp_bonus": 200, "category": "savings", "tier": "platinum"},

    # ═══ CATEGORY 5: Debt Control (10 Badges) ═══
    "FIRST_EMI_CLOSED": {"title": "First EMI Closed", "description": "Paid off your first loan completely", "icon": "x-circle", "xp_bonus": 40, "category": "debt", "tier": "bronze"},
    "DEBT_REDUCED_10": {"title": "10% Debt Reduced", "description": "Reduced total debt by 10%", "icon": "trending-down", "xp_bonus": 30, "category": "debt", "tier": "bronze"},
    "DEBT_REDUCED_25": {"title": "25% Debt Reduced", "description": "Reduced total debt by 25%", "icon": "trending-down", "xp_bonus": 50, "category": "debt", "tier": "silver"},
    "DEBT_DESTROYER_50": {"title": "50% Debt Destroyer", "description": "Half your debt is gone!", "icon": "trending-down", "xp_bonus": 80, "category": "debt", "tier": "gold"},
    "DEBT_FREE_STARTER": {"title": "Debt Free Starter", "description": "EMI ratio below 20%", "icon": "shield", "xp_bonus": 35, "category": "debt", "tier": "bronze"},
    "DEBT_CONQUEROR": {"title": "Debt Conqueror", "description": "Reduced debt 3 consecutive months", "icon": "award", "xp_bonus": 100, "category": "debt", "tier": "gold"},
    "ZERO_EMI_MONTH": {"title": "Zero EMI Month", "description": "No EMI payments this month!", "icon": "check-circle", "xp_bonus": 45, "category": "debt", "tier": "silver"},
    "HIGH_EMI_ESCAPE": {"title": "High EMI Escape", "description": "EMI ratio dropped from 50%+ to below 30%", "icon": "rocket", "xp_bonus": 120, "category": "debt", "tier": "gold"},
    "DEBT_DISCIPLINE_PRO": {"title": "Debt Discipline Pro", "description": "Never missed an EMI for 6 months", "icon": "check-circle", "xp_bonus": 70, "category": "debt", "tier": "silver"},
    "FREEDOM_BUILDER": {"title": "Freedom Builder", "description": "Completely debt-free!", "icon": "crown", "xp_bonus": 250, "category": "debt", "tier": "platinum"},

    # ═══ CATEGORY 6: Investment Growth (10 Badges) ═══
    "FIRST_SIP": {"title": "First SIP", "description": "Started your first SIP/Mutual Fund", "icon": "bar-chart-3", "xp_bonus": 20, "category": "investment", "tier": "bronze"},
    "SIP_6M_STREAK": {"title": "6-Month SIP Streak", "description": "SIP running for 6+ months", "icon": "bar-chart-3", "xp_bonus": 40, "category": "investment", "tier": "silver"},
    "SIP_1Y_STREAK": {"title": "1-Year SIP Streak", "description": "SIP running for 12+ months", "icon": "bar-chart-3", "xp_bonus": 80, "category": "investment", "tier": "gold"},
    "DIVERSIFIED_PORTFOLIO": {"title": "Diversified Portfolio", "description": "5+ different investment types", "icon": "pie-chart", "xp_bonus": 50, "category": "investment", "tier": "silver"},
    "EQUITY_EXPLORER": {"title": "Equity Explorer", "description": "Started investing in stocks/equity", "icon": "trending-up", "xp_bonus": 25, "category": "investment", "tier": "bronze"},
    "LONG_TERM_THINKER": {"title": "Long-Term Thinker", "description": "3+ investments with 3+ year horizon", "icon": "target", "xp_bonus": 50, "category": "investment", "tier": "silver"},
    "WEALTH_COMPOUNDER": {"title": "Wealth Compounder", "description": "Investment portfolio grew 10%+", "icon": "trending-up", "xp_bonus": 70, "category": "investment", "tier": "gold"},
    "MULTI_ASSET_PRO": {"title": "Multi-Asset Pro", "description": "Invested in equity, debt, and gold", "icon": "pie-chart", "xp_bonus": 60, "category": "investment", "tier": "silver"},
    "PORTFOLIO_PROTECTOR": {"title": "Portfolio Protector", "description": "Insurance coverage > 10x income", "icon": "heart-pulse", "xp_bonus": 50, "category": "investment", "tier": "silver"},
    "INVESTMENT_STRATEGIST": {"title": "Investment Strategist", "description": "Investment value exceeds annual income", "icon": "crown", "xp_bonus": 150, "category": "investment", "tier": "platinum"},

    # ═══ CATEGORY 7: Streak & Consistency (10 Badges) ═══
    "STREAK_2W": {"title": "2-Week Streak", "description": "2 weeks of financial discipline", "icon": "flame", "xp_bonus": 15, "category": "streak", "tier": "bronze"},
    "STREAK_4W": {"title": "4-Week Streak", "description": "1 month of consistency", "icon": "flame", "xp_bonus": 30, "category": "streak", "tier": "bronze"},
    "STREAK_8W": {"title": "8-Week Streak", "description": "2 months strong", "icon": "flame", "xp_bonus": 50, "category": "streak", "tier": "silver"},
    "STREAK_12W": {"title": "12-Week Streak", "description": "3 months of financial discipline!", "icon": "trophy", "xp_bonus": 80, "category": "streak", "tier": "silver"},
    "STREAK_24W": {"title": "24-Week Streak", "description": "Half a year of consistency!", "icon": "trophy", "xp_bonus": 150, "category": "streak", "tier": "gold"},
    "STREAK_52W": {"title": "52-Week Discipline", "description": "Full year of financial discipline!", "icon": "medal", "xp_bonus": 300, "category": "streak", "tier": "platinum"},
    "CONSISTENCY_KING": {"title": "Consistency King", "description": "Longest streak exceeds 8 weeks", "icon": "award", "xp_bonus": 60, "category": "streak", "tier": "silver"},
    "NO_MISS_MONTH": {"title": "No-Miss Month", "description": "Tracked every transaction for 30 days", "icon": "check-circle", "xp_bonus": 40, "category": "streak", "tier": "bronze"},
    "YEAR_OF_DISCIPLINE": {"title": "Year of Discipline", "description": "Active for 365 consecutive days", "icon": "crown", "xp_bonus": 250, "category": "streak", "tier": "platinum"},
    "IRON_HABIT": {"title": "Iron Habit", "description": "Score never dropped below 60 for 6 months", "icon": "shield", "xp_bonus": 120, "category": "streak", "tier": "gold"},

    # ═══ CATEGORY 8: Power & Elite Status (10 Badges) ═══
    "FINANCIAL_CLIMBER": {"title": "Financial Climber", "description": "Reached Level 5 in gamification", "icon": "trending-up", "xp_bonus": 25, "category": "elite", "tier": "bronze"},
    "STABILITY_ARCHITECT": {"title": "Stability Architect", "description": "Reached Level 10", "icon": "target", "xp_bonus": 50, "category": "elite", "tier": "silver"},
    "CONTROL_MASTER": {"title": "Control Master", "description": "Score 80+ and runway 180+ days", "icon": "shield-check", "xp_bonus": 80, "category": "elite", "tier": "silver"},
    "CAPITAL_GUARDIAN": {"title": "Capital Guardian", "description": "Net worth exceeds 3x annual income", "icon": "castle", "xp_bonus": 100, "category": "elite", "tier": "gold"},
    "WEALTH_WARRIOR": {"title": "Wealth Warrior", "description": "Reached Level 15", "icon": "award", "xp_bonus": 120, "category": "elite", "tier": "gold"},
    "FINANCIAL_ATHLETE": {"title": "Financial Athlete", "description": "Score 90+ for 8 consecutive weeks", "icon": "trophy", "xp_bonus": 100, "category": "elite", "tier": "gold"},
    "MONEY_MENTOR": {"title": "Money Mentor", "description": "50+ badges unlocked", "icon": "medal", "xp_bonus": 150, "category": "elite", "tier": "gold"},
    "INDEPENDENCE_ACHIEVED": {"title": "Independence Achieved", "description": "Stage 18+ (Independent) in survival", "icon": "star", "xp_bonus": 200, "category": "elite", "tier": "platinum"},
    "FINANCIAL_SOVEREIGN": {"title": "Financial Sovereign", "description": "Stage 20 (Sovereign) — ultimate status", "icon": "crown", "xp_bonus": 300, "category": "elite", "tier": "platinum"},
    "MONEYSUTRA_LEGEND": {"title": "MoneySutra Legend", "description": "80+ badges, Level 20, Score 95+", "icon": "star", "xp_bonus": 500, "category": "elite", "tier": "platinum"},
}

CHALLENGES = [
    {"code": "RUNWAY_BOOST_30", "title": "30-Day Runway Boost", "description": "Increase your emergency runway by 20% in 30 days. Save more, spend smart!", "target_metric": "survival_days", "target_pct": 20, "duration_days": 30, "xp_reward": 100, "difficulty": "Medium"},
    {"code": "DEBT_SPRINT_60", "title": "Debt Sprint 60", "description": "Reduce total outstanding debt by 10% in 60 days. Prepay EMIs or close small loans!", "target_metric": "total_debt", "target_pct": -10, "duration_days": 60, "xp_reward": 150, "difficulty": "Hard"},
    {"code": "BUDGET_DISCIPLINE_30", "title": "Budget Discipline", "description": "Keep your lifestyle spending flat or lower for 30 days. No unnecessary upgrades!", "target_metric": "discretionary", "target_pct": 0, "duration_days": 30, "xp_reward": 80, "difficulty": "Easy"},
    {"code": "SCORE_UP_30", "title": "Score Climber", "description": "Improve your Financial Score by 10+ points in 30 days. Balance all 4 pillars!", "target_metric": "control_score", "target_pct": 10, "duration_days": 30, "xp_reward": 120, "difficulty": "Medium"},
    {"code": "ZERO_ALERTS_14", "title": "Alert-Free Fortnight", "description": "Go 14 days with zero critical alerts. Keep EMIs covered, spending in check!", "target_metric": "alerts", "target_pct": 0, "duration_days": 14, "xp_reward": 60, "difficulty": "Easy"},
    {"code": "SAVINGS_SPRINT_30", "title": "Savings Sprint", "description": "Grow your accessible savings by 15% in 30 days. Every rupee saved matters!", "target_metric": "liquid_funds", "target_pct": 15, "duration_days": 30, "xp_reward": 110, "difficulty": "Medium"},
]


def _get_level(xp: int) -> dict:
    result = LEVELS[0]
    prev_level = None
    for i, lvl in enumerate(LEVELS):
        if xp >= lvl["min_xp"]:
            prev_level = LEVELS[i - 1] if i > 0 else None
            result = lvl
    next_level = None
    for lvl in LEVELS:
        if lvl["min_xp"] > xp:
            next_level = lvl
            break
    return {
        "level": result["level"],
        "title": result["title"],
        "stage": result["stage"],
        "currentXP": xp,
        "levelMinXP": result["min_xp"],
        "nextLevelXP": next_level["min_xp"] if next_level else None,
        "nextLevelTitle": next_level["title"] if next_level else None,
        "xpToNextLevel": (next_level["min_xp"] - xp) if next_level else 0,
        "prevLevelTitle": prev_level["title"] if prev_level else None,
        "allLevels": [{"level": l["level"], "title": l["title"], "min_xp": l["min_xp"], "stage": l["stage"], "reached": xp >= l["min_xp"]} for l in LEVELS]
    }


async def _get_or_create_profile(user_id: str) -> dict:
    profile = await db.user_gamification_profile.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": user_id, "level": "Getting Started", "xp": 0,
            "current_streak": 0, "longest_streak": 0, "max_badges": 0,
            "last_score": 0, "last_survival_days": 0, "last_processed_at": None
        }
        await db.user_gamification_profile.insert_one(profile)
    return profile


async def _unlock_achievement(user_id: str, code: str) -> Optional[dict]:
    if code not in ACHIEVEMENTS:
        return None
    existing = await db.user_achievements.find_one({"user_id": user_id, "achievement_code": code})
    if existing:
        return None
    ach = ACHIEVEMENTS[code]
    doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "achievement_code": code,
        "title": ach["title"], "description": ach["description"],
        "icon": ach["icon"], "category": ach.get("category", "general"),
        "xp_bonus": ach["xp_bonus"], "achieved_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_achievements.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/profile")
async def get_gamification_profile(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    import asyncio
    profile_task = _get_or_create_profile(user_id)
    achievements_task = db.user_achievements.find({"user_id": user_id}, {"_id": 0}).sort("achieved_at", -1).to_list(100)
    challenges_task = db.user_challenges.find({"user_id": user_id, "is_completed": False}, {"_id": 0}).to_list(20)

    profile, achievements, active_challenges = await asyncio.gather(profile_task, achievements_task, challenges_task)
    level_info = _get_level(profile.get("xp", 0))

    current_badge_count = len(achievements)
    max_badges = max(profile.get("max_badges", 0), current_badge_count)
    if max_badges > profile.get("max_badges", 0):
        await db.user_gamification_profile.update_one({"user_id": user_id}, {"$set": {"max_badges": max_badges}})

    # Build achievement lookup set for O(1) checks
    achieved_codes = {a["achievement_code"] for a in achievements}

    return {
        **level_info,
        "streak": profile.get("current_streak", 0),
        "longestStreak": profile.get("longest_streak", 0),
        "lastScore": profile.get("last_score", 0),
        "lastSurvivalDays": profile.get("last_survival_days", 0),
        "lastProcessedAt": profile.get("last_processed_at"),
        "achievements": achievements,
        "achievementCount": current_badge_count,
        "maxBadgesUnlocked": max_badges,
        "totalAchievements": len(ACHIEVEMENTS),
        "activeChallenges": active_challenges,
        "xpRules": XP_RULES,
        "allAchievements": [
            {
                "code": code, **info,
                "unlocked": code in achieved_codes,
                "achieved_at": next((a["achieved_at"] for a in achievements if a["achievement_code"] == code), None)
            }
            for code, info in ACHIEVEMENTS.items()
        ]
    }


@router.post("/process")
async def process_gamification(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    user_filter = get_user_filter(user)
    profile = await _get_or_create_profile(user_id)

    from routes.intelligence import (
        _get_liquid_funds, _get_monthly_mandatory_expense,
        _get_monthly_income, _get_monthly_discretionary_spending, _get_total_emi
    )

    effective_funds = await _get_liquid_funds(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)

    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0
    # Only count survival days if user has real financial data (both funds AND expenses)
    has_real_data = effective_funds > 0 and monthly_mandatory > 0

    # Calculate score
    savings_ratio = max((monthly_income - monthly_discretionary - monthly_mandatory) / monthly_income, 0) if monthly_income > 0 else 0
    emi_ratio = total_emi / monthly_income if monthly_income > 0 else 1.0
    buffer_months = survival_days / 30

    savings_score = 25 if savings_ratio > 0.30 else (20 if savings_ratio > 0.20 else (15 if savings_ratio > 0.10 else (10 if savings_ratio > 0 else 5)))
    emi_score = 25 if emi_ratio < 0.25 else (18 if emi_ratio < 0.40 else (10 if emi_ratio < 0.60 else 5))
    buffer_score = 25 if buffer_months > 6 else (18 if buffer_months > 3 else (10 if buffer_months > 1 else 5))
    consistency_score = 25
    score = savings_score + emi_score + buffer_score + consistency_score

    last_survival = profile.get("last_survival_days", 0)
    xp_earned = 0
    xp_breakdown = []

    if score > 85:
        xp_earned += 40
        xp_breakdown.append({"reason": "Excellent score (>85)", "xp": 40})
    elif score > 70:
        xp_earned += 20
        xp_breakdown.append({"reason": "Good score (>70)", "xp": 20})

    if survival_days > last_survival and last_survival > 0:
        xp_earned += 25
        xp_breakdown.append({"reason": "Emergency runway increased", "xp": 25})

    total_debt = sum(l.get("outstandingAmount", 0) for l in await db.loans.find(user_filter, {"_id": 0, "outstandingAmount": 1}).to_list(1000))
    last_snapshot = await db.user_financial_snapshots.find_one({"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)])
    if last_snapshot and total_debt < last_snapshot.get("total_debt", total_debt):
        xp_earned += 30
        xp_breakdown.append({"reason": "Debt reduced", "xp": 30})

    high_alerts = await db.alerts.count_documents({
        "userId": user_id, "severity": "HIGH",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    if high_alerts == 0:
        xp_earned += 15
        xp_breakdown.append({"reason": "No critical alerts", "xp": 15})

    current_streak = profile.get("current_streak", 0)
    longest_streak = profile.get("longest_streak", 0)
    if score >= 70 and high_alerts == 0:
        current_streak += 1
    else:
        current_streak = 0
    longest_streak = max(longest_streak, current_streak)

    for weeks, bonus in STREAK_REWARDS.items():
        if current_streak == weeks:
            xp_earned += bonus
            xp_breakdown.append({"reason": f"{weeks}-week streak bonus", "xp": bonus})

    new_xp = profile.get("xp", 0) + xp_earned
    old_level_info = _get_level(profile.get("xp", 0))
    pre_badge_level = _get_level(new_xp)

    # Check domain achievements
    investments = await db.investments.find(user_filter, {"_id": 0, "name": 1}).to_list(1000)
    inv_names = [i.get("name", "").lower() for i in investments]
    sip_count = sum(1 for n in inv_names if re.search(r'fund|sip|mutual', n))
    total_emi = total_emi

    new_achievements = []
    savings_rate_pct = savings_ratio * 100
    inv_count = len(investments)

    checks = {
        # Survival & Liquidity — require actual financial data
        "FIRST_STEP": monthly_income > 0 or monthly_mandatory > 0 or effective_funds > 0,
        "BUFFER_7D": has_real_data and survival_days >= 7,
        "BUFFER_14D": has_real_data and survival_days >= 14,
        "BUFFER_30D": has_real_data and survival_days >= 30,
        "BUFFER_60D": has_real_data and survival_days >= 60,
        "BUFFER_90D": has_real_data and survival_days >= 90,
        "BUFFER_120D": has_real_data and survival_days >= 120,
        "BUFFER_180D": has_real_data and survival_days >= 180,
        "BUFFER_270D": has_real_data and survival_days >= 270,
        "BUFFER_365D": has_real_data and survival_days >= 365,
        "BUFFER_500D": has_real_data and survival_days >= 500,
        "BUFFER_730D": has_real_data and survival_days >= 730,
        "LIQUIDITY_BUILDER": has_real_data and survival_days >= 90,
        "EMERGENCY_STARTER": effective_funds >= 5000,
        "EMERGENCY_PRO": has_real_data and survival_days >= 90,
        "EMERGENCY_MASTER": has_real_data and survival_days >= 180,
        "SURVIVAL_STRATEGIST": has_real_data and survival_days >= 110,
        "FINANCIAL_FORTRESS": has_real_data and survival_days >= 366,
        # Score
        "SCORE_60": score >= 60,
        "SCORE_70": score >= 70,
        "SCORE_75": score >= 75,
        "SCORE_80": score >= 80,
        "SCORE_85": score >= 85,
        "SCORE_90": score >= 90,
        "SCORE_95": score >= 95,
        "SCORE_100": score >= 100,
        # Behavior
        "ALERT_FREE_WEEK": high_alerts == 0,
        "SMART_SPENDER": monthly_income > 0 and (monthly_discretionary / monthly_income) < 0.20,
        "EMI_PROTECTOR": emi_ratio < 0.30,
        # Savings
        "SAVED_10K": effective_funds >= 10000,
        "SAVED_50K": effective_funds >= 50000,
        "SAVED_1L": effective_funds >= 100000,
        "SAVED_5L": effective_funds >= 500000,
        "SAVINGS_RATE_20": savings_rate_pct >= 20,
        "SAVINGS_RATE_30": savings_rate_pct >= 30,
        "SAVINGS_RATE_40": savings_rate_pct >= 40,
        # Debt — require actual loan/debt history
        "FREEDOM_BUILDER": total_debt == 0 and await db.loans.count_documents(user_filter) > 0,
        "DEBT_FREE_STARTER": monthly_income > 0 and emi_ratio < 0.20 and total_emi > 0,
        "ZERO_EMI_MONTH": total_emi == 0 and await db.loans.count_documents(user_filter) > 0,
        # Investment
        "FIRST_SIP": sip_count >= 1,
        "DIVERSIFIED_PORTFOLIO": inv_count >= 5,
        "EQUITY_EXPLORER": any(re.search(r'stock|equity|share', n) for n in inv_names),
        # Streak
        "STREAK_2W": current_streak >= 2,
        "STREAK_4W": current_streak >= 4,
        "STREAK_8W": current_streak >= 8,
        "STREAK_12W": current_streak >= 12,
        "STREAK_24W": current_streak >= 24,
        "STREAK_52W": current_streak >= 52,
        "CONSISTENCY_KING": longest_streak >= 8,
        # Elite
        "FINANCIAL_CLIMBER": pre_badge_level["level"] >= 5,
        "STABILITY_ARCHITECT": pre_badge_level["level"] >= 10,
        "CONTROL_MASTER": score >= 80 and survival_days >= 180,
        "WEALTH_WARRIOR": pre_badge_level["level"] >= 15,
        "INDEPENDENCE_ACHIEVED": survival_days >= 541,
        "FINANCIAL_SOVEREIGN": survival_days >= 1001,
    }

    for code, condition in checks.items():
        if condition:
            result = await _unlock_achievement(user_id, code)
            if result:
                new_achievements.append(result)
                new_xp += result.get("xp_bonus", 0)
                xp_breakdown.append({"reason": f"Badge: {result['title']}", "xp": result["xp_bonus"]})

    new_level_info = _get_level(new_xp)
    leveled_up = new_level_info["level"] > old_level_info["level"]

    current_achievements = await db.user_achievements.count_documents({"user_id": user_id})
    max_badges = max(profile.get("max_badges", 0), current_achievements)

    await db.user_gamification_profile.update_one(
        {"user_id": user_id},
        {"$set": {
            "xp": new_xp, "level": new_level_info["title"],
            "current_streak": current_streak, "longest_streak": longest_streak,
            "max_badges": max_badges, "last_score": score,
            "last_survival_days": survival_days,
            "last_processed_at": datetime.now(timezone.utc).isoformat()
        }}, upsert=True
    )

    await db.user_financial_snapshots.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id,
        "control_score": score, "survival_days": survival_days,
        "liquid_funds": effective_funds, "total_debt": total_debt,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_mandatory + monthly_discretionary,
        "xp_earned": xp_earned, "streak": current_streak,
        "badges_count": current_achievements,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Notifications
    if leveled_up:
        await create_notification_and_cleanup({
            "id": str(uuid.uuid4()), "userId": user_id,
            "title": f"Level Up! {new_level_info['title']}",
            "message": f"You've reached Level {new_level_info['level']} - {new_level_info['title']}!",
            "type": "gamification", "isRead": False,
            "badgeIcon": "star", "actionUrl": "/health",
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
    for ach in new_achievements:
        await create_notification_and_cleanup({
            "id": str(uuid.uuid4()), "userId": user_id,
            "title": f"Badge Unlocked: {ach['title']}",
            "message": ach["description"], "type": "achievement",
            "isRead": False,
            "badgeIcon": ach.get("icon", "trophy"), "actionUrl": "/health",
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
    if current_streak in STREAK_REWARDS:
        await create_notification_and_cleanup({
            "id": str(uuid.uuid4()), "userId": user_id,
            "title": f"Streak: {current_streak} Weeks!",
            "message": f"+{STREAK_REWARDS[current_streak]} bonus XP!",
            "type": "streak", "isRead": False,
            "badgeIcon": "flame", "actionUrl": "/health",
            "createdAt": datetime.now(timezone.utc).isoformat()
        })

    return {
        "xpEarned": xp_earned, "totalXP": new_xp, "xpBreakdown": xp_breakdown,
        "leveledUp": leveled_up, "newLevel": _get_level(new_xp),
        "streak": current_streak, "longestStreak": longest_streak,
        "score": score, "survivalDays": survival_days,
        "newAchievements": new_achievements
    }


@router.get("/challenges")
async def get_challenges(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")
    import asyncio
    active, completed = await asyncio.gather(
        db.user_challenges.find({"user_id": user_id, "is_completed": False}, {"_id": 0}).to_list(50),
        db.user_challenges.find({"user_id": user_id, "is_completed": True}, {"_id": 0}).to_list(50),
    )
    active_codes = {c["challenge_code"] for c in active}
    # Add explainer to active challenges too
    for c in active:
        c["explainer"] = _get_explainer(c.get("challenge_code", ""))
    available = [{**c, "explainer": _get_explainer(c["code"])} for c in CHALLENGES if c["code"] not in active_codes]
    return {"active": active, "available": available, "completed": completed}


def _get_explainer(code):
    return {
        "RUNWAY_BOOST_30": "Your emergency runway shows how long you can manage without income. Grow it by putting more into savings or cutting fixed costs.",
        "DEBT_SPRINT_60": "Focus on prepaying EMIs or closing small loans. Even ₹5K extra per month makes a big difference over 60 days.",
        "BUDGET_DISCIPLINE_30": "Track your variable spending (dining, shopping, entertainment). Keep it at or below current levels to prove discipline.",
        "SCORE_UP_30": "Your Financial Score has 4 pillars: Savings Rate, EMI Load, Safety Buffer, Income Consistency. Improve any to boost your score.",
        "ZERO_ALERTS_14": "Keep your finances healthy for 2 weeks. Ensure EMIs are covered, spending is steady, and liquidity is maintained.",
        "SAVINGS_SPRINT_30": "Move money to savings, cut non-essential expenses, or earn extra income. Grow your accessible savings by 15%.",
    }.get(code, "Complete this challenge to earn bonus XP!")


@router.post("/challenges/{challenge_code}/join")
async def join_challenge(challenge_code: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")
    challenge = next((c for c in CHALLENGES if c["code"] == challenge_code), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    existing = await db.user_challenges.find_one({"user_id": user_id, "challenge_code": challenge_code, "is_completed": False})
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    today = datetime.now(timezone.utc).date()
    doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "challenge_code": challenge_code,
        "title": challenge["title"], "description": challenge["description"],
        "start_date": today.isoformat(),
        "end_date": (today + timedelta(days=challenge["duration_days"])).isoformat(),
        "duration_days": challenge["duration_days"], "progress": 0,
        "target_pct": challenge["target_pct"], "xp_reward": challenge["xp_reward"],
        "difficulty": challenge.get("difficulty", "Medium"), "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_challenges.insert_one(doc)
    return {"success": True, "challenge": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/challenges/{challenge_id}/leave")
async def leave_challenge(challenge_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")
    challenge = await db.user_challenges.find_one({"id": challenge_id, "user_id": user_id, "is_completed": False})
    if not challenge:
        raise HTTPException(status_code=404, detail="Active challenge not found")
    await db.user_challenges.delete_one({"id": challenge_id, "user_id": user_id})
    return {"success": True, "message": "Challenge abandoned"}


@router.get("/share-card")
async def get_share_card(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")
    profile = await _get_or_create_profile(user_id)
    level_info = _get_level(profile.get("xp", 0))
    achievements = await db.user_achievements.count_documents({"user_id": user_id})

    # Compute live survival data from intelligence
    try:
        from routes.intelligence import _get_fund_breakdown, _get_monthly_mandatory_expense, _get_runway_level, get_user_filter
        user_filter = get_user_filter(user)
        fund_breakdown = await _get_fund_breakdown(user_filter)
        monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
        effective_funds = fund_breakdown["effectiveTotal"]
        daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
        survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0
        if monthly_mandatory == 0 and effective_funds == 0:
            survival_days = 0
        runway_level = _get_runway_level(survival_days)
    except Exception:
        survival_days = profile.get("last_survival_days", 0)
        runway_level = {"name": "Getting Started", "stage": 0, "phase_num": 1}

    # Compute live control score
    try:
        from routes.intelligence import _calculate_control_score
        score_data = await _calculate_control_score(user_filter)
        control_score = score_data.get("totalScore", 0)
    except Exception:
        try:
            incomes = await db.income_sources.find({"userId": user_id}, {"_id": 0}).to_list(500)
            expenses = await db.expenses.find({"userId": user_id}, {"_id": 0}).to_list(500)
            monthly_income = sum(i.get("expectedAmount", 0) for i in incomes)
            monthly_expense = sum(e.get("normalizedMonthly", e.get("amount", 0)) for e in expenses)
            savings_rate = ((monthly_income - monthly_expense) / monthly_income * 100) if monthly_income > 0 else 0
            loans = await db.loans.find({"userId": user_id}, {"_id": 0}).to_list(100)
            total_emi = sum(l.get("emiAmount", 0) for l in loans)
            emi_pct = (total_emi / monthly_income * 100) if monthly_income > 0 else 0
            s1 = min(25, savings_rate * 0.5) if savings_rate > 0 else 0
            s2 = max(0, 25 - emi_pct * 0.5) if monthly_income > 0 else 25
            buffer_months = survival_days / 30
            s3 = min(25, buffer_months * 4)
            s4 = min(25, len(incomes) * 8.33) if len(incomes) > 0 else 0
            control_score = round(s1 + s2 + s3 + s4)
        except Exception:
            control_score = profile.get("last_score", 0)

    return {
        "name": user.get("name", "User"), "level": runway_level.get("level", level_info["title"]),
        "levelNumber": runway_level.get("stage", level_info["level"]),
        "phaseNum": runway_level.get("phase_num", 1),
        "xp": profile.get("xp", 0),
        "survivalDays": survival_days,
        "controlScore": control_score,
        "streak": profile.get("current_streak", 0),
        "achievements": achievements,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/leaderboard")
async def get_leaderboard(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    profiles = await db.user_gamification_profile.find(
        {}, {"_id": 0, "user_id": 1, "xp": 1, "level": 1, "current_streak": 1}
    ).sort("xp", -1).limit(20).to_list(20)
    return {"leaderboard": [
        {"rank": i + 1, "level": p.get("level", "Getting Started"), "xp": p.get("xp", 0),
         "streak": p.get("current_streak", 0), "isYou": p.get("user_id") == user.get("user_id")}
        for i, p in enumerate(profiles)
    ]}

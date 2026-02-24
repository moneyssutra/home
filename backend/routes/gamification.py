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

# Gender-friendly achievements
ACHIEVEMENTS = {
    # Starter
    "FIRST_STEPS": {"title": "First Steps", "description": "Checked your Financial Score for the first time", "icon": "rocket", "xp_bonus": 10, "category": "starter"},
    "ALERT_FREE": {"title": "Alert-Free Champion", "description": "Zero critical alerts this week", "icon": "check-circle", "xp_bonus": 15, "category": "behavior"},
    # Emergency Runway
    "SAFETY_1M": {"title": "Safety Net Starter", "description": "1 month of emergency runway built", "icon": "shield", "xp_bonus": 20, "category": "emergency"},
    "SAFETY_3M": {"title": "3-Month Shield", "description": "3 months of emergency backup ready", "icon": "shield-check", "xp_bonus": 50, "category": "emergency"},
    "SAFETY_6M": {"title": "6-Month Fortress", "description": "Half a year of financial safety!", "icon": "castle", "xp_bonus": 100, "category": "emergency"},
    "SAFETY_1Y": {"title": "Year-Long Safety Net", "description": "Full year of emergency funds. Incredible!", "icon": "crown", "xp_bonus": 200, "category": "emergency"},
    # Score milestones
    "SCORE_60": {"title": "Score Rising", "description": "Financial Score reached 60+", "icon": "gauge", "xp_bonus": 25, "category": "score"},
    "SCORE_80": {"title": "Score Champion", "description": "Financial Score crossed 80!", "icon": "target", "xp_bonus": 50, "category": "score"},
    "SCORE_90": {"title": "Score Legend", "description": "Financial Score above 90 - elite!", "icon": "award", "xp_bonus": 100, "category": "score"},
    # Streak
    "STREAK_4W": {"title": "4-Week Streak Pro", "description": "Maintained 4 consecutive good weeks", "icon": "flame", "xp_bonus": 50, "category": "streak"},
    "STREAK_12W": {"title": "12-Week Streak Pro", "description": "3 months of financial discipline!", "icon": "trophy", "xp_bonus": 150, "category": "streak"},
    "STREAK_24W": {"title": "24-Week Streak Legend", "description": "Half a year of consistency!", "icon": "medal", "xp_bonus": 300, "category": "streak"},
    # Domain - Insurance
    "INSURANCE_GUARDIAN": {"title": "Insurance Guardian", "description": "3+ insurance policies protecting you", "icon": "heart-pulse", "xp_bonus": 40, "category": "insurance"},
    # Domain - Emergency
    "EMERGENCY_PRO": {"title": "Safety Net Pro", "description": "Emergency fund covers 3+ months of expenses", "icon": "life-buoy", "xp_bonus": 60, "category": "emergency"},
    # Domain - Investment
    "DIVERSIFIED_PRO": {"title": "Diversified Pro", "description": "5+ different types of investments", "icon": "pie-chart", "xp_bonus": 50, "category": "investment"},
    "FD_LEGEND": {"title": "FD Legend", "description": "3+ Fixed Deposits growing your wealth", "icon": "lock", "xp_bonus": 35, "category": "investment"},
    "SIP_STAR": {"title": "SIP Star", "description": "3+ SIP/Mutual Fund investments active", "icon": "bar-chart-3", "xp_bonus": 40, "category": "investment"},
    # Domain - Budget & Goals
    "BUDGET_CHAMPION": {"title": "Budget Champion", "description": "All major expense categories tracked", "icon": "list-checks", "xp_bonus": 30, "category": "behavior"},
    "GOAL_CHAMPION": {"title": "Goal Champion", "description": "3+ financial goals set and tracked", "icon": "flag", "xp_bonus": 25, "category": "goals"},
    # Domain - Income
    "MULTI_INCOME_PRO": {"title": "Multi-Income Pro", "description": "3+ income sources - smart diversification!", "icon": "git-branch", "xp_bonus": 40, "category": "income"},
    # Domain - Debt
    "DEBT_CONQUEROR": {"title": "Debt Conqueror", "description": "Reduced debt for 3 consecutive months", "icon": "trending-down", "xp_bonus": 100, "category": "debt"},
    "ZERO_DEBT_LEGEND": {"title": "Zero Debt Legend", "description": "Completely debt-free!", "icon": "circle-check-big", "xp_bonus": 200, "category": "debt"},
    # Domain - Savings
    "SAVINGS_HERO": {"title": "Savings Hero", "description": "Savings rate above 30% of income", "icon": "piggy-bank", "xp_bonus": 45, "category": "savings"},
    "EMI_CLOSER": {"title": "EMI Closer", "description": "Closed/paid off a loan completely", "icon": "x-circle", "xp_bonus": 80, "category": "debt"},
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
    return doc


@router.get("/profile")
async def get_gamification_profile(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    profile = await _get_or_create_profile(user_id)
    level_info = _get_level(profile.get("xp", 0))

    achievements = await db.user_achievements.find({"user_id": user_id}, {"_id": 0}).sort("achieved_at", -1).to_list(100)
    active_challenges = await db.user_challenges.find({"user_id": user_id, "is_completed": False}, {"_id": 0}).to_list(20)

    current_badge_count = len(achievements)
    max_badges = max(profile.get("max_badges", 0), current_badge_count)
    if max_badges > profile.get("max_badges", 0):
        await db.user_gamification_profile.update_one({"user_id": user_id}, {"$set": {"max_badges": max_badges}})

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
                "unlocked": any(a["achievement_code"] == code for a in achievements),
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
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 999

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

    # Check domain achievements
    insurance_count = await db.insurances.count_documents(user_filter)
    investments = await db.investments.find(user_filter, {"_id": 0, "name": 1}).to_list(1000)
    inv_names = [i.get("name", "").lower() for i in investments]
    investment_types = await db.investments.distinct("investmentType", user_filter)
    goals_count = await db.goals.count_documents(user_filter)
    income_count = await db.income_sources.count_documents(user_filter)
    expense_cats = await db.expenses.distinct("category", user_filter)
    fd_count = sum(1 for n in inv_names if re.search(r'\bfd\b|fixed deposit', n))
    fd_count += await db.accounts.count_documents({**user_filter, "accountType": {"$in": ["Fixed Deposit", "FD"]}})
    sip_count = sum(1 for n in inv_names if re.search(r'fund|sip|mutual', n))

    new_achievements = []
    checks = {
        "FIRST_STEPS": True,
        "ALERT_FREE": high_alerts == 0,
        "SAFETY_1M": survival_days >= 30,
        "SAFETY_3M": survival_days >= 90,
        "SAFETY_6M": survival_days >= 180,
        "SAFETY_1Y": survival_days >= 365,
        "SCORE_60": score >= 60,
        "SCORE_80": score > 80,
        "SCORE_90": score > 90,
        "STREAK_4W": current_streak >= 4,
        "STREAK_12W": current_streak >= 12,
        "STREAK_24W": current_streak >= 24,
        "INSURANCE_GUARDIAN": insurance_count >= 3,
        "EMERGENCY_PRO": survival_days >= 90,
        "DIVERSIFIED_PRO": len(investment_types) >= 5 or len(set(re.sub(r'[^a-z]', '', n.split()[0]) for n in inv_names if n)) >= 5,
        "FD_LEGEND": fd_count >= 3,
        "SIP_STAR": sip_count >= 3,
        "BUDGET_CHAMPION": len(expense_cats) >= 6,
        "GOAL_CHAMPION": goals_count >= 3,
        "MULTI_INCOME_PRO": income_count >= 3,
        "ZERO_DEBT_LEGEND": total_debt == 0 and await db.loans.count_documents(user_filter) > 0,
        "SAVINGS_HERO": savings_ratio > 0.30,
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
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
    for ach in new_achievements:
        await create_notification_and_cleanup({
            "id": str(uuid.uuid4()), "userId": user_id,
            "title": f"Badge Unlocked: {ach['title']}",
            "message": ach["description"], "type": "achievement",
            "isRead": False, "createdAt": datetime.now(timezone.utc).isoformat()
        })
    if current_streak in STREAK_REWARDS:
        await create_notification_and_cleanup({
            "id": str(uuid.uuid4()), "userId": user_id,
            "title": f"Streak: {current_streak} Weeks!",
            "message": f"+{STREAK_REWARDS[current_streak]} bonus XP!",
            "type": "streak", "isRead": False,
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
    active = await db.user_challenges.find({"user_id": user_id, "is_completed": False}, {"_id": 0}).to_list(50)
    completed = await db.user_challenges.find({"user_id": user_id, "is_completed": True}, {"_id": 0}).to_list(50)
    active_codes = {c["challenge_code"] for c in active}
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
    return {
        "name": user.get("name", "User"), "level": level_info["title"],
        "levelNumber": level_info["level"], "xp": profile.get("xp", 0),
        "survivalDays": profile.get("last_survival_days", 0),
        "controlScore": profile.get("last_score", 0),
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

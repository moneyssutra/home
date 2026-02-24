"""Gamification Engine - XP, Levels, Streaks, Achievements, Challenges."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter, create_notification_and_cleanup

router = APIRouter(prefix="/gamification", tags=["Gamification"])
logger = logging.getLogger(__name__)

# Level thresholds with stage descriptions
LEVELS = [
    {"min_xp": 0, "title": "Survival Mode", "level": 1, "stage": "survival", "description": "Building your financial foundation"},
    {"min_xp": 200, "title": "Stabilizing", "level": 2, "stage": "stabilization", "description": "Getting your finances in order"},
    {"min_xp": 500, "title": "In Control", "level": 3, "stage": "control", "description": "Taking charge of your money"},
    {"min_xp": 1000, "title": "Wealth Builder", "level": 4, "stage": "expansion", "description": "Growing your wealth actively"},
    {"min_xp": 2000, "title": "Financial Commander", "level": 5, "stage": "command", "description": "Mastering financial strategy"},
    {"min_xp": 5000, "title": "Money Master", "level": 6, "stage": "freedom", "description": "Complete financial freedom"},
]

STREAK_REWARDS = {4: 50, 8: 100, 12: 150, 24: 300, 52: 500}

# XP earning rules for display
XP_RULES = [
    {"action": "Weekly score above 70", "xp": "+20 XP", "icon": "target"},
    {"action": "Weekly score above 85", "xp": "+40 XP", "icon": "star"},
    {"action": "Survival days increased", "xp": "+25 XP", "icon": "shield"},
    {"action": "Debt reduced week-over-week", "xp": "+30 XP", "icon": "trending-down"},
    {"action": "No high-risk alerts this week", "xp": "+15 XP", "icon": "check-circle"},
    {"action": "4-week streak bonus", "xp": "+50 XP", "icon": "flame"},
    {"action": "Unlock new achievements", "xp": "+10-300 XP", "icon": "trophy"},
]

ACHIEVEMENTS = {
    # Starter
    "FIRST_SCORE": {"title": "Journey Begins", "description": "Got your first control score", "icon": "rocket", "xp_bonus": 10, "category": "starter"},
    "NO_ALERTS_WEEK": {"title": "Clean Week", "description": "No high-risk alerts this week", "icon": "check-circle", "xp_bonus": 15, "category": "behavior"},
    # Survival milestones
    "SURVIVAL_30": {"title": "30-Day Buffer", "description": "Reached 30 days survival fund", "icon": "shield", "xp_bonus": 20, "category": "survival"},
    "SURVIVAL_90": {"title": "Quarter Guard", "description": "Reached 90 days survival fund", "icon": "shield-check", "xp_bonus": 50, "category": "survival"},
    "SURVIVAL_180": {"title": "Half-Year Fortress", "description": "180 days survival fund", "icon": "castle", "xp_bonus": 100, "category": "survival"},
    "SURVIVAL_365": {"title": "Year of Safety", "description": "Full year of survival funds!", "icon": "crown", "xp_bonus": 200, "category": "survival"},
    # Score milestones
    "CONTROL_60": {"title": "Getting Steady", "description": "Control score reached 60", "icon": "gauge", "xp_bonus": 25, "category": "score"},
    "CONTROL_80": {"title": "Score Master", "description": "Control score above 80", "icon": "target", "xp_bonus": 50, "category": "score"},
    "CONTROL_90": {"title": "Elite Controller", "description": "Control score above 90", "icon": "award", "xp_bonus": 100, "category": "score"},
    # Streak milestones
    "STREAK_4": {"title": "Month Warrior", "description": "4-week winning streak", "icon": "flame", "xp_bonus": 50, "category": "streak"},
    "STREAK_12": {"title": "Quarter Champion", "description": "12-week winning streak", "icon": "trophy", "xp_bonus": 150, "category": "streak"},
    "STREAK_24": {"title": "Half-Year Hero", "description": "24-week winning streak", "icon": "medal", "xp_bonus": 300, "category": "streak"},
    # Domain badges
    "DEBT_REDUCER": {"title": "Debt Crusher", "description": "Reduced debt 3 months in a row", "icon": "trending-down", "xp_bonus": 100, "category": "debt"},
    "INSURANCE_COVERED": {"title": "Fully Insured", "description": "Has 3+ active insurance policies", "icon": "heart-pulse", "xp_bonus": 40, "category": "insurance"},
    "EMERGENCY_FUND": {"title": "Emergency Ready", "description": "Emergency fund covers 3+ months", "icon": "life-buoy", "xp_bonus": 60, "category": "emergency"},
    "DIVERSIFIED": {"title": "Diversified Investor", "description": "5+ different investment types", "icon": "pie-chart", "xp_bonus": 50, "category": "investment"},
    "BUDGET_MASTER": {"title": "Budget Master", "description": "All expense categories tracked", "icon": "list-checks", "xp_bonus": 30, "category": "behavior"},
    "GOAL_SETTER": {"title": "Goal Setter", "description": "Created 3+ financial goals", "icon": "flag", "xp_bonus": 25, "category": "goals"},
    "INCOME_DIVERSIFIED": {"title": "Multiple Streams", "description": "3+ income sources active", "icon": "git-branch", "xp_bonus": 40, "category": "income"},
    "ZERO_DEBT": {"title": "Debt Free", "description": "No outstanding loans", "icon": "circle-check-big", "xp_bonus": 200, "category": "debt"},
}

CHALLENGES = [
    {"code": "SURVIVAL_BOOST_30", "title": "30-Day Survival Boost", "description": "Increase your survival days by 20% within 30 days. Build your emergency buffer!", "target_metric": "survival_days", "target_pct": 20, "duration_days": 30, "xp_reward": 100, "difficulty": "Medium"},
    {"code": "DEBT_SPRINT_60", "title": "Debt Sprint 60", "description": "Reduce your total outstanding debt by 10% in 60 days. Every rupee counts!", "target_metric": "total_debt", "target_pct": -10, "duration_days": 60, "xp_reward": 150, "difficulty": "Hard"},
    {"code": "NO_LIFESTYLE_INFLATION_30", "title": "No Lifestyle Inflation", "description": "Keep your discretionary spending flat (or lower) for 30 days. Prove discipline!", "target_metric": "discretionary", "target_pct": 0, "duration_days": 30, "xp_reward": 80, "difficulty": "Easy"},
    {"code": "SCORE_UP_30", "title": "Score Climber", "description": "Improve your Financial Control Score by 10+ points in 30 days.", "target_metric": "control_score", "target_pct": 10, "duration_days": 30, "xp_reward": 120, "difficulty": "Medium"},
    {"code": "ZERO_ALERTS_14", "title": "Alert-Free Fortnight", "description": "Go 14 days without any HIGH severity alerts. Stay in the green!", "target_metric": "alerts", "target_pct": 0, "duration_days": 14, "xp_reward": 60, "difficulty": "Easy"},
    {"code": "SAVINGS_BOOST_30", "title": "Savings Sprint", "description": "Increase your liquid savings by 15% in 30 days.", "target_metric": "liquid_funds", "target_pct": 15, "duration_days": 30, "xp_reward": 110, "difficulty": "Medium"},
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
        "description": result["description"],
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
            "user_id": user_id,
            "level": "Survival Mode",
            "xp": 0,
            "current_streak": 0,
            "longest_streak": 0,
            "max_badges": 0,
            "last_score": 0,
            "last_survival_days": 0,
            "last_processed_at": None
        }
        await db.user_gamification_profile.insert_one(profile)
    return profile


async def _unlock_achievement(user_id: str, code: str) -> Optional[dict]:
    if code not in ACHIEVEMENTS:
        return None
    existing = await db.user_achievements.find_one({"user_id": user_id, "achievement_code": code})
    if existing:
        return None
    achievement = ACHIEVEMENTS[code]
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "achievement_code": code,
        "title": achievement["title"],
        "description": achievement["description"],
        "icon": achievement["icon"],
        "category": achievement.get("category", "general"),
        "xp_bonus": achievement["xp_bonus"],
        "achieved_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_achievements.insert_one(doc)
    return doc


@router.get("/profile")
async def get_gamification_profile(request: Request):
    """Get user's gamification profile with level, XP, streak, achievements."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    profile = await _get_or_create_profile(user_id)
    level_info = _get_level(profile.get("xp", 0))

    achievements = await db.user_achievements.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("achieved_at", -1).to_list(100)

    active_challenges = await db.user_challenges.find(
        {"user_id": user_id, "is_completed": False}, {"_id": 0}
    ).to_list(20)

    current_badge_count = len(achievements)
    max_badges = max(profile.get("max_badges", 0), current_badge_count)
    if max_badges > profile.get("max_badges", 0):
        await db.user_gamification_profile.update_one(
            {"user_id": user_id}, {"$set": {"max_badges": max_badges}}
        )

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
                "code": code,
                **info,
                "unlocked": any(a["achievement_code"] == code for a in achievements),
                "achieved_at": next((a["achieved_at"] for a in achievements if a["achievement_code"] == code), None)
            }
            for code, info in ACHIEVEMENTS.items()
        ]
    }


@router.post("/process")
async def process_gamification(request: Request):
    """Process weekly gamification: calculate XP, check achievements, update streaks."""
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

    liquid_funds = await _get_liquid_funds(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)

    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(liquid_funds / daily_expense) if daily_expense > 0 else 999

    weekly_income = monthly_income / 4.33
    weekly_discretionary = monthly_discretionary / 4.33
    cash_ratio = (weekly_income - weekly_discretionary) / weekly_income if weekly_income > 0 else 0
    debt_ratio = total_emi / monthly_income if monthly_income > 0 else 1.0

    cash_score = 25 if cash_ratio > 0.40 else (18 if cash_ratio > 0.25 else (10 if cash_ratio > 0.10 else 5))
    debt_score = 25 if debt_ratio < 0.25 else (18 if debt_ratio < 0.40 else (10 if debt_ratio < 0.60 else 5))
    liquidity_score = 25 if survival_days > 180 else (18 if survival_days > 90 else (10 if survival_days > 30 else 5))
    stability_score = 25
    score = cash_score + debt_score + liquidity_score + stability_score

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
        xp_breakdown.append({"reason": "Survival days increased", "xp": 25})

    total_debt = sum(l.get("outstandingAmount", 0) for l in await db.loans.find(user_filter, {"_id": 0, "outstandingAmount": 1}).to_list(1000))
    last_snapshot = await db.user_financial_snapshots.find_one(
        {"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if last_snapshot and total_debt < last_snapshot.get("total_debt", total_debt):
        xp_earned += 30
        xp_breakdown.append({"reason": "Debt reduced", "xp": 30})

    high_alerts = await db.alerts.count_documents({
        "userId": user_id, "severity": "HIGH",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    if high_alerts == 0:
        xp_earned += 15
        xp_breakdown.append({"reason": "No high-risk alerts", "xp": 15})

    current_streak = profile.get("current_streak", 0)
    longest_streak = profile.get("longest_streak", 0)
    if score >= 70 and high_alerts == 0:
        current_streak += 1
    else:
        current_streak = 0

    if current_streak > longest_streak:
        longest_streak = current_streak

    for weeks, bonus in STREAK_REWARDS.items():
        if current_streak == weeks:
            xp_earned += bonus
            xp_breakdown.append({"reason": f"{weeks}-week streak bonus", "xp": bonus})

    new_xp = profile.get("xp", 0) + xp_earned
    new_level_info = _get_level(new_xp)
    old_level_info = _get_level(profile.get("xp", 0))
    leveled_up = new_level_info["level"] > old_level_info["level"]

    # Check domain-specific achievements
    insurance_count = await db.insurances.count_documents(user_filter)
    investment_types = await db.investments.distinct("investmentType", user_filter)
    goals_count = await db.goals.count_documents(user_filter)
    income_count = await db.income_sources.count_documents(user_filter)
    expense_cats = await db.expenses.distinct("category", user_filter)

    new_achievements = []
    achievement_checks = {
        "FIRST_SCORE": True,
        "SURVIVAL_30": survival_days >= 30,
        "SURVIVAL_90": survival_days >= 90,
        "SURVIVAL_180": survival_days >= 180,
        "SURVIVAL_365": survival_days >= 365,
        "CONTROL_60": score >= 60,
        "CONTROL_80": score > 80,
        "CONTROL_90": score > 90,
        "STREAK_4": current_streak >= 4,
        "STREAK_12": current_streak >= 12,
        "STREAK_24": current_streak >= 24,
        "NO_ALERTS_WEEK": high_alerts == 0,
        "INSURANCE_COVERED": insurance_count >= 3,
        "EMERGENCY_FUND": survival_days >= 90,
        "DIVERSIFIED": len(investment_types) >= 5,
        "BUDGET_MASTER": len(expense_cats) >= 6,
        "GOAL_SETTER": goals_count >= 3,
        "INCOME_DIVERSIFIED": income_count >= 3,
        "ZERO_DEBT": total_debt == 0 and await db.loans.count_documents(user_filter) > 0,
    }

    for code, condition in achievement_checks.items():
        if condition:
            result = await _unlock_achievement(user_id, code)
            if result:
                new_achievements.append(result)
                new_xp += result.get("xp_bonus", 0)
                xp_breakdown.append({"reason": f"Achievement: {result['title']}", "xp": result["xp_bonus"]})

    # Update max badges
    current_achievements = await db.user_achievements.count_documents({"user_id": user_id})
    max_badges = max(profile.get("max_badges", 0), current_achievements)

    await db.user_gamification_profile.update_one(
        {"user_id": user_id},
        {"$set": {
            "xp": new_xp,
            "level": _get_level(new_xp)["title"],
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "max_badges": max_badges,
            "last_score": score,
            "last_survival_days": survival_days,
            "last_processed_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    snapshot = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "control_score": score,
        "survival_days": survival_days,
        "liquid_funds": liquid_funds,
        "total_debt": total_debt,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_mandatory + monthly_discretionary,
        "xp_earned": xp_earned,
        "streak": current_streak,
        "badges_count": current_achievements,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_financial_snapshots.insert_one(snapshot)

    # Notifications
    if leveled_up:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "title": f"Level Up! {new_level_info['title']}",
            "message": f"You've reached Level {new_level_info['level']} - {new_level_info['title']}!",
            "type": "gamification",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await create_notification_and_cleanup(notification)

    for ach in new_achievements:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "title": f"Badge Unlocked: {ach['title']}",
            "message": ach["description"],
            "type": "achievement",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await create_notification_and_cleanup(notification)

    if current_streak in STREAK_REWARDS:
        notification = {
            "id": str(uuid.uuid4()),
            "userId": user_id,
            "title": f"Streak Milestone: {current_streak} Weeks!",
            "message": f"You earned +{STREAK_REWARDS[current_streak]} bonus XP for your {current_streak}-week streak!",
            "type": "streak",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await create_notification_and_cleanup(notification)

    return {
        "xpEarned": xp_earned,
        "totalXP": new_xp,
        "xpBreakdown": xp_breakdown,
        "leveledUp": leveled_up,
        "newLevel": _get_level(new_xp),
        "streak": current_streak,
        "longestStreak": longest_streak,
        "score": score,
        "survivalDays": survival_days,
        "newAchievements": new_achievements
    }


@router.get("/challenges")
async def get_challenges(request: Request):
    """Get available and active challenges with details."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    active = await db.user_challenges.find({"user_id": user_id, "is_completed": False}, {"_id": 0}).to_list(50)
    completed = await db.user_challenges.find({"user_id": user_id, "is_completed": True}, {"_id": 0}).to_list(50)
    active_codes = {c["challenge_code"] for c in active}

    available = []
    for c in CHALLENGES:
        if c["code"] not in active_codes:
            available.append({**c, "explainer": _get_challenge_explainer(c["code"])})

    return {
        "active": active,
        "available": available,
        "completed": completed
    }


def _get_challenge_explainer(code: str) -> str:
    explainers = {
        "SURVIVAL_BOOST_30": "Your survival days show how long you can last without income. This challenge pushes you to grow that buffer by saving more or reducing mandatory expenses.",
        "DEBT_SPRINT_60": "Focus on paying down loans aggressively. Prepay EMIs, close small loans first, or consolidate to reduce your total debt load.",
        "NO_LIFESTYLE_INFLATION_30": "Track your variable spending (dining, shopping, entertainment) and keep it at or below your current level. Build discipline!",
        "SCORE_UP_30": "Your Financial Control Score measures overall health. Improve it by reducing debt ratio, increasing savings, or maintaining consistency.",
        "ZERO_ALERTS_14": "Avoid high-severity alerts for 2 weeks. This means keeping your EMIs covered, spending in check, and liquidity healthy.",
        "SAVINGS_BOOST_30": "Grow your liquid savings (bank + liquid investments) by 15%. Automate transfers, cut unnecessary expenses, or boost income.",
    }
    return explainers.get(code, "Complete this challenge to earn bonus XP and prove your financial discipline!")


@router.post("/challenges/{challenge_code}/join")
async def join_challenge(challenge_code: str, request: Request):
    """Join a challenge."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    challenge = next((c for c in CHALLENGES if c["code"] == challenge_code), None)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    existing = await db.user_challenges.find_one({"user_id": user_id, "challenge_code": challenge_code, "is_completed": False})
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this challenge")

    today = datetime.now(timezone.utc).date()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "challenge_code": challenge_code,
        "title": challenge["title"],
        "description": challenge["description"],
        "start_date": today.isoformat(),
        "end_date": (today + timedelta(days=challenge["duration_days"])).isoformat(),
        "duration_days": challenge["duration_days"],
        "progress": 0,
        "baseline_value": 0,
        "target_pct": challenge["target_pct"],
        "xp_reward": challenge["xp_reward"],
        "difficulty": challenge.get("difficulty", "Medium"),
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_challenges.insert_one(doc)
    return {"success": True, "challenge": {k: v for k, v in doc.items() if k != "_id"}}


@router.delete("/challenges/{challenge_id}/leave")
async def leave_challenge(challenge_id: str, request: Request):
    """Leave/undo an active challenge."""
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
    """Get shareable card data."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    profile = await _get_or_create_profile(user_id)
    level_info = _get_level(profile.get("xp", 0))
    achievements = await db.user_achievements.count_documents({"user_id": user_id})

    return {
        "name": user.get("name", "User"),
        "level": level_info["title"],
        "levelNumber": level_info["level"],
        "xp": profile.get("xp", 0),
        "survivalDays": profile.get("last_survival_days", 0),
        "controlScore": profile.get("last_score", 0),
        "streak": profile.get("current_streak", 0),
        "achievements": achievements,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/leaderboard")
async def get_leaderboard(request: Request):
    """Get XP leaderboard."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    profiles = await db.user_gamification_profile.find(
        {}, {"_id": 0, "user_id": 1, "xp": 1, "level": 1, "current_streak": 1}
    ).sort("xp", -1).limit(20).to_list(20)

    leaderboard = []
    for i, p in enumerate(profiles):
        leaderboard.append({
            "rank": i + 1,
            "level": p.get("level", "Survival Mode"),
            "xp": p.get("xp", 0),
            "streak": p.get("current_streak", 0),
            "isYou": p.get("user_id") == user.get("user_id")
        })

    return {"leaderboard": leaderboard}

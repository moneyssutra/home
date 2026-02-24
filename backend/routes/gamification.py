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

# Level thresholds
LEVELS = [
    {"min_xp": 0, "title": "Survival Mode", "level": 1},
    {"min_xp": 200, "title": "Stabilizing", "level": 2},
    {"min_xp": 500, "title": "In Control", "level": 3},
    {"min_xp": 1000, "title": "Wealth Builder", "level": 4},
    {"min_xp": 2000, "title": "Financial Commander", "level": 5},
    {"min_xp": 5000, "title": "Money Master", "level": 6},
]

STREAK_REWARDS = {4: 50, 8: 100, 12: 150, 24: 300, 52: 500}

ACHIEVEMENTS = {
    "FIRST_SCORE": {"title": "Journey Begins", "description": "Got your first control score", "icon": "rocket", "xp_bonus": 10},
    "NO_ALERTS_WEEK": {"title": "Clean Week", "description": "No high-risk alerts this week", "icon": "check-circle", "xp_bonus": 15},
    "SURVIVAL_30": {"title": "30-Day Buffer", "description": "Reached 30 days survival fund", "icon": "shield", "xp_bonus": 20},
    "SURVIVAL_90": {"title": "Quarter Guard", "description": "Reached 90 days survival fund", "icon": "shield-check", "xp_bonus": 50},
    "CONTROL_80": {"title": "Score Master", "description": "Control score above 80", "icon": "target", "xp_bonus": 50},
    "STREAK_4": {"title": "Month Warrior", "description": "4-week winning streak", "icon": "flame", "xp_bonus": 50},
    "SURVIVAL_180": {"title": "Half-Year Fortress", "description": "Reached 180 days survival fund", "icon": "castle", "xp_bonus": 100},
    "CONTROL_90": {"title": "Elite Controller", "description": "Control score above 90", "icon": "award", "xp_bonus": 100},
    "DEBT_REDUCER": {"title": "Debt Crusher", "description": "Reduced debt 3 months in a row", "icon": "trending-down", "xp_bonus": 100},
    "STREAK_12": {"title": "Quarter Champion", "description": "12-week winning streak", "icon": "trophy", "xp_bonus": 150},
    "SURVIVAL_365": {"title": "Year of Safety", "description": "Full year of survival funds", "icon": "crown", "xp_bonus": 200},
    "STREAK_24": {"title": "Half-Year Hero", "description": "24-week winning streak", "icon": "medal", "xp_bonus": 300},
}

CHALLENGES = [
    {"code": "SURVIVAL_BOOST_30", "title": "30-Day Survival Boost", "description": "Increase survival days by 20%", "target_metric": "survival_days", "target_pct": 20, "duration_days": 30, "xp_reward": 100},
    {"code": "DEBT_SPRINT_60", "title": "Debt Sprint 60", "description": "Reduce total debt by 10%", "target_metric": "total_debt", "target_pct": -10, "duration_days": 60, "xp_reward": 150},
    {"code": "NO_LIFESTYLE_INFLATION_30", "title": "No Lifestyle Inflation", "description": "Keep discretionary spending flat for 30 days", "target_metric": "discretionary", "target_pct": 0, "duration_days": 30, "xp_reward": 80},
    {"code": "SCORE_UP_30", "title": "Score Climber", "description": "Improve control score by 10 points", "target_metric": "control_score", "target_pct": 10, "duration_days": 30, "xp_reward": 120},
]


def _get_level(xp: int) -> dict:
    result = LEVELS[0]
    for lvl in LEVELS:
        if xp >= lvl["min_xp"]:
            result = lvl
    next_level = None
    for lvl in LEVELS:
        if lvl["min_xp"] > xp:
            next_level = lvl
            break
    return {
        "level": result["level"],
        "title": result["title"],
        "currentXP": xp,
        "nextLevelXP": next_level["min_xp"] if next_level else None,
        "nextLevelTitle": next_level["title"] if next_level else None,
        "xpToNextLevel": (next_level["min_xp"] - xp) if next_level else 0
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

    return {
        **level_info,
        "streak": profile.get("current_streak", 0),
        "longestStreak": profile.get("longest_streak", 0),
        "lastScore": profile.get("last_score", 0),
        "lastSurvivalDays": profile.get("last_survival_days", 0),
        "lastProcessedAt": profile.get("last_processed_at"),
        "achievements": achievements,
        "achievementCount": len(achievements),
        "totalAchievements": len(ACHIEVEMENTS),
        "activeChallenges": active_challenges,
        "allAchievements": [
            {
                "code": code,
                **info,
                "unlocked": any(a["achievement_code"] == code for a in achievements)
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

    # Import intelligence helpers
    from routes.intelligence import (
        _get_liquid_funds, _get_monthly_mandatory_expense,
        _get_monthly_income, _get_monthly_discretionary_spending, _get_total_emi
    )

    # Calculate current financial metrics
    liquid_funds = await _get_liquid_funds(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)

    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(liquid_funds / daily_expense) if daily_expense > 0 else 999

    # Calculate control score
    weekly_income = monthly_income / 4.33
    weekly_discretionary = monthly_discretionary / 4.33
    cash_ratio = (weekly_income - weekly_discretionary) / weekly_income if weekly_income > 0 else 0
    debt_ratio = total_emi / monthly_income if monthly_income > 0 else 1.0

    cash_score = 25 if cash_ratio > 0.40 else (18 if cash_ratio > 0.25 else (10 if cash_ratio > 0.10 else 5))
    debt_score = 25 if debt_ratio < 0.25 else (18 if debt_ratio < 0.40 else (10 if debt_ratio < 0.60 else 5))
    liquidity_score = 25 if survival_days > 180 else (18 if survival_days > 90 else (10 if survival_days > 30 else 5))
    stability_score = 25  # Default high for weekly processing
    score = cash_score + debt_score + liquidity_score + stability_score

    last_score = profile.get("last_score", 0)
    last_survival = profile.get("last_survival_days", 0)

    # XP calculation
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

    # Check for debt reduction
    total_debt = sum(l.get("outstandingAmount", 0) for l in await db.loans.find(user_filter, {"_id": 0, "outstandingAmount": 1}).to_list(1000))
    last_snapshot = await db.user_financial_snapshots.find_one(
        {"user_id": user_id}, {"_id": 0}, sort=[("created_at", -1)]
    )
    if last_snapshot and total_debt < last_snapshot.get("total_debt", total_debt):
        xp_earned += 30
        xp_breakdown.append({"reason": "Debt reduced", "xp": 30})

    # Check no high-risk alerts
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    high_alerts = await db.alerts.count_documents({
        "userId": user_id, "severity": "HIGH",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}
    })
    if high_alerts == 0:
        xp_earned += 15
        xp_breakdown.append({"reason": "No high-risk alerts", "xp": 15})

    # Streak logic
    current_streak = profile.get("current_streak", 0)
    longest_streak = profile.get("longest_streak", 0)
    if score >= 70 and high_alerts == 0:
        current_streak += 1
    else:
        current_streak = 0

    if current_streak > longest_streak:
        longest_streak = current_streak

    # Streak rewards
    for weeks, bonus in STREAK_REWARDS.items():
        if current_streak == weeks:
            xp_earned += bonus
            xp_breakdown.append({"reason": f"{weeks}-week streak bonus", "xp": bonus})

    new_xp = profile.get("xp", 0) + xp_earned
    new_level_info = _get_level(new_xp)
    old_level_info = _get_level(profile.get("xp", 0))
    leveled_up = new_level_info["level"] > old_level_info["level"]

    # Check achievements
    new_achievements = []
    achievement_checks = {
        "FIRST_SCORE": True,
        "SURVIVAL_30": survival_days >= 30,
        "SURVIVAL_90": survival_days >= 90,
        "SURVIVAL_180": survival_days >= 180,
        "SURVIVAL_365": survival_days >= 365,
        "CONTROL_80": score > 80,
        "CONTROL_90": score > 90,
        "STREAK_4": current_streak >= 4,
        "STREAK_12": current_streak >= 12,
        "STREAK_24": current_streak >= 24,
        "NO_ALERTS_WEEK": high_alerts == 0,
    }

    for code, condition in achievement_checks.items():
        if condition:
            result = await _unlock_achievement(user_id, code)
            if result:
                new_achievements.append(result)
                new_xp += result.get("xp_bonus", 0)
                xp_breakdown.append({"reason": f"Achievement: {result['title']}", "xp": result["xp_bonus"]})

    # Update profile
    await db.user_gamification_profile.update_one(
        {"user_id": user_id},
        {"$set": {
            "xp": new_xp,
            "level": _get_level(new_xp)["title"],
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_score": score,
            "last_survival_days": survival_days,
            "last_processed_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )

    # Store financial snapshot
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_financial_snapshots.insert_one(snapshot)

    # Send push notification for level up
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
    """Get available and active challenges."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    active = await db.user_challenges.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    active_codes = {c["challenge_code"] for c in active}

    available = [c for c in CHALLENGES if c["code"] not in active_codes]

    return {
        "active": active,
        "available": available,
        "completed": [c for c in active if c.get("is_completed")]
    }


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
        "progress": 0,
        "baseline_value": 0,
        "target_pct": challenge["target_pct"],
        "xp_reward": challenge["xp_reward"],
        "is_completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_challenges.insert_one(doc)
    return {"success": True, "challenge": {k: v for k, v in doc.items() if k != "_id"}}


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
    """Get XP leaderboard (anonymized)."""
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

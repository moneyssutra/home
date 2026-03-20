"""Combined endpoints for faster page loading — reduces multiple API calls to single requests."""
import asyncio
from fastapi import APIRouter, Request
from datetime import datetime, timezone

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_user_now, get_weekly_multiplier
from routes.dashboard import get_networth_summary

router = APIRouter(prefix="/combined", tags=["Combined"])


@router.get("/wealth")
async def get_combined_wealth(request: Request):
    """Single endpoint returning all data needed by the Wealth page."""
    user = await get_current_user(request)
    uf = get_user_filter(user)
    now = get_user_now(request)
    month_str = f"{now.year}-{str(now.month).zfill(2)}"

    # Run networth (with full received/expected logic) in parallel with collection queries
    nw, assets, investments, loans, insurances, accounts, credit_cards, incomes, all_expenses = await asyncio.gather(
        get_networth_summary(request),
        db.assets.find(uf, {"_id": 0}).to_list(1000),
        db.investments.find(uf, {"_id": 0}).to_list(1000),
        db.loans.find(uf, {"_id": 0}).to_list(1000),
        db.insurances.find(uf, {"_id": 0}).to_list(1000),
        db.accounts.find(uf, {"_id": 0}).to_list(1000),
        db.credit_cards.find(uf, {"_id": 0}).to_list(1000),
        db.income_sources.find(uf, {"_id": 0}).to_list(1000),
        db.expenses.find(uf, {"_id": 0}).to_list(1000),
    )

    # Filter expenses for current month
    month_expenses = [e for e in all_expenses if e.get("month") == month_str or not e.get("month")]

    return {
        "nw": nw,
        "assets": assets,
        "investments": investments,
        "loans": loans,
        "insurances": insurances,
        "accounts": accounts,
        "creditCards": credit_cards,
        "incomes": incomes,
        "expenses": month_expenses,
    }


@router.get("/intelligence")
async def get_combined_intelligence(request: Request):
    """Single endpoint returning all data needed by the Health/Insights page.
    Calls the actual endpoint functions to ensure data structure matches exactly."""
    from routes.intelligence import get_survival_clock, get_control_score
    from routes.financial_health import get_financial_health

    user = await get_current_user(request)
    user_id = user["user_id"]

    # Run the actual endpoint functions + extra queries in parallel
    survival_clock, control_score, financial_health, gam_profile, challenges, personality_history = await asyncio.gather(
        get_survival_clock(request),
        get_control_score(request),
        get_financial_health(request),
        db.gamification_profiles.find_one({"userId": user_id}, {"_id": 0}),
        db.challenges.find({}, {"_id": 0}).to_list(100),
        db.personality_history.find({"userId": user_id}, {"_id": 0}).sort("date", -1).to_list(30),
    )

    gam = gam_profile or {"level": 1, "xp": 0, "streak": 0, "badges": []}

    return {
        "survivalClock": survival_clock,
        "controlScore": control_score,
        "financialHealth": financial_health,
        "gamification": gam,
        "challenges": challenges,
        "personalityHistory": personality_history,
    }

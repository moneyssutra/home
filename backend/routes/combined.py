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
    """Single endpoint returning all data needed by the Health/Insights page."""
    user = await get_current_user(request)
    user_id = user["user_id"]
    uf = get_user_filter(user)

    # Fetch all financial data + gamification in parallel
    (incomes, expenses, accounts, loans, investments,
     gam_profile, challenges, personality_history) = await asyncio.gather(
        db.income_sources.find(uf, {"_id": 0}).to_list(1000),
        db.expenses.find(uf, {"_id": 0}).to_list(1000),
        db.accounts.find(uf, {"_id": 0}).to_list(1000),
        db.loans.find(uf, {"_id": 0}).to_list(1000),
        db.investments.find(uf, {"_id": 0}).to_list(1000),
        db.gamification_profiles.find_one({"userId": user_id}, {"_id": 0}),
        db.challenges.find({}, {"_id": 0}).to_list(100),
        db.personality_history.find({"userId": user_id}, {"_id": 0}).sort("date", -1).to_list(30),
    )

    # Compute survival clock
    monthly_income = 0
    for src in incomes:
        amt = src.get("expectedAmount", 0) or 0
        freq = src.get("frequency", "Monthly")
        if freq == "Daily": monthly_income += amt * 30
        elif freq == "Weekly": monthly_income += amt * get_weekly_multiplier()
        elif freq == "Quarterly": monthly_income += amt / 3
        elif freq == "Half-Yearly": monthly_income += amt / 6
        elif freq == "Yearly": monthly_income += amt / 12
        else: monthly_income += amt

    monthly_expense = 0
    for exp in expenses:
        amt = exp.get("expectedAmount", 0) or 0
        freq = exp.get("frequency", "Monthly")
        if freq == "Daily": monthly_expense += amt * 30
        elif freq == "Weekly": monthly_expense += amt * get_weekly_multiplier()
        elif freq == "Quarterly": monthly_expense += amt / 3
        elif freq == "Half-Yearly": monthly_expense += amt / 6
        elif freq == "Yearly": monthly_expense += amt / 12
        else: monthly_expense += amt

    liquid = sum(a.get("currentBalance", 0) or a.get("balance", 0) or 0 for a in accounts)
    total_emi = sum(l.get("emiAmount", 0) or 0 for l in loans)
    monthly_burn = monthly_expense + total_emi

    if monthly_burn > 0:
        survival_days = round((liquid / monthly_burn) * 30)
    else:
        survival_days = 999 if liquid > 0 else 0

    stage = 0
    if survival_days >= 180: stage = 3
    elif survival_days >= 90: stage = 2
    elif survival_days >= 30: stage = 1

    survival_clock = {
        "survivalDays": survival_days, "stage": stage,
        "liquidBalance": liquid, "monthlyBurn": round(monthly_burn, 2),
        "monthlyIncome": round(monthly_income, 2),
        "monthlyExpenses": round(monthly_expense, 2),
        "totalEMI": round(total_emi, 2),
    }

    # Compute control score
    savings_rate = ((monthly_income - monthly_expense) / monthly_income * 100) if monthly_income > 0 else 0
    emi_ratio = (total_emi / monthly_income * 100) if monthly_income > 0 else 0
    emergency_months = liquid / monthly_burn if monthly_burn > 0 else 0
    inv_total = sum(i.get("currentValue", 0) or 0 for i in investments)
    inv_ratio = (inv_total / (monthly_income * 12) * 100) if monthly_income > 0 else 0

    score = min(100, max(0, round(
        min(savings_rate, 30) / 30 * 25 +
        max(0, (50 - emi_ratio)) / 50 * 25 +
        min(emergency_months, 6) / 6 * 25 +
        min(inv_ratio, 100) / 100 * 25
    )))

    control_score = {
        "controlScore": score, "savingsRate": round(savings_rate, 1),
        "emiRatio": round(emi_ratio, 1), "emergencyMonths": round(emergency_months, 1),
        "investmentRatio": round(inv_ratio, 1),
    }

    # Gamification
    gam = gam_profile or {"level": 1, "xp": 0, "streak": 0, "badges": []}

    return {
        "survivalClock": survival_clock,
        "controlScore": control_score,
        "gamification": gam,
        "challenges": challenges,
        "personalityHistory": personality_history,
    }

"""Financial Intelligence Engine - Survival Clock, Control Score, Behavior Alerts."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
import math
import logging

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/intelligence", tags=["Financial Intelligence"])
logger = logging.getLogger(__name__)


async def _get_liquid_funds(user_filter: dict) -> float:
    """Calculate total liquid funds: bank accounts + liquid investments."""
    accounts = await db.accounts.find(user_filter, {"_id": 0, "currentBalance": 1, "accountType": 1}).to_list(1000)
    liquid_account_types = {"Savings", "Current", "Cash", "Wallet"}
    liquid_balance = sum(
        a.get("currentBalance", 0)
        for a in accounts
        if a.get("accountType", "") in liquid_account_types
    )
    investments = await db.investments.find(
        {**user_filter, "isLiquidAsset": True}, {"_id": 0, "currentValue": 1}
    ).to_list(1000)
    liquid_investments = sum(i.get("currentValue", 0) for i in investments)
    return liquid_balance + liquid_investments


async def _get_monthly_mandatory_expense(user_filter: dict) -> float:
    """Calculate monthly mandatory expense from Fixed expenses."""
    fixed_expenses = await db.expenses.find(
        {**user_filter, "expenseType": "Fixed"}, {"_id": 0, "expectedAmount": 1, "frequency": 1}
    ).to_list(1000)
    total = 0
    for e in fixed_expenses:
        amt = e.get("expectedAmount", 0)
        freq = e.get("frequency", "Monthly")
        if freq == "Monthly":
            total += amt
        elif freq == "Yearly":
            total += amt / 12
        elif freq == "Quarterly":
            total += amt / 3
        elif freq == "Half-Yearly":
            total += amt / 6
        elif freq == "Weekly":
            total += amt * 4.33
        elif freq == "Daily":
            total += amt * 30
        else:
            total += amt
    return total


async def _get_monthly_income(user_filter: dict) -> float:
    """Calculate total monthly income from income sources."""
    incomes = await db.income_sources.find(user_filter, {"_id": 0, "expectedAmount": 1, "frequency": 1}).to_list(1000)
    total = 0
    for i in incomes:
        amt = i.get("expectedAmount", 0)
        freq = i.get("frequency", "Monthly")
        if freq == "Monthly":
            total += amt
        elif freq == "Yearly":
            total += amt / 12
        elif freq == "Quarterly":
            total += amt / 3
        elif freq == "Half-Yearly":
            total += amt / 6
        elif freq == "Weekly":
            total += amt * 4.33
        elif freq == "Daily":
            total += amt * 30
        else:
            total += amt
    return total


async def _get_monthly_discretionary_spending(user_filter: dict) -> float:
    """Calculate monthly discretionary (Variable) expense."""
    var_expenses = await db.expenses.find(
        {**user_filter, "expenseType": "Variable"}, {"_id": 0, "expectedAmount": 1, "frequency": 1}
    ).to_list(1000)
    total = 0
    for e in var_expenses:
        amt = e.get("expectedAmount", 0)
        freq = e.get("frequency", "Monthly")
        if freq == "Monthly":
            total += amt
        elif freq == "Yearly":
            total += amt / 12
        elif freq == "Quarterly":
            total += amt / 3
        elif freq == "Half-Yearly":
            total += amt / 6
        elif freq == "Weekly":
            total += amt * 4.33
        elif freq == "Daily":
            total += amt * 30
        else:
            total += amt
    return total


async def _get_total_emi(user_filter: dict) -> float:
    """Get total monthly EMI from loans."""
    loans = await db.loans.find(user_filter, {"_id": 0, "emiAmount": 1, "emiFrequency": 1}).to_list(1000)
    total = 0
    for loan in loans:
        amt = loan.get("emiAmount", 0)
        freq = loan.get("emiFrequency", "Monthly")
        if freq == "Monthly":
            total += amt
        elif freq == "Quarterly":
            total += amt / 3
        elif freq == "Half-Yearly":
            total += amt / 6
        elif freq == "Yearly":
            total += amt / 12
        else:
            total += amt
    return total


def _get_survival_level(days: int) -> str:
    if days > 365:
        return "FINANCIAL WARRIOR"
    elif days > 180:
        return "SECURE"
    elif days > 90:
        return "STABLE"
    elif days > 30:
        return "VULNERABLE"
    return "CRITICAL"


def _get_control_grade(score: int) -> str:
    if score >= 85:
        return "A"
    elif score >= 70:
        return "B"
    elif score >= 55:
        return "C"
    elif score >= 40:
        return "D"
    return "E"


@router.get("/survival-clock")
async def get_survival_clock(request: Request):
    """Financial Survival Clock - How many days can user survive without income."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    liquid_funds = await _get_liquid_funds(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(liquid_funds / daily_expense) if daily_expense > 0 else 999

    return {
        "liquidFunds": round(liquid_funds, 2),
        "monthlyMandatoryExpense": round(monthly_mandatory, 2),
        "dailyBurnRate": round(daily_expense, 2),
        "survivalDays": survival_days,
        "level": _get_survival_level(survival_days)
    }


@router.get("/control-score")
async def get_control_score(request: Request):
    """Financial Control Score Engine - Weekly composite score 0-100."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)

    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)
    liquid_funds = await _get_liquid_funds(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    # 1. Cash Control Score (25%)
    weekly_income = monthly_income / 4.33
    weekly_discretionary = monthly_discretionary / 4.33
    if weekly_income > 0:
        cash_ratio = (weekly_income - weekly_discretionary) / weekly_income
    else:
        cash_ratio = 0
    if cash_ratio > 0.40:
        cash_score = 25
    elif cash_ratio > 0.25:
        cash_score = 18
    elif cash_ratio > 0.10:
        cash_score = 10
    else:
        cash_score = 5

    # 2. Debt Pressure Score (25%)
    if monthly_income > 0:
        debt_ratio = total_emi / monthly_income
    else:
        debt_ratio = 1.0
    if debt_ratio < 0.25:
        debt_score = 25
    elif debt_ratio < 0.40:
        debt_score = 18
    elif debt_ratio < 0.60:
        debt_score = 10
    else:
        debt_score = 5

    # 3. Liquidity Score (25%)
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(liquid_funds / daily_expense) if daily_expense > 0 else 999
    if survival_days > 180:
        liquidity_score = 25
    elif survival_days > 90:
        liquidity_score = 18
    elif survival_days > 30:
        liquidity_score = 10
    else:
        liquidity_score = 5

    # 4. Stability Score (25%) - income volatility from transactions
    three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    income_txns = await db.income_transactions.find(
        {**user_filter, "transactionDate": {"$gte": three_months_ago[:10]}},
        {"_id": 0, "incomeAmount": 1, "transactionDate": 1}
    ).to_list(10000)

    if len(income_txns) >= 2:
        monthly_totals = {}
        for txn in income_txns:
            month_key = txn.get("transactionDate", "")[:7]
            monthly_totals[month_key] = monthly_totals.get(month_key, 0) + (txn.get("incomeAmount", 0) or txn.get("amount", 0) or 0)
        values = list(monthly_totals.values())
        if len(values) >= 2:
            mean_val = sum(values) / len(values)
            if mean_val > 0:
                variance = sum((v - mean_val) ** 2 for v in values) / len(values)
                std_dev = math.sqrt(variance)
                variance_pct = (std_dev / mean_val) * 100
            else:
                variance_pct = 0
        else:
            variance_pct = 0
    else:
        variance_pct = 0

    if variance_pct < 10:
        stability_score = 25
    elif variance_pct < 25:
        stability_score = 18
    elif variance_pct < 40:
        stability_score = 10
    else:
        stability_score = 5

    final_score = cash_score + debt_score + liquidity_score + stability_score

    return {
        "finalScore": final_score,
        "grade": _get_control_grade(final_score),
        "breakdown": {
            "cashControl": {"score": cash_score, "ratio": round(cash_ratio, 3)},
            "debtPressure": {"score": debt_score, "ratio": round(debt_ratio, 3)},
            "liquidity": {"score": liquidity_score, "survivalDays": survival_days},
            "stability": {"score": stability_score, "variancePct": round(variance_pct, 1)}
        },
        "metrics": {
            "monthlyIncome": round(monthly_income, 2),
            "monthlyDiscretionary": round(monthly_discretionary, 2),
            "totalEMI": round(total_emi, 2),
            "liquidFunds": round(liquid_funds, 2)
        }
    }


@router.get("/behavior-alerts")
async def get_behavior_alerts(request: Request):
    """Behavioral Intelligence Engine - Smart financial alerts."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_id = user.get("user_id")
    alerts = []

    monthly_income = await _get_monthly_income(user_filter)
    total_emi = await _get_total_emi(user_filter)
    liquid_funds = await _get_liquid_funds(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    # 1. Overspending Alert - compare current month variable expenses to 3-month average
    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    three_months_ago = (now - timedelta(days=90)).strftime("%Y-%m-%d")

    expense_txns = await db.expense_transactions.find(
        {**user_filter, "transactionDate": {"$gte": three_months_ago}},
        {"_id": 0, "amount": 1, "category": 1, "transactionDate": 1}
    ).to_list(10000)

    current_month_spend = sum(t.get("amount", 0) for t in expense_txns if t.get("transactionDate", "").startswith(current_month))
    past_months = {}
    for t in expense_txns:
        m = t.get("transactionDate", "")[:7]
        if m != current_month:
            past_months[m] = past_months.get(m, 0) + t.get("amount", 0)
    avg_past = sum(past_months.values()) / max(len(past_months), 1) if past_months else 0

    if avg_past > 0 and current_month_spend > avg_past * 1.20:
        pct_increase = ((current_month_spend - avg_past) / avg_past) * 100
        alerts.append({
            "type": "OVERSPENDING",
            "severity": "HIGH" if pct_increase > 40 else "MEDIUM",
            "message": f"Your spending increased {pct_increase:.0f}% compared to your 3-month average.",
            "detail": f"Current: ₹{current_month_spend:,.0f} vs Avg: ₹{avg_past:,.0f}",
            "icon": "trending-up"
        })

    # 2. Debt Risk Alert
    if monthly_income > 0:
        debt_ratio = total_emi / monthly_income
        if debt_ratio > 0.50:
            alerts.append({
                "type": "DEBT_RISK",
                "severity": "HIGH",
                "message": f"Your EMI burden is {debt_ratio*100:.0f}% of income - crossing safe limits.",
                "detail": f"Total EMI: ₹{total_emi:,.0f} / Income: ₹{monthly_income:,.0f}",
                "icon": "alert-triangle"
            })

    # 3. EMI Stress Warning - remaining balance < next 7 days EMI
    weekly_emi = total_emi / 4.33
    if liquid_funds < weekly_emi and weekly_emi > 0:
        alerts.append({
            "type": "EMI_STRESS",
            "severity": "HIGH",
            "message": "You may not have enough liquidity for upcoming EMIs.",
            "detail": f"Liquid: ₹{liquid_funds:,.0f} vs Weekly EMI: ₹{weekly_emi:,.0f}",
            "icon": "alert-circle"
        })

    # 4. Repeating Mistake Detection - category spend comparison
    last_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    current_by_cat = {}
    last_by_cat = {}
    for t in expense_txns:
        cat = t.get("category", "Other")
        m = t.get("transactionDate", "")[:7]
        amt = t.get("amount", 0)
        if m == current_month:
            current_by_cat[cat] = current_by_cat.get(cat, 0) + amt
        elif m == last_month:
            last_by_cat[cat] = last_by_cat.get(cat, 0) + amt

    for cat, spend in current_by_cat.items():
        last_spend = last_by_cat.get(cat, 0)
        if last_spend > 0 and spend > last_spend * 1.25:
            alerts.append({
                "type": "REPEATING_MISTAKE",
                "severity": "MEDIUM",
                "message": f"You are repeating overspending in {cat}.",
                "detail": f"This month: ₹{spend:,.0f} vs Last: ₹{last_spend:,.0f}",
                "icon": "repeat"
            })

    # 5. Lifestyle Inflation Alert
    if monthly_income > 0 and monthly_discretionary > 0:
        total_expense = monthly_mandatory + monthly_discretionary
        expense_ratio = total_expense / monthly_income
        if expense_ratio > 0.85:
            alerts.append({
                "type": "LIFESTYLE_INFLATION",
                "severity": "MEDIUM" if expense_ratio < 0.95 else "HIGH",
                "message": "Your spending is consuming most of your income.",
                "detail": f"Expenses are {expense_ratio*100:.0f}% of your income. Save more!",
                "icon": "arrow-up-right"
            })

    # Low survival warning
    daily_exp = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(liquid_funds / daily_exp) if daily_exp > 0 else 999
    if survival_days < 30:
        alerts.append({
            "type": "SURVIVAL_CRITICAL",
            "severity": "HIGH",
            "message": f"Only {survival_days} days of survival funds remaining!",
            "detail": "Build your emergency fund immediately.",
            "icon": "shield-alert"
        })
    elif survival_days < 90:
        alerts.append({
            "type": "SURVIVAL_LOW",
            "severity": "MEDIUM",
            "message": f"{survival_days} days of survival funds. Target 6+ months.",
            "detail": "Increase liquid savings for better financial security.",
            "icon": "shield"
        })

    # Sort by severity
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    # Store alerts in DB for history
    if alerts:
        for alert in alerts:
            alert_doc = {
                "userId": user_id,
                "alert_type": alert["type"],
                "message": alert["message"],
                "severity": alert["severity"],
                "detail": alert.get("detail", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_read": False
            }
            existing = await db.alerts.find_one({
                "userId": user_id,
                "alert_type": alert["type"],
                "created_at": {"$regex": f"^{now.strftime('%Y-%m-%d')}"}
            })
            if not existing:
                await db.alerts.insert_one(alert_doc)

    return {
        "alerts": alerts,
        "alertCount": len(alerts),
        "highCount": sum(1 for a in alerts if a["severity"] == "HIGH"),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

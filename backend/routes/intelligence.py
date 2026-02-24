"""Financial Intelligence Engine - Emergency Runway, Financial Score, Behavior Alerts."""
from fastapi import APIRouter, HTTPException, Request, Query
from datetime import datetime, timezone, timedelta
import math
import logging
import re

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/intelligence", tags=["Financial Intelligence"])
logger = logging.getLogger(__name__)


def _normalize_monthly(amount, frequency):
    """Normalize any frequency amount to monthly."""
    freq_map = {
        "Monthly": 1, "Yearly": 1/12, "Quarterly": 1/3,
        "Half-Yearly": 1/6, "Weekly": 4.33, "Daily": 30
    }
    return amount * freq_map.get(frequency, 1)


async def _get_fund_breakdown(user_filter: dict) -> dict:
    """Get detailed breakdown of all available funds by liquidity: Liquid / Semi-Liquid / Illiquid."""
    # 1. Bank accounts
    accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
    liquid_total = 0
    semi_liquid_total = 0
    illiquid_total = 0
    details = []

    for a in accounts:
        bal = a.get("currentBalance", 0)
        if bal <= 0:
            continue
        atype = a.get("accountType", "")
        name = a.get("accountName", atype)
        if atype in ("Savings", "Current", "Cash", "Wallet"):
            liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "liquid", "pct": 100})
        elif atype in ("Fixed Deposit", "FD"):
            semi_liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "semi_liquid", "pct": 60})
        elif atype in ("Recurring Deposit", "RD"):
            semi_liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "semi_liquid", "pct": 60})
        else:
            illiquid_total += bal
            details.append({"name": name, "amount": bal, "category": "illiquid", "pct": 0})

    # 2. Investments - classify by type
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)

    for inv in investments:
        val = inv.get("currentValue", 0)
        if val <= 0:
            continue
        name = inv.get("name", "")
        nl = name.lower()
        is_liquid = inv.get("isLiquidAsset", False)

        if is_liquid:
            # Liquid funds (same-day redemption)
            liquid_total += val
            details.append({"name": name, "amount": val, "category": "liquid", "pct": 100})
        elif re.search(r'\bfd\b|fixed deposit', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'\brd\b|recurring deposit', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'mutual fund|fund|mf|sip', nl) and not re.search(r'elss', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'stock|shares|equity|demat', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'etf|gold etf|index etf|bond etf', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'digital gold|gold', nl) and not re.search(r'jewel', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'esop', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        elif re.search(r'nps tier 2', nl):
            semi_liquid_total += val
            details.append({"name": name, "amount": val, "category": "semi_liquid", "pct": 60})
        else:
            # PPF, EPF, NPS Tier 1, ELSS, ULIPs, Insurance, Real Estate, Jewellery etc.
            illiquid_total += val
            details.append({"name": name, "amount": val, "category": "illiquid", "pct": 0})

    # Effective survival fund = Liquid (100%) + Semi-Liquid (60%)
    effective_total = liquid_total + (semi_liquid_total * 0.60)

    return {
        "liquid": {"total": round(liquid_total, 0), "label": "Liquid", "description": "Savings, Current, Cash — instantly available"},
        "semiLiquid": {"total": round(semi_liquid_total, 0), "label": "Semi-Liquid", "description": "FDs, Stocks, MFs, ETFs, Gold — 2-7 days, may have penalty"},
        "illiquid": {"total": round(illiquid_total, 0), "label": "Illiquid", "description": "PPF, EPF, NPS, Insurance, Real Estate — locked or restricted"},
        "effectiveTotal": round(effective_total, 0),
        "liquidBuffer": round(liquid_total, 0),
        "extendedBuffer": round(effective_total, 0),
        "netWorth": round(liquid_total + semi_liquid_total + illiquid_total, 0),
        "details": sorted(details, key=lambda x: -x["amount"])
    }


async def _get_monthly_mandatory_expense(user_filter: dict) -> float:
    """Calculate monthly mandatory expense from Fixed expenses."""
    fixed_expenses = await db.expenses.find(
        {**user_filter, "expenseType": "Fixed"}, {"_id": 0, "expectedAmount": 1, "frequency": 1}
    ).to_list(1000)
    return sum(_normalize_monthly(e.get("expectedAmount", 0), e.get("frequency", "Monthly")) for e in fixed_expenses)


async def _get_monthly_income(user_filter: dict) -> float:
    """Calculate total monthly income."""
    incomes = await db.income_sources.find(user_filter, {"_id": 0, "expectedAmount": 1, "frequency": 1}).to_list(1000)
    return sum(_normalize_monthly(i.get("expectedAmount", 0), i.get("frequency", "Monthly")) for i in incomes)


async def _get_monthly_discretionary_spending(user_filter: dict) -> float:
    """Calculate monthly discretionary (Variable) expense."""
    var_expenses = await db.expenses.find(
        {**user_filter, "expenseType": "Variable"}, {"_id": 0, "expectedAmount": 1, "frequency": 1}
    ).to_list(1000)
    return sum(_normalize_monthly(e.get("expectedAmount", 0), e.get("frequency", "Monthly")) for e in var_expenses)


async def _get_total_emi(user_filter: dict) -> float:
    """Get total monthly EMI from loans."""
    loans = await db.loans.find(user_filter, {"_id": 0, "emiAmount": 1, "emiFrequency": 1}).to_list(1000)
    return sum(_normalize_monthly(l.get("emiAmount", 0), l.get("emiFrequency", "Monthly")) for l in loans)


async def _get_liquid_funds(user_filter: dict) -> float:
    """Get effective liquid funds (for backward compat)."""
    breakdown = await _get_fund_breakdown(user_filter)
    return breakdown["effectiveTotal"]


# 20 Survival Stages aligned with survival days
SURVIVAL_STAGES = [
    # Phase 1 — Critical Zone (0–30)
    {"stage": 1,  "name": "Exposed",          "min": 0,    "max": 7,    "phase": "Critical",     "phase_num": 1, "color": "#DC2626"},
    {"stage": 2,  "name": "Unstable",          "min": 8,    "max": 14,   "phase": "Critical",     "phase_num": 1, "color": "#DC2626"},
    {"stage": 3,  "name": "Vulnerable",         "min": 15,   "max": 21,   "phase": "Critical",     "phase_num": 1, "color": "#EF4444"},
    {"stage": 4,  "name": "Recovering",         "min": 22,   "max": 30,   "phase": "Critical",     "phase_num": 1, "color": "#EF4444"},
    # Phase 2 — Short-Term Stability (31–90)
    {"stage": 5,  "name": "Balancing",          "min": 31,   "max": 45,   "phase": "Stabilizing",  "phase_num": 2, "color": "#F97316"},
    {"stage": 6,  "name": "Securing",           "min": 46,   "max": 60,   "phase": "Stabilizing",  "phase_num": 2, "color": "#F97316"},
    {"stage": 7,  "name": "Shielded",           "min": 61,   "max": 75,   "phase": "Stabilizing",  "phase_num": 2, "color": "#FB923C"},
    {"stage": 8,  "name": "Grounded",           "min": 76,   "max": 90,   "phase": "Stabilizing",  "phase_num": 2, "color": "#FB923C"},
    # Phase 3 — Stable Zone (91–180)
    {"stage": 9,  "name": "Structured",         "min": 91,   "max": 110,  "phase": "Control",      "phase_num": 3, "color": "#EAB308"},
    {"stage": 10, "name": "Disciplined",         "min": 111,  "max": 130,  "phase": "Control",      "phase_num": 3, "color": "#EAB308"},
    {"stage": 11, "name": "In Control",          "min": 131,  "max": 150,  "phase": "Control",      "phase_num": 3, "color": "#FACC15"},
    {"stage": 12, "name": "Stabilized",          "min": 151,  "max": 180,  "phase": "Control",      "phase_num": 3, "color": "#FACC15"},
    # Phase 4 — Strong Zone (181–365)
    {"stage": 13, "name": "Advancing",           "min": 181,  "max": 210,  "phase": "Growth",       "phase_num": 4, "color": "#22C55E"},
    {"stage": 14, "name": "Strategic",           "min": 211,  "max": 240,  "phase": "Growth",       "phase_num": 4, "color": "#22C55E"},
    {"stage": 15, "name": "Expanding",           "min": 241,  "max": 270,  "phase": "Growth",       "phase_num": 4, "color": "#16A34A"},
    {"stage": 16, "name": "Wealth Builder",      "min": 271,  "max": 365,  "phase": "Growth",       "phase_num": 4, "color": "#16A34A"},
    # Phase 5 — Financial Power Zone (365+)
    {"stage": 17, "name": "Fortified",           "min": 366,  "max": 540,  "phase": "Power",        "phase_num": 5, "color": "#3B82F6"},
    {"stage": 18, "name": "Independent",         "min": 541,  "max": 720,  "phase": "Power",        "phase_num": 5, "color": "#2563EB"},
    {"stage": 19, "name": "Financially Free",    "min": 721,  "max": 1000, "phase": "Power",        "phase_num": 5, "color": "#7C3AED"},
    {"stage": 20, "name": "Sovereign",           "min": 1001, "max": 99999,"phase": "Power",        "phase_num": 5, "color": "#9333EA"},
]

def _get_runway_level(days: int) -> dict:
    """Get the survival stage based on days."""
    for s in reversed(SURVIVAL_STAGES):
        if days >= s["min"]:
            return {"level": s["name"], "color": s["color"], "stage": s["stage"], "phase": s["phase"], "phase_num": s["phase_num"]}
    return {"level": "Exposed", "color": "#DC2626", "stage": 1, "phase": "Critical", "phase_num": 1}


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
    """Emergency Runway - How long your savings last if income stops today."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    effective_funds = fund_breakdown["effectiveTotal"]
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 999
    survival_months = round(survival_days / 30, 1)

    level_info = _get_runway_level(survival_days)

    # Build visible stages: current + 5 behind + 4 ahead
    current_stage = level_info["stage"]
    start = max(0, current_stage - 6)
    end = min(len(SURVIVAL_STAGES), current_stage + 4)
    if end - start < 10:
        start = max(0, end - 10)
    visible_stages = SURVIVAL_STAGES[start:end]

    all_stages = [
        {**s, "reached": survival_days >= s["min"], "current": s["stage"] == current_stage}
        for s in SURVIVAL_STAGES
    ]

    return {
        "effectiveFunds": round(effective_funds, 0),
        "monthlyMandatoryExpense": round(monthly_mandatory, 0),
        "dailyBurnRate": round(daily_expense, 0),
        "survivalDays": survival_days,
        "survivalMonths": survival_months,
        "level": level_info["level"],
        "levelColor": level_info["color"],
        "stage": level_info["stage"],
        "phase": level_info["phase"],
        "phaseNum": level_info["phase_num"],
        "totalStages": 20,
        "visibleStages": [
            {**s, "reached": survival_days >= s["min"], "current": s["stage"] == current_stage}
            for s in visible_stages
        ],
        "allStages": all_stages,
        "fundBreakdown": fund_breakdown,
        "explanation": f"If your income stops today, your accessible savings of ₹{effective_funds:,.0f} can cover {survival_days} days ({survival_months} months) of essential expenses.",
        "tip": _get_runway_tip(survival_days)
    }


def _get_runway_tip(days):
    if days == 0:
        return "Start by saving even ₹500/month into a separate savings account. Every bit counts!"
    if days < 30:
        return "Aim for at least 1 month of expenses as emergency fund. Consider cutting non-essential spending."
    if days < 90:
        return "Good start! Target 3 months of expenses. Consider a liquid fund or high-yield savings."
    if days < 180:
        return "Solid buffer! Push for 6 months - the ideal emergency fund for most people."
    if days < 365:
        return "Great position! You're financially resilient. Consider investing surplus for growth."
    return "Outstanding! Your emergency fund is well beyond what most experts recommend."


@router.get("/control-score")
async def get_control_score(request: Request):
    """Financial Score - Your overall financial health rating (0-100)."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)

    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)
    effective_funds = (await _get_fund_breakdown(user_filter))["effectiveTotal"]
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    # 1. Savings Rate (25%) - How much you save vs earn
    if monthly_income > 0:
        savings_ratio = (monthly_income - monthly_discretionary - monthly_mandatory) / monthly_income
    else:
        savings_ratio = 0
    savings_ratio = max(savings_ratio, 0)
    if savings_ratio > 0.30:
        savings_score = 25
    elif savings_ratio > 0.20:
        savings_score = 20
    elif savings_ratio > 0.10:
        savings_score = 15
    elif savings_ratio > 0.0:
        savings_score = 10
    else:
        savings_score = 5

    # 2. EMI Load (25%) - How much EMI eats your income
    if monthly_income > 0:
        emi_ratio = total_emi / monthly_income
    else:
        emi_ratio = 1.0
    if emi_ratio < 0.25:
        emi_score = 25
    elif emi_ratio < 0.40:
        emi_score = 18
    elif emi_ratio < 0.60:
        emi_score = 10
    else:
        emi_score = 5

    # 3. Safety Buffer (25%) - Months of backup funds
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 999
    buffer_months = round(survival_days / 30, 1)
    if buffer_months > 6:
        buffer_score = 25
    elif buffer_months > 3:
        buffer_score = 18
    elif buffer_months > 1:
        buffer_score = 10
    else:
        buffer_score = 5

    # 4. Income Consistency (25%) - Stability of income
    three_months_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    income_txns = await db.income_transactions.find(
        {**user_filter, "transactionDate": {"$gte": three_months_ago[:10]}},
        {"_id": 0, "incomeAmount": 1, "transactionDate": 1}
    ).to_list(10000)

    variance_pct = 0
    if len(income_txns) >= 2:
        monthly_totals = {}
        for txn in income_txns:
            month_key = txn.get("transactionDate", "")[:7]
            monthly_totals[month_key] = monthly_totals.get(month_key, 0) + (txn.get("incomeAmount", 0) or 0)
        values = list(monthly_totals.values())
        if len(values) >= 2:
            mean_val = sum(values) / len(values)
            if mean_val > 0:
                variance = sum((v - mean_val) ** 2 for v in values) / len(values)
                variance_pct = (math.sqrt(variance) / mean_val) * 100

    if variance_pct < 10:
        consistency_score = 25
    elif variance_pct < 25:
        consistency_score = 18
    elif variance_pct < 40:
        consistency_score = 10
    else:
        consistency_score = 5

    final_score = savings_score + emi_score + buffer_score + consistency_score

    return {
        "finalScore": final_score,
        "grade": _get_control_grade(final_score),
        "breakdown": {
            "savingsRate": {
                "score": savings_score, "max": 25,
                "ratio": round(savings_ratio, 3),
                "label": "Savings Rate",
                "help": f"You save {savings_ratio*100:.0f}% of your income. {'Great!' if savings_ratio > 0.20 else 'Try to save at least 20%.'}"
            },
            "emiLoad": {
                "score": emi_score, "max": 25,
                "ratio": round(emi_ratio, 3),
                "label": "EMI Load",
                "help": f"EMIs take {emi_ratio*100:.0f}% of income. {'Healthy level.' if emi_ratio < 0.40 else 'Consider reducing debt.'}"
            },
            "safetyBuffer": {
                "score": buffer_score, "max": 25,
                "months": buffer_months,
                "label": "Safety Buffer",
                "help": f"{buffer_months} months of backup. {'Excellent!' if buffer_months > 6 else 'Target 6 months.'}"
            },
            "incomeConsistency": {
                "score": consistency_score, "max": 25,
                "variancePct": round(variance_pct, 1),
                "label": "Income Consistency",
                "help": f"{'Stable income.' if variance_pct < 15 else 'Income varies - build a larger buffer.'}"
            }
        },
        "metrics": {
            "monthlyIncome": round(monthly_income, 2),
            "monthlyExpenses": round(monthly_mandatory + monthly_discretionary, 2),
            "totalEMI": round(total_emi, 2),
            "availableFunds": round(effective_funds, 2)
        }
    }


@router.get("/behavior-alerts")
async def get_behavior_alerts(request: Request):
    """Smart Money Alerts - Personalized financial warnings and tips."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_id = user.get("user_id")
    alerts = []

    monthly_income = await _get_monthly_income(user_filter)
    total_emi = await _get_total_emi(user_filter)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")
    three_months_ago = (now - timedelta(days=90)).strftime("%Y-%m-%d")

    # 1. Overspending Alert
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
        pct = ((current_month_spend - avg_past) / avg_past) * 100
        alerts.append({
            "type": "OVERSPENDING", "severity": "HIGH" if pct > 40 else "MEDIUM",
            "message": f"Your spending this month is {pct:.0f}% higher than your 3-month average.",
            "detail": f"This month: ₹{current_month_spend:,.0f} vs Average: ₹{avg_past:,.0f}",
            "icon": "trending-up"
        })

    # 2. High EMI burden
    if monthly_income > 0:
        emi_ratio = total_emi / monthly_income
        if emi_ratio > 0.50:
            alerts.append({
                "type": "DEBT_RISK", "severity": "HIGH",
                "message": f"EMIs are taking {emi_ratio*100:.0f}% of your income - that's beyond the safe limit of 40%.",
                "detail": f"Total EMI: ₹{total_emi:,.0f} / Monthly Income: ₹{monthly_income:,.0f}",
                "icon": "alert-triangle"
            })

    # 3. EMI Stress - can't cover next week's EMI
    weekly_emi = total_emi / 4.33
    if effective_funds < weekly_emi and weekly_emi > 0:
        alerts.append({
            "type": "EMI_STRESS", "severity": "HIGH",
            "message": "Your accessible funds may not cover upcoming EMI payments.",
            "detail": f"Available: ₹{effective_funds:,.0f} vs Weekly EMI need: ₹{weekly_emi:,.0f}",
            "icon": "alert-circle"
        })

    # 4. Category-wise repeat overspending
    last_month = (now.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    current_by_cat, last_by_cat = {}, {}
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
                "type": "REPEATING_MISTAKE", "severity": "MEDIUM",
                "message": f"You're spending more on {cat} again this month.",
                "detail": f"This month: ₹{spend:,.0f} vs Last month: ₹{last_spend:,.0f}",
                "icon": "repeat"
            })

    # 5. Spending > 85% of income
    if monthly_income > 0:
        total_expense = monthly_mandatory + monthly_discretionary
        expense_ratio = total_expense / monthly_income
        if expense_ratio > 0.85:
            alerts.append({
                "type": "LIFESTYLE_INFLATION", "severity": "MEDIUM" if expense_ratio < 0.95 else "HIGH",
                "message": f"Your expenses are {expense_ratio*100:.0f}% of your income - very little is being saved.",
                "detail": "Aim to keep total expenses under 70-80% of income.",
                "icon": "arrow-up-right"
            })

    # 6. Emergency runway warning
    daily_exp = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    survival_days = int(effective_funds / daily_exp) if daily_exp > 0 else 999
    if survival_days == 0:
        alerts.append({
            "type": "SURVIVAL_CRITICAL", "severity": "HIGH",
            "message": "You have zero accessible emergency funds!",
            "detail": "Even ₹500/month into savings helps. Start building your safety net today.",
            "icon": "shield-alert"
        })
    elif survival_days < 30:
        alerts.append({
            "type": "SURVIVAL_LOW", "severity": "HIGH",
            "message": f"Your emergency funds last only {survival_days} days.",
            "detail": "Target at least 3 months of essential expenses as backup.",
            "icon": "shield-alert"
        })
    elif survival_days < 90:
        alerts.append({
            "type": "SURVIVAL_BUILDING", "severity": "MEDIUM",
            "message": f"Emergency runway at {survival_days} days - keep building!",
            "detail": "You're on the right track. Aim for 6 months of expenses.",
            "icon": "shield"
        })

    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    if alerts:
        for alert in alerts:
            existing = await db.alerts.find_one({
                "userId": user_id, "alert_type": alert["type"],
                "created_at": {"$regex": f"^{now.strftime('%Y-%m-%d')}"}
            })
            if not existing:
                await db.alerts.insert_one({
                    "userId": user_id, "alert_type": alert["type"],
                    "message": alert["message"], "severity": alert["severity"],
                    "detail": alert.get("detail", ""),
                    "created_at": datetime.now(timezone.utc).isoformat(), "is_read": False
                })

    return {
        "alerts": alerts,
        "alertCount": len(alerts),
        "highCount": sum(1 for a in alerts if a["severity"] == "HIGH"),
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/runway-simulator")
async def runway_simulator(
    request: Request,
    income_change_pct: float = Query(0, description="Income change percentage (-100 to +100)"),
    expense_change_pct: float = Query(0, description="Expense change percentage (-100 to +100)"),
    extra_savings: float = Query(0, description="One-time extra savings added"),
):
    """Simulate how changes affect your emergency runway."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_income = await _get_monthly_income(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)

    effective_funds = fund_breakdown["effectiveTotal"]

    # Current baseline
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 0
    current_survival = int(effective_funds / daily_expense) if daily_expense > 0 else 999

    # Simulated scenario
    sim_income = monthly_income * (1 + income_change_pct / 100)
    sim_mandatory = monthly_mandatory * (1 + expense_change_pct / 100)
    sim_funds = effective_funds + extra_savings

    # If income still active, monthly net savings extend runway
    sim_daily_expense = sim_mandatory / 30 if sim_mandatory > 0 else 0
    sim_survival = int(sim_funds / sim_daily_expense) if sim_daily_expense > 0 else 999

    # Monthly net savings with new income/expense
    monthly_net = sim_income - sim_mandatory - monthly_discretionary

    # Project 12-month runway growth (or decline)
    projections = []
    running_funds = sim_funds
    for month in range(0, 13):
        days = int(running_funds / sim_daily_expense) if sim_daily_expense > 0 else 999
        projections.append({
            "month": month,
            "funds": round(max(running_funds, 0), 0),
            "survivalDays": max(min(days, 9999), 0),
            "level": _get_runway_level(max(days, 0))["level"],
        })
        running_funds += monthly_net  # Can be negative (spending from savings)

    change_days = sim_survival - current_survival
    change_pct = round((change_days / current_survival) * 100, 1) if current_survival > 0 else 0

    return {
        "current": {
            "survivalDays": current_survival,
            "effectiveFunds": round(effective_funds, 0),
            "monthlyExpense": round(monthly_mandatory, 0),
            "monthlyIncome": round(monthly_income, 0),
            "level": _get_runway_level(current_survival)["level"],
        },
        "simulated": {
            "survivalDays": sim_survival,
            "effectiveFunds": round(sim_funds, 0),
            "monthlyExpense": round(sim_mandatory, 0),
            "monthlyIncome": round(sim_income, 0),
            "monthlySavings": round(monthly_net, 0),
            "level": _get_runway_level(sim_survival)["level"],
            "levelColor": _get_runway_level(sim_survival)["color"],
        },
        "impact": {
            "changeDays": change_days,
            "changePct": change_pct,
            "direction": "up" if change_days > 0 else ("down" if change_days < 0 else "same"),
        },
        "projections": projections,
        "insight": _get_sim_insight(current_survival, sim_survival, income_change_pct, expense_change_pct, extra_savings),
    }


def _get_sim_insight(current, simulated, inc_pct, exp_pct, extra):
    diff = simulated - current
    parts = []
    if extra > 0:
        parts.append(f"Adding ₹{extra:,.0f} to savings")
    if exp_pct < 0:
        parts.append(f"cutting expenses by {abs(exp_pct):.0f}%")
    if exp_pct > 0:
        parts.append(f"increasing expenses by {exp_pct:.0f}%")
    if inc_pct < 0:
        parts.append(f"with {abs(inc_pct):.0f}% less income")
    if inc_pct > 0:
        parts.append(f"with {inc_pct:.0f}% more income")

    action = " and ".join(parts) if parts else "No changes"

    if diff > 0:
        return f"{action} would extend your runway by {diff} days."
    elif diff < 0:
        return f"{action} would reduce your runway by {abs(diff)} days."
    # Runway unchanged but income changed - explain projection impact
    if inc_pct < 0:
        return f"{action} — immediate runway stays at {current} days (it already assumes no income), but your savings will deplete faster. Check the 12-month projection below."
    return f"{action} — your runway stays the same."


@router.get("/money-pattern")
async def get_money_pattern(request: Request):
    """Money Pattern Recognition - Your financial personality profile."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)

    monthly_income = await _get_monthly_income(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)
    fund_breakdown = await _get_fund_breakdown(user_filter)

    total_expenses = monthly_mandatory + monthly_discretionary
    savings = monthly_income - total_expenses if monthly_income > 0 else 0

    # Calculate ratios
    savings_rate = (savings / monthly_income * 100) if monthly_income > 0 else 0
    emi_ratio = (total_emi / monthly_income * 100) if monthly_income > 0 else 0
    needs_ratio = (monthly_mandatory / monthly_income * 100) if monthly_income > 0 else 0
    wants_ratio = (monthly_discretionary / monthly_income * 100) if monthly_income > 0 else 0
    savings_ratio_pct = max(savings_rate, 0)

    # Spending DNA
    spending_dna = {
        "needs": round(needs_ratio, 1),
        "wants": round(wants_ratio, 1),
        "savings": round(savings_ratio_pct, 1),
        "emi": round(emi_ratio, 1),
    }

    # Get investment diversity
    investments = await db.investments.find(user_filter, {"_id": 0, "name": 1}).to_list(1000)
    inv_count = len(investments)

    # Get expense categories for leakage detection
    expenses = await db.expenses.find(user_filter, {"_id": 0, "category": 1, "expectedAmount": 1, "frequency": 1, "expenseType": 1}).to_list(1000)
    cat_totals = {}
    for e in expenses:
        cat = e.get("category", "Other")
        amt = _normalize_monthly(e.get("expectedAmount", 0), e.get("frequency", "Monthly"))
        cat_totals[cat] = cat_totals.get(cat, 0) + amt
    top_expense_cats = sorted(cat_totals.items(), key=lambda x: -x[1])[:3]

    # Determine personality
    traits = []
    strengths = []
    blind_spots = []

    # Income level
    if monthly_income >= 200000:
        income_tag = "High Earning"
    elif monthly_income >= 80000:
        income_tag = "Moderate Earning"
    else:
        income_tag = "Lean Earning"

    # Spending pattern
    if wants_ratio > 35:
        spend_tag = "High Leakage"
        blind_spots.append("Discretionary spending exceeds 35% of income — identify cuts")
    elif wants_ratio > 20:
        spend_tag = "Balanced Spender"
        traits.append("Spending is moderate but could be optimized")
    else:
        spend_tag = "Frugal"
        strengths.append("Keeps discretionary spending tight")

    # Primary personality
    personality = f"{income_tag}, {spend_tag}"

    # EMI analysis
    if emi_ratio > 50:
        personality = "Debt Warrior"
        traits.append("EMIs consume over half of income — debt reduction is priority")
        blind_spots.append("High EMI burden limits wealth building")
    elif emi_ratio > 30:
        traits.append("EMIs are significant but manageable")
        blind_spots.append("Consider prepaying high-interest loans")

    # Savings behavior
    if savings_rate >= 30:
        strengths.append(f"Saving {savings_rate:.0f}% of income — excellent discipline")
        if inv_count >= 5:
            personality = f"{income_tag}, Wealth Builder"
            strengths.append(f"Diversified across {inv_count} investments")
    elif savings_rate >= 15:
        traits.append(f"Saves {savings_rate:.0f}% — room to grow")
    else:
        blind_spots.append(f"Only saving {max(savings_rate, 0):.0f}% of income — target 20%+")

    # Buffer analysis
    liquid_buf = fund_breakdown.get("liquidBuffer", 0)
    if liquid_buf < monthly_mandatory * 3:
        blind_spots.append("Liquid buffer below 3 months — build emergency fund")
    else:
        strengths.append("Healthy liquid emergency buffer")

    # Overrides for special cases
    if savings_rate >= 40 and emi_ratio < 15:
        personality = f"{income_tag}, Financial Optimizer"
    elif emi_ratio < 5 and savings_rate >= 20:
        personality = f"{income_tag}, Debt-Free Saver"
    elif inv_count >= 5 and savings_rate >= 25:
        personality = f"{income_tag}, Diversified Investor"

    if not traits:
        traits.append("Overall financial behavior is healthy")
    if not strengths:
        strengths.append("Consistently tracking finances on MoneySutra")
    if not blind_spots:
        blind_spots.append("No major red flags detected — keep it up!")

    return {
        "personality": personality,
        "tagline": _get_pattern_tagline(personality),
        "spendingDNA": spending_dna,
        "traits": traits,
        "strengths": strengths[:4],
        "blindSpots": blind_spots[:4],
        "topExpenseCategories": [{"category": c, "amount": round(a, 0)} for c, a in top_expense_cats],
        "metrics": {
            "monthlyIncome": round(monthly_income, 0),
            "totalExpenses": round(total_expenses, 0),
            "savings": round(max(savings, 0), 0),
            "investments": inv_count,
        },
    }


def _get_pattern_tagline(personality: str) -> str:
    tags = {
        "Debt Warrior": "Your income is strong but debt is eating your growth. Time to fight back.",
        "Financial Optimizer": "You've cracked the code — saving well, spending smart, growing wealth.",
        "Debt-Free Saver": "Zero debt pressure with solid savings — you're in a powerful position.",
        "Diversified Investor": "Smart allocation across assets — your money works while you sleep.",
    }
    for key, val in tags.items():
        if key in personality:
            return val
    if "High Leakage" in personality:
        return "You earn well but money slips through the cracks. Small cuts make big impact."
    if "Frugal" in personality:
        return "Tight with spending — now channel that discipline into growing your wealth."
    return "Track, optimize, grow — every rupee has a role to play."


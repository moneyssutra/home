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


from routes.utils import get_weekly_multiplier

def _normalize_monthly(amount, frequency):
    """Normalize any frequency amount to monthly."""
    freq_map = {
        "Monthly": 1, "Yearly": 1/12, "Quarterly": 1/3,
        "Half-Yearly": 1/6, "Weekly": get_weekly_multiplier(), "Daily": 30
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
        atype = (a.get("accountType", "") or "").lower()
        name = a.get("accountName", atype)
        nl = name.lower()
        # Check FD/RD first (by type or name) — before liquid catch-all
        if atype in ("fixed deposit", "fd") or re.search(r'\bfd\b|fixed deposit', nl):
            semi_liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "semi_liquid", "pct": 60})
        elif atype in ("recurring deposit", "rd") or re.search(r'\brd\b|recurring deposit', nl):
            semi_liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "semi_liquid", "pct": 60})
        elif atype in ("savings", "current", "cash", "wallet") or re.search(r'savings|current|salary|bank|wallet|cash', nl):
            liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "liquid", "pct": 100})
        else:
            # Unknown account type — default to liquid (it's a bank account after all)
            liquid_total += bal
            details.append({"name": name, "amount": bal, "category": "liquid", "pct": 100})

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
    """Calculate monthly mandatory expense from Fixed expenses marked as essential.
    Uses smart defaults: only categories like Housing, Utilities, Food, Medical, Education, Salary Paid, EMI.
    SIPs, investments, and non-essential subscriptions are excluded unless user explicitly marks them essential.
    """
    from routes.expenses import compute_is_essential
    fixed_expenses = await db.expenses.find(
        {**user_filter, "expenseType": "Fixed"}, {"_id": 0, "expectedAmount": 1, "frequency": 1, "isEssential": 1, "expenseName": 1, "category": 1}
    ).to_list(1000)
    total = 0
    for e in fixed_expenses:
        if compute_is_essential(e):
            total += _normalize_monthly(e.get("expectedAmount", 0), e.get("frequency", "Monthly"))
    return total


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
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0

    # If no data at all (no expenses and no funds), show clean zero state
    if monthly_mandatory == 0 and effective_funds == 0:
        survival_days = 0
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
        "label": level_info["level"],
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
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)

    # If user has no financial data at all, return 0
    has_data = monthly_income > 0 or monthly_mandatory > 0 or monthly_discretionary > 0 or total_emi > 0

    if not has_data:
        now = datetime.now(timezone.utc)
        empty_breakdown = lambda label: {"score": 0, "max": 25, "label": label, "help": "Add financial data to calculate this metric."}
        return {
            "finalScore": 0, "grade": "N/A",
            "scorePeriod": {"start": "", "end": "", "label": "No data available"},
            "breakdown": {
                "savingsRate": {**empty_breakdown("Savings Rate"), "ratio": 0, "pct": 0},
                "emiLoad": {**empty_breakdown("EMI Load"), "ratio": 0, "pct": 0},
                "safetyBuffer": {**empty_breakdown("Safety Buffer"), "months": 0},
                "incomeConsistency": {**empty_breakdown("Income Consistency"), "variancePct": 0}
            },
            "metrics": {"monthlyIncome": 0, "monthlyExpenses": 0, "totalEMI": 0, "availableFunds": 0, "liquidFunds": 0, "semiLiquidFunds": 0}
        }

    # 1. Savings Rate (25pts) - Granular tier model
    if monthly_income > 0:
        savings_ratio = (monthly_income - monthly_discretionary - monthly_mandatory) / monthly_income
    else:
        savings_ratio = 0
    savings_ratio = max(savings_ratio, 0)
    sr_pct = savings_ratio * 100
    if sr_pct >= 35: savings_score = 25
    elif sr_pct >= 30: savings_score = 22
    elif sr_pct >= 25: savings_score = 20
    elif sr_pct >= 20: savings_score = 17
    elif sr_pct >= 15: savings_score = 14
    elif sr_pct >= 10: savings_score = 10
    elif sr_pct >= 5: savings_score = 6
    elif sr_pct >= 1: savings_score = 3
    else: savings_score = 0

    # 2. EMI Load (25pts) - Granular tier model
    if monthly_income > 0:
        emi_ratio = total_emi / monthly_income
    else:
        emi_ratio = 1.0
    emi_pct = emi_ratio * 100
    if emi_pct <= 20: emi_score = 25
    elif emi_pct <= 25: emi_score = 22
    elif emi_pct <= 30: emi_score = 20
    elif emi_pct <= 40: emi_score = 15
    elif emi_pct <= 50: emi_score = 10
    elif emi_pct <= 60: emi_score = 5
    else: emi_score = 0

    # 3. Safety Buffer (25pts) - (Liquid + 60% Semi-liquid) / Mandatory Expenses
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    buffer_months = round(effective_funds / monthly_mandatory, 2) if monthly_mandatory > 0 else 0
    if buffer_months >= 8: buffer_score = 25
    elif buffer_months >= 6: buffer_score = 22
    elif buffer_months >= 4: buffer_score = 18
    elif buffer_months >= 3: buffer_score = 14
    elif buffer_months >= 2: buffer_score = 10
    elif buffer_months >= 1: buffer_score = 5
    else: buffer_score = 0

    # 4. Income Consistency (25pts) - Granular tier model
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

    if variance_pct <= 5: consistency_score = 25
    elif variance_pct <= 10: consistency_score = 22
    elif variance_pct <= 20: consistency_score = 18
    elif variance_pct <= 30: consistency_score = 14
    elif variance_pct <= 40: consistency_score = 8
    elif variance_pct <= 50: consistency_score = 4
    else: consistency_score = 0

    final_score = savings_score + emi_score + buffer_score + consistency_score
    
    now = datetime.now(timezone.utc)
    period_start = (now - timedelta(days=90)).strftime("%d %b %Y")
    period_end = now.strftime("%d %b %Y")

    # Savings rate help text
    if sr_pct >= 35: sr_help = f"You save {sr_pct:.0f}% — outstanding discipline!"
    elif sr_pct >= 20: sr_help = f"You save {sr_pct:.0f}% — solid. Push toward 35% for max score."
    elif sr_pct >= 10: sr_help = f"You save {sr_pct:.0f}% — decent start. Target 20%+ for real progress."
    elif sr_pct > 0: sr_help = f"You save {sr_pct:.0f}% — every bit counts, but aim for 10%+."
    else: sr_help = "No savings detected. Review expenses and find areas to cut."

    # EMI load help text
    if emi_pct <= 20: emi_help = f"EMIs at {emi_pct:.0f}% — excellent, well within safe limits."
    elif emi_pct <= 30: emi_help = f"EMIs at {emi_pct:.0f}% — manageable, but try to stay under 20%."
    elif emi_pct <= 40: emi_help = f"EMIs at {emi_pct:.0f}% — getting heavy. Avoid new loans."
    elif emi_pct <= 50: emi_help = f"EMIs at {emi_pct:.0f}% — stressful. Prioritize debt repayment."
    else: emi_help = f"EMIs at {emi_pct:.0f}% — dangerously high! Consider debt consolidation."

    # Buffer help text
    if buffer_months >= 8: buf_help = f"{buffer_months:.1f} months — fortress-level safety net!"
    elif buffer_months >= 6: buf_help = f"{buffer_months:.1f} months — strong buffer. Push for 8+ months."
    elif buffer_months >= 3: buf_help = f"{buffer_months:.1f} months — decent. Standard advice is 6 months."
    elif buffer_months >= 1: buf_help = f"{buffer_months:.1f} months — risky. Build toward 3 months ASAP."
    else: buf_help = f"{buffer_months:.1f} months — critical! Any disruption could be damaging."

    # Consistency help text
    if variance_pct <= 5: con_help = f"Rock-steady income (±{variance_pct:.0f}% variance)."
    elif variance_pct <= 10: con_help = f"Very stable (±{variance_pct:.0f}%). Minor fluctuations are normal."
    elif variance_pct <= 20: con_help = f"Moderately stable (±{variance_pct:.0f}%). Consider building a larger buffer."
    elif variance_pct <= 30: con_help = f"Notable variance (±{variance_pct:.0f}%). Budget conservatively."
    else: con_help = f"Highly variable (±{variance_pct:.0f}%). Build a bigger safety net."

    return {
        "finalScore": final_score,
        "grade": _get_control_grade(final_score),
        "scorePeriod": {
            "start": period_start,
            "end": period_end,
            "label": f"{period_start} — {period_end}"
        },
        "breakdown": {
            "savingsRate": {
                "score": savings_score, "max": 25,
                "ratio": round(savings_ratio, 3),
                "pct": round(sr_pct, 1),
                "label": "Savings Rate",
                "help": sr_help
            },
            "emiLoad": {
                "score": emi_score, "max": 25,
                "ratio": round(emi_ratio, 3),
                "pct": round(emi_pct, 1),
                "label": "EMI Load",
                "help": emi_help
            },
            "safetyBuffer": {
                "score": buffer_score, "max": 25,
                "months": round(buffer_months, 1),
                "label": "Safety Buffer",
                "help": buf_help
            },
            "incomeConsistency": {
                "score": consistency_score, "max": 25,
                "variancePct": round(variance_pct, 1),
                "label": "Income Consistency",
                "help": con_help
            }
        },
        "metrics": {
            "monthlyIncome": round(monthly_income, 2),
            "monthlyExpenses": round(monthly_mandatory + monthly_discretionary, 2),
            "totalEMI": round(total_emi, 2),
            "availableFunds": round(effective_funds, 2),
            "liquidFunds": fund_breakdown["liquid"]["total"],
            "semiLiquidFunds": fund_breakdown["semiLiquid"]["total"]
        }
    }


SHOCK_SCENARIOS = [
    {"id": "job_loss", "title": "Job Loss", "icon": "alert-triangle", "description": "What if you lose your income for 3 months?", "impact_type": "income_loss", "months": 3},
    {"id": "medical", "title": "Medical Emergency", "icon": "heart-pulse", "description": "Sudden ₹5L medical expense", "impact_type": "lump_sum", "amount": 500000},
    {"id": "car_repair", "title": "Major Repair", "icon": "alert-circle", "description": "Unexpected ₹2L repair/replacement", "impact_type": "lump_sum", "amount": 200000},
    {"id": "emi_hike", "title": "EMI Rate Hike", "icon": "trending-up", "description": "All EMIs increase by 20%", "impact_type": "emi_hike", "pct": 0.20},
]


@router.post("/shock-test")
async def shock_test(request: Request):
    """Financial Shock Test - Simulate emergency scenarios and show impact."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    scenario_id = body.get("scenarioId", "job_loss")
    custom_amount = body.get("customAmount")
    
    # Custom scenario
    if custom_amount and custom_amount > 0:
        scenario = {"id": "custom", "title": "Custom Shock", "icon": "edit", "description": f"₹{fmt_py(custom_amount)} sudden expense", "impact_type": "lump_sum", "amount": custom_amount}
    else:
        scenario = next((s for s in SHOCK_SCENARIOS if s["id"] == scenario_id), SHOCK_SCENARIOS[0])

    user_filter = get_user_filter(user)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_income = await _get_monthly_income(user_filter)
    total_emi = await _get_total_emi(user_filter)
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 1

    current_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0

    # Calculate post-shock state
    if scenario["impact_type"] == "income_loss":
        months = scenario["months"]
        lost_income = monthly_income * months
        post_funds = max(effective_funds - lost_income, 0)
        post_daily = daily_expense
        impact_label = f"₹{fmt_py(lost_income)} income lost over {months} months"
    elif scenario["impact_type"] == "lump_sum":
        amt = scenario["amount"]
        post_funds = max(effective_funds - amt, 0)
        post_daily = daily_expense
        impact_label = f"₹{fmt_py(amt)} sudden expense"
    elif scenario["impact_type"] == "emi_hike":
        pct = scenario["pct"]
        extra_emi = total_emi * pct
        post_funds = effective_funds
        post_daily = (monthly_mandatory + extra_emi) / 30
        impact_label = f"EMIs up ₹{fmt_py(extra_emi)}/month"
    else:
        post_funds = effective_funds
        post_daily = daily_expense
        impact_label = "Unknown scenario"

    post_days = int(post_funds / post_daily) if post_daily > 0 else 0
    days_lost = current_days - post_days
    severity = "critical" if post_days < 30 else "warning" if post_days < 90 else "safe"

    return {
        "scenario": {k: v for k, v in scenario.items()},
        "current": {"survivalDays": current_days, "effectiveFunds": round(effective_funds)},
        "postShock": {"survivalDays": post_days, "effectiveFunds": round(post_funds)},
        "impact": {"daysLost": days_lost, "label": impact_label, "severity": severity},
        "tip": f"{'Build a bigger emergency fund urgently.' if severity == 'critical' else 'Consider increasing your liquid reserves.' if severity == 'warning' else 'Your finances can handle this shock well.'}"
    }


@router.get("/shock-scenarios")
async def get_shock_scenarios(request: Request):
    """Get available shock test scenarios."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"scenarios": SHOCK_SCENARIOS}


def fmt_py(n):
    if n >= 10000000: return f"{n/10000000:.1f}Cr"
    if n >= 100000: return f"{n/100000:.1f}L"
    if n >= 1000: return f"{n/1000:.0f}K"
    return str(round(n))


@router.get("/future-you")
async def future_you_score(request: Request):
    """12-month projection of financial metrics based on current trends."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    monthly_income = await _get_monthly_income(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    net_worth = fund_breakdown.get("netWorth", effective_funds) or effective_funds

    monthly_savings = monthly_income - monthly_mandatory - monthly_discretionary
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 1
    current_survival = int(effective_funds / daily_expense) if daily_expense > 0 else 0
    current_score = 0
    savings_rate = (monthly_savings / monthly_income) if monthly_income > 0 else 0
    debt_ratio = (total_emi / monthly_income) if monthly_income > 0 else 0
    current_score = min(int(savings_rate * 100), 25) + max(25 - int(debt_ratio * 50), 0) + min(int((effective_funds / monthly_mandatory * 4) if monthly_mandatory > 0 else 0), 25) + 18

    projections = []
    proj_funds = effective_funds
    proj_net_worth = net_worth
    for month in range(1, 13):
        proj_funds += max(monthly_savings, 0)
        proj_net_worth += max(monthly_savings, 0)
        proj_survival = int(proj_funds / daily_expense) if daily_expense > 0 else 0
        proj_buffer = proj_funds / monthly_mandatory if monthly_mandatory > 0 else 0
        proj_score = min(int(savings_rate * 100), 25) + max(25 - int(debt_ratio * 50), 0) + min(int(proj_buffer * 4), 25) + 18

        # Find stage
        proj_stage = "Exposed"
        for s in reversed(SURVIVAL_STAGES):
            if proj_survival >= s["min"]:
                proj_stage = s["name"]
                break

        projections.append({
            "month": month,
            "label": (datetime.now(timezone.utc) + timedelta(days=30 * month)).strftime("%b %Y"),
            "survivalDays": min(proj_survival, 9999),
            "score": min(proj_score, 100),
            "netWorth": round(proj_net_worth),
            "stage": proj_stage,
        })

    final = projections[-1]
    current_stage = "Exposed"
    for s in reversed(SURVIVAL_STAGES):
        if current_survival >= s["min"]:
            current_stage = s["name"]
            break

    return {
        "current": {
            "survivalDays": current_survival, "score": current_score,
            "netWorth": round(net_worth), "stage": current_stage,
            "monthlySavings": round(monthly_savings),
        },
        "projected": final,
        "projections": projections,
        "improvement": {
            "survivalDaysGain": final["survivalDays"] - current_survival,
            "scoreGain": final["score"] - current_score,
            "netWorthGain": final["netWorth"] - round(net_worth),
        },
        "tip": f"At your current savings of ₹{fmt_py(max(monthly_savings, 0))}/month, in 12 months you'll reach {final['stage']} with {final['survivalDays']} days runway."
    }


@router.get("/personality-history")
async def personality_history(request: Request):
    """Get personality evolution timeline."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")

    history = await db.user_personality_history.find(
        {"userId": user_id}, {"_id": 0}
    ).sort("date", -1).to_list(12)

    return {"history": history}


@router.post("/weekly-digest")
async def generate_weekly_digest(request: Request):
    """Generate and store weekly health digest notification."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")
    user_filter = get_user_filter(user)

    # Current metrics
    monthly_income = await _get_monthly_income(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 1
    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0
    savings_rate = ((monthly_income - monthly_mandatory - monthly_discretionary) / monthly_income * 100) if monthly_income > 0 else 0

    # Get last digest for comparison
    last_digest = await db.weekly_digests.find_one(
        {"userId": user_id}, {"_id": 0}, sort=[("createdAt", -1)]
    )

    changes = []
    if last_digest:
        prev_days = last_digest.get("survivalDays", 0)
        prev_rate = last_digest.get("savingsRate", 0)
        day_diff = survival_days - prev_days
        rate_diff = savings_rate - prev_rate
        if day_diff > 0: changes.append(f"Runway +{day_diff} days")
        elif day_diff < 0: changes.append(f"Runway {day_diff} days")
        if rate_diff > 2: changes.append(f"Savings rate +{rate_diff:.1f}%")
        elif rate_diff < -2: changes.append(f"Savings rate {rate_diff:.1f}%")

    summary = " | ".join(changes) if changes else "Metrics stable this week"

    # Store current snapshot
    now = datetime.now(timezone.utc)
    digest_doc = {
        "userId": user_id, "survivalDays": survival_days,
        "savingsRate": round(savings_rate, 1),
        "effectiveFunds": round(effective_funds),
        "createdAt": now.isoformat()
    }
    await db.weekly_digests.insert_one(digest_doc)

    # Create notification
    from routes.gamification import create_notification_and_cleanup
    import uuid
    await create_notification_and_cleanup({
        "id": str(uuid.uuid4()), "userId": user_id,
        "title": "Weekly Health Digest",
        "message": f"Runway: {survival_days}d | Savings: {savings_rate:.1f}% | {summary}",
        "type": "digest", "isRead": False, "badgeIcon": "bar-chart",
        "createdAt": now.isoformat()
    })

    return {"summary": summary, "survivalDays": survival_days, "savingsRate": round(savings_rate, 1), "changes": changes}



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
    weekly_emi = total_emi / get_weekly_multiplier()
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
    survival_days = int(effective_funds / daily_exp) if daily_exp > 0 else 0
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
    current_survival = int(effective_funds / daily_expense) if daily_expense > 0 else 0

    # Simulated scenario
    sim_income = monthly_income * (1 + income_change_pct / 100)
    sim_mandatory = monthly_mandatory * (1 + expense_change_pct / 100)
    sim_funds = effective_funds + extra_savings

    # If income still active, monthly net savings extend runway
    sim_daily_expense = sim_mandatory / 30 if sim_mandatory > 0 else 0
    sim_survival = int(sim_funds / sim_daily_expense) if sim_daily_expense > 0 else 0

    # Monthly net savings with new income/expense
    monthly_net = sim_income - sim_mandatory - monthly_discretionary

    # Project 12-month runway growth (or decline)
    projections = []
    running_funds = sim_funds
    for month in range(0, 13):
        days = int(running_funds / sim_daily_expense) if sim_daily_expense > 0 else 0
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
    """20-Personality Classification Engine — data-driven financial identity."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_id = user.get("user_id")

    # ─── GATHER ALL INPUT VARIABLES ───
    monthly_income = await _get_monthly_income(user_filter)
    monthly_mandatory = await _get_monthly_mandatory_expense(user_filter)
    monthly_discretionary = await _get_monthly_discretionary_spending(user_filter)
    total_emi = await _get_total_emi(user_filter)
    fund_breakdown = await _get_fund_breakdown(user_filter)
    effective_funds = fund_breakdown["effectiveTotal"]
    daily_expense = monthly_mandatory / 30 if monthly_mandatory > 0 else 1

    survival_days = int(effective_funds / daily_expense) if daily_expense > 0 else 0

    # Control score (inline calc to avoid circular call)
    savings_rate = ((monthly_income - monthly_mandatory - monthly_discretionary) / monthly_income) if monthly_income > 0 else 0
    debt_to_income = (total_emi / monthly_income) if monthly_income > 0 else 0
    discretionary_ratio = (monthly_discretionary / monthly_income) if monthly_income > 0 else 0

    # Control score from breakdown (simplified)
    sav_score = min(int(savings_rate * 100), 25)
    emi_score = max(25 - int(debt_to_income * 50), 0)
    buffer_months = effective_funds / monthly_mandatory if monthly_mandatory > 0 else 0
    buf_score = min(int(buffer_months * 4), 25)
    control_score = sav_score + emi_score + buf_score + 18  # +18 base consistency

    # Income growth & volatility from transactions (last 3 months)
    now = datetime.now(timezone.utc)
    income_history = []
    for i in range(3):
        m = (now - timedelta(days=30 * (i + 1)))
        month_key = m.strftime("%Y-%m")
        month_income = 0
        txns = await db.transactions.find({**user_filter, "type": "income", "date": {"$regex": f"^{month_key}"}}, {"_id": 0, "amount": 1}).to_list(500)
        for t in txns:
            month_income += abs(t.get("amount", 0))
        income_history.append(month_income)

    income_growth_rate = 0
    income_volatility = 0
    if len(income_history) >= 2 and income_history[-1] > 0:
        income_growth_rate = (income_history[0] - income_history[-1]) / income_history[-1]
    if len(income_history) >= 2:
        mean_inc = sum(income_history) / len(income_history) if income_history else 1
        if mean_inc > 0:
            variance = sum((x - mean_inc) ** 2 for x in income_history) / len(income_history)
            income_volatility = (variance ** 0.5) / mean_inc

    # Investment ratio & categories
    investments = await db.investments.find(user_filter, {"_id": 0, "currentValue": 1, "category": 1, "investmentType": 1}).to_list(1000)
    total_inv_value = sum(i.get("currentValue", 0) for i in investments)
    net_worth = fund_breakdown.get("netWorth", effective_funds + total_inv_value) or 1
    investment_ratio = total_inv_value / net_worth if net_worth > 0 else 0
    inv_categories = set(i.get("category") or i.get("investmentType", "Other") for i in investments)

    # Semi-liquid ratio
    semi_liquid_total = fund_breakdown.get("semiLiquid", {}).get("total", 0)
    semi_liquid_ratio = semi_liquid_total / net_worth if net_worth > 0 else 0

    # Income sources count
    income_sources = await db.income_sources.find(user_filter, {"_id": 0}).to_list(100)
    income_sources_count = len(income_sources) if income_sources else 1

    # Alert count this month
    current_month = now.strftime("%Y-%m")
    alert_count = await db.notifications.count_documents({
        "userId": user_id, "type": {"$in": ["behavior_alert", "alert", "warning"]},
        "createdAt": {"$regex": f"^{current_month}"}
    })

    # Debt reduction trend (6 months) — check if debt decreased
    debt_reduced_pct = 0
    # Alert trend — check if decreasing
    alert_decreasing = alert_count <= 1
    # Control score rising (simplified: score > 65 = rising)
    control_rising = control_score > 65
    # Discretionary decreased (simplified check)
    disc_decreased = discretionary_ratio < 0.30
    disc_stable = 0.15 <= discretionary_ratio <= 0.35

    # ─── 20-PERSONALITY CLASSIFICATION ENGINE ───
    PERSONALITIES = [
        # ADVANCED ZONE (17-20) — check first (highest level)
        {"id": 20, "name": "Sovereign", "zone": "Advanced", "color": "#3B82F6", "icon": "crown",
         "tagline": "Complete financial mastery — you've built an unshakable fortress.",
         "conditions": lambda: survival_days > 720 and control_score >= 85 and debt_to_income < 0.20 and savings_rate >= 0.30,
         "total_conds": 4, "check": lambda: sum([survival_days > 720, control_score >= 85, debt_to_income < 0.20, savings_rate >= 0.30])},
        {"id": 19, "name": "Financial Architect", "zone": "Advanced", "color": "#3B82F6", "icon": "building",
         "tagline": "You design financial systems — income flows, investments grow, risks managed.",
         "conditions": lambda: survival_days > 540 and control_score > 80 and income_sources_count >= 2 and alert_count == 0,
         "total_conds": 4, "check": lambda: sum([survival_days > 540, control_score > 80, income_sources_count >= 2, alert_count == 0])},
        {"id": 18, "name": "Risk Balancer", "zone": "Advanced", "color": "#3B82F6", "icon": "scale",
         "tagline": "Perfect balance of growth and safety — your portfolio is well-tuned.",
         "conditions": lambda: investment_ratio >= 0.50 and survival_days > 180 and 0.20 <= semi_liquid_ratio <= 0.40,
         "total_conds": 3, "check": lambda: sum([investment_ratio >= 0.50, survival_days > 180, 0.20 <= semi_liquid_ratio <= 0.40])},
        {"id": 17, "name": "Capital Guardian", "zone": "Advanced", "color": "#3B82F6", "icon": "shield",
         "tagline": "Your wealth is protected and growing — guardian of your financial future.",
         "conditions": lambda: survival_days > 365 and investment_ratio >= 0.40 and debt_to_income < 0.25,
         "total_conds": 3, "check": lambda: sum([survival_days > 365, investment_ratio >= 0.40, debt_to_income < 0.25])},
        # GROWTH ZONE (13-16)
        {"id": 16, "name": "Strategic Planner", "zone": "Growth", "color": "#22C55E", "icon": "compass",
         "tagline": "Every financial move is calculated — strategy is your superpower.",
         "conditions": lambda: survival_days > 240 and control_score > 75 and disc_stable and debt_to_income < 0.30,
         "total_conds": 4, "check": lambda: sum([survival_days > 240, control_score > 75, disc_stable, debt_to_income < 0.30])},
        {"id": 15, "name": "Income Multiplier", "zone": "Growth", "color": "#22C55E", "icon": "layers",
         "tagline": "Multiple income streams fuel your growth — you don't depend on one source.",
         "conditions": lambda: income_sources_count >= 3 and income_growth_rate >= 0.10,
         "total_conds": 2, "check": lambda: sum([income_sources_count >= 3, income_growth_rate >= 0.10])},
        {"id": 14, "name": "Diversifier", "zone": "Growth", "color": "#22C55E", "icon": "pie-chart",
         "tagline": "Spread across asset classes — diversification is your shield.",
         "conditions": lambda: len(inv_categories) >= 3 and investment_ratio >= 0.35,
         "total_conds": 2, "check": lambda: sum([len(inv_categories) >= 3, investment_ratio >= 0.35])},
        {"id": 13, "name": "Wealth Builder", "zone": "Growth", "color": "#22C55E", "icon": "trending-up",
         "tagline": "Investments growing, savings solid — you're actively building wealth.",
         "conditions": lambda: investment_ratio >= 0.30 and survival_days > 180 and control_score >= 70,
         "total_conds": 3, "check": lambda: sum([investment_ratio >= 0.30, survival_days > 180, control_score >= 70])},
        # CONTROL ZONE (9-12)
        {"id": 12, "name": "Score Climber", "zone": "Control", "color": "#EAB308", "icon": "arrow-up-right",
         "tagline": "Your financial score is on a rocket — momentum is everything.",
         "conditions": lambda: control_score >= 65 and control_rising,
         "total_conds": 2, "check": lambda: sum([control_score >= 65, control_rising])},
        {"id": 11, "name": "Silent Saver", "zone": "Control", "color": "#EAB308", "icon": "piggy-bank",
         "tagline": "Quietly stacking money — no drama, just disciplined growth.",
         "conditions": lambda: savings_rate >= 0.30 and income_volatility < 0.15 and discretionary_ratio < 0.25,
         "total_conds": 3, "check": lambda: sum([savings_rate >= 0.30, income_volatility < 0.15, discretionary_ratio < 0.25])},
        {"id": 10, "name": "Stability Seeker", "zone": "Control", "color": "#EAB308", "icon": "anchor",
         "tagline": "Safe and steady — you prioritize security over aggressive growth.",
         "conditions": lambda: survival_days > 150 and investment_ratio < 0.20 and savings_rate >= 0.25,
         "total_conds": 3, "check": lambda: sum([survival_days > 150, investment_ratio < 0.20, savings_rate >= 0.25])},
        {"id": 9, "name": "Structured Controller", "zone": "Control", "color": "#EAB308", "icon": "sliders",
         "tagline": "Everything is tracked, planned, and optimized — financial order achieved.",
         "conditions": lambda: 120 <= survival_days <= 240 and control_score >= 70 and alert_count <= 1,
         "total_conds": 3, "check": lambda: sum([120 <= survival_days <= 240, control_score >= 70, alert_count <= 1])},
        # STABILIZING ZONE (5-8)
        {"id": 8, "name": "Debt Warrior", "zone": "Stabilizing", "color": "#F97316", "icon": "swords",
         "tagline": "Fighting debt with discipline — every payment is a victory.",
         "conditions": lambda: debt_to_income > 0.30 and debt_to_income < 0.60,
         "total_conds": 2, "check": lambda: sum([debt_to_income > 0.30, debt_to_income < 0.60])},
        {"id": 7, "name": "Expense Controller", "zone": "Stabilizing", "color": "#F97316", "icon": "scissors",
         "tagline": "Cutting waste, boosting control — you're tightening the financial ship.",
         "conditions": lambda: disc_decreased and control_rising,
         "total_conds": 2, "check": lambda: sum([disc_decreased, control_rising])},
        {"id": 6, "name": "Buffer Builder", "zone": "Stabilizing", "color": "#F97316", "icon": "shield-plus",
         "tagline": "Building your safety cushion — every saved rupee adds to your runway.",
         "conditions": lambda: 60 <= survival_days <= 150 and savings_rate >= 0.20 and debt_to_income < 0.40,
         "total_conds": 3, "check": lambda: sum([60 <= survival_days <= 150, savings_rate >= 0.20, debt_to_income < 0.40])},
        {"id": 5, "name": "Recovering Planner", "zone": "Stabilizing", "color": "#F97316", "icon": "refresh-cw",
         "tagline": "Getting back on track — you're rebuilding with a plan.",
         "conditions": lambda: 30 <= survival_days <= 90 and 50 <= control_score <= 65 and alert_decreasing,
         "total_conds": 3, "check": lambda: sum([30 <= survival_days <= 90, 50 <= control_score <= 65, alert_decreasing])},
        # SURVIVAL ZONE (1-4)
        {"id": 4, "name": "Lifestyle Inflator", "zone": "Survival", "color": "#EF4444", "icon": "flame",
         "tagline": "Income is rising but lifestyle is rising faster — the silent trap.",
         "conditions": lambda: income_growth_rate > 0.15 and discretionary_ratio > 0.40 and savings_rate < 0.15,
         "total_conds": 3, "check": lambda: sum([income_growth_rate > 0.15, discretionary_ratio > 0.40, savings_rate < 0.15])},
        {"id": 3, "name": "EMI Trapped", "zone": "Survival", "color": "#EF4444", "icon": "lock",
         "tagline": "EMIs have you locked — reducing debt is the only way to breathe.",
         "conditions": lambda: debt_to_income >= 0.60 and survival_days < 60,
         "total_conds": 2, "check": lambda: sum([debt_to_income >= 0.60, survival_days < 60])},
        {"id": 2, "name": "Drifter", "zone": "Survival", "color": "#EF4444", "icon": "wind",
         "tagline": "No direction yet — small consistent steps will change everything.",
         "conditions": lambda: survival_days < 45 and control_score < 50 and savings_rate < 0.10 and debt_to_income <= 0.50,
         "total_conds": 4, "check": lambda: sum([survival_days < 45, control_score < 50, savings_rate < 0.10, debt_to_income <= 0.50])},
        {"id": 1, "name": "Firefighter", "zone": "Survival", "color": "#EF4444", "icon": "alert-triangle",
         "tagline": "Putting out financial fires daily — it's time to build a firewall.",
         "conditions": lambda: survival_days < 30 and debt_to_income > 0.50 and alert_count >= 3,
         "total_conds": 3, "check": lambda: sum([survival_days < 30, debt_to_income > 0.50, alert_count >= 3])},
    ]

    # ─── EVALUATE: highest-level match first, with confidence ───
    primary = None
    secondary = None
    primary_confidence = 0

    for p in PERSONALITIES:
        matched = p["check"]()
        total = p["total_conds"]
        confidence = round((matched / total) * 100) if total > 0 else 0

        if confidence >= 70:
            if primary is None:
                primary = {**p, "confidence": confidence, "matched": matched}
            elif secondary is None:
                secondary = {**p, "confidence": confidence, "matched": matched}
                break

    # Fallback: if no 70%+ match, pick best partial match
    if primary is None:
        best_conf = 0
        for p in PERSONALITIES:
            matched = p["check"]()
            total = p["total_conds"]
            conf = round((matched / total) * 100) if total > 0 else 0
            if conf > best_conf:
                best_conf = conf
                primary = {**p, "confidence": conf, "matched": matched}

    if primary is None:
        primary = {**PERSONALITIES[-1], "confidence": 50, "matched": 1}

    # ─── SPENDING DNA (kept from old system) ───
    total_expenses = monthly_mandatory + monthly_discretionary
    needs_ratio = (monthly_mandatory / monthly_income * 100) if monthly_income > 0 else 0
    wants_ratio = (monthly_discretionary / monthly_income * 100) if monthly_income > 0 else 0
    emi_ratio = (total_emi / monthly_income * 100) if monthly_income > 0 else 0
    savings_pct = max(savings_rate * 100, 0)

    spending_dna = {
        "needs": round(needs_ratio, 1),
        "wants": round(wants_ratio, 1),
        "savings": round(savings_pct, 1),
        "emi": round(emi_ratio, 1),
    }

    # Top expense categories
    expenses = await db.expenses.find(user_filter, {"_id": 0, "category": 1, "expectedAmount": 1, "frequency": 1}).to_list(1000)
    cat_totals = {}
    for e in expenses:
        cat = e.get("category", "Other")
        amt = _normalize_monthly(e.get("expectedAmount", 0), e.get("frequency", "Monthly"))
        cat_totals[cat] = cat_totals.get(cat, 0) + amt
    top_expense_cats = sorted(cat_totals.items(), key=lambda x: -x[1])[:3]

    # Strengths & blind spots based on input vars
    strengths = []
    blind_spots = []
    if savings_rate >= 0.25: strengths.append(f"Saving {savings_rate*100:.0f}% of income — strong discipline")
    if debt_to_income < 0.20: strengths.append("Low debt burden — financial flexibility")
    if survival_days > 180: strengths.append(f"{survival_days} days runway — solid safety net")
    if investment_ratio >= 0.30: strengths.append(f"{investment_ratio*100:.0f}% in investments — wealth growing")
    if discretionary_ratio > 0.35: blind_spots.append(f"Lifestyle spending at {discretionary_ratio*100:.0f}% — consider cuts")
    if debt_to_income > 0.40: blind_spots.append(f"EMIs at {debt_to_income*100:.0f}% of income — debt pressure high")
    if savings_rate < 0.15: blind_spots.append(f"Only saving {max(savings_rate*100,0):.0f}% — target 20%+")
    if survival_days < 90: blind_spots.append(f"Only {survival_days} days runway — build emergency fund")
    if not strengths: strengths.append("Consistently tracking finances")
    if not blind_spots: blind_spots.append("No major red flags — keep it up!")

    # Store to DB
    await db.user_personality.update_one(
        {"userId": user_id},
        {"$set": {
            "userId": user_id, "primary_type": primary["name"],
            "secondary_type": secondary["name"] if secondary else None,
            "confidence_score": primary["confidence"],
            "last_updated": now.isoformat(),
        }}, upsert=True
    )

    # Store monthly history (one entry per month)
    current_month = now.strftime("%Y-%m")
    await db.user_personality_history.update_one(
        {"userId": user_id, "month": current_month},
        {"$set": {
            "userId": user_id, "month": current_month,
            "date": now.isoformat(),
            "personality": primary["name"], "personalityId": primary["id"],
            "zone": primary["zone"], "confidence": primary["confidence"],
            "survivalDays": survival_days, "controlScore": control_score,
        }}, upsert=True
    )

    return {
        "personality": primary["name"],
        "personalityId": primary["id"],
        "zone": primary["zone"],
        "zoneColor": primary["color"],
        "icon": primary["icon"],
        "tagline": primary["tagline"],
        "confidence": primary["confidence"],
        "secondary": secondary["name"] if secondary else None,
        "secondaryId": secondary["id"] if secondary else None,
        "spendingDNA": spending_dna,
        "traits": [],
        "strengths": strengths[:4],
        "blindSpots": blind_spots[:4],
        "topExpenseCategories": [{"category": c, "amount": round(a, 0)} for c, a in top_expense_cats],
        "metrics": {
            "monthlyIncome": round(monthly_income, 0),
            "totalExpenses": round(total_expenses, 0),
            "savings": round(max(monthly_income - total_expenses, 0), 0),
            "investments": len(investments),
            "survivalDays": survival_days,
            "controlScore": control_score,
            "savingsRate": round(savings_rate * 100, 1),
            "debtToIncome": round(debt_to_income * 100, 1),
        },
    }


def _get_pattern_tagline(personality: str) -> str:
    return ""


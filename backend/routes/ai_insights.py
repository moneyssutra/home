"""
Rule-based Financial Insights Engine for MoneySutra.
Replaces AI/GPT insights with deterministic, explainable, RBI-safe rules.
Uses the centralized FinancialSnapshot from financial_engine.py.
"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import logging

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter
from services.financial_engine import build_snapshot, FinancialSnapshot

router = APIRouter(prefix="/ai", tags=["Financial Insights"])
logger = logging.getLogger(__name__)


# ───────────────────────────────────────────
# FINANCIAL LEVELS
# ───────────────────────────────────────────
LEVELS = [
    {"name": "Survival",   "min_score": 0,  "max_score": 20,  "color": "#EF4444", "description": "Expenses exceed income, no safety net"},
    {"name": "Stability",  "min_score": 21, "max_score": 40,  "color": "#F59E0B", "description": "Basic needs met, building a foundation"},
    {"name": "Security",   "min_score": 41, "max_score": 60,  "color": "#3B82F6", "description": "Emergency fund in place, debts under control"},
    {"name": "Growth",     "min_score": 61, "max_score": 80,  "color": "#10B981", "description": "Investments growing, wealth building actively"},
    {"name": "Freedom",    "min_score": 81, "max_score": 100, "color": "#8B5CF6", "description": "Financial independence within reach"},
]


def calculate_financial_score(snap: FinancialSnapshot) -> int:
    """Calculate 0-100 financial health score from snapshot metrics."""
    score = 0

    # 1. Savings Rate (max 25 pts)
    sr = snap.savings_rate
    if sr >= 30:
        score += 25
    elif sr >= 20:
        score += 20
    elif sr >= 10:
        score += 12
    elif sr > 0:
        score += 5

    # 2. Emergency Fund (max 20 pts)
    ef_months = snap.emergency_fund_months
    if ef_months >= 6:
        score += 20
    elif ef_months >= 3:
        score += 12
    elif ef_months >= 1:
        score += 5

    # 3. Debt Management (max 20 pts)
    emi_ratio = snap.emi_to_income_ratio
    dta_ratio = snap.debt_to_asset_ratio
    if emi_ratio == 0 and snap.total_liabilities == 0:
        score += 20
    elif emi_ratio < 30 and dta_ratio < 0.4:
        score += 15
    elif emi_ratio < 50:
        score += 8
    elif emi_ratio < 70:
        score += 3

    # 4. Investment Health (max 20 pts)
    inv_ratio = (snap.total_investments / snap.annual_income * 100) if snap.annual_income > 0 else 0
    if inv_ratio >= 200:
        score += 20
    elif inv_ratio >= 100:
        score += 15
    elif inv_ratio >= 50:
        score += 10
    elif inv_ratio > 0:
        score += 5

    # 5. Insurance Coverage (max 15 pts)
    has_health = snap.health_insurance_coverage > 0
    life_adequate = snap.life_insurance_coverage >= snap.annual_income * 10 if snap.annual_income > 0 else False
    if has_health and life_adequate:
        score += 15
    elif has_health:
        score += 8
    elif snap.total_insurance_coverage > 0:
        score += 3

    return min(score, 100)


def get_level(score: int) -> dict:
    """Get financial level from score."""
    for level in LEVELS:
        if level["min_score"] <= score <= level["max_score"]:
            return level
    return LEVELS[0]


# ───────────────────────────────────────────
# CORE RULE ENGINE
# ───────────────────────────────────────────
def generate_insights(snap: FinancialSnapshot) -> list:
    """Generate deterministic, explainable financial insights."""
    insights = []

    monthly_income = snap.monthly_income
    monthly_expenses = snap.monthly_expenses
    savings = snap.monthly_savings
    savings_rate = snap.savings_rate
    total_investments = snap.total_investments
    total_liabilities = snap.total_liabilities
    net_worth = snap.net_worth
    emi_ratio = snap.emi_to_income_ratio
    ef_months = snap.emergency_fund_months

    # ─── RULE 1: Income Check ───
    if monthly_income == 0:
        insights.append({
            "type": "critical",
            "icon": "AlertTriangle",
            "title": "No Income Detected",
            "description": "Add your income sources to get accurate financial insights.",
            "priority": "critical",
            "actionable": True,
            "action_text": "Add Income",
            "action_link": "/add-income",
        })
        return sorted(insights, key=lambda x: _priority_order(x["priority"]))

    # ─── RULE 2: Expense vs Income ───
    expense_ratio = monthly_expenses / monthly_income if monthly_income > 0 else 0
    if expense_ratio > 1:
        overspend = monthly_expenses - monthly_income
        insights.append({
            "type": "critical",
            "icon": "TrendingDown",
            "title": "Overspending Alert",
            "description": f"Expenses exceed income by {_fmt(overspend)}/month. Cut {_fmt(overspend)} to break even.",
            "priority": "critical",
            "actionable": True,
            "action_text": "Review Expenses",
            "action_link": "/my-expenses",
        })
    elif expense_ratio > 0.7:
        target_cut = monthly_expenses - (monthly_income * 0.7)
        insights.append({
            "type": "warning",
            "icon": "AlertCircle",
            "title": "High Spending",
            "description": f"Spending {expense_ratio*100:.0f}% of income. Reduce by {_fmt(target_cut)}/month to reach the 70% mark.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Expenses",
            "action_link": "/my-expenses",
        })
    else:
        insights.append({
            "type": "good",
            "icon": "CheckCircle",
            "title": "Expenses Under Control",
            "description": f"Spending {expense_ratio*100:.0f}% of income. Well within healthy limits.",
            "priority": "low",
            "actionable": False,
        })

    # ─── RULE 3: Savings Rate ───
    if savings <= 0:
        insights.append({
            "type": "critical",
            "icon": "AlertTriangle",
            "title": "Zero Savings",
            "description": "No savings this month. Reduce discretionary expenses immediately.",
            "priority": "critical",
            "actionable": True,
            "action_text": "Cut Expenses",
            "action_link": "/my-expenses",
        })
    elif savings_rate < 20:
        gap = (monthly_income * 0.2) - savings
        insights.append({
            "type": "warning",
            "icon": "PiggyBank",
            "title": "Low Savings Rate",
            "description": f"Saving {savings_rate:.0f}%. Save {_fmt(gap)} more to reach the 20% benchmark.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Budget",
            "action_link": "/my-expenses",
        })
    else:
        insights.append({
            "type": "good",
            "icon": "TrendingUp",
            "title": "Healthy Savings",
            "description": f"Saving {savings_rate:.0f}% of income ({_fmt(savings)}/month). Keep it up!",
            "priority": "low",
            "actionable": False,
        })

    # ─── RULE 4: Emergency Fund ───
    if ef_months < 1:
        target = monthly_expenses * 6
        current_ef = ef_months * monthly_expenses
        gap = target - current_ef
        insights.append({
            "type": "critical",
            "icon": "Shield",
            "title": "No Emergency Fund",
            "description": f"Build {_fmt(gap)} in liquid savings for a 6-month safety net.",
            "priority": "critical",
            "actionable": True,
            "action_text": "Plan Fund",
            "action_link": "/my-goals",
        })
    elif ef_months < 3:
        gap = (monthly_expenses * 6) - (ef_months * monthly_expenses)
        insights.append({
            "type": "warning",
            "icon": "Shield",
            "title": "Emergency Fund Low",
            "description": f"{ef_months:.1f} months covered. Add {_fmt(gap)} to reach 6 months.",
            "priority": "high",
            "actionable": True,
            "action_text": "Grow Fund",
            "action_link": "/my-goals",
        })
    elif ef_months >= 6:
        insights.append({
            "type": "good",
            "icon": "ShieldCheck",
            "title": "Emergency Fund Solid",
            "description": f"{ef_months:.1f} months of expenses covered. You're well protected.",
            "priority": "low",
            "actionable": False,
        })

    # ─── RULE 5: Investment Health ───
    if total_investments == 0:
        insights.append({
            "type": "warning",
            "icon": "TrendingUp",
            "title": "Start Investing",
            "description": "No investments found. Even small SIPs build wealth over time.",
            "priority": "high",
            "actionable": True,
            "action_text": "Add Investment",
            "action_link": "/add-investment",
        })
    elif snap.annual_income > 0:
        inv_ratio = total_investments / snap.annual_income
        if inv_ratio < 1:
            target = snap.annual_income - total_investments
            insights.append({
                "type": "info",
                "icon": "BarChart3",
                "title": "Grow Investments",
                "description": f"Investments at {inv_ratio*100:.0f}% of annual income. Add {_fmt(target)} to reach 1x.",
                "priority": "medium",
                "actionable": True,
                "action_text": "View Portfolio",
                "action_link": "/my-investments",
            })
        else:
            insights.append({
                "type": "good",
                "icon": "BarChart3",
                "title": "Strong Portfolio",
                "description": f"Investments at {inv_ratio:.1f}x annual income. Wealth compounding nicely.",
                "priority": "low",
                "actionable": False,
            })

    # ─── RULE 6: Loan / Debt Burden ───
    if total_liabilities > 0:
        if emi_ratio > 50:
            target_emi = monthly_income * 0.4
            excess = snap.total_emi - target_emi
            insights.append({
                "type": "critical",
                "icon": "AlertTriangle",
                "title": "Debt Overload",
                "description": f"EMIs consume {emi_ratio:.0f}% of income. Reduce EMIs by {_fmt(excess)}/month.",
                "priority": "critical",
                "actionable": True,
                "action_text": "View Loans",
                "action_link": "/my-loans",
            })
        elif emi_ratio > 30:
            insights.append({
                "type": "warning",
                "icon": "CreditCard",
                "title": "High EMI Load",
                "description": f"EMIs at {emi_ratio:.0f}% of income. Aim to bring it under 30%.",
                "priority": "high",
                "actionable": True,
                "action_text": "Plan Repayment",
                "action_link": "/my-loans",
            })
        elif emi_ratio > 0:
            insights.append({
                "type": "info",
                "icon": "Wallet",
                "title": "Active Loans",
                "description": f"EMIs at {emi_ratio:.0f}% of income. Manageable — keep tracking.",
                "priority": "low",
                "actionable": True,
                "action_text": "View Loans",
                "action_link": "/my-loans",
            })

    # ─── RULE 7: Insurance Coverage ───
    if snap.health_insurance_coverage == 0:
        insights.append({
            "type": "critical",
            "icon": "Heart",
            "title": "No Health Insurance",
            "description": "Medical emergencies can drain savings. Get health cover immediately.",
            "priority": "critical",
            "actionable": True,
            "action_text": "Add Insurance",
            "action_link": "/add-insurance?type=Health+Insurance",
        })

    if snap.annual_income > 0 and snap.life_insurance_coverage < snap.annual_income * 10:
        needed = snap.annual_income * 10 - snap.life_insurance_coverage
        insights.append({
            "type": "warning",
            "icon": "ShieldAlert",
            "title": "Life Cover Gap",
            "description": f"Life cover should be 10x annual income. Gap of {_fmt(needed)}.",
            "priority": "high",
            "actionable": True,
            "action_text": "Add Life Cover",
            "action_link": "/add-insurance?type=Term+Insurance",
        })

    # ─── RULE 8: Credit Utilization ───
    cu = snap.credit_utilization
    if cu > 70:
        insights.append({
            "type": "critical",
            "icon": "CreditCard",
            "title": "High Credit Usage",
            "description": f"Using {cu:.0f}% of credit limit. Keep below 30% for healthy credit score.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Cards",
            "action_link": "/credit-cards-experimental",
        })

    # ─── RULE 9: Loan Given Risk ───
    loan_given = snap.loan_given_total
    total_portfolio = snap.total_assets + snap.total_investments + snap.liquid_balance
    if total_portfolio > 0 and loan_given > total_portfolio * 0.25:
        insights.append({
            "type": "warning",
            "icon": "AlertCircle",
            "title": "High Lending Exposure",
            "description": f"Loans given ({_fmt(loan_given)}) exceed 25% of total portfolio. Diversify.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Loans Given",
            "action_link": "/my-investments",
        })

    # ─── RULE 10: Overall Health ───
    if savings > 0 and total_investments > 0 and expense_ratio < 0.7 and ef_months >= 3:
        insights.append({
            "type": "success",
            "icon": "Star",
            "title": "Financially Strong",
            "description": "You're saving, investing, and protected. Stay the course!",
            "priority": "low",
            "actionable": False,
        })

    # Sort by priority: critical > high > medium > low
    return sorted(insights, key=lambda x: _priority_order(x["priority"]))


# ───────────────────────────────────────────
# HELPERS
# ───────────────────────────────────────────
def _priority_order(priority: str) -> int:
    return {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 2}.get(priority, 4)


def _fmt(amount: float) -> str:
    """Format amount in Indian notation (L/Cr)."""
    if amount < 0:
        return f"-{_fmt(abs(amount))}"
    if amount >= 1_00_00_000:
        return f"\u20b9{amount/1_00_00_000:.1f}Cr"
    if amount >= 1_00_000:
        return f"\u20b9{amount/1_00_000:.1f}L"
    if amount >= 1000:
        return f"\u20b9{amount/1000:.1f}K"
    return f"\u20b9{amount:,.0f}"


# ───────────────────────────────────────────
# API ROUTE
# ───────────────────────────────────────────
@router.get("/insights")
async def get_insights(request: Request):
    """Return rule-based financial insights + financial level."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)

    try:
        snap = await build_snapshot(db, user_filter)
        insights = generate_insights(snap)
        score = calculate_financial_score(snap)
        level = get_level(score)

        return {
            "insights": insights,
            "financial_level": {
                "score": score,
                "level": level["name"],
                "color": level["color"],
                "description": level["description"],
                "next_level": _next_level(score),
            },
            "summary": {
                "monthly_income": round(snap.monthly_income, 2),
                "monthly_expenses": round(snap.monthly_expenses, 2),
                "savings_rate": round(snap.savings_rate, 1),
                "net_worth": round(snap.net_worth, 2),
                "emergency_months": round(snap.emergency_fund_months, 1),
            },
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _next_level(score: int) -> dict:
    """Get info about the next level to unlock."""
    for i, level in enumerate(LEVELS):
        if level["min_score"] <= score <= level["max_score"]:
            if i < len(LEVELS) - 1:
                nxt = LEVELS[i + 1]
                return {"name": nxt["name"], "points_needed": nxt["min_score"] - score, "color": nxt["color"]}
            return {"name": "Max Level", "points_needed": 0, "color": level["color"]}
    return {"name": "Unknown", "points_needed": 0, "color": "#94A3B8"}

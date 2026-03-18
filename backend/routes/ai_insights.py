"""AI Insights routes - AI-powered financial insights from server.py."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import os
import logging

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/ai", tags=["AI Insights"])
logger = logging.getLogger(__name__)


async def generate_ai_insights_internal(financial_data: dict) -> list:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return get_fallback_insights_internal(financial_data)

    summary = f"""
    Financial Summary:
    - Total Net Worth: \u20b9{financial_data.get('net_worth', 0):,.0f}
    - Monthly Income: \u20b9{financial_data.get('monthly_income', 0):,.0f}
    - Monthly Expenses: \u20b9{financial_data.get('monthly_expenses', 0):,.0f}
    - Monthly Balance: \u20b9{financial_data.get('monthly_savings', 0):,.0f}
    - Total Assets: \u20b9{financial_data.get('total_assets', 0):,.0f}
    - Total Investments: \u20b9{financial_data.get('total_investments', 0):,.0f}
    - Total Liabilities: \u20b9{financial_data.get('total_liabilities', 0):,.0f}
    - Liquid Balance (Bank Accounts): \u20b9{financial_data.get('liquid_balance', 0):,.0f}
    - FD/RD Balance: \u20b9{financial_data.get('fd_rd_balance', 0):,.0f}
    - Liquid Investments (marked): \u20b9{financial_data.get('liquid_investments', 0):,.0f}
    - {financial_data.get('emergency_fund_goal_info', 'No Emergency Fund goal set')}
    - Total Emergency Fund Available: \u20b9{financial_data.get('emergency_fund', 0):,.0f}
    - Active Goals: {financial_data.get('active_goals', 0)}
    - Savings Rate: {financial_data.get('savings_rate', 0):.1f}%
    - Top Expense Categories: {financial_data.get('top_expenses', 'N/A')}

    Insurance Coverage:
    - {financial_data.get('insurance_summary', 'No insurance data')}
    - Insurance Gaps: {financial_data.get('insurance_gaps', 'Unknown')}
    """
    system_prompt = """You are a smart financial advisor AI. Analyze the user's financial data and provide 4-5 personalized, actionable insights.

    IMPORTANT: Always include at least one insurance-related insight if there are coverage gaps or if health insurance is missing.

    Return ONLY a valid JSON array with objects containing:
    - type: "spending", "savings", "goal", "alert", "trend", or "insurance"
    - icon: single emoji
    - title: max 6 words
    - description: max 25 words, practical advice
    - priority: "high", "medium", or "low"
    - actionable: boolean
    - action_text: button text if actionable
    - action_link: "/my-expenses", "/my-income", "/my-goals", "/my-investments", "/my-loans", "/my-insurance", or "/portfolio"

    No markdown, no explanation - ONLY the JSON array.
    IMPORTANT: Use Indian number format - \u20b9 symbol with Lakhs (L) and Crores (Cr). Example: \u20b970L, \u20b92.3Cr. Never use M (millions)."""

    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"insights-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")
        user_message = UserMessage(text=f"Analyze this financial data:\n{summary}")
        response = await chat.send_message(user_message)

        import json
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        return json.loads(clean_response)
    except Exception as e:
        logger.error(f"AI Insights Error: {str(e)}")
        return get_fallback_insights_internal(financial_data)


def get_fallback_insights_internal(data: dict) -> list:
    insights = []
    savings_rate = data.get('savings_rate', 0)
    if savings_rate > 30:
        insights.append({"type": "trend", "icon": "\U0001f389", "title": "Excellent Savings!", "description": f"You're saving {savings_rate:.0f}% of income. Great financial discipline!", "priority": "low", "actionable": False})
    elif savings_rate < 10 and savings_rate >= 0:
        insights.append({"type": "alert", "icon": "\u26a0\ufe0f", "title": "Low Savings Alert", "description": f"Only {savings_rate:.0f}% savings rate. Review your expenses to save more.", "priority": "high", "actionable": True, "action_text": "View Expenses", "action_link": "/my-expenses"})
    if data.get('total_liabilities', 0) > data.get('emergency_fund', data.get('liquid_balance', 0)) * 2:
        insights.append({"type": "alert", "icon": "\U0001f4b3", "title": "High Debt Ratio", "description": "Liabilities exceed 2x your liquid funds. Focus on debt reduction.", "priority": "high", "actionable": True, "action_text": "View Loans", "action_link": "/my-loans"})
    if data.get('active_goals', 0) > 0:
        insights.append({"type": "goal", "icon": "\U0001f3af", "title": "Goals In Progress", "description": f"You have {data.get('active_goals')} active goals. Keep contributing!", "priority": "medium", "actionable": True, "action_text": "View Goals", "action_link": "/my-goals"})
    else:
        insights.append({"type": "savings", "icon": "\U0001f4a1", "title": "Set Financial Goals", "description": "Create goals for better financial planning and motivation.", "priority": "medium", "actionable": True, "action_text": "Add Goal", "action_link": "/my-goals"})
    if not data.get('has_health_insurance', True):
        insights.append({"type": "insurance", "icon": "\U0001f3e5", "title": "Get Health Insurance", "description": "No health insurance found. Medical emergencies can drain savings quickly.", "priority": "high", "actionable": True, "action_text": "Add Insurance", "action_link": "/my-insurance"})
    elif data.get('life_coverage', 0) < data.get('monthly_income', 0) * 120:
        insights.append({"type": "insurance", "icon": "\U0001f6e1\ufe0f", "title": "Increase Life Cover", "description": "Life cover should be 10x annual income. Consider term insurance.", "priority": "medium", "actionable": True, "action_text": "View Insurance", "action_link": "/my-insurance"})
    # Loan Given insights
    loan_given_total = data.get('loan_given_outstanding', 0)
    total_assets_val = data.get('total_assets', 0) + data.get('total_investments', 0) + data.get('liquid_balance', 0)
    if total_assets_val > 0 and loan_given_total > total_assets_val * 0.25:
        insights.append({"type": "alert", "icon": "\u26a0\ufe0f", "title": "High Personal Lending Exposure", "description": f"Loans given ({loan_given_total:,.0f}) exceed 25% of your total assets. Consider diversifying.", "priority": "high", "actionable": True, "action_text": "View Investments", "action_link": "/my-investments"})
    if data.get('loan_given_at_risk', 0) > 0:
        insights.append({"type": "alert", "icon": "\u26a0\ufe0f", "title": "Recovery Risk Detected", "description": f"₹{data.get('loan_given_at_risk', 0):,.0f} in loans given are at default risk (90+ days without repayment).", "priority": "high", "actionable": True, "action_text": "Check Loans", "action_link": "/my-investments"})
    return insights


@router.get("/insights")
async def get_ai_insights(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year

    try:
        incomes = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
        monthly_income = 0
        for income in incomes:
            amount = income.get('expectedAmount', 0)
            freq = income.get('frequency', 'Monthly')
            if freq == 'Daily': monthly_income += amount * 30
            elif freq == 'Weekly': monthly_income += amount * 4
            elif freq == 'Monthly': monthly_income += amount
            elif freq == 'Quarterly':
                if current_month in [1, 4, 7, 10]: monthly_income += amount
            elif freq == 'Half-Yearly':
                if current_month in [1, 7]: monthly_income += amount
            elif freq == 'Yearly':
                mm = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
                if mm.get(income.get('selectedMonth','')) == current_month: monthly_income += amount
            else: monthly_income += amount

        other_incomes = await db.other_income.find(user_filter, {"_id": 0}).to_list(1000)
        for oi in other_incomes:
            amount = oi.get('amount', 0)
            freq = oi.get('frequency', 'One-Time')
            if freq == 'Monthly': monthly_income += amount
            elif freq == 'One-Time':
                dr = oi.get('dateReceived', '')
                if dr:
                    try:
                        d = datetime.fromisoformat(dr).date()
                        if d.month == current_month and d.year == current_year: monthly_income += amount
                    except (ValueError, TypeError): pass

        expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
        monthly_expenses = 0
        expense_by_category = {}
        for expense in expenses:
            amount = expense.get('expectedAmount', 0)
            freq = expense.get('frequency', 'Monthly')
            cat = expense.get('category', 'Other')
            ea = 0
            if freq == 'Daily': ea = amount * 30
            elif freq == 'Weekly': ea = amount * 4
            elif freq == 'Monthly': ea = amount
            elif freq == 'Quarterly':
                if current_month in [1, 4, 7, 10]: ea = amount
            elif freq == 'Half-Yearly':
                if current_month in [1, 7]: ea = amount
            elif freq == 'Yearly':
                mm = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
                if mm.get(expense.get('selectedMonth','')) == current_month: ea = amount
            else: ea = amount
            monthly_expenses += ea
            expense_by_category[cat] = expense_by_category.get(cat, 0) + ea
        top_expenses = sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:3]
        top_expenses_str = ", ".join([f"{c}: \u20b9{a:,.0f}" for c, a in top_expenses]) or "No expenses"

        assets = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
        total_assets = sum(a.get('currentValue', 0) for a in assets)
        investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
        total_investments = sum(inv.get('currentValue', inv.get('principal', 0)) for inv in investments)
        loans = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
        total_liabilities = sum(l.get('outstandingAmount', 0) for l in loans)
        credit_cards = await db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
        total_liabilities += sum(cc.get('currentOutstanding', 0) for cc in credit_cards)
        accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
        liquid_balance = sum(a.get('currentBalance', 0) for a in accounts)

        insurances = await db.insurances.find(user_filter, {"_id": 0}).to_list(1000)
        life_coverage = sum(i.get('coverageAmount', 0) for i in insurances if i.get('insuranceType') in ['Life Insurance', 'Term Insurance'])
        health_coverage = sum(i.get('coverageAmount', 0) for i in insurances if i.get('insuranceType') == 'Health Insurance')
        vehicle_coverage = sum(i.get('coverageAmount', 0) for i in insurances if i.get('insuranceType') == 'Vehicle Insurance')
        def get_annual_premium(ins):
            p = ins.get('premiumAmount', 0); f = ins.get('premiumFrequency', 'Yearly')
            m = {'Monthly':12,'Quarterly':4,'Half-Yearly':2,'Yearly':1,'One-Time':0}
            return p * m.get(f, 1)
        total_annual_premium = sum(get_annual_premium(i) for i in insurances)
        insurance_types = list(set(i.get('insuranceType') for i in insurances))
        has_health_insurance = 'Health Insurance' in insurance_types

        fd_rd_balance = sum(inv.get('currentValue', inv.get('principal', 0)) for inv in investments if inv.get('investmentCategory') in ['Fixed Deposit (FD)', 'Recurring Deposit (RD)'])
        liquid_investments = sum(inv.get('currentValue', inv.get('principal', 0)) for inv in investments if inv.get('isLiquidAsset', False) and inv.get('investmentCategory') not in ['Fixed Deposit (FD)', 'Recurring Deposit (RD)'])

        goals = await db.goals.find(user_filter, {"_id": 0}).to_list(1000)
        emergency_fund_goals_amount = 0
        emergency_fund_goal_info = []
        for g in goals:
            if g.get('goalType') == 'Emergency Fund' and not g.get('isCompleted', False):
                ga = 0
                for inv_id in g.get('linkedInvestmentIds', []):
                    inv = await db.investments.find_one({"id": inv_id}, {"_id": 0})
                    if inv: ga += inv.get('currentValue', inv.get('principal', 0))
                for acc_id in g.get('linkedAccountIds', []):
                    acc = await db.accounts.find_one({"id": acc_id}, {"_id": 0})
                    if acc and acc.get('accountType') != 'Credit Card': ga += acc.get('currentBalance', 0)
                if ga == 0: ga = g.get('currentAmount', 0)
                emergency_fund_goals_amount += ga
                t = g.get('targetAmount', 0)
                emergency_fund_goal_info.append({"name": g.get('goalName'), "current": ga, "target": t, "progress": round((ga / t * 100), 1) if t > 0 else 0})
        active_goals = len([g for g in goals if not g.get('isCompleted', False)])
        emergency_fund = liquid_balance + fd_rd_balance + liquid_investments
        monthly_savings = monthly_income - monthly_expenses
        savings_rate = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0
        net_worth = total_assets + total_investments + liquid_balance - total_liabilities

        ef_goal_str = ""
        if emergency_fund_goal_info:
            ef = emergency_fund_goal_info[0]
            ef_goal_str = f"Emergency Fund Goal: {ef['progress']}% funded (\u20b9{ef['current']:,.0f} of \u20b9{ef['target']:,.0f})"
        insurance_summary = f"Life/Term Coverage: \u20b9{life_coverage:,.0f}, Health Coverage: \u20b9{health_coverage:,.0f}, Vehicle Coverage: \u20b9{vehicle_coverage:,.0f}, Annual Premium: \u20b9{total_annual_premium:,.0f}"
        insurance_gaps = []
        if not has_health_insurance: insurance_gaps.append("No Health Insurance")
        if life_coverage < monthly_income * 120: insurance_gaps.append(f"Life cover low (have \u20b9{life_coverage:,.0f}, need \u20b9{monthly_income * 120:,.0f})")

        financial_data = {
            "net_worth": net_worth, "monthly_income": monthly_income, "monthly_expenses": monthly_expenses,
            "monthly_savings": monthly_savings, "total_assets": total_assets, "total_investments": total_investments,
            "total_liabilities": total_liabilities, "liquid_balance": liquid_balance, "emergency_fund": emergency_fund,
            "fd_rd_balance": fd_rd_balance, "liquid_investments": liquid_investments,
            "emergency_fund_goals": emergency_fund_goals_amount, "emergency_fund_goal_info": ef_goal_str,
            "active_goals": active_goals, "savings_rate": savings_rate, "top_expenses": top_expenses_str,
            "insurance_summary": insurance_summary, "insurance_gaps": ", ".join(insurance_gaps) if insurance_gaps else "Adequate coverage",
            "has_health_insurance": has_health_insurance, "life_coverage": life_coverage, "total_annual_premium": total_annual_premium,
            "loan_given_outstanding": sum(inv.get('outstandingAmount', 0) or 0 for inv in investments if inv.get('investmentCategory') == 'Loan Given'),
            "loan_given_at_risk": sum(inv.get('outstandingAmount', 0) or 0 for inv in investments if inv.get('investmentCategory') == 'Loan Given' and inv.get('loanStatus') == 'default_risk'),
        }
        insights = await generate_ai_insights_internal(financial_data)
        return {"insights": insights, "generated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

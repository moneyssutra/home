from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
import asyncio

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI Insights"])

# Import auth dependency
from routes.auth import get_current_user
from database import db

class InsightRequest(BaseModel):
    context: Optional[str] = None

class InsightItem(BaseModel):
    type: str  # spending, savings, goal, alert, trend
    icon: str
    title: str
    description: str
    priority: str  # high, medium, low
    actionable: bool
    action_text: Optional[str] = None
    action_link: Optional[str] = None

class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    generated_at: str

async def generate_ai_insights(financial_data: dict) -> List[dict]:
    """Generate AI insights using OpenAI GPT-5.2"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Prepare financial summary for AI
    summary = f"""
    Financial Summary:
    - Total Net Worth: ₹{financial_data.get('net_worth', 0):,.0f}
    - Monthly Income: ₹{financial_data.get('monthly_income', 0):,.0f}
    - Monthly Expenses: ₹{financial_data.get('monthly_expenses', 0):,.0f}
    - Monthly Savings: ₹{financial_data.get('monthly_savings', 0):,.0f}
    - Total Assets: ₹{financial_data.get('total_assets', 0):,.0f}
    - Total Investments: ₹{financial_data.get('total_investments', 0):,.0f}
    - Total Liabilities: ₹{financial_data.get('total_liabilities', 0):,.0f}
    - Liquid Balance: ₹{financial_data.get('liquid_balance', 0):,.0f}
    - Active Goals: {financial_data.get('active_goals', 0)}
    - Upcoming EMIs: {financial_data.get('upcoming_emis', 0)}
    - Savings Rate: {financial_data.get('savings_rate', 0):.1f}%
    
    Recent Activity:
    - Top Expense Categories: {financial_data.get('top_expenses', 'N/A')}
    - Income Sources: {financial_data.get('income_sources', 'N/A')}
    - Goal Progress: {financial_data.get('goal_progress', 'N/A')}
    """
    
    system_prompt = """You are a smart financial advisor AI for the Moneyssutra app. 
    Analyze the user's financial data and provide 3-5 personalized, actionable insights.
    
    For each insight, provide a JSON object with:
    - type: one of "spending", "savings", "goal", "alert", "trend"
    - icon: emoji that represents the insight
    - title: short catchy title (max 6 words)
    - description: helpful explanation (max 25 words)
    - priority: "high", "medium", or "low"
    - actionable: true if user can take action
    - action_text: button text if actionable (optional)
    - action_link: one of "/my-expenses", "/my-income", "/my-goals", "/my-investments", "/my-loans", "/portfolio" (optional)
    
    Return ONLY a valid JSON array of insights. No markdown, no explanation.
    Focus on practical, specific advice based on the numbers provided.
    Use Indian Rupee format (₹) for amounts."""
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"insights-{datetime.now(timezone.utc).timestamp()}",
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=f"Analyze this financial data and provide insights:\n{summary}")
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        # Clean response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        clean_response = clean_response.strip()
        
        insights = json.loads(clean_response)
        return insights
        
    except Exception as e:
        print(f"AI Insights Error: {str(e)}")
        # Return fallback insights
        return get_fallback_insights(financial_data)

def get_fallback_insights(data: dict) -> List[dict]:
    """Generate basic insights without AI if API fails"""
    insights = []
    
    savings_rate = data.get('savings_rate', 0)
    if savings_rate > 30:
        insights.append({
            "type": "trend",
            "icon": "🎉",
            "title": "Great Savings Rate!",
            "description": f"You're saving {savings_rate:.0f}% of your income. Keep it up!",
            "priority": "low",
            "actionable": False
        })
    elif savings_rate < 10:
        insights.append({
            "type": "alert",
            "icon": "⚠️",
            "title": "Low Savings Alert",
            "description": f"Your savings rate is only {savings_rate:.0f}%. Consider reducing expenses.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Expenses",
            "action_link": "/my-expenses"
        })
    
    if data.get('total_liabilities', 0) > data.get('liquid_balance', 0):
        insights.append({
            "type": "alert",
            "icon": "💳",
            "title": "Debt Exceeds Cash",
            "description": "Your liabilities exceed liquid funds. Focus on debt reduction.",
            "priority": "high",
            "actionable": True,
            "action_text": "View Loans",
            "action_link": "/my-loans"
        })
    
    if data.get('active_goals', 0) > 0:
        insights.append({
            "type": "goal",
            "icon": "🎯",
            "title": "Goals In Progress",
            "description": f"You have {data.get('active_goals')} active goals. Stay focused!",
            "priority": "medium",
            "actionable": True,
            "action_text": "View Goals",
            "action_link": "/my-goals"
        })
    
    return insights

@router.get("/insights", response_model=InsightsResponse)
async def get_insights(current_user: dict = Depends(get_current_user)):
    """Get AI-powered financial insights for the current user"""
    user_id = current_user["user_id"]
    workspace_id = current_user.get("workspace_id")
    
    # Build query filter
    query_filter = {"workspace_id": workspace_id} if workspace_id else {"user_id": user_id}
    
    try:
        # Gather financial data from various collections
        # Income
        incomes = list(db.income.find(query_filter))
        monthly_income = sum(inc.get('expectedAmount', 0) for inc in incomes)
        income_sources = len(set(inc.get('type', 'Other') for inc in incomes))
        
        # Expenses
        expenses = list(db.expenses.find(query_filter))
        monthly_expenses = sum(exp.get('amount', 0) for exp in expenses)
        
        # Get top expense categories
        expense_by_category = {}
        for exp in expenses:
            cat = exp.get('category', 'Other')
            expense_by_category[cat] = expense_by_category.get(cat, 0) + exp.get('amount', 0)
        top_expenses = sorted(expense_by_category.items(), key=lambda x: x[1], reverse=True)[:3]
        top_expenses_str = ", ".join([f"{cat}: ₹{amt:,.0f}" for cat, amt in top_expenses])
        
        # Assets
        assets = list(db.assets.find(query_filter))
        total_assets = sum(asset.get('currentValue', 0) for asset in assets)
        
        # Investments
        investments = list(db.investments.find(query_filter))
        total_investments = sum(inv.get('currentValue', inv.get('principal', 0)) for inv in investments)
        
        # Loans
        loans = list(db.loans.find(query_filter))
        total_liabilities = sum(loan.get('outstandingAmount', 0) for loan in loans)
        upcoming_emis = len([l for l in loans if l.get('emiAmount', 0) > 0])
        
        # Credit Cards
        credit_cards = list(db.credit_cards.find(query_filter))
        credit_outstanding = sum(cc.get('currentOutstanding', 0) for cc in credit_cards)
        total_liabilities += credit_outstanding
        
        # Accounts (Liquid Balance)
        accounts = list(db.accounts.find(query_filter))
        liquid_balance = sum(acc.get('balance', 0) for acc in accounts)
        
        # Goals
        goals = list(db.goals.find(query_filter))
        active_goals = len([g for g in goals if g.get('status') == 'Active'])
        goal_progress = ""
        for goal in goals[:3]:
            if goal.get('status') == 'Active':
                progress = (goal.get('savedAmount', 0) / goal.get('targetAmount', 1)) * 100
                goal_progress += f"{goal.get('name', 'Goal')}: {progress:.0f}%, "
        
        # Calculate savings
        monthly_savings = monthly_income - monthly_expenses
        savings_rate = (monthly_savings / monthly_income * 100) if monthly_income > 0 else 0
        
        # Net worth
        net_worth = total_assets + total_investments + liquid_balance - total_liabilities
        
        financial_data = {
            "net_worth": net_worth,
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "monthly_savings": monthly_savings,
            "total_assets": total_assets,
            "total_investments": total_investments,
            "total_liabilities": total_liabilities,
            "liquid_balance": liquid_balance,
            "active_goals": active_goals,
            "upcoming_emis": upcoming_emis,
            "savings_rate": savings_rate,
            "top_expenses": top_expenses_str or "No expenses recorded",
            "income_sources": f"{income_sources} sources",
            "goal_progress": goal_progress or "No active goals"
        }
        
        # Generate AI insights
        insights = await generate_ai_insights(financial_data)
        
        return InsightsResponse(
            insights=[InsightItem(**insight) for insight in insights],
            generated_at=datetime.now(timezone.utc).isoformat()
        )
        
    except Exception as e:
        print(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

"""Analytics routes - Time series data and snapshots."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Import shared dependencies
import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user


@router.get("/snapshots")
async def get_analytics_snapshots(request: Request, period: str = "6M"):
    """Get historical analytics snapshots for charts"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    # Calculate date range based on period
    today = datetime.now(timezone.utc)
    if period == "1M":
        start_date = today - timedelta(days=30)
    elif period == "3M":
        start_date = today - timedelta(days=90)
    elif period == "6M":
        start_date = today - timedelta(days=180)
    elif period == "1Y":
        start_date = today - timedelta(days=365)
    else:  # All
        start_date = today - timedelta(days=730)  # 2 years
    
    snapshots = await db.analytics_snapshots.find(
        {
            "userId": user_id,
            "createdAt": {"$gte": start_date.isoformat()}
        },
        {"_id": 0}
    ).sort([("year", 1), ("month", 1)]).to_list(100)
    
    return snapshots


@router.post("/snapshot")
async def create_analytics_snapshot(request: Request):
    """Create a snapshot of current financial state for analytics"""
    import asyncio
    
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_filter = {"userId": user_id}
    
    today = datetime.now(timezone.utc)
    current_month = today.month
    current_year = today.year
    
    # Check if snapshot for this month already exists
    existing = await db.analytics_snapshots.find_one({
        "userId": user_id,
        "month": current_month,
        "year": current_year
    })
    
    if existing:
        return {"message": "Snapshot already exists for this month", "id": existing.get("id")}
    
    # Fetch all financial data
    (assets, investments, accounts, loans, credit_cards, incomes, expenses) = await asyncio.gather(
        db.assets.find(user_filter, {"_id": 0}).to_list(1000),
        db.investments.find(user_filter, {"_id": 0}).to_list(1000),
        db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
        db.loans.find(user_filter, {"_id": 0}).to_list(1000),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000),
        db.income_sources.find(user_filter, {"_id": 0}).to_list(1000),
        db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    )
    
    # Calculate totals
    total_assets = sum(a.get('currentValue', 0) for a in assets)
    total_investments = sum(i.get('currentValue', 0) for i in investments)
    liquid_balance = sum(acc.get('currentBalance', 0) or acc.get('balance', 0) for acc in accounts)
    total_liabilities = sum(l.get('outstandingAmount', 0) for l in loans) + sum(c.get('currentOutstanding', 0) for c in credit_cards)
    
    # Calculate monthly income
    monthly_income = 0
    for inc in incomes:
        freq = inc.get('frequency', 'Monthly')
        amount = inc.get('expectedAmount', 0)
        if freq == 'Daily':
            monthly_income += amount * 30
        elif freq == 'Weekly':
            monthly_income += amount * 4
        elif freq == 'Monthly':
            monthly_income += amount
        elif freq == 'Quarterly':
            monthly_income += amount / 3
        elif freq == 'Half-Yearly':
            monthly_income += amount / 6
        elif freq == 'Yearly':
            monthly_income += amount / 12
    
    # Calculate monthly expense
    monthly_expense = 0
    for exp in expenses:
        freq = exp.get('frequency', 'Monthly')
        amount = exp.get('expectedAmount', 0)
        if freq == 'Daily':
            monthly_expense += amount * 30
        elif freq == 'Weekly':
            monthly_expense += amount * 4
        elif freq == 'Monthly':
            monthly_expense += amount
        elif freq == 'Quarterly':
            monthly_expense += amount / 3
        elif freq == 'Half-Yearly':
            monthly_expense += amount / 6
        elif freq == 'Yearly':
            monthly_expense += amount / 12
    
    net_worth = total_assets + total_investments + liquid_balance - total_liabilities
    
    # Calculate investment gains
    total_invested = sum(i.get('amountInvested', 0) for i in investments)
    investment_gains = total_investments - total_invested
    
    import uuid
    snapshot = {
        "id": str(uuid.uuid4()),
        "userId": user_id,
        "month": current_month,
        "year": current_year,
        "netWorth": net_worth,
        "totalAssets": total_assets,
        "totalInvestments": total_investments,
        "totalLiabilities": total_liabilities,
        "liquidBalance": liquid_balance,
        "monthlyIncome": monthly_income,
        "monthlyExpense": monthly_expense,
        "investmentGains": investment_gains,
        "createdAt": today.isoformat()
    }
    
    await db.analytics_snapshots.insert_one(snapshot)
    
    return {"message": "Snapshot created", "id": snapshot["id"]}


@router.get("/investment-performance")
async def get_investment_performance(request: Request):
    """Get investment performance summary"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    investments = await db.investments.find({"userId": user_id}, {"_id": 0}).to_list(1000)
    
    total_invested = 0
    current_value = 0
    by_category = {}
    
    for inv in investments:
        invested = inv.get('principal', 0) or inv.get('amountInvested', 0) or 0
        current = inv.get('currentValue', 0) or 0
        cat = inv.get('investmentCategory', inv.get('category', 'Other'))
        
        total_invested += invested
        current_value += current
        
        if cat not in by_category:
            by_category[cat] = {"invested": 0, "current": 0}
        by_category[cat]["invested"] += invested
        by_category[cat]["current"] += current
    
    total_gains = current_value - total_invested
    gain_percent = ((total_gains / total_invested) * 100) if total_invested > 0 else 0
    
    return {
        "totalInvested": total_invested,
        "currentValue": current_value,
        "totalGains": total_gains,
        "gainPercent": round(gain_percent, 2),
        "byCategory": by_category
    }

"""Dashboard routes - Aggregation and summary endpoints."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def calculate_monthly_amount(amount: float, frequency: str, current_month: int, 
                             selected_quarter: str = '', selected_half: str = '', 
                             selected_month: str = '', date_str: str = '') -> float:
    """Calculate the monthly contribution of an income/expense based on frequency"""
    month_mapping = {
        "January": 1, "February": 2, "March": 3, "April": 4, 
        "May": 5, "June": 6, "July": 7, "August": 8, 
        "September": 9, "October": 10, "November": 11, "December": 12
    }
    
    if frequency == 'Daily':
        return amount * 30
    elif frequency == 'Weekly':
        return amount * 4
    elif frequency == 'Monthly':
        return amount
    elif frequency == 'Quarterly':
        quarter_months = {'Q1': [1, 2, 3], 'Q2': [4, 5, 6], 'Q3': [7, 8, 9], 'Q4': [10, 11, 12]}
        for q_prefix, months in quarter_months.items():
            if selected_quarter and selected_quarter.startswith(q_prefix):
                if current_month == months[0]:
                    return amount
                return 0
        if current_month in [1, 4, 7, 10]:
            return amount
        return 0
    elif frequency == 'Half-Yearly':
        if 'Jan' in selected_half:
            if current_month in [1, 7]:
                return amount
        else:
            if current_month in [7, 1]:
                return amount
        return 0
    elif frequency == 'Yearly':
        if month_mapping.get(selected_month) == current_month:
            return amount
        return 0
    elif frequency in ['One-Time', 'Irregular']:
        if date_str:
            try:
                date_obj = datetime.fromisoformat(date_str).date()
                current_year = datetime.now(timezone.utc).year
                if date_obj.month == current_month and date_obj.year == current_year:
                    return amount
            except (ValueError, TypeError):
                pass
        return 0
    return amount


@router.get("/networth")
async def get_networth_summary(request: Request):
    """Aggregate all financial data for net worth calculation"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year
    
    # Get all assets
    assets = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
    total_assets = sum(asset.get('currentValue', 0) for asset in assets)
    
    # Get all investments
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    total_investments = sum(inv.get('currentValue', 0) for inv in investments)
    
    # Get all accounts
    accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
    liquid_balance = sum(
        acc.get('currentBalance', 0) for acc in accounts 
        if acc.get('accountType') != 'Credit Card'
    )
    credit_outstanding = sum(
        acc.get('outstandingAmount', 0) or 0 for acc in accounts 
        if acc.get('accountType') == 'Credit Card'
    )
    
    # Get all credit cards
    credit_cards = await db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000)
    credit_card_outstanding = sum(card.get('outstandingAmount', 0) for card in credit_cards)
    credit_card_limit = sum(card.get('creditLimit', 0) for card in credit_cards)
    
    # Get all loans
    loans = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
    total_liabilities = sum(loan.get('outstandingAmount', 0) for loan in loans)
    total_liabilities += credit_outstanding + credit_card_outstanding
    
    # Calculate monthly income
    incomes = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
    monthly_income = 0
    for income in incomes:
        monthly_income += calculate_monthly_amount(
            income.get('expectedAmount', 0),
            income.get('frequency', 'Monthly'),
            current_month,
            income.get('selectedQuarter', ''),
            income.get('selectedHalf', ''),
            income.get('selectedMonth', ''),
            income.get('customDate', '')
        )
    
    # Add other income
    other_incomes = await db.other_income.find(user_filter, {"_id": 0}).to_list(1000)
    for other_inc in other_incomes:
        monthly_income += calculate_monthly_amount(
            other_inc.get('amount', 0),
            other_inc.get('frequency', 'One-Time'),
            current_month,
            other_inc.get('selectedQuarter', ''),
            '',
            other_inc.get('selectedMonth', ''),
            other_inc.get('dateReceived', '')
        )
    
    # Calculate monthly expenses
    expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    monthly_expenses = 0
    for expense in expenses:
        monthly_expenses += calculate_monthly_amount(
            expense.get('expectedAmount', 0),
            expense.get('frequency', 'Monthly'),
            current_month,
            expense.get('selectedQuarter', ''),
            expense.get('selectedHalf', ''),
            expense.get('selectedMonth', ''),
            expense.get('oneTimeDate', '')
        )
    
    # Calculate net worth
    net_worth = total_assets + total_investments + liquid_balance - total_liabilities
    
    return {
        "netWorth": net_worth,
        "totalAssets": total_assets,
        "totalInvestments": total_investments,
        "liquidBalance": liquid_balance,
        "totalLiabilities": total_liabilities,
        "creditOutstanding": credit_outstanding,
        "creditCardOutstanding": credit_card_outstanding,
        "creditCardLimit": credit_card_limit,
        "creditCardUtilization": (credit_card_outstanding / credit_card_limit * 100) if credit_card_limit > 0 else 0,
        "monthlyIncome": monthly_income,
        "monthlyExpenses": monthly_expenses,
        "monthlySavings": monthly_income - monthly_expenses,
        "assetCount": len(assets),
        "investmentCount": len(investments),
        "accountCount": len(accounts),
        "loanCount": len(loans),
        "creditCardCount": len(credit_cards),
        "incomeCount": len(incomes),
        "expenseCount": len(expenses)
    }


@router.get("/breakdown")
async def get_breakdown(request: Request):
    """Get detailed breakdown by category"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_filter = get_user_filter(user)
    
    # Assets by type
    assets = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
    assets_by_type = {}
    for asset in assets:
        asset_type = asset.get('assetType', 'Other')
        if asset_type not in assets_by_type:
            assets_by_type[asset_type] = 0
        assets_by_type[asset_type] += asset.get('currentValue', 0)
    
    # Investments by category
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    investments_by_category = {}
    for inv in investments:
        category = inv.get('investmentCategory', 'Other')
        if category not in investments_by_category:
            investments_by_category[category] = 0
        investments_by_category[category] += inv.get('currentValue', 0)
    
    # Loans by type
    loans = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
    loans_by_type = {}
    for loan in loans:
        loan_type = loan.get('loanType', 'Other')
        if loan_type not in loans_by_type:
            loans_by_type[loan_type] = 0
        loans_by_type[loan_type] += loan.get('outstandingAmount', 0)
    
    # Expenses by category
    expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    expenses_by_category = {}
    for expense in expenses:
        category = expense.get('category', 'Other')
        if category not in expenses_by_category:
            expenses_by_category[category] = 0
        expenses_by_category[category] += expense.get('expectedAmount', 0)
    
    return {
        "assetsByType": assets_by_type,
        "investmentsByCategory": investments_by_category,
        "loansByType": loans_by_type,
        "expensesByCategory": expenses_by_category
    }

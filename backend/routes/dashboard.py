"""Dashboard routes - Net worth and breakdown from server.py."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import asyncio

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/networth")
async def get_networth_summary(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get('user_id')
    user_email = user.get('email', '')

    if user_email == 'test@moneyssutra.com' or user_id == 'test':
        user_filter = {"$or": [{"userId": user_id}, {"userId": None}, {"userId": {"$exists": False}}]}
    else:
        user_filter = {"userId": user_id}

    assets, investments, accounts, credit_cards, loans, incomes, other_incomes, expenses = await asyncio.gather(
        db.assets.find(user_filter, {"_id": 0}).to_list(1000),
        db.investments.find(user_filter, {"_id": 0}).to_list(1000),
        db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000),
        db.loans.find(user_filter, {"_id": 0}).to_list(1000),
        db.income_sources.find(user_filter, {"_id": 0}).to_list(1000),
        db.other_income.find(user_filter, {"_id": 0}).to_list(1000),
        db.expenses.find(user_filter, {"_id": 0}).to_list(1000),
    )

    total_assets = sum(asset.get('currentValue', 0) for asset in assets)
    total_investments = sum(inv.get('currentValue', 0) for inv in investments)
    liquid_balance = sum(acc.get('currentBalance', 0) for acc in accounts if acc.get('accountType') != 'Credit Card')
    credit_outstanding = sum(acc.get('outstandingAmount', 0) or 0 for acc in accounts if acc.get('accountType') == 'Credit Card')
    credit_card_outstanding = sum(card.get('outstandingAmount', 0) for card in credit_cards)
    credit_card_limit = sum(card.get('creditLimit', 0) for card in credit_cards)
    total_liabilities = sum(loan.get('outstandingAmount', 0) for loan in loans) + credit_outstanding + credit_card_outstanding

    current_month = datetime.now(timezone.utc).month
    current_year = datetime.now(timezone.utc).year
    monthly_income = _calc_monthly_income(incomes, other_incomes, current_month, current_year)
    monthly_expenses = _calc_monthly_expenses(expenses, current_month, current_year)
    net_worth = total_assets + total_investments + liquid_balance - total_liabilities

    return {
        "netWorth": net_worth, "totalAssets": total_assets, "totalInvestments": total_investments,
        "liquidBalance": liquid_balance, "totalLiabilities": total_liabilities,
        "creditOutstanding": credit_outstanding, "creditCardOutstanding": credit_card_outstanding,
        "creditCardLimit": credit_card_limit,
        "creditCardUtilization": (credit_card_outstanding / credit_card_limit * 100) if credit_card_limit > 0 else 0,
        "monthlyIncome": monthly_income, "monthlyExpenses": monthly_expenses,
        "monthlySavings": monthly_income - monthly_expenses,
        "assetCount": len(assets), "investmentCount": len(investments),
        "accountCount": len(accounts), "loanCount": len(loans),
        "creditCardCount": len(credit_cards), "incomeCount": len(incomes), "expenseCount": len(expenses)
    }


@router.get("/breakdown")
async def get_breakdown():
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    asset_breakdown = {}
    for a in assets:
        t = a.get('assetType', 'Other')
        asset_breakdown[t] = asset_breakdown.get(t, 0) + a.get('currentValue', 0)

    investments = await db.investments.find({}, {"_id": 0}).to_list(1000)
    investment_breakdown = {}
    for inv in investments:
        c = inv.get('investmentCategory', 'Other')
        investment_breakdown[c] = investment_breakdown.get(c, 0) + inv.get('currentValue', 0)

    loans = await db.loans.find({}, {"_id": 0}).to_list(1000)
    loan_breakdown = {}
    for l in loans:
        t = l.get('loanType', 'Other')
        loan_breakdown[t] = loan_breakdown.get(t, 0) + l.get('outstandingAmount', 0)

    incomes = await db.income_sources.find({}, {"_id": 0}).to_list(1000)
    income_breakdown = {}
    for i in incomes:
        t = i.get('type', 'Other')
        income_breakdown[t] = income_breakdown.get(t, 0) + i.get('expectedAmount', 0)

    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    expense_breakdown = {}
    for e in expenses:
        c = e.get('category', 'Other')
        expense_breakdown[c] = expense_breakdown.get(c, 0) + e.get('expectedAmount', 0)

    return {
        "assetBreakdown": asset_breakdown, "investmentBreakdown": investment_breakdown,
        "loanBreakdown": loan_breakdown, "incomeBreakdown": income_breakdown,
        "expenseBreakdown": expense_breakdown
    }


def _calc_monthly_income(incomes, other_incomes, current_month, current_year):
    monthly_income = 0
    for income in incomes:
        amount = income.get('expectedAmount', 0)
        freq = income.get('frequency', 'Monthly')
        if freq == 'Daily': monthly_income += amount * 30
        elif freq == 'Weekly': monthly_income += amount * 4
        elif freq == 'Monthly': monthly_income += amount
        elif freq == 'Quarterly':
            sq = income.get('selectedQuarter', '')
            qm = {'Q1': [1,2,3], 'Q2': [4,5,6], 'Q3': [7,8,9], 'Q4': [10,11,12]}
            matched = False
            for qp, ms in qm.items():
                if sq and sq.startswith(qp):
                    if current_month == ms[0]: monthly_income += amount
                    matched = True; break
            if not matched and current_month in [1, 4, 7, 10]: monthly_income += amount
        elif freq == 'Half-Yearly':
            sh = income.get('selectedHalf', '')
            if 'Jan' in sh:
                if current_month in [1, 7]: monthly_income += amount
            else:
                if current_month in [7, 1]: monthly_income += amount
        elif freq == 'Yearly':
            sm = income.get('selectedMonth', '')
            mm = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
            if mm.get(sm) == current_month: monthly_income += amount
        elif freq in ('Irregular', 'Others'):
            cd = income.get('customDate', '')
            if cd:
                try:
                    d = datetime.fromisoformat(cd).date()
                    if d.month == current_month and d.year == current_year: monthly_income += amount
                except (ValueError, TypeError): pass
        else:
            monthly_income += amount

    for oi in other_incomes:
        amount = oi.get('amount', 0)
        freq = oi.get('frequency', 'One-Time')
        if freq == 'One-Time':
            dr = oi.get('dateReceived', '')
            if dr:
                try:
                    d = datetime.fromisoformat(dr).date()
                    if d.month == current_month and d.year == current_year: monthly_income += amount
                except (ValueError, TypeError): pass
        elif freq == 'Monthly': monthly_income += amount
        elif freq == 'Quarterly':
            sq = oi.get('selectedQuarter', '')
            qm = {'Q1': [1,2,3], 'Q2': [4,5,6], 'Q3': [7,8,9], 'Q4': [10,11,12]}
            matched = False
            for qp, ms in qm.items():
                if sq and sq.startswith(qp):
                    if current_month == ms[0]: monthly_income += amount
                    matched = True; break
            if not matched and current_month in [1, 4, 7, 10]: monthly_income += amount
        elif freq == 'Yearly':
            sm = oi.get('selectedMonth', '')
            mm = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
            if mm.get(sm) == current_month: monthly_income += amount
        elif freq == 'Irregular':
            dr = oi.get('dateReceived', '')
            if dr:
                try:
                    d = datetime.fromisoformat(dr).date()
                    if d.month == current_month and d.year == current_year: monthly_income += amount
                except (ValueError, TypeError): pass
    return monthly_income


def _calc_monthly_expenses(expenses, current_month, current_year):
    monthly_expenses = 0
    for expense in expenses:
        amount = expense.get('expectedAmount', 0)
        freq = expense.get('frequency', 'Monthly')
        if freq == 'Daily': monthly_expenses += amount * 30
        elif freq == 'Weekly': monthly_expenses += amount * 4
        elif freq == 'Monthly': monthly_expenses += amount
        elif freq == 'Quarterly':
            sq = expense.get('selectedQuarter') or ''
            qm = {'Q1': [1,2,3], 'Q2': [4,5,6], 'Q3': [7,8,9], 'Q4': [10,11,12]}
            matched = False
            for qp, ms in qm.items():
                if sq and sq.startswith(qp):
                    if current_month == ms[0]: monthly_expenses += amount
                    matched = True; break
            if not matched and current_month in [1, 4, 7, 10]: monthly_expenses += amount
        elif freq == 'Half-Yearly':
            sh = expense.get('selectedHalf') or ''
            if 'Jan' in sh:
                if current_month in [1, 7]: monthly_expenses += amount
            else:
                if current_month in [7, 1]: monthly_expenses += amount
        elif freq == 'Yearly':
            sm = expense.get('selectedMonth') or ''
            mm = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,"July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
            if mm.get(sm) == current_month: monthly_expenses += amount
        elif freq == 'One-Time':
            otd = expense.get('oneTimeDate', '')
            if otd:
                try:
                    d = datetime.fromisoformat(otd).date()
                    if d.month == current_month and d.year == current_year: monthly_expenses += amount
                except (ValueError, TypeError): pass
        else:
            monthly_expenses += amount
    return monthly_expenses

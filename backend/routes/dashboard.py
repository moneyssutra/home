"""Dashboard routes - Net worth and breakdown from server.py."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import asyncio

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_user_now, count_weekday_occurrences

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

    current_month = get_user_now(request).month
    current_year = get_user_now(request).year
    net_worth = total_assets + total_investments + liquid_balance - total_liabilities

    # Calculate schedule-based received/expected and done/upcoming
    today = get_user_now(request)
    current_day = today.day

    income_received_list, income_expected_list = _split_by_schedule_date(incomes, current_day, current_month, current_year, is_income=True)
    expense_done_list, expense_upcoming_list = _split_by_schedule_date(expenses, current_day, current_month, current_year, is_income=False)

    # Also include other_incomes in received/expected
    oi_received, oi_expected = _split_other_income(other_incomes, current_day, current_month, current_year)

    income_received = sum(i['amount'] for i in income_received_list) + sum(i['amount'] for i in oi_received)
    income_expected = sum(i['amount'] for i in income_expected_list) + sum(i['amount'] for i in oi_expected)
    expenses_done = sum(e['amount'] for e in expense_done_list)
    upcoming_expenses = sum(e['amount'] for e in expense_upcoming_list)

    # Derive totals from splits for perfect consistency across all pages
    monthly_income = income_received + income_expected
    monthly_expenses = expenses_done + upcoming_expenses

    return {
        "netWorth": net_worth, "totalAssets": total_assets, "totalInvestments": total_investments,
        "liquidBalance": liquid_balance, "totalLiabilities": total_liabilities,
        "creditOutstanding": credit_outstanding, "creditCardOutstanding": credit_card_outstanding,
        "creditCardLimit": credit_card_limit,
        "creditCardUtilization": (credit_card_outstanding / credit_card_limit * 100) if credit_card_limit > 0 else 0,
        "monthlyIncome": monthly_income, "monthlyExpenses": monthly_expenses,
        "monthlySavings": income_received - expenses_done,
        "incomeReceived": income_received,
        "expectedIncome": income_expected,
        "expensesDone": expenses_done,
        "upcomingExpenses": upcoming_expenses,
        "incomeReceivedList": income_received_list + oi_received,
        "incomeExpectedList": income_expected_list + oi_expected,
        "expensesDoneList": expense_done_list,
        "upcomingExpensesList": expense_upcoming_list,
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
    import calendar
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    monthly_income = 0
    for income in incomes:
        amount = income.get('expectedAmount', 0)
        freq = income.get('frequency', 'Monthly')
        if freq == 'Daily': monthly_income += amount * days_in_month
        elif freq == 'Weekly':
            day_name = income.get('selectedDay', '')
            if day_name:
                monthly_income += amount * count_weekday_occurrences(current_year, current_month, day_name)
            else:
                monthly_income += amount * 4.33
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
    """Calculate normalized monthly expense total."""
    import calendar
    days_in_month = calendar.monthrange(current_year, current_month)[1]
    monthly_expenses = 0
    for expense in expenses:
        amount = expense.get('expectedAmount', 0)
        freq = expense.get('frequency', 'Monthly')
        if freq == 'Daily': monthly_expenses += amount * days_in_month
        elif freq == 'Weekly':
            day_name = expense.get('selectedDay', '')
            if day_name:
                monthly_expenses += amount * count_weekday_occurrences(current_year, current_month, day_name)
            else:
                monthly_expenses += amount * 4.33
        elif freq == 'Monthly': monthly_expenses += amount
        elif freq == 'Quarterly': monthly_expenses += amount / 3
        elif freq == 'Half-Yearly': monthly_expenses += amount / 6
        elif freq == 'Yearly': monthly_expenses += amount / 12
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


def _is_due_this_month(freq, item, current_month, current_year, is_income=True):
    """Check if this item is due in the current month based on its frequency."""
    month_map = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,
                 "July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
    quarter_months = {'Q1': [1,2,3], 'Q2': [4,5,6], 'Q3': [7,8,9], 'Q4': [10,11,12]}

    if freq == 'Monthly' or freq == 'Daily' or freq == 'Weekly':
        return True
    elif freq == 'Quarterly':
        sq = item.get('selectedQuarter', '')
        for qp, ms in quarter_months.items():
            if sq and sq.startswith(qp):
                return current_month in ms
        return current_month in [1, 4, 7, 10]
    elif freq == 'Half-Yearly':
        sh = item.get('selectedHalf', '')
        if 'Jan' in sh:
            return current_month in [1, 7]
        return current_month in [7, 1]
    elif freq == 'Yearly':
        sm = item.get('selectedMonth', '')
        return month_map.get(sm) == current_month
    elif freq in ('One-Time', 'Irregular', 'Others'):
        date_field = 'customDate' if is_income else 'oneTimeDate'
        cd = item.get(date_field, '') or item.get('customDate', '')
        if cd:
            try:
                d = datetime.fromisoformat(cd).date()
                return d.month == current_month and d.year == current_year
            except (ValueError, TypeError):
                pass
        return False
    return True


def _get_schedule_day(item, is_income=True):
    """Get the day of month when this item is due. Returns 0 if unknown (not deterministic)."""
    sd = item.get('selectedDate')
    if sd:
        try:
            return int(sd)
        except (ValueError, TypeError):
            pass
        # Try parsing ISO date string like "2026-02-27"
        try:
            return datetime.fromisoformat(str(sd)).day
        except (ValueError, TypeError):
            pass
    # For expenses, also check 'dueDate' field
    if not is_income:
        dd = item.get('dueDate') or item.get('dueDay')
        if dd:
            try:
                return int(dd)
            except (ValueError, TypeError):
                pass
            try:
                return datetime.fromisoformat(str(dd)).day
            except (ValueError, TypeError):
                pass
    return 0  # 0 = unknown, will be treated conservatively


def _split_by_schedule_date(items, current_day, current_month, current_year, is_income=True):
    """Split items into received/done vs expected/upcoming based on schedule date."""
    import calendar
    received = []
    expected = []
    name_field = 'name' if is_income else 'expenseName'
    days_in_month = calendar.monthrange(current_year, current_month)[1]

    for item in items:
        amount = item.get('expectedAmount', 0)
        freq = item.get('frequency', 'Monthly')

        if not _is_due_this_month(freq, item, current_month, current_year, is_income):
            continue

        schedule_day = _get_schedule_day(item, is_income)
        entry = {
            "id": item.get('id', ''),
            "name": item.get(name_field, item.get('name', 'Unknown')),
            "amount": amount,
            "frequency": freq,
            "scheduleDay": schedule_day if schedule_day > 0 else 1,
            "type": item.get('type', item.get('category', '')),
        }

        if freq == 'Daily':
            entry_received = {**entry, "amount": round(amount * current_day, 2)}
            entry_expected = {**entry, "amount": round(amount * (days_in_month - current_day), 2)}
            if entry_received["amount"] > 0:
                received.append(entry_received)
            if entry_expected["amount"] > 0:
                expected.append(entry_expected)
        elif freq == 'Weekly':
            # Count actual occurrences of the named day
            day_name = item.get('selectedDay', '')
            if day_name:
                past_count = count_weekday_occurrences(current_year, current_month, day_name, current_day)
                total_count = count_weekday_occurrences(current_year, current_month, day_name)
                future_count = total_count - past_count
            else:
                # Fallback: estimate by weeks
                past_count = current_day // 7
                future_count = max(0, 4 - past_count)
            entry_received = {**entry, "amount": round(amount * past_count, 2)}
            entry_expected = {**entry, "amount": round(amount * future_count, 2)}
            if entry_received["amount"] > 0:
                received.append(entry_received)
            if entry_expected["amount"] > 0:
                expected.append(entry_expected)
        elif schedule_day > 0:
            # Known schedule day — cap to actual days in month
            effective_day = min(schedule_day, days_in_month)
            if effective_day <= current_day:
                received.append(entry)
            else:
                expected.append(entry)
        else:
            # Unknown schedule day — treat as expected (not yet received/spent)
            expected.append(entry)

    return received, expected


def _split_other_income(other_incomes, current_day, current_month, current_year):
    """Split other income into received/expected."""
    received = []
    expected = []

    for oi in other_incomes:
        amount = oi.get('amount', 0)
        freq = oi.get('frequency', 'One-Time')
        entry = {
            "id": oi.get('id', ''),
            "name": oi.get('source', oi.get('name', 'Other Income')),
            "amount": amount,
            "frequency": freq,
            "scheduleDay": 1,
            "type": "Other Income",
        }

        if freq == 'One-Time' or freq == 'Irregular':
            dr = oi.get('dateReceived', '')
            if dr:
                try:
                    d = datetime.fromisoformat(dr).date()
                    if d.month == current_month and d.year == current_year:
                        if d.day <= current_day:
                            received.append(entry)
                        else:
                            expected.append(entry)
                except (ValueError, TypeError):
                    pass
        elif freq == 'Monthly':
            received.append(entry)  # Monthly other income counted as received
        else:
            received.append(entry)

    return received, expected

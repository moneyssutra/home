"""Expense routes - Full CRUD with scheduler and summary from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from calendar import monthrange

from database import db
from server_models import Expense, ExpenseCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/expenses", tags=["Expenses"])


def calculate_next_deduction_date(expense: dict) -> Optional[str]:
    today = datetime.now(timezone.utc).date()
    frequency = expense.get('frequency', '')

    if frequency == "Daily":
        return today.isoformat()
    elif frequency == "Weekly":
        selected_day = expense.get('selectedDay', '')
        if not selected_day:
            return None
        day_mapping = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
        target_day = day_mapping.get(selected_day, 0)
        days_ahead = target_day - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).isoformat()
    elif frequency == "Monthly":
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        _, max_day = monthrange(today.year, today.month)
        day = min(day, max_day)
        if today.day < day:
            return today.replace(day=day).isoformat()
        else:
            if today.month == 12:
                return today.replace(year=today.year + 1, month=1, day=min(day, 31)).isoformat()
            else:
                _, max_next_day = monthrange(today.year, today.month + 1)
                return today.replace(month=today.month + 1, day=min(day, max_next_day)).isoformat()
    elif frequency == "Quarterly":
        selected_quarter = expense.get('selectedQuarter', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        quarter_starts = {"Q1 (Jan\u2013Mar)": 1, "Q2 (Apr\u2013Jun)": 4, "Q3 (Jul\u2013Sep)": 7, "Q4 (Oct\u2013Dec)": 10}
        for q_name, start_month in quarter_starts.items():
            if selected_quarter and q_name.startswith(selected_quarter[:2]):
                for m in [start_month, start_month + 3, start_month + 6, start_month + 9]:
                    m = ((m - 1) % 12) + 1
                    year = today.year if m >= today.month else today.year + 1
                    _, max_day = monthrange(year, m)
                    target_day = min(day, max_day)
                    target_date = datetime(year, m, target_day).date()
                    if target_date > today:
                        return target_date.isoformat()
        return None
    elif frequency == "Half-Yearly":
        selected_half = expense.get('selectedHalf', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_date:
            return None
        day = int(selected_date)
        months = [1, 7] if "Jan" in selected_half else [7, 1]
        for m in months:
            year = today.year if m >= today.month else today.year + 1
            _, max_day = monthrange(year, m)
            target_day = min(day, max_day)
            target_date = datetime(year, m, target_day).date()
            if target_date > today:
                return target_date.isoformat()
        return None
    elif frequency == "Yearly":
        selected_month = expense.get('selectedMonth', '')
        selected_date = expense.get('selectedDate', '')
        if not selected_month or not selected_date:
            return None
        month_mapping = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
                         "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
        month = month_mapping.get(selected_month, 1)
        day = int(selected_date)
        year = today.year
        _, max_day = monthrange(year, month)
        target_day = min(day, max_day)
        target_date = datetime(year, month, target_day).date()
        if target_date <= today:
            target_date = datetime(year + 1, month, target_day).date()
        return target_date.isoformat()
    elif frequency == "One-Time":
        one_time_date = expense.get('oneTimeDate', '')
        return one_time_date if one_time_date else None
    return None


@router.post("", response_model=Expense)
async def create_expense(input: ExpenseCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    expense_dict = input.model_dump()
    expense_dict['userId'] = user.get('user_id')
    expense_obj = Expense(**expense_dict)
    doc = expense_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.expenses.insert_one(doc)
    return expense_obj


@router.get("", response_model=List[Expense])
async def get_expenses(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    for expense in expenses:
        if isinstance(expense.get('createdAt'), str):
            expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
    return expenses


@router.get("/list/summary")
async def get_expense_list_summary(request: Request, category: Optional[str] = None, expense_type: Optional[str] = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    if category:
        user_filter["category"] = category
    if expense_type:
        user_filter["expenseType"] = expense_type
    projection = {
        "_id": 0, "id": 1, "expenseName": 1, "expenseType": 1, "category": 1,
        "expectedAmount": 1, "frequency": 1, "selectedDay": 1, "selectedDate": 1,
        "linkedLoanId": 1, "linkedInsuranceId": 1, "linkedInvestmentId": 1
    }
    expenses = await db.expenses.find(user_filter, projection).to_list(1000)
    entity_ids = [e["id"] for e in expenses]
    pipeline = [
        {"$match": {"entityId": {"$in": entity_ids}}},
        {"$group": {"_id": "$entityId", "totalRecorded": {"$sum": "$amount"}, "transactionCount": {"$sum": 1}, "lastTransaction": {"$max": "$transactionDate"}}}
    ]
    transaction_stats = {}
    async for stat in db.expense_transactions.aggregate(pipeline):
        transaction_stats[stat["_id"]] = {"totalRecorded": stat["totalRecorded"], "transactionCount": stat["transactionCount"], "lastTransaction": stat["lastTransaction"]}
    for expense in expenses:
        stats = transaction_stats.get(expense["id"], {})
        expense["totalRecorded"] = stats.get("totalRecorded", 0)
        expense["transactionCount"] = stats.get("transactionCount", 0)
        expense["lastTransaction"] = stats.get("lastTransaction")
    return expenses


@router.get("/with-next-date")
async def get_expenses_with_next_date(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)
    result = []
    for expense in expenses:
        if isinstance(expense.get('createdAt'), str):
            expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
        expense['nextDeductionDate'] = calculate_next_deduction_date(expense)
        if expense.get('linkedLoanId'):
            loan = await db.loans.find_one({"id": expense['linkedLoanId']}, {"_id": 0})
            if loan:
                expense['linkedLoanName'] = loan.get('loanName')
        if expense.get('linkedInsuranceId'):
            insurance = await db.insurances.find_one({"id": expense['linkedInsuranceId']}, {"_id": 0})
            if insurance:
                expense['linkedInsuranceName'] = insurance.get('policyName')
        result.append(expense)
    return result


@router.post("/process-deductions")
async def process_fixed_expense_deductions():
    today = datetime.now(timezone.utc).date().isoformat()
    fixed_expenses = await db.expenses.find({"expenseType": "Fixed"}, {"_id": 0}).to_list(1000)
    processed = []
    errors = []
    for expense in fixed_expenses:
        try:
            next_date = calculate_next_deduction_date(expense)
            if next_date == today:
                linked_account_id = expense.get('linkedAccountId')
                amount = expense.get('expectedAmount', 0)
                if linked_account_id and amount > 0:
                    account = await db.accounts.find_one({"id": linked_account_id}, {"_id": 0})
                    if account:
                        new_balance = account.get('currentBalance', 0) - amount
                        await db.accounts.update_one({"id": linked_account_id}, {"$set": {"currentBalance": new_balance}})
                        await db.expenses.update_one({"id": expense['id']}, {"$set": {"isPaid": True, "lastPaidDate": today}})
                        processed.append({
                            "expenseId": expense['id'], "expenseName": expense.get('expenseName'),
                            "amount": amount, "accountId": linked_account_id,
                            "accountName": account.get('accountName'), "newBalance": new_balance
                        })
        except Exception as e:
            errors.append({"expenseId": expense.get('id'), "error": str(e)})
    return {"processedCount": len(processed), "processed": processed, "errors": errors, "processedDate": today}



@router.get("/by-month")
async def get_expenses_by_month(request: Request, month: Optional[str] = None):
    """Get expenses filtered by month (YYYY-MM). Returns current month if not specified.
    Also returns prepaid expenses from previous months targeting this month."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)

    now = datetime.now(timezone.utc)
    target_month = month or f"{now.year}-{now.month:02d}"

    try:
        year, mon = int(target_month.split("-")[0]), int(target_month.split("-")[1])
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    all_expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(1000)

    result = []
    for exp in all_expenses:
        if isinstance(exp.get('createdAt'), str):
            exp['createdAt'] = datetime.fromisoformat(exp['createdAt'])

        # Skip prepaid child records entirely - they're just tracking records
        # The parent expense will be enriched with prepaid status instead
        if exp.get('linkedPaymentId'):
            continue

        # Check if this is an expense explicitly assigned to this month
        if exp.get('expenseMonth') == target_month:
            exp['_displayStatus'] = 'prepaid' if exp.get('prepaidFlag') else 'scheduled'
            result.append(exp)
            continue

        # Skip expenses with expenseMonth set for a different month
        if exp.get('expenseMonth') and exp.get('expenseMonth') != target_month:
            continue

        freq = exp.get('frequency', 'Monthly')
        # Skip one-time expenses not in this month
        if freq == 'One-Time':
            ot = exp.get('oneTimeDate', '')
            if ot and ot[:7] == target_month:
                result.append(exp)
            continue

        # For recurring expenses, check if due this month
        if freq in ('Daily', 'Weekly', 'Bi-Weekly', 'Monthly'):
            result.append(exp)
        elif freq == 'Quarterly':
            start_month = _parse_quarter_start(exp.get('selectedQuarter'))
            if start_month and (mon - start_month) % 3 == 0:
                result.append(exp)
        elif freq == 'Half-Yearly':
            start_month = _parse_half_start(exp.get('selectedHalf'))
            if start_month and (mon - start_month) % 6 == 0:
                result.append(exp)
        elif freq == 'Yearly':
            sm = _parse_month_num(exp.get('selectedMonth'))
            if sm == mon:
                result.append(exp)

    # Enrich each expense with payment status for the target month
    # Batch query: get all prepaid records for this month at once
    expense_ids = [exp.get('id') for exp in result if exp.get('id') and not exp.get('_displayStatus')]
    prepaid_map = {}
    if expense_ids:
        prepaid_records = await db.expenses.find({
            "linkedPaymentId": {"$in": expense_ids},
            "expenseMonth": target_month,
            "prepaidFlag": True
        }, {"_id": 0, "linkedPaymentId": 1}).to_list(500)
        for rec in prepaid_records:
            prepaid_map[rec.get("linkedPaymentId")] = True

    # Determine if this is the current month
    now = datetime.now(timezone.utc)
    current_month_key = f"{now.year}-{now.month:02d}"
    is_current_month = (target_month == current_month_key)
    today_day = now.day

    for exp in result:
        if not exp.get('_displayStatus'):
            exp_id = exp.get('id')
            if exp_id and prepaid_map.get(exp_id):
                exp['_displayStatus'] = 'prepaid'
            elif exp.get('isPaid') and exp.get('lastPaidDate', '')[:7] == target_month:
                exp['_displayStatus'] = 'paid'
            elif is_current_month:
                # Auto-mark as paid if due date has passed in the current month
                due_day = None
                sd = exp.get('selectedDate')
                if sd:
                    try:
                        due_day = int(sd)
                    except (ValueError, TypeError):
                        pass
                if due_day and due_day <= today_day:
                    exp['_displayStatus'] = 'paid'
                else:
                    exp['_displayStatus'] = 'pending'
            else:
                exp['_displayStatus'] = 'pending'

    return result


def _parse_quarter_start(q):
    mapping = {"Q1 (Jan-Mar)": 1, "Q2 (Apr-Jun)": 4, "Q3 (Jul-Sep)": 7, "Q4 (Oct-Dec)": 10}
    return mapping.get(q)

def _parse_half_start(h):
    mapping = {"H1 (Jan-Jun)": 1, "H2 (Jul-Dec)": 7}
    return mapping.get(h)

def _parse_month_num(m):
    months = {"January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6,
              "July": 7, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
    return months.get(m)



@router.get("/monthly-summary")
async def get_monthly_summary(request: Request, last: int = 6):
    """Get aggregated expense summary per month for the last N months."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)

    all_expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(5000)
    # Also get income for % of income calculation
    income_sources = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)

    now = datetime.now(timezone.utc)
    months = []
    for i in range(last - 1, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append(f"{y}-{m:02d}")

    # Category groups
    ESSENTIAL = {"Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"}
    LIFESTYLE = {"Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"}
    WEALTH = {"Investments", "Savings"}

    def categorize(cat):
        if cat in ESSENTIAL:
            return "essential"
        if cat in LIFESTYLE:
            return "lifestyle"
        if cat in WEALTH:
            return "wealth"
        return "essential"  # default

    def calc_monthly_income_total(sources):
        total = 0
        for src in sources:
            amt = src.get("expectedAmount", 0) or 0
            freq = src.get("frequency", "Monthly")
            if freq == "Daily":
                total += amt * 30
            elif freq == "Weekly":
                total += amt * 4.33
            elif freq == "Monthly":
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

    monthly_income = calc_monthly_income_total(income_sources)

    result = []
    for mk in months:
        y, m = int(mk.split("-")[0]), int(mk.split("-")[1])
        total = 0
        essential = 0
        lifestyle = 0
        wealth = 0
        category_breakdown = {}
        day_totals = {}

        for exp in all_expenses:
            if exp.get('linkedPaymentId'):
                continue
            freq = exp.get('frequency', 'Monthly')
            amt = exp.get('expectedAmount', 0) or 0
            cat = exp.get('category', 'Other')

            applies = False
            if freq == 'One-Time':
                ot = exp.get('oneTimeDate', '')
                if ot and ot[:7] == mk:
                    applies = True
            elif freq in ('Daily',):
                applies = True
                amt = amt * monthrange(y, m)[1]
            elif freq in ('Weekly', 'Bi-Weekly'):
                applies = True
                amt = amt * (4.33 if freq == 'Weekly' else 2.17)
            elif freq == 'Monthly':
                applies = True
            elif freq == 'Quarterly':
                start = _parse_quarter_start(exp.get('selectedQuarter'))
                if start and (m - start) % 3 == 0:
                    applies = True
            elif freq == 'Half-Yearly':
                start = _parse_half_start(exp.get('selectedHalf'))
                if start and (m - start) % 6 == 0:
                    applies = True
            elif freq == 'Yearly':
                sm = _parse_month_num(exp.get('selectedMonth'))
                if sm == m:
                    applies = True

            if applies:
                total += amt
                grp = categorize(cat)
                if grp == "essential":
                    essential += amt
                elif grp == "lifestyle":
                    lifestyle += amt
                else:
                    wealth += amt

                category_breakdown[cat] = category_breakdown.get(cat, 0) + amt

                # Track by day for daily heatmap
                due_day = exp.get('selectedDate')
                if due_day:
                    try:
                        d = int(due_day)
                        day_totals[d] = day_totals.get(d, 0) + amt
                    except (ValueError, TypeError):
                        pass

        # Sort categories
        top_categories = sorted(category_breakdown.items(), key=lambda x: -x[1])[:5]

        result.append({
            "month": mk,
            "total": round(total),
            "essential": round(essential),
            "lifestyle": round(lifestyle),
            "wealth": round(wealth),
            "incomeTotal": round(monthly_income),
            "percentOfIncome": round((total / monthly_income * 100) if monthly_income > 0 else 0, 1),
            "topCategories": [{"category": c, "amount": round(a)} for c, a in top_categories],
            "dayTotals": day_totals,
        })

    # Compute insights
    totals = [r["total"] for r in result]
    insights = []
    if len(totals) >= 2 and totals[-2] > 0:
        growth = round((totals[-1] - totals[-2]) / totals[-2] * 100, 1)
        result[-1]["changeVsLastMonth"] = growth
        if len(totals) >= 3:
            avg_growth_rates = []
            for i in range(1, len(totals)):
                if totals[i - 1] > 0:
                    avg_growth_rates.append((totals[i] - totals[i - 1]) / totals[i - 1] * 100)
            if avg_growth_rates:
                avg_g = round(sum(avg_growth_rates) / len(avg_growth_rates), 1)
                if abs(avg_g) >= 1:
                    direction = "rising" if avg_g > 0 else "falling"
                    insights.append(f"Spending {direction} ~{abs(avg_g)}% per month")

    if totals:
        highest_idx = totals.index(max(totals))
        lowest_idx = totals.index(min(totals))
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        h_m = int(result[highest_idx]["month"].split("-")[1])
        insights.append(f"Highest month: {month_names[h_m - 1]} (₹{max(totals):,.0f})")

    # Lifestyle % check
    lifestyle_pcts = []
    for r in result:
        if r["total"] > 0:
            lifestyle_pcts.append(r["lifestyle"] / r["total"] * 100)
    if lifestyle_pcts:
        avg_ls = sum(lifestyle_pcts) / len(lifestyle_pcts)
        if avg_ls >= 30:
            insights.append(f"Lifestyle consistently above {round(avg_ls)}%")

    return {
        "months": result,
        "insights": insights[:3],
        "avgMonthlySpend": round(sum(totals) / len(totals)) if totals else 0,
        "highestSpendMonth": result[totals.index(max(totals))]["month"] if totals else None,
        "lowestSpendMonth": result[totals.index(min(totals))]["month"] if totals else None,
    }


@router.get("/behavior-insights")
async def get_behavior_insights(request: Request):
    """Cross-analysis of spending patterns: weekend vs weekday, salary-week spikes, category trends, etc."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)

    all_expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(5000)
    income_sources = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)

    now = datetime.now(timezone.utc)
    insights = []

    # Build 6-month data for analysis
    months_data = []
    for i in range(5, -1, -1):
        y, m = now.year, now.month - i
        while m <= 0:
            m += 12
            y -= 1
        mk = f"{y}-{m:02d}"
        _, days_in_month = monthrange(y, m)

        month_total = 0
        first_week = 0  # days 1-7
        last_week = 0   # last 7 days
        mid_month = 0   # days 8 to (days_in_month-7)
        weekend_total = 0
        weekday_total = 0
        category_totals = {}

        for exp in all_expenses:
            if exp.get('linkedPaymentId'):
                continue
            freq = exp.get('frequency', 'Monthly')
            amt = exp.get('expectedAmount', 0) or 0
            cat = exp.get('category', 'Other')

            applies = False
            due_day = None

            if freq == 'One-Time':
                ot = exp.get('oneTimeDate', '')
                if ot and ot[:7] == mk:
                    applies = True
                    try:
                        due_day = int(ot.split('-')[2])
                    except (ValueError, IndexError):
                        due_day = 15
            elif freq == 'Monthly':
                applies = True
                try:
                    due_day = int(exp.get('selectedDate', '1'))
                except (ValueError, TypeError):
                    due_day = 1
            elif freq == 'Daily':
                applies = True
                # Spread across all days
                daily_amt = amt
                for d in range(1, days_in_month + 1):
                    from datetime import date as dt_date
                    try:
                        day_date = dt_date(y, m, d)
                    except ValueError:
                        continue
                    wd = day_date.weekday()
                    if wd >= 5:
                        weekend_total += daily_amt
                    else:
                        weekday_total += daily_amt
                    if d <= 7:
                        first_week += daily_amt
                    elif d > days_in_month - 7:
                        last_week += daily_amt
                    else:
                        mid_month += daily_amt
                month_total += amt * days_in_month
                category_totals[cat] = category_totals.get(cat, 0) + amt * days_in_month
                continue
            elif freq in ('Weekly', 'Bi-Weekly'):
                applies = True
                due_day_name = exp.get('selectedDay', 'Monday')
                day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
                target_wd = day_map.get(due_day_name, 0)
                multiplier = 4.33 if freq == 'Weekly' else 2.17
                if target_wd >= 5:
                    weekend_total += amt * multiplier
                else:
                    weekday_total += amt * multiplier
                month_total += amt * multiplier
                category_totals[cat] = category_totals.get(cat, 0) + amt * multiplier
                first_week += amt * (multiplier / 4)
                last_week += amt * (multiplier / 4)
                mid_month += amt * (multiplier / 2)
                continue
            elif freq == 'Quarterly':
                start = _parse_quarter_start(exp.get('selectedQuarter'))
                if start and (m - start) % 3 == 0:
                    applies = True
                    try:
                        due_day = int(exp.get('selectedDate', '1'))
                    except (ValueError, TypeError):
                        due_day = 1
            elif freq == 'Half-Yearly':
                start = _parse_half_start(exp.get('selectedHalf'))
                if start and (m - start) % 6 == 0:
                    applies = True
                    try:
                        due_day = int(exp.get('selectedDate', '1'))
                    except (ValueError, TypeError):
                        due_day = 1
            elif freq == 'Yearly':
                sm = _parse_month_num(exp.get('selectedMonth'))
                if sm == m:
                    applies = True
                    try:
                        due_day = int(exp.get('selectedDate', '1'))
                    except (ValueError, TypeError):
                        due_day = 1

            if applies and due_day:
                from datetime import date as dt_date
                try:
                    day_date = dt_date(y, m, min(due_day, days_in_month))
                except ValueError:
                    day_date = dt_date(y, m, 1)
                wd = day_date.weekday()
                if wd >= 5:
                    weekend_total += amt
                else:
                    weekday_total += amt
                if due_day <= 7:
                    first_week += amt
                elif due_day > days_in_month - 7:
                    last_week += amt
                else:
                    mid_month += amt
                month_total += amt
                category_totals[cat] = category_totals.get(cat, 0) + amt

        months_data.append({
            "month": mk,
            "total": round(month_total),
            "first_week": round(first_week),
            "last_week": round(last_week),
            "mid_month": round(mid_month),
            "weekend": round(weekend_total),
            "weekday": round(weekday_total),
            "categories": {k: round(v) for k, v in category_totals.items()},
        })

    # --- Generate Behavioral Insights ---

    # 1. Weekend vs Weekday Pattern
    total_weekend = sum(m["weekend"] for m in months_data)
    total_weekday = sum(m["weekday"] for m in months_data)
    total_all = total_weekend + total_weekday
    if total_all > 0:
        wknd_pct = round(total_weekend / total_all * 100, 1)
        wkdy_pct = round(total_weekday / total_all * 100, 1)
        if wknd_pct > 35:
            insights.append({
                "type": "weekend_heavy",
                "icon": "calendar",
                "title": "Weekend Spender",
                "description": f"{wknd_pct}% of your spending happens on weekends. Consider setting weekend budgets.",
                "metric": f"{wknd_pct}% weekend",
                "trend": "warning",
            })
        elif wknd_pct < 15:
            insights.append({
                "type": "weekday_heavy",
                "icon": "briefcase",
                "title": "Weekday Pattern",
                "description": f"{wkdy_pct}% of spending is on weekdays — mostly bills and essentials.",
                "metric": f"{wkdy_pct}% weekday",
                "trend": "neutral",
            })
        else:
            insights.append({
                "type": "balanced_week",
                "icon": "scale",
                "title": "Balanced Spending",
                "description": f"Weekend ({wknd_pct}%) vs Weekday ({wkdy_pct}%) — spending is evenly distributed.",
                "metric": f"{wknd_pct}% / {wkdy_pct}%",
                "trend": "positive",
            })

    # 2. Salary Week Spike (first week vs rest)
    total_first_week = sum(m["first_week"] for m in months_data)
    total_rest = sum(m["mid_month"] + m["last_week"] for m in months_data)
    if total_first_week + total_rest > 0:
        fw_pct = round(total_first_week / (total_first_week + total_rest) * 100, 1)
        if fw_pct > 40:
            insights.append({
                "type": "salary_spike",
                "icon": "trending-up",
                "title": "Salary Week Spike",
                "description": f"{fw_pct}% of monthly spending clusters in the first week. EMIs and bills hit right after salary.",
                "metric": f"{fw_pct}% in Week 1",
                "trend": "warning",
            })
        elif fw_pct > 25:
            insights.append({
                "type": "salary_moderate",
                "icon": "clock",
                "title": "Front-loaded Month",
                "description": f"{fw_pct}% of spending happens in the first week — typical for salary-driven expenses.",
                "metric": f"{fw_pct}% in Week 1",
                "trend": "neutral",
            })

    # 3. Month-End Pressure
    total_last_week = sum(m["last_week"] for m in months_data)
    total_month = sum(m["total"] for m in months_data)
    if total_month > 0:
        lw_pct = round(total_last_week / total_month * 100, 1)
        if lw_pct > 30:
            insights.append({
                "type": "month_end_pressure",
                "icon": "alert-triangle",
                "title": "Month-End Pressure",
                "description": f"{lw_pct}% of spending hits in the last week. Consider spreading payments.",
                "metric": f"{lw_pct}% in last week",
                "trend": "warning",
            })

    # 4. Category Consistency — find categories that appear every month
    all_cats = set()
    for md in months_data:
        all_cats.update(md["categories"].keys())

    consistent_cats = []
    growing_cats = []
    for cat in all_cats:
        cat_vals = [md["categories"].get(cat, 0) for md in months_data]
        non_zero = [v for v in cat_vals if v > 0]
        if len(non_zero) >= 4:  # appears in at least 4 of 6 months
            avg_val = sum(non_zero) / len(non_zero)
            consistent_cats.append({"category": cat, "avg": avg_val, "months": len(non_zero)})
            # Check growth trend
            if len(non_zero) >= 3:
                recent = sum(cat_vals[-2:]) / max(1, len([v for v in cat_vals[-2:] if v > 0]))
                older = sum(cat_vals[:2]) / max(1, len([v for v in cat_vals[:2] if v > 0]))
                if older > 0 and recent > older * 1.2:
                    growth = round((recent - older) / older * 100)
                    growing_cats.append({"category": cat, "growth": growth})

    if growing_cats:
        growing_cats.sort(key=lambda x: -x["growth"])
        top_growing = growing_cats[0]
        insights.append({
            "type": "category_growth",
            "icon": "arrow-up-right",
            "title": f"{top_growing['category']} Rising",
            "description": f"{top_growing['category']} spending increased ~{top_growing['growth']}% over 6 months.",
            "metric": f"+{top_growing['growth']}%",
            "trend": "warning",
        })

    # 5. Spending Momentum (are expenses increasing month-over-month?)
    totals = [m["total"] for m in months_data if m["total"] > 0]
    if len(totals) >= 3:
        growth_rates = []
        for i in range(1, len(totals)):
            if totals[i - 1] > 0:
                growth_rates.append((totals[i] - totals[i - 1]) / totals[i - 1] * 100)
        if growth_rates:
            avg_growth = round(sum(growth_rates) / len(growth_rates), 1)
            if avg_growth > 5:
                insights.append({
                    "type": "spending_acceleration",
                    "icon": "rocket",
                    "title": "Spending Accelerating",
                    "description": f"Average month-over-month increase of {avg_growth}%. Review discretionary expenses.",
                    "metric": f"+{avg_growth}%/mo",
                    "trend": "warning",
                })
            elif avg_growth < -5:
                insights.append({
                    "type": "spending_deceleration",
                    "icon": "shield",
                    "title": "Great Discipline",
                    "description": f"Spending is decreasing ~{abs(avg_growth)}% per month. Excellent financial control!",
                    "metric": f"{avg_growth}%/mo",
                    "trend": "positive",
                })

    # 6. Income Coverage Ratio
    monthly_income = 0
    for src in income_sources:
        amt = src.get("expectedAmount", 0) or 0
        freq = src.get("frequency", "Monthly")
        if freq == "Daily":
            monthly_income += amt * 30
        elif freq == "Weekly":
            monthly_income += amt * 4.33
        elif freq == "Monthly":
            monthly_income += amt
        elif freq == "Quarterly":
            monthly_income += amt / 3
        elif freq == "Half-Yearly":
            monthly_income += amt / 6
        elif freq == "Yearly":
            monthly_income += amt / 12
        else:
            monthly_income += amt

    if monthly_income > 0 and totals:
        avg_spend = sum(totals) / len(totals)
        coverage = round(avg_spend / monthly_income * 100, 1)
        if coverage > 90:
            insights.append({
                "type": "tight_budget",
                "icon": "alert-circle",
                "title": "Tight Budget",
                "description": f"Expenses consume {coverage}% of income. Very little room for savings.",
                "metric": f"{coverage}% used",
                "trend": "warning",
            })
        elif coverage < 60:
            insights.append({
                "type": "healthy_savings",
                "icon": "piggy-bank",
                "title": "Healthy Savings",
                "description": f"Only {coverage}% of income goes to expenses. Great savings potential!",
                "metric": f"{coverage}% used",
                "trend": "positive",
            })

    # Build month-over-month pattern for chart
    pattern_data = []
    for md in months_data:
        total = md["total"]
        pattern_data.append({
            "month": md["month"],
            "firstWeek": md["first_week"],
            "midMonth": md["mid_month"],
            "lastWeek": md["last_week"],
            "weekend": md["weekend"],
            "weekday": md["weekday"],
        })

    return {
        "insights": insights[:6],
        "patternData": pattern_data,
        "summary": {
            "weekendPct": round(total_weekend / total_all * 100, 1) if total_all > 0 else 0,
            "weekdayPct": round(total_weekday / total_all * 100, 1) if total_all > 0 else 0,
            "firstWeekPct": round(total_first_week / total_month * 100, 1) if total_month > 0 else 0,
            "consistentCategories": [c["category"] for c in sorted(consistent_cats, key=lambda x: -x["avg"])[:5]],
        },
    }


@router.get("/weekly-summary")
async def get_weekly_summary(request: Request, last: int = 8):
    """Get aggregated expense summary per week for the last N weeks."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)

    all_expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(5000)

    now = datetime.now(timezone.utc)
    today = now.date()

    # Build week ranges (Mon-Sun)
    # Current week start
    current_week_start = today - timedelta(days=today.weekday())
    weeks = []
    for i in range(last - 1, -1, -1):
        ws = current_week_start - timedelta(weeks=i)
        we = ws + timedelta(days=6)
        weeks.append({"start": ws, "end": we, "label": f"{ws.strftime('%d %b')} - {we.strftime('%d %b')}"})

    DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    ESSENTIAL_CATS = {"Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"}
    LIFESTYLE_CATS = {"Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"}
    WEALTH_CATS = {"Investments", "Savings"}

    result = []
    for week in weeks:
        ws, we = week["start"], week["end"]
        total = 0
        by_day = {d: 0 for d in DAY_NAMES}
        weekend_total = 0
        weekday_total = 0
        categories = {}
        essential_total = 0
        lifestyle_total = 0
        wealth_total = 0

        def _classify(cat_name, amount):
            nonlocal essential_total, lifestyle_total, wealth_total
            if cat_name in ESSENTIAL_CATS:
                essential_total += amount
            elif cat_name in LIFESTYLE_CATS:
                lifestyle_total += amount
            elif cat_name in WEALTH_CATS:
                wealth_total += amount
            else:
                essential_total += amount

        for exp in all_expenses:
            if exp.get('linkedPaymentId'):
                continue
            freq = exp.get('frequency', 'Monthly')
            amt = exp.get('expectedAmount', 0) or 0

            if freq == 'Daily':
                daily_amt = amt
                for d_offset in range(7):
                    day_date = ws + timedelta(days=d_offset)
                    if day_date <= we:
                        day_name = DAY_NAMES[day_date.weekday()]
                        by_day[day_name] += daily_amt
                        total += daily_amt
                        if day_date.weekday() >= 5:
                            weekend_total += daily_amt
                        else:
                            weekday_total += daily_amt
                        cat = exp.get('category', 'Other')
                        categories[cat] = categories.get(cat, 0) + daily_amt
                        _classify(cat, daily_amt)
            elif freq == 'Weekly':
                selected_day = exp.get('selectedDay', '')
                if selected_day:
                    day_mapping = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
                    target_idx = day_mapping.get(selected_day, 0)
                    target_date = ws + timedelta(days=target_idx)
                    if ws <= target_date <= we:
                        day_name = DAY_NAMES[target_idx]
                        by_day[day_name] += amt
                        total += amt
                        if target_idx >= 5:
                            weekend_total += amt
                        else:
                            weekday_total += amt
                        cat = exp.get('category', 'Other')
                        categories[cat] = categories.get(cat, 0) + amt
                        _classify(cat, amt)
            elif freq == 'Monthly':
                due_day_str = exp.get('selectedDate', '')
                if due_day_str:
                    try:
                        due_day = int(due_day_str)
                        # Check if this due day falls within the week
                        for d_offset in range(7):
                            day_date = ws + timedelta(days=d_offset)
                            if day_date.day == due_day and day_date <= we:
                                day_name = DAY_NAMES[day_date.weekday()]
                                by_day[day_name] += amt
                                total += amt
                                if day_date.weekday() >= 5:
                                    weekend_total += amt
                                else:
                                    weekday_total += amt
                                cat = exp.get('category', 'Other')
                                categories[cat] = categories.get(cat, 0) + amt
                                _classify(cat, amt)
                                break
                    except (ValueError, TypeError):
                        pass

        top_categories = sorted(categories.items(), key=lambda x: -x[1])[:6]
        result.append({
            "weekStart": ws.isoformat(),
            "weekEnd": we.isoformat(),
            "label": week["label"],
            "total": round(total),
            "byDay": {d: round(v) for d, v in by_day.items()},
            "weekdayTotal": round(weekday_total),
            "weekendTotal": round(weekend_total),
            "essential": round(essential_total),
            "lifestyle": round(lifestyle_total),
            "wealth": round(wealth_total),
            "topCategories": [{"category": c, "amount": round(a)} for c, a in top_categories],
        })

    # Insights
    insights = []
    totals = [w["total"] for w in result]
    weekend_pcts = []
    for w in result:
        if w["total"] > 0:
            weekend_pcts.append(w["weekendTotal"] / w["total"] * 100)

    if weekend_pcts:
        avg_wknd = round(sum(weekend_pcts) / len(weekend_pcts), 1)
        if avg_wknd >= 25:
            insights.append(f"Weekend spending avg {avg_wknd}% of weekly total")

    if len(totals) >= 2:
        trend = "increasing" if totals[-1] > totals[-2] else "decreasing" if totals[-1] < totals[-2] else "stable"
        insights.append(f"Week-over-week spending is {trend}")

    # Find spike days
    day_sums = {d: 0 for d in DAY_NAMES}
    for w in result:
        for d, v in w["byDay"].items():
            day_sums[d] += v
    if any(day_sums.values()):
        peak_day = max(day_sums, key=day_sums.get)
        insights.append(f"Peak spending day: {peak_day}")

    return {
        "weeks": result,
        "insights": insights[:3],
    }

@router.post("/{expense_id}/prepay")
async def prepay_expense(expense_id: str, request: Request):
    """Mark an expense as prepaid for next month. Creates a record for next month and marks it paid."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id

    expense = await db.expenses.find_one(user_filter, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    now = datetime.now(timezone.utc)
    current_month = f"{now.year}-{now.month:02d}"

    # Calculate next month
    if now.month == 12:
        next_month = f"{now.year + 1}-01"
    else:
        next_month = f"{now.year}-{now.month + 1:02d}"

    # Check if already prepaid for next month
    existing = await db.expenses.find_one({
        "userId": user.get("user_id"),
        "linkedPaymentId": expense_id,
        "expenseMonth": next_month
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Already prepaid for next month")

    import uuid
    prepaid_id = str(uuid.uuid4())

    # Create a prepaid record for next month
    prepaid_doc = {
        "id": prepaid_id,
        "userId": user.get("user_id"),
        "expenseName": expense.get("expenseName", ""),
        "expenseType": expense.get("expenseType", "Fixed"),
        "category": expense.get("category", ""),
        "expectedAmount": expense.get("expectedAmount", 0),
        "frequency": "One-Time",
        "expenseMonth": next_month,
        "dueDate": f"{next_month}-{expense.get('selectedDate', '01')}",
        "paidDate": now.date().isoformat(),
        "prepaidFlag": True,
        "isPaid": True,
        "linkedPaymentId": expense_id,
        "selectedDate": expense.get("selectedDate"),
        "createdAt": now.isoformat(),
    }
    await db.expenses.insert_one(prepaid_doc)

    # Update original expense to note the prepayment
    await db.expenses.update_one(
        {"id": expense_id},
        {"$set": {"lastPaidDate": now.date().isoformat()}}
    )

    return {
        "message": f"Prepaid {expense.get('expenseName')} for {next_month}",
        "prepaidId": prepaid_id,
        "expenseMonth": next_month,
        "amount": expense.get("expectedAmount", 0),
        "paidDate": now.date().isoformat()
    }


@router.post("/{expense_id}/mark-paid")
async def mark_expense_paid(expense_id: str, request: Request):
    """Mark an expense as paid for the current month."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id

    expense = await db.expenses.find_one(user_filter, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    now = datetime.now(timezone.utc)
    await db.expenses.update_one(
        {"id": expense_id},
        {"$set": {
            "isPaid": True,
            "paidDate": now.date().isoformat(),
            "lastPaidDate": now.date().isoformat()
        }}
    )
    return {"message": "Expense marked as paid", "id": expense_id, "paidDate": now.date().isoformat()}


@router.post("/{expense_id}/unmark-paid")
async def unmark_expense_paid(expense_id: str, request: Request):
    """Undo marking an expense as paid."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id

    expense = await db.expenses.find_one(user_filter, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    await db.expenses.update_one(
        {"id": expense_id},
        {"$set": {"isPaid": False, "paidDate": None, "lastPaidDate": None}}
    )
    return {"message": "Payment undone", "id": expense_id}


@router.post("/{expense_id}/undo-prepay")
async def undo_prepay_expense(expense_id: str, request: Request):
    """Undo a prepayment — deletes the prepaid child record for next month."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id

    expense = await db.expenses.find_one(user_filter, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    now = datetime.now(timezone.utc)
    if now.month == 12:
        next_month = f"{now.year + 1}-01"
    else:
        next_month = f"{now.year}-{now.month + 1:02d}"

    result = await db.expenses.delete_one({
        "linkedPaymentId": expense_id,
        "expenseMonth": next_month,
        "userId": user.get("user_id")
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="No prepaid record found for next month")

    return {"message": f"Prepayment undone for {next_month}", "id": expense_id}



# ─────────────────────────────────────────────────────────
# FINANCIAL INTELLIGENCE ENGINE — Rule-Based Overspend Analysis
# ─────────────────────────────────────────────────────────

ESSENTIAL_CATS = {"Housing", "Utilities", "Food", "Medical", "Education", "Insurance", "EMI"}
LIFESTYLE_CATS = {"Travel", "Shopping", "Subscriptions", "Business Expense", "Salary Paid"}
WEALTH_CATS = {"Investments", "Savings"}
GROWTH_RATE = 0.10  # Conservative 10% annual return
RECOMMENDED_RATIOS = {"essential": 50, "lifestyle": 30, "wealth": 20}


def _classify_category(cat: str) -> str:
    if cat in ESSENTIAL_CATS:
        return "essential"
    elif cat in LIFESTYLE_CATS:
        return "lifestyle"
    elif cat in WEALTH_CATS:
        return "wealth"
    return "essential"


def _future_value(principal: float, rate: float, years: int) -> float:
    """FV = P × (1 + r)^n — conservative compounding"""
    return round(principal * ((1 + rate) ** years))


@router.get("/overspend-analysis")
async def get_overspend_analysis(request: Request):
    """
    Rule-based Financial Intelligence Engine.
    3-Layer Trigger: Budget Breach, Behavioral Drift, Income Ratio.
    Returns: overspend alerts, safety/growth/goal impact, reallocation advice.
    """
    user = await get_current_user(request)
    user_filter = await get_user_filter(request)

    now = datetime.now(timezone.utc)
    current_month = f"{now.year}-{now.month:02d}"

    # ── Gather 6 months of expense data ──
    all_expenses = await db.expenses.find(user_filter, {"_id": 0}).to_list(5000)

    # Build monthly category totals for last 6 months
    months_data = {}
    for i in range(6):
        d = now - timedelta(days=30 * i)
        mk = f"{d.year}-{d.month:02d}"
        months_data[mk] = {"categories": {}, "essential": 0, "lifestyle": 0, "wealth": 0, "total": 0}

    for exp in all_expenses:
        freq = exp.get("frequency", "Monthly")
        amt = exp.get("expectedAmount", 0) or 0
        cat = exp.get("category", "Other")
        group = _classify_category(cat)

        if freq == "Daily":
            monthly_amt = amt * 30
        elif freq == "Weekly":
            monthly_amt = amt * 4.33
        elif freq == "Quarterly":
            monthly_amt = amt / 3
        elif freq == "Half-Yearly":
            monthly_amt = amt / 6
        elif freq == "Yearly":
            monthly_amt = amt / 12
        else:
            monthly_amt = amt

        # Add to all 6 months (since these are recurring)
        for mk in months_data:
            if cat not in months_data[mk]["categories"]:
                months_data[mk]["categories"][cat] = 0
            months_data[mk]["categories"][cat] += monthly_amt
            months_data[mk][group] += monthly_amt
            months_data[mk]["total"] += monthly_amt

    # One-time expenses: add only to their specific month
    for exp in all_expenses:
        if exp.get("frequency") == "One-Time" and exp.get("oneTimeDate"):
            otd = exp["oneTimeDate"][:7]
            if otd in months_data:
                cat = exp.get("category", "Other")
                amt = exp.get("expectedAmount", 0) or 0
                group = _classify_category(cat)
                months_data[otd]["categories"][cat] = months_data[otd]["categories"].get(cat, 0) + amt
                months_data[otd][group] += amt
                months_data[otd]["total"] += amt

    # ── Get income ──
    incomes = await db.income.find(user_filter, {"_id": 0}).to_list(500)
    monthly_income = 0
    for inc in incomes:
        iamt = inc.get("amount", 0) or 0
        ifreq = inc.get("frequency", "Monthly")
        if ifreq == "Monthly":
            monthly_income += iamt
        elif ifreq == "Yearly":
            monthly_income += iamt / 12
        elif ifreq == "Weekly":
            monthly_income += iamt * 4.33
        elif ifreq == "Daily":
            monthly_income += iamt * 30
        elif ifreq == "Quarterly":
            monthly_income += iamt / 3
    if monthly_income == 0:
        monthly_income = 313000  # fallback

    # ── Get goals ──
    goals = await db.goals.find(user_filter, {"_id": 0}).to_list(100)
    top_goal = None
    for g in goals:
        gap = (g.get("targetAmount", 0) or 0) - (g.get("currentAmount", 0) or 0)
        if gap > 0:
            if not top_goal or gap < top_goal["gap"]:
                top_goal = {"name": g.get("name", "Financial Goal"), "target": g.get("targetAmount", 0), "current": g.get("currentAmount", 0), "gap": gap}

    # ── Get liquid assets for Days of Safety ──
    assets = await db.assets.find(user_filter, {"_id": 0}).to_list(500)
    liquid_assets = sum(a.get("currentValue", 0) or 0 for a in assets if a.get("assetType") in ("Cash", "Savings", "Fixed Deposit", "Liquid Fund", "Emergency Fund", None))
    if liquid_assets == 0:
        # fallback: use savings from investments
        investments = await db.investments.find(user_filter, {"_id": 0}).to_list(500)
        liquid_assets = sum(inv.get("currentValue", 0) or 0 for inv in investments if inv.get("investmentType") in ("Liquid Fund", "Savings", "FD", None))

    # ── Current month data ──
    cm = months_data.get(current_month, {"categories": {}, "essential": 0, "lifestyle": 0, "wealth": 0, "total": 0})
    daily_essential = cm["essential"] / 30 if cm["essential"] > 0 else 1

    # ── 3-Month Average (excluding current month) ──
    past_months = sorted(months_data.keys())[:-1][:3]  # last 3 months before current
    avg_by_category = {}
    avg_essential = 0
    avg_lifestyle = 0
    avg_wealth = 0
    if past_months:
        for mk in past_months:
            for cat, amt in months_data[mk]["categories"].items():
                avg_by_category[cat] = avg_by_category.get(cat, 0) + amt
            avg_essential += months_data[mk]["essential"]
            avg_lifestyle += months_data[mk]["lifestyle"]
            avg_wealth += months_data[mk]["wealth"]
        n = len(past_months)
        avg_by_category = {k: v / n for k, v in avg_by_category.items()}
        avg_essential /= n
        avg_lifestyle /= n
        avg_wealth /= n

    # ═══════════════════════════════════════
    # LAYER 1: Category-Level Overspend Alerts
    # ═══════════════════════════════════════
    overspend_alerts = []
    for cat, current_amt in cm["categories"].items():
        cat_avg = avg_by_category.get(cat, 0)
        if cat_avg <= 0:
            continue

        overspend = current_amt - cat_avg
        drift_pct = (overspend / cat_avg * 100) if cat_avg > 0 else 0

        # Rule 1: Budget Breach (> 3-month avg)
        # Rule 2: Behavioral Drift (> 3M avg × 1.20)
        if drift_pct < 10:
            continue  # No alert for < 10% drift

        severity = 1 if drift_pct < 20 else (2 if drift_pct < 30 else 3)

        # Safety Impact: overspend / daily essential = extra safety days lost
        safety_days = round(overspend / daily_essential, 1) if daily_essential > 0 else 0

        # Growth Impact: FV at 10% for 5yr and 10yr
        fv_5yr = _future_value(overspend * 12, GROWTH_RATE, 5)
        fv_10yr = _future_value(overspend * 12, GROWTH_RATE, 10)

        # Goal Impact
        goal_impact_pct = round(overspend / top_goal["gap"] * 100, 1) if top_goal and top_goal["gap"] > 0 else 0

        overspend_alerts.append({
            "category": cat,
            "group": _classify_category(cat),
            "currentAmount": round(current_amt),
            "threeMonthAvg": round(cat_avg),
            "overspendAmount": round(overspend),
            "driftPercent": round(drift_pct, 1),
            "severity": severity,
            "safetyDaysImpact": safety_days,
            "futureValue5yr": fv_5yr,
            "futureValue10yr": fv_10yr,
            "goalImpactPercent": goal_impact_pct,
            "goalName": top_goal["name"] if top_goal else None,
        })

    overspend_alerts.sort(key=lambda x: -x["severity"])

    # ═══════════════════════════════════════
    # LAYER 2: Income Ratio Triggers
    # ═══════════════════════════════════════
    income_ratio_alerts = []
    lifestyle_pct = round(cm["lifestyle"] / monthly_income * 100, 1) if monthly_income > 0 else 0
    wealth_pct = round(cm["wealth"] / monthly_income * 100, 1) if monthly_income > 0 else 0
    essential_pct = round(cm["essential"] / monthly_income * 100, 1) if monthly_income > 0 else 0

    if lifestyle_pct > 40:
        income_ratio_alerts.append({
            "type": "lifestyle_over_40",
            "message": f"Lifestyle spending is {lifestyle_pct}% of income — above the 40% threshold.",
            "severity": 2,
            "metric": f"{lifestyle_pct}%",
        })

    if cm["lifestyle"] > cm["wealth"] and cm["wealth"] > 0:
        ratio = round(cm["lifestyle"] / cm["wealth"], 1)
        income_ratio_alerts.append({
            "type": "lifestyle_exceeds_wealth",
            "message": f"You are spending {ratio}x more on lifestyle than wealth building.",
            "severity": 2,
            "metric": f"{ratio}x",
        })

    # ═══════════════════════════════════════
    # LAYER 3: Monthly Structural Health
    # ═══════════════════════════════════════
    actual_ratios = {
        "essential": round(cm["essential"] / cm["total"] * 100, 1) if cm["total"] > 0 else 0,
        "lifestyle": round(cm["lifestyle"] / cm["total"] * 100, 1) if cm["total"] > 0 else 0,
        "wealth": round(cm["wealth"] / cm["total"] * 100, 1) if cm["total"] > 0 else 0,
    }

    structural_alerts = []
    if actual_ratios["wealth"] < 15:
        structural_alerts.append({
            "type": "wealth_below_threshold",
            "message": f"Wealth allocation at {actual_ratios['wealth']}% — below recommended 20%.",
            "severity": 2,
        })

    if actual_ratios["essential"] > 65:
        structural_alerts.append({
            "type": "essential_heavy",
            "message": f"Essential spending at {actual_ratios['essential']}% — above 50% target. Review fixed costs.",
            "severity": 1,
        })

    # ═══════════════════════════════════════
    # Wealth Shift Score
    # ═══════════════════════════════════════
    lifestyle_drift = cm["lifestyle"] - avg_lifestyle if avg_lifestyle > 0 else 0
    wealth_shift_alert = None
    if lifestyle_drift > cm["wealth"] and cm["wealth"] > 0:
        wealth_shift_alert = {
            "message": "You are drifting more than you are investing.",
            "lifestyleDrift": round(lifestyle_drift),
            "wealthAllocation": round(cm["wealth"]),
            "severity": 3,
        }

    # ═══════════════════════════════════════
    # Template Selection (deterministic)
    # ═══════════════════════════════════════
    days_of_safety = round(liquid_assets / daily_essential) if daily_essential > 0 else 0

    if days_of_safety < 90:
        template = "safety_growth"
        primary_advice = f"Focus on building your safety buffer. Current: {days_of_safety} days. Target: 180 days."
    elif actual_ratios["wealth"] < 15:
        template = "long_term_wealth"
        primary_advice = f"Increase wealth allocation from {actual_ratios['wealth']}% toward 20%."
    elif any(a["severity"] >= 2 for a in overspend_alerts):
        template = "debt_reduction"
        total_overspend = sum(a["overspendAmount"] for a in overspend_alerts if a["severity"] >= 2)
        primary_advice = f"Reduce category overspends totaling ₹{total_overspend:,.0f} to stabilize monthly budget."
    elif top_goal and top_goal["gap"] > 0:
        template = "goal_acceleration"
        primary_advice = f"Redirect savings toward {top_goal['name']} — ₹{top_goal['gap']:,.0f} remaining."
    else:
        template = "maintain"
        primary_advice = "Your financial structure is healthy. Maintain current allocation."

    # ═══════════════════════════════════════
    # Suggested Reallocation
    # ═══════════════════════════════════════
    reallocation = None
    total_overspend = sum(a["overspendAmount"] for a in overspend_alerts if a["severity"] >= 2)
    if total_overspend > 0:
        reallocation = {
            "amount": round(total_overspend * 0.75),  # suggest shifting 75%
            "source": "Lifestyle overspend",
            "destination": "Wealth Allocation" if actual_ratios["wealth"] < 20 else top_goal["name"] if top_goal else "Savings",
            "safetyDaysGained": round(total_overspend * 0.75 / daily_essential, 1) if daily_essential > 0 else 0,
            "futureValue10yr": _future_value(total_overspend * 0.75 * 12, GROWTH_RATE, 10),
        }

    return {
        "month": current_month,
        "monthlyIncome": round(monthly_income),
        "monthlySpend": round(cm["total"]),
        "daysOfSafety": days_of_safety,
        "liquidAssets": round(liquid_assets),
        "actualRatios": actual_ratios,
        "recommendedRatios": RECOMMENDED_RATIOS,
        "overspendAlerts": overspend_alerts,
        "incomeRatioAlerts": income_ratio_alerts,
        "structuralAlerts": structural_alerts,
        "wealthShiftAlert": wealth_shift_alert,
        "template": template,
        "primaryAdvice": primary_advice,
        "reallocation": reallocation,
        "topGoal": top_goal,
    }

# ---- Parameterized {expense_id} routes MUST be last to avoid path conflicts ----

@router.get("/{expense_id}")
async def get_expense(expense_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id
    expense = await db.expenses.find_one(user_filter, {"_id": 0})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if isinstance(expense.get('createdAt'), str):
        expense['createdAt'] = datetime.fromisoformat(expense['createdAt'])
    return expense


@router.put("/{expense_id}")
async def update_expense(expense_id: str, input: ExpenseCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id
    existing = await db.expenses.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    expense_dict = input.model_dump()
    expense_dict['id'] = expense_id
    expense_dict['userId'] = user.get('user_id')
    expense_dict['createdAt'] = existing['createdAt']
    await db.expenses.replace_one({"id": expense_id}, expense_dict)
    if isinstance(expense_dict.get('createdAt'), str):
        expense_dict['createdAt'] = datetime.fromisoformat(expense_dict['createdAt'])
    return expense_dict


@router.delete("/{expense_id}")
async def delete_expense(expense_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = expense_id
    existing = await db.expenses.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted successfully", "id": expense_id}




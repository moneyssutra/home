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
    for exp in result:
        if not exp.get('_displayStatus'):
            # Check if there's a prepaid record for this expense in the target month
            if exp.get('id'):
                prepaid = await db.expenses.find_one({
                    "linkedPaymentId": exp['id'],
                    "expenseMonth": target_month,
                    "prepaidFlag": True
                }, {"_id": 0})
                if prepaid:
                    exp['_displayStatus'] = 'prepaid'
                elif exp.get('isPaid') and exp.get('lastPaidDate', '')[:7] == target_month:
                    exp['_displayStatus'] = 'paid'
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
        l_m = int(result[lowest_idx]["month"].split("-")[1])
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

    result = []
    for week in weeks:
        ws, we = week["start"], week["end"]
        total = 0
        by_day = {d: 0 for d in DAY_NAMES}
        weekend_total = 0
        weekday_total = 0
        categories = {}

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
                                break
                    except (ValueError, TypeError):
                        pass

        top_categories = sorted(categories.items(), key=lambda x: -x[1])[:3]
        result.append({
            "weekStart": ws.isoformat(),
            "weekEnd": we.isoformat(),
            "label": week["label"],
            "total": round(total),
            "byDay": {d: round(v) for d, v in by_day.items()},
            "weekdayTotal": round(weekday_total),
            "weekendTotal": round(weekend_total),
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

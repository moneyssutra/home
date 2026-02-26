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

        # Skip prepaid child records - they only appear when their target month matches
        if exp.get('linkedPaymentId'):
            if exp.get('expenseMonth') == target_month:
                exp['_displayStatus'] = 'prepaid'
                result.append(exp)
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

"""Investment routes - Full CRUD with auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import uuid
import math

from database import db
from server_models import Investment, InvestmentCreate, Expense
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/investments", tags=["Investments"])


@router.post("", response_model=Investment)
async def create_investment(input: InvestmentCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    investment_dict = input.model_dump()
    investment_dict['userId'] = user.get('user_id')
    investment_obj = Investment(**investment_dict)
    doc = investment_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()

    linked_expense_id = None
    if input.autoCreateExpense and input.investmentFrequency and input.sipAmount:
        expense_name = f"SIP - {input.name}"
        expense_dict = {
            'expenseName': expense_name, 'expenseType': 'Fixed', 'category': 'Investments',
            'expectedAmount': input.sipAmount, 'frequency': input.investmentFrequency,
            'linkedAccountId': input.linkedAccountId, 'linkedInvestmentId': investment_obj.id,
            'selectedDay': input.sipSelectedDay, 'selectedDate': input.sipSelectedDate,
            'isPaid': False, 'userId': user.get('user_id')
        }
        expense_obj = Expense(**expense_dict)
        expense_doc = expense_obj.model_dump()
        expense_doc['createdAt'] = expense_doc['createdAt'].isoformat()
        await db.expenses.insert_one(expense_doc)
        linked_expense_id = expense_obj.id
        doc['linkedExpenseId'] = linked_expense_id
        investment_obj = Investment(**doc)
        investment_obj.createdAt = datetime.fromisoformat(doc['createdAt'])

    await db.investments.insert_one(doc)
    return investment_obj


@router.get("", response_model=List[Investment])
async def get_investments(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    for investment in investments:
        if isinstance(investment.get('createdAt'), str):
            investment['createdAt'] = datetime.fromisoformat(investment['createdAt'])
    return investments


@router.post("/repair-expenses")
async def repair_missing_sip_expenses(request: Request):
    """Find investments with autoCreateExpense=True but no linked expense, and create missing expenses."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["autoCreateExpense"] = True

    investments = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    repaired = []

    for inv in investments:
        linked_id = inv.get("linkedExpenseId")
        # Check if linked expense actually exists
        if linked_id:
            existing_exp = await db.expenses.find_one({"id": linked_id}, {"_id": 0})
            if existing_exp:
                continue  # Already has a valid linked expense

        freq = inv.get("investmentFrequency")
        sip_amt = inv.get("sipAmount")
        if not freq or not sip_amt:
            continue

        expense_name = f"SIP - {inv['name']}"
        expense_dict = {
            'expenseName': expense_name, 'expenseType': 'Fixed', 'category': 'Investments',
            'expectedAmount': sip_amt, 'frequency': freq,
            'linkedAccountId': inv.get('linkedAccountId'),
            'linkedInvestmentId': inv['id'],
            'selectedDay': inv.get('sipSelectedDay'),
            'selectedDate': inv.get('sipSelectedDate'),
            'isPaid': False, 'userId': user.get('user_id')
        }
        expense_obj = Expense(**expense_dict)
        expense_doc = expense_obj.model_dump()
        expense_doc['createdAt'] = expense_doc['createdAt'].isoformat()
        await db.expenses.insert_one(expense_doc)

        await db.investments.update_one(
            {"id": inv['id']},
            {"$set": {"linkedExpenseId": expense_obj.id}}
        )
        repaired.append({"investment": inv['name'], "expenseId": expense_obj.id})

    return {"repaired": len(repaired), "details": repaired}


@router.post("/trigger-sip-update")
async def trigger_sip_update(request: Request):
    """Manually trigger SIP investment value updates for the current user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")

    sip_investments = await db.investments.find({
        "userId": user_id,
        "sipAmount": {"$exists": True, "$ne": None, "$gt": 0},
        "investmentFrequency": {"$exists": True, "$ne": None}
    }, {"_id": 0}).to_list(1000)

    updated = []
    for inv in sip_investments:
        sip_amount = inv.get("sipAmount", 0)
        frequency = inv.get("investmentFrequency", "")
        selected_date = inv.get("sipSelectedDate")
        selected_day = inv.get("sipSelectedDay")
        selected_month = inv.get("sipSelectedMonth")
        last_update = inv.get("lastSipUpdateDate")

        if last_update == today_str:
            continue

        is_due = False
        if frequency == "Daily":
            is_due = True
        elif frequency == "Weekly":
            if selected_day:
                day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                is_due = day_names[today.weekday()] == selected_day
        elif frequency == "Monthly":
            if selected_date:
                try:
                    target_day = int(selected_date) if "-" not in selected_date else datetime.strptime(selected_date, "%Y-%m-%d").day
                    is_due = target_day == today.day
                except (ValueError, TypeError):
                    pass
        elif frequency == "Quarterly":
            if selected_date:
                try:
                    target_day = int(selected_date) if "-" not in selected_date else datetime.strptime(selected_date, "%Y-%m-%d").day
                    start_date_str = inv.get("startDate", "")
                    if start_date_str:
                        start = datetime.strptime(start_date_str, "%Y-%m-%d")
                        months_diff = (today.year - start.year) * 12 + (today.month - start.month)
                        is_due = (months_diff % 3 == 0) and (target_day == today.day)
                except (ValueError, TypeError):
                    pass
        elif frequency == "Half-Yearly":
            if selected_date:
                try:
                    target_day = int(selected_date) if "-" not in selected_date else datetime.strptime(selected_date, "%Y-%m-%d").day
                    start_date_str = inv.get("startDate", "")
                    if start_date_str:
                        start = datetime.strptime(start_date_str, "%Y-%m-%d")
                        months_diff = (today.year - start.year) * 12 + (today.month - start.month)
                        is_due = (months_diff % 6 == 0) and (target_day == today.day)
                except (ValueError, TypeError):
                    pass
        elif frequency == "Yearly":
            if selected_month:
                months = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]
                try:
                    target_month_idx = months.index(selected_month) + 1
                    target_day = 1
                    if selected_date:
                        target_day = int(selected_date) if "-" not in selected_date else datetime.strptime(selected_date, "%Y-%m-%d").day
                    is_due = (today.month == target_month_idx) and (today.day == target_day)
                except (ValueError, IndexError):
                    pass

        current_value = inv.get("currentValue", 0)
        principal = inv.get("principal", 0)

        updated.append({
            "name": inv.get("name"),
            "frequency": frequency,
            "sipAmount": sip_amount,
            "isDueToday": is_due,
            "lastSipUpdateDate": last_update,
            "currentValue": current_value,
            "wouldUpdateTo": current_value + sip_amount if is_due else current_value
        })

        if is_due:
            new_current_value = current_value + sip_amount
            new_principal = principal + sip_amount
            await db.investments.update_one(
                {"id": inv["id"]},
                {"$set": {
                    "currentValue": new_current_value,
                    "principal": new_principal,
                    "lastSipUpdateDate": today_str
                }}
            )

    return {
        "date": today_str,
        "totalSipInvestments": len(sip_investments),
        "updatedToday": len([u for u in updated if u["isDueToday"]]),
        "details": updated
    }


@router.get("/{investment_id}", response_model=Investment)
async def get_investment(investment_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    investment = await db.investments.find_one(user_filter, {"_id": 0})
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    if isinstance(investment.get('createdAt'), str):
        investment['createdAt'] = datetime.fromisoformat(investment['createdAt'])
    return investment


@router.put("/{investment_id}", response_model=Investment)
async def update_investment(investment_id: str, input: InvestmentCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    existing = await db.investments.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    investment_dict = input.model_dump()
    investment_dict['id'] = investment_id
    investment_dict['userId'] = user.get('user_id')
    investment_dict['createdAt'] = existing['createdAt']
    await db.investments.replace_one({"id": investment_id}, investment_dict)
    investment_obj = Investment(**investment_dict)
    if isinstance(investment_obj.createdAt, str):
        investment_obj.createdAt = datetime.fromisoformat(investment_obj.createdAt)
    return investment_obj


@router.delete("/{investment_id}")
async def delete_investment(investment_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    existing = await db.investments.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.investments.delete_one({"id": investment_id})
    return {"message": "Investment deleted successfully", "id": investment_id}

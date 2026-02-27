"""Investment routes - Full CRUD with auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone

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

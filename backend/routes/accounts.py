"""Account routes - Full CRUD from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime

from database import db
from server_models import Account, AccountCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.post("", response_model=Account)
async def create_account(input: AccountCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    account_dict = input.model_dump()
    account_dict['userId'] = user.get('user_id')
    account_obj = Account(**account_dict)
    doc = account_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.accounts.insert_one(doc)
    return account_obj


@router.get("", response_model=List[Account])
async def get_accounts(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    accounts = await db.accounts.find(user_filter, {"_id": 0}).to_list(1000)
    for account in accounts:
        if isinstance(account.get('createdAt'), str):
            account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    return accounts


@router.get("/{account_id}", response_model=Account)
async def get_account(account_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    account = await db.accounts.find_one(user_filter, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if isinstance(account.get('createdAt'), str):
        account['createdAt'] = datetime.fromisoformat(account['createdAt'])
    return account


@router.put("/{account_id}", response_model=Account)
async def update_account(account_id: str, input: AccountCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    existing = await db.accounts.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    account_dict = input.model_dump()
    account_dict['id'] = account_id
    account_dict['userId'] = user.get('user_id')
    account_dict['createdAt'] = existing['createdAt']
    await db.accounts.replace_one({"id": account_id}, account_dict)
    account_obj = Account(**account_dict)
    if isinstance(account_obj.createdAt, str):
        account_obj.createdAt = datetime.fromisoformat(account_obj.createdAt)
    return account_obj


@router.delete("/{account_id}")
async def delete_account(account_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    existing = await db.accounts.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.accounts.delete_one({"id": account_id})
    return {"message": "Account deleted successfully", "id": account_id}



@router.get("/{account_id}/detail")
async def get_account_detail(account_id: str, request: Request):
    """Get comprehensive account detail with linked entities."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = account_id
    acct = await db.accounts.find_one(user_filter, {"_id": 0})
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")

    user_id = user.get("user_id")
    balance = acct.get("currentBalance", 0)
    opening = acct.get("openingBalance", 0)

    # Linked loans
    linked_loans = await db.loans.find(
        {"userId": user_id, "linkedAccountId": account_id}, {"_id": 0, "loanName": 1, "outstandingAmount": 1, "emiAmount": 1, "id": 1}
    ).to_list(50)

    # Linked investments
    linked_investments = await db.investments.find(
        {"userId": user_id, "linkedAccountId": account_id}, {"_id": 0, "name": 1, "currentValue": 1, "id": 1}
    ).to_list(50)

    # Linked expenses
    linked_expenses = await db.expenses.find(
        {"userId": user_id, "linkedAccountId": account_id}, {"_id": 0, "expenseName": 1, "expectedAmount": 1, "id": 1}
    ).to_list(50)

    # Linked income
    linked_income = await db.income_sources.find(
        {"userId": user_id, "linkedAccountId": account_id}, {"_id": 0, "name": 1, "expectedAmount": 1, "id": 1}
    ).to_list(50)

    total_inflow = sum(i.get("expectedAmount", 0) for i in linked_income)
    total_outflow = sum(e.get("expectedAmount", 0) for e in linked_expenses) + sum(l.get("emiAmount", 0) for l in linked_loans)
    net_monthly_flow = total_inflow - total_outflow

    return {
        **{k: v for k, v in acct.items() if k != "createdAt"},
        "createdAt": acct.get("createdAt") if isinstance(acct.get("createdAt"), str) else acct.get("createdAt", datetime.now()).isoformat() if acct.get("createdAt") else None,
        "metrics": {
            "balanceChange": round(balance - opening, 2),
            "balanceChangePct": round(((balance - opening) / opening * 100), 1) if opening > 0 else 0,
            "totalMonthlyInflow": total_inflow,
            "totalMonthlyOutflow": total_outflow,
            "netMonthlyFlow": round(net_monthly_flow, 2),
        },
        "linkedLoans": linked_loans,
        "linkedInvestments": linked_investments,
        "linkedExpenses": linked_expenses,
        "linkedIncome": linked_income,
    }

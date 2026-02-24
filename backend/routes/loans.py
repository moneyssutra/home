"""Loan routes - Full CRUD with auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from server_models import Loan, LoanCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post("", response_model=Loan)
async def create_loan(input: LoanCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    loan_dict = input.model_dump()
    loan_dict['userId'] = user.get('user_id')
    loan_obj = Loan(**loan_dict)
    doc = loan_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.loans.insert_one(doc)

    if loan_obj.autoCreateExpense:
        existing_expense = await db.expenses.find_one({"linkedLoanId": loan_obj.id}, {"_id": 0})
        if not existing_expense:
            freq_map = {"Monthly": "Monthly", "Quarterly": "Quarterly", "Half-Yearly": "Half-Yearly"}
            expense_freq = freq_map.get(loan_obj.emiFrequency, "Monthly")
            start_date = datetime.fromisoformat(loan_obj.startDate) if loan_obj.startDate else datetime.now(timezone.utc)
            selected_date = str(start_date.day)
            expense_data = {
                "id": str(uuid.uuid4()), "userId": user.get('user_id'),
                "expenseName": f"{loan_obj.loanName} EMI", "expenseType": "Fixed",
                "category": "EMI", "expectedAmount": loan_obj.emiAmount,
                "frequency": expense_freq, "linkedAccountId": loan_obj.linkedAccountId,
                "linkedLoanId": loan_obj.id, "linkedInsuranceId": None,
                "selectedDay": None, "selectedDate": selected_date,
                "selectedQuarter": None, "selectedHalf": None, "selectedMonth": None,
                "oneTimeDate": None, "isPaid": False, "lastPaidDate": None,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(expense_data)
    return loan_obj


@router.get("", response_model=List[Loan])
async def get_loans(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    loans = await db.loans.find(user_filter, {"_id": 0}).to_list(1000)
    for loan in loans:
        if isinstance(loan.get('createdAt'), str):
            loan['createdAt'] = datetime.fromisoformat(loan['createdAt'])
    return loans


@router.get("/{loan_id}", response_model=Loan)
async def get_loan(loan_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    loan = await db.loans.find_one(user_filter, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if isinstance(loan.get('createdAt'), str):
        loan['createdAt'] = datetime.fromisoformat(loan['createdAt'])
    return loan


@router.put("/{loan_id}", response_model=Loan)
async def update_loan(loan_id: str, input: LoanCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    existing = await db.loans.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan_dict = input.model_dump()
    loan_dict['id'] = loan_id
    loan_dict['userId'] = user.get('user_id')
    loan_dict['createdAt'] = existing['createdAt']
    await db.loans.replace_one({"id": loan_id}, loan_dict)
    loan_obj = Loan(**loan_dict)
    if isinstance(loan_obj.createdAt, str):
        loan_obj.createdAt = datetime.fromisoformat(loan_obj.createdAt)
    return loan_obj


@router.delete("/{loan_id}")
async def delete_loan(loan_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    existing = await db.loans.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.loans.delete_one({"id": loan_id})
    return {"message": "Loan deleted successfully", "id": loan_id}


@router.get("/{loan_id}/linked-assets")
async def get_loan_linked_assets(loan_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["linkedLoanId"] = loan_id
    linked_assets = await db.assets.find(user_filter, {"_id": 0}).to_list(1000)
    result = []
    for asset in linked_assets:
        if isinstance(asset.get('createdAt'), str):
            asset['createdAt'] = datetime.fromisoformat(asset['createdAt'])
        result.append({
            "id": asset.get('id'), "assetName": asset.get('assetName'),
            "assetType": asset.get('assetType'), "currentValue": asset.get('currentValue', 0),
            "purchaseValue": asset.get('purchaseValue'), "location": asset.get('location')
        })
    return result

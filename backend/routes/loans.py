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


@router.post("/trigger-emi-update")
async def trigger_emi_update(request: Request):
    """Manually trigger EMI processing for the current user's loans."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")

    loans = await db.loans.find({
        "userId": user_id,
        "emiAmount": {"$exists": True, "$gt": 0},
        "outstandingAmount": {"$gt": 0}
    }, {"_id": 0}).to_list(1000)

    results = []
    for loan in loans:
        emi_amount = loan.get("emiAmount", 0)
        interest_rate = loan.get("interestRate", 0)
        outstanding = loan.get("outstandingAmount", 0)
        frequency = loan.get("emiFrequency", "Monthly")
        start_date_str = loan.get("startDate", "")
        last_update = loan.get("lastEmiUpdateDate")
        emi_selected_date = loan.get("emiSelectedDate")

        already_processed = last_update == today_str

        # Determine due date
        target_day = None
        if emi_selected_date:
            try:
                target_day = int(emi_selected_date)
            except (ValueError, TypeError):
                pass
        elif start_date_str:
            try:
                start = datetime.strptime(start_date_str, "%Y-%m-%d")
                target_day = start.day
            except (ValueError, TypeError):
                pass

        is_due = False
        if frequency == "Monthly":
            is_due = target_day == today.day if target_day else False
        elif frequency == "Quarterly" and target_day and start_date_str:
            try:
                start = datetime.strptime(start_date_str, "%Y-%m-%d")
                months_diff = (today.year - start.year) * 12 + (today.month - start.month)
                is_due = (months_diff % 3 == 0) and (target_day == today.day)
            except (ValueError, TypeError):
                pass
        elif frequency == "Half-Yearly" and target_day and start_date_str:
            try:
                start = datetime.strptime(start_date_str, "%Y-%m-%d")
                months_diff = (today.year - start.year) * 12 + (today.month - start.month)
                is_due = (months_diff % 6 == 0) and (target_day == today.day)
            except (ValueError, TypeError):
                pass

        # Calculate breakdown
        periods_per_year = {"Monthly": 12, "Quarterly": 4, "Half-Yearly": 2}.get(frequency, 12)
        interest_portion = round((interest_rate / periods_per_year / 100) * outstanding, 2)
        principal_portion = round(max(0, emi_amount - interest_portion), 2)

        detail = {
            "loanName": loan.get("loanName"),
            "emiAmount": emi_amount,
            "frequency": frequency,
            "emiDueDay": target_day,
            "isDueToday": is_due,
            "alreadyProcessed": already_processed,
            "outstandingAmount": outstanding,
            "principalPortion": principal_portion,
            "interestPortion": interest_portion,
            "wouldReduceTo": round(max(0, outstanding - principal_portion), 2) if is_due and not already_processed else outstanding,
        }
        results.append(detail)

        # Execute the update if due and not already done
        if is_due and not already_processed:
            new_outstanding = max(0, outstanding - principal_portion)
            await db.loans.update_one(
                {"id": loan["id"]},
                {"$set": {
                    "outstandingAmount": round(new_outstanding, 2),
                    "lastEmiUpdateDate": today_str
                }}
            )
            emi_transaction = {
                "id": str(uuid.uuid4()),
                "userId": user_id,
                "loanId": loan["id"],
                "loanName": loan.get("loanName", ""),
                "emiAmount": emi_amount,
                "principalPortion": principal_portion,
                "interestPortion": interest_portion,
                "outstandingBefore": outstanding,
                "outstandingAfter": round(new_outstanding, 2),
                "transactionDate": today_str,
                "frequency": frequency,
                "source": "manual_trigger",
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.emi_transactions.insert_one(emi_transaction)

    return {
        "date": today_str,
        "totalLoans": len(loans),
        "processedToday": len([r for r in results if r["isDueToday"] and not r["alreadyProcessed"]]),
        "details": results
    }


@router.get("/emi-ledger/{loan_id}")
async def get_emi_ledger(loan_id: str, request: Request):
    """Get EMI transaction ledger for a specific loan."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    transactions = await db.emi_transactions.find(
        {"userId": user_id, "loanId": loan_id},
        {"_id": 0}
    ).sort("transactionDate", -1).to_list(500)

    return {"loanId": loan_id, "totalTransactions": len(transactions), "transactions": transactions}


@router.get("/emi-ledger-all")
async def get_all_emi_ledger(request: Request):
    """Get all EMI transactions for the current user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get('user_id')
    transactions = await db.emi_transactions.find(
        {"userId": user_id},
        {"_id": 0}
    ).sort("transactionDate", -1).to_list(1000)

    return {"totalTransactions": len(transactions), "transactions": transactions}


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

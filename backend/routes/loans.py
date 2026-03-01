"""Loan routes - Full CRUD with auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
import uuid
import math

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


# ============ LOAN DETAIL & AMORTIZATION ============

def _calculate_emi(principal, annual_rate, tenure_months):
    """Calculate EMI using standard formula."""
    if principal <= 0 or tenure_months <= 0:
        return 0
    if annual_rate <= 0:
        return round(principal / tenure_months, 2)
    r = annual_rate / 12 / 100
    emi = principal * r * math.pow(1 + r, tenure_months) / (math.pow(1 + r, tenure_months) - 1)
    return round(emi, 2)


def _generate_amortization_schedule(principal, annual_rate, tenure_months, emi_amount, start_date_str, frequency="Monthly"):
    """Generate full amortization schedule."""
    schedule = []
    if principal <= 0 or tenure_months <= 0:
        return schedule

    r = annual_rate / 12 / 100 if annual_rate > 0 else 0
    period_months = {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6}.get(frequency, 1)
    period_rate = annual_rate / (12 / period_months) / 100 if annual_rate > 0 else 0
    total_periods = math.ceil(tenure_months / period_months)

    try:
        start = datetime.strptime(start_date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        start = datetime.now()

    balance = principal
    for i in range(1, total_periods + 1):
        if balance <= 0:
            break
        interest = round(balance * period_rate, 2)
        principal_component = round(min(emi_amount - interest, balance), 2)
        if principal_component < 0:
            principal_component = 0
        balance = round(max(0, balance - principal_component), 2)
        due_date = start + relativedelta(months=period_months * i)

        schedule.append({
            "emiNo": i,
            "dueDate": due_date.strftime("%Y-%m-%d"),
            "emiAmount": emi_amount,
            "principalComponent": principal_component,
            "interestComponent": interest,
            "outstandingAfter": balance,
            "status": "pending",
            "paidDate": None,
            "paidAmount": None,
        })

    return schedule


@router.get("/{loan_id}/amortization")
async def get_loan_amortization(loan_id: str, request: Request):
    """Get full amortization schedule with paid/pending/missed status."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    loan = await db.loans.find_one(user_filter, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    principal = loan.get("principalAmount", 0)
    rate = loan.get("interestRate", 0)
    tenure = loan.get("tenureMonths", 0)
    emi = loan.get("emiAmount", 0)
    start_date = loan.get("startDate", "")
    frequency = loan.get("emiFrequency", "Monthly")

    # If tenure not set, estimate from loan data
    if not tenure and emi > 0 and principal > 0 and rate > 0:
        r = rate / 12 / 100
        tenure = math.ceil(-math.log(1 - (principal * r / emi)) / math.log(1 + r))

    schedule = _generate_amortization_schedule(principal, rate, tenure, emi, start_date, frequency)

    # Fetch EMI ledger entries
    ledger = await db.emi_transactions.find(
        {"loanId": loan_id}, {"_id": 0}
    ).sort("transactionDate", 1).to_list(1000)

    # Fetch extra payments
    extra_payments = await db.loan_extra_payments.find(
        {"loanId": loan_id}, {"_id": 0}
    ).sort("paymentDate", 1).to_list(500)

    today = datetime.now().strftime("%Y-%m-%d")

    # Match ledger entries to schedule
    ledger_by_date = {}
    for entry in ledger:
        ledger_by_date[entry["transactionDate"]] = entry

    # Mark statuses
    for item in schedule:
        due = item["dueDate"]
        # Check if there's a ledger entry for this period
        matched = ledger_by_date.get(due)
        if matched:
            item["status"] = "paid"
            item["paidDate"] = matched.get("transactionDate")
            item["paidAmount"] = matched.get("emiAmount")
            item["principalComponent"] = matched.get("principalPortion", item["principalComponent"])
            item["interestComponent"] = matched.get("interestPortion", item["interestComponent"])
            item["outstandingAfter"] = matched.get("outstandingAfter", item["outstandingAfter"])
        elif due < today:
            item["status"] = "missed"
        else:
            item["status"] = "pending"

    # Calculate summary
    total_interest = sum(s["interestComponent"] for s in schedule)
    total_paid_interest = sum(s["interestComponent"] for s in schedule if s["status"] == "paid")
    paid_count = sum(1 for s in schedule if s["status"] == "paid")
    missed_count = sum(1 for s in schedule if s["status"] == "missed")
    pending_count = sum(1 for s in schedule if s["status"] == "pending")
    total_extra = sum(ep.get("amount", 0) for ep in extra_payments)

    return {
        "loanId": loan_id,
        "loanName": loan.get("loanName"),
        "loanType": loan.get("loanType"),
        "principalAmount": principal,
        "interestRate": rate,
        "tenureMonths": tenure,
        "emiAmount": emi,
        "frequency": frequency,
        "startDate": start_date,
        "outstandingAmount": loan.get("outstandingAmount", 0),
        "schedule": schedule,
        "summary": {
            "totalEMIs": len(schedule),
            "paidEMIs": paid_count,
            "missedEMIs": missed_count,
            "pendingEMIs": pending_count,
            "remainingEMIs": missed_count + pending_count,
            "totalInterestPayable": round(total_interest, 2),
            "totalInterestPaid": round(total_paid_interest, 2),
            "totalExtraPayments": round(total_extra, 2),
            "interestSaved": round(total_extra * (rate / 100), 2) if total_extra > 0 else 0,
        },
        "extraPayments": extra_payments,
    }


@router.post("/{loan_id}/extra-payment")
async def add_extra_payment(loan_id: str, request: Request):
    """Add an extra principal payment to a loan."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    amount = body.get("amount", 0)
    mode = body.get("mode", "reduce_tenure")  # "reduce_tenure" or "reduce_emi"
    payment_date = body.get("paymentDate", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    loan = await db.loans.find_one(user_filter, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    outstanding = loan.get("outstandingAmount", 0)
    if amount > outstanding:
        amount = outstanding

    new_outstanding = round(outstanding - amount, 2)
    rate = loan.get("interestRate", 0)
    emi = loan.get("emiAmount", 0)
    tenure = loan.get("tenureMonths", 0)

    update_fields = {"outstandingAmount": new_outstanding}

    if mode == "reduce_emi" and new_outstanding > 0 and tenure > 0:
        # Recalculate remaining tenure based on paid EMIs
        paid_emis = await db.emi_transactions.count_documents({"loanId": loan_id})
        remaining_months = max(1, tenure - paid_emis)
        new_emi = _calculate_emi(new_outstanding, rate, remaining_months)
        update_fields["emiAmount"] = new_emi
    elif mode == "reduce_tenure" and new_outstanding > 0 and emi > 0 and rate > 0:
        r = rate / 12 / 100
        if emi > new_outstanding * r:
            new_tenure = math.ceil(-math.log(1 - (new_outstanding * r / emi)) / math.log(1 + r))
            update_fields["tenureMonths"] = new_tenure

    await db.loans.update_one({"id": loan_id}, {"$set": update_fields})

    # Record extra payment
    payment = {
        "id": str(uuid.uuid4()),
        "userId": user.get("user_id"),
        "loanId": loan_id,
        "loanName": loan.get("loanName", ""),
        "amount": amount,
        "paymentDate": payment_date,
        "mode": mode,
        "outstandingBefore": outstanding,
        "outstandingAfter": new_outstanding,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.loan_extra_payments.insert_one(payment)

    return {
        "success": True,
        "payment": {k: v for k, v in payment.items() if k != "_id"},
        "updatedLoan": {
            "outstandingAmount": new_outstanding,
            "emiAmount": update_fields.get("emiAmount", emi),
            "tenureMonths": update_fields.get("tenureMonths", tenure),
        }
    }


@router.post("/{loan_id}/mark-emi")
async def mark_emi_paid(loan_id: str, request: Request):
    """Mark a specific EMI as paid and update outstanding."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    emi_no = body.get("emiNo")
    paid_date = body.get("paidDate", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    loan = await db.loans.find_one(user_filter, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    outstanding = loan.get("outstandingAmount", 0)
    rate = loan.get("interestRate", 0)
    emi_amount = loan.get("emiAmount", 0)
    frequency = loan.get("emiFrequency", "Monthly")

    period_rate = rate / (12 / {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6}.get(frequency, 1)) / 100 if rate > 0 else 0
    interest_portion = round(outstanding * period_rate, 2)
    principal_portion = round(max(0, emi_amount - interest_portion), 2)
    if principal_portion > outstanding:
        principal_portion = outstanding
    new_outstanding = round(max(0, outstanding - principal_portion), 2)

    # Record in ledger
    txn = {
        "id": str(uuid.uuid4()),
        "userId": user.get("user_id"),
        "loanId": loan_id,
        "loanName": loan.get("loanName", ""),
        "emiNo": emi_no,
        "emiAmount": emi_amount,
        "principalPortion": principal_portion,
        "interestPortion": interest_portion,
        "outstandingBefore": outstanding,
        "outstandingAfter": new_outstanding,
        "transactionDate": paid_date,
        "frequency": frequency,
        "source": "manual_mark",
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.emi_transactions.insert_one(txn)

    await db.loans.update_one(
        {"id": loan_id},
        {"$set": {"outstandingAmount": new_outstanding, "lastEmiUpdateDate": paid_date}}
    )

    return {
        "success": True,
        "transaction": {k: v for k, v in txn.items() if k != "_id"},
        "newOutstanding": new_outstanding,
    }


@router.get("/{loan_id}/insights")
async def get_loan_insights(loan_id: str, request: Request):
    """Get financial insights for a specific loan."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["id"] = loan_id
    loan = await db.loans.find_one(user_filter, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    user_id = user.get("user_id")
    emi = loan.get("emiAmount", 0)
    rate = loan.get("interestRate", 0)
    principal = loan.get("principalAmount", 0)
    outstanding = loan.get("outstandingAmount", 0)
    tenure = loan.get("tenureMonths", 0)

    # Monthly income
    incomes = await db.income_sources.find({"userId": user_id}, {"_id": 0, "expectedAmount": 1}).to_list(100)
    monthly_income = sum(i.get("expectedAmount", 0) for i in incomes)

    # Monthly mandatory expenses
    expenses = await db.expenses.find({"userId": user_id, "expenseType": "Fixed"}, {"_id": 0, "expectedAmount": 1}).to_list(500)
    monthly_expense = sum(e.get("expectedAmount", 0) for e in expenses)
    daily_essential = monthly_expense / 30 if monthly_expense > 0 else 0

    # Total interest payable
    total_payable = emi * tenure if tenure > 0 else 0
    total_interest = max(0, total_payable - principal)

    # Interest already paid
    ledger = await db.emi_transactions.find({"loanId": loan_id}, {"_id": 0}).to_list(1000)
    interest_paid = sum(e.get("interestPortion", 0) for e in ledger)
    principal_paid = sum(e.get("principalPortion", 0) for e in ledger)
    emis_paid = len(ledger)

    # Extra payments
    extra_payments = await db.loan_extra_payments.find({"loanId": loan_id}, {"_id": 0}).to_list(500)
    total_extra = sum(ep.get("amount", 0) for ep in extra_payments)
    interest_saved = round(total_extra * (rate / 100), 2)

    # Remaining
    remaining_emis = max(0, tenure - emis_paid) if tenure > 0 else 0
    remaining_interest = max(0, total_interest - interest_paid)

    # EMI to income ratio
    emi_to_income = round((emi / monthly_income * 100), 1) if monthly_income > 0 else 0

    # Safety impact
    safety_impact_days = round(emi / daily_essential, 1) if daily_essential > 0 else 0

    return {
        "loanId": loan_id,
        "loanName": loan.get("loanName"),
        "totalInterestPayable": round(total_interest, 2),
        "interestPaid": round(interest_paid, 2),
        "remainingInterest": round(remaining_interest, 2),
        "principalPaid": round(principal_paid, 2),
        "emisPaid": emis_paid,
        "remainingEMIs": remaining_emis,
        "totalExtraPayments": round(total_extra, 2),
        "interestSaved": interest_saved,
        "emiToIncomePercent": emi_to_income,
        "safetyImpactDays": safety_impact_days,
        "monthlyIncome": monthly_income,
        "dailyEssentialExpense": round(daily_essential, 2),
    }

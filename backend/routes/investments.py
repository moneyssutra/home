"""Investment routes - Full CRUD with auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
import uuid
import math
import logging

logger = logging.getLogger(__name__)

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

    # Loan Given: auto-set computed fields on creation
    if input.investmentCategory == "Loan Given":
        investment_dict['amountReceived'] = 0
        investment_dict['outstandingAmount'] = input.principal
        investment_dict['loanStatus'] = "active"
        investment_dict['currentValue'] = input.principal  # outstanding = principal initially

        # Auto-create linked income source for repayment tracking
        # ALL loan given repayments are cash inflow that should be tracked as income
        expected_per_period = 0
        agreed_return = input.agreedReturnAmount or 0
        total_interest = max(agreed_return - input.principal, 0) if agreed_return > 0 else 0

        if input.repaymentType == "fixed" and input.installmentAmount:
            expected_per_period = input.installmentAmount
        elif input.repaymentType == "lump_sum":
            expected_per_period = agreed_return if agreed_return > 0 else input.principal
        elif input.repaymentType == "flexible":
            # Estimate: divide total by 12 months
            total_return = agreed_return if agreed_return > 0 else input.principal
            expected_per_period = round(total_return / 12, 2)

        # Determine frequency for income source
        freq = "Monthly"
        if input.repaymentType == "fixed" and input.repaymentFrequency:
            freq = input.repaymentFrequency
        elif input.repaymentType == "lump_sum":
            freq = "One-time"

        # Map payment day to income source schedule fields
        income_schedule = {}
        payment_day = input.paymentDay or ""
        if freq == "Weekly" and payment_day:
            income_schedule["selectedDay"] = payment_day
        elif freq in ("Monthly", "Quarterly", "Half-Yearly", "Yearly") and payment_day:
            income_schedule["selectedDate"] = payment_day
        elif freq == "Daily":
            income_schedule["selectedDay"] = "Monday"

        income_label = f"Loan Repayment - {input.name}"
        if total_interest > 0:
            income_label = f"Loan Repayment (incl. interest) - {input.name}"

        income_source = {
            "id": str(uuid.uuid4()),
            "userId": user.get('user_id'),
            "type": "Interest",
            "name": income_label,
            "expectedAmount": expected_per_period,
            "frequency": freq,
            "incomeType": "variable" if input.repaymentType == "flexible" else "fixed",
            "sourceCategory": "loan_repayment",
            "isVariable": input.repaymentType == "flexible",
            "startDate": input.startDate,
            "notes": f"Auto-tracked from Loan Given: {input.name}." + (f" Total interest: ₹{total_interest:,.0f}" if total_interest > 0 else " No interest."),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            **income_schedule,
        }
        await db.income_sources.insert_one(income_source)
        investment_dict['linkedIncomeSourceId'] = income_source['id']

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

    # For backdated Loan Given with fixed repayment: auto-process past installments
    if input.investmentCategory == "Loan Given" and input.repaymentType == "fixed" and input.startDate and input.installmentAmount:
        try:
            start = datetime.fromisoformat(input.startDate).date() if isinstance(input.startDate, str) else input.startDate
            today = datetime.now(timezone.utc).date()
            if start < today:
                from dateutil.relativedelta import relativedelta
                installment_amt = input.installmentAmount
                freq = input.repaymentFrequency or "Monthly"
                payment_day = input.paymentDay or ""

                # Calculate all past payment dates (first payment = one period after start)
                past_payments = []
                if freq == "Monthly" and payment_day:
                    try:
                        pd = int(payment_day)
                    except (ValueError, TypeError):
                        pd = 1
                    # First payment month: next month after start
                    first_payment = (start + relativedelta(months=1)).replace(day=min(pd, 28))
                    current = first_payment
                    while current <= today:
                        past_payments.append(current)
                        current = current + relativedelta(months=1)
                elif freq == "Weekly" and payment_day:
                    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
                    target_idx = day_names.index(payment_day) if payment_day in day_names else -1
                    if target_idx >= 0:
                        # First payment: next occurrence of payment_day after start
                        current = start + timedelta(days=1)
                        while current.weekday() != target_idx:
                            current += timedelta(days=1)
                        while current <= today:
                            past_payments.append(current)
                            current += timedelta(days=7)

                if past_payments:
                    total_past = min(len(past_payments) * installment_amt, input.principal)
                    outstanding = input.principal - total_past
                    status = "completed" if outstanding <= 0 else ("partial" if total_past > 0 else "active")
                    await db.investments.update_one(
                        {"id": investment_obj.id},
                        {"$set": {
                            "amountReceived": total_past,
                            "outstandingAmount": max(outstanding, 0),
                            "currentValue": max(outstanding, 0),
                            "loanStatus": status,
                        }}
                    )
                    investment_obj.amountReceived = total_past
                    investment_obj.outstandingAmount = max(outstanding, 0)
                    investment_obj.currentValue = max(outstanding, 0)
                    investment_obj.loanStatus = status
        except Exception as e:
            logger.error(f"Error processing backdated loan installments: {str(e)}")

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

    # Cascade-delete linked income source and transactions for Loan Given
    if existing.get("investmentCategory") == "Loan Given":
        linked_income_id = existing.get("linkedIncomeSourceId")
        if linked_income_id:
            await db.income_sources.delete_one({"id": linked_income_id})
            await db.income_received.delete_many({"entityId": linked_income_id})
        await db.investment_transactions.delete_many({"investmentId": investment_id})

    await db.investments.delete_one({"id": investment_id})
    return {"message": "Investment deleted successfully", "id": investment_id}


# ============ INVESTMENT DETAIL & LEDGER ============

def _calculate_cagr(invested, current, years):
    """CAGR = (Current / Invested)^(1/Years) - 1"""
    if invested <= 0 or years <= 0 or current <= 0:
        return 0
    return round((math.pow(current / invested, 1 / years) - 1) * 100, 2)


def _calculate_future_value_sip(sip, monthly_rate, months):
    """FV = SIP * ((1+r)^n - 1)/r * (1+r)"""
    if sip <= 0 or months <= 0:
        return 0
    if monthly_rate <= 0:
        return sip * months
    r = monthly_rate
    return round(sip * ((math.pow(1 + r, months) - 1) / r) * (1 + r), 2)


def _calculate_future_value_lumpsum(pv, annual_rate, years):
    """FV = PV * (1 + r)^n"""
    if pv <= 0 or years <= 0:
        return pv
    return round(pv * math.pow(1 + annual_rate / 100, years), 2)


def _get_performance_tag(expected_return, actual_return):
    if actual_return is None or expected_return is None:
        return "N/A"
    diff = actual_return - expected_return
    if diff >= 2:
        return "Outperforming"
    elif diff >= -2:
        return "On Track"
    else:
        return "Underperforming"


@router.get("/{investment_id}/detail")
async def get_investment_detail(investment_id: str, request: Request):
    """Get comprehensive investment detail with ledger, growth, and projections."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    inv = await db.investments.find_one(user_filter, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    # Redirect Loan Given to specialized endpoint
    if inv.get("investmentCategory") == "Loan Given":
        return await get_loan_given_detail(investment_id, request)

    principal = inv.get("principal", 0)
    current_value = inv.get("currentValue", 0)
    start_date_str = inv.get("startDate", "")
    sip_amount = inv.get("sipAmount", 0)
    frequency = inv.get("investmentFrequency")
    expected_return = inv.get("returnRate") or 10  # Default 10% if not set
    category = inv.get("investmentCategory", "")

    # Calculate time elapsed
    try:
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        start_date = datetime.now()

    now = datetime.now()
    days_held = (now - start_date).days
    years_held = max(days_held / 365.25, 0.01)
    months_held = max(1, int(days_held / 30.44))

    # Calculate returns
    total_invested = principal
    gain_loss = current_value - total_invested
    gain_loss_pct = round((gain_loss / total_invested * 100), 2) if total_invested > 0 else 0

    # CAGR
    cagr = _calculate_cagr(total_invested, current_value, years_held) if total_invested > 0 else 0

    # Performance tag
    perf_tag = _get_performance_tag(expected_return, cagr)

    # Generate investment ledger (transaction history)
    ledger = []

    # Fetch SIP transaction records
    sip_records = await db.investment_transactions.find(
        {"investmentId": investment_id}, {"_id": 0}
    ).sort("transactionDate", -1).to_list(1000)

    if sip_records:
        ledger = sip_records
    else:
        # Auto-generate ledger entries from SIP schedule
        if sip_amount and frequency:
            period_months = {"Daily": 0, "Weekly": 0, "Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Yearly": 12}.get(frequency, 1)
            if period_months > 0:
                running_invested = 0
                for i in range(1, months_held // period_months + 1):
                    entry_date = start_date + relativedelta(months=period_months * i)
                    if entry_date > now:
                        break
                    running_invested += sip_amount
                    # Estimate value with simple growth
                    remaining_months = max(0, (now - entry_date).days / 30.44)
                    monthly_return = expected_return / 12 / 100
                    entry_value = sip_amount * math.pow(1 + monthly_return, remaining_months) if monthly_return > 0 else sip_amount
                    estimated_gain = round(entry_value - sip_amount, 2)
                    ledger.append({
                        "date": entry_date.strftime("%Y-%m-%d"),
                        "contribution": sip_amount,
                        "totalInvested": round(running_invested, 2),
                        "estimatedValue": round(entry_value, 2),
                        "gainLoss": estimated_gain,
                        "type": "sip"
                    })
                ledger.reverse()
        else:
            # Lump sum - single entry
            ledger.append({
                "date": start_date_str,
                "contribution": principal,
                "totalInvested": principal,
                "estimatedValue": current_value,
                "gainLoss": round(gain_loss, 2),
                "type": "lumpsum"
            })

    # Projected growth
    monthly_rate = expected_return / 12 / 100
    projections = {}
    for years in [1, 3, 5, 10, 15, 20]:
        if sip_amount and frequency == "Monthly":
            fv_sip = _calculate_future_value_sip(sip_amount, monthly_rate, years * 12)
            fv_existing = _calculate_future_value_lumpsum(current_value, expected_return, years)
            projections[f"{years}yr"] = round(fv_sip + fv_existing, 2)
        else:
            projections[f"{years}yr"] = _calculate_future_value_lumpsum(current_value, expected_return, years)

    return {
        "id": investment_id,
        "name": inv.get("name"),
        "category": category,
        "mode": inv.get("investmentMode"),
        "principal": principal,
        "currentValue": current_value,
        "sipAmount": sip_amount,
        "frequency": frequency,
        "startDate": start_date_str,
        "maturityDate": inv.get("maturityDate"),
        "expectedReturn": expected_return,
        "linkedAccountId": inv.get("linkedAccountId"),
        "notes": inv.get("notes"),
        "returnRate": inv.get("returnRate"),
        "compoundingType": inv.get("compoundingType"),
        "metrics": {
            "totalInvested": total_invested,
            "gainLoss": round(gain_loss, 2),
            "gainLossPct": gain_loss_pct,
            "cagr": cagr,
            "daysHeld": days_held,
            "yearsHeld": round(years_held, 1),
            "monthsHeld": months_held,
            "performanceTag": perf_tag,
        },
        "projections": projections,
        "ledger": ledger[:50],
        "totalLedgerEntries": len(ledger),
    }


@router.post("/{investment_id}/add-contribution")
async def add_contribution(investment_id: str, request: Request):
    """Add a manual contribution to an investment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    amount = body.get("amount", 0)
    contribution_date = body.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    notes = body.get("notes", "")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    inv = await db.investments.find_one(user_filter, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    new_principal = inv.get("principal", 0) + amount
    new_current = inv.get("currentValue", 0) + amount

    await db.investments.update_one(
        {"id": investment_id},
        {"$set": {"principal": new_principal, "currentValue": new_current}}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "userId": user.get("user_id"),
        "investmentId": investment_id,
        "investmentName": inv.get("name", ""),
        "amount": amount,
        "type": "contribution",
        "transactionDate": contribution_date,
        "notes": notes,
        "principalBefore": inv.get("principal", 0),
        "principalAfter": new_principal,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.investment_transactions.insert_one(txn)

    return {
        "success": True,
        "transaction": {k: v for k, v in txn.items() if k != "_id"},
        "updatedInvestment": {
            "principal": new_principal,
            "currentValue": new_current,
        }
    }




# ============ LOAN GIVEN: REPAYMENT ============

@router.post("/{investment_id}/add-repayment")
async def add_repayment(investment_id: str, request: Request):
    """Add a repayment entry to a Loan Given investment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    amount = body.get("amount", 0)
    repayment_date = body.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    notes = body.get("notes", "")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Repayment amount must be positive")

    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    inv = await db.investments.find_one(user_filter, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    if inv.get("investmentCategory") != "Loan Given":
        raise HTTPException(status_code=400, detail="Repayments can only be added to Loan Given investments")

    outstanding = inv.get("outstandingAmount") or inv.get("principal", 0) or 0
    if outstanding > 0 and amount > outstanding:
        raise HTTPException(status_code=400, detail=f"Repayment amount (₹{amount}) exceeds outstanding (₹{outstanding})")

    new_amount_received = (inv.get("amountReceived", 0) or 0) + amount
    new_outstanding = inv.get("principal", 0) - new_amount_received

    # Status logic
    if new_outstanding <= 0:
        new_status = "closed"
        new_outstanding = 0
    elif new_amount_received > 0:
        new_status = "partial"
    else:
        new_status = "active"

    await db.investments.update_one(
        {"id": investment_id},
        {"$set": {
            "amountReceived": new_amount_received,
            "outstandingAmount": new_outstanding,
            "currentValue": new_outstanding,
            "loanStatus": new_status,
            "lastRepaymentDate": repayment_date,
        }}
    )

    txn = {
        "id": str(uuid.uuid4()),
        "userId": user.get("user_id"),
        "investmentId": investment_id,
        "investmentName": inv.get("name", ""),
        "amount": amount,
        "type": "repayment",
        "transactionDate": repayment_date,
        "notes": notes,
        "outstandingBefore": outstanding,
        "outstandingAfter": new_outstanding,
        "principalPortion": 0,
        "interestPortion": 0,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }

    # Smart interest/principal split for income tracking
    interest_type = inv.get("interestType", "none")
    principal_total = inv.get("principal", 0)
    agreed_return = inv.get("agreedReturnAmount")
    interest_portion = 0
    principal_portion = amount

    if interest_type != "none" and principal_total > 0:
        if agreed_return and agreed_return > principal_total:
            # Proportional split: each repayment splits proportionally
            total_interest = agreed_return - principal_total
            interest_fraction = total_interest / agreed_return
            interest_portion = round(amount * interest_fraction, 2)
            principal_portion = round(amount - interest_portion, 2)
        elif inv.get("returnRate", 0):
            # Simple interest split per repayment
            rate = inv.get("returnRate", 0)
            start_str = inv.get("startDate", "")
            try:
                start_dt = datetime.strptime(start_str, "%Y-%m-%d")
                repay_dt = datetime.strptime(repayment_date, "%Y-%m-%d")
                prev_repay = inv.get("lastRepaymentDate")
                if prev_repay:
                    from_dt = datetime.strptime(prev_repay, "%Y-%m-%d")
                else:
                    from_dt = start_dt
                days = max((repay_dt - from_dt).days, 0)
                # Interest accrued since last repayment on remaining outstanding
                interest_portion = round(outstanding * (rate / 100) * days / 365.25, 2)
                interest_portion = min(interest_portion, amount)  # cap at repayment amount
                principal_portion = round(amount - interest_portion, 2)
            except (ValueError, TypeError):
                interest_portion = 0
                principal_portion = amount

    txn["interestPortion"] = interest_portion
    txn["principalPortion"] = principal_portion

    await db.investment_transactions.insert_one(txn)

    # Auto-create income transaction for cash flow tracking
    linked_income_id = inv.get("linkedIncomeSourceId")
    if linked_income_id:
        income_txn = {
            "id": str(uuid.uuid4()),
            "userId": user.get("user_id"),
            "entityId": linked_income_id,
            "entityType": "income",
            "entityName": f"Loan Repayment - {inv.get('name', '')}",
            "amount": amount,
            "transactionDate": repayment_date,
            "notes": "Repayment received" + (f" (₹{principal_portion} principal, ₹{interest_portion} interest)" if interest_portion > 0 else ""),
            "source": "auto_loan_repayment",
            "isLocked": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.income_received.insert_one(income_txn)

    return {
        "success": True,
        "transaction": {k: v for k, v in txn.items() if k != "_id"},
        "updatedLoan": {
            "amountReceived": new_amount_received,
            "outstandingAmount": new_outstanding,
            "loanStatus": new_status,
            "interestPortion": interest_portion,
            "principalPortion": principal_portion,
        }
    }


@router.get("/{investment_id}/repayments")
async def get_repayments(investment_id: str, request: Request):
    """Get repayment history for a Loan Given investment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    inv = await db.investments.find_one(user_filter, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    repayments = await db.investment_transactions.find(
        {"investmentId": investment_id, "type": "repayment"},
        {"_id": 0}
    ).sort("transactionDate", -1).to_list(500)

    return {
        "repayments": repayments,
        "summary": {
            "principal": inv.get("principal", 0),
            "amountReceived": inv.get("amountReceived", 0),
            "outstandingAmount": inv.get("outstandingAmount", 0),
            "loanStatus": inv.get("loanStatus", "active"),
        }
    }


@router.post("/confirm-repayment/{notification_id}")
async def confirm_repayment(notification_id: str, request: Request):
    """Handle user confirmation/rejection of an auto-recorded loan repayment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    action = body.get("action", "confirm")  # "confirm" or "reject"

    # Find the notification
    notification = await db.notifications.find_one(
        {"id": notification_id, "userId": user.get("user_id"), "type": "loan_repayment_due"},
        {"_id": 0}
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    investment_id = notification.get("relatedInvestmentId")
    txn_id = notification.get("relatedTransactionId")

    if action == "confirm":
        # Mark the auto-recorded transaction as confirmed
        if txn_id:
            await db.investment_transactions.update_one(
                {"id": txn_id},
                {"$set": {"confirmed": True}}
            )
            # Also confirm the income_received entry
            await db.income_received.update_many(
                {"source": "auto_loan_repayment", "investmentId": investment_id, "confirmed": False},
                {"$set": {"confirmed": True}}
            )
        # Mark notification as read
        await db.notifications.update_one(
            {"id": notification_id},
            {"$set": {"isRead": True, "confirmedAction": "confirmed"}}
        )
        return {"success": True, "action": "confirmed", "message": "Repayment confirmed"}

    elif action == "reject":
        # Roll back the auto-recorded repayment
        txn = await db.investment_transactions.find_one({"id": txn_id}, {"_id": 0}) if txn_id else None

        if txn and investment_id:
            rollback_amount = txn.get("amount", 0)
            inv = await db.investments.find_one({"id": investment_id}, {"_id": 0})
            if inv:
                restored_received = max((inv.get("amountReceived", 0) or 0) - rollback_amount, 0)
                restored_outstanding = (inv.get("outstandingAmount", 0) or 0) + rollback_amount
                restored_status = "active" if restored_received == 0 else "partial"

                await db.investments.update_one(
                    {"id": investment_id},
                    {"$set": {
                        "amountReceived": restored_received,
                        "outstandingAmount": restored_outstanding,
                        "currentValue": restored_outstanding,
                        "loanStatus": restored_status,
                    }}
                )

            # Delete the auto-recorded transaction
            await db.investment_transactions.delete_one({"id": txn_id})

            # Delete associated income_received entry
            linked_income_id = inv.get("linkedIncomeSourceId") if inv else None
            if linked_income_id:
                await db.income_received.delete_one({
                    "entityId": linked_income_id,
                    "source": "auto_loan_repayment",
                    "autoRecorded": True,
                    "confirmed": False,
                })

        # Mark notification
        await db.notifications.update_one(
            {"id": notification_id},
            {"$set": {"isRead": True, "confirmedAction": "rejected"}}
        )
        return {"success": True, "action": "rejected", "message": "Repayment rolled back"}

    raise HTTPException(status_code=400, detail="Invalid action. Use 'confirm' or 'reject'.")



# ============ LOAN GIVEN: RISK DETECTION ============

@router.post("/check-loan-risks")
async def check_loan_risks(request: Request):
    """Check and update risk status for all Loan Given investments."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["investmentCategory"] = "Loan Given"
    user_filter["loanStatus"] = {"$nin": ["closed"]}

    loans = await db.investments.find(user_filter, {"_id": 0}).to_list(1000)
    today = datetime.now(timezone.utc)
    updated = []

    for loan in loans:
        last_repayment = loan.get("lastRepaymentDate")
        start_date = loan.get("startDate", "")
        reference_date_str = last_repayment or start_date

        if not reference_date_str:
            continue

        try:
            ref_date = datetime.strptime(reference_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue

        days_since = (today - ref_date).days
        current_status = loan.get("loanStatus", "active")
        risk_flag = None

        if days_since >= 90 and current_status != "default_risk":
            await db.investments.update_one(
                {"id": loan["id"]},
                {"$set": {"loanStatus": "default_risk"}}
            )
            updated.append({"id": loan["id"], "name": loan.get("name"), "newStatus": "default_risk", "daysSince": days_since})
        elif days_since >= 30 and current_status in ("active", "partial"):
            risk_flag = "medium_risk"
            updated.append({"id": loan["id"], "name": loan.get("name"), "riskFlag": risk_flag, "daysSince": days_since})

    return {"checked": len(loans), "updated": updated}


# ============ LOAN GIVEN: DETAIL OVERRIDE ============

@router.get("/{investment_id}/loan-detail")
async def get_loan_given_detail(investment_id: str, request: Request):
    """Get comprehensive detail for a Loan Given investment."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_filter = get_user_filter(user)
    user_filter["id"] = investment_id
    inv = await db.investments.find_one(user_filter, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")

    principal = inv.get("principal", 0) or 0
    amount_received = inv.get("amountReceived", 0) or 0
    outstanding = inv.get("outstandingAmount") or principal
    status = inv.get("loanStatus", "active") or "active"
    start_date_str = inv.get("startDate", "")
    due_date_str = inv.get("dueDate")
    interest_type = inv.get("interestType", "none")
    interest_rate = inv.get("returnRate", 0) or 0
    agreed_return = inv.get("agreedReturnAmount")

    # Risk detection
    today = datetime.now(timezone.utc)
    last_repayment = inv.get("lastRepaymentDate")
    ref_date_str = last_repayment or start_date_str
    days_since_activity = 0
    risk_level = None

    if ref_date_str:
        try:
            ref_date = datetime.strptime(ref_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            days_since_activity = (today - ref_date).days
            if days_since_activity >= 90:
                risk_level = "high"
                if status not in ("closed",):
                    status = "default_risk"
                    await db.investments.update_one({"id": investment_id}, {"$set": {"loanStatus": "default_risk"}})
            elif days_since_activity >= 30:
                risk_level = "medium"
        except (ValueError, TypeError):
            pass

    # Due date status
    due_status = None
    if due_date_str:
        try:
            due_date = datetime.strptime(due_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if today > due_date and status != "closed":
                due_status = "overdue"
            elif (due_date - today).days <= 7:
                due_status = "due_soon"
        except (ValueError, TypeError):
            pass

    # Interest calculation
    expected_interest = 0
    if interest_type == "simple" and interest_rate > 0:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            years = max((today - start_date.replace(tzinfo=timezone.utc)).days / 365.25, 0)
            expected_interest = round(principal * (interest_rate / 100) * years, 2)
        except (ValueError, TypeError):
            pass
    elif interest_type == "custom" and agreed_return:
        expected_interest = round(agreed_return - principal, 2)

    # Fetch repayment history
    repayments = await db.investment_transactions.find(
        {"investmentId": investment_id, "type": "repayment"},
        {"_id": 0}
    ).sort("transactionDate", -1).to_list(500)

    # Recovery percentage
    total_expected = agreed_return if agreed_return else principal
    recovery_pct = round((amount_received / total_expected * 100), 1) if total_expected > 0 else 0

    return {
        "id": investment_id,
        "name": inv.get("name"),
        "investmentCategory": "Loan Given",
        "borrowerName": inv.get("borrowerName"),
        "borrowerContact": inv.get("borrowerContact"),
        "principal": principal,
        "interestType": interest_type,
        "interestRate": interest_rate,
        "agreedReturnAmount": agreed_return,
        "repaymentType": inv.get("repaymentType", "flexible"),
        "repaymentFrequency": inv.get("repaymentFrequency"),
        "installmentAmount": inv.get("installmentAmount"),
        "numberOfInstallments": inv.get("numberOfInstallments"),
        "linkedIncomeSourceId": inv.get("linkedIncomeSourceId"),
        "startDate": start_date_str,
        "dueDate": due_date_str,
        "notes": inv.get("notes"),
        "amountReceived": amount_received,
        "outstandingAmount": outstanding,
        "loanStatus": status,
        "lastRepaymentDate": last_repayment,
        "expectedInterest": expected_interest,
        "totalExpected": total_expected,
        "recoveryPct": recovery_pct,
        "dueStatus": due_status,
        "riskLevel": risk_level,
        "daysSinceActivity": days_since_activity,
        "repayments": repayments,
        "repaymentCount": len(repayments),
    }



@router.post("/fix-loan-income-types")
async def fix_loan_income_types(request: Request):
    """Migration: update loan income sources to 'Interest' type, clean up orphans, and remove scheduler-generated fake income transactions."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get("user_id")

    # Fix type from Other to Interest
    type_result = await db.income_sources.update_many(
        {"userId": user_id, "sourceCategory": {"$in": ["loan_repayment", "loan_interest"]}},
        {"$set": {"type": "Interest"}}
    )

    # Clean up orphaned income sources (linked to deleted investments)
    loan_income_sources = await db.income_sources.find(
        {"userId": user_id, "sourceCategory": {"$in": ["loan_repayment", "loan_interest"]}},
        {"_id": 0, "id": 1}
    ).to_list(500)

    orphan_ids = []
    for src in loan_income_sources:
        linked_inv = await db.investments.find_one({"linkedIncomeSourceId": src["id"]}, {"_id": 0, "id": 1})
        if not linked_inv:
            orphan_ids.append(src["id"])

    orphan_count = 0
    for oid in orphan_ids:
        await db.income_sources.delete_one({"id": oid})
        await db.income_received.delete_many({"entityId": oid})
        orphan_count += 1

    # Remove fake auto-recorded income transactions created by the fixed-income scheduler
    # for loan repayment income sources (these should only come from actual repayments)
    loan_source_ids = [s["id"] for s in loan_income_sources if s["id"] not in orphan_ids]
    fake_txn_count = 0
    for sid in loan_source_ids:
        result = await db.income_transactions.delete_many({
            "entityId": sid, "source": "auto_fixed"
        })
        fake_txn_count += result.deleted_count

    return {
        "typeUpdated": type_result.modified_count,
        "orphansCleaned": orphan_count,
        "fakeTransactionsRemoved": fake_txn_count,
    }

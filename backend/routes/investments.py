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


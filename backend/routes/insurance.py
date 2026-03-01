"""Insurance routes - Full CRUD with auto-asset and auto-expense from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone
import uuid

from database import db
from server_models import Insurance, InsuranceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter

router = APIRouter(prefix="/insurances", tags=["Insurances"])


@router.post("", response_model=Insurance)
async def create_insurance(input: InsuranceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    insurance_dict = input.model_dump()
    insurance_dict['userId'] = user.get('user_id')
    insurance_obj = Insurance(**insurance_dict)
    doc = insurance_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.insurances.insert_one(doc)

    maturity_types_needing_asset = ["Market Linked", "Returns on Maturity"]
    if insurance_obj.maturityType in maturity_types_needing_asset:
        existing_asset = await db.assets.find_one({"linkedInsuranceId": insurance_obj.id}, {"_id": 0})
        if not existing_asset:
            current_value = insurance_obj.expectedMaturityAmount or insurance_obj.premiumAmount
            asset_data = {
                "id": str(uuid.uuid4()), "userId": user.get('user_id'),
                "assetType": "Insurance Asset",
                "assetName": f"{insurance_obj.policyName} (Maturity Value)",
                "currentValue": current_value, "purchaseValue": insurance_obj.premiumAmount,
                "purchaseDate": insurance_obj.startDate, "isFinanced": False, "linkedLoanId": None,
                "isInsured": True, "linkedInsuranceId": insurance_obj.id,
                "generatesIncome": False, "incomeAmount": None, "incomeFrequency": None,
                "notes": f"Auto-created from {insurance_obj.insuranceType} policy - {insurance_obj.maturityType}",
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.assets.insert_one(asset_data)
            await db.insurances.update_one({"id": insurance_obj.id}, {"$set": {"linkedAssetId": asset_data["id"]}})

    if insurance_obj.autoCreateExpense:
        existing_expense = await db.expenses.find_one({"linkedInsuranceId": insurance_obj.id}, {"_id": 0})
        if not existing_expense:
            freq_map = {"One-Time": "One-Time", "Monthly": "Monthly", "Quarterly": "Quarterly", "Half-Yearly": "Half-Yearly", "Yearly": "Yearly"}
            expense_freq = freq_map.get(insurance_obj.premiumFrequency, "Yearly")
            start_date = datetime.fromisoformat(insurance_obj.startDate) if insurance_obj.startDate else datetime.now(timezone.utc)
            selected_date = str(start_date.day)
            selected_month = start_date.strftime("%B") if expense_freq == "Yearly" else None
            expense_data = {
                "id": str(uuid.uuid4()), "userId": user.get('user_id'),
                "expenseName": f"{insurance_obj.policyName} Premium",
                "expenseType": "Fixed", "category": "Insurance",
                "expectedAmount": insurance_obj.premiumAmount, "frequency": expense_freq,
                "linkedAccountId": None, "linkedLoanId": None, "linkedInsuranceId": insurance_obj.id,
                "selectedDay": None, "selectedDate": selected_date,
                "selectedQuarter": None, "selectedHalf": None, "selectedMonth": selected_month,
                "oneTimeDate": insurance_obj.startDate if expense_freq == "One-Time" else None,
                "isPaid": False, "lastPaidDate": None,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await db.expenses.insert_one(expense_data)
    return insurance_obj


@router.get("", response_model=List[Insurance])
async def get_insurances(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    insurances = await db.insurances.find(user_filter, {"_id": 0}).to_list(1000)
    for insurance in insurances:
        if isinstance(insurance['createdAt'], str):
            insurance['createdAt'] = datetime.fromisoformat(insurance['createdAt'])
    return insurances


@router.get("/{insurance_id}", response_model=Insurance)
async def get_insurance(insurance_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    insurance = await db.insurances.find_one(user_filter, {"_id": 0})
    if not insurance:
        raise HTTPException(status_code=404, detail="Insurance not found")
    if isinstance(insurance['createdAt'], str):
        insurance['createdAt'] = datetime.fromisoformat(insurance['createdAt'])
    return insurance


@router.put("/{insurance_id}", response_model=Insurance)
async def update_insurance(insurance_id: str, input: InsuranceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    existing = await db.insurances.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance not found")
    insurance_dict = input.model_dump()
    insurance_dict['id'] = insurance_id
    insurance_dict['userId'] = user.get('user_id')
    insurance_dict['createdAt'] = existing['createdAt']
    await db.insurances.replace_one({"id": insurance_id}, insurance_dict)
    insurance_obj = Insurance(**insurance_dict)
    if isinstance(insurance_obj.createdAt, str):
        insurance_obj.createdAt = datetime.fromisoformat(insurance_obj.createdAt)
    return insurance_obj


@router.delete("/{insurance_id}")
async def delete_insurance(insurance_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    existing = await db.insurances.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Insurance not found")
    await db.insurances.delete_one({"id": insurance_id})
    return {"message": "Insurance deleted successfully", "id": insurance_id}



@router.get("/{insurance_id}/detail")
async def get_insurance_detail(insurance_id: str, request: Request):
    """Get comprehensive insurance detail with premium schedule."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = insurance_id
    ins = await db.insurances.find_one(user_filter, {"_id": 0})
    if not ins:
        raise HTTPException(status_code=404, detail="Insurance not found")

    from dateutil.relativedelta import relativedelta
    premium = ins.get("premiumAmount", 0)
    freq = ins.get("premiumFrequency", "Yearly")
    start_str = ins.get("startDate", "")
    end_str = ins.get("endDate")
    coverage = ins.get("coverageAmount", 0)

    try:
        start = datetime.strptime(start_str, "%Y-%m-%d")
    except (ValueError, TypeError):
        start = datetime.now()

    period_months = {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Yearly": 12, "One-Time": 0}.get(freq, 12)
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # Generate premium schedule
    schedule = []
    if period_months > 0:
        max_entries = 120
        for i in range(max_entries):
            due = start + relativedelta(months=period_months * i)
            if end_str:
                try:
                    end = datetime.strptime(end_str, "%Y-%m-%d")
                    if due > end:
                        break
                except (ValueError, TypeError):
                    pass
            if due > today + relativedelta(years=5):
                break
            status = "paid" if due.strftime("%Y-%m-%d") <= today_str else "upcoming"
            schedule.append({
                "premiumNo": i + 1,
                "dueDate": due.strftime("%Y-%m-%d"),
                "amount": premium,
                "status": status,
            })

    total_paid = sum(1 for s in schedule if s["status"] == "paid")
    total_upcoming = sum(1 for s in schedule if s["status"] == "upcoming")
    total_premium_paid = total_paid * premium

    # Monthly income
    user_id = user.get("user_id")
    incomes = await db.income_sources.find({"userId": user_id}, {"_id": 0, "expectedAmount": 1}).to_list(100)
    monthly_income = sum(i.get("expectedAmount", 0) for i in incomes)
    premium_to_income = round((premium / monthly_income * 100), 1) if monthly_income > 0 and freq == "Monthly" else round(((premium / (12 / max(period_months, 1))) / monthly_income * 100), 1) if monthly_income > 0 else 0

    return {
        **{k: v for k, v in ins.items() if k != "createdAt"},
        "createdAt": ins.get("createdAt") if isinstance(ins.get("createdAt"), str) else ins.get("createdAt", datetime.now()).isoformat() if ins.get("createdAt") else None,
        "schedule": schedule[:50],
        "totalScheduleEntries": len(schedule),
        "summary": {
            "totalPremiumsPaid": total_paid,
            "totalPremiumsUpcoming": total_upcoming,
            "totalAmountPaid": total_premium_paid,
            "coverageToPremiaPaidRatio": round(coverage / total_premium_paid, 1) if total_premium_paid > 0 else 0,
            "premiumToIncomePercent": premium_to_income,
        }
    }

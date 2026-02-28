"""Income routes - Full CRUD + list summary from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime

from database import db
from server_models import IncomeSource, IncomeSourceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_user_now, count_weekday_occurrences

router = APIRouter(prefix="/income", tags=["Income"])


@router.post("", response_model=IncomeSource)
async def create_income_source(input: IncomeSourceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    income_dict = input.model_dump()
    income_dict['userId'] = user.get('user_id')
    income_obj = IncomeSource(**income_dict)
    doc = income_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.income_sources.insert_one(doc)
    return income_obj


@router.get("", response_model=List[IncomeSource])
async def get_income_sources(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    income_sources = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
    for source in income_sources:
        if isinstance(source.get('createdAt'), str):
            source['createdAt'] = datetime.fromisoformat(source['createdAt'])
    return income_sources


@router.get("/list/summary")
async def get_income_list_summary(request: Request, type: Optional[str] = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    if type:
        # Treat synonymous types: Job↔Salary, Self-Employed↔Freelance
        type_synonyms = {
            "Job": ["Job", "Salary"],
            "Salary": ["Job", "Salary"],
            "Self-Employed": ["Self-Employed", "Freelance"],
            "Freelance": ["Self-Employed", "Freelance"],
        }
        matches = type_synonyms.get(type)
        if matches:
            user_filter["type"] = {"$in": matches}
        else:
            user_filter["type"] = {"$regex": f"^{type}$", "$options": "i"}
    projection = {
        "_id": 0, "id": 1, "name": 1, "type": 1, "expectedAmount": 1,
        "frequency": 1, "selectedDay": 1, "selectedDate": 1, "selectedMonth": 1,
        "selectedQuarter": 1, "incomeType": 1
    }
    income_sources = await db.income_sources.find(user_filter, projection).to_list(1000)
    entity_ids = [s["id"] for s in income_sources]
    pipeline = [
        {"$match": {"entityId": {"$in": entity_ids}}},
        {"$group": {
            "_id": "$entityId",
            "totalRecorded": {"$sum": "$amount"},
            "transactionCount": {"$sum": 1},
            "lastTransaction": {"$max": "$transactionDate"}
        }}
    ]
    transaction_stats = {}
    async for stat in db.income_transactions.aggregate(pipeline):
        transaction_stats[stat["_id"]] = {
            "totalRecorded": stat["totalRecorded"],
            "transactionCount": stat["transactionCount"],
            "lastTransaction": stat["lastTransaction"]
        }
    for source in income_sources:
        stats = transaction_stats.get(source["id"], {})
        source["totalRecorded"] = stats.get("totalRecorded", 0)
        source["transactionCount"] = stats.get("transactionCount", 0)
        source["lastTransaction"] = stats.get("lastTransaction")
    return income_sources


@router.get("/monthly-summary")
async def get_income_monthly_summary(request: Request):
    """Get income summary for current month with received/pending split.
    Uses the same logic as dashboard/networth for consistency."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)

    import calendar
    now = get_user_now(request)
    current_month = now.month
    current_year = now.year
    current_day = now.day
    days_in_month = calendar.monthrange(current_year, current_month)[1]

    incomes = await db.income_sources.find(user_filter, {"_id": 0}).to_list(1000)
    other_incomes = await db.other_income.find(user_filter, {"_id": 0}).to_list(1000)

    month_map = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,
                 "July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
    quarter_months = {'Q1': [1,2,3], 'Q2': [4,5,6], 'Q3': [7,8,9], 'Q4': [10,11,12]}

    total_income = 0
    received_income = 0
    pending_income = 0

    for inc in incomes:
        amount = inc.get('expectedAmount', 0) or 0
        freq = inc.get('frequency', 'Monthly')

        applies = False
        if freq in ('Daily', 'Weekly', 'Monthly'):
            applies = True
        elif freq == 'Quarterly':
            sq = inc.get('selectedQuarter', '')
            for qp, ms in quarter_months.items():
                if sq and sq.startswith(qp):
                    applies = current_month in ms
                    break
            if not applies and not sq:
                applies = current_month in [1, 4, 7, 10]
        elif freq == 'Half-Yearly':
            sh = inc.get('selectedHalf', '')
            if 'Jan' in sh:
                applies = current_month in [1, 7]
            else:
                applies = current_month in [7, 1]
        elif freq == 'Yearly':
            sm = inc.get('selectedMonth', '')
            applies = month_map.get(sm) == current_month
        elif freq in ('Irregular', 'Others'):
            cd = inc.get('customDate', '')
            if cd:
                try:
                    d = datetime.fromisoformat(cd).date()
                    applies = d.month == current_month and d.year == current_year
                except (ValueError, TypeError):
                    pass
        else:
            applies = True

        if not applies:
            continue

        if freq == 'Daily':
            month_amt = amount * days_in_month
            rec = amount * current_day
            pend = amount * (days_in_month - current_day)
        elif freq == 'Weekly':
            day_name = inc.get('selectedDay', '')
            if day_name:
                past_count = count_weekday_occurrences(current_year, current_month, day_name, current_day)
                total_count = count_weekday_occurrences(current_year, current_month, day_name)
                month_amt = amount * total_count
                rec = amount * past_count
                pend = amount * (total_count - past_count)
            else:
                month_amt = amount * 4.33
                ratio = current_day / days_in_month
                rec = month_amt * ratio
                pend = month_amt * (1 - ratio)
        else:
            month_amt = amount
            sd_str = inc.get('selectedDate')
            try:
                sd = min(int(sd_str), days_in_month) if sd_str else 1
            except (ValueError, TypeError):
                sd = 1
            if sd <= current_day:
                rec = month_amt
                pend = 0
            else:
                rec = 0
                pend = month_amt

        total_income += month_amt
        received_income += rec
        pending_income += pend

    for oi in other_incomes:
        amount = oi.get('amount', 0) or 0
        freq = oi.get('frequency', 'One-Time')
        if freq in ('One-Time', 'Irregular'):
            dr = oi.get('dateReceived', '')
            if dr:
                try:
                    d = datetime.fromisoformat(dr).date()
                    if d.month == current_month and d.year == current_year:
                        total_income += amount
                        if d.day <= current_day:
                            received_income += amount
                        else:
                            pending_income += amount
                except (ValueError, TypeError):
                    pass
        elif freq == 'Monthly':
            total_income += amount
            received_income += amount
        elif freq == 'Quarterly':
            if current_month in [1, 4, 7, 10]:
                total_income += amount
                received_income += amount
        elif freq == 'Yearly':
            sm = oi.get('selectedMonth', '')
            if month_map.get(sm) == current_month:
                total_income += amount
                received_income += amount

    return {
        "totalIncome": round(total_income),
        "receivedIncome": round(received_income),
        "pendingIncome": round(pending_income),
        "month": f"{current_year}-{current_month:02d}",
    }



@router.get("/{income_id}", response_model=IncomeSource)
async def get_income_source(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    income_source = await db.income_sources.find_one(user_filter, {"_id": 0})
    if not income_source:
        raise HTTPException(status_code=404, detail="Income source not found")
    if isinstance(income_source.get('createdAt'), str):
        income_source['createdAt'] = datetime.fromisoformat(income_source['createdAt'])
    return income_source


@router.put("/{income_id}", response_model=IncomeSource)
async def update_income_source(income_id: str, input: IncomeSourceCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.income_sources.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Income source not found")
    income_dict = input.model_dump()
    income_dict['id'] = income_id
    income_dict['userId'] = user.get('user_id')
    income_dict['createdAt'] = existing['createdAt']
    if not isinstance(income_dict['createdAt'], str):
        income_dict['createdAt'] = income_dict['createdAt'].isoformat()
    await db.income_sources.replace_one({"id": income_id}, income_dict)
    income_obj = IncomeSource(**income_dict)
    if isinstance(income_obj.createdAt, str):
        income_obj.createdAt = datetime.fromisoformat(income_obj.createdAt)
    return income_obj


@router.delete("/{income_id}")
async def delete_income_source(income_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    existing = await db.income_sources.find_one(user_filter, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Income source not found")
    await db.income_sources.delete_one({"id": income_id})
    return {"message": "Income source deleted successfully", "id": income_id}

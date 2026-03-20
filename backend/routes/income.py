"""Income routes - Full CRUD + list summary from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from datetime import datetime, timedelta
import calendar as cal

from database import db
from server_models import IncomeSource, IncomeSourceCreate
from routes.auth import get_current_user
from routes.utils import get_user_filter, get_user_now, count_weekday_occurrences

router = APIRouter(prefix="/income", tags=["Income"])


def _parse_selected_date(sd_str, current_year, current_month, days_in_month):
    """Parse selectedDate and determine if income applies this month.
    Returns (applies_this_month: bool, day_of_month: int)
    """
    if not sd_str:
        return True, 1
    sd_str = str(sd_str)
    # Full date like "2026-04-01"
    if "-" in sd_str and len(sd_str) > 4:
        try:
            full_date = datetime.strptime(sd_str, "%Y-%m-%d").date()
            if (full_date.year > current_year) or (
                full_date.year == current_year and full_date.month > current_month
            ):
                return False, full_date.day
            return True, min(full_date.day, days_in_month)
        except (ValueError, TypeError):
            return True, 1
    # Day number like "1" or "15"
    try:
        return True, min(int(sd_str), days_in_month)
    except (ValueError, TypeError):
        return True, 1


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
        "selectedQuarter": 1, "incomeType": 1, "sourceCategory": 1, "startDate": 1
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

    # Fetch current month transactions for variable income override
    import calendar
    now = get_user_now(request)
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    month_start = f"{now.year}-{now.month:02d}-01"
    month_end = f"{now.year}-{now.month:02d}-{days_in_month}"
    monthly_txn_sums = {}
    if entity_ids:
        monthly_pipeline = [
            {"$match": {"entityId": {"$in": entity_ids}, "transactionDate": {"$gte": month_start, "$lte": month_end}}},
            {"$group": {"_id": "$entityId", "totalAmount": {"$sum": "$amount"}}}
        ]
        async for stat in db.income_transactions.aggregate(monthly_pipeline):
            monthly_txn_sums[stat["_id"]] = stat["totalAmount"]

    for source in income_sources:
        stats = transaction_stats.get(source["id"], {})
        source["totalRecorded"] = stats.get("totalRecorded", 0)
        source["transactionCount"] = stats.get("transactionCount", 0)
        source["lastTransaction"] = stats.get("lastTransaction")

        # Add schedule-based monthly received/pending (consistent with monthly-summary)
        import calendar
        now = get_user_now(request)
        amount = source.get('expectedAmount', 0) or 0
        freq = source.get('frequency', 'Monthly')
        current_day = now.day
        days_in_month = calendar.monthrange(now.year, now.month)[1]

        if freq == 'Daily':
            source["monthlyTotal"] = amount * days_in_month
            source["monthlyReceived"] = amount * current_day
            source["monthlyPending"] = amount * (days_in_month - current_day)
        elif freq == 'Weekly':
            day_name = source.get('selectedDay', '')
            if not day_name:
                # Default to the weekday of createdAt, or today
                created = source.get('createdAt', '')
                if created:
                    try:
                        from datetime import datetime as dt_parse
                        cd = dt_parse.fromisoformat(created.replace('Z', '+00:00'))
                        day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][cd.weekday()]
                    except Exception:
                        day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][now.weekday()]
                else:
                    day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][now.weekday()]
            past_count = count_weekday_occurrences(now.year, now.month, day_name, current_day)
            total_count = count_weekday_occurrences(now.year, now.month, day_name)
            source["monthlyTotal"] = amount * total_count
            source["monthlyReceived"] = amount * past_count
            source["monthlyPending"] = amount * (total_count - past_count)
        else:
            sd_str = source.get('selectedDate')
            applies, sd = _parse_selected_date(sd_str, now.year, now.month, days_in_month)
            if not applies:
                source["monthlyTotal"] = 0
                source["monthlyReceived"] = 0
                source["monthlyPending"] = 0
            elif sd_str and sd <= current_day:
                source["monthlyTotal"] = amount
                source["monthlyReceived"] = amount
                source["monthlyPending"] = 0
            else:
                source["monthlyTotal"] = amount
                source["monthlyReceived"] = 0
                source["monthlyPending"] = amount

        # For variable income with actual transactions, use real amounts for received
        is_variable = source.get('incomeType', '').lower() == 'variable'
        actual_this_month = monthly_txn_sums.get(source["id"], 0)
        if is_variable and actual_this_month > 0:
            source["monthlyReceived"] = actual_this_month
            source["monthlyTotal"] = actual_this_month + source["monthlyPending"]

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

    # For variable income, fetch actual transactions this month
    month_start = f"{current_year}-{current_month:02d}-01"
    month_end = f"{current_year}-{current_month:02d}-{days_in_month}"
    entity_ids = [inc.get('id') for inc in incomes if inc.get('id')]
    variable_txn_sums = {}
    if entity_ids:
        pipeline = [
            {"$match": {
                "entityId": {"$in": entity_ids},
                "transactionDate": {"$gte": month_start, "$lte": month_end}
            }},
            {"$group": {"_id": "$entityId", "totalAmount": {"$sum": "$amount"}}}
        ]
        async for stat in db.income_transactions.aggregate(pipeline):
            variable_txn_sums[stat["_id"]] = stat["totalAmount"]

    month_map = {"January":1,"February":2,"March":3,"April":4,"May":5,"June":6,
                 "July":7,"August":8,"September":9,"October":10,"November":11,"December":12}
    quarter_start_map = {'Q1': 1, 'Q2': 4, 'Q3': 7, 'Q4': 10}

    total_income = 0
    received_income = 0
    pending_income = 0

    for inc in incomes:
        amount = inc.get('expectedAmount', 0) or 0
        freq = inc.get('frequency', 'Monthly')
        is_variable = inc.get('incomeType', '').lower() == 'variable'
        entity_id = inc.get('id', '')
        actual_received = variable_txn_sums.get(entity_id, 0) if is_variable else 0

        # Loan repayment income: use startDate to only count valid occurrences
        if inc.get('sourceCategory') == 'loan_repayment':
            loan_start = None
            start_str = inc.get('startDate', '')
            if start_str:
                try:
                    loan_start = datetime.fromisoformat(start_str).date() if isinstance(start_str, str) else start_str
                except (ValueError, TypeError):
                    loan_start = None

            if freq == 'Weekly':
                day_name = inc.get('selectedDay', '')
                if day_name:
                    past_count = 0
                    future_count = 0
                    import calendar as cal_mod
                    for d in range(1, days_in_month + 1):
                        from datetime import date as date_cls
                        dt = date_cls(current_year, current_month, d)
                        if cal_mod.day_name[dt.weekday()] == day_name:
                            if loan_start and dt <= loan_start:
                                continue
                            if d <= current_day:
                                past_count += 1
                            else:
                                future_count += 1
                    rec = amount * past_count
                    pend = amount * future_count
                    month_amt = rec + pend
                else:
                    month_amt = amount * 4
                    rec = 0
                    pend = month_amt
            elif freq == 'Daily':
                effective_start = loan_start.day if loan_start and loan_start.month == current_month and loan_start.year == current_year else 0
                past_days = max(current_day - effective_start, 0)
                future_days = days_in_month - current_day
                rec = amount * past_days
                pend = amount * future_days
                month_amt = rec + pend
            else:
                # Monthly/other: first payment is one period after loan start
                if loan_start and loan_start.month == current_month and loan_start.year == current_year:
                    month_amt = 0
                    rec = 0
                    pend = 0
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
            continue

        applies = False
        if freq in ('Daily', 'Weekly', 'Monthly'):
            applies = True
        elif freq == 'Quarterly':
            sq = inc.get('selectedQuarter', '')
            for qp, start in quarter_start_map.items():
                if sq and sq.startswith(qp):
                    applies = (current_month - start) % 3 == 0
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
            if not day_name:
                created = inc.get('createdAt', '')
                if created:
                    try:
                        from datetime import datetime as dt_parse
                        cd = dt_parse.fromisoformat(created.replace('Z', '+00:00'))
                        day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][cd.weekday()]
                    except Exception:
                        day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][now.weekday()]
                else:
                    day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][now.weekday()]
            past_count = count_weekday_occurrences(current_year, current_month, day_name, current_day)
            total_count = count_weekday_occurrences(current_year, current_month, day_name)
            month_amt = amount * total_count
            rec = amount * past_count
            pend = amount * (total_count - past_count)
        else:
            month_amt = amount
            sd_str = inc.get('selectedDate')
            applies, sd = _parse_selected_date(sd_str, current_year, current_month, days_in_month)
            if not applies:
                month_amt = 0
                rec = 0
                pend = 0
            elif sd_str and sd <= current_day:
                rec = month_amt
                pend = 0
            else:
                rec = 0
                pend = month_amt

        # For variable income with actual transactions, use real amounts for received
        if is_variable and actual_received > 0:
            rec = actual_received
            month_amt = rec + pend

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



@router.get("/{income_id}/detail")
async def get_income_detail(income_id: str, request: Request):
    """Get comprehensive income source detail with transaction history."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_filter = get_user_filter(user)
    user_filter["id"] = income_id
    inc = await db.income_sources.find_one(user_filter, {"_id": 0})
    if not inc:
        raise HTTPException(status_code=404, detail="Income source not found")

    from dateutil.relativedelta import relativedelta
    user_id = user.get("user_id")
    expected = inc.get("expectedAmount", 0)
    freq = inc.get("frequency", "Monthly")
    start_str = inc.get("startDate")

    # Fetch income transactions
    transactions = await db.income_transactions.find(
        {"userId": user_id, "incomeSourceId": income_id}, {"_id": 0}
    ).sort("date", -1).to_list(500)

    # Generate receipt schedule
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    period_months = {"Monthly": 1, "Quarterly": 3, "Half-Yearly": 6, "Yearly": 12}.get(freq, 1)

    schedule = []
    if freq == "Weekly":
        # Weekly: generate schedule based on selectedDay
        import calendar as cal
        day_name = inc.get("selectedDay", "")
        day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}
        target_dow = day_map.get(day_name)

        start = None
        if start_str:
            try:
                start = datetime.strptime(start_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                pass
        if not start:
            created = inc.get("createdAt", "")
            if isinstance(created, str) and created:
                try:
                    start = datetime.fromisoformat(created.replace("Z", "+00:00")).replace(tzinfo=None)
                except (ValueError, TypeError):
                    pass
            if not start:
                start = today - relativedelta(months=3)

        if target_dow is not None:
            # Find the first target weekday on or after start
            days_ahead = (target_dow - start.weekday()) % 7
            first_occurrence = start + timedelta(days=days_ahead)
        else:
            first_occurrence = start

        cursor = first_occurrence
        while cursor <= today + timedelta(weeks=12):
            status = "received" if cursor.strftime("%Y-%m-%d") <= today_str else "upcoming"
            schedule.append({"dueDate": cursor.strftime("%Y-%m-%d"), "amount": expected, "status": status})
            cursor += timedelta(weeks=1)

    elif freq == "Daily":
        start = None
        if start_str:
            try:
                start = datetime.strptime(start_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                pass
        if not start:
            start = today - timedelta(days=30)
        cursor = start
        while cursor <= today + timedelta(days=30):
            status = "received" if cursor.strftime("%Y-%m-%d") <= today_str else "upcoming"
            schedule.append({"dueDate": cursor.strftime("%Y-%m-%d"), "amount": expected, "status": status})
            cursor += timedelta(days=1)

    elif period_months > 0:
        # Determine start date: use startDate, then selectedDate (full date string), then createdAt
        start = None
        if start_str:
            try:
                start = datetime.strptime(start_str, "%Y-%m-%d")
            except (ValueError, TypeError):
                pass
        
        # Try selectedDate as a full date string (e.g., "2026-06-01")
        if not start:
            sel_date_val = inc.get("selectedDate")
            if sel_date_val and isinstance(sel_date_val, str) and len(str(sel_date_val)) > 4:
                try:
                    start = datetime.strptime(str(sel_date_val), "%Y-%m-%d")
                except (ValueError, TypeError):
                    pass

        if not start:
            # Use createdAt as fallback
            created = inc.get("createdAt", "")
            if isinstance(created, str) and created:
                try:
                    start = datetime.fromisoformat(created.replace("Z", "+00:00")).replace(tzinfo=None)
                except (ValueError, TypeError):
                    pass
            if not start:
                start = today - relativedelta(months=6)

            # Adjust to selectedDate day of month if available (when selectedDate is an int)
            sel_date = inc.get("selectedDate")
            if sel_date and isinstance(sel_date, (int, float)):
                try:
                    day = min(int(sel_date), 28)
                    start = start.replace(day=day)
                except (ValueError, TypeError):
                    pass

        for i in range(60):
            due = start + relativedelta(months=period_months * i)
            if due > today + relativedelta(months=3):
                break
            status = "received" if due.strftime("%Y-%m-%d") <= today_str else "upcoming"
            schedule.append({"dueDate": due.strftime("%Y-%m-%d"), "amount": expected, "status": status})

    received_count = sum(1 for s in schedule if s["status"] == "received")
    total_received = received_count * expected

    # Calculate current month's received/pending (same logic as monthly-summary for consistency)
    import calendar as cal
    current_year, current_month, current_day = today.year, today.month, today.day
    days_in_month = cal.monthrange(current_year, current_month)[1]
    if freq == "Weekly":
        day_name = inc.get("selectedDay", "")
        if not day_name:
            created = inc.get('createdAt', '')
            if created:
                try:
                    from datetime import datetime as dt_parse
                    cd = dt_parse.fromisoformat(created.replace('Z', '+00:00'))
                    day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][cd.weekday()]
                except Exception:
                    day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][today.weekday()]
            else:
                day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][today.weekday()]
        past_count = count_weekday_occurrences(current_year, current_month, day_name, current_day)
        total_count = count_weekday_occurrences(current_year, current_month, day_name)
        monthly_received = expected * past_count
        monthly_total = expected * total_count
        monthly_pending = expected * (total_count - past_count)
    elif freq == "Daily":
        monthly_received = expected * current_day
        monthly_total = expected * days_in_month
        monthly_pending = expected * (days_in_month - current_day)
    else:
        sd_str = inc.get("selectedDate")
        applies, sd_int = _parse_selected_date(sd_str, current_year, current_month, days_in_month)
        if not applies:
            monthly_total = 0
            monthly_received = 0
            monthly_pending = 0
        elif sd_str and sd_int <= current_day:
            monthly_total = expected
            monthly_received = expected
            monthly_pending = 0
        else:
            monthly_total = expected
            monthly_received = 0
            monthly_pending = expected

    # Linked asset
    linked_asset = None
    if inc.get("assetId"):
        linked_asset = await db.assets.find_one({"id": inc["assetId"]}, {"_id": 0, "assetName": 1, "currentValue": 1, "id": 1})

    # Show balanced schedule: last N received + next N upcoming
    received_entries = [s for s in schedule if s["status"] == "received"]
    upcoming_entries = [s for s in schedule if s["status"] == "upcoming"]
    # Take last 8 received (most recent first) + next 8 upcoming
    balanced_schedule = received_entries[-8:] + upcoming_entries[:8]

    return {
        **{k: v for k, v in inc.items() if k != "createdAt"},
        "createdAt": inc.get("createdAt") if isinstance(inc.get("createdAt"), str) else inc.get("createdAt", datetime.now()).isoformat() if inc.get("createdAt") else None,
        "transactions": transactions[:30],
        "schedule": balanced_schedule,
        "summary": {
            "totalReceived": round(monthly_received, 2),
            "monthlyTotal": round(monthly_total, 2),
            "monthlyPending": round(monthly_pending, 2),
            "expectedReceived": round(total_received, 2),
            "receivedCount": received_count,
            "transactionCount": len(transactions),
        },
        "linkedAsset": linked_asset,
    }

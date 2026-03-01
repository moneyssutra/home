"""Opportunity Engine — Backend routes for the native opportunity system."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException
from typing import Optional
import logging
import uuid
import asyncio

from database import db
from routes.auth import get_current_user
from routes.utils import get_user_filter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


# ============ USER-FACING ENDPOINTS ============

@router.get("/eligible")
async def get_eligible_opportunities(request: Request):
    """Return max 2 eligible opportunities for the current user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    now = datetime.now(timezone.utc)
    now_str = now.isoformat()

    # Step 1: Check partner consent from user profile
    profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})
    partner_consent = (profile or {}).get("partner_consent", True)

    # Step 2: Fetch active opportunities within date range
    active_opps = await db.opportunities.find({
        "active": True,
        "start_date": {"$lte": now_str},
        "end_date": {"$gte": now_str},
    }, {"_id": 0}).to_list(100)

    if not active_opps:
        return {"opportunities": []}

    # Step 3: Get user's opportunity log (dismissed/shown/converted)
    user_logs = await db.user_opportunity_logs.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(500)
    log_map = {}
    for log in user_logs:
        log_map[log["opportunity_id"]] = log

    # Step 4: Compute user financial metrics for eligibility
    user_filter = {"userId": user_id}
    incomes, expenses, loans, investments, accounts, insurances, credit_cards = await asyncio.gather(
        db.income_sources.find(user_filter, {"_id": 0}).to_list(500),
        db.expenses.find(user_filter, {"_id": 0}).to_list(500),
        db.loans.find(user_filter, {"_id": 0}).to_list(500),
        db.investments.find(user_filter, {"_id": 0}).to_list(500),
        db.accounts.find(user_filter, {"_id": 0}).to_list(500),
        db.insurances.find(user_filter, {"_id": 0}).to_list(500),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(500),
    )

    metrics = _compute_user_metrics(incomes, expenses, loans, investments, accounts, insurances, credit_cards, profile)

    # Step 5: Filter and evaluate
    eligible = []
    for opp in active_opps:
        opp_id = opp["id"]
        log = log_map.get(opp_id)

        # Skip if already converted
        if log and log.get("converted_at"):
            continue

        # Skip if dismissed within 30 days
        if log and log.get("dismissed_until"):
            try:
                dismiss_dt = datetime.fromisoformat(log["dismissed_until"])
                if dismiss_dt.tzinfo is None:
                    dismiss_dt = dismiss_dt.replace(tzinfo=timezone.utc)
                if dismiss_dt > now:
                    continue
            except (ValueError, TypeError):
                pass

        # Skip if shown in last 7 days
        if log and log.get("shown_at"):
            try:
                shown_dt = datetime.fromisoformat(log["shown_at"])
                if shown_dt.tzinfo is None:
                    shown_dt = shown_dt.replace(tzinfo=timezone.utc)
                if now - shown_dt < timedelta(days=7):
                    continue
            except (ValueError, TypeError):
                pass

        # Check partner consent for campaign-type
        if opp.get("type") == "campaign" and not partner_consent:
            continue

        # Evaluate eligibility
        if opp.get("type") == "system":
            if not _evaluate_rules(opp.get("eligibility_json", {}), metrics):
                continue
        elif opp.get("type") == "campaign":
            if not _evaluate_campaign_filter(opp.get("target_filter_json", {}), metrics, profile):
                continue

        eligible.append(opp)

    # Step 6: Sort by priority and return max 2
    eligible.sort(key=lambda x: x.get("priority", 5))
    result = eligible[:2]

    # Log shown events
    for opp in result:
        await db.user_opportunity_logs.update_one(
            {"user_id": user_id, "opportunity_id": opp["id"]},
            {"$set": {"shown_at": now_str, "user_id": user_id, "opportunity_id": opp["id"]}},
            upsert=True,
        )
        await _track_event(user_id, opp["id"], "opportunity_shown")

    return {"opportunities": result}


@router.post("/dismiss")
async def dismiss_opportunity(request: Request):
    """Dismiss an opportunity for 30 days."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    opp_id = body.get("opportunity_id")
    if not opp_id:
        raise HTTPException(status_code=400, detail="opportunity_id required")

    user_id = user.get("user_id")
    now = datetime.now(timezone.utc)
    dismiss_until = (now + timedelta(days=30)).isoformat()

    await db.user_opportunity_logs.update_one(
        {"user_id": user_id, "opportunity_id": opp_id},
        {"$set": {"dismissed_until": dismiss_until, "user_id": user_id, "opportunity_id": opp_id}},
        upsert=True,
    )
    await _track_event(user_id, opp_id, "opportunity_dismissed")

    return {"success": True, "dismissed_until": dismiss_until}


@router.post("/track")
async def track_opportunity_event(request: Request):
    """Track click or convert event for an opportunity."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    opp_id = body.get("opportunity_id")
    event_type = body.get("event")
    if not opp_id or not event_type:
        raise HTTPException(status_code=400, detail="opportunity_id and event required")

    user_id = user.get("user_id")
    now_str = datetime.now(timezone.utc).isoformat()

    update_fields = {"user_id": user_id, "opportunity_id": opp_id}
    if event_type == "opportunity_clicked":
        update_fields["clicked_at"] = now_str
    elif event_type == "opportunity_converted":
        update_fields["converted_at"] = now_str

    await db.user_opportunity_logs.update_one(
        {"user_id": user_id, "opportunity_id": opp_id},
        {"$set": update_fields},
        upsert=True,
    )
    await _track_event(user_id, opp_id, event_type)

    return {"success": True}


# ============ ADMIN ENDPOINTS ============

@router.get("/admin/list")
async def admin_list_opportunities(request: Request):
    """List all opportunities for admin panel."""
    from routes.admin import _require_admin
    await _require_admin(request)

    opps = await db.opportunities.find({}, {"_id": 0}).sort("priority", 1).to_list(200)
    # Attach performance stats
    for opp in opps:
        stats = await _get_opp_stats(opp["id"])
        opp["stats"] = stats
    return {"opportunities": opps}


@router.post("/admin/create")
async def admin_create_opportunity(request: Request):
    """Create a new opportunity."""
    from routes.admin import _require_admin
    await _require_admin(request)

    body = await request.json()
    opp = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "cta_text": body.get("cta_text", "Learn More"),
        "category": body.get("category", "Growth"),
        "priority": body.get("priority", 3),
        "type": body.get("type", "system"),
        "eligibility_json": body.get("eligibility_json", {}),
        "target_filter_json": body.get("target_filter_json", {}),
        "destination_url": body.get("destination_url", ""),
        "start_date": body.get("start_date", datetime.now(timezone.utc).isoformat()),
        "end_date": body.get("end_date", (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()),
        "active": body.get("active", True),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.opportunities.insert_one({**opp, "_id": opp["id"]})
    return opp


@router.put("/admin/{opp_id}")
async def admin_update_opportunity(opp_id: str, request: Request):
    """Update an opportunity."""
    from routes.admin import _require_admin
    await _require_admin(request)

    body = await request.json()
    update_fields = {}
    for field in ["title", "description", "cta_text", "category", "priority", "type",
                   "eligibility_json", "target_filter_json", "destination_url",
                   "start_date", "end_date", "active"]:
        if field in body:
            update_fields[field] = body[field]

    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.opportunities.update_one({"id": opp_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    updated = await db.opportunities.find_one({"id": opp_id}, {"_id": 0})
    return updated


@router.delete("/admin/{opp_id}")
async def admin_delete_opportunity(opp_id: str, request: Request):
    """Delete an opportunity."""
    from routes.admin import _require_admin
    await _require_admin(request)

    result = await db.opportunities.delete_one({"id": opp_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return {"success": True, "deleted_id": opp_id}


@router.get("/admin/stats")
async def admin_opportunity_stats(request: Request):
    """Get aggregate stats for all opportunities."""
    from routes.admin import _require_admin
    await _require_admin(request)

    opps = await db.opportunities.find({}, {"_id": 0, "id": 1, "title": 1, "category": 1, "active": 1}).to_list(200)
    stats_list = []
    for opp in opps:
        stats = await _get_opp_stats(opp["id"])
        stats_list.append({**opp, "stats": stats})

    total_shown = sum(s["stats"]["shown"] for s in stats_list)
    total_clicked = sum(s["stats"]["clicked"] for s in stats_list)
    total_dismissed = sum(s["stats"]["dismissed"] for s in stats_list)
    total_converted = sum(s["stats"]["converted"] for s in stats_list)

    return {
        "opportunities": stats_list,
        "totals": {
            "shown": total_shown,
            "clicked": total_clicked,
            "dismissed": total_dismissed,
            "converted": total_converted,
            "ctr": round(total_clicked / total_shown * 100, 1) if total_shown > 0 else 0,
        }
    }


@router.post("/admin/campaign/launch")
async def admin_launch_campaign(request: Request):
    """Launch a campaign for an opportunity."""
    from routes.admin import _require_admin
    await _require_admin(request)

    body = await request.json()
    opp_id = body.get("opportunity_id")
    if not opp_id:
        raise HTTPException(status_code=400, detail="opportunity_id required")

    opp = await db.opportunities.find_one({"id": opp_id}, {"_id": 0})
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    campaign = {
        "id": str(uuid.uuid4()),
        "opportunity_id": opp_id,
        "target_filter_json": body.get("target_filter_json", opp.get("target_filter_json", {})),
        "start_date": body.get("start_date", datetime.now(timezone.utc).isoformat()),
        "end_date": body.get("end_date", (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()),
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.campaigns.insert_one({**campaign, "_id": campaign["id"]})

    # Ensure opportunity is active
    await db.opportunities.update_one({"id": opp_id}, {"$set": {"active": True, "type": "campaign"}})

    return campaign


# ============ HELPER FUNCTIONS ============

def _compute_user_metrics(incomes, expenses, loans, investments, accounts, insurances, credit_cards, profile):
    """Compute financial metrics from user data for eligibility evaluation."""
    monthly_income = 0
    for inc in incomes:
        freq = inc.get("frequency", "Monthly")
        amount = inc.get("expectedAmount", 0)
        multipliers = {"Daily": 30, "Weekly": 4, "Monthly": 1, "Quarterly": 1/3, "Half-Yearly": 1/6, "Yearly": 1/12}
        monthly_income += amount * multipliers.get(freq, 1)

    monthly_expense = 0
    for exp in expenses:
        freq = exp.get("frequency", "Monthly")
        amount = exp.get("expectedAmount", 0)
        multipliers = {"Daily": 30, "Weekly": 4, "Monthly": 1, "Quarterly": 1/3, "Half-Yearly": 1/6, "Yearly": 1/12}
        monthly_expense += amount * multipliers.get(freq, 1)

    total_emi = sum(loan.get("emiAmount", 0) for loan in loans)
    total_investments = sum(inv.get("currentValue", 0) for inv in investments)
    liquid_funds = sum(acc.get("currentBalance", 0) for acc in accounts)
    total_loans = sum(loan.get("outstandingAmount", 0) for loan in loans)
    idle_cash = liquid_funds
    total_wealth = total_investments + liquid_funds

    # Days of safety
    days_of_safety = (liquid_funds / (monthly_expense / 30)) if monthly_expense > 0 else 999

    # Wealth percent
    wealth_pct = (total_wealth / (monthly_income * 12) * 100) if monthly_income > 0 else 0

    # EMI percent
    emi_pct = (total_emi / monthly_income * 100) if monthly_income > 0 else 0

    # SIP check
    has_sip = any(inv.get("investmentType", "").lower() == "sip" for inv in investments)

    # Insurance check
    has_insurance = len(insurances) > 0

    # Age
    age = 30
    if profile and profile.get("dateOfBirth"):
        try:
            dob = datetime.fromisoformat(profile["dateOfBirth"].replace("Z", "+00:00"))
            today = datetime.now(timezone.utc)
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        except (ValueError, TypeError):
            pass

    return {
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "total_emi": total_emi,
        "total_investments": total_investments,
        "liquid_funds": liquid_funds,
        "total_loans": total_loans,
        "idle_cash": idle_cash,
        "total_wealth": total_wealth,
        "days_of_safety": days_of_safety,
        "wealth_percent": wealth_pct,
        "emi_percent": emi_pct,
        "has_sip": has_sip,
        "has_insurance": has_insurance,
        "age": age,
        "income": monthly_income,
    }


def _evaluate_rules(rules, metrics):
    """Evaluate system eligibility rules against user metrics."""
    if not rules:
        return True

    for key, condition in rules.items():
        metric_val = metrics.get(key)
        if metric_val is None:
            continue

        if isinstance(condition, dict):
            op = condition.get("op", "lt")
            val = condition.get("value", 0)
            if op == "lt" and not (metric_val < val):
                return False
            elif op == "gt" and not (metric_val > val):
                return False
            elif op == "eq" and not (metric_val == val):
                return False
            elif op == "gte" and not (metric_val >= val):
                return False
            elif op == "lte" and not (metric_val <= val):
                return False
        elif isinstance(condition, bool):
            if key == "no_active_sip" and condition:
                if metrics.get("has_sip"):
                    return False
            elif key == "no_insurance" and condition:
                if metrics.get("has_insurance"):
                    return False
        elif isinstance(condition, (int, float)):
            # Simple threshold: metric must be less than value
            if metric_val >= condition:
                return False

    return True


def _evaluate_campaign_filter(filters, metrics, profile):
    """Evaluate campaign target filters."""
    if not filters:
        return True

    for key, condition in filters.items():
        if key == "age" and isinstance(condition, dict):
            age = metrics.get("age", 30)
            if "min" in condition and age < condition["min"]:
                return False
            if "max" in condition and age > condition["max"]:
                return False
        elif key == "income" and isinstance(condition, dict):
            val = condition.get("value", 0)
            op = condition.get("op", "gt")
            if op == "gt" and not (metrics.get("monthly_income", 0) > val):
                return False
        elif key == "wealth_percent" and isinstance(condition, dict):
            val = condition.get("value", 0)
            op = condition.get("op", "lt")
            if op == "lt" and not (metrics.get("wealth_percent", 0) < val):
                return False
        elif key in metrics:
            metric_val = metrics[key]
            if isinstance(condition, (int, float)) and metric_val < condition:
                return False

    return True


async def _track_event(user_id, opp_id, event_type):
    """Track an opportunity event."""
    await db.opportunity_events.insert_one({
        "user_id": user_id,
        "opportunity_id": opp_id,
        "event": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


async def _get_opp_stats(opp_id):
    """Get performance stats for an opportunity."""
    pipeline = [
        {"$match": {"opportunity_id": opp_id}},
        {"$group": {
            "_id": "$event",
            "count": {"$sum": 1}
        }}
    ]
    stats = {"shown": 0, "clicked": 0, "dismissed": 0, "converted": 0}
    async for doc in db.opportunity_events.aggregate(pipeline):
        event = doc["_id"]
        if "shown" in event:
            stats["shown"] = doc["count"]
        elif "clicked" in event:
            stats["clicked"] = doc["count"]
        elif "dismissed" in event:
            stats["dismissed"] = doc["count"]
        elif "converted" in event:
            stats["converted"] = doc["count"]
    return stats

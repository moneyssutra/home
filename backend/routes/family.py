"""Family management routes - create family, add members, view family data."""
import os
import uuid
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from routes.auth import get_current_user
from routes.utils import get_weekly_multiplier
from database import db
from notification_service import send_family_invite

logger = logging.getLogger(__name__)

APP_URL = os.environ.get("APP_URL", os.environ.get("REACT_APP_BACKEND_URL", "https://moneyssutra.com"))

router = APIRouter(prefix="/family", tags=["family"])


class FamilyMemberCreate(BaseModel):
    name: str
    relationship: str
    email: Optional[str] = None
    phone: Optional[str] = None


class FamilyCreate(BaseModel):
    familyName: str


@router.post("")
async def create_family(input: FamilyCreate, request: Request):
    """Create a new family group."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    existing = await db.families.find_one({"createdBy": user_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a family group")

    family = {
        "id": str(uuid.uuid4()),
        "familyName": input.familyName,
        "createdBy": user_id,
        "members": [
            {
                "id": user_id,
                "name": user.get("name", "You"),
                "relationship": "Self",
                "email": user.get("email"),
                "role": "owner",
                "joinedAt": datetime.now(timezone.utc).isoformat()
            }
        ],
        "inviteCode": str(uuid.uuid4())[:8].upper(),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.families.insert_one(family)
    family.pop("_id", None)
    return family


@router.get("")
async def get_family(request: Request):
    """Get user's family group."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one(
        {"$or": [{"createdBy": user_id}, {"members.id": user_id}]},
        {"_id": 0}
    )
    if not family:
        return {"family": None}
    return family


@router.get("/quick-summary")
async def get_family_quick_summary(request: Request):
    """Lightweight endpoint returning member count and combined net worth for badge display."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one(
        {"$or": [{"createdBy": user_id}, {"members.id": user_id}]},
        {"_id": 0, "members": 1}
    )
    if not family:
        return {"memberCount": 0, "combinedNetworth": 0}

    member_ids = [m["id"] for m in family.get("members", [])]
    family_filter = {"userId": {"$in": member_ids}}

    # Parallel fetch just totals
    import asyncio
    assets_cursor = db.assets.find(family_filter, {"_id": 0, "currentValue": 1})
    investments_cursor = db.investments.find(family_filter, {"_id": 0, "currentValue": 1})
    loans_cursor = db.loans.find(family_filter, {"_id": 0, "outstandingAmount": 1})
    accounts_cursor = db.accounts.find(family_filter, {"_id": 0, "balance": 1})

    assets, investments, loans, accounts = await asyncio.gather(
        assets_cursor.to_list(1000),
        investments_cursor.to_list(1000),
        loans_cursor.to_list(1000),
        accounts_cursor.to_list(1000),
    )

    total_assets = sum(a.get("currentValue", 0) for a in assets)
    total_investments = sum(i.get("currentValue", 0) for i in investments)
    total_loans = sum(ln.get("outstandingAmount", 0) for ln in loans)
    total_accounts = sum(a.get("balance", 0) for a in accounts)
    combined = total_assets + total_investments + total_accounts - total_loans

    return {
        "memberCount": len(member_ids),
        "combinedNetworth": round(combined, 2),
    }


@router.post("/add-member")
async def add_family_member(input: FamilyMemberCreate, request: Request):
    """Manually add a family member with optional smart-link to existing account."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one({"createdBy": user_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Create a family group first")

    # Phone is mandatory for new members
    if not input.phone or not input.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is mandatory for family members")

    phone = input.phone.strip()

    # Smart linking: check if an existing user account has this phone or email
    linked_user = None
    link_query = []
    if phone:
        link_query.append({"phone": phone})
    if input.email:
        link_query.append({"email": input.email})
    if link_query:
        linked_user = await db.users.find_one({"$or": link_query}, {"_id": 0})

    # Check if this phone/email is already a family member
    for m in family.get("members", []):
        if phone and m.get("phone") == phone:
            raise HTTPException(status_code=400, detail=f"A member with phone {phone} is already in the family")
        if input.email and m.get("email") == input.email:
            raise HTTPException(status_code=400, detail="A member with this email is already in the family")

    if linked_user:
        # Smart link: use the existing user's ID so their financial data is included
        member_id = linked_user.get("user_id")
        # Check if already in the family
        for m in family.get("members", []):
            if m.get("id") == member_id:
                raise HTTPException(status_code=400, detail=f"{input.name} is already linked to this family")
        new_member = {
            "id": member_id,
            "name": input.name,
            "relationship": input.relationship,
            "email": linked_user.get("email") or input.email,
            "phone": phone,
            "role": "linked",
            "linkedUserId": member_id,
            "joinedAt": datetime.now(timezone.utc).isoformat()
        }
    else:
        member_id = f"member_{str(uuid.uuid4())[:12]}"
        new_member = {
            "id": member_id,
            "name": input.name,
            "relationship": input.relationship,
            "email": input.email,
            "phone": phone,
            "role": "member",
            "joinedAt": datetime.now(timezone.utc).isoformat()
        }

    await db.families.update_one(
        {"id": family["id"]},
        {"$push": {"members": new_member}}
    )

    msg = f"{input.name} added to family"
    if linked_user:
        msg += " (linked to existing account)"

    # Send SMS + WhatsApp invite to the new member
    notification_result = None
    if phone and not linked_user:
        try:
            inviter_name = user.get("name", "Someone")
            notification_result = await send_family_invite(
                phone=phone,
                inviter_name=inviter_name,
                family_name=family.get("familyName", "your family"),
                invite_code=family.get("inviteCode", ""),
                app_url=APP_URL
            )
            if notification_result.get("all_mock"):
                msg += " (notifications queued — Twilio not configured yet)"
            else:
                msg += " (SMS & WhatsApp invite sent!)"
        except Exception as e:
            logger.error(f"Failed to send invite notification: {e}")
            notification_result = {"error": str(e)}

    return {
        "message": msg,
        "member": new_member,
        "linked": linked_user is not None,
        "notifications": notification_result
    }


@router.delete("/member/{member_id}")
async def remove_family_member(member_id: str, request: Request):
    """Remove a family member."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one({"createdBy": user_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    if member_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")

    await db.families.update_one(
        {"id": family["id"]},
        {"$pull": {"members": {"id": member_id}}}
    )
    return {"message": "Member removed"}


@router.put("/edit-member/{member_id}")
async def edit_family_member(member_id: str, input: FamilyMemberCreate, request: Request):
    """Edit a family member's details."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one({"createdBy": user_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Family not found")

    if not input.phone or not input.phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is mandatory")

    member_found = False
    for m in family.get("members", []):
        if m.get("id") == member_id:
            member_found = True
            break

    if not member_found:
        raise HTTPException(status_code=404, detail="Member not found")

    await db.families.update_one(
        {"id": family["id"], "members.id": member_id},
        {"$set": {
            "members.$.name": input.name,
            "members.$.relationship": input.relationship,
            "members.$.email": input.email,
            "members.$.phone": input.phone.strip(),
        }}
    )
    return {"message": f"{input.name} updated successfully"}


@router.get("/invite-info/{invite_code}")
async def get_invite_info(invite_code: str):
    """Public endpoint - lookup invite code to show family info on registration page."""
    family = await db.families.find_one({"inviteCode": invite_code.upper()}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    # Find the pending member info if phone was pre-registered
    pending_member = None
    for m in family.get("members", []):
        if m.get("role") == "member" and not m.get("linkedUserId"):
            pending_member = {
                "name": m.get("name"),
                "relationship": m.get("relationship"),
                "phone": m.get("phone"),
            }

    owner = None
    for m in family.get("members", []):
        if m.get("role") == "owner":
            owner = m.get("name", "Someone")
            break

    return {
        "familyName": family.get("familyName"),
        "inviteCode": family.get("inviteCode"),
        "ownerName": owner,
        "memberCount": len(family.get("members", [])),
        "pendingMember": pending_member,
    }


class JoinFamilyRequest(BaseModel):
    relationship: Optional[str] = None


@router.post("/join/{invite_code}")
async def join_family(invite_code: str, request: Request):
    """Join a family using invite code."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Parse optional body for relationship
    relationship = "Family"
    try:
        body = await request.json()
        if body and body.get("relationship"):
            relationship = body["relationship"]
    except Exception:
        pass

    user_id = user.get("user_id")
    user_phone = user.get("phone") or user.get("mobile")

    family = await db.families.find_one({"inviteCode": invite_code.upper()}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    for m in family.get("members", []):
        if m["id"] == user_id:
            raise HTTPException(status_code=400, detail="Already a member")

    # Check if this user's phone matches a pending member and use their relationship
    matched_pending = None
    if user_phone:
        for m in family.get("members", []):
            if m.get("phone") and m["phone"] == user_phone and m.get("role") == "member" and not m.get("linkedUserId"):
                matched_pending = m
                break

    if matched_pending:
        # Upgrade the pending member entry to link to this user
        await db.families.update_one(
            {"id": family["id"], "members.id": matched_pending["id"]},
            {"$set": {
                "members.$.id": user_id,
                "members.$.name": user.get("name", matched_pending.get("name", "User")),
                "members.$.email": user.get("email"),
                "members.$.role": "linked",
                "members.$.linkedUserId": user_id,
                "members.$.joinedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_member = {
            "id": user_id,
            "name": user.get("name", "User"),
            "relationship": relationship,
            "email": user.get("email"),
            "phone": user_phone,
            "role": "member",
            "joinedAt": datetime.now(timezone.utc).isoformat()
        }
        await db.families.update_one(
            {"id": family["id"]},
            {"$push": {"members": new_member}}
        )

    # Track referral
    await db.referrals.insert_one({
        "referral_id": str(uuid.uuid4()),
        "invite_code": invite_code.upper(),
        "family_id": family["id"],
        "inviter_id": family.get("createdBy"),
        "joined_user_id": user_id,
        "joined_at": datetime.now(timezone.utc).isoformat(),
        "reward_claimed": False
    })

    return {"message": f"Joined {family['familyName']}", "family": {
        "id": family["id"],
        "familyName": family.get("familyName"),
        "memberCount": len(family.get("members", [])) + (0 if matched_pending else 1)
    }}


@router.get("/member/{member_id}/summary")
async def get_member_summary(member_id: str, request: Request):
    """Get financial summary for a specific family member."""
    from routes.utils import get_user_now

    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one(
        {"$or": [{"createdBy": user_id}, {"members.id": user_id}]},
        {"_id": 0}
    )
    if not family:
        raise HTTPException(status_code=404, detail="No family group")

    member = None
    for m in family.get("members", []):
        if m["id"] == member_id:
            member = m
            break
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Fetch member's financial data
    filter_key = {"userId": member_id}

    import asyncio
    income_t = db.income_sources.find(filter_key, {"_id": 0}).to_list(1000)
    expenses_t = db.expenses.find(filter_key, {"_id": 0}).to_list(1000)
    investments_t = db.investments.find(filter_key, {"_id": 0}).to_list(1000)
    assets_t = db.assets.find(filter_key, {"_id": 0}).to_list(1000)
    loans_t = db.loans.find(filter_key, {"_id": 0}).to_list(1000)
    accounts_t = db.accounts.find(filter_key, {"_id": 0}).to_list(1000)
    insurances_t = db.insurances.find(filter_key, {"_id": 0}).to_list(1000)

    income, expenses, investments, assets, loans, accounts, insurances = await asyncio.gather(
        income_t, expenses_t, investments_t, assets_t, loans_t, accounts_t, insurances_t
    )

    # Frequency-normalized monthly values
    freq_map = {"Daily": 30, "Weekly": 4, "Monthly": 1, "Quarterly": 1/3, "Half-Yearly": 1/6, "Yearly": 1/12}
    monthly_income = sum(
        (inc.get("expectedAmount", 0) or 0) * freq_map.get(inc.get("frequency", "Monthly"), 1)
        for inc in income
    )
    monthly_expenses = sum(
        (exp.get("expectedAmount", 0) or 0) * freq_map.get(exp.get("frequency", "Monthly"), 1)
        for exp in expenses
    )

    total_investments = sum(i.get("currentValue", 0) for i in investments)
    total_assets = sum(a.get("currentValue", 0) for a in assets)
    total_loans = sum(ln.get("outstandingAmount", 0) for ln in loans)
    liquid_balance = sum(a.get("currentBalance", 0) for a in accounts)
    total_emi = sum(ln.get("emiAmount", 0) for ln in loans)

    # Semi-liquid investments (MF, FD, RD - 60% accessible)
    semi_liquid_value = sum(
        i.get("currentValue", 0) for i in investments
        if i.get("investmentCategory", "").lower() in ("mutual fund", "fixed deposit", "fd", "recurring deposit", "rd")
    )
    effective_funds = liquid_balance + (semi_liquid_value * 0.6)

    # Survival calculation
    daily_burn = monthly_expenses / 30 if monthly_expenses > 0 else 0
    survival_days = int(effective_funds / daily_burn) if daily_burn > 0 else 0
    savings_rate = round(((monthly_income - monthly_expenses) / monthly_income * 100), 1) if monthly_income > 0 else 0

    net_worth = total_assets + total_investments + liquid_balance - total_loans

    return {
        "member": member,
        "summary": {
            "monthlyIncome": round(monthly_income, 2),
            "monthlyExpenses": round(monthly_expenses, 2),
            "totalInvestments": total_investments,
            "totalAssets": total_assets,
            "totalLoans": total_loans,
            "totalEMI": total_emi,
            "liquidBalance": liquid_balance,
            "effectiveFunds": round(effective_funds, 0),
            "survivalDays": survival_days,
            "savingsRate": savings_rate,
            "netWorth": net_worth,
            "counts": {
                "income": len(income),
                "expenses": len(expenses),
                "investments": len(investments),
                "assets": len(assets),
                "loans": len(loans),
                "accounts": len(accounts),
                "insurances": len(insurances),
            }
        }
    }


@router.get("/combined-summary")
async def get_combined_family_summary(request: Request):
    """Get aggregated financial summary for entire family."""
    from routes.dashboard import _split_by_schedule_date, _split_other_income
    from routes.utils import get_user_now

    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one(
        {"$or": [{"createdBy": user_id}, {"members.id": user_id}]},
        {"_id": 0}
    )
    if not family:
        raise HTTPException(status_code=404, detail="No family group")

    member_ids = [m["id"] for m in family.get("members", [])]
    filter_key = {"userId": {"$in": member_ids}}

    import asyncio
    income_t = db.income_sources.find(filter_key, {"_id": 0}).to_list(5000)
    expenses_t = db.expenses.find(filter_key, {"_id": 0}).to_list(5000)
    investments_t = db.investments.find(filter_key, {"_id": 0}).to_list(5000)
    assets_t = db.assets.find(filter_key, {"_id": 0}).to_list(5000)
    loans_t = db.loans.find(filter_key, {"_id": 0}).to_list(5000)
    accounts_t = db.accounts.find(filter_key, {"_id": 0}).to_list(5000)
    insurances_t = db.insurances.find(filter_key, {"_id": 0}).to_list(5000)
    credit_cards_t = db.credit_cards.find(filter_key, {"_id": 0}).to_list(5000)
    other_income_t = db.other_income.find(filter_key, {"_id": 0}).to_list(5000)

    income, expenses, investments, assets, loans, accounts, insurances, credit_cards, other_incomes = await asyncio.gather(
        income_t, expenses_t, investments_t, assets_t, loans_t, accounts_t, insurances_t, credit_cards_t, other_income_t
    )

    # Received/Expected split using same logic as personal dashboard
    today = get_user_now(request)
    current_day = today.day
    current_month = today.month
    current_year = today.year

    income_received_list, income_expected_list = _split_by_schedule_date(income, current_day, current_month, current_year, is_income=True)
    expense_done_list, expense_upcoming_list = _split_by_schedule_date(expenses, current_day, current_month, current_year, is_income=False)
    oi_received, oi_expected = _split_other_income(other_incomes, current_day, current_month, current_year)

    income_received = sum(i['amount'] for i in income_received_list) + sum(i['amount'] for i in oi_received)
    income_expected = sum(i['amount'] for i in income_expected_list) + sum(i['amount'] for i in oi_expected)
    expenses_done = sum(e['amount'] for e in expense_done_list)
    upcoming_expenses = sum(e['amount'] for e in expense_upcoming_list)

    monthly_income = income_received + income_expected
    monthly_expenses = expenses_done + upcoming_expenses

    total_investments = sum(i.get("currentValue", 0) for i in investments)
    total_assets = sum(a.get("currentValue", 0) for a in assets)
    # Exclude shared loan references from combined total to avoid double counting
    unique_loans = [ln for ln in loans if not ln.get("isSharedReference")]
    total_loans = sum(ln.get("outstandingAmount", 0) for ln in unique_loans)
    liquid_balance = sum(a.get("currentBalance", 0) for a in accounts)
    total_emi = sum(ln.get("emiAmount", 0) for ln in unique_loans)
    total_insurance_coverage = sum(i.get("coverageAmount", 0) for i in insurances)
    life_ins_types = {"term insurance", "life insurance", "endowment", "ulip"}
    health_ins_types = {"health insurance", "medical insurance", "mediclaim"}
    life_insurance_coverage = sum(i.get("coverageAmount", 0) for i in insurances if i.get("insuranceType", "").lower() in life_ins_types)
    health_insurance_coverage = sum(i.get("coverageAmount", 0) for i in insurances if i.get("insuranceType", "").lower() in health_ins_types)

    def to_monthly(amount, frequency):
        freq_map = {"daily": 30, "weekly": get_weekly_multiplier(), "biweekly": 2.17, "monthly": 1,
                     "quarterly": 1/3, "half-yearly": 1/6, "yearly": 1/12, "annually": 1/12}
        return (amount or 0) * freq_map.get(frequency, 1)

    total_insurance_premium = sum(to_monthly(i.get("premiumAmount", 0), i.get("premiumFrequency", "monthly")) for i in insurances)
    total_cc_outstanding = sum(c.get("outstandingAmount", 0) for c in credit_cards)
    total_cc_limit = sum(c.get("creditLimit", 0) for c in credit_cards)
    total_emi = sum(ln.get("emiAmount", 0) for ln in loans)
    net_worth = total_assets + total_investments + liquid_balance - total_loans - total_cc_outstanding

    # Frequency-normalized monthly values (same algo as /api/financial-health)
    freq_map_upper = {"Daily": 30, "Weekly": 4, "Monthly": 1, "Quarterly": 1/3, "Half-Yearly": 1/6, "Yearly": 1/12}
    normalized_monthly_income = sum(
        (inc.get("expectedAmount", 0) or 0) * freq_map_upper.get(inc.get("frequency", "Monthly"), 1)
        for inc in income
    )
    normalized_monthly_expense = sum(
        (exp.get("expectedAmount", 0) or 0) * freq_map_upper.get(exp.get("frequency", "Monthly"), 1)
        for exp in expenses
    )

    # Survival clock calculation for family using normalized expenses
    semi_liquid_value = sum(i.get("currentValue", 0) for i in investments
                           if i.get("investmentCategory", "").lower() in ("mutual fund", "fixed deposit", "fd", "recurring deposit", "rd"))
    effective_funds = liquid_balance + (semi_liquid_value * 0.6)
    daily_burn = normalized_monthly_expense / 30 if normalized_monthly_expense > 0 else 0
    survival_days = int(effective_funds / daily_burn) if daily_burn > 0 else 0
    savings_rate = round(((normalized_monthly_income - normalized_monthly_expense) / normalized_monthly_income * 100), 1) if normalized_monthly_income > 0 else 0

    return {
        "familyName": family["familyName"],
        "memberCount": len(member_ids),
        "combinedSummary": {
            "monthlyIncome": round(monthly_income, 2),
            "monthlyExpenses": round(monthly_expenses, 2),
            "incomeReceived": round(income_received, 2),
            "expectedIncome": round(income_expected, 2),
            "expensesDone": round(expenses_done, 2),
            "upcomingExpenses": round(upcoming_expenses, 2),
            "totalInvestments": total_investments,
            "totalAssets": total_assets,
            "totalLoans": total_loans,
            "liquidBalance": liquid_balance,
            "totalInsuranceCoverage": total_insurance_coverage,
            "lifeInsuranceCoverage": life_insurance_coverage,
            "healthInsuranceCoverage": health_insurance_coverage,
            "totalInsurancePremium": round(total_insurance_premium, 2),
            "totalCCOutstanding": total_cc_outstanding,
            "totalCCLimit": total_cc_limit,
            "totalEMI": total_emi,
            "assetCount": len(assets),
            "investmentCount": len(investments),
            "accountCount": len(accounts),
            "loanCount": len(unique_loans),
            "incomeCount": len(income),
            "expenseCount": len(expenses),
            "insuranceCount": len(insurances),
            "creditCardCount": len(credit_cards),
            "netWorth": net_worth,
            "effectiveFunds": round(effective_funds, 0),
            "survivalDays": survival_days,
            "savingsRate": savings_rate,
            "normalizedMonthlyIncome": round(normalized_monthly_income, 2),
            "normalizedMonthlyExpense": round(normalized_monthly_expense, 2),
        }
    }

"""Family management routes - create family, add members, view family data."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional
from server_models import get_current_user
from database import db

router = APIRouter(prefix="/family", tags=["family"])


class FamilyMemberCreate(BaseModel):
    name: str
    relationship: str
    email: Optional[str] = None


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


@router.post("/add-member")
async def add_family_member(input: FamilyMemberCreate, request: Request):
    """Manually add a family member."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one({"createdBy": user_id}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Create a family group first")

    member_id = f"member_{str(uuid.uuid4())[:12]}"
    new_member = {
        "id": member_id,
        "name": input.name,
        "relationship": input.relationship,
        "email": input.email,
        "role": "member",
        "joinedAt": datetime.now(timezone.utc).isoformat()
    }

    await db.families.update_one(
        {"id": family["id"]},
        {"$push": {"members": new_member}}
    )
    return {"message": f"{input.name} added to family", "member": new_member}


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


@router.post("/join/{invite_code}")
async def join_family(invite_code: str, request: Request):
    """Join a family using invite code."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user.get("user_id")
    family = await db.families.find_one({"inviteCode": invite_code.upper()}, {"_id": 0})
    if not family:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    for m in family.get("members", []):
        if m["id"] == user_id:
            raise HTTPException(status_code=400, detail="Already a member")

    new_member = {
        "id": user_id,
        "name": user.get("name", "User"),
        "relationship": "Family",
        "email": user.get("email"),
        "role": "member",
        "joinedAt": datetime.now(timezone.utc).isoformat()
    }

    await db.families.update_one(
        {"id": family["id"]},
        {"$push": {"members": new_member}}
    )
    return {"message": f"Joined {family['familyName']}", "family": family}


@router.get("/member/{member_id}/summary")
async def get_member_summary(member_id: str, request: Request):
    """Get financial summary for a specific family member."""
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
    income = await db.income_sources.find(filter_key, {"_id": 0}).to_list(1000)
    expenses = await db.expenses.find(filter_key, {"_id": 0}).to_list(1000)
    investments = await db.investments.find(filter_key, {"_id": 0}).to_list(1000)
    assets = await db.assets.find(filter_key, {"_id": 0}).to_list(1000)
    loans = await db.loans.find(filter_key, {"_id": 0}).to_list(1000)
    accounts = await db.accounts.find(filter_key, {"_id": 0}).to_list(1000)

    total_income = sum(i.get("expectedAmount", 0) for i in income)
    total_expenses = sum(e.get("expectedAmount", 0) for e in expenses)
    total_investments = sum(i.get("currentValue", 0) for i in investments)
    total_assets = sum(a.get("currentValue", 0) for a in assets)
    total_loans = sum(l.get("outstandingAmount", 0) for l in loans)
    total_liquid = sum(a.get("currentBalance", 0) for a in accounts)

    return {
        "member": member,
        "summary": {
            "monthlyIncome": total_income,
            "monthlyExpenses": total_expenses,
            "totalInvestments": total_investments,
            "totalAssets": total_assets,
            "totalLoans": total_loans,
            "liquidBalance": total_liquid,
            "netWorth": total_assets + total_investments + total_liquid - total_loans,
            "counts": {
                "income": len(income),
                "expenses": len(expenses),
                "investments": len(investments),
                "assets": len(assets),
                "loans": len(loans),
                "accounts": len(accounts),
            }
        }
    }


@router.get("/combined-summary")
async def get_combined_family_summary(request: Request):
    """Get aggregated financial summary for entire family."""
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

    income = await db.income_sources.find(filter_key, {"_id": 0}).to_list(5000)
    expenses = await db.expenses.find(filter_key, {"_id": 0}).to_list(5000)
    investments = await db.investments.find(filter_key, {"_id": 0}).to_list(5000)
    assets = await db.assets.find(filter_key, {"_id": 0}).to_list(5000)
    loans = await db.loans.find(filter_key, {"_id": 0}).to_list(5000)
    accounts = await db.accounts.find(filter_key, {"_id": 0}).to_list(5000)

    return {
        "familyName": family["familyName"],
        "memberCount": len(member_ids),
        "combinedSummary": {
            "monthlyIncome": sum(i.get("expectedAmount", 0) for i in income),
            "monthlyExpenses": sum(e.get("expectedAmount", 0) for e in expenses),
            "totalInvestments": sum(i.get("currentValue", 0) for i in investments),
            "totalAssets": sum(a.get("currentValue", 0) for a in assets),
            "totalLoans": sum(l.get("outstandingAmount", 0) for l in loans),
            "liquidBalance": sum(a.get("currentBalance", 0) for a in accounts),
            "netWorth": (
                sum(a.get("currentValue", 0) for a in assets) +
                sum(i.get("currentValue", 0) for i in investments) +
                sum(a.get("currentBalance", 0) for a in accounts) -
                sum(l.get("outstandingAmount", 0) for l in loans)
            )
        }
    }

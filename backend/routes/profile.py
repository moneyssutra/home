"""Profile routes - Basic and extended profile endpoints from server.py."""
from fastapi import APIRouter, HTTPException, Request
from typing import List
from datetime import datetime, timezone

from database import db
from server_models import ExtendedProfileCreate
from routes.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/basic")
async def create_basic_profile(input: dict, request: Request = None):
    existing = await db.profiles.find_one({}, {"_id": 0})
    if existing:
        profile_dict = input if isinstance(input, dict) else input.model_dump()
        profile_dict['id'] = existing['id']
        profile_dict['createdAt'] = existing['createdAt']
        await db.profiles.replace_one({"id": existing['id']}, profile_dict)
        return profile_dict
    import uuid
    profile_dict = input if isinstance(input, dict) else input.model_dump()
    profile_dict['id'] = str(uuid.uuid4())
    profile_dict['createdAt'] = datetime.now(timezone.utc).isoformat()
    await db.profiles.insert_one(profile_dict)
    return profile_dict


@router.get("/basic")
async def get_basic_profile(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user.get('user_id')
    profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})
    if not profile:
        return {
            "name": user.get('name', ''), "email": user.get('email', ''),
            "mobile": '', "accountType": "Individual", "dateOfBirth": None,
            "maritalStatus": '', "dependents": 0, "employmentType": '',
            "monthlyIncomeRange": '', "riskAppetite": "Moderate", "retirementAge": 60
        }
    if isinstance(profile.get('createdAt'), str):
        profile['createdAt'] = datetime.fromisoformat(profile['createdAt'])
    return profile


@router.put("/extended")
async def update_extended_profile(input: ExtendedProfileCreate):
    basic = await db.profiles.find_one({}, {"_id": 0})
    if not basic:
        raise HTTPException(status_code=404, detail="Basic profile not found. Complete basic setup first.")
    existing = await db.extended_profiles.find_one({"userId": basic['id']}, {"_id": 0})
    profile_dict = input.model_dump()
    profile_dict['userId'] = basic['id']
    profile_dict['updatedAt'] = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.extended_profiles.replace_one({"userId": basic['id']}, profile_dict)
    else:
        await db.extended_profiles.insert_one(profile_dict)
    return profile_dict


@router.get("/extended")
async def get_extended_profile():
    basic = await db.profiles.find_one({}, {"_id": 0})
    if not basic:
        return None
    extended = await db.extended_profiles.find_one({"userId": basic['id']}, {"_id": 0})
    return extended


@router.get("/completion")
async def get_profile_completion():
    basic = await db.profiles.find_one({}, {"_id": 0})
    extended = await db.extended_profiles.find_one({}, {"_id": 0}) if basic else None
    completion = 0
    if basic:
        if basic.get('fullName'): completion += 10
        if basic.get('monthlyIncome'): completion += 10
        if basic.get('riskAppetite'): completion += 5
    if extended:
        if extended.get('dob'): completion += 5
        if extended.get('maritalStatus'): completion += 5
        if extended.get('dependents') is not None: completion += 5
        if extended.get('retirementAge'): completion += 10
        if extended.get('emergencyFundTarget'): completion += 5
        if extended.get('debtComfortLevel') is not None: completion += 5
        if extended.get('equityTarget') is not None: completion += 5
        if extended.get('debtTarget') is not None: completion += 5
        if extended.get('goldTarget') is not None: completion += 5
        if extended.get('existingLifeCover') is not None: completion += 10
        if extended.get('existingHealthCover') is not None: completion += 5
    return {"completion": min(completion, 100), "hasBasicProfile": basic is not None, "hasExtendedProfile": extended is not None}

"""Profile routes - User profile management."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone

from database import db
from models.profile import BasicProfile, BasicProfileCreate, ExtendedProfileCreate
from routes.auth import get_current_user
from routes.utils import convert_datetime_fields

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("/basic", response_model=BasicProfile)
async def create_basic_profile(input: BasicProfileCreate, request: Request):
    user = await get_current_user(request)
    user_id = user.get('user_id') if user else None
    
    # Check if profile exists for this user
    filter_query = {"userId": user_id} if user_id else {}
    existing = await db.profiles.find_one(filter_query, {"_id": 0})
    
    if existing:
        profile_dict = input.model_dump()
        profile_dict['id'] = existing['id']
        profile_dict['userId'] = user_id
        profile_dict['createdAt'] = existing['createdAt']
        await db.profiles.replace_one({"id": existing['id']}, profile_dict)
        
        result = BasicProfile(**profile_dict)
        if isinstance(result.createdAt, str):
            result.createdAt = datetime.fromisoformat(result.createdAt)
        return result
    
    profile_dict = input.model_dump()
    profile_dict['userId'] = user_id
    profile_obj = BasicProfile(**profile_dict)
    
    doc = profile_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    await db.profiles.insert_one(doc)
    return profile_obj


@router.get("/basic")
async def get_basic_profile(request: Request):
    user = await get_current_user(request)
    user_id = user.get('user_id') if user else None
    
    filter_query = {"userId": user_id} if user_id else {}
    profile = await db.profiles.find_one(filter_query, {"_id": 0})
    
    if not profile:
        return None
    
    convert_datetime_fields(profile)
    return profile


@router.put("/extended")
async def update_extended_profile(input: ExtendedProfileCreate, request: Request):
    user = await get_current_user(request)
    user_id = user.get('user_id') if user else None
    
    filter_query = {"userId": user_id} if user_id else {}
    basic = await db.profiles.find_one(filter_query, {"_id": 0})
    
    if not basic:
        raise HTTPException(status_code=404, detail="Basic profile not found. Complete basic setup first.")
    
    profile_user_id = basic.get('userId') or basic.get('id')
    existing = await db.extended_profiles.find_one({"userId": profile_user_id}, {"_id": 0})
    
    profile_dict = input.model_dump()
    profile_dict['userId'] = profile_user_id
    profile_dict['updatedAt'] = datetime.now(timezone.utc).isoformat()
    
    if existing:
        await db.extended_profiles.replace_one({"userId": profile_user_id}, profile_dict)
    else:
        await db.extended_profiles.insert_one(profile_dict)
    
    return profile_dict


@router.get("/extended")
async def get_extended_profile(request: Request):
    user = await get_current_user(request)
    user_id = user.get('user_id') if user else None
    
    filter_query = {"userId": user_id} if user_id else {}
    basic = await db.profiles.find_one(filter_query, {"_id": 0})
    
    if not basic:
        return None
    
    profile_user_id = basic.get('userId') or basic.get('id')
    extended = await db.extended_profiles.find_one({"userId": profile_user_id}, {"_id": 0})
    return extended


@router.get("/completion")
async def get_profile_completion(request: Request):
    """Calculate profile completion percentage"""
    user = await get_current_user(request)
    user_id = user.get('user_id') if user else None
    
    filter_query = {"userId": user_id} if user_id else {}
    basic = await db.profiles.find_one(filter_query, {"_id": 0})
    
    profile_user_id = basic.get('userId') or basic.get('id') if basic else None
    extended = await db.extended_profiles.find_one({"userId": profile_user_id}, {"_id": 0}) if profile_user_id else None
    
    completion = 0
    
    # Basic Info (25%)
    if basic:
        if basic.get('fullName'):
            completion += 10
        if basic.get('monthlyIncome'):
            completion += 10
        if basic.get('riskAppetite'):
            completion += 5
    
    # Extended profile fields (75%)
    if extended:
        if extended.get('dob'):
            completion += 5
        if extended.get('maritalStatus'):
            completion += 5
        if extended.get('dependents') is not None:
            completion += 5
        if extended.get('retirementAge'):
            completion += 10
        if extended.get('emergencyFundTarget'):
            completion += 5
        if extended.get('debtComfortLevel') is not None:
            completion += 5
        if extended.get('equityTarget') is not None:
            completion += 5
        if extended.get('debtTarget') is not None:
            completion += 5
        if extended.get('goldTarget') is not None:
            completion += 5
        if extended.get('existingLifeCover') is not None:
            completion += 10
        if extended.get('existingHealthCover') is not None:
            completion += 10
    
    return {
        "percentage": min(completion, 100),
        "hasBasicProfile": basic is not None,
        "hasExtendedProfile": extended is not None
    }

"""Settings routes - User preferences, notifications, data privacy."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/settings", tags=["settings"])

# Import shared dependencies
import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user


# ============ MODELS ============
class NotificationSettings(BaseModel):
    email_notifications: bool = True
    push_notifications: bool = True
    bill_reminders: bool = True
    goal_updates: bool = True
    weekly_summary: bool = True
    marketing_emails: bool = False
    reminder_days_before: int = 3


class PreferencesSettings(BaseModel):
    currency: str = "INR"
    language: str = "English"
    date_format: str = "DD/MM/YYYY"
    theme: str = "light"
    show_decimals: bool = True
    default_view: str = "dashboard"


class DataPrivacySettings(BaseModel):
    analytics_enabled: bool = True
    personalized_insights: bool = True
    data_sharing: bool = False
    export_format: str = "json"


# ============ NOTIFICATION SETTINGS ============
@router.get("/notifications")
async def get_notification_settings(request: Request):
    """Get user's notification settings"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    settings = await db.user_settings.find_one(
        {"userId": user_id, "type": "notifications"},
        {"_id": 0}
    )
    
    if not settings:
        return NotificationSettings().dict()
    
    return settings.get("settings", NotificationSettings().dict())


@router.post("/notifications")
async def update_notification_settings(settings: NotificationSettings, request: Request):
    """Update user's notification settings"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    await db.user_settings.update_one(
        {"userId": user_id, "type": "notifications"},
        {"$set": {
            "userId": user_id,
            "type": "notifications",
            "settings": settings.dict(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Notification settings updated"}


# ============ PREFERENCES SETTINGS ============
@router.get("/preferences")
async def get_preferences(request: Request):
    """Get user's app preferences"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    settings = await db.user_settings.find_one(
        {"userId": user_id, "type": "preferences"},
        {"_id": 0}
    )
    
    if not settings:
        return PreferencesSettings().dict()
    
    return settings.get("settings", PreferencesSettings().dict())


@router.post("/preferences")
async def update_preferences(settings: PreferencesSettings, request: Request):
    """Update user's app preferences"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    await db.user_settings.update_one(
        {"userId": user_id, "type": "preferences"},
        {"$set": {
            "userId": user_id,
            "type": "preferences",
            "settings": settings.dict(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Preferences updated"}


# ============ DATA PRIVACY SETTINGS ============
@router.get("/data-privacy")
async def get_data_privacy_settings(request: Request):
    """Get user's data privacy settings"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    settings = await db.user_settings.find_one(
        {"userId": user_id, "type": "data_privacy"},
        {"_id": 0}
    )
    
    if not settings:
        return DataPrivacySettings().dict()
    
    return settings.get("settings", DataPrivacySettings().dict())


@router.post("/data-privacy")
async def update_data_privacy_settings(settings: DataPrivacySettings, request: Request):
    """Update user's data privacy settings"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    await db.user_settings.update_one(
        {"userId": user_id, "type": "data_privacy"},
        {"$set": {
            "userId": user_id,
            "type": "data_privacy",
            "settings": settings.dict(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Data privacy settings updated"}


# ============ DATA EXPORT ============
@router.post("/export-data")
async def export_user_data(request: Request):
    """Export all user data"""
    import asyncio
    
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_filter = {"userId": user_id}
    
    # Fetch all user data
    (
        profile, incomes, expenses, assets, investments,
        loans, credit_cards, accounts, insurances, goals
    ) = await asyncio.gather(
        db.profiles.find_one({"userId": user_id}, {"_id": 0}),
        db.income_sources.find(user_filter, {"_id": 0}).to_list(1000),
        db.expenses.find(user_filter, {"_id": 0}).to_list(1000),
        db.assets.find(user_filter, {"_id": 0}).to_list(1000),
        db.investments.find(user_filter, {"_id": 0}).to_list(1000),
        db.loans.find(user_filter, {"_id": 0}).to_list(1000),
        db.credit_cards.find(user_filter, {"_id": 0}).to_list(1000),
        db.accounts.find(user_filter, {"_id": 0}).to_list(1000),
        db.insurances.find(user_filter, {"_id": 0}).to_list(1000),
        db.goals.find(user_filter, {"_id": 0}).to_list(1000)
    )
    
    export_data = {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "userId": user_id,
        "profile": profile,
        "incomeSources": incomes,
        "expenses": expenses,
        "assets": assets,
        "investments": investments,
        "loans": loans,
        "creditCards": credit_cards,
        "accounts": accounts,
        "insurances": insurances,
        "goals": goals
    }
    
    return export_data


# ============ DELETE ACCOUNT ============
@router.post("/delete-account")
async def delete_account(request: Request):
    """Delete user account and all associated data"""
    import asyncio
    
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    confirmation = body.get("confirmation")
    
    if confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Please type 'DELETE' to confirm")
    
    user_id = user.get('user_id')
    user_filter = {"userId": user_id}
    
    # Delete all user data from all collections
    await asyncio.gather(
        db.users.delete_one({"user_id": user_id}),
        db.profiles.delete_many(user_filter),
        db.income_sources.delete_many(user_filter),
        db.expenses.delete_many(user_filter),
        db.assets.delete_many(user_filter),
        db.investments.delete_many(user_filter),
        db.loans.delete_many(user_filter),
        db.credit_cards.delete_many(user_filter),
        db.accounts.delete_many(user_filter),
        db.insurances.delete_many(user_filter),
        db.goals.delete_many(user_filter),
        db.user_settings.delete_many(user_filter),
        db.user_sessions.delete_many({"user_id": user_id}),
        db.notifications.delete_many(user_filter),
        db.analytics_snapshots.delete_many(user_filter)
    )
    
    return {"message": "Account deleted successfully"}

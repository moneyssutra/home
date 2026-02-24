"""Security routes - Password, 2FA, Sessions management."""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional

router = APIRouter(prefix="/auth", tags=["security"])

# Import shared dependencies
import sys
sys.path.insert(0, '/app/backend')
from database import db
from routes.auth import get_current_user, hash_password, verify_password, validate_password_strength


# ============ MODELS ============
class ChangePasswordRequest(BaseModel):
    current_password: Optional[str] = None
    new_password: str


class TwoFAToggleRequest(BaseModel):
    enabled: bool
    phone_number: Optional[str] = None


# ============ CHANGE PASSWORD ============
@router.post("/change-password")
async def change_password(body: ChangePasswordRequest, request: Request):
    """Change password for authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    db_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # If user has a password, verify current password
    if db_user.get('has_password') and db_user.get('password_hash'):
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not verify_password(body.current_password, db_user['password_hash']):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password strength
    is_valid, error_msg = validate_password_strength(body.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Update password
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "password_hash": hash_password(body.new_password),
            "has_password": True,
            "password_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Password changed successfully"}


# ============ TWO-FACTOR AUTHENTICATION ============
@router.post("/2fa/toggle")
async def toggle_2fa(body: TwoFAToggleRequest, request: Request):
    """Enable or disable 2FA for authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    if body.enabled and not body.phone_number:
        # Get phone from profile if not provided
        profile = await db.profiles.find_one({"userId": user_id}, {"_id": 0})
        if not profile or not profile.get('mobile'):
            raise HTTPException(status_code=400, detail="Phone number required for 2FA")
        body.phone_number = profile.get('mobile')
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "two_fa_enabled": body.enabled,
            "two_fa_phone": body.phone_number if body.enabled else None,
            "two_fa_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"Two-factor authentication {'enabled' if body.enabled else 'disabled'}",
        "enabled": body.enabled
    }


@router.get("/2fa/status")
async def get_2fa_status(request: Request):
    """Get 2FA status for authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    db_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {
        "enabled": db_user.get('two_fa_enabled', False) if db_user else False,
        "phone": db_user.get('two_fa_phone', '') if db_user else ''
    }


# ============ SESSION MANAGEMENT ============
@router.get("/sessions")
async def get_active_sessions(request: Request):
    """Get all active sessions for authenticated user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    # Get current session token
    current_token = request.cookies.get('session_token')
    if not current_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            current_token = auth_header.split(" ")[1]
    
    # Get all sessions for user
    sessions = await db.user_sessions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    for session in sessions:
        result.append({
            "id": session.get('session_token', '')[:8],
            "device": session.get('user_agent', 'Unknown Device'),
            "location": session.get('location', 'Unknown'),
            "lastActive": session.get('last_active', session.get('created_at', '')),
            "current": session.get('session_token') == current_token
        })
    
    return {"sessions": result}


@router.post("/sessions/logout")
async def logout_session(request: Request):
    """Logout a specific session"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    session_id = body.get('session_id')
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    user_id = user.get('user_id')
    
    # Find and delete session that starts with session_id
    result = await db.user_sessions.delete_one({
        "user_id": user_id,
        "session_token": {"$regex": f"^{session_id}"}
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {"message": "Session logged out"}


@router.post("/sessions/logout-all")
async def logout_all_sessions(request: Request):
    """Logout all sessions except current"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    
    # Get current session token
    current_token = request.cookies.get('session_token')
    if not current_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            current_token = auth_header.split(" ")[1]
    
    # Delete all sessions except current
    result = await db.user_sessions.delete_many({
        "user_id": user_id,
        "session_token": {"$ne": current_token}
    })
    
    return {"message": f"Logged out {result.deleted_count} other sessions"}

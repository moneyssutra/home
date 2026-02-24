"""Push notification subscription routes."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone

from database import db
from push_service import get_vapid_public_key

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.get("/vapid-key")
async def get_vapid_key():
    public_key = get_vapid_public_key()
    if not public_key:
        raise HTTPException(status_code=500, detail="VAPID keys not configured")
    return {"public_key": public_key}


@router.post("/subscribe")
async def subscribe_push_notifications(subscription: dict, user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    await db.push_subscriptions.update_one(
        {"userId": user_id, "endpoint": subscription.get("endpoint")},
        {"$set": {
            "userId": user_id, "endpoint": subscription.get("endpoint"),
            "keys": subscription.get("keys", {}),
            "createdAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}


@router.delete("/unsubscribe")
async def unsubscribe_push_notifications(endpoint: str, user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    await db.push_subscriptions.delete_one({"userId": user_id, "endpoint": endpoint})
    return {"success": True}

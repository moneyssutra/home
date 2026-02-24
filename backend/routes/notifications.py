"""Notification routes - CRUD for notifications."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import uuid

from database import db
from routes.utils import create_notification_and_cleanup

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/test-reminder/{income_id}")
async def send_test_reminder(income_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    source = await db.income_sources.find_one({"id": income_id, "userId": user_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Income source not found")

    source_name = source.get("name", "Income")
    source_type = source.get("type", "job").lower().replace(' ', '-')
    expected_amount = source.get("expectedAmount", 0)

    action_url = f"/{source_type}-income/{income_id}"
    notification = {
        "id": str(uuid.uuid4()), "userId": user_id,
        "title": f"Time to record {source_name}",
        "message": f"Hi! It's time to record your {source_name} income. Expected: \u20b9{expected_amount:,.0f}" if expected_amount else f"Hi! It's time to record your {source_name} income.",
        "type": "income_reminder", "relatedIncomeId": income_id,
        "relatedIncomeName": source_name, "expectedAmount": expected_amount,
        "actionUrl": action_url, "isRead": False,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await create_notification_and_cleanup(notification)
    return {"success": True, "message": f"Test reminder sent for {source_name}"}


@router.get("")
async def get_notifications(user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    notifications = await db.notifications.find(
        {"userId": user_id}, {"_id": 0}
    ).sort("createdAt", -1).limit(10).to_list(10)
    return notifications


@router.get("/unread-count")
async def get_unread_notification_count(user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        return {"count": 0}
    count = await db.notifications.count_documents({"userId": user_id, "isRead": False})
    return {"count": count}


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    result = await db.notifications.update_one(
        {"id": notification_id, "userId": user_id}, {"$set": {"isRead": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.patch("/mark-all-read")
async def mark_all_notifications_read(user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    await db.notifications.update_many(
        {"userId": user_id, "isRead": False}, {"$set": {"isRead": True}})
    return {"success": True}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")
    result = await db.notifications.delete_one({"id": notification_id, "userId": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}


@router.delete("")
async def clear_all_notifications(request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")
    result = await db.notifications.delete_many({"userId": user_id})
    return {"success": True, "deleted_count": result.deleted_count}


@router.delete("/by-entity/{entity_id}")
async def delete_notifications_by_entity(entity_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")
    result = await db.notifications.delete_many({
        "userId": user_id,
        "$or": [{"relatedIncomeId": entity_id}, {"relatedExpenseId": entity_id}]
    })
    return {"success": True, "deleted_count": result.deleted_count}

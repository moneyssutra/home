"""Common utilities shared across route modules."""
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request
import uuid
import logging

from database import db
from server_models import ROLE_PERMISSIONS, MAX_NOTIFICATIONS_PER_USER

logger = logging.getLogger(__name__)


def get_user_now(request: Request) -> datetime:
    """Get the current time adjusted for the user's timezone.
    Frontend sends tz_offset (from JS Date.getTimezoneOffset()) which is
    minutes BEHIND UTC. IST (UTC+5:30) sends -330.
    user_local = utc_now - timedelta(minutes=tz_offset)
    """
    try:
        tz_offset = int(request.query_params.get("tz_offset", 0))
    except (ValueError, TypeError):
        tz_offset = 0
    return datetime.now(timezone.utc) - timedelta(minutes=tz_offset)


def get_user_filter(user):
    """Get filter for user data isolation"""
    user_id = user.get('user_id')
    return {"userId": user_id}


def get_workspace_filter(workspace_id: str, user_id: str = None, user_email: str = None):
    """Get the appropriate MongoDB filter for workspace data isolation"""
    if user_email == 'test@moneyssutra.com':
        return {"$or": [
            {"workspaceId": workspace_id},
            {"workspaceId": None},
            {"workspaceId": {"$exists": False}},
            {"userId": user_id},
            {"userId": None},
            {"userId": {"$exists": False}}
        ]}
    return {"workspaceId": workspace_id}


def check_permission(role: str, action: str) -> bool:
    """Check if a role has permission for an action"""
    return ROLE_PERMISSIONS.get(role, {}).get(action, False)


def convert_datetime_fields(doc: dict):
    """Convert string datetime fields to datetime objects"""
    if 'createdAt' in doc and isinstance(doc['createdAt'], str):
        try:
            doc['createdAt'] = datetime.fromisoformat(doc['createdAt'])
        except (ValueError, TypeError):
            pass


async def get_user_workspace(user, workspace_id: Optional[str] = None):
    """Get the current workspace for the user"""
    user_id = user.get('user_id')
    if workspace_id:
        member = await db.workspace_members.find_one(
            {"workspace_id": workspace_id, "user_id": user_id, "status": "active"}, {"_id": 0})
        if member:
            workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
            return workspace, member.get('role', 'viewer')
    member = await db.workspace_members.find_one(
        {"user_id": user_id, "status": "active"}, {"_id": 0}, sort=[("role", 1)])
    if member:
        workspace = await db.workspaces.find_one({"id": member['workspace_id']}, {"_id": 0})
        return workspace, member.get('role', 'viewer')
    return None, None


async def ensure_user_has_workspace(user):
    """Ensure user has at least one workspace, create default if needed"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')

    existing = await db.workspace_members.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
    if existing:
        return existing['workspace_id']

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    invite_code = uuid.uuid4().hex[:8].upper()
    workspace = {
        "id": workspace_id, "name": f"{user_name}'s Finance", "type": "Personal",
        "owner_id": user_id, "invite_code": invite_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workspaces.insert_one(workspace)
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}", "workspace_id": workspace_id,
        "user_id": user_id, "user_email": user_email, "user_name": user_name,
        "role": "owner", "invited_by": None,
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": datetime.now(timezone.utc).isoformat(), "status": "active"
    }
    await db.workspace_members.insert_one(member)

    if user_email == 'test@moneyssutra.com':
        collections = ['income_sources', 'other_income', 'loans', 'assets', 'accounts',
                        'expenses', 'investments', 'goals', 'credit_cards', 'insurances']
        for coll in collections:
            await db[coll].update_many(
                {"$or": [{"workspaceId": None}, {"workspaceId": {"$exists": False}}]},
                {"$set": {"workspaceId": workspace_id}}
            )
    return workspace_id


async def create_notification_and_cleanup(notification: dict):
    """Create a new notification and remove old ones if user has more than MAX."""
    user_id = notification.get("userId")
    await db.notifications.insert_one(notification)
    total_count = await db.notifications.count_documents({"userId": user_id})
    if total_count > MAX_NOTIFICATIONS_PER_USER:
        excess_count = total_count - MAX_NOTIFICATIONS_PER_USER
        oldest_notifications = await db.notifications.find(
            {"userId": user_id}, {"_id": 1}
        ).sort("createdAt", 1).limit(excess_count).to_list(excess_count)
        if oldest_notifications:
            ids_to_delete = [n["_id"] for n in oldest_notifications]
            await db.notifications.delete_many({"_id": {"$in": ids_to_delete}})


def now_iso() -> str:
    """Get current UTC time as ISO string"""
    return datetime.now(timezone.utc).isoformat()

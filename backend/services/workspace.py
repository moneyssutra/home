"""Workspace service - helper functions for workspace operations."""
import uuid
from datetime import datetime, timezone
from typing import Optional
from database import db


# Role permissions matrix
ROLE_PERMISSIONS = {
    "owner": {"view": True, "add": True, "edit": True, "delete": True, "invite": True},
    "admin": {"view": True, "add": True, "edit": True, "delete": True, "invite": True},
    "editor": {"view": True, "add": True, "edit": True, "delete": False, "invite": False},
    "viewer": {"view": True, "add": False, "edit": False, "delete": False, "invite": False}
}


async def get_user_workspace(user, workspace_id: Optional[str] = None):
    """Get the current workspace for the user"""
    user_id = user.get('user_id')
    
    if workspace_id:
        # Check if user has access to the specified workspace
        member = await db.workspace_members.find_one({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "status": "active"
        }, {"_id": 0})
        if member:
            workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
            return workspace, member.get('role', 'viewer')
    
    # Get user's default workspace (first one they own or are active in)
    member = await db.workspace_members.find_one({
        "user_id": user_id,
        "status": "active"
    }, {"_id": 0}, sort=[("role", 1)])  # Owner first
    
    if member:
        workspace = await db.workspaces.find_one({"id": member['workspace_id']}, {"_id": 0})
        return workspace, member.get('role', 'viewer')
    
    return None, None


async def ensure_user_has_workspace(user):
    """Ensure user has at least one workspace, create default if needed"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')
    
    # Check if user already has a workspace
    existing_member = await db.workspace_members.find_one({
        "user_id": user_id,
        "status": "active"
    }, {"_id": 0})
    
    if existing_member:
        return existing_member['workspace_id']
    
    # Create default Personal workspace
    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    invite_code = uuid.uuid4().hex[:8].upper()
    
    workspace = {
        "id": workspace_id,
        "name": f"{user_name}'s Finance",
        "type": "Personal",
        "owner_id": user_id,
        "invite_code": invite_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workspaces.insert_one(workspace)
    
    # Add user as owner
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "user_id": user_id,
        "user_email": user_email,
        "user_name": user_name,
        "role": "owner",
        "invited_by": None,
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    await db.workspace_members.insert_one(member)
    
    # Migrate user's existing data to this workspace (for legacy data)
    if user_email == 'test@moneyssutra.com':
        collections = ['income_sources', 'other_income', 'loans', 'assets', 'accounts', 
                      'expenses', 'investments', 'goals', 'credit_cards', 'insurances']
        for coll in collections:
            await db[coll].update_many(
                {"$or": [{"workspaceId": None}, {"workspaceId": {"$exists": False}}]},
                {"$set": {"workspaceId": workspace_id}}
            )
    
    return workspace_id


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
    else:
        return {"workspaceId": workspace_id}


def check_permission(role: str, action: str) -> bool:
    """Check if a role has permission for an action"""
    return ROLE_PERMISSIONS.get(role, {}).get(action, False)


def get_user_filter(user):
    """Get the appropriate MongoDB filter for user data isolation"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    
    # Test user can see legacy data (no userId), new users only see their own
    if user_email == 'test@moneyssutra.com' or user_id == 'test':
        return {"$or": [{"userId": user_id}, {"userId": None}, {"userId": {"$exists": False}}]}
    else:
        return {"userId": user_id}

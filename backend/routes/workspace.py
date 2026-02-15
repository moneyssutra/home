"""Workspace routes for multi-user access."""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
import uuid

from database import db
from models.workspace import WorkspaceCreate, WorkspaceInvite, WorkspaceInviteByCode
from routes.auth import get_current_user

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

# Role permissions matrix
ROLE_PERMISSIONS = {
    "owner": {"view": True, "add": True, "edit": True, "delete": True, "invite": True},
    "admin": {"view": True, "add": True, "edit": True, "delete": True, "invite": True},
    "editor": {"view": True, "add": True, "edit": True, "delete": False, "invite": False},
    "viewer": {"view": True, "add": False, "edit": False, "delete": False, "invite": False}
}


def check_permission(role: str, action: str) -> bool:
    """Check if a role has permission for an action"""
    return ROLE_PERMISSIONS.get(role, {}).get(action, False)


async def get_user_workspace(user, workspace_id: Optional[str] = None):
    """Get the current workspace for the user"""
    user_id = user.get('user_id')
    
    if workspace_id:
        member = await db.workspace_members.find_one({
            "workspace_id": workspace_id,
            "user_id": user_id,
            "status": "active"
        }, {"_id": 0})
        if member:
            workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
            return workspace, member.get('role', 'viewer')
    
    member = await db.workspace_members.find_one({
        "user_id": user_id,
        "status": "active"
    }, {"_id": 0}, sort=[("role", 1)])
    
    if member:
        workspace = await db.workspaces.find_one({"id": member['workspace_id']}, {"_id": 0})
        return workspace, member.get('role', 'viewer')
    
    return None, None


async def ensure_user_has_workspace(user):
    """Ensure user has at least one workspace, create default if needed"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')
    
    existing_member = await db.workspace_members.find_one({
        "user_id": user_id,
        "status": "active"
    }, {"_id": 0})
    
    if existing_member:
        return existing_member['workspace_id']
    
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
    
    # Migrate legacy data for test user
    if user_email == 'test@moneyssutra.com':
        collections = ['income_sources', 'other_income', 'loans', 'assets', 'accounts', 
                      'expenses', 'investments', 'goals', 'credit_cards', 'insurances']
        for coll in collections:
            await db[coll].update_many(
                {"$or": [{"workspaceId": None}, {"workspaceId": {"$exists": False}}]},
                {"$set": {"workspaceId": workspace_id}}
            )
    
    return workspace_id


def get_user_filter(user):
    """Get filter for user data isolation"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    
    if user_email == 'test@moneyssutra.com' or user_id == 'test':
        return {"$or": [{"userId": user_id}, {"userId": None}, {"userId": {"$exists": False}}]}
    else:
        return {"userId": user_id}


@router.get("")
async def get_user_workspaces(request: Request):
    """Get all workspaces the user has access to"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    memberships = await db.workspace_members.find({
        "user_id": user.get('user_id'),
        "status": "active"
    }, {"_id": 0}).to_list(100)
    
    workspaces = []
    for membership in memberships:
        workspace = await db.workspaces.find_one({"id": membership['workspace_id']}, {"_id": 0})
        if workspace:
            workspace['role'] = membership['role']
            workspace['member_id'] = membership['id']
            workspaces.append(workspace)
    
    return workspaces


@router.post("")
async def create_workspace(input: WorkspaceCreate, request: Request):
    """Create a new workspace"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')
    
    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    invite_code = uuid.uuid4().hex[:8].upper()
    
    workspace = {
        "id": workspace_id,
        "name": input.name,
        "type": input.type,
        "owner_id": user_id,
        "invite_code": invite_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workspaces.insert_one(workspace)
    
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
    
    return {
        "id": workspace_id,
        "name": input.name,
        "type": input.type,
        "owner_id": user_id,
        "invite_code": invite_code,
        "created_at": workspace["created_at"],
        "role": "owner"
    }


@router.get("/current")
async def get_current_workspace(request: Request, workspace_id: Optional[str] = None):
    """Get current workspace with user's role"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    default_ws_id = await ensure_user_has_workspace(user)
    workspace, role = await get_user_workspace(user, workspace_id or default_ws_id)
    
    if not workspace:
        raise HTTPException(status_code=404, detail="No workspace found")
    
    workspace['role'] = role
    workspace['permissions'] = ROLE_PERMISSIONS.get(role, {})
    
    member_count = await db.workspace_members.count_documents({
        "workspace_id": workspace['id'],
        "status": "active"
    })
    workspace['member_count'] = member_count
    
    return workspace


@router.get("/invitations/pending")
async def get_pending_invitations(request: Request):
    """Get all pending invitations for the current user"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    invitations = await db.workspace_members.find({
        "user_email": user.get('email', ''),
        "status": "pending"
    }, {"_id": 0}).to_list(100)
    
    result = []
    for inv in invitations:
        workspace = await db.workspaces.find_one({"id": inv['workspace_id']}, {"_id": 0})
        if workspace:
            inv['workspace_name'] = workspace['name']
            inv['workspace_type'] = workspace['type']
            if inv.get('invited_by'):
                inviter = await db.users.find_one({"user_id": inv['invited_by']}, {"_id": 0})
                if inviter:
                    inv['invited_by_name'] = inviter.get('name', 'Unknown')
            result.append(inv)
    
    return result


@router.post("/join")
async def join_workspace_by_code(invite: WorkspaceInviteByCode, request: Request):
    """Join a workspace using invite code"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')
    
    workspace = await db.workspaces.find_one({"invite_code": invite.invite_code.upper()}, {"_id": 0})
    if not workspace:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    
    existing = await db.workspace_members.find_one({
        "workspace_id": workspace['id'],
        "user_id": user_id,
        "status": "active"
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="You are already a member of this workspace")
    
    pending = await db.workspace_members.find_one({
        "workspace_id": workspace['id'],
        "user_email": user_email,
        "status": "pending"
    }, {"_id": 0})
    
    if pending:
        await db.workspace_members.update_one(
            {"id": pending['id']},
            {"$set": {
                "user_id": user_id,
                "user_name": user_name,
                "status": "active",
                "accepted_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "message": f"Joined workspace: {workspace['name']}",
            "workspace_id": workspace['id'],
            "role": pending['role']
        }
    
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace['id'],
        "user_id": user_id,
        "user_email": user_email,
        "user_name": user_name,
        "role": "viewer",
        "invited_by": None,
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    }
    await db.workspace_members.insert_one(member)
    
    return {
        "message": f"Joined workspace: {workspace['name']}",
        "workspace_id": workspace['id'],
        "role": "viewer"
    }


@router.post("/accept/{member_id}")
async def accept_workspace_invitation(member_id: str, request: Request):
    """Accept a pending workspace invitation"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    invitation = await db.workspace_members.find_one({
        "id": member_id,
        "user_email": user.get('email', ''),
        "status": "pending"
    }, {"_id": 0})
    
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or already accepted")
    
    await db.workspace_members.update_one(
        {"id": member_id},
        {"$set": {
            "user_id": user.get('user_id'),
            "user_name": user.get('name', 'User'),
            "status": "active",
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    workspace = await db.workspaces.find_one({"id": invitation['workspace_id']}, {"_id": 0})
    
    return {
        "message": f"Successfully joined {workspace['name'] if workspace else 'workspace'}",
        "workspace_id": invitation['workspace_id'],
        "role": invitation['role']
    }


@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, request: Request):
    """Get a specific workspace"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    workspace['role'] = role
    workspace['permissions'] = ROLE_PERMISSIONS.get(role, {})
    
    return workspace


@router.get("/{workspace_id}/members")
async def get_workspace_members(workspace_id: str, request: Request):
    """Get all members of a workspace"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    members = await db.workspace_members.find({
        "workspace_id": workspace_id
    }, {"_id": 0}).to_list(100)
    
    return members


@router.post("/{workspace_id}/invite")
async def invite_to_workspace(workspace_id: str, invite: WorkspaceInvite, request: Request):
    """Invite a user to workspace via email"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    if not check_permission(role, 'invite'):
        raise HTTPException(status_code=403, detail="You don't have permission to invite members")
    
    existing = await db.workspace_members.find_one({
        "workspace_id": workspace_id,
        "user_email": invite.email
    }, {"_id": 0})
    
    if existing:
        if existing['status'] == 'active':
            raise HTTPException(status_code=400, detail="User is already a member")
        elif existing['status'] == 'pending':
            raise HTTPException(status_code=400, detail="User already has a pending invitation")
    
    invited_user = await db.users.find_one({"email": invite.email}, {"_id": 0})
    
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}",
        "workspace_id": workspace_id,
        "user_id": invited_user['user_id'] if invited_user else None,
        "user_email": invite.email,
        "user_name": invited_user['name'] if invited_user else invite.email.split('@')[0],
        "role": invite.role,
        "invited_by": user.get('user_id'),
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": None,
        "status": "pending"
    }
    await db.workspace_members.insert_one(member)
    
    return {
        "message": f"Invitation sent to {invite.email}",
        "member_id": member['id'],
        "status": "pending"
    }


@router.put("/{workspace_id}/members/{member_id}/role")
async def update_member_role(workspace_id: str, member_id: str, new_role: str, request: Request):
    """Update a member's role (owner only)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    if role != 'owner':
        raise HTTPException(status_code=403, detail="Only the owner can change member roles")
    
    if new_role not in ['admin', 'editor', 'viewer']:
        raise HTTPException(status_code=400, detail="Invalid role. Must be admin, editor, or viewer")
    
    member = await db.workspace_members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.get('role') == 'owner':
        raise HTTPException(status_code=400, detail="Cannot change owner's role")
    
    await db.workspace_members.update_one(
        {"id": member_id},
        {"$set": {"role": new_role}}
    )
    
    return {"message": f"Role updated to {new_role}", "member_id": member_id}


@router.delete("/{workspace_id}/members/{member_id}")
async def remove_workspace_member(workspace_id: str, member_id: str, request: Request):
    """Remove a member from workspace"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    member = await db.workspace_members.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.get('role') == 'owner':
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")
    
    if member.get('user_id') != user.get('user_id') and role != 'owner':
        raise HTTPException(status_code=403, detail="You don't have permission to remove this member")
    
    await db.workspace_members.update_one(
        {"id": member_id},
        {"$set": {"status": "removed"}}
    )
    
    return {"message": "Member removed successfully", "member_id": member_id}


@router.put("/{workspace_id}/regenerate-code")
async def regenerate_invite_code(workspace_id: str, request: Request):
    """Regenerate the workspace invite code (owner only)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    workspace, role = await get_user_workspace(user, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found or access denied")
    
    if role != 'owner':
        raise HTTPException(status_code=403, detail="Only the owner can regenerate the invite code")
    
    new_code = uuid.uuid4().hex[:8].upper()
    await db.workspaces.update_one(
        {"id": workspace_id},
        {"$set": {"invite_code": new_code}}
    )
    
    return {"invite_code": new_code}

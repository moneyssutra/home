"""Workspace models for multi-user access."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: f"ws_{uuid.uuid4().hex[:12]}")
    name: str
    type: str = "Personal"  # "Personal" or "Business"
    owner_id: str  # User ID of the owner
    invite_code: Optional[str] = None  # For sharing via code
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkspaceCreate(BaseModel):
    name: str
    type: str = "Personal"


class WorkspaceMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: f"wm_{uuid.uuid4().hex[:12]}")
    workspace_id: str
    user_id: str
    user_email: str
    user_name: str
    role: str = "viewer"  # "owner", "admin", "editor", "viewer"
    invited_by: Optional[str] = None  # User ID of inviter
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    status: str = "pending"  # "pending", "active", "removed"


class WorkspaceInvite(BaseModel):
    email: str
    role: str = "viewer"


class WorkspaceInviteByCode(BaseModel):
    invite_code: str

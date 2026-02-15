"""Authentication and User models."""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str
    picture: Optional[str] = None
    auth_type: str = "google"  # "google" or "jwt"
    password_hash: Optional[str] = None  # For JWT auth only
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JWTLoginRequest(BaseModel):
    username: str
    password: str


class GoogleSessionRequest(BaseModel):
    session_id: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

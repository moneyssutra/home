"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Response, Request, Cookie
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging
import hashlib

from database import db
from models.auth import JWTLoginRequest, GoogleSessionRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == hashed


async def get_current_user(request: Request):
    """Get current user from session token (cookie or header)"""
    token = request.cookies.get("session_token")
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


@router.post("/register")
async def register_user(request: RegisterRequest, response: Response):
    """Register a new user with email/password"""
    existing_user = await db.users.find_one({"email": request.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "picture": None,
        "auth_type": "jwt",
        "password_hash": hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": request.email,
        "name": request.name,
        "picture": None,
        "session_token": session_token
    }


@router.post("/login")
async def jwt_login(request: JWTLoginRequest, response: Response):
    """JWT-based username/password login"""
    # Demo credentials
    if request.username == "test" and request.password == "test":
        user = await db.users.find_one({"email": "test@moneyssutra.com"}, {"_id": 0})
        
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id,
                "email": "test@moneyssutra.com",
                "name": "Test User",
                "picture": None,
                "auth_type": "jwt",
                "password_hash": hash_password("test"),
                "has_password": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
        else:
            user_id = user["user_id"]
        
        session_token = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session)
        
        response.set_cookie(
            key="session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            path="/",
            max_age=7 * 24 * 60 * 60
        )
        
        return {
            "user_id": user_id,
            "email": user.get("email"),
            "name": user.get("name"),
            "picture": user.get("picture"),
            "session_token": session_token
        }
    
    # Regular user login - check by email regardless of auth_type if they have a password
    user = await db.users.find_one({"email": request.username}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user has a password set (either JWT user or Google user who set a password)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="No password set. Please login with Google or set a password first.")
    
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "session_token": session_token
    }


@router.post("/google/session")
async def google_session(request: GoogleSessionRequest, response: Response):
    """Process Google OAuth session_id from Emergent Auth"""
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
    except Exception as e:
        logging.error(f"Google auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = session_data.get("email")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "email": email,
            "name": session_data.get("name"),
            "picture": session_data.get("picture"),
            "auth_type": "google",
            "password_hash": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": session_data.get("name"),
                "picture": session_data.get("picture")
            }}
        )
    
    session_token = session_data.get("session_token") or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": session_data.get("name"),
        "picture": session_data.get("picture"),
        "session_token": session_token
    }


@router.post("/set-password")
async def set_password(request: Request, response: Response):
    """Allow Google users to set a password for email/password login"""
    user = await get_current_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    body = await request.json()
    new_password = body.get("password")
    
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update user with password hash and allow both auth types
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "password_hash": hash_password(new_password),
            "has_password": True
        }}
    )
    
    return {"message": "Password set successfully. You can now login with email and password."}


@router.get("/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "auth_type": user.get("auth_type"),
        "has_password": user.get("has_password", user.get("auth_type") == "jwt")
    }


@router.post("/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout and invalidate session"""
    token = session_token
    
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"message": "Logged out successfully"}

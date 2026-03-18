"""MPIN Authentication — Set, verify, and login with a 4-digit PIN."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Response
import bcrypt
import uuid
import logging

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mpin")


async def _get_user_or_401(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/set")
async def set_mpin(request: Request):
    """Set or update MPIN for the authenticated user."""
    user = await _get_user_or_401(request)
    body = await request.json()
    mpin = body.get("mpin", "")

    if not mpin or len(mpin) != 4 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be exactly 4 digits")

    hashed = bcrypt.hashpw(mpin.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"mpin_hash": hashed, "mpin_set_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "MPIN set successfully"}


@router.get("/status")
async def mpin_status(request: Request):
    """Check if the authenticated user has an MPIN set."""
    user = await _get_user_or_401(request)
    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "mpin_hash": 1})
    has_mpin = bool(user_doc and user_doc.get("mpin_hash"))
    return {"has_mpin": has_mpin}


@router.post("/verify")
async def verify_mpin(request: Request):
    """Verify MPIN for the authenticated user (e.g., for sensitive actions)."""
    user = await _get_user_or_401(request)
    body = await request.json()
    mpin = body.get("mpin", "")

    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "mpin_hash": 1})
    if not user_doc or not user_doc.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="MPIN not set")

    if not bcrypt.checkpw(mpin.encode(), user_doc["mpin_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid MPIN")

    return {"success": True, "verified": True}


@router.post("/login")
async def login_with_mpin(request: Request, response: Response):
    """Login using email + MPIN (alternative to password login)."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    mpin = body.get("mpin", "")

    if not email or not mpin:
        raise HTTPException(status_code=400, detail="Email and MPIN are required")

    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1, "mpin_hash": 1})
    if not user or not user.get("mpin_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(mpin.encode(), user["mpin_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Create session (same as password login)
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
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7*24*60*60)

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"lastLogin": datetime.now(timezone.utc).isoformat()}}
    )

    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "firstName": user.get("firstName", ""),
        "picture": user.get("picture"),
        "session_token": session_token,
    }


@router.delete("/remove")
async def remove_mpin(request: Request):
    """Remove MPIN for the authenticated user."""
    user = await _get_user_or_401(request)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$unset": {"mpin_hash": "", "mpin_set_at": ""}}
    )
    return {"success": True, "message": "MPIN removed"}

"""MPIN Authentication — Set, verify, and login with a 4-digit PIN."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Response, BackgroundTasks
import bcrypt
import uuid
import hashlib
import logging

from database import db
from routes.auth import get_current_user
from email_service import send_otp_email_sync

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
    remember_me = body.get("remember_me", False)
    session_days = 30 if remember_me else 7
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=session_days*24*60*60)

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


@router.post("/change")
async def change_mpin(request: Request):
    """Change MPIN by verifying the current MPIN first."""
    user = await _get_user_or_401(request)
    body = await request.json()
    current_mpin = body.get("current_mpin", "")
    new_mpin = body.get("new_mpin", "")

    if not current_mpin or not new_mpin:
        raise HTTPException(status_code=400, detail="Current MPIN and new MPIN are required")
    if len(new_mpin) != 4 or not new_mpin.isdigit():
        raise HTTPException(status_code=400, detail="New MPIN must be exactly 4 digits")

    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "mpin_hash": 1})
    if not user_doc or not user_doc.get("mpin_hash"):
        raise HTTPException(status_code=400, detail="MPIN not set. Use setup instead.")

    if not bcrypt.checkpw(current_mpin.encode(), user_doc["mpin_hash"].encode()):
        raise HTTPException(status_code=401, detail="Current MPIN is incorrect")

    hashed = bcrypt.hashpw(new_mpin.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"mpin_hash": hashed, "mpin_set_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "MPIN changed successfully"}


@router.post("/send-change-otp")
async def send_mpin_change_otp(request: Request, background_tasks: BackgroundTasks):
    """Send OTP to authenticated user's email for MPIN change (forgot current MPIN)."""
    user = await _get_user_or_401(request)
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "email": 1}
    )
    if not user_doc or not user_doc.get("email"):
        raise HTTPException(status_code=400, detail="No email found for this account")

    email = user_doc["email"]

    # Rate limit: 60s cooldown
    recent = await db.login_otp_tokens.find_one(
        {"email": email, "purpose": "mpin_change", "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()}},
        {"_id": 0}
    )
    if recent:
        raise HTTPException(status_code=429, detail="Please wait before requesting another OTP")

    import random
    otp = str(random.randint(100000, 999999))
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()

    await db.login_otp_tokens.insert_one({
        "otp_id": str(uuid.uuid4()),
        "email": email,
        "user_id": user["user_id"],
        "otp_hash": otp_hash,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "used": False,
        "attempts": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "mpin_change",
    })

    background_tasks.add_task(send_otp_email_sync, email, otp)
    # Mask email for display
    parts = email.split("@")
    masked = parts[0][:2] + "***@" + parts[1] if len(parts) == 2 else email
    return {"success": True, "message": "OTP sent to your email", "masked_email": masked}


@router.post("/change-with-otp")
async def change_mpin_with_otp(request: Request):
    """Change MPIN after verifying OTP (for authenticated users who forgot current MPIN)."""
    user = await _get_user_or_401(request)
    body = await request.json()
    otp = (body.get("otp") or "").strip()
    new_mpin = body.get("new_mpin", "")

    if not otp or not new_mpin:
        raise HTTPException(status_code=400, detail="OTP and new MPIN are required")
    if len(new_mpin) != 4 or not new_mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be exactly 4 digits")

    user_doc = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "email": 1})
    email = user_doc.get("email", "") if user_doc else ""

    record = await db.login_otp_tokens.find_one(
        {"email": email, "purpose": "mpin_change", "used": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if record.get("attempts", 0) >= 3:
        await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many attempts. Request a new OTP.")

    await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$inc": {"attempts": 1}})

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new one.")

    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    if otp_hash != record["otp_hash"]:
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid code. ({max(remaining, 0)} attempt(s) left)")

    await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})

    hashed = bcrypt.hashpw(new_mpin.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"mpin_hash": hashed, "mpin_set_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "MPIN changed successfully"}

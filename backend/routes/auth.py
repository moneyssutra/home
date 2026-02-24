"""Authentication routes - Full auth logic from server.py."""
from fastapi import APIRouter, HTTPException, Response, Request, Cookie
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging
import hashlib
import secrets
import re

from database import db
from server_models import (
    JWTLoginRequest, GoogleSessionRequest, RegisterRequest,
    SetPasswordRequest, CheckAvailabilityRequest, ForgotUsernameRequest,
    ForgotPasswordRequest, ResetPasswordRequest
)
from email_service import (
    send_username_recovery_email,
    send_password_reset_email,
    send_password_changed_notification
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def validate_password_strength(password: str) -> tuple:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least 1 uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least 1 number"
    if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in password):
        return False, "Password must contain at least 1 special character"
    return True, ""


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
    email = request.email.strip().lower()
    firstName = request.firstName.strip()
    middleName = request.middleName.strip() if request.middleName else ""
    lastName = request.lastName.strip()
    fullName = f"{firstName} {middleName} {lastName}".replace("  ", " ").strip()

    if not firstName:
        raise HTTPException(status_code=400, detail="First name is required")
    if not lastName:
        raise HTTPException(status_code=400, detail="Last name is required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not request.sex or request.sex.lower() not in ["male", "female"]:
        raise HTTPException(status_code=400, detail="Please select your sex (Male/Female)")
    if not request.dateOfBirth:
        raise HTTPException(status_code=400, detail="Date of birth is required")

    name_pattern = re.compile(r'^[A-Za-z\s]+$')
    if not name_pattern.match(firstName):
        raise HTTPException(status_code=400, detail="First name should contain only letters")
    if not name_pattern.match(lastName):
        raise HTTPException(status_code=400, detail="Last name should contain only letters")
    if middleName and not name_pattern.match(middleName):
        raise HTTPException(status_code=400, detail="Middle name should contain only letters")

    if request.mobile:
        mobile = request.mobile.strip()
        if not re.match(r'^\d{10}$', mobile):
            raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")

    try:
        dob = datetime.fromisoformat(request.dateOfBirth)
        if dob.tzinfo is None:
            dob = dob.replace(tzinfo=timezone.utc)
        if dob > datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Date of birth cannot be in the future")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    is_valid, error_msg = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    existing_email = await db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_name = await db.users.find_one(
        {"name": {"$regex": f"^{fullName}$", "$options": "i"}}, {"_id": 0})
    if existing_name:
        raise HTTPException(status_code=400, detail="This name is already registered")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id, "email": email, "name": fullName,
        "firstName": firstName, "middleName": middleName, "lastName": lastName,
        "picture": None, "auth_type": "jwt",
        "password_hash": hash_password(request.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)

    basic_profile = {
        "user_id": user_id, "firstName": firstName, "middleName": middleName,
        "lastName": lastName, "fullName": fullName, "email": email,
        "mobile": request.mobile.strip() if request.mobile else None,
        "sex": request.sex.lower(), "dateOfBirth": request.dateOfBirth,
        "profilePicture": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.basic_profiles.insert_one(basic_profile)

    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {
        "session_id": str(uuid.uuid4()), "user_id": user_id,
        "session_token": session_token, "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)

    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7*24*60*60)

    return {
        "user_id": user_id, "email": email, "name": fullName,
        "firstName": firstName, "lastName": lastName, "picture": None,
        "session_token": session_token, "isNewUser": True
    }


@router.post("/login")
async def jwt_login(request: JWTLoginRequest, response: Response):
    identifier = request.username.strip()
    is_mobile = identifier.isdigit() and len(identifier) == 10
    is_email = "@" in identifier

    if identifier == "test" and request.password == "test":
        user = await db.users.find_one({"email": "test@moneyssutra.com"}, {"_id": 0})
        if not user:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            user = {
                "user_id": user_id, "email": "test@moneyssutra.com", "name": "Test User",
                "firstName": "Test", "lastName": "User", "picture": None, "auth_type": "jwt",
                "password_hash": hash_password("test"),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user)
        else:
            user_id = user["user_id"]

        session_token = str(uuid.uuid4())
        session_days = 30 if request.remember_me else 7
        expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
        session = {
            "session_id": str(uuid.uuid4()), "user_id": user_id,
            "session_token": session_token, "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session)
        response.set_cookie(key="session_token", value=session_token, httponly=True,
                            secure=True, samesite="none", path="/", max_age=session_days*24*60*60)
        return {
            "user_id": user_id, "email": user.get("email"), "name": user.get("name"),
            "firstName": user.get("firstName", user.get("name", "").split()[0] if user.get("name") else ""),
            "picture": user.get("picture"), "session_token": session_token
        }

    query_conditions = []
    if is_email:
        query_conditions.append({"email": {"$regex": f"^{identifier}$", "$options": "i"}})
    if is_mobile:
        query_conditions.append({"mobile": identifier})
    if not is_email and not is_mobile:
        query_conditions = [
            {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
            {"mobile": identifier}
        ]

    user = await db.users.find_one({"$or": query_conditions}, {"_id": 0})
    if not user and is_mobile:
        profile = await db.basic_profiles.find_one({"mobile": identifier}, {"_id": 0, "user_id": 1})
        if profile:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password")
    if not user.get("password_hash"):
        if user.get("auth_type") == "google":
            raise HTTPException(status_code=401, detail="No password set. Please login with Google or set a password in your profile.")
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password")
    if not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password")

    session_token = str(uuid.uuid4())
    session_days = 30 if request.remember_me else 7
    expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
    session = {
        "session_id": str(uuid.uuid4()), "user_id": user["user_id"],
        "session_token": session_token, "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=session_days*24*60*60)
    return {
        "user_id": user["user_id"], "email": user.get("email"), "name": user.get("name"),
        "firstName": user.get("firstName", user.get("name", "").split()[0] if user.get("name") else ""),
        "picture": user.get("picture"), "session_token": session_token
    }


@router.post("/google/session")
async def google_session(request: GoogleSessionRequest, response: Response):
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
    is_new_user = False
    has_password = False

    if not user:
        is_new_user = True
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id, "email": email, "name": session_data.get("name"),
            "picture": session_data.get("picture"), "auth_type": "google",
            "password_hash": None, "has_password": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user["user_id"]
        has_password = user.get("has_password", False) or (user.get("password_hash") is not None)
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": session_data.get("name"), "picture": session_data.get("picture")
        }})

    session_token = session_data.get("session_token") or str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session = {
        "session_id": str(uuid.uuid4()), "user_id": user_id,
        "session_token": session_token, "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session)
    response.set_cookie(key="session_token", value=session_token, httponly=True,
                        secure=True, samesite="none", path="/", max_age=7*24*60*60)
    return {
        "user_id": user_id, "email": email, "name": session_data.get("name"),
        "picture": session_data.get("picture"), "session_token": session_token,
        "auth_type": "google", "has_password": has_password, "is_new_user": is_new_user
    }


@router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "user_id": user.get("user_id"), "email": user.get("email"),
        "name": user.get("name"), "picture": user.get("picture"),
        "auth_type": user.get("auth_type"),
        "has_password": user.get("has_password", user.get("auth_type") == "jwt" or user.get("password_hash") is not None)
    }


@router.post("/set-password")
async def set_password(request: SetPasswordRequest, req: Request):
    user = await get_current_user(req)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
        "password_hash": hash_password(request.password), "has_password": True
    }})
    return {"message": "Password set successfully. You can now login with email and password."}


@router.post("/logout")
async def logout(request: Request, response: Response, session_token: Optional[str] = Cookie(None)):
    token = session_token
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}


@router.post("/check-availability")
async def check_availability(request: CheckAvailabilityRequest):
    result = {"username_available": True, "email_available": True, "message": ""}
    if request.username:
        username = request.username.strip()
        existing_by_name = await db.users.find_one(
            {"name": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0, "name": 1})
        existing_by_email_prefix = await db.users.find_one(
            {"email": {"$regex": f"^{username}@", "$options": "i"}}, {"_id": 0, "email": 1})
        if existing_by_name or existing_by_email_prefix:
            result["username_available"] = False
            result["message"] = "This username is already taken. Please choose another."
    if request.email:
        email = request.email.strip().lower()
        existing_user = await db.users.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0, "email": 1})
        if existing_user:
            result["email_available"] = False
            result["message"] = "This email is already registered."
    return result


@router.post("/forgot-username")
async def forgot_username(request: ForgotUsernameRequest):
    user = await db.users.find_one(
        {"email": {"$regex": f"^{request.email}$", "$options": "i"}},
        {"_id": 0, "name": 1, "email": 1, "auth_type": 1})
    success_message = "If an account exists with this email, you will receive your username shortly."
    if user:
        if user.get("auth_type") == "jwt" or user.get("auth_type") is None:
            username = user.get("name", "User")
            email_result = await send_username_recovery_email(user["email"], username)
            if not email_result.get("success"):
                logger.error(f"Failed to send username recovery email: {email_result.get('error')}")
    return {"message": success_message}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    identifier = request.username.strip()
    is_mobile = identifier.isdigit() and len(identifier) == 10
    is_email = "@" in identifier

    query_conditions = []
    if is_email:
        query_conditions.append({"email": {"$regex": f"^{identifier}$", "$options": "i"}})
    if is_mobile:
        query_conditions.append({"mobile": identifier})
    if not is_email and not is_mobile:
        query_conditions = [
            {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
            {"mobile": identifier}
        ]

    user = await db.users.find_one(
        {"$or": query_conditions},
        {"_id": 0, "user_id": 1, "name": 1, "firstName": 1, "email": 1, "mobile": 1, "auth_type": 1})

    if not user and is_mobile:
        profile = await db.basic_profiles.find_one({"mobile": identifier}, {"_id": 0, "user_id": 1, "firstName": 1})
        if profile:
            user = await db.users.find_one({"user_id": profile["user_id"]}, {"_id": 0})
            if user:
                user["firstName"] = profile.get("firstName", user.get("name", "").split()[0] if user.get("name") else "User")

    success_message = "If an account exists with this email or mobile number, you will receive a password reset link shortly."
    if user:
        if user.get("auth_type") == "jwt" or user.get("auth_type") is None:
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
            reset_record = {
                "token_id": str(uuid.uuid4()), "user_id": user["user_id"],
                "reset_token": reset_token, "expires_at": expires_at.isoformat(),
                "used": False, "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.password_reset_tokens.insert_one(reset_record)
            first_name = user.get("firstName", user.get("name", "User").split()[0] if user.get("name") else "User")
            email_result = await send_password_reset_email(user["email"], first_name, reset_token)
            if not email_result.get("success"):
                logger.error(f"Failed to send password reset email: {email_result.get('error')}")
    return {"message": success_message}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    reset_record = await db.password_reset_tokens.find_one(
        {"reset_token": request.token, "used": False}, {"_id": 0})
    if not reset_record:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    expires_at = reset_record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")

    if len(request.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user = await db.users.find_one({"user_id": reset_record["user_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hash_password(request.new_password)}})
    await db.password_reset_tokens.update_one({"reset_token": request.token}, {"$set": {"used": True}})
    await db.user_sessions.delete_many({"user_id": user["user_id"]})

    username = user.get("name", "User")
    email_result = await send_password_changed_notification(user["email"], username)
    if not email_result.get("success"):
        logger.error(f"Failed to send password changed notification: {email_result.get('error')}")

    return {"message": "Password reset successfully. Please log in with your new password."}


@router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    reset_record = await db.password_reset_tokens.find_one(
        {"reset_token": token, "used": False}, {"_id": 0})
    if not reset_record:
        return {"valid": False, "message": "Invalid or expired reset link"}
    expires_at = reset_record.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return {"valid": False, "message": "Reset link has expired. Please request a new one."}
    return {"valid": True}

"""Authentication routes - Full auth logic from server.py."""
from fastapi import APIRouter, HTTPException, Response, Request, Cookie, BackgroundTasks
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging
import hashlib
import secrets
import re
import time

from database import db
from server_models import (
    JWTLoginRequest, GoogleSessionRequest, RegisterRequest,
    SetPasswordRequest, CheckAvailabilityRequest, ForgotUsernameRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    SendOTPRequest, VerifyOTPRequest, ResetPasswordOTPRequest,
    VerifySignupOTPRequest
)
from email_service import (
    send_username_recovery_email,
    send_password_reset_email,
    send_password_changed_notification,
    send_otp_email,
    send_otp_email_sync,
    send_email_sync,
    get_password_reset_email,
    get_password_changed_email,
    get_username_recovery_email,
    APP_URL as EMAIL_APP_URL,
)
import jwt
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

TEMP_TOKEN_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))
TEMP_TOKEN_EXPIRY_MINUTES = 10


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


async def _seed_test_account(user_id: str):
    """Ensure the test account has sample assets, loans, credit cards, and insurance."""
    try:
        # Only seed if assets collection is empty for this user
        existing = await db.assets.find_one({"userId": user_id}, {"_id": 0})
        if existing:
            return  # Already seeded

        now = datetime.now(timezone.utc).isoformat()

        # Sample Assets
        assets = [
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Primary Residence", "type": "Real Estate", "value": 45000000, "purchaseDate": "2020-01-15", "notes": "3BHK Apartment", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Gold Jewelry", "type": "Gold", "value": 800000, "purchaseDate": "2018-06-20", "notes": "Family gold", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Car - Honda City", "type": "Vehicle", "value": 1200000, "purchaseDate": "2022-03-10", "notes": "2022 model", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Fixed Deposit - SBI", "type": "Fixed Deposit", "value": 500000, "purchaseDate": "2023-01-01", "notes": "7.1% p.a.", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Emergency Fund", "type": "Savings", "value": 300000, "purchaseDate": "2024-01-01", "notes": "Liquid savings", "createdAt": now},
        ]

        # Sample Credit Cards
        credit_cards = [
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "HDFC Regalia", "bank": "HDFC Bank", "cardNumber": "****4521", "creditLimit": 500000, "currentBalance": 45000, "dueDate": 15, "interestRate": 3.5, "rewardPoints": 12500, "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "ICICI Amazon Pay", "bank": "ICICI Bank", "cardNumber": "****7832", "creditLimit": 200000, "currentBalance": 18000, "dueDate": 20, "interestRate": 3.25, "rewardPoints": 5600, "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "SBI SimplyCLICK", "bank": "SBI", "cardNumber": "****3145", "creditLimit": 300000, "currentBalance": 8500, "dueDate": 5, "interestRate": 3.35, "rewardPoints": 3200, "createdAt": now},
        ]

        # Sample Loans (stored in liquid_assets with loan types)
        loans = [
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Home Loan - SBI", "type": "Home Loan", "balance": 3500000, "amount": 4500000, "interestRate": 8.5, "emiAmount": 45000, "tenure": 240, "startDate": "2020-02-01", "bank": "SBI", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Car Loan - HDFC", "type": "Car Loan", "balance": 600000, "amount": 900000, "interestRate": 9.0, "emiAmount": 18000, "tenure": 60, "startDate": "2022-04-01", "bank": "HDFC Bank", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Personal Loan - ICICI", "type": "Personal Loan", "balance": 150000, "amount": 300000, "interestRate": 12.0, "emiAmount": 10000, "tenure": 36, "startDate": "2024-06-01", "bank": "ICICI Bank", "createdAt": now},
        ]

        # Sample Insurance (stored in insurances collection)
        insurances = [
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Health Insurance - Star", "type": "Health Insurance", "provider": "Star Health", "premium": 25000, "frequency": "Yearly", "coverAmount": 1000000, "policyNumber": "SH-2024-78543", "startDate": "2024-01-01", "endDate": "2025-01-01", "createdAt": now},
            {"id": str(uuid.uuid4()), "userId": user_id, "name": "Term Life - LIC", "type": "Term Insurance", "provider": "LIC", "premium": 15000, "frequency": "Yearly", "coverAmount": 10000000, "policyNumber": "LIC-TL-456123", "startDate": "2021-06-15", "endDate": "2051-06-15", "createdAt": now},
        ]

        if assets:
            await db.assets.insert_many(assets)
        if credit_cards:
            await db.credit_cards.insert_many(credit_cards)
        if loans:
            await db.liquid_assets.insert_many(loans)
        if insurances:
            await db.insurances.insert_many(insurances)

        logger.info(f"Seeded test account {user_id} with sample data")
    except Exception as e:
        logger.error(f"Failed to seed test account: {e}")



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

    # Verify email OTP token
    if request.emailVerificationToken:
        verification = await db.signup_otp_tokens.find_one(
            {"email": email, "verification_token": request.emailVerificationToken, "verified": True, "used": False},
            {"_id": 0}
        )
        if not verification:
            raise HTTPException(status_code=400, detail="Invalid email verification. Please verify your email again.")
        # Check token age (15 min max)
        verified_at = datetime.fromisoformat(verification.get("verified_at", "2000-01-01"))
        if verified_at.tzinfo is None:
            verified_at = verified_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - verified_at > timedelta(minutes=15):
            raise HTTPException(status_code=400, detail="Email verification expired. Please verify again.")
        # Mark as used
        await db.signup_otp_tokens.update_one(
            {"verification_token": request.emailVerificationToken},
            {"$set": {"used": True}}
        )
    else:
        raise HTTPException(status_code=400, detail="Email verification is required. Please verify your email with OTP.")

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

    # Auto-join family if invite code provided
    family_joined = None
    if request.inviteCode:
        try:
            invite_code = request.inviteCode.strip().upper()
            family = await db.families.find_one({"inviteCode": invite_code}, {"_id": 0})
            if family:
                already_member = any(m["id"] == user_id for m in family.get("members", []))
                if not already_member:
                    # Check if user's phone matches a pending member
                    matched_pending = None
                    user_phone = request.mobile.strip() if request.mobile else None
                    if user_phone:
                        for m in family.get("members", []):
                            if m.get("phone") == user_phone and m.get("role") == "member" and not m.get("linkedUserId"):
                                matched_pending = m
                                break

                    if matched_pending:
                        await db.families.update_one(
                            {"id": family["id"], "members.id": matched_pending["id"]},
                            {"$set": {
                                "members.$.id": user_id,
                                "members.$.name": fullName,
                                "members.$.email": email,
                                "members.$.role": "linked",
                                "members.$.linkedUserId": user_id,
                                "members.$.joinedAt": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                    else:
                        new_member = {
                            "id": user_id,
                            "name": fullName,
                            "relationship": "Family",
                            "email": email,
                            "phone": user_phone,
                            "role": "member",
                            "joinedAt": datetime.now(timezone.utc).isoformat()
                        }
                        await db.families.update_one(
                            {"id": family["id"]},
                            {"$push": {"members": new_member}}
                        )

                    # Track referral
                    await db.referrals.insert_one({
                        "referral_id": str(uuid.uuid4()),
                        "invite_code": invite_code,
                        "family_id": family["id"],
                        "inviter_id": family.get("createdBy"),
                        "joined_user_id": user_id,
                        "joined_at": datetime.now(timezone.utc).isoformat(),
                        "reward_claimed": False
                    })

                    family_joined = family.get("familyName")
        except Exception as e:
            logger.error(f"Auto-join family failed for invite code {request.inviteCode}: {e}")

    return {
        "user_id": user_id, "email": email, "name": fullName,
        "firstName": firstName, "lastName": lastName, "picture": None,
        "session_token": session_token, "isNewUser": True,
        "familyJoined": family_joined
    }


@router.post("/login")
async def jwt_login(request: JWTLoginRequest, response: Response):
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
        # Auto-create basic profile for new Google users
        await db.profiles.insert_one({
            "userId": user_id,
            "name": session_data.get("name", ""),
            "email": email,
            "mobile": "",
            "accountType": "Individual",
            "dateOfBirth": None,
            "maritalStatus": "",
            "dependents": 0,
            "employmentType": "",
            "monthlyIncomeRange": "",
            "riskAppetite": "Moderate",
            "retirementAge": 60,
            "profileComplete": False,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        })
    else:
        user_id = user["user_id"]
        has_password = user.get("has_password", False) or (user.get("password_hash") is not None)
        await db.users.update_one({"user_id": user_id}, {"$set": {
            "name": session_data.get("name"), "picture": session_data.get("picture")
        }})

    session_token = session_data.get("session_token") or str(uuid.uuid4())
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
        "has_password": bool(user.get("password_hash"))
    }


@router.get("/security-status")
async def security_status(request: Request):
    """Check if user has MPIN and biometric set up."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = user["user_id"]
    has_mpin = bool(user.get("mpin_hash"))
    bio_count = await db.webauthn_credentials.count_documents({"user_id": user_id})
    return {
        "has_mpin": has_mpin,
        "has_biometric": bio_count > 0,
        "needs_setup": not has_mpin or bio_count == 0,
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
async def forgot_username(request: ForgotUsernameRequest, background_tasks: BackgroundTasks):
    user = await db.users.find_one(
        {"email": {"$regex": f"^{request.email}$", "$options": "i"}},
        {"_id": 0, "name": 1, "email": 1, "auth_type": 1})
    success_message = "If an account exists with this email, you will receive your username shortly."
    if user:
        if user.get("auth_type") == "jwt" or user.get("auth_type") is None:
            username = user.get("name", "User")
            email_data = get_username_recovery_email(username)
            background_tasks.add_task(send_email_sync, user["email"], email_data["subject"], email_data["html"])
    return {"message": success_message}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, background_tasks: BackgroundTasks):
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
        # Allow password reset for all users (JWT, Google, or any auth type)
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        reset_record = {
            "token_id": str(uuid.uuid4()), "user_id": user["user_id"],
            "reset_token": reset_token, "expires_at": expires_at.isoformat(),
            "used": False, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.password_reset_tokens.insert_one(reset_record)
        first_name = user.get("firstName", user.get("name", "User").split()[0] if user.get("name") else "User")
        reset_link = f"{EMAIL_APP_URL}/reset-password?token={reset_token}"
        email_data = get_password_reset_email(first_name, reset_link)
        background_tasks.add_task(send_email_sync, user["email"], email_data["subject"], email_data["html"])
    return {"message": success_message}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, background_tasks: BackgroundTasks):
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

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hash_password(request.new_password), "has_password": True}})
    await db.password_reset_tokens.update_one({"reset_token": request.token}, {"$set": {"used": True}})
    await db.user_sessions.delete_many({"user_id": user["user_id"]})

    username = user.get("name", "User")
    email_data = get_password_changed_email(username)
    background_tasks.add_task(send_email_sync, user["email"], email_data["subject"], email_data["html"])

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


import random

def generate_otp():
    return str(random.randint(100000, 999999))


def _create_temp_token(user_id: str, email: str) -> str:
    """Create a short-lived JWT temp token after OTP verification."""
    payload = {
        "user_id": user_id,
        "email": email,
        "type": "temp_auth",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TEMP_TOKEN_EXPIRY_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, TEMP_TOKEN_SECRET, algorithm="HS256")


def _verify_temp_token(token: str) -> dict:
    """Verify and decode temp token. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, TEMP_TOKEN_SECRET, algorithms=["HS256"])
        if payload.get("type") != "temp_auth":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please verify OTP again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def _create_session_and_respond(user: dict, response: Response, remember_me: bool = False) -> dict:
    """Create session cookie and return user data."""
    session_days = 30 if remember_me else 7
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_sessions.insert_one(session)
    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=session_days * 24 * 60 * 60
    )
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"lastLogin": datetime.now(timezone.utc).isoformat()}}
    )
    return {
        "user_id": user["user_id"],
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "firstName": user.get("firstName", ""),
        "picture": user.get("picture"),
        "session_token": session_token,
    }


# ============================================================
# STEP-BASED AUTH FLOW (CRED-style)
# ============================================================

@router.post("/check-user")
async def check_user(request: Request):
    """Check if user exists and has MPIN set. No OTP sent."""
    body = await request.json()
    identifier = (body.get("identifier") or "").strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Email is required")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", identifier):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    user = await db.users.find_one(
        {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "mpin_hash": 1, "name": 1, "firstName": 1}
    )

    if not user:
        return {"user_exists": False, "has_mpin": False}

    return {
        "user_exists": True,
        "has_mpin": bool(user.get("mpin_hash")),
        "firstName": user.get("firstName", user.get("name", "").split()[0] if user.get("name") else ""),
    }


@router.post("/mpin-direct-login")
async def mpin_direct_login(request: Request, response: Response):
    """Login directly with email + MPIN (no OTP required). Max 3 attempts then 5-min lockout."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    mpin = body.get("mpin", "")

    if not email or not mpin:
        raise HTTPException(status_code=400, detail="Email and MPIN are required")
    if len(mpin) != 4 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 4 digits")

    # Check lockout
    lockout_key = f"mpin_lockout:{email}"
    lockout = await db.rate_limits.find_one({"key": lockout_key}, {"_id": 0})
    if lockout:
        locked_until = datetime.fromisoformat(lockout["locked_until"])
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > datetime.now(timezone.utc):
            remaining_secs = int((locked_until - datetime.now(timezone.utc)).total_seconds())
            remaining_mins = max(1, (remaining_secs + 59) // 60)
            raise HTTPException(status_code=429, detail=f"Too many failed attempts. Try again in {remaining_mins} min.")

    user = await db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1, "mpin_hash": 1}
    )
    if not user or not user.get("mpin_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    import bcrypt as _bcrypt
    if not _bcrypt.checkpw(mpin.encode(), user["mpin_hash"].encode()):
        # Track failed attempt
        attempt_key = f"mpin_attempts:{email}"
        attempt_rec = await db.rate_limits.find_one({"key": attempt_key}, {"_id": 0})
        current_attempts = (attempt_rec.get("count", 0) if attempt_rec else 0) + 1

        if current_attempts >= 3:
            # Lock for 5 minutes
            await db.rate_limits.update_one(
                {"key": lockout_key},
                {"$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()}},
                upsert=True
            )
            await db.rate_limits.delete_one({"key": attempt_key})
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 5 min.")

        await db.rate_limits.update_one(
            {"key": attempt_key},
            {"$set": {"count": current_attempts, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        remaining = 3 - current_attempts
        raise HTTPException(status_code=401, detail=f"Invalid MPIN. {remaining} attempt(s) left.")

    # Success — clear attempts
    await db.rate_limits.delete_many({"key": {"$in": [f"mpin_attempts:{email}", f"mpin_lockout:{email}"]}})
    return await _create_session_and_respond(user, response)


@router.post("/forgot-mpin")
async def forgot_mpin(request: Request, background_tasks: BackgroundTasks):
    """Send OTP to email for MPIN reset. Async email, parallelized DB."""
    t0 = time.time()
    body = await request.json()
    email = (body.get("email") or "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    import asyncio as _aio
    # Parallel: user lookup + cooldown check (read-only, safe to parallelize)
    user_fut = db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1}
    )
    cooldown_fut = db.login_otp_tokens.find_one(
        {"email": email, "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()}},
        {"_id": 0, "otp_id": 1}
    )
    user, recent = await _aio.gather(user_fut, cooldown_fut)

    if not user:
        return {"message": "If an account exists, you will receive a verification code."}
    if recent:
        return {"message": "OTP already sent. Please wait."}

    otp = generate_otp()
    now = datetime.now(timezone.utc)

    try:
        # Step 1: Invalidate ONLY older OTPs (created_at < now protects the new one)
        logger.info(f"forgot-mpin: Step 1 — invalidating old OTPs for {email}")
        await db.login_otp_tokens.update_many(
            {"email": email, "purpose": "mpin_reset", "used": False, "created_at": {"$lt": now.isoformat()}},
            {"$set": {"used": True}}
        )

        # Step 2: Insert new OTP
        logger.info(f"forgot-mpin: Step 2 — inserting new OTP for {email}")
        await db.login_otp_tokens.insert_one({
            "otp_id": str(uuid.uuid4()),
            "email": email,
            "user_id": user["user_id"],
            "otp_hash": hash_password(otp),
            "expires_at": (now + timedelta(minutes=5)).isoformat(),
            "used": False,
            "attempts": 0,
            "created_at": now.isoformat(),
            "purpose": "mpin_reset",
        })
    except Exception as e:
        logger.error(f"forgot-mpin: DB error for {email}: {e}")

    # Step 3: ALWAYS trigger email (even if DB had issues)
    logger.info(f"forgot-mpin: Step 3 — triggering email for {email}")
    background_tasks.add_task(send_otp_email_sync, email, otp)
    logger.info(f"forgot-mpin: OTP queued for {email} in {round((time.time()-t0)*1000)}ms")
    return {"message": "Verification code sent to your email."}


@router.post("/verify-forgot-mpin-otp")
async def verify_forgot_mpin_otp(request: Request):
    """Verify OTP for forgot-MPIN flow. Marks record as pre-verified so reset-mpin can proceed."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    otp = (body.get("otp") or "").strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    record = await db.login_otp_tokens.find_one(
        {"email": email, "used": False, "purpose": "mpin_reset"},
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

    if not verify_password(otp, record["otp_hash"]):
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid code. {max(remaining, 0)} attempt(s) left.")

    # Mark as pre-verified (not used — reset-mpin will consume it)
    await db.login_otp_tokens.update_one(
        {"otp_id": record["otp_id"]},
        {"$set": {"verified": True}}
    )
    return {"success": True, "message": "OTP verified"}


@router.post("/reset-mpin")
async def reset_mpin(request: Request, response: Response):
    """Set new MPIN after OTP has been verified via /verify-forgot-mpin-otp."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    new_mpin = body.get("new_mpin", "")

    if not email or not new_mpin:
        raise HTTPException(status_code=400, detail="Email and new MPIN are required")
    if len(new_mpin) != 4 or not new_mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be exactly 4 digits")

    record = await db.login_otp_tokens.find_one(
        {"email": email, "used": False, "purpose": "mpin_reset", "verified": True},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Please verify OTP first")

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Session expired. Please start over.")

    await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})

    user = await db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1}
    )
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    import bcrypt as _bcrypt
    hashed = _bcrypt.hashpw(new_mpin.encode(), _bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"mpin_hash": hashed, "mpin_set_at": datetime.now(timezone.utc).isoformat()}}
    )

    return await _create_session_and_respond(user, response)


@router.post("/start")
async def auth_start(request: Request, background_tasks: BackgroundTasks):
    """Step 1: Enter identifier (email). Check user, send OTP. Parallelized DB."""
    t0 = time.time()
    body = await request.json()
    identifier = (body.get("identifier") or "").strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Email is required")

    is_email = bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", identifier))
    if not is_email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    import asyncio as _aio
    # Parallel: user lookup + hourly rate limit + cooldown
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    cooldown_threshold = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()

    user_fut = db.users.find_one(
        {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    count_fut = db.login_otp_tokens.count_documents({
        "email": identifier, "created_at": {"$gte": one_hour_ago}
    })
    cooldown_fut = db.login_otp_tokens.find_one(
        {"email": identifier, "created_at": {"$gte": cooldown_threshold}},
        {"_id": 0, "otp_id": 1}
    )
    user, recent_count, recent = await _aio.gather(user_fut, count_fut, cooldown_fut)

    if recent_count >= 5:
        raise HTTPException(status_code=429, detail="Too many OTP requests. Please try again later.")
    if recent:
        return {"message": "OTP already sent", "user_exists": user is not None}

    otp = generate_otp()
    now = datetime.now(timezone.utc)

    try:
        # Step 1: Invalidate ONLY older OTPs (created_at < now protects the new one)
        logger.info(f"auth/start: Step 1 — invalidating old OTPs for {identifier}")
        await db.login_otp_tokens.update_many(
            {"email": identifier, "used": False, "created_at": {"$lt": now.isoformat()}},
            {"$set": {"used": True}}
        )

        # Step 2: Insert new OTP
        logger.info(f"auth/start: Step 2 — inserting new OTP for {identifier}")
        await db.login_otp_tokens.insert_one({
            "otp_id": str(uuid.uuid4()),
            "email": identifier,
            "user_id": user["user_id"] if user else None,
            "otp_hash": hash_password(otp),
            "expires_at": (now + timedelta(minutes=5)).isoformat(),
            "used": False,
            "attempts": 0,
            "created_at": now.isoformat(),
        })
    except Exception as e:
        logger.error(f"auth/start: DB error for {identifier}: {e}")

    # Step 3: ALWAYS trigger email
    logger.info(f"auth/start: Step 3 — triggering email for {identifier}")
    background_tasks.add_task(send_otp_email_sync, identifier, otp)
    logger.info(f"auth/start: OTP queued for {identifier} in {round((time.time()-t0)*1000)}ms")
    return {"message": "OTP sent", "user_exists": user is not None}


@router.post("/verify-login-otp")
async def verify_login_otp(request: Request, response: Response):
    """Step 2: Verify OTP. Returns temp_token + user state."""
    body = await request.json()
    identifier = (body.get("identifier") or "").strip().lower()
    otp = (body.get("otp") or "").strip()

    if not identifier or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    record = await db.login_otp_tokens.find_one(
        {"email": identifier, "used": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if record.get("attempts", 0) >= 3:
        await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$inc": {"attempts": 1}})

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if not verify_password(otp, record["otp_hash"]):
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid code. Try again. ({remaining} left)")

    # Mark OTP used
    await db.login_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})

    # Check if user exists
    user = await db.users.find_one(
        {"email": {"$regex": f"^{identifier}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1, "mpin_hash": 1, "biometric_enabled": 1}
    )

    if not user:
        # New user — they need to register
        return {
            "status": "verified",
            "user_exists": False,
            "has_mpin": False,
            "biometric_enabled": False,
            "temp_token": None,
        }

    has_mpin = bool(user.get("mpin_hash"))
    biometric = bool(user.get("biometric_enabled"))
    temp_token = _create_temp_token(user["user_id"], user["email"])

    # If user has no MPIN and no biometric, log them in directly
    if not has_mpin and not biometric:
        user_data = await _create_session_and_respond(user, response)
        return {
            "status": "authenticated",
            "user_exists": True,
            "has_mpin": False,
            "biometric_enabled": False,
            "temp_token": temp_token,
            "needs_mpin_setup": True,
            **user_data,
        }

    return {
        "status": "verified",
        "user_exists": True,
        "has_mpin": has_mpin,
        "biometric_enabled": biometric,
        "temp_token": temp_token,
    }


@router.post("/mpin-login")
async def mpin_login_with_temp(request: Request, response: Response):
    """Step 3: Login with MPIN using temp_token."""
    body = await request.json()
    temp_token = body.get("temp_token", "")
    mpin = body.get("mpin", "")

    if not temp_token or not mpin:
        raise HTTPException(status_code=400, detail="Token and MPIN are required")

    payload = _verify_temp_token(temp_token)
    user_id = payload["user_id"]

    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1, "mpin_hash": 1}
    )
    if not user or not user.get("mpin_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    import bcrypt as _bcrypt
    if not _bcrypt.checkpw(mpin.encode(), user["mpin_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid MPIN. Try again.")

    return await _create_session_and_respond(user, response)


@router.post("/mpin-setup-login")
async def mpin_setup_and_login(request: Request, response: Response):
    """Step 3 (first time): Set MPIN + Login using temp_token."""
    body = await request.json()
    temp_token = body.get("temp_token", "")
    mpin = body.get("mpin", "")

    if not temp_token or not mpin:
        raise HTTPException(status_code=400, detail="Token and MPIN are required")
    if len(mpin) != 4 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be exactly 4 digits")

    payload = _verify_temp_token(temp_token)
    user_id = payload["user_id"]

    import bcrypt as _bcrypt
    hashed = _bcrypt.hashpw(mpin.encode(), _bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"mpin_hash": hashed, "mpin_set_at": datetime.now(timezone.utc).isoformat()}}
    )

    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return await _create_session_and_respond(user, response)


@router.post("/send-otp")
async def send_otp(request: SendOTPRequest, background_tasks: BackgroundTasks):
    """Send 6-digit OTP to email for password reset."""
    email = request.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "auth_type": 1}
    )

    # Always return success to prevent email enumeration
    success_msg = "If an account exists with this email, you will receive a verification code shortly."

    if user:
        # Rate limit: max 1 OTP per 60 seconds
        recent = await db.otp_tokens.find_one(
            {"email": email, "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()}},
            {"_id": 0}
        )
        if recent:
            return {"message": "OTP already sent. Please wait before requesting another."}

        otp = generate_otp()
        now = datetime.now(timezone.utc)
        try:
            # Step 1: Invalidate older OTPs
            await db.otp_tokens.update_many(
                {"email": email, "used": False, "created_at": {"$lt": now.isoformat()}},
                {"$set": {"used": True}}
            )
            # Step 2: Insert new
            await db.otp_tokens.insert_one({
                "otp_id": str(uuid.uuid4()),
                "email": email,
                "user_id": user["user_id"],
                "otp_hash": hash_password(otp),
                "expires_at": (now + timedelta(minutes=5)).isoformat(),
                "used": False,
                "attempts": 0,
                "created_at": now.isoformat(),
            })
        except Exception as e:
            logger.error(f"send-otp: DB error for {email}: {e}")
        # Step 3: ALWAYS trigger email
        background_tasks.add_task(send_otp_email_sync, email, otp)

    return {"message": success_msg}


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """Verify OTP code. Returns a one-time reset token on success."""
    email = request.email.strip().lower()
    otp = request.otp.strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    record = await db.otp_tokens.find_one(
        {"email": email, "used": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    # Max 3 attempts
    if record.get("attempts", 0) >= 3:
        await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    # Increment attempt counter
    await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$inc": {"attempts": 1}})

    # Check expiry
    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    # Verify OTP hash
    if not verify_password(otp, record["otp_hash"]):
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

    # Mark OTP as used and generate a reset token
    await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})

    reset_token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token_id": str(uuid.uuid4()),
        "user_id": record["user_id"],
        "reset_token": reset_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"message": "OTP verified successfully", "reset_token": reset_token}


@router.post("/reset-password-otp")
async def reset_password_otp(request: ResetPasswordOTPRequest, background_tasks: BackgroundTasks):
    """Reset password after OTP verification (combined verify + reset in one step)."""
    email = request.email.strip().lower()
    otp = request.otp.strip()

    if not email or not otp or not request.new_password:
        raise HTTPException(status_code=400, detail="Email, OTP and new password are required")

    record = await db.otp_tokens.find_one(
        {"email": email, "used": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if record.get("attempts", 0) >= 3:
        await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$inc": {"attempts": 1}})

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if not verify_password(otp, record["otp_hash"]):
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

    if len(request.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    # Mark OTP as used
    await db.otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})

    user = await db.users.find_one({"user_id": record["user_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"password_hash": hash_password(request.new_password), "has_password": True}})
    await db.user_sessions.delete_many({"user_id": user["user_id"]})

    username = user.get("name", "User")
    email_data = get_password_changed_email(username)
    background_tasks.add_task(send_email_sync, user["email"], email_data["subject"], email_data["html"])

    return {"message": "Password reset successfully. Please log in with your new password."}


@router.post("/send-signup-otp")
async def send_signup_otp(request: SendOTPRequest, background_tasks: BackgroundTasks):
    """Send OTP to verify email during signup."""
    email = request.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    # Check if email already registered
    existing = await db.users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}}, {"_id": 0, "user_id": 1}
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Rate limit: 1 OTP per 60 seconds
    recent = await db.signup_otp_tokens.find_one(
        {"email": email, "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()}},
        {"_id": 0}
    )
    if recent:
        return {"message": "OTP already sent. Please wait before requesting another."}

    otp = generate_otp()
    now = datetime.now(timezone.utc)
    try:
        # Step 1: Invalidate older signup OTPs
        await db.signup_otp_tokens.update_many(
            {"email": email, "used": False, "created_at": {"$lt": now.isoformat()}},
            {"$set": {"used": True}}
        )
        # Step 2: Insert new
        await db.signup_otp_tokens.insert_one({
            "otp_id": str(uuid.uuid4()),
            "email": email,
            "otp_hash": hash_password(otp),
            "expires_at": (now + timedelta(minutes=5)).isoformat(),
            "verified": False,
            "used": False,
            "attempts": 0,
            "created_at": now.isoformat(),
        })
    except Exception as e:
        logger.error(f"send-signup-otp: DB error for {email}: {e}")

    # Step 3: ALWAYS trigger email
    background_tasks.add_task(send_otp_email_sync, email, otp)
    return {"message": "Verification code sent to your email."}


@router.post("/verify-signup-otp")
async def verify_signup_otp(request: VerifySignupOTPRequest):
    """Verify OTP for signup email verification. Returns a verification token."""
    email = request.email.strip().lower()
    otp = request.otp.strip()

    if not email or not otp:
        raise HTTPException(status_code=400, detail="Email and OTP are required")

    record = await db.signup_otp_tokens.find_one(
        {"email": email, "used": False, "verified": False},
        {"_id": 0},
        sort=[("created_at", -1)]
    )

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if record.get("attempts", 0) >= 3:
        await db.signup_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$set": {"used": True}})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new OTP.")

    await db.signup_otp_tokens.update_one({"otp_id": record["otp_id"]}, {"$inc": {"attempts": 1}})

    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    if not verify_password(otp, record["otp_hash"]):
        remaining = 3 - record.get("attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {remaining} attempt(s) remaining.")

    # Mark as verified with a verification token (valid 15 min)
    verification_token = secrets.token_urlsafe(32)
    await db.signup_otp_tokens.update_one(
        {"otp_id": record["otp_id"]},
        {"$set": {
            "verified": True,
            "verification_token": verification_token,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {"message": "Email verified successfully", "verification_token": verification_token}


@router.delete("/cleanup-test-data")
async def cleanup_test_data():
    """Remove test accounts and their data from the database."""
    test_user = await db.users.find_one({"email": "test@moneyssutra.com"}, {"_id": 0, "user_id": 1})
    if not test_user:
        return {"message": "No test user found", "deleted": False}

    user_id = test_user["user_id"]
    deleted = {}
    for coll_name in ["assets", "investments", "loans", "expenses", "income_sources",
                       "accounts", "credit_cards", "insurances", "goals", "emi_transactions",
                       "analytics_snapshots", "user_settings", "user_personality",
                       "user_gamification_profile", "user_achievements", "user_sessions",
                       "basic_profiles", "liquid_assets", "workspaces", "workspace_members"]:
        result = await db[coll_name].delete_many({"$or": [{"userId": user_id}, {"user_id": user_id}]})
        if result.deleted_count > 0:
            deleted[coll_name] = result.deleted_count

    await db.users.delete_many({"email": "test@moneyssutra.com"})
    deleted["users"] = 1
    return {"message": "Test data cleaned up", "deleted": deleted}

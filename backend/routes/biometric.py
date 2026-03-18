"""Biometric (WebAuthn/Passkey) Authentication — Register and login with fingerprint/face."""
import base64
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Response
import uuid
import logging

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    ResidentKeyRequirement,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from database import db
from routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/biometric")


def _get_rp_id(request: Request) -> str:
    """Extract RP ID — the domain the browser actually sees."""
    # x-forwarded-host is the real external domain behind proxy
    forwarded = request.headers.get("x-forwarded-host", "")
    if forwarded:
        return forwarded.split(":")[0].split(",")[0].strip()
    host = request.headers.get("host", "localhost")
    return host.split(":")[0]


def _get_origin(request: Request) -> str:
    """Build origin — must match what the browser sees."""
    proto = request.headers.get("x-forwarded-proto", "https")
    forwarded = request.headers.get("x-forwarded-host", "")
    if forwarded:
        host = forwarded.split(",")[0].strip()
        return f"{proto}://{host}"
    host = request.headers.get("host", "localhost")
    return f"{proto}://{host}"


@router.get("/debug-headers")
async def debug_headers(request: Request):
    """Debug: show what headers the backend sees (for RP ID debugging)."""
    return {
        "rp_id": _get_rp_id(request),
        "origin": _get_origin(request),
        "host": request.headers.get("host"),
        "x-forwarded-host": request.headers.get("x-forwarded-host"),
        "origin_header": request.headers.get("origin"),
        "referer": request.headers.get("referer"),
    }


RP_NAME = "MoneySutra"


# ──────────────────── Registration Flow ────────────────────

@router.post("/register/options")
async def registration_options(request: Request):
    """Generate WebAuthn registration options for the authenticated user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = user["user_id"]
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 1, "name": 1, "firstName": 1})
    display_name = user_doc.get("name") or user_doc.get("firstName") or user_doc.get("email", "User")

    # Get existing credentials to exclude
    existing_creds = await db.webauthn_credentials.find(
        {"user_id": user_id}, {"_id": 0, "credential_id": 1}
    ).to_list(length=50)

    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=base64.urlsafe_b64decode(c["credential_id"] + "=="))
        for c in existing_creds
    ]

    rp_id = _get_rp_id(request)

    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=RP_NAME,
        user_id=user_id.encode(),
        user_name=user_doc.get("email", user_id),
        user_display_name=display_name,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
        exclude_credentials=exclude_credentials,
    )

    # Store challenge in DB for verification
    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode().rstrip("=")
    await db.webauthn_challenges.update_one(
        {"user_id": user_id, "type": "registration"},
        {"$set": {
            "challenge": challenge_b64,
            "rp_id": rp_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {"options": options_to_json(options)}


@router.post("/register/verify")
async def registration_verify(request: Request):
    """Verify WebAuthn registration response and store credential."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    body = await request.json()
    credential = body.get("credential")
    if not credential:
        raise HTTPException(status_code=400, detail="Missing credential data")

    user_id = user["user_id"]
    rp_id = _get_rp_id(request)
    origin = _get_origin(request)

    # Retrieve stored challenge
    challenge_doc = await db.webauthn_challenges.find_one(
        {"user_id": user_id, "type": "registration"}, {"_id": 0}
    )
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No registration challenge found")

    challenge_b64 = challenge_doc["challenge"]
    # Restore padding
    challenge_bytes = base64.urlsafe_b64decode(challenge_b64 + "=" * (4 - len(challenge_b64) % 4))

    try:
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge_bytes,
            expected_origin=origin,
            expected_rp_id=rp_id,
        )
    except Exception as e:
        logger.error(f"WebAuthn registration verification failed: {e}, origin={origin}, rp_id={rp_id}")
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")

    # Store the credential
    cred_id_b64 = base64.urlsafe_b64encode(verification.credential_id).decode().rstrip("=")
    pub_key_b64 = base64.urlsafe_b64encode(verification.credential_public_key).decode().rstrip("=")

    credential_data = {
        "user_id": user_id,
        "credential_id": cred_id_b64,
        "public_key": pub_key_b64,
        "sign_count": verification.sign_count,
        "device_name": body.get("device_name", "Unknown Device"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.webauthn_credentials.insert_one(credential_data)

    # Clean up challenge
    await db.webauthn_challenges.delete_one({"user_id": user_id, "type": "registration"})

    return {"success": True, "message": "Biometric registered successfully"}


# ──────────────────── Authentication Flow ────────────────────

@router.post("/login/options")
async def authentication_options(request: Request):
    """Generate WebAuthn authentication options for a given email."""
    body = await request.json()
    email = (body.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    user = await db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id = user["user_id"]
    creds = await db.webauthn_credentials.find(
        {"user_id": user_id}, {"_id": 0, "credential_id": 1}
    ).to_list(length=50)

    if not creds:
        raise HTTPException(status_code=404, detail="No biometric credentials registered")

    allow_credentials = [
        PublicKeyCredentialDescriptor(id=base64.urlsafe_b64decode(c["credential_id"] + "=="))
        for c in creds
    ]

    rp_id = _get_rp_id(request)

    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.REQUIRED,
    )

    challenge_b64 = base64.urlsafe_b64encode(options.challenge).decode().rstrip("=")
    await db.webauthn_challenges.update_one(
        {"user_id": user_id, "type": "authentication"},
        {"$set": {
            "challenge": challenge_b64,
            "rp_id": rp_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return {"options": options_to_json(options), "user_id": user_id}


@router.post("/login/verify")
async def authentication_verify(request: Request, response: Response):
    """Verify WebAuthn authentication response and create session."""
    body = await request.json()
    credential = body.get("credential")
    email = (body.get("email") or "").strip().lower()

    if not credential or not email:
        raise HTTPException(status_code=400, detail="Missing credential or email")

    user = await db.users.find_one(
        {"email": email},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "firstName": 1, "picture": 1}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    user_id = user["user_id"]
    rp_id = _get_rp_id(request)
    origin = _get_origin(request)

    # Find the matching credential
    cred_id_from_client = credential.get("id", "")
    stored_cred = await db.webauthn_credentials.find_one(
        {"user_id": user_id, "credential_id": cred_id_from_client},
        {"_id": 0}
    )

    if not stored_cred:
        # Try without padding differences
        all_creds = await db.webauthn_credentials.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(length=50)
        for c in all_creds:
            if c["credential_id"].rstrip("=") == cred_id_from_client.rstrip("="):
                stored_cred = c
                break

    if not stored_cred:
        raise HTTPException(status_code=401, detail="Credential not recognized")

    # Retrieve stored challenge
    challenge_doc = await db.webauthn_challenges.find_one(
        {"user_id": user_id, "type": "authentication"}, {"_id": 0}
    )
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No authentication challenge found")

    challenge_b64 = challenge_doc["challenge"]
    challenge_bytes = base64.urlsafe_b64decode(challenge_b64 + "=" * (4 - len(challenge_b64) % 4))

    pub_key_b64 = stored_cred["public_key"]
    pub_key_bytes = base64.urlsafe_b64decode(pub_key_b64 + "=" * (4 - len(pub_key_b64) % 4))

    try:
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge_bytes,
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=pub_key_bytes,
            credential_current_sign_count=stored_cred.get("sign_count", 0),
        )
    except Exception as e:
        logger.error(f"WebAuthn authentication verification failed: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

    # Update sign count
    await db.webauthn_credentials.update_one(
        {"user_id": user_id, "credential_id": stored_cred["credential_id"]},
        {"$set": {"sign_count": verification.new_sign_count}}
    )

    # Clean up challenge
    await db.webauthn_challenges.delete_one({"user_id": user_id, "type": "authentication"})

    # Create session
    remember_me = body.get("remember_me", False)
    session_days = 30 if remember_me else 7
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=session_days)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_sessions.insert_one(session)
    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=session_days*24*60*60
    )

    await db.users.update_one(
        {"user_id": user_id},
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


# ──────────────────── Management ────────────────────

@router.get("/status")
async def biometric_status(request: Request):
    """Check if the authenticated user has biometric credentials registered."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    creds = await db.webauthn_credentials.find(
        {"user_id": user["user_id"]}, {"_id": 0, "credential_id": 1, "device_name": 1, "created_at": 1}
    ).to_list(length=50)

    return {
        "has_biometric": len(creds) > 0,
        "credentials": [{"device_name": c.get("device_name", "Unknown"), "created_at": c.get("created_at")} for c in creds],
    }


@router.delete("/remove")
async def remove_biometric(request: Request):
    """Remove all biometric credentials for the authenticated user."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = await db.webauthn_credentials.delete_many({"user_id": user["user_id"]})
    await db.webauthn_challenges.delete_many({"user_id": user["user_id"]})

    return {"success": True, "removed": result.deleted_count}

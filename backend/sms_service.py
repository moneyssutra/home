"""
SMS Service Module for Moneyssutra
====================================
Config-driven SMS OTP delivery via Twilio.
Disabled by default (ENABLE_SMS_OTP=false).
Activate only after DLT registration for India compliance.
"""

import os
import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ENABLE_SMS_OTP = os.environ.get("ENABLE_SMS_OTP", "false").lower() == "true"
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")


def is_sms_enabled() -> bool:
    """Check if SMS OTP is enabled and configured."""
    return (
        ENABLE_SMS_OTP
        and bool(TWILIO_ACCOUNT_SID)
        and bool(TWILIO_AUTH_TOKEN)
        and bool(TWILIO_PHONE_NUMBER)
    )


def _get_twilio_client():
    """Lazy-load Twilio client only when actually needed."""
    from twilio.rest import Client
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def _format_otp_body(otp: str) -> str:
    return f"Your MoneySSutra verification code is: {otp}. Valid for 5 minutes. Do not share this code."


async def send_sms_otp(phone: str, otp: str) -> dict:
    """
    Send OTP via Twilio SMS.

    Returns:
        {"success": True, "sid": "..."} on success
        {"success": False, "error": "..."} on failure
    """
    if not is_sms_enabled():
        logger.warning("SMS OTP is disabled. Set ENABLE_SMS_OTP=true with valid Twilio credentials to activate.")
        return {"success": False, "error": "SMS OTP is not enabled"}

    if not phone or not phone.startswith("+"):
        return {"success": False, "error": "Phone must be in E.164 format (e.g. +919876543210)"}

    try:
        client = _get_twilio_client()
        message = await asyncio.to_thread(
            client.messages.create,
            body=_format_otp_body(otp),
            from_=TWILIO_PHONE_NUMBER,
            to=phone,
        )
        logger.info(f"SMS OTP sent to {phone[:6]}*** via Twilio (SID: {message.sid})")
        return {"success": True, "sid": message.sid}
    except Exception as e:
        logger.error(f"Failed to send SMS OTP to {phone[:6]}***: {e}")
        return {"success": False, "error": str(e)}


async def send_otp(identifier: str, otp: str) -> dict:
    """
    Unified OTP dispatcher.
    Routes to Email (Resend) or SMS (Twilio) based on identifier type.

    - Email addresses → email_service.send_otp_email
    - Phone numbers (E.164) → sms_service.send_sms_otp (only if enabled)
    """
    if "@" in identifier:
        from email_service import send_otp_email
        return await send_otp_email(identifier, otp)

    if identifier.startswith("+") and identifier[1:].isdigit():
        if not is_sms_enabled():
            return {"success": False, "error": "SMS OTP is currently disabled. Please use email instead."}
        return await send_sms_otp(identifier, otp)

    return {"success": False, "error": "Invalid identifier. Provide an email or E.164 phone number."}

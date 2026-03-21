"""Notification service for SMS and WhatsApp via Twilio.
Runs in MOCK mode when Twilio credentials are not configured.
"""
import os
import logging

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")
TWILIO_WHATSAPP_NUMBER = os.environ.get("TWILIO_WHATSAPP_NUMBER")

IS_TWILIO_CONFIGURED = bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)

_twilio_client = None

def _get_twilio_client():
    global _twilio_client
    if _twilio_client is None and IS_TWILIO_CONFIGURED:
        try:
            from twilio.rest import Client
            _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except ImportError:
            logger.warning("twilio package not installed. Running in MOCK mode.")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Twilio client: {e}")
            return None
    return _twilio_client


def _format_phone(phone: str) -> str:
    """Ensure phone is in E.164 format for India (+91)."""
    phone = phone.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+"):
        return phone
    if phone.startswith("91") and len(phone) == 12:
        return f"+{phone}"
    if len(phone) == 10:
        return f"+91{phone}"
    return f"+91{phone}"


async def send_sms(phone: str, message: str) -> dict:
    """Send SMS via Twilio. Returns status dict."""
    formatted_phone = _format_phone(phone)

    if not IS_TWILIO_CONFIGURED:
        logger.info(f"[MOCK SMS] To: {formatted_phone} | Message: {message}")
        return {"success": True, "mock": True, "phone": formatted_phone, "channel": "sms"}

    client = _get_twilio_client()
    if not client:
        logger.info(f"[MOCK SMS] To: {formatted_phone} | Message: {message}")
        return {"success": True, "mock": True, "phone": formatted_phone, "channel": "sms"}

    try:
        msg = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=formatted_phone
        )
        logger.info(f"[SMS SENT] To: {formatted_phone} | SID: {msg.sid}")
        return {"success": True, "mock": False, "sid": msg.sid, "phone": formatted_phone, "channel": "sms"}
    except Exception as e:
        logger.error(f"[SMS FAILED] To: {formatted_phone} | Error: {e}")
        return {"success": False, "mock": False, "error": str(e), "phone": formatted_phone, "channel": "sms"}


async def send_whatsapp(phone: str, message: str) -> dict:
    """Send WhatsApp message via Twilio. Returns status dict."""
    formatted_phone = _format_phone(phone)
    whatsapp_from = TWILIO_WHATSAPP_NUMBER or (f"whatsapp:{TWILIO_PHONE_NUMBER}" if TWILIO_PHONE_NUMBER else None)

    if not IS_TWILIO_CONFIGURED or not whatsapp_from:
        logger.info(f"[MOCK WHATSAPP] To: {formatted_phone} | Message: {message}")
        return {"success": True, "mock": True, "phone": formatted_phone, "channel": "whatsapp"}

    client = _get_twilio_client()
    if not client:
        logger.info(f"[MOCK WHATSAPP] To: {formatted_phone} | Message: {message}")
        return {"success": True, "mock": True, "phone": formatted_phone, "channel": "whatsapp"}

    try:
        wa_to = f"whatsapp:{formatted_phone}" if not formatted_phone.startswith("whatsapp:") else formatted_phone
        wa_from = whatsapp_from if whatsapp_from.startswith("whatsapp:") else f"whatsapp:{whatsapp_from}"
        msg = client.messages.create(
            body=message,
            from_=wa_from,
            to=wa_to
        )
        logger.info(f"[WHATSAPP SENT] To: {formatted_phone} | SID: {msg.sid}")
        return {"success": True, "mock": False, "sid": msg.sid, "phone": formatted_phone, "channel": "whatsapp"}
    except Exception as e:
        logger.error(f"[WHATSAPP FAILED] To: {formatted_phone} | Error: {e}")
        return {"success": False, "mock": False, "error": str(e), "phone": formatted_phone, "channel": "whatsapp"}


async def send_family_invite(phone: str, inviter_name: str, family_name: str, invite_code: str, app_url: str) -> dict:
    """Send both SMS and WhatsApp invite to a new family member."""
    message = (
        f"Hi! {inviter_name} has invited you to join '{family_name}' on MoneySutra - "
        f"India's smartest family finance app.\n\n"
        f"Your invite code: {invite_code}\n\n"
        f"Download & join: {app_url}/join/{invite_code}\n\n"
        f"Track income, expenses, investments & goals together!"
    )

    sms_result = await send_sms(phone, message)
    wa_result = await send_whatsapp(phone, message)

    return {
        "sms": sms_result,
        "whatsapp": wa_result,
        "all_mock": sms_result.get("mock", True) and wa_result.get("mock", True)
    }

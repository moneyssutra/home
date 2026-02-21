"""
Push Notification Service
Handles Web Push notifications using VAPID for Moneyssutra.
"""
import os
import json
import logging
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# Load VAPID keys from environment
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_CLAIMS_EMAIL = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:support@moneyssutra.com")

def get_vapid_public_key():
    """Return the VAPID public key for frontend subscription."""
    return VAPID_PUBLIC_KEY

async def send_push_notification(subscription_info: dict, title: str, body: str, 
                                  icon: str = None, url: str = None, tag: str = None):
    """
    Send a push notification to a subscribed user.
    
    Args:
        subscription_info: Dict containing endpoint, keys (p256dh, auth)
        title: Notification title
        body: Notification message body
        icon: Optional icon URL
        url: Optional URL to open on click
        tag: Optional tag for grouping notifications
    
    Returns:
        dict with success status and any error message
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return {"success": False, "error": "VAPID keys not configured"}
    
    try:
        # Prepare notification payload
        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/icon-192x192.png",
            "badge": "/badge-72x72.png",
            "tag": tag or "moneyssutra-notification",
            "data": {
                "url": url or "/"
            }
        }
        
        # Send the push notification
        response = webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL}
        )
        
        logger.info(f"Push notification sent successfully: {title}")
        return {"success": True, "status_code": response.status_code}
        
    except WebPushException as e:
        error_msg = str(e)
        logger.error(f"Push notification failed: {error_msg}")
        
        # Handle subscription expiry
        if e.response and e.response.status_code in [404, 410]:
            return {"success": False, "error": "subscription_expired", "should_remove": True}
        
        return {"success": False, "error": error_msg}
    except Exception as e:
        logger.error(f"Push notification error: {str(e)}")
        return {"success": False, "error": str(e)}

async def send_income_reminder(subscription_info: dict, income_name: str, source_id: str):
    """Send an income reminder push notification."""
    return await send_push_notification(
        subscription_info=subscription_info,
        title=f"Time to record {income_name}",
        body=f"Don't forget to log your {income_name}. Tap to enter today's amount.",
        url=f"/income/record/{source_id}",
        tag=f"income-reminder-{source_id}"
    )

async def send_auto_entry_notification(subscription_info: dict, income_name: str, amount: float, source_id: str):
    """Send notification about auto-recorded income entry."""
    return await send_push_notification(
        subscription_info=subscription_info,
        title="Auto-recorded Income",
        body=f"₹{amount:,.0f} was auto-recorded for {income_name} (24hr fallback).",
        url=f"/income/record/{source_id}",
        tag=f"auto-entry-{source_id}"
    )

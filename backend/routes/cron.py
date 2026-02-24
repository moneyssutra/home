"""Cron job routes - Variable income processing and reminders."""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import os
import logging

from database import db
from routes.utils import create_notification_and_cleanup
from push_service import send_push_notification, send_income_reminder, send_auto_entry_notification

router = APIRouter(prefix="/cron", tags=["Cron Jobs"])
logger = logging.getLogger(__name__)


def calculate_next_due_date(source: dict, current_due) -> Optional[datetime]:
    frequency = source.get("frequency", "Monthly")
    if frequency == "Daily":
        return current_due + timedelta(days=1)
    elif frequency == "Weekly":
        return current_due + timedelta(weeks=1)
    elif frequency == "Monthly":
        next_month = current_due.month + 1
        next_year = current_due.year
        if next_month > 12:
            next_month = 1
            next_year += 1
        from datetime import date
        day = min(current_due.day, 28)
        return date(next_year, next_month, day)
    elif frequency == "Quarterly":
        next_month = current_due.month + 3
        next_year = current_due.year
        while next_month > 12:
            next_month -= 12
            next_year += 1
        from datetime import date
        day = min(current_due.day, 28)
        return date(next_year, next_month, day)
    elif frequency == "Half-Yearly":
        next_month = current_due.month + 6
        next_year = current_due.year
        while next_month > 12:
            next_month -= 12
            next_year += 1
        from datetime import date
        day = min(current_due.day, 28)
        return date(next_year, next_month, day)
    elif frequency == "Yearly":
        from datetime import date
        return date(current_due.year + 1, current_due.month, current_due.day)
    return None


@router.post("/process-variable-income")
async def process_variable_income_fallback(api_key: str = None):
    expected_key = os.environ.get("CRON_API_KEY", "moneyssutra_cron_secret_2026")
    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)
    yesterday_str = yesterday.isoformat()
    processed_count = 0
    notifications_created = 0

    try:
        variable_sources = await db.income_sources.find({
            "incomeType": "variable", "nextDueDate": yesterday_str
        }, {"_id": 0}).to_list(10000)

        for source in variable_sources:
            user_id = source.get("userId")
            source_id = source.get("id")
            income_name = source.get("name", "Unknown Income")

            existing_entry = await db.income_transactions.find_one({
                "userId": user_id, "incomeSourceId": source_id, "recordedDate": yesterday_str
            })

            if not existing_entry:
                fallback_amount = source.get("lastRecordedAmount") or source.get("expectedAmount", 0)
                auto_entry = {
                    "id": str(uuid.uuid4()), "userId": user_id,
                    "incomeSourceId": source_id, "incomeName": income_name,
                    "incomeType": source.get("type"), "amount": fallback_amount,
                    "recordedDate": yesterday_str, "isAutoEntry": True,
                    "notes": "Auto-recorded (24hr fallback)",
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                await db.income_transactions.insert_one(auto_entry)
                processed_count += 1

                action_url = f"/{source.get('type', 'job').lower().replace(' ', '-')}-income/{source_id}"
                notification = {
                    "id": str(uuid.uuid4()), "userId": user_id,
                    "title": "Auto-recorded Income",
                    "message": f"\u20b9{fallback_amount:,.0f} was auto-recorded for {income_name} as you didn't log it within 24 hours.",
                    "type": "auto_entry", "relatedIncomeId": source_id,
                    "relatedIncomeName": income_name, "actionUrl": action_url,
                    "isRead": False, "createdAt": datetime.now(timezone.utc).isoformat()
                }
                await create_notification_and_cleanup(notification)
                notifications_created += 1

                subscriptions = await db.push_subscriptions.find({"userId": user_id}, {"_id": 0}).to_list(100)
                for sub in subscriptions:
                    subscription_info = {"endpoint": sub.get("endpoint"), "keys": sub.get("keys", {})}
                    result = await send_auto_entry_notification(subscription_info, income_name, fallback_amount, source_id)
                    if result.get("should_remove"):
                        await db.push_subscriptions.delete_one({"endpoint": sub.get("endpoint")})

            next_due = calculate_next_due_date(source, yesterday)
            if next_due:
                await db.income_sources.update_one(
                    {"id": source_id}, {"$set": {"nextDueDate": next_due.isoformat()}})

        return {
            "success": True, "processed_entries": processed_count,
            "notifications_created": notifications_created, "processed_date": yesterday_str
        }
    except Exception as e:
        logger.error(f"Error in cron job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-reminder-notifications")
async def send_reminder_notifications(api_key: str = None):
    expected_key = os.environ.get("CRON_API_KEY", "moneyssutra_cron_secret_2026")
    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid API key")

    now = datetime.now(timezone.utc)
    current_hour = now.strftime("%H:00")
    today_str = now.date().isoformat()
    notifications_sent = 0
    push_sent = 0
    push_failed = 0

    try:
        sources = await db.income_sources.find({
            "incomeType": "variable", "nextDueDate": today_str,
            "reminderTime": {"$regex": f"^{current_hour[:2]}"}
        }, {"_id": 0}).to_list(10000)

        for source in sources:
            user_id = source.get("userId")
            source_id = source.get("id")
            income_name = source.get("name", "Unknown Income")
            income_expected_amount = source.get("expectedAmount", 0)

            user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1})
            user_name = user.get("name", "there") if user else "there"

            action_url = f"/{source.get('type', 'job').lower().replace(' ', '-')}-income/{source_id}"
            notification = {
                "id": str(uuid.uuid4()), "userId": user_id,
                "title": f"Time to record {income_name}",
                "message": f"Hi {user_name}, it's time to record your {income_name}. Tap to enter today's actual amount.",
                "type": "income_reminder", "relatedIncomeId": source_id,
                "relatedIncomeName": income_name, "expectedAmount": income_expected_amount,
                "actionUrl": action_url, "isRead": False,
                "createdAt": datetime.now(timezone.utc).isoformat()
            }
            await create_notification_and_cleanup(notification)
            notifications_sent += 1

            subscriptions = await db.push_subscriptions.find({"userId": user_id}, {"_id": 0}).to_list(100)
            for sub in subscriptions:
                subscription_info = {"endpoint": sub.get("endpoint"), "keys": sub.get("keys", {})}
                result = await send_income_reminder(subscription_info, income_name, source_id)
                if result.get("success"):
                    push_sent += 1
                else:
                    push_failed += 1
                    if result.get("should_remove"):
                        await db.push_subscriptions.delete_one({"endpoint": sub.get("endpoint")})

        return {
            "success": True, "in_app_notifications": notifications_sent,
            "push_sent": push_sent, "push_failed": push_failed, "checked_hour": current_hour
        }
    except Exception as e:
        logger.error(f"Error sending reminders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

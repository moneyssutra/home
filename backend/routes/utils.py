"""Common utilities shared across route modules."""
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request
import uuid
import logging

from database import db
from server_models import ROLE_PERMISSIONS, MAX_NOTIFICATIONS_PER_USER

logger = logging.getLogger(__name__)


def get_user_now(request: Request) -> datetime:
    """Get the current time adjusted for the user's timezone.
    Frontend sends tz_offset (from JS Date.getTimezoneOffset()) which is
    minutes BEHIND UTC. IST (UTC+5:30) sends -330.
    user_local = utc_now - timedelta(minutes=tz_offset)
    """
    try:
        tz_offset = int(request.query_params.get("tz_offset", 0))
    except (ValueError, TypeError):
        tz_offset = 0
    return datetime.now(timezone.utc) - timedelta(minutes=tz_offset)


def get_user_filter(user):
    """Get filter for user data isolation"""
    user_id = user.get('user_id')
    return {"userId": user_id}


def get_workspace_filter(workspace_id: str, user_id: str = None, user_email: str = None):
    """Get the appropriate MongoDB filter for workspace data isolation"""
    if user_email == 'test@moneyssutra.com':
        return {"$or": [
            {"workspaceId": workspace_id},
            {"workspaceId": None},
            {"workspaceId": {"$exists": False}},
            {"userId": user_id},
            {"userId": None},
            {"userId": {"$exists": False}}
        ]}
    return {"workspaceId": workspace_id}


def check_permission(role: str, action: str) -> bool:
    """Check if a role has permission for an action"""
    return ROLE_PERMISSIONS.get(role, {}).get(action, False)


def convert_datetime_fields(doc: dict):
    """Convert string datetime fields to datetime objects"""
    if 'createdAt' in doc and isinstance(doc['createdAt'], str):
        try:
            doc['createdAt'] = datetime.fromisoformat(doc['createdAt'])
        except (ValueError, TypeError):
            pass


async def get_user_workspace(user, workspace_id: Optional[str] = None):
    """Get the current workspace for the user"""
    user_id = user.get('user_id')
    if workspace_id:
        member = await db.workspace_members.find_one(
            {"workspace_id": workspace_id, "user_id": user_id, "status": "active"}, {"_id": 0})
        if member:
            workspace = await db.workspaces.find_one({"id": workspace_id}, {"_id": 0})
            return workspace, member.get('role', 'viewer')
    member = await db.workspace_members.find_one(
        {"user_id": user_id, "status": "active"}, {"_id": 0}, sort=[("role", 1)])
    if member:
        workspace = await db.workspaces.find_one({"id": member['workspace_id']}, {"_id": 0})
        return workspace, member.get('role', 'viewer')
    return None, None


async def ensure_user_has_workspace(user):
    """Ensure user has at least one workspace, create default if needed"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    user_name = user.get('name', 'User')

    existing = await db.workspace_members.find_one({"user_id": user_id, "status": "active"}, {"_id": 0})
    if existing:
        return existing['workspace_id']

    workspace_id = f"ws_{uuid.uuid4().hex[:12]}"
    invite_code = uuid.uuid4().hex[:8].upper()
    workspace = {
        "id": workspace_id, "name": f"{user_name}'s Finance", "type": "Personal",
        "owner_id": user_id, "invite_code": invite_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workspaces.insert_one(workspace)
    member = {
        "id": f"wm_{uuid.uuid4().hex[:12]}", "workspace_id": workspace_id,
        "user_id": user_id, "user_email": user_email, "user_name": user_name,
        "role": "owner", "invited_by": None,
        "invited_at": datetime.now(timezone.utc).isoformat(),
        "accepted_at": datetime.now(timezone.utc).isoformat(), "status": "active"
    }
    await db.workspace_members.insert_one(member)

    if user_email == 'test@moneyssutra.com':
        collections = ['income_sources', 'other_income', 'loans', 'assets', 'accounts',
                        'expenses', 'investments', 'goals', 'credit_cards', 'insurances']
        for coll in collections:
            await db[coll].update_many(
                {"$or": [{"workspaceId": None}, {"workspaceId": {"$exists": False}}]},
                {"$set": {"workspaceId": workspace_id}}
            )
    return workspace_id


async def create_notification_and_cleanup(notification: dict):
    """Create a new notification and remove old ones if user has more than MAX."""
    user_id = notification.get("userId")
    await db.notifications.insert_one(notification)
    total_count = await db.notifications.count_documents({"userId": user_id})
    if total_count > MAX_NOTIFICATIONS_PER_USER:
        excess_count = total_count - MAX_NOTIFICATIONS_PER_USER
        oldest_notifications = await db.notifications.find(
            {"userId": user_id}, {"_id": 1}
        ).sort("createdAt", 1).limit(excess_count).to_list(excess_count)
        if oldest_notifications:
            ids_to_delete = [n["_id"] for n in oldest_notifications]
            await db.notifications.delete_many({"_id": {"$in": ids_to_delete}})


def now_iso() -> str:
    """Get current UTC time as ISO string"""
    return datetime.now(timezone.utc).isoformat()


def parse_due_day(selected_date) -> int:
    """Parse selectedDate field into a day-of-month integer.
    Handles: '28', '2024-01-28', '5', etc. Returns 0 if unparseable."""
    if not selected_date:
        return 0
    s = str(selected_date).strip()
    # Just a number like "28" or "5"
    try:
        val = int(s)
        if 1 <= val <= 31:
            return val
    except (ValueError, TypeError):
        pass
    # Full date like "2024-01-28"
    if '-' in s:
        try:
            day = int(s.split('-')[-1])
            if 1 <= day <= 31:
                return day
        except (ValueError, TypeError):
            pass
    return 0


# ─── Shared Financial Normalization Helpers ───

def count_weekday_occurrences(year: int, month: int, day_name: str, up_to_day: int = None) -> int:
    """Count how many times a named weekday occurs in a month, optionally up to a specific day."""
    import calendar
    day_map = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
               "Friday": 4, "Saturday": 5, "Sunday": 6}
    target = day_map.get(day_name, 0)
    days_in_month = calendar.monthrange(year, month)[1]
    end = min(up_to_day or days_in_month, days_in_month)
    count = 0
    for d in range(1, end + 1):
        if datetime(year, month, d).weekday() == target:
            count += 1
    return count


def get_weekly_multiplier(year: int = None, month: int = None) -> float:
    """Get accurate weekly-to-monthly multiplier based on actual days in the month.
    Returns days_in_month / 7, which is more accurate than the hardcoded 4.33."""
    import calendar
    if year is None or month is None:
        now = datetime.now(timezone.utc)
        year, month = now.year, now.month
    return calendar.monthrange(year, month)[1] / 7


def normalize_expense_for_month(amount, frequency, year, month, expense=None):
    """Normalize an expense amount to its total for a specific month. Canonical logic used everywhere."""
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]
    if frequency == 'Daily':
        return amount * days_in_month
    elif frequency == 'Weekly':
        day_name = (expense or {}).get('selectedDay', '')
        if not day_name:
            created = (expense or {}).get('createdAt', '')
            if created:
                try:
                    from datetime import datetime as dt_parse
                    cd = dt_parse.fromisoformat(created.replace('Z', '+00:00'))
                    day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][cd.weekday()]
                except Exception:
                    pass
            if not day_name:
                day_name = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][
                    __import__('datetime').date.today().weekday()
                ]
        return amount * count_weekday_occurrences(year, month, day_name)
    elif frequency == 'Bi-Weekly':
        return amount * 2.17
    elif frequency == 'Monthly':
        return amount
    elif frequency == 'One-Time':
        ot = (expense or {}).get('oneTimeDate', '')
        if ot and ot[:7] == f"{year}-{month:02d}":
            return amount
        return 0
    elif frequency == 'Quarterly':
        return amount  # caller already checks if the month applies
    elif frequency == 'Half-Yearly':
        return amount
    elif frequency == 'Yearly':
        return amount
    return amount


def split_expense_for_month(amount, frequency, year, month, current_day, expense=None):
    """Split an expense into (done, upcoming) for the current month. Canonical logic used everywhere."""
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    if frequency == 'Daily':
        done = amount * current_day
        upcoming = amount * (days_in_month - current_day)
        return done, upcoming

    if frequency in ('Weekly', 'Bi-Weekly'):
        day_name = (expense or {}).get('selectedDay', '')
        if day_name and frequency == 'Weekly':
            past_count = count_weekday_occurrences(year, month, day_name, current_day)
            total_count = count_weekday_occurrences(year, month, day_name)
            return amount * past_count, amount * (total_count - past_count)
        # Fallback for bi-weekly or missing day name
        total = normalize_expense_for_month(amount, frequency, year, month, expense)
        # Approximate split by proportion of month elapsed
        ratio = current_day / days_in_month
        return round(total * ratio, 2), round(total * (1 - ratio), 2)

    # For Monthly, Quarterly, Half-Yearly, Yearly, One-Time: check selectedDate
    normalized = normalize_expense_for_month(amount, frequency, year, month, expense)
    if normalized == 0:
        return 0, 0

    sd_str = (expense or {}).get('selectedDate')
    try:
        sd = min(int(sd_str), days_in_month) if sd_str else 1
    except (ValueError, TypeError):
        sd = 1

    if sd <= current_day:
        return normalized, 0
    else:
        return 0, normalized

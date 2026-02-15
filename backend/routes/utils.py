"""Common utilities shared across route modules."""
from datetime import datetime, timezone
from typing import List


def get_user_filter(user):
    """Get filter for user data isolation"""
    user_id = user.get('user_id')
    user_email = user.get('email', '')
    
    if user_email == 'test@moneyssutra.com' or user_id == 'test':
        return {"$or": [{"userId": user_id}, {"userId": None}, {"userId": {"$exists": False}}]}
    else:
        return {"userId": user_id}


def convert_datetime_fields(doc: dict, fields: List[str] = ['createdAt']) -> dict:
    """Convert ISO string datetime fields to datetime objects"""
    for field in fields:
        if isinstance(doc.get(field), str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except:
                pass
    return doc


def serialize_datetime(dt) -> str:
    """Serialize datetime to ISO string for MongoDB storage"""
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt


def now_iso() -> str:
    """Get current UTC time as ISO string"""
    return datetime.now(timezone.utc).isoformat()

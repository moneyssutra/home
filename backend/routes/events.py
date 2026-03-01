"""Event tracking routes — Records user activity for admin analytics."""
from fastapi import APIRouter, Request
from datetime import datetime, timezone
from database import db

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/track")
async def track_event(request: Request):
    """Record a user event (page visit, interaction, search, etc.)."""
    body = await request.json()
    event = {
        "userId": body.get("userId", "anonymous"),
        "sessionId": body.get("sessionId", ""),
        "eventType": body.get("eventType", "page_view"),
        "pageName": body.get("pageName", ""),
        "metadata": body.get("metadata", {}),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hour": datetime.now(timezone.utc).hour,
        "dayOfWeek": datetime.now(timezone.utc).weekday(),
    }
    await db.user_events.insert_one(event)
    return {"ok": True}


@router.post("/session")
async def track_session(request: Request):
    """Record session start/end."""
    body = await request.json()
    action = body.get("action", "start")
    session_id = body.get("sessionId", "")
    user_id = body.get("userId", "anonymous")

    if action == "start":
        await db.user_sessions.insert_one({
            "sessionId": session_id,
            "userId": user_id,
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "endedAt": None,
            "durationSec": 0,
            "pages": [],
        })
    elif action == "end":
        session = await db.user_sessions.find_one({"sessionId": session_id})
        if session:
            started = datetime.fromisoformat(session["startedAt"])
            duration = (datetime.now(timezone.utc) - started).total_seconds()
            await db.user_sessions.update_one(
                {"sessionId": session_id},
                {"$set": {"endedAt": datetime.now(timezone.utc).isoformat(), "durationSec": round(duration)}}
            )
    elif action == "page":
        page_name = body.get("pageName", "")
        entered_at = body.get("enteredAt", datetime.now(timezone.utc).isoformat())
        duration = body.get("durationSec", 0)
        await db.user_sessions.update_one(
            {"sessionId": session_id},
            {"$push": {"pages": {"page": page_name, "enteredAt": entered_at, "durationSec": duration}}}
        )
    return {"ok": True}

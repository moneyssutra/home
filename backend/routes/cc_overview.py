"""Credit Cards Overview API - CRED-style credit card page data."""
from fastapi import APIRouter, Request
from database import db
from routes.auth import get_current_user
from datetime import datetime, timezone
import asyncio

router = APIRouter(prefix="/cc-overview", tags=["Credit Cards Overview"])

BANK_CARD_STYLES = {
    "icici": {"gradient": ["#FD7014", "#E85D04"], "color": "#F97316", "network": "VISA"},
    "hdfc": {"gradient": ["#1D4ED8", "#1E40AF"], "color": "#2563EB", "network": "Mastercard"},
    "sbi": {"gradient": ["#047857", "#065F46"], "color": "#059669", "network": "RuPay"},
    "kotak": {"gradient": ["#B91C1C", "#991B1B"], "color": "#DC2626", "network": "VISA"},
    "axis": {"gradient": ["#7C3AED", "#6D28D9"], "color": "#8B5CF6", "network": "Mastercard"},
    "idfc": {"gradient": ["#0891B2", "#0E7490"], "color": "#06B6D4", "network": "VISA"},
    "yes": {"gradient": ["#1D4ED8", "#1E3A8A"], "color": "#2563EB", "network": "Mastercard"},
    "amazon": {"gradient": ["#1A1A2E", "#16213E"], "color": "#232F3E", "network": "Mastercard"},
    "citi": {"gradient": ["#003B70", "#002855"], "color": "#003B70", "network": "VISA"},
    "indusind": {"gradient": ["#0D1B2A", "#1B2838"], "color": "#1B2838", "network": "VISA"},
    "rbl": {"gradient": ["#E63946", "#C1121F"], "color": "#E63946", "network": "Mastercard"},
    "hsbc": {"gradient": ["#DB0011", "#A8000D"], "color": "#DB0011", "network": "VISA"},
    "bob": {"gradient": ["#EA580C", "#C2410C"], "color": "#F97316", "network": "RuPay"},
    "pnb": {"gradient": ["#7C3AED", "#5B21B6"], "color": "#8B5CF6", "network": "RuPay"},
    "au": {"gradient": ["#8B4513", "#6B3410"], "color": "#8B4513", "network": "VISA"},
    "sc": {"gradient": ["#006B3F", "#005030"], "color": "#006B3F", "network": "VISA"},
    "standard": {"gradient": ["#006B3F", "#005030"], "color": "#006B3F", "network": "VISA"},
    "onecard": {"gradient": ["#0A0A0A", "#1A1A1A"], "color": "#0A0A0A", "network": "VISA"},
    "fi": {"gradient": ["#6C3CE1", "#4A1FB8"], "color": "#6C3CE1", "network": "VISA"},
    "slice": {"gradient": ["#FF6B35", "#E55A2B"], "color": "#FF6B35", "network": "VISA"},
}
DEFAULT_STYLE = {"gradient": ["#334155", "#1E293B"], "color": "#475569", "network": "VISA"}


def _get_card_style(card_name: str, bank_name: str) -> dict:
    combined = f"{card_name} {bank_name}".lower()
    for key, style in BANK_CARD_STYLES.items():
        if key in combined:
            return style
    return DEFAULT_STYLE


def _get_card_logo(card_name: str, bank_name: str) -> str:
    combined = f"{card_name} {bank_name}".lower()
    for key in BANK_CARD_STYLES:
        if key in combined:
            return key.upper()
    words = (card_name or bank_name or "CARD").split()
    return words[0][:6].upper()


def _due_info(due_date_day: int) -> str:
    if not due_date_day:
        return ""
    now = datetime.now(timezone.utc)
    today = now.day
    current_month_days = 30
    # Simple calculation
    if due_date_day >= today:
        days_left = due_date_day - today
    else:
        days_left = (current_month_days - today) + due_date_day
    if days_left == 0:
        return "DUE TODAY"
    if days_left == 1:
        return "DUE TOMORROW"
    return f"DUE IN {days_left} DAYS"


def _relative_time(iso_str: str) -> str:
    if not iso_str:
        return "unknown"
    try:
        dt = datetime.fromisoformat(str(iso_str).replace("Z", "+00:00"))
        diff = (datetime.now(timezone.utc) - dt).total_seconds()
        if diff < 60:
            return "just now"
        if diff < 3600:
            return f"{int(diff // 60)} min ago"
        if diff < 86400:
            return f"{int(diff // 3600)} hr ago"
        days = int(diff // 86400)
        return "yesterday" if days == 1 else f"{days} days ago"
    except (ValueError, TypeError):
        return "unknown"


@router.get("")
async def get_cc_overview(request: Request):
    user = await get_current_user(request)
    if not user:
        return {"error": "Not authenticated"}
    user_id = user["user_id"]

    cards_task = db.credit_cards.find({"userId": user_id}, {"_id": 0}).to_list(50)
    payments_task = db.cc_payments.find({"userId": user_id}, {"_id": 0}).sort("paymentDate", -1).to_list(100)

    # Get cardholder name
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "firstName": 1, "lastName": 1})
    cardholder = ""
    if user_doc:
        if user_doc.get("firstName"):
            cardholder = f"{user_doc.get('firstName', '')} {user_doc.get('lastName', '')}".strip().upper()
        elif user_doc.get("name"):
            cardholder = user_doc["name"].upper()

    cards_raw, payments = await asyncio.gather(cards_task, payments_task)

    # Build cards data
    cards = []
    total_outstanding = 0
    total_limit = 0
    for c in cards_raw:
        style = _get_card_style(c.get("cardName", ""), c.get("bankName", ""))
        outstanding = float(c.get("outstandingAmount", 0))
        limit = float(c.get("creditLimit", 0))
        utilization = round((outstanding / limit) * 100, 1) if limit > 0 else 0
        available = max(0, limit - outstanding)
        total_outstanding += outstanding
        total_limit += limit

        cards.append({
            "id": c.get("id", ""),
            "cardName": c.get("cardName", "Credit Card"),
            "bankName": c.get("bankName", ""),
            "creditLimit": limit,
            "outstandingAmount": outstanding,
            "availableCredit": available,
            "utilization": utilization,
            "billingDate": c.get("billingDate"),
            "dueDate": c.get("dueDate"),
            "dueInfo": _due_info(c.get("dueDate")),
            "minimumDue": float(c.get("minimumDue", 0)),
            "interestRate": float(c.get("interestRate", 0)),
            "lastUpdated": _relative_time(c.get("updatedAt") or c.get("createdAt", "")),
            "color": style["color"],
            "gradient": style["gradient"],
            "logo": _get_card_logo(c.get("cardName", ""), c.get("bankName", "")),
            "network": style.get("network", "VISA"),
            "cardholder": cardholder,
        })

    # Build payment history
    payment_history = []
    for p in payments:
        payment_history.append({
            "id": p.get("id", ""),
            "cardName": p.get("cardName", ""),
            "amount": float(p.get("amount", 0)),
            "paymentDate": p.get("paymentDate", ""),
            "outstandingAfter": float(p.get("outstandingAfter", 0)),
        })

    # Summary
    overall_utilization = round((total_outstanding / total_limit) * 100, 1) if total_limit > 0 else 0

    return {
        "cards": cards,
        "payments": payment_history[:20],
        "summary": {
            "totalOutstanding": total_outstanding,
            "totalLimit": total_limit,
            "totalAvailable": max(0, total_limit - total_outstanding),
            "overallUtilization": overall_utilization,
            "cardCount": len(cards),
        },
    }

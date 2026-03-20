"""Bank Overview API - Provides real data for the Bank Accounts Experimental page."""
from fastapi import APIRouter, Request
from database import db
from routes.auth import get_current_user
from routes.utils import parse_due_day
from datetime import datetime, timezone
import asyncio

router = APIRouter(prefix="/bank-overview", tags=["Bank Overview"])

# Bank color schemes based on common Indian bank names
BANK_COLORS = {
    "icici": {"gradient": ["#FD7014", "#E85D04"], "color": "#F97316", "network": "VISA"},
    "hdfc": {"gradient": ["#1D4ED8", "#1E40AF"], "color": "#2563EB", "network": "Mastercard"},
    "sbi": {"gradient": ["#047857", "#065F46"], "color": "#059669", "network": "RuPay"},
    "kotak": {"gradient": ["#B91C1C", "#991B1B"], "color": "#DC2626", "network": "VISA"},
    "axis": {"gradient": ["#7C3AED", "#6D28D9"], "color": "#8B5CF6", "network": "Mastercard"},
    "idfc": {"gradient": ["#0891B2", "#0E7490"], "color": "#06B6D4", "network": "VISA"},
    "yes": {"gradient": ["#1D4ED8", "#1E3A8A"], "color": "#2563EB", "network": "Mastercard"},
    "bob": {"gradient": ["#EA580C", "#C2410C"], "color": "#F97316", "network": "RuPay"},
    "pnb": {"gradient": ["#7C3AED", "#5B21B6"], "color": "#8B5CF6", "network": "RuPay"},
    "canara": {"gradient": ["#047857", "#064E3B"], "color": "#059669", "network": "RuPay"},
    "union": {"gradient": ["#1D4ED8", "#1E3A8A"], "color": "#3B82F6", "network": "RuPay"},
    "indian": {"gradient": ["#1D4ED8", "#1E3A8A"], "color": "#3B82F6", "network": "RuPay"},
    "amazon": {"gradient": ["#1A1A2E", "#16213E"], "color": "#232F3E", "network": "Mastercard"},
    "citi": {"gradient": ["#003B70", "#002855"], "color": "#003B70", "network": "VISA"},
    "indusind": {"gradient": ["#8B0000", "#660000"], "color": "#8B0000", "network": "VISA"},
    "rbl": {"gradient": ["#E63946", "#C1121F"], "color": "#E63946", "network": "Mastercard"},
}
DEFAULT_COLORS = {"gradient": ["#334155", "#1E293B"], "color": "#475569", "network": "VISA"}


def _get_bank_style(account_name: str) -> dict:
    name_lower = (account_name or "").lower()
    for key, style in BANK_COLORS.items():
        if key in name_lower:
            return style
    return DEFAULT_COLORS


def _get_bank_logo(account_name: str) -> str:
    name_lower = (account_name or "").lower()
    for key in BANK_COLORS:
        if key in name_lower:
            return key.upper()
    # Try to get first word as logo
    words = (account_name or "Bank").split()
    return words[0][:5].upper() if words else "BANK"


def _relative_time(iso_str: str) -> str:
    if not iso_str:
        return "unknown"
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = (now - dt).total_seconds()
        if diff < 60:
            return "just now"
        if diff < 3600:
            return f"{int(diff // 60)} min ago"
        if diff < 86400:
            return f"{int(diff // 3600)} hr ago"
        days = int(diff // 86400)
        if days == 1:
            return "yesterday"
        return f"{days} days ago"
    except (ValueError, TypeError):
        return "unknown"


def _format_tx_date(date_str: str) -> str:
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        today = now.date()
        d = dt.date()
        if d == today:
            return "Today"
        from datetime import timedelta
        if d == today - timedelta(days=1):
            return "Yesterday"
        return d.strftime("%b %d")
    except (ValueError, TypeError):
        return date_str[:10] if len(date_str) >= 10 else date_str


@router.get("")
async def get_bank_overview(request: Request):
    user = await get_current_user(request)
    if not user:
        return {"error": "Not authenticated"}
    user_id = user["user_id"]

    now = datetime.now(timezone.utc)
    current_month = now.strftime("%Y-%m")

    # Fetch all data in parallel
    accounts_task = db.accounts.find({"userId": user_id}, {"_id": 0}).to_list(50)
    expense_tx_task = db.expense_transactions.find(
        {"userId": user_id}, {"_id": 0}
    ).sort("transactionDate", -1).to_list(50)
    income_tx_task = db.income_transactions.find(
        {"userId": user_id}, {"_id": 0}
    ).sort("transactionDate", -1).to_list(50)
    expenses_task = db.expenses.find({"userId": user_id}, {"_id": 0}).to_list(100)
    income_task = db.income_sources.find({"userId": user_id}, {"_id": 0}).to_list(100)

    accounts, expense_txs, income_txs, expenses, incomes = await asyncio.gather(
        accounts_task, expense_tx_task, income_tx_task, expenses_task, income_task
    )

    # Get cardholder name from user profile
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "firstName": 1, "lastName": 1})
    cardholder = ""
    if user_doc:
        if user_doc.get("firstName"):
            cardholder = f"{user_doc.get('firstName', '')} {user_doc.get('lastName', '')}".strip().upper()
        elif user_doc.get("name"):
            cardholder = user_doc["name"].upper()

    # --- 1. ACCOUNTS ---
    accounts_data = []
    for acc in accounts:
        style = _get_bank_style(acc.get("accountName", ""))
        # Compute due info for credit cards
        due_info = None
        due_date_raw = acc.get("dueDate")
        if due_date_raw:
            try:
                due_dt = datetime.fromisoformat(str(due_date_raw).replace("Z", "+00:00"))
                days_left = (due_dt.date() - now.date()).days
                if days_left > 0:
                    due_info = f"DUE IN {days_left} DAY{'S' if days_left != 1 else ''}"
                elif days_left == 0:
                    due_info = "DUE TODAY"
                else:
                    due_info = f"OVERDUE {abs(days_left)} DAY{'S' if abs(days_left) != 1 else ''}"
            except (ValueError, TypeError):
                pass

        is_credit = "credit" in (acc.get("accountType") or "").lower()
        accounts_data.append({
            "id": acc.get("id", ""),
            "bank": acc.get("accountName", "Unknown Account"),
            "type": acc.get("accountType", "Savings"),
            "accountNumber": f"****{(acc.get('accountNumber') or '')[-4:]}" if acc.get("accountNumber") else "",
            "balance": float(acc.get("currentBalance", 0)),
            "outstandingAmount": float(acc.get("outstandingAmount") or 0),
            "creditLimit": float(acc.get("creditLimit") or 0),
            "lastUpdated": _relative_time(acc.get("updatedAt") or acc.get("createdAt", "")),
            "color": style["color"],
            "gradient": style["gradient"],
            "logo": _get_bank_logo(acc.get("accountName", "")),
            "network": style.get("network", "VISA"),
            "cardholder": cardholder,
            "dueInfo": due_info,
            "isCredit": is_credit,
        })

    # --- 2. TRANSACTIONS (merged expense + income) ---
    transactions = []
    for tx in expense_txs:
        transactions.append({
            "id": tx.get("id", ""),
            "date": _format_tx_date(tx.get("transactionDate", "")),
            "rawDate": tx.get("transactionDate", ""),
            "desc": tx.get("entityName", "Expense"),
            "category": tx.get("category", ""),
            "amount": -abs(float(tx.get("amount", 0))),
            "type": "debit",
            "notes": tx.get("notes", ""),
        })
    for tx in income_txs:
        transactions.append({
            "id": tx.get("id", ""),
            "date": _format_tx_date(tx.get("transactionDate", "")),
            "rawDate": tx.get("transactionDate", ""),
            "desc": tx.get("entityName", "Income"),
            "category": tx.get("entityType", ""),
            "amount": abs(float(tx.get("amount", 0))),
            "type": "credit",
            "notes": tx.get("notes", ""),
        })
    # Sort by date descending
    transactions.sort(key=lambda x: x.get("rawDate", ""), reverse=True)

    # --- 3. RECURRING ---
    recurring = []
    for exp in expenses:
        freq = exp.get("frequency", "")
        if freq in ("Monthly", "Weekly", "Quarterly", "Half-Yearly", "Yearly"):
            due_day = parse_due_day(exp.get("selectedDate"))
            recurring.append({
                "id": exp.get("id", ""),
                "name": exp.get("expenseName", ""),
                "amount": float(exp.get("expectedAmount", 0)),
                "frequency": freq,
                "category": exp.get("category", ""),
                "dueDay": due_day or None,
                "type": exp.get("expenseType", "Fixed"),
            })

    # --- 4. CASHFLOW ---
    # This month income received (from transactions)
    month_income = sum(
        abs(float(tx.get("amount", 0)))
        for tx in income_txs
        if (tx.get("transactionDate", "") or "")[:7] == current_month
    )
    # This month expenses paid (from transactions)
    month_expenses = sum(
        abs(float(tx.get("amount", 0)))
        for tx in expense_txs
        if (tx.get("transactionDate", "") or "")[:7] == current_month
    )
    # Also estimate expected monthly expenses from recurring expenses
    expected_monthly_expenses = 0
    for exp in expenses:
        freq = exp.get("frequency", "")
        amt = float(exp.get("expectedAmount", 0))
        if freq == "Monthly":
            expected_monthly_expenses += amt
        elif freq == "Weekly":
            expected_monthly_expenses += amt * 4.33
        elif freq == "Daily":
            expected_monthly_expenses += amt * 30
        elif freq == "Quarterly":
            expected_monthly_expenses += amt / 3
        elif freq == "Half-Yearly":
            expected_monthly_expenses += amt / 6
        elif freq == "Yearly":
            expected_monthly_expenses += amt / 12

    # Estimate expected monthly income
    expected_monthly_income = 0
    for inc in incomes:
        freq = inc.get("frequency", "")
        amt = float(inc.get("expectedAmount") or inc.get("amount") or 0)
        if freq == "Monthly":
            expected_monthly_income += amt
        elif freq == "Weekly":
            expected_monthly_income += amt * 4.33
        elif freq == "Daily":
            expected_monthly_income += amt * 30
        elif freq == "Quarterly":
            expected_monthly_income += amt / 3
        elif freq == "Half-Yearly":
            expected_monthly_income += amt / 6
        elif freq == "Yearly":
            expected_monthly_income += amt / 12

    cashflow = {
        "income": round(month_income, 2) if month_income > 0 else round(expected_monthly_income, 2),
        "expenses": round(month_expenses, 2) if month_expenses > 0 else round(expected_monthly_expenses, 2),
        "incomeSource": "actual" if month_income > 0 else "expected",
        "expenseSource": "actual" if month_expenses > 0 else "expected",
        "month": now.strftime("%B %Y"),
    }

    return {
        "accounts": accounts_data,
        "transactions": transactions[:30],  # limit to 30 most recent
        "recurring": recurring,
        "cashflow": cashflow,
    }

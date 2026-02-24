"""Transaction routes - Income and expense transactions."""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone, timedelta
import uuid

from database import db
from server_models import IncomeTransactionUpdate

router = APIRouter(tags=["Transactions"])


# ============ INCOME TRANSACTIONS ============

@router.post("/income-transactions")
async def record_income_transaction(transaction: dict, user_id: str = None, request: Request = None):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    entity_id = transaction.get("entityId") or transaction.get("incomeSourceId")
    amount = float(transaction.get("amount", 0))
    transaction_date = transaction.get("transactionDate") or transaction.get("recordedDate") or datetime.now(timezone.utc).date().isoformat()

    income_source = await db.income_sources.find_one({"id": entity_id, "userId": user_id}, {"_id": 0})
    if not income_source:
        income_source = await db.income_sources.find_one({
            "id": entity_id, "$or": [{"userId": None}, {"userId": {"$exists": False}}]
        }, {"_id": 0})
    if not income_source:
        raise HTTPException(status_code=404, detail="Income source not found")

    entry = {
        "id": str(uuid.uuid4()), "userId": user_id, "entityId": entity_id,
        "entityType": income_source.get("type", "Unknown"),
        "entityName": income_source.get("name", "Unknown"),
        "amount": amount, "transactionDate": transaction_date,
        "notes": transaction.get("notes", ""), "source": transaction.get("source", "manual"),
        "isLocked": False, "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.income_transactions.insert_one(entry)

    await db.income_sources.update_one(
        {"id": entity_id, "userId": user_id},
        {"$set": {"lastRecordedAmount": amount, "lastEntryDate": transaction_date}}
    )
    return {"success": True, "transaction": {k: v for k, v in entry.items() if k != "_id"}}


@router.get("/income-transactions")
async def get_income_transactions(
    entity_id: str = None, income_source_id: str = None,
    start_date: str = None, end_date: str = None,
    user_id: str = None, request: Request = None
):
    if not user_id:
        session_token = request.cookies.get("session_token")
        if session_token:
            session = await db.user_sessions.find_one({"session_token": session_token})
            if session:
                user_id = session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not authenticated")

    query = {"userId": user_id}
    source_id = entity_id or income_source_id
    if source_id:
        query["$or"] = [{"entityId": source_id}, {"incomeSourceId": source_id}]
    if start_date and end_date:
        query["transactionDate"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["transactionDate"] = {"$gte": start_date}
    elif end_date:
        query["transactionDate"] = {"$lte": end_date}

    transactions = await db.income_transactions.find(query, {"_id": 0}).sort("transactionDate", -1).to_list(1000)
    return transactions


@router.get("/income-transactions/history/{entity_id}")
async def get_income_history(entity_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    income_source = await db.income_sources.find_one({"id": entity_id, "userId": user_id}, {"_id": 0})
    if not income_source:
        income_source = await db.income_sources.find_one({
            "id": entity_id, "$or": [{"userId": None}, {"userId": {"$exists": False}}]
        }, {"_id": 0})
    if not income_source:
        raise HTTPException(status_code=404, detail="Income source not found")

    transactions = await db.income_transactions.find(
        {"$or": [{"entityId": entity_id}, {"incomeSourceId": entity_id}], "userId": user_id}, {"_id": 0}
    ).sort("transactionDate", -1).to_list(1000)

    total_amount = sum(t.get("amount", 0) for t in transactions)
    transaction_count = len(transactions)
    return {
        "incomeSource": income_source, "transactions": transactions,
        "summary": {
            "totalAmount": total_amount, "transactionCount": transaction_count,
            "averageAmount": total_amount / transaction_count if transaction_count > 0 else 0
        }
    }


@router.get("/income-transactions/monthly-summary")
async def get_monthly_income_summary(month: str = None, request: Request = None):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    if not month:
        month = datetime.now().strftime("%Y-%m")
    year, mon = month.split("-")
    start_date = f"{month}-01"
    end_date = f"{int(year)+1}-01-01" if int(mon) == 12 else f"{year}-{int(mon)+1:02d}-01"

    pipeline = [
        {"$match": {"userId": user_id, "transactionDate": {"$gte": start_date, "$lt": end_date}}},
        {"$group": {"_id": "$entityType", "totalAmount": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    results = await db.income_transactions.aggregate(pipeline).to_list(100)
    grand_total = sum(r.get("totalAmount", 0) for r in results)

    fixed_income = await db.income_sources.find(
        {"userId": user_id, "incomeType": {"$ne": "variable"}},
        {"_id": 0, "type": 1, "expectedAmount": 1, "frequency": 1}
    ).to_list(100)

    fixed_total = 0
    for income in fixed_income:
        freq = income.get("frequency", "Monthly")
        amount = income.get("expectedAmount", 0)
        if freq == "Daily": fixed_total += amount * 30
        elif freq == "Weekly": fixed_total += amount * 4
        elif freq == "Bi-Weekly": fixed_total += amount * 2
        elif freq == "Monthly": fixed_total += amount
        elif freq == "Quarterly": fixed_total += amount / 3
        elif freq == "Half-Yearly": fixed_total += amount / 6
        elif freq == "Yearly": fixed_total += amount / 12

    return {
        "month": month, "variableIncomeTotal": grand_total,
        "fixedIncomeTotal": fixed_total, "grandTotal": grand_total + fixed_total,
        "byType": results
    }


@router.put("/income-transactions/{transaction_id}")
async def update_income_transaction(transaction_id: str, update: IncomeTransactionUpdate, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    transaction = await db.income_transactions.find_one({"id": transaction_id, "userId": user_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.get("isLocked"):
        raise HTTPException(status_code=403, detail="This transaction is locked and cannot be updated. Create an adjustment entry instead.")

    created_at = transaction.get("createdAt")
    if created_at:
        created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - created_time > timedelta(hours=24):
            await db.income_transactions.update_one({"id": transaction_id}, {"$set": {"isLocked": True}})
            raise HTTPException(status_code=403, detail="This transaction is now locked (older than 24 hours). Create an adjustment entry instead.")

    update_data = {
        "amount": update.amount, "transactionDate": update.transactionDate,
        "notes": update.notes or "", "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.income_transactions.update_one({"id": transaction_id, "userId": user_id}, {"$set": update_data})
    updated = await db.income_transactions.find_one({"id": transaction_id}, {"_id": 0})
    return updated


@router.delete("/income-transactions/{transaction_id}")
async def delete_income_transaction(transaction_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    transaction = await db.income_transactions.find_one({"id": transaction_id, "userId": user_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.get("isLocked"):
        raise HTTPException(status_code=403, detail="This transaction is locked and cannot be deleted. Create an adjustment entry instead.")

    created_at = transaction.get("createdAt")
    if created_at:
        created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - created_time > timedelta(hours=24):
            await db.income_transactions.update_one({"id": transaction_id}, {"$set": {"isLocked": True}})
            raise HTTPException(status_code=403, detail="This transaction is now locked (older than 24 hours). Create an adjustment entry instead.")

    await db.income_transactions.delete_one({"id": transaction_id, "userId": user_id})
    return {"success": True, "message": "Transaction deleted"}


@router.post("/income-transactions/{transaction_id}/adjust")
async def adjust_income_transaction(transaction_id: str, adjustment: dict, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    original = await db.income_transactions.find_one({"id": transaction_id, "userId": user_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Transaction not found")

    adjustment_amount = float(adjustment.get("amount", 0))
    adjustment_entry = {
        "id": str(uuid.uuid4()), "userId": user_id,
        "entityId": original.get("entityId"), "entityType": original.get("entityType"),
        "entityName": original.get("entityName"), "amount": adjustment_amount,
        "transactionDate": original.get("transactionDate"),
        "notes": f"Adjustment for transaction {transaction_id}: {adjustment.get('reason', 'Correction')}",
        "source": "adjustment", "originalTransactionId": transaction_id,
        "isLocked": False, "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.income_transactions.insert_one(adjustment_entry)
    return {"success": True, "adjustment": {k: v for k, v in adjustment_entry.items() if k != "_id"}}


# ============ EXPENSE TRANSACTIONS ============

@router.post("/expense-transactions")
async def record_expense_transaction(transaction: dict, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    entity_id = transaction.get("entityId") or transaction.get("expenseId")
    amount = float(transaction.get("amount", 0))
    transaction_date = transaction.get("transactionDate") or datetime.now(timezone.utc).date().isoformat()

    expense_template = await db.expenses.find_one({"id": entity_id, "userId": user_id}, {"_id": 0})
    if not expense_template:
        expense_template = await db.expenses.find_one({
            "id": entity_id, "$or": [{"userId": None}, {"userId": {"$exists": False}}]
        }, {"_id": 0})
    if not expense_template:
        raise HTTPException(status_code=404, detail="Expense not found")

    entry = {
        "id": str(uuid.uuid4()), "userId": user_id, "entityId": entity_id,
        "entityName": expense_template.get("expenseName", "Unknown"),
        "category": expense_template.get("category", "Other"),
        "amount": amount, "transactionDate": transaction_date,
        "notes": transaction.get("notes", ""), "source": transaction.get("source", "manual"),
        "isLocked": False, "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.expense_transactions.insert_one(entry)

    await db.expenses.update_one(
        {"id": entity_id, "userId": user_id},
        {"$set": {"lastPaidDate": transaction_date, "isPaid": True}}
    )
    return {"success": True, "transaction": {k: v for k, v in entry.items() if k != "_id"}}


@router.get("/expense-transactions")
async def get_expense_transactions(
    entity_id: str = None, expense_id: str = None,
    start_date: str = None, end_date: str = None,
    category: str = None, request: Request = None
):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    query = {"userId": user_id}
    source_id = entity_id or expense_id
    if source_id:
        query["$or"] = [{"entityId": source_id}, {"expenseId": source_id}]
    if category:
        query["category"] = category
    if start_date and end_date:
        query["transactionDate"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["transactionDate"] = {"$gte": start_date}
    elif end_date:
        query["transactionDate"] = {"$lte": end_date}

    transactions = await db.expense_transactions.find(query, {"_id": 0}).sort("transactionDate", -1).to_list(1000)
    return transactions


@router.get("/expense-transactions/history/{entity_id}")
async def get_expense_history(entity_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    expense_template = await db.expenses.find_one({"id": entity_id, "userId": user_id}, {"_id": 0})
    if not expense_template:
        expense_template = await db.expenses.find_one({
            "id": entity_id, "$or": [{"userId": None}, {"userId": {"$exists": False}}]
        }, {"_id": 0})
    if not expense_template:
        raise HTTPException(status_code=404, detail="Expense not found")

    transactions = await db.expense_transactions.find(
        {"$or": [{"entityId": entity_id}, {"expenseId": entity_id}], "userId": user_id}, {"_id": 0}
    ).sort("transactionDate", -1).to_list(1000)

    total_amount = sum(t.get("amount", 0) for t in transactions)
    transaction_count = len(transactions)
    return {
        "expense": expense_template, "transactions": transactions,
        "summary": {
            "totalAmount": total_amount, "transactionCount": transaction_count,
            "averageAmount": total_amount / transaction_count if transaction_count > 0 else 0
        }
    }


@router.get("/expense-transactions/monthly-summary")
async def get_monthly_expense_summary(month: str = None, request: Request = None):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    if not month:
        month = datetime.now().strftime("%Y-%m")
    year, mon = month.split("-")
    start_date = f"{month}-01"
    end_date = f"{int(year)+1}-01-01" if int(mon) == 12 else f"{year}-{int(mon)+1:02d}-01"

    pipeline = [
        {"$match": {"userId": user_id, "transactionDate": {"$gte": start_date, "$lt": end_date}}},
        {"$group": {"_id": "$category", "totalAmount": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    results = await db.expense_transactions.aggregate(pipeline).to_list(100)
    grand_total = sum(r.get("totalAmount", 0) for r in results)
    return {"month": month, "actualExpenseTotal": grand_total, "byCategory": results}


@router.delete("/expense-transactions/{transaction_id}")
async def delete_expense_transaction(transaction_id: str, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="User not authenticated")
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user_id = session.get("user_id")

    transaction = await db.expense_transactions.find_one({"id": transaction_id, "userId": user_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if transaction.get("isLocked"):
        raise HTTPException(status_code=403, detail="This transaction is locked and cannot be deleted. Create an adjustment entry instead.")

    created_at = transaction.get("createdAt")
    if created_at:
        created_time = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - created_time > timedelta(hours=24):
            await db.expense_transactions.update_one({"id": transaction_id}, {"$set": {"isLocked": True}})
            raise HTTPException(status_code=403, detail="This transaction is now locked (older than 24 hours). Create an adjustment entry instead.")

    await db.expense_transactions.delete_one({"id": transaction_id, "userId": user_id})
    return {"success": True, "message": "Transaction deleted"}
